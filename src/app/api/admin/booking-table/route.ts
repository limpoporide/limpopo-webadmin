import { NextRequest, NextResponse } from "next/server";
import {
  createServiceClient,
  createUserClient,
  getBearerToken,
  getSupabaseConfig,
  requireActiveAdmin,
} from "@/lib/supabaseAdmin";
import type { Tables } from "@/types/database.types";

export type BookingTableTab = "instant" | "scheduled";
export type BookingTableCard =
  | "total"
  | "today"
  | "completed"
  | "cancelled"
  | "pending";

export type BookingTableRow = {
  id: string;
  riderName: string;
  riderPhone: string;
  driverName: string;
  driverPhone: string;
  pickup: string;
  dropOff: string;
  amount: number;
  paymentStatus: string;
  rideStatus: string;
  date: string;
};

export type BookingTableResponse = {
  rows: BookingTableRow[];
  total: number;
  page: number;
  pageSize: number;
};

type InstantRow = Pick<
  Tables<"rider_booking">,
  | "id"
  | "created_at"
  | "pick_up"
  | "drop_off"
  | "total_fare"
  | "payment_method"
  | "ride_status"
  | "trip_completed_at"
  | "assigned_driver"
  | "guest_rider"
  | "guest_rider_name"
  | "guest_rider_number"
> & {
  rider_profile: Pick<
    Tables<"rider_profile">,
    "first_name" | "last_name" | "phone_num"
  > | null;
};

type ScheduledRow = Pick<
  Tables<"schedule_booking">,
  | "id"
  | "schedule_date"
  | "pickup_time"
  | "pick_up"
  | "drop_off"
  | "total_fare"
  | "payment_method"
  | "booking_status"
  | "assigned_driver"
  | "guest_rider"
  | "guest_rider_name"
  | "guest_rider_number"
  | "created_at"
> & {
  rider_profile: Pick<
    Tables<"rider_profile">,
    "first_name" | "last_name" | "phone_num"
  > | null;
};

type DetailStatusFilter =
  | "all"
  | "cancelled"
  | "expired"
  | "completed"
  | "open"
  | "pending";

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
        { error: "Only active admin accounts can view booking details." },
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

function escapeIlike(value: string) {
  return value.replace(/[%*,()]/g, " ").trim();
}

function buildInClause(values: string[]) {
  return `(${values.join(",")})`;
}

function formatRiderName(
  guestRider: boolean,
  guestRiderName: string | null,
  riderProfile: Pick<
    Tables<"rider_profile">,
    "first_name" | "last_name" | "phone_num"
  > | null,
) {
  if (guestRider) {
    return guestRiderName?.trim() || "Guest Rider";
  }

  const combined = `${riderProfile?.first_name ?? ""} ${riderProfile?.last_name ?? ""}`.trim();
  return combined || "Rider";
}

function formatRiderPhone(
  guestRider: boolean,
  guestRiderNumber: string | null,
  riderProfile: Pick<
    Tables<"rider_profile">,
    "first_name" | "last_name" | "phone_num"
  > | null,
) {
  if (guestRider) {
    return guestRiderNumber?.trim() || "Not provided";
  }

  return riderProfile?.phone_num?.trim() || "Not provided";
}

function formatDriverName(
  driverUuid: string | null,
  driverContacts: Map<string, { name: string; phone: string }>,
) {
  if (!driverUuid) {
    return "Unassigned";
  }

  return driverContacts.get(driverUuid)?.name ?? "Assigned Driver";
}

function formatDriverPhone(
  driverUuid: string | null,
  driverContacts: Map<string, { name: string; phone: string }>,
) {
  if (!driverUuid) {
    return "Not assigned";
  }

  return driverContacts.get(driverUuid)?.phone ?? "Not provided";
}

function deriveInstantPaymentStatus(row: InstantRow) {
  const status = row.ride_status.toLowerCase();

  if (status.includes("cancel")) {
    return "Cancelled";
  }

  if (row.trip_completed_at) {
    return "Paid";
  }

  return "Pending";
}

function deriveScheduledPaymentStatus(row: ScheduledRow) {
  const status = row.booking_status.toLowerCase();

  if (status.includes("cancel")) {
    return "Cancelled";
  }

  if (status.includes("complete") || status.includes("converted")) {
    return "Paid";
  }

  return "Pending";
}

