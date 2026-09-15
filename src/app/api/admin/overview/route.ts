import { NextRequest, NextResponse } from "next/server";
import {
  createServiceClient,
  createUserClient,
  getBearerToken,
  getSupabaseConfig,
  requireActiveAdmin,
} from "@/lib/supabaseAdmin";
import type { Tables } from "@/types/database.types";
export type OverviewTotals = {
  bookings: {
    total: number;
    thisWeek: number;
    lastWeek: number;
    changePct: number | null;
  };
  revenue: {
    thisWeek: number;
    lastWeek: number;
    changePct: number | null;
  };
  drivers: {
    verified: number;
    online: number;
    onlineRate: number | null;
    activeThisWeek: number;
    utilizationRate: number | null;
    completionRate30d: number | null;
  };
  enrouteTrips: number;
};

export type OverviewRevenueDay = {
  date: string;
  amount: number;
};

export type OverviewBookingAnalytics = {
  pending: number;
  inProgress: number;
  completedToday: number;
};

export type OverviewRecentBooking = {
  id: string;
  customer: string;
  pickup: string;
  destination: string;
  time: string;
  status: string;
};

export type OverviewScheduledBooking = {
  id: string;
  customer: string;
  pickup: string;
  destination: string;
  scheduledFor: string;
  passengers: number;
  amount: number;
  status: string;
};

export type OverviewResponse = {
  generatedAt: string;
  totals: OverviewTotals;
  bookingAnalytics: OverviewBookingAnalytics;
  revenueByDay: OverviewRevenueDay[];
  recentBookings: OverviewRecentBooking[];
  scheduledBookings: OverviewScheduledBooking[];
};

const CACHE_HEADERS = {
  "Cache-Control": "private, max-age=15, stale-while-revalidate=45",
  Vary: "Authorization",
};

function toIso(value: Date) {
  return value.toISOString();
}

function startOfToday() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

function changePct(current: number, previous: number) {
  if (!Number.isFinite(previous) || previous <= 0) {
    return null;
  }

  return ((current - previous) / previous) * 100;
}

function formatTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-NG", {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function formatDateTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-NG", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

type ServiceClient = ReturnType<typeof createServiceClient>;

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
        { error: "Only active admin accounts can view analytics." },
        { status: 403 },
      ),
    };
  }

  return { serviceClient };
}

async function countRows(builder: any) {
  const { count, error } = await builder;

  if (error) {
    return { error: error.message };
  }

  return { count: count ?? 0 };
}

