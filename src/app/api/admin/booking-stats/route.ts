import { NextRequest, NextResponse } from "next/server";
import {
  createServiceClient,
  createUserClient,
  getBearerToken,
  getSupabaseConfig,
  requireActiveAdmin,
} from "@/lib/supabaseAdmin";

export type BookingStatsResponse = {
  instant: {
    total: number;
    today: number;
    completed: number;
    cancelled: number;
  };
  scheduled: {
    total: number;
    today: number;
    completed: number;
    pending: number;
  };
};

const CACHE_HEADERS = {
  "Cache-Control": "private, max-age=15, stale-while-revalidate=45",
  Vary: "Authorization",
};

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
        { error: "Only active admin accounts can view booking stats." },
        { status: 403 },
      ),
    };
  }

  return { serviceClient };
}

function toIso(value: Date) {
  return value.toISOString();
}

async function countExact(
  query: PromiseLike<{ count: number | null; error: { message: string } | null }>,
) {
  const result = await query;

  if (result.error) {
    throw new Error(result.error.message);
  }

  return result.count ?? 0;
}

export async function GET(request: NextRequest) {
  const resolved = await resolveAdmin(request);

  if (resolved.error) {
    return resolved.error;
  }

  const serviceClient = resolved.serviceClient!;
  const startToday = new Date();
  startToday.setHours(0, 0, 0, 0);
  const todayKey = startToday.toISOString().slice(0, 10);

  try {
    const [
      instantTotal,
      instantToday,
      instantCompleted,
      instantCancelled,
      scheduledTotal,
      scheduledToday,
      scheduledCompleted,
      scheduledCancelled,
    ] = await Promise.all([
      countExact(
        serviceClient
          .from("rider_booking")
          .select("id", { count: "exact", head: true }),
      ),
      countExact(
        serviceClient
          .from("rider_booking")
          .select("id", { count: "exact", head: true })
          .gte("created_at", toIso(startToday)),
      ),
      countExact(
        serviceClient
          .from("rider_booking")
          .select("id", { count: "exact", head: true })
          .not("trip_completed_at", "is", null),
      ),
      countExact(
        serviceClient
          .from("rider_booking")
          .select("id", { count: "exact", head: true })
          .or("ride_status.ilike.%cancel%,ride_status.ilike.%canceled%"),
      ),
      countExact(
        serviceClient
          .from("schedule_booking")
          .select("id", { count: "exact", head: true }),
      ),
      countExact(
        serviceClient
          .from("schedule_booking")
          .select("id", { count: "exact", head: true })
          .eq("schedule_date", todayKey),
      ),
      countExact(
        serviceClient
          .from("schedule_booking")
          .select("id", { count: "exact", head: true })
          .or(
            "booking_status.ilike.%complete%,booking_status.ilike.%converted%",
          ),
      ),
      countExact(
        serviceClient
          .from("schedule_booking")
          .select("id", { count: "exact", head: true })
          .or("booking_status.ilike.%cancel%,booking_status.ilike.%canceled%"),
      ),
    ]);

    const response: BookingStatsResponse = {
      instant: {
        total: instantTotal,
        today: instantToday,
        completed: instantCompleted,
        cancelled: instantCancelled,
      },
      scheduled: {
        total: scheduledTotal,
        today: scheduledToday,
        completed: scheduledCompleted,
        pending: Math.max(0, scheduledTotal - scheduledCompleted - scheduledCancelled),
      },
    };

    return NextResponse.json(response, { headers: CACHE_HEADERS });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Could not load booking stats.",
      },
      { status: 500 },
    );
  }
}