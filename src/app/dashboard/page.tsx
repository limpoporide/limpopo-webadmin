"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { notify } from "@/lib/notify";
import { supabase } from "@/lib/supabase";
import {
  Calendar,
  Car,
  Loader2,
  TrendingUp,
  Users,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import type { OverviewResponse } from "@/app/api/admin/overview/route";

type StatCard = {
  title: string;
  value: string;
  change: string;
  changeTone: "up" | "down" | "neutral";
  icon: typeof Calendar;
  color: string;
};

function formatNaira(amount: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatPct(value: number | null) {
  if (value === null || !Number.isFinite(value)) {
    return "—";
  }

  const rounded = Math.round(value * 10) / 10;
  const sign = rounded > 0 ? "+" : "";
  return `${sign}${rounded}%`;
}

function tone(value: number | null) {
  if (value === null || !Number.isFinite(value) || value === 0) {
    return "neutral" as const;
  }

  return value > 0 ? ("up" as const) : ("down" as const);
}

export default function DashboardOverview() {
  const [overview, setOverview] = useState<OverviewResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchOverview = useCallback(async () => {
    setIsLoading(true);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        notify.error("Your session expired. Please sign in again");
        setIsLoading(false);
        return;
      }

      const response = await fetch("/api/admin/overview", {
        headers: { Authorization: `Bearer ${session.access_token}` },
        cache: "no-store",
      });

      if (response.status === 204 || response.status === 304) {
        throw new Error("Dashboard analytics returned an empty response.");
      }

      const rawText = await response.text();
      const parsed = rawText ? (JSON.parse(rawText) as unknown) : null;

      if (!response.ok) {
        const message =
          parsed && typeof parsed === "object" && "error" in parsed
            ? String((parsed as { error?: unknown }).error ?? "Request failed.")
            : "Could not load dashboard analytics.";
        throw new Error(message);
      }

      if (!parsed) {
        throw new Error("Dashboard analytics returned an empty response.");
      }

      setOverview(parsed as OverviewResponse);
    } catch (error) {
      notify.error(
        error instanceof Error
          ? error.message
          : "Could not load dashboard analytics.",
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchOverview();
  }, [fetchOverview]);

  const statCards = useMemo<StatCard[]>(() => {
    if (!overview) {
      return [];
    }

    const bookingsChange = overview.totals.bookings.changePct;
    const revenueChange = overview.totals.revenue.changePct;

    return [
      {
        title: "Total Bookings",
        value: overview.totals.bookings.total.toLocaleString(),
        change: formatPct(bookingsChange),
        changeTone: tone(bookingsChange),
        icon: Calendar,
        color: "bg-blue-500",
      },
      {
        title: "Revenue (This Week)",
        value: formatNaira(overview.totals.revenue.thisWeek),
        change: formatPct(revenueChange),
        changeTone: tone(revenueChange),
        icon: TrendingUp,
        color: "bg-green-500",
      },
      {
        title: "Verified Drivers Online",
        value: `${overview.totals.drivers.online.toLocaleString()} / ${overview.totals.drivers.verified.toLocaleString()}`,
        change:
          overview.totals.drivers.onlineRate === null
            ? "—"
            : `${Math.round(overview.totals.drivers.onlineRate)}%`,
        changeTone: "neutral",
        icon: Users,
        color: "bg-purple-500",
      },
      {
        title: "Drivers Enroute",
        value: overview.totals.enrouteTrips.toLocaleString(),
        change:
          overview.totals.drivers.utilizationRate === null
            ? "—"
            : `${Math.round(overview.totals.drivers.utilizationRate)}%`,
        changeTone: "neutral",
        icon: Car,
        color: "bg-orange-500",
      },
    ];
  }, [overview]);

  const revenueProgress = useMemo(() => {
    if (!overview) {
      return { thisWeekPct: 0, lastWeekPct: 0 };
    }

    const maxValue = Math.max(
      overview.totals.revenue.thisWeek,
      overview.totals.revenue.lastWeek,
      1,
    );
    return {
      thisWeekPct: Math.round(
        (overview.totals.revenue.thisWeek / maxValue) * 100,
      ),
      lastWeekPct: Math.round(
        (overview.totals.revenue.lastWeek / maxValue) * 100,
      ),
    };
  }, [overview]);

  return (
    <div className="p-4 md:p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 md:mb-8">
          <h1 className="mb-2 text-2xl font-bold text-gray-900 dark:text-white">
            Welcome Admin 👋
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 md:text-base">
            Here&apos;s what&apos;s happening with your platform today.
          </p>
        </div>

        <div className="col-span-12">
          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 md:gap-6">
            {isLoading ? (
              <div className="col-span-full flex items-center gap-2 rounded-lg border border-gray-200 bg-white p-6 text-sm text-gray-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">
                <Loader2 size={18} className="animate-spin" />
                Loading dashboard analytics...
              </div>
            ) : (
              statCards.map((stat) => {
                const Icon = stat.icon;
                const ChangeIcon =
                  stat.changeTone === "up"
                    ? ArrowUpRight
                    : stat.changeTone === "down"
                      ? ArrowDownRight
                      : null;

                return (
                  <div
                    key={stat.title}
                    className="rounded-lg border border-gray-200 bg-white p-4 transition hover:shadow-lg dark:border-gray-700 dark:bg-gray-800 md:p-6"
                  >
                    <div className="mb-4 flex items-center justify-between">
                      <div className={`${stat.color} rounded-lg p-3`}>
                        <Icon size={24} className="text-white" />
                      </div>
                      <span
                        className={`inline-flex items-center gap-1 text-sm font-semibold ${
                          stat.changeTone === "down"
                            ? "text-red-600 dark:text-red-400"
                            : stat.changeTone === "up"
                              ? "text-green-600 dark:text-green-400"
                              : "text-gray-500 dark:text-gray-300"
                        }`}
                      >
                        {ChangeIcon ? <ChangeIcon size={16} /> : null}
                        {stat.change}
                      </span>
                    </div>
                    <h3 className="mb-1 text-sm text-gray-600 dark:text-gray-400">
                      {stat.title}
                    </h3>
                    <p className="text-xl font-bold text-gray-900 dark:text-white md:text-2xl">
                      {stat.value}
                    </p>
                  </div>
                );
              })
            )}
          </div>

          <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 md:gap-6">
            <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800 md:p-6">
              <div className="mb-4 flex items-center gap-2">
                <TrendingUp
                  size={20}
                  className="text-green-600 dark:text-green-400"
                />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Revenue Trends
                </h3>
              </div>

              {overview ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      This Week
                    </span>
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">
                      {formatNaira(overview.totals.revenue.thisWeek)}
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-gray-200 dark:bg-gray-700">
                    <div
                      className="h-2 rounded-full bg-green-500"
                      style={{ width: `${revenueProgress.thisWeekPct}%` }}
                    ></div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      Last Week
                    </span>
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">
                      {formatNaira(overview.totals.revenue.lastWeek)}
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-gray-200 dark:bg-gray-700">
                    <div
                      className="h-2 rounded-full bg-blue-500"
                      style={{ width: `${revenueProgress.lastWeekPct}%` }}
                    ></div>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Analytics unavailable.
                </p>
              )}
            </div>

            <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800 md:p-6">
              <div className="mb-4 flex items-center gap-2">
                <Car
                  size={20}
                  className="text-purple-600 dark:text-purple-400"
                />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Driver Performance
                </h3>
              </div>

              {overview ? (
                <div className="space-y-4">
                  <div>
                    <div className="mb-1 flex justify-between">
                      <span className="text-xs text-gray-600 dark:text-gray-400">
                        Active Drivers (7 days)
                      </span>
                      <span className="text-xs font-semibold text-gray-900 dark:text-white">
                        {overview.totals.drivers.activeThisWeek.toLocaleString()}
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-gray-200 dark:bg-gray-700">
                      <div
                        className="h-2 rounded-full bg-purple-500"
                        style={{
                          width: `${
                            overview.totals.drivers.utilizationRate === null
                              ? 0
                              : Math.min(
                                  100,
                                  Math.round(
                                    overview.totals.drivers.utilizationRate,
                                  ),
                                )
                          }%`,
                        }}
                      ></div>
                    </div>
                  </div>
                  <div>
                    <div className="mb-1 flex justify-between">
                      <span className="text-xs text-gray-600 dark:text-gray-400">
                        30-day Completion Rate
                      </span>
                      <span className="text-xs font-semibold text-gray-900 dark:text-white">
                        {overview.totals.drivers.completionRate30d === null
                          ? "—"
                          : `${Math.round(overview.totals.drivers.completionRate30d)}%`}
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-gray-200 dark:bg-gray-700">
                      <div
                        className="h-2 rounded-full bg-yellow-500"
                        style={{
                          width: `${
                            overview.totals.drivers.completionRate30d === null
                              ? 0
                              : Math.min(
                                  100,
                                  Math.round(
                                    overview.totals.drivers.completionRate30d,
                                  ),
                                )
                          }%`,
                        }}
                      ></div>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Analytics unavailable.
                </p>
              )}
            </div>

            <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800 md:p-6">
              <div className="mb-4 flex items-center gap-2">
                <BarChart3
                  size={20}
                  className="text-blue-600 dark:text-blue-400"
                />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Booking Analytics
                </h3>
              </div>

              {overview ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between rounded bg-gray-50 p-2 dark:bg-gray-700/50">
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      Pending
                    </span>
                    <span className="text-sm font-semibold text-yellow-600 dark:text-yellow-400">
                      {overview.bookingAnalytics.pending.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between rounded bg-gray-50 p-2 dark:bg-gray-700/50">
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      In Progress
                    </span>
                    <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                      {overview.bookingAnalytics.inProgress.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between rounded bg-gray-50 p-2 dark:bg-gray-700/50">
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      Completed Today
                    </span>
                    <span className="text-sm font-semibold text-green-600 dark:text-green-400">
                      {overview.bookingAnalytics.completedToday.toLocaleString()}
                    </span>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Analytics unavailable.
                </p>
              )}
            </div>
          </div>

          <div className="col-span-12">
            <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800 md:p-6">
              <div className="mb-4 flex items-center justify-between md:mb-6">
                <h3 className="flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white md:text-xl">
                  <Calendar
                    size={20}
                    className="text-blue-600 dark:text-blue-400"
                  />
                  Scheduled Bookings
                </h3>
                <Link
                  href="/dashboard/booking"
                  className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
                >
                  View All
                </Link>
              </div>

              {overview ? (
                overview.scheduledBookings.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-gray-300 p-4 text-sm text-gray-600 dark:border-gray-700 dark:text-gray-300">
                    No upcoming scheduled bookings.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4 md:gap-4">
                    {overview.scheduledBookings.map((booking) => (
                      <Link
                        key={booking.id}
                        href="/dashboard/booking"
                        className="cursor-pointer rounded-lg border border-transparent bg-gray-50 p-4 transition hover:border-blue-500 hover:shadow-md dark:bg-gray-700/50"
                      >
                        <div className="mb-3 flex items-start justify-between gap-2">
                          <div>
                            <p className="text-sm font-semibold text-gray-900 dark:text-white">
                              {booking.customer}
                            </p>
                            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                              {booking.scheduledFor}
                            </p>
                          </div>
                          <span className="rounded-full bg-blue-100 px-2 py-1 text-xs font-semibold text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                            {booking.status}
                          </span>
                        </div>

                        <div className="space-y-1 text-xs text-gray-600 dark:text-gray-300">
                          <p className="truncate">{booking.pickup}</p>
                          <p className="truncate">{booking.destination}</p>
                        </div>

                        <div className="mt-3 flex items-center justify-between text-xs text-gray-600 dark:text-gray-300">
                          <span>{booking.passengers} pax</span>
                          <span className="font-semibold text-gray-900 dark:text-white">
                            {formatNaira(booking.amount)}
                          </span>
                        </div>
                      </Link>
                    ))}
                  </div>
                )
              ) : (
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Analytics unavailable.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