async function fetchDriverContacts(
  serviceClient: ReturnType<typeof createServiceClient>,
  driverIds: string[],
) {
  if (driverIds.length === 0) {
    return new Map<string, { name: string; phone: string }>();
  }

  const { data, error } = await serviceClient
    .from("driver_profile")
    .select("uuid, first_name, last_name, phone_num")
    .in("uuid", driverIds);

  if (error) {
    throw new Error(error.message);
  }

  return new Map(
    (data ?? []).map((driver) => [
      driver.uuid,
      {
        name:
          `${driver.first_name ?? ""} ${driver.last_name ?? ""}`.trim() ||
          "Assigned Driver",
        phone: driver.phone_num?.trim() || "Not provided",
      },
    ]),
  );
}

function applyInstantCardFilter<T extends { gte: Function; not: Function; or: Function }>(
  query: T,
  card: BookingTableCard,
  startTodayIso: string,
) {
  if (card === "today") {
    return query.gte("created_at", startTodayIso);
  }

  if (card === "completed") {
    return query.not("trip_completed_at", "is", null);
  }

  if (card === "cancelled") {
    return query.or("ride_status.ilike.%cancel%,ride_status.ilike.%canceled%");
  }

  return query;
}

function applyInstantStatusFilter<T extends { or: Function; is: Function; not: Function }>(
  query: T,
  statusFilter: DetailStatusFilter,
) {
  if (statusFilter === "cancelled") {
    return query.or("ride_status.ilike.%cancel%,ride_status.ilike.%canceled%");
  }

  if (statusFilter === "expired") {
    return query.or("ride_status.ilike.%expired%");
  }

  if (statusFilter === "completed") {
    return query.not("trip_completed_at", "is", null);
  }

  if (statusFilter === "pending") {
    return query
      .is("trip_completed_at", null)
      .or("ride_status.ilike.%pending%,ride_status.ilike.%open%");
  }

  if (statusFilter === "open") {
    return query
      .is("trip_completed_at", null)
      .or(
        "ride_status.ilike.%open%,ride_status.ilike.%pending%,ride_status.ilike.%assign%,ride_status.ilike.%enroute%,ride_status.ilike.%start%",
      );
  }

  return query;
}

function applyScheduledStatusFilter<T extends { or: Function }>(
  query: T,
  statusFilter: DetailStatusFilter,
) {
  if (statusFilter === "cancelled") {
    return query.or("booking_status.ilike.%cancel%,booking_status.ilike.%canceled%");
  }

  if (statusFilter === "expired") {
    return query.or("booking_status.ilike.%expired%");
  }

  if (statusFilter === "completed") {
    return query.or(
      "booking_status.ilike.%complete%,booking_status.ilike.%converted%",
    );
  }

  if (statusFilter === "pending" || statusFilter === "open") {
    return query.or(
      "booking_status.ilike.%pending%,booking_status.ilike.%assign%,booking_status.ilike.%enroute%,booking_status.ilike.%open%",
    );
  }

  return query;
}

async function findMatchingRiderIds(
  serviceClient: ReturnType<typeof createServiceClient>,
  search: string,
) {
  const escaped = escapeIlike(search);

  if (!escaped) {
    return [] as string[];
  }

  const { data, error } = await serviceClient
    .from("rider_profile")
    .select("uuid")
    .or(
      `first_name.ilike.%${escaped}%,last_name.ilike.%${escaped}%,phone_num.ilike.%${escaped}%`,
    )
    .limit(100);

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => row.uuid);
}

async function findMatchingDriverIds(
  serviceClient: ReturnType<typeof createServiceClient>,
  search: string,
) {
  const escaped = escapeIlike(search);

  if (!escaped) {
    return [] as string[];
  }

  const { data, error } = await serviceClient
    .from("driver_profile")
    .select("uuid")
    .or(
      `first_name.ilike.%${escaped}%,last_name.ilike.%${escaped}%,phone_num.ilike.%${escaped}%`,
    )
    .limit(100);

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => row.uuid);
}

