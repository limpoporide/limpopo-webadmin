import { NextRequest, NextResponse } from "next/server";
import {
  createServiceClient,
  createUserClient,
  getBearerToken,
  getSupabaseConfig,
  requireActiveAdmin,
} from "@/lib/supabaseAdmin";

type BookingRow = {
  id: string;
  schedule_date: string;
  pickup_time: string;
  pick_up: string;
  drop_off: string | null;
  booking_status: string;
  passenger_num: number;
  total_fare: number;
  created_at: string;
  assigned_driver: string | null;
  guest_rider: boolean;
  guest_rider_name: string | null;
  rider_profile: { first_name: string; last_name: string } | null;
};

export type ScheduleBookingsResponse = {
  bookings: Array<{
    id: string;
    scheduledFor: string;
    pickup: string;
    destination: string;
    status: string;
    passengers: number;
    amount: number;
    customer: string;
    createdAt: string;
    assignedDriver: string | null;
  }>;
  total: number;
  page: number;
  pageSize: number;
};

type CountCacheEntry = {
  at: number;
  ttl: number;
  count: number;
};

const countCache = new Map<string, CountCacheEntry>();
const COUNT_CACHE_TTL_MS = 60_000;

const CACHE_HEADERS = {
  "Cache-Control": "private, max-age=15, stale-while-revalidate=45",
  Vary: "Authorization",
};

type ServiceClient = ReturnType<typeof createServiceClient>;

function now() {
  return Date.now();
}

async function resolveAdmin(request: NextRequest) {
  const config = getSupabaseConfig();

  if (!config) {
    return {
      error: NextResponse.json(
        { error: "Supabase server credentials are not configured." },
        { status: 500 },
      ),
    };
  }

  const token = getBearerToken(request.headers.get("authorization"));

  if (!token) {
    return {
      error: NextResponse.json(
        { error: "Missing admin session." },
        { status: 401 },
      ),
    };
  }

  const userClient = createUserClient(
    config.supabaseUrl,
    config.publishableKey,
  );

  const {
    data: { user },
    error: userError,
  } = await userClient.auth.getUser(token);

  if (userError || !user) {
    return {
      error: NextResponse.json(
        { error: "Invalid admin session." },
        { status: 401 },
      ),
    };
  }

  const serviceClient = createServiceClient(
    config.supabaseUrl,
    config.serviceRoleKey,
  );

  if (!(await requireActiveAdmin(serviceClient, user.id))) {
    return {
      error: NextResponse.json(
        { error: "Only active admin accounts can view bookings." },
        { status: 403 },
      ),
    };
  }

  return { serviceClient };
}

function safeInt(value: string | null, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
}

function formatCustomer(row: BookingRow) {
  if (row.guest_rider) {
    return row.guest_rider_name?.trim() || "Guest Rider";
  }

  const firstName = row.rider_profile?.first_name ?? "";
  const lastName = row.rider_profile?.last_name ?? "";
  const combined = `${firstName} ${lastName}`.trim();

  return combined || "Rider";
}

async function getCachedCount(
  serviceClient: ServiceClient,
  status: string | undefined,
) {
  const key = `schedule-bookings:count:${status ?? "all"}`;
  const cached = countCache.get(key);

  if (cached && now() - cached.at < cached.ttl) {
    return cached.count;
  }

  let query = serviceClient
    .from("schedule_booking")
    .select("id", { count: "exact", head: true });

  if (status) {
    query = query.eq("booking_status", status);
  }

  const { count, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  const value = count ?? 0;
  countCache.set(key, { at: now(), ttl: COUNT_CACHE_TTL_MS, count: value });
  return value;
}

export async function GET(request: NextRequest) {
  const resolved = await resolveAdmin(request);

  if (resolved.error) {
    return resolved.error;
  }

  const serviceClient: ServiceClient = resolved.serviceClient!;
  const url = new URL(request.url);
  const page = safeInt(url.searchParams.get("page"), 1);
  const pageSize = Math.min(50, safeInt(url.searchParams.get("pageSize"), 10));
  const status = url.searchParams.get("status")?.trim();

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let rowsQuery = serviceClient
    .from("schedule_booking")
    .select(
      "id, schedule_date, pickup_time, pick_up, drop_off, booking_status, passenger_num, total_fare, created_at, assigned_driver, guest_rider, guest_rider_name, rider_profile(first_name, last_name)",
    )
    .order("schedule_date", { ascending: false })
    .order("pickup_time", { ascending: false })
    .range(from, to);

  if (status) {
    rowsQuery = rowsQuery.eq("booking_status", status);
  }

  try {
    const [rowsResult, count] = await Promise.all([
      rowsQuery,
      getCachedCount(serviceClient, status || undefined),
    ]);

    if (rowsResult.error) {
      return NextResponse.json(
        { error: rowsResult.error.message },
        { status: 400 },
      );
    }

    const rows = (rowsResult.data ?? []) as unknown as BookingRow[];

    const response: ScheduleBookingsResponse = {
      bookings: rows.map((row) => ({
        id: row.id,
        scheduledFor: `${row.schedule_date} ${row.pickup_time}`.trim(),
        pickup: row.pick_up,
        destination: row.drop_off ?? "Not set",
        status: row.booking_status,
        passengers: row.passenger_num,
        amount: Number(row.total_fare ?? 0),
        customer: formatCustomer(row),
        createdAt: row.created_at,
        assignedDriver: row.assigned_driver,
      })),
      total: count ?? 0,
      page,
      pageSize,
    };

    return NextResponse.json(response, { headers: CACHE_HEADERS });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Could not load bookings.",
      },
      { status: 500 },
    );
  }
}
