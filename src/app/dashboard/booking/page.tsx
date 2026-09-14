"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Calendar,
  Clock,
  Loader2,
  RefreshCw,
  Search,
  Banknote,
  ListChecks,
} from "lucide-react";
import TablePagination from "@/components/TablePagination";
import { notify } from "@/lib/notify";
import { useAdminApi } from "@/lib/useAdminApi";
import type { ScheduleBookingsResponse } from "@/app/api/admin/schedule-bookings/route";

type ScheduleBookingRow = ScheduleBookingsResponse["bookings"][number];

const PAGE_SIZE = 12;
const CACHE_TTL_MS = 20_000;

function formatNaira(amount: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(amount);
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

function statusClasses(status: string) {
  const normalized = status.toLowerCase();

  if (normalized.includes("cancel")) {
    return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300";
  }

  if (normalized.includes("complete") || normalized.includes("converted")) {
    return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300";
  }

  if (normalized.includes("assign") || normalized.includes("enroute")) {
    return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300";
  }

  return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-200";
}

function statIconWrapper(bg: string) {
  return `flex h-12 w-12 items-center justify-center rounded-xl ${bg}`;
}

function statChangeTone(value: number) {
  if (value === 0) {
    return "text-gray-500 dark:text-gray-300";
  }

  return value > 0
    ? "text-green-600 dark:text-green-400"
    : "text-red-600 dark:text-red-400";
}

function formatCompact(value: number) {
  return new Intl.NumberFormat("en-NG", { notation: "compact" }).format(value);
}

function SkeletonBlock({ className }: { className: string }) {
  return (
    <div
      className={`animate-pulse rounded-lg bg-gray-200 dark:bg-gray-700 ${className}`}
    />
  );
}

export default function BookingPage() {
  const api = useAdminApi();
  const [bookings, setBookings] = useState<ScheduleBookingRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");

  const loadBookings = useCallback(
    async ({ force }: { force?: boolean } = {}) => {
      setIsLoading(true);

      try {
        const params = new URLSearchParams({
          page: String(page),
          pageSize: String(PAGE_SIZE),
        });

        if (statusFilter.trim()) {
          params.set("status", statusFilter.trim());
        }

        const cacheKey = `schedule-bookings:${params.toString()}`;
        const result = await api.getJsonCached<ScheduleBookingsResponse>(
          cacheKey,
          `/api/admin/schedule-bookings?${params.toString()}`,
          { ttlMs: CACHE_TTL_MS, force },
        );

        setBookings(result.bookings ?? []);
        setTotal(result.total ?? 0);
      } catch (error) {
        notify.error(
          error instanceof Error ? error.message : "Could not load bookings.",
        );
      } finally {
        setIsLoading(false);
      }
    },
    [api, page, statusFilter],
  );

  useEffect(() => {
    if (!api.ready) {
      return;
    }

    void loadBookings();
  }, [api.ready, loadBookings]);

  const filteredBookings = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) {
      return bookings;
    }

    return bookings.filter((booking) => {
      return (
        booking.customer.toLowerCase().includes(query) ||
        booking.pickup.toLowerCase().includes(query) ||
        booking.destination.toLowerCase().includes(query) ||
        booking.status.toLowerCase().includes(query)
      );
    });
  }, [bookings, search]);

  const stats = useMemo(() => {
    const pageRevenue = bookings.reduce(
      (acc, booking) => acc + (booking.amount ?? 0),
      0,
    );
    const pendingCount = bookings.filter((booking) =>
      booking.status.toLowerCase().includes("pending"),
    ).length;
    const upcomingToday = (() => {
      const todayKey = new Date().toISOString().slice(0, 10);
      return bookings.filter((booking) =>
        booking.scheduledFor.startsWith(todayKey),
      ).length;
    })();

    const visibleCount = filteredBookings.length;

    return {
      total,
      pageRevenue,
      pendingCount,
      upcomingToday,
      visibleCount,
    };
  }, [bookings, filteredBookings.length, total]);

  return (
    <div className="p-4 md:p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-200">
              <Calendar size={20} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Scheduled Bookings
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                View upcoming and historical scheduled trips.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => void loadBookings({ force: true })}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
            disabled={isLoading}
          >
            <RefreshCw size={16} className={isLoading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>

        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {isLoading && bookings.length === 0 ? (
            <>
              {Array.from({ length: 4 }).map((_, index) => (
                <div
                  key={`stat-skeleton-${index}`}
                  className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800 md:p-6"
                >
                  <div className="mb-4 flex items-center justify-between">
                    <SkeletonBlock className="h-12 w-12" />
                    <SkeletonBlock className="h-4 w-16" />
                  </div>
                  <SkeletonBlock className="h-4 w-24" />
                  <SkeletonBlock className="mt-3 h-7 w-28" />
                </div>
              ))}
            </>
          ) : (
            <>
              <div className="rounded-lg border border-gray-200 bg-white p-4 transition hover:shadow-lg dark:border-gray-700 dark:bg-gray-800 md:p-6">
                <div className="mb-4 flex items-center justify-between">
                  <div className={statIconWrapper("bg-blue-500")}>
                    <ListChecks size={22} className="text-white" />
                  </div>
                  <span className="text-sm font-semibold text-gray-500 dark:text-gray-300">
                    {statusFilter ? "Filtered" : "All"}
                  </span>
                </div>
                <h3 className="mb-1 text-sm text-gray-600 dark:text-gray-400">
                  Total Scheduled
                </h3>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {stats.total.toLocaleString()}
                </p>
              </div>

              <div className="rounded-lg border border-gray-200 bg-white p-4 transition hover:shadow-lg dark:border-gray-700 dark:bg-gray-800 md:p-6">
                <div className="mb-4 flex items-center justify-between">
                  <div className={statIconWrapper("bg-green-500")}>
                    <Banknote size={22} className="text-white" />
                  </div>
                  <span className="text-sm font-semibold text-gray-500 dark:text-gray-300">
                    Page sum
                  </span>
                </div>
                <h3 className="mb-1 text-sm text-gray-600 dark:text-gray-400">
                  Fare Volume
                </h3>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {formatNaira(stats.pageRevenue)}
                </p>
              </div>

              <div className="rounded-lg border border-gray-200 bg-white p-4 transition hover:shadow-lg dark:border-gray-700 dark:bg-gray-800 md:p-6">
                <div className="mb-4 flex items-center justify-between">
                  <div className={statIconWrapper("bg-amber-500")}>
                    <Clock size={22} className="text-white" />
                  </div>
                  <span className="text-sm font-semibold text-gray-500 dark:text-gray-300">
                    Today
                  </span>
                </div>
                <h3 className="mb-1 text-sm text-gray-600 dark:text-gray-400">
                  Upcoming Today
                </h3>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {formatCompact(stats.upcomingToday)}
                </p>
              </div>

              <div className="rounded-lg border border-gray-200 bg-white p-4 transition hover:shadow-lg dark:border-gray-700 dark:bg-gray-800 md:p-6">
                <div className="mb-4 flex items-center justify-between">
                  <div className={statIconWrapper("bg-purple-500")}>
                    <Calendar size={22} className="text-white" />
                  </div>
                  <span
                    className={`text-sm font-semibold ${statChangeTone(stats.pendingCount)}`}
                  >
                    {stats.pendingCount.toLocaleString()}
                  </span>
                </div>
                <h3 className="mb-1 text-sm text-gray-600 dark:text-gray-400">
                  Pending (This Page)
                </h3>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {stats.visibleCount.toLocaleString()}
                </p>
              </div>
            </>
          )}
        </div>

        <div className="mb-5 grid grid-cols-1 gap-3 md:grid-cols-3">
          <div className="relative">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search customer, pickup, status..."
              className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-9 pr-3 text-sm text-gray-900 outline-none transition focus:border-transparent focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
            />
          </div>

          <div>
            <select
              value={statusFilter}
              onChange={(event) => {
                setPage(1);
                setStatusFilter(event.target.value);
              }}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-transparent focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
            >
              <option value="">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="assigned">Assigned</option>
              <option value="converted">Converted</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800 md:p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Bookings
            </h2>
            <div className="text-sm text-gray-600 dark:text-gray-300">
              {isLoading ? "Loading..." : `${filteredBookings.length} on page`}
            </div>
          </div>

          {isLoading && bookings.length === 0 ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 9 }).map((_, index) => (
                <div
                  key={`booking-skeleton-${index}`}
                  className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-700/40"
                >
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div className="w-full">
                      <SkeletonBlock className="h-4 w-32" />
                      <SkeletonBlock className="mt-2 h-3 w-28" />
                    </div>
                    <SkeletonBlock className="h-6 w-20" />
                  </div>
                  <SkeletonBlock className="h-3 w-full" />
                  <SkeletonBlock className="mt-2 h-3 w-5/6" />
                  <div className="mt-4 flex items-center justify-between">
                    <SkeletonBlock className="h-3 w-16" />
                    <SkeletonBlock className="h-4 w-20" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredBookings.length === 0 ? (
            <div className="rounded-lg border border-dashed border-gray-300 p-6 text-center text-sm text-gray-600 dark:border-gray-700 dark:text-gray-300">
              No scheduled bookings found.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredBookings.map((booking) => (
                <div
                  key={booking.id}
                  className="rounded-lg border border-gray-200 bg-gray-50 p-4 transition hover:border-blue-500 hover:shadow-md dark:border-gray-700 dark:bg-gray-700/40"
                >
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">
                        {booking.customer}
                      </p>
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        {formatDateTime(booking.scheduledFor)}
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${statusClasses(booking.status)}`}
                    >
                      {booking.status}
                    </span>
                  </div>

                  <div className="space-y-1 text-xs text-gray-600 dark:text-gray-300">
                    <p className="truncate">{booking.pickup}</p>
                    <p className="truncate">{booking.destination}</p>
                  </div>

                  <div className="mt-4 flex items-center justify-between text-xs text-gray-600 dark:text-gray-300">
                    <span>{booking.passengers} pax</span>
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">
                      {formatNaira(booking.amount)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-4 overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
          <TablePagination
            currentPage={page}
            pageSize={PAGE_SIZE}
            totalItems={total}
            itemLabel="scheduled bookings"
            onPageChange={setPage}
          />
        </div>
      </div>
    </div>
  );
}