async function applySearchFilter<T extends { or: Function }>(
  serviceClient: ReturnType<typeof createServiceClient>,
  query: T,
  tab: BookingTableTab,
  search: string,
) {
  const escaped = escapeIlike(search);

  if (!escaped) {
    return query;
  }

  const [riderIds, driverIds] = await Promise.all([
    findMatchingRiderIds(serviceClient, escaped),
    findMatchingDriverIds(serviceClient, escaped),
  ]);

  const clauses: string[] = [];

  if (tab === "instant") {
    clauses.push(
      `guest_rider_name.ilike.%${escaped}%`,
      `guest_rider_number.ilike.%${escaped}%`,
      `pick_up.ilike.%${escaped}%`,
      `drop_off.ilike.%${escaped}%`,
      `ride_status.ilike.%${escaped}%`,
      `created_at.ilike.%${escaped}%`,
    );
  } else {
    clauses.push(
      `guest_rider_name.ilike.%${escaped}%`,
      `guest_rider_number.ilike.%${escaped}%`,
      `pick_up.ilike.%${escaped}%`,
      `drop_off.ilike.%${escaped}%`,
      `booking_status.ilike.%${escaped}%`,
      `schedule_date.ilike.%${escaped}%`,
      `pickup_time.ilike.%${escaped}%`,
    );
  }

  if (riderIds.length > 0) {
    clauses.push(`rider_id.in.${buildInClause(riderIds)}`);
  }

  if (driverIds.length > 0) {
    clauses.push(`assigned_driver.in.${buildInClause(driverIds)}`);
  }

  return clauses.length > 0 ? query.or(clauses.join(",")) : query;
}

function applyScheduledCardFilter<T extends { eq: Function; or: Function }>(
  query: T,
  card: BookingTableCard,
  todayKey: string,
) {
  if (card === "today") {
    return query.eq("schedule_date", todayKey);
  }

  if (card === "completed") {
    return query.or(
      "booking_status.ilike.%complete%,booking_status.ilike.%converted%",
    );
  }

  if (card === "cancelled") {
    return query.or("booking_status.ilike.%cancel%,booking_status.ilike.%canceled%");
  }

  if (card === "pending") {
    return query.or(
      "booking_status.ilike.%pending%,booking_status.ilike.%assign%,booking_status.ilike.%enroute%",
    );
  }

  return query;
}