export async function GET(request: NextRequest) {
  const resolved = await resolveAdmin(request);

  if (resolved.error) {
    return resolved.error;
  }

  try {
    const serviceClient = resolved.serviceClient!;
    const now = new Date();
    const start7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const start14 = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    const start30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const startToday = startOfToday();

    const [
      bookingsTotalResult,
      bookingsThisWeekResult,
      bookingsLastWeekResult,
    ] = await Promise.all([
      countRows(
        serviceClient
          .from("rider_booking")
          .select("id", { count: "exact", head: true }),
      ),
      countRows(
        serviceClient
          .from("rider_booking")
          .select("id", { count: "exact", head: true })
          .gte("created_at", toIso(start7)),
      ),
      countRows(
        serviceClient
          .from("rider_booking")
          .select("id", { count: "exact", head: true })
          .gte("created_at", toIso(start14))
          .lt("created_at", toIso(start7)),
      ),
    ]);

    for (const result of [
      bookingsTotalResult,
      bookingsThisWeekResult,
      bookingsLastWeekResult,
    ]) {
      if ("error" in result) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }
    }

    const [verifiedDriversResult, onlineDriversResult] = await Promise.all([
      countRows(
        serviceClient
          .from("driver_profile")
          .select("uuid", { count: "exact", head: true })
          .eq("admin_verify", true),
      ),
      countRows(
        serviceClient
          .from("driver_profile")
          .select("uuid", { count: "exact", head: true })
          .eq("admin_verify", true)
          .eq("is_online", true),
      ),
    ]);

    for (const result of [verifiedDriversResult, onlineDriversResult]) {
      if ("error" in result) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }
    }

    const [
      enrouteTripsResult,
      bookingPendingResult,
      bookingInProgressResult,
      completedTodayResult,
    ] = await Promise.all([
      countRows(
        serviceClient
          .from("rider_booking")
          .select("id", { count: "exact", head: true })
          .not("assigned_driver", "is", null)
          .is("trip_started_at", null)
          .is("trip_completed_at", null),
      ),
      countRows(
        serviceClient
          .from("rider_booking")
          .select("id", { count: "exact", head: true })
          .is("assigned_driver", null)
          .is("trip_started_at", null)
          .is("trip_completed_at", null),
      ),
      countRows(
        serviceClient
          .from("rider_booking")
          .select("id", { count: "exact", head: true })
          .not("trip_started_at", "is", null)
          .is("trip_completed_at", null),
      ),
      countRows(
        serviceClient
          .from("rider_booking")
          .select("id", { count: "exact", head: true })
          .not("trip_completed_at", "is", null)
          .gte("trip_completed_at", toIso(startToday)),
      ),
    ]);

    for (const result of [
      enrouteTripsResult,
      bookingPendingResult,
      bookingInProgressResult,
      completedTodayResult,
    ]) {
      if ("error" in result) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }
    }

    const { data: completedRows, error: completedError } = await serviceClient
      .from("rider_booking")
      .select("trip_completed_at, total_fare")
      .not("trip_completed_at", "is", null)
      .gte("trip_completed_at", toIso(start14))
      .limit(20000);

    if (completedError) {
      return NextResponse.json(
        { error: completedError.message },
        { status: 400 },
      );
    }

    const revenueByDayMap = new Map<string, number>();
    let revenueThisWeek = 0;
    let revenueLastWeek = 0;

    for (const row of completedRows ?? []) {
      const completedAt = row.trip_completed_at;
      if (!completedAt) {
        continue;
      }

      const dayKey = completedAt.slice(0, 10);
      const amount = Number(row.total_fare ?? 0);
      revenueByDayMap.set(dayKey, (revenueByDayMap.get(dayKey) ?? 0) + amount);

      const timestamp = new Date(completedAt).getTime();
      if (!Number.isNaN(timestamp)) {
        if (timestamp >= start7.getTime()) {
          revenueThisWeek += amount;
        } else {
          revenueLastWeek += amount;
        }
      }
    }

    const revenueByDay: OverviewRevenueDay[] = [];
    for (let index = 6; index >= 0; index -= 1) {
      const date = new Date(startToday.getTime() - index * 24 * 60 * 60 * 1000);
      const key = toIso(date).slice(0, 10);
      revenueByDay.push({ date: key, amount: revenueByDayMap.get(key) ?? 0 });
    }

    const { data: activeDriverRows, error: activeDriverError } =
      await serviceClient
        .from("rider_booking")
        .select("assigned_driver, trip_completed_at")
        .not("assigned_driver", "is", null)
        .not("trip_completed_at", "is", null)
        .gte("trip_completed_at", toIso(start7))
        .limit(20000);

    if (activeDriverError) {
      return NextResponse.json(
        { error: activeDriverError.message },
        { status: 400 },
      );
    }

    const activeDrivers = new Set(
      (activeDriverRows ?? [])
        .map((row) => row.assigned_driver)
        .filter((uuid): uuid is string => Boolean(uuid)),
    );

    const { count: totalTrips30d } = await serviceClient
      .from("rider_booking")
      .select("id", { count: "exact", head: true })
      .gte("created_at", toIso(start30));

    const { count: completedTrips30d } = await serviceClient
      .from("rider_booking")
      .select("id", { count: "exact", head: true })
      .gte("created_at", toIso(start30))
      .not("trip_completed_at", "is", null);

    const completionRate =
      totalTrips30d && totalTrips30d > 0
        ? (Number(completedTrips30d ?? 0) / Number(totalTrips30d)) * 100
        : null;

    const { data: recentRows, error: recentError } = await serviceClient
      .from("rider_booking")
      .select(
        "id, created_at, pick_up, drop_off, ride_status, trip_started_at, trip_completed_at, assigned_driver, guest_rider, guest_rider_name, rider_profile(first_name, last_name)",
      )
      .order("created_at", { ascending: false })
      .limit(4);

    if (recentError) {
      return NextResponse.json({ error: recentError.message }, { status: 400 });
    }

    type RecentRow = Pick<
      Tables<"rider_booking">,
      | "id"
      | "created_at"
      | "pick_up"
      | "drop_off"
      | "trip_started_at"
      | "trip_completed_at"
      | "assigned_driver"
      | "guest_rider"
      | "guest_rider_name"
    > & {
      rider_profile: Pick<
        Tables<"rider_profile">,
        "first_name" | "last_name"
      > | null;
    };

    const recentBookings: OverviewRecentBooking[] = (
      (recentRows ?? []) as RecentRow[]
    ).map((row) => {
      const riderProfile = row.rider_profile ?? null;
      const name = row.guest_rider
        ? row.guest_rider_name?.trim() || "Guest Rider"
        : `${riderProfile?.first_name ?? ""} ${riderProfile?.last_name ?? ""}`.trim() ||
          "Rider";

      const status = row.trip_completed_at
        ? "completed"
        : row.trip_started_at
          ? "in-progress"
          : row.assigned_driver
            ? "enroute"
            : "pending";

      return {
        id: row.id,
        customer: name,
        pickup: row.pick_up,
        destination: row.drop_off,
        time: formatTime(row.created_at),
        status,
      };
    });

    const todayKey = toIso(startToday).slice(0, 10);
    const { data: scheduledRows, error: scheduledError } = await serviceClient
      .from("schedule_booking")
      .select(
        "id, schedule_date, pickup_time, pick_up, drop_off, booking_status, passenger_num, total_fare, created_at, guest_rider, guest_rider_name, rider_profile(first_name, last_name)",
      )
      .gte("schedule_date", todayKey)
      .order("schedule_date", { ascending: true })
      .order("pickup_time", { ascending: true })
      .limit(4);

    if (scheduledError) {
      return NextResponse.json(
        { error: scheduledError.message },
        { status: 400 },
      );
    }

    type ScheduledRow = Pick<
      Tables<"schedule_booking">,
      | "id"
      | "schedule_date"
      | "pickup_time"
      | "pick_up"
      | "drop_off"
      | "booking_status"
      | "passenger_num"
      | "total_fare"
      | "created_at"
      | "guest_rider"
      | "guest_rider_name"
    > & {
      rider_profile: Pick<
        Tables<"rider_profile">,
        "first_name" | "last_name"
      > | null;
    };

    const scheduledBookings = ((scheduledRows ?? []) as ScheduledRow[]).map(
      (row) => {
        const riderProfile = row.rider_profile ?? null;
        const name = row.guest_rider
          ? row.guest_rider_name?.trim() || "Guest Rider"
          : `${riderProfile?.first_name ?? ""} ${riderProfile?.last_name ?? ""}`.trim() ||
            "Rider";

        return {
          id: row.id,
          customer: name,
          pickup: row.pick_up,
          destination: row.drop_off ?? "Not set",
          scheduledFor: formatDateTime(
            `${row.schedule_date} ${row.pickup_time}`.trim(),
          ),
          passengers: row.passenger_num,
          amount: Number(row.total_fare ?? 0),
          status: row.booking_status,
        };
      },
    ) satisfies OverviewScheduledBooking[];

    const verifiedDrivers = verifiedDriversResult.count;
    const onlineDrivers = onlineDriversResult.count;

    const response: OverviewResponse = {
      generatedAt: toIso(now),
      totals: {
        bookings: {
          total: bookingsTotalResult.count,
          thisWeek: bookingsThisWeekResult.count,
          lastWeek: bookingsLastWeekResult.count,
          changePct: changePct(
            bookingsThisWeekResult.count,
            bookingsLastWeekResult.count,
          ),
        },
        revenue: {
          thisWeek: revenueThisWeek,
          lastWeek: revenueLastWeek,
          changePct: changePct(revenueThisWeek, revenueLastWeek),
        },
        drivers: {
          verified: verifiedDrivers,
          online: onlineDrivers,
          onlineRate:
            verifiedDrivers > 0
              ? (onlineDrivers / verifiedDrivers) * 100
              : null,
          activeThisWeek: activeDrivers.size,
          utilizationRate:
            verifiedDrivers > 0
              ? (activeDrivers.size / verifiedDrivers) * 100
              : null,
          completionRate30d: completionRate,
        },
        enrouteTrips: enrouteTripsResult.count,
      },
      bookingAnalytics: {
        pending: bookingPendingResult.count,
        inProgress: bookingInProgressResult.count,
        completedToday: completedTodayResult.count,
      },
      revenueByDay,
      recentBookings,
      scheduledBookings,
    };

    return NextResponse.json(response, { headers: CACHE_HEADERS });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Could not load analytics data.",
      },
      { status: 500 },
    );
  }
}