export async function GET(request: NextRequest) {
  const resolved = await resolveAdmin(request);

  if (resolved.error) {
    return resolved.error;
  }

  const serviceClient = resolved.serviceClient!;
  const url = new URL(request.url);
  const tab = (url.searchParams.get("tab") ?? "instant") as BookingTableTab;
  const card = (url.searchParams.get("card") ?? "total") as BookingTableCard;
  const statusFilter =
    (url.searchParams.get("status") ?? "all") as DetailStatusFilter;
  const search = url.searchParams.get("search")?.trim() ?? "";
  const page = safeInt(url.searchParams.get("page"), 1);
  const pageSize = Math.min(50, safeInt(url.searchParams.get("pageSize"), 20));
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  const startToday = new Date();
  startToday.setHours(0, 0, 0, 0);
  const startTodayIso = startToday.toISOString();
  const todayKey = startTodayIso.slice(0, 10);

  if (tab !== "instant" && tab !== "scheduled") {
    return NextResponse.json({ error: "Unsupported booking tab." }, { status: 400 });
  }

  try {
    if (tab === "instant") {
      let rowsQuery = serviceClient
        .from("rider_booking")
        .select(
          "id, created_at, pick_up, drop_off, total_fare, payment_method, ride_status, trip_completed_at, assigned_driver, guest_rider, guest_rider_name, guest_rider_number, rider_profile(first_name, last_name, phone_num)",
        )
        .order("created_at", { ascending: false })
        .range(from, to);

      let countQuery = serviceClient
        .from("rider_booking")
        .select("id", { count: "exact", head: true });

      rowsQuery = applyInstantCardFilter(rowsQuery, card, startTodayIso);
      countQuery = applyInstantCardFilter(countQuery, card, startTodayIso);
        rowsQuery = applyInstantStatusFilter(rowsQuery, statusFilter);
        countQuery = applyInstantStatusFilter(countQuery, statusFilter);
        rowsQuery = await applySearchFilter(serviceClient, rowsQuery, tab, search);
        countQuery = await applySearchFilter(serviceClient, countQuery, tab, search);

      const [rowsResult, countResult] = await Promise.all([rowsQuery, countQuery]);

      if (rowsResult.error) {
        return NextResponse.json({ error: rowsResult.error.message }, { status: 400 });
      }

      if (countResult.error) {
        return NextResponse.json({ error: countResult.error.message }, { status: 400 });
      }

      const rows = (rowsResult.data ?? []) as unknown as InstantRow[];
      const driverIds = Array.from(
        new Set(rows.map((row) => row.assigned_driver).filter(Boolean) as string[]),
      );
      const driverContacts = await fetchDriverContacts(serviceClient, driverIds);

      const response: BookingTableResponse = {
        rows: rows.map((row) => ({
          id: row.id,
          riderName: formatRiderName(
            row.guest_rider,
            row.guest_rider_name,
            row.rider_profile,
          ),
          riderPhone: formatRiderPhone(
            row.guest_rider,
            row.guest_rider_number,
            row.rider_profile,
          ),
          driverName: formatDriverName(row.assigned_driver, driverContacts),
          driverPhone: formatDriverPhone(
            row.assigned_driver,
            driverContacts,
          ),
          pickup: row.pick_up,
          dropOff: row.drop_off,
          amount: Number(row.total_fare ?? 0),
          paymentStatus: deriveInstantPaymentStatus(row),
          rideStatus: row.ride_status,
          date: row.created_at,
        })),
        total: countResult.count ?? 0,
        page,
        pageSize,
      };

      return NextResponse.json(response);
    }

    let rowsQuery = serviceClient
      .from("schedule_booking")
      .select(
        "id, schedule_date, pickup_time, pick_up, drop_off, total_fare, payment_method, booking_status, assigned_driver, guest_rider, guest_rider_name, guest_rider_number, created_at, rider_profile(first_name, last_name, phone_num)",
      )
      .order("schedule_date", { ascending: false })
      .order("pickup_time", { ascending: false })
      .range(from, to);

    let countQuery = serviceClient
      .from("schedule_booking")
      .select("id", { count: "exact", head: true });

    rowsQuery = applyScheduledCardFilter(rowsQuery, card, todayKey);
    countQuery = applyScheduledCardFilter(countQuery, card, todayKey);
    rowsQuery = applyScheduledStatusFilter(rowsQuery, statusFilter);
    countQuery = applyScheduledStatusFilter(countQuery, statusFilter);
    rowsQuery = await applySearchFilter(serviceClient, rowsQuery, tab, search);
    countQuery = await applySearchFilter(serviceClient, countQuery, tab, search);

    const [rowsResult, countResult] = await Promise.all([rowsQuery, countQuery]);

    if (rowsResult.error) {
      return NextResponse.json({ error: rowsResult.error.message }, { status: 400 });
    }

    if (countResult.error) {
      return NextResponse.json({ error: countResult.error.message }, { status: 400 });
    }

    const rows = (rowsResult.data ?? []) as unknown as ScheduledRow[];
    const driverIds = Array.from(
      new Set(rows.map((row) => row.assigned_driver).filter(Boolean) as string[]),
    );
    const driverContacts = await fetchDriverContacts(serviceClient, driverIds);

    const response: BookingTableResponse = {
      rows: rows.map((row) => ({
        id: row.id,
        riderName: formatRiderName(
          row.guest_rider,
          row.guest_rider_name,
          row.rider_profile,
        ),
        riderPhone: formatRiderPhone(
          row.guest_rider,
          row.guest_rider_number,
          row.rider_profile,
        ),
        driverName: formatDriverName(row.assigned_driver, driverContacts),
        driverPhone: formatDriverPhone(
          row.assigned_driver,
          driverContacts,
        ),
        pickup: row.pick_up,
        dropOff: row.drop_off ?? "Not set",
        amount: Number(row.total_fare ?? 0),
        paymentStatus: deriveScheduledPaymentStatus(row),
        rideStatus: row.booking_status,
        date: `${row.schedule_date} ${row.pickup_time}`.trim(),
      })),
      total: countResult.count ?? 0,
      page,
      pageSize,
    };

    return NextResponse.json(response);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Could not load booking details.",
      },
      { status: 500 },
    );
  }
}