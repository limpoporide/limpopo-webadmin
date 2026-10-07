"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Banknote,
  Calendar,
  Car,
  Clock,
  ListChecks,
  Package,
  RefreshCw,
  Search,
  Zap,
} from "lucide-react";
import TablePagination from "@/components/TablePagination";
import { notify } from "@/lib/notify";
import { useAdminApi } from "@/lib/useAdminApi";
import type { BookingStatsResponse } from "@/app/api/admin/booking-stats/route";
import type {
  BookingTableCard,
  BookingTableResponse,
  BookingTableRow,
  BookingTableTab,
} from "@/app/api/admin/booking-table/route";

type BookingTab = BookingTableTab | "courier";

type SummaryCard = {
  key: BookingTableCard;
  label: string;
  value: number;
  meta: string;
  icon: typeof Zap;
  tone: string;
};

type RideStatusFilter =
  | "all"
  | "cancelled"
  | "expired"
  | "completed"
  | "open"
  | "pending";

const PAGE_SIZE = 20;
const CACHE_TTL_MS = 20_000;

const TAB_CONFIG: Array<{
  key: BookingTab;
  label: string;
  icon: typeof Zap;
  description: string;
  defaultCard: BookingTableCard;
}> = [
  {
    key: "instant",
    label: "Instant Bookings",
    icon: Zap,
    description: "Live rider booking activity from the on-demand trip flow.",
    defaultCard: "total",
  },
  {
    key: "scheduled",
    label: "Schedule Bookings",
    icon: Calendar,
    description: "Upcoming and historical bookings created ahead of time.",
    defaultCard: "total",
  },
  {
    key: "courier",
    label: "Courier Delivery",
    icon: Package,
    description: "Courier delivery overview while backend integration is pending.",
    defaultCard: "total",
  },
];

const COURIER_ROWS: BookingTableRow[] = [
  {
    id: "courier-001",
    riderName: "Amara Okeke",
    riderPhone: "08030000001",
    driverName: "Daniel Obi",
    driverPhone: "08040000001",
    pickup: "Lekki Phase 1, Lagos",
    dropOff: "Victoria Island, Lagos",
    amount: 8500,
    paymentStatus: "Paid",
    rideStatus: "completed",
    date: new Date().toISOString(),
  },
  {
    id: "courier-002",
    riderName: "Tomiwa Akin",
    riderPhone: "08030000002",
    driverName: "Sarah Yusuf",
    driverPhone: "08040000002",
    pickup: "Ikeja GRA, Lagos",
    dropOff: "Yaba, Lagos",
    amount: 6200,
    paymentStatus: "Pending",
    rideStatus: "pending",
    date: new Date().toISOString(),
  },
  {
    id: "courier-003",
    riderName: "Ngozi Eze",
    riderPhone: "08030000003",
    driverName: "Unassigned",
    driverPhone: "Not assigned",
    pickup: "Surulere, Lagos",
    dropOff: "Ajah, Lagos",
    amount: 9100,
    paymentStatus: "Cancelled",
    rideStatus: "cancelled",
    date: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: "courier-004",
    riderName: "David Bello",
    riderPhone: "08030000004",
    driverName: "Musa Aliyu",
    driverPhone: "08040000004",
    pickup: "Ikoyi, Lagos",
    dropOff: "Lekki Phase 2, Lagos",
    amount: 7800,
    paymentStatus: "Paid",
    rideStatus: "completed",
    date: new Date(Date.now() - 2 * 86400000).toISOString(),
  },
  {
    id: "courier-005",
    riderName: "Aisha Lawal",
    riderPhone: "08030000005",
    driverName: "Femi Ade",
    driverPhone: "08040000005",
    pickup: "Maryland, Lagos",
    dropOff: "Magodo, Lagos",
    amount: 5400,
    paymentStatus: "Pending",
    rideStatus: "pending",
    date: new Date(Date.now() - 3 * 86400000).toISOString(),
  },
  {
    id: "courier-006",
    riderName: "John Peters",
    riderPhone: "08030000006",
    driverName: "James Ekanem",
    driverPhone: "08040000006",
    pickup: "Festac, Lagos",
    dropOff: "Apapa, Lagos",
    amount: 6900,
    paymentStatus: "Paid",
    rideStatus: "completed",
    date: new Date(Date.now() - 4 * 86400000).toISOString(),
  },
  {
    id: "courier-007",
    riderName: "Kemi Thomas",
    riderPhone: "08030000007",
    driverName: "Ngozi Driver",
    driverPhone: "08040000007",
    pickup: "Mushin, Lagos",
    dropOff: "Ojodu, Lagos",
    amount: 4800,
    paymentStatus: "Cancelled",
    rideStatus: "cancelled",
    date: new Date(Date.now() - 5 * 86400000).toISOString(),
  },
  {
    id: "courier-008",
    riderName: "Gbenga Cole",
    riderPhone: "08030000008",
    driverName: "Haruna Sule",
    driverPhone: "08040000008",
    pickup: "Oshodi, Lagos",
    dropOff: "Gbagada, Lagos",
    amount: 7200,
    paymentStatus: "Pending",
    rideStatus: "pending",
    date: new Date(Date.now() - 6 * 86400000).toISOString(),
  },
  {
    id: "courier-009",
    riderName: "Chioma Nnadi",
    riderPhone: "08030000009",
    driverName: "Daniel Obi",
    driverPhone: "08040000001",
    pickup: "Chevron, Lagos",
    dropOff: "Sangotedo, Lagos",
    amount: 6300,
    paymentStatus: "Paid",
    rideStatus: "completed",
    date: new Date(Date.now() - 7 * 86400000).toISOString(),
  },
  {
    id: "courier-010",
    riderName: "Bola Adeyemi",
    riderPhone: "08030000010",
    driverName: "Sarah Yusuf",
    driverPhone: "08040000002",
    pickup: "Ogba, Lagos",
    dropOff: "Alausa, Lagos",
    amount: 5100,
    paymentStatus: "Pending",
    rideStatus: "pending",
    date: new Date(Date.now() - 8 * 86400000).toISOString(),
  },
  {
    id: "courier-011",
    riderName: "Princess Udo",
    riderPhone: "08030000011",
    driverName: "Musa Aliyu",
    driverPhone: "08040000004",
    pickup: "Ikotun, Lagos",
    dropOff: "Egbeda, Lagos",
    amount: 4700,
    paymentStatus: "Paid",
    rideStatus: "completed",
    date: new Date(Date.now() - 9 * 86400000).toISOString(),
  },
  {
    id: "courier-012",
    riderName: "Samuel Nwachukwu",
    riderPhone: "08030000012",
    driverName: "Unassigned",
    driverPhone: "Not assigned",
    pickup: "Badore, Lagos",
    dropOff: "Jakande, Lagos",
    amount: 5900,
    paymentStatus: "Cancelled",
    rideStatus: "cancelled",
    date: new Date(Date.now() - 10 * 86400000).toISOString(),
  },
];

function formatNaira(amount: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDateOnly(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-NG", {
    dateStyle: "medium",
  }).format(date);
}

function formatTimeOnly(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-NG", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(date);
}

function statusClasses(status: string) {
  const normalized = status.toLowerCase();

  if (normalized.includes("cancel")) {
    return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300";
  }

  if (normalized.includes("complete") || normalized.includes("paid")) {
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

function SkeletonBlock({ className }: { className: string }) {
  return (
    <div
      className={`animate-pulse rounded-lg bg-gray-200 dark:bg-gray-700 ${className}`}
    />
  );
}

function getCourierRows(card: BookingTableCard, page: number, pageSize: number) {
  const startToday = new Date();
  startToday.setHours(0, 0, 0, 0);

  const filtered = COURIER_ROWS.filter((row) => {
    const rowDate = new Date(row.date);
    const status = row.rideStatus.toLowerCase();

    if (card === "today") {
      return rowDate >= startToday;
    }

    if (card === "completed") {
      return status.includes("complete");
    }

    if (card === "cancelled") {
      return status.includes("cancel");
    }

    return true;
  });

  const from = (page - 1) * pageSize;

  return {
    rows: filtered.slice(from, from + pageSize),
    total: filtered.length,
  };
}

function applyCourierStatusFilter(
  rows: BookingTableRow[],
  statusFilter: RideStatusFilter,
) {
  if (statusFilter === "all") {
    return rows;
  }

  return rows.filter((row) => {
    const status = row.rideStatus.toLowerCase();

    if (statusFilter === "cancelled") {
      return status.includes("cancel");
    }

    if (statusFilter === "expired") {
      return status.includes("expired");
    }

    if (statusFilter === "completed") {
      return status.includes("complete");
    }

    if (statusFilter === "pending") {
      return status.includes("pending") || status.includes("open");
    }

    return status.includes("open") || status.includes("pending");
  });
}

function applyCourierSearch(rows: BookingTableRow[], query: string) {
  const normalized = query.trim().toLowerCase();

  if (!normalized) {
    return rows;
  }

  return rows.filter((row) => {
    const haystack = [
      row.riderName,
      row.driverName,
      row.riderPhone,
      row.driverPhone,
      formatDateOnly(row.date),
      formatTimeOnly(row.date),
    ]
      .join(" ")
      .toLowerCase();

    return haystack.includes(normalized);
  });
}

function getRideStatusOptions(activeTab: BookingTab) {
  if (activeTab === "scheduled") {
    return [
      { value: "all", label: "All Ride Status" },
      { value: "cancelled", label: "Cancelled" },
      { value: "expired", label: "Expired" },
      { value: "pending", label: "Pending" },
      { value: "completed", label: "Completed" },
    ] satisfies Array<{ value: RideStatusFilter; label: string }>;
  }

  return [
    { value: "all", label: "All Ride Status" },
    { value: "cancelled", label: "Cancelled" },
    { value: "expired", label: "Expired" },
    { value: "completed", label: "Completed" },
    { value: "open", label: "Open" },
  ] satisfies Array<{ value: RideStatusFilter; label: string }>;
}

function getDefaultCard(tab: BookingTab) {
  return TAB_CONFIG.find((item) => item.key === tab)?.defaultCard ?? "total";
}

function buildSummaryCards(
  activeTab: BookingTab,
  bookingStats: BookingStatsResponse | null,
): SummaryCard[] {
  if (activeTab === "instant") {
    return [
      {
        key: "total",
        label: "Total Instant Booking",
        value: bookingStats?.instant.total ?? 0,
        meta: "All time",
        icon: Car,
        tone: "bg-blue-500",
      },
      {
        key: "today",
        label: "Today Booking",
        value: bookingStats?.instant.today ?? 0,
        meta: "Today",
        icon: Calendar,
        tone: "bg-emerald-500",
      },
      {
        key: "completed",
        label: "Completed Booking",
        value: bookingStats?.instant.completed ?? 0,
        meta: "Finished rides",
        icon: ListChecks,
        tone: "bg-green-500",
      },
      {
        key: "cancelled",
        label: "Cancelled Booking",
        value: bookingStats?.instant.cancelled ?? 0,
        meta: "Cancelled rides",
        icon: Clock,
        tone: "bg-red-500",
      },
    ];
  }

  if (activeTab === "courier") {
    const total = COURIER_ROWS.length;
    const today = getCourierRows("today", 1, COURIER_ROWS.length).total;
    const completed = getCourierRows("completed", 1, COURIER_ROWS.length).total;
    const cancelled = getCourierRows("cancelled", 1, COURIER_ROWS.length).total;

    return [
      {
        key: "total",
        label: "Total Delivery",
        value: total,
        meta: "Demo data",
        icon: Package,
        tone: "bg-sky-500",
      },
      {
        key: "today",
        label: "Today Delivery",
        value: today,
        meta: "Demo data",
        icon: Calendar,
        tone: "bg-indigo-500",
      },
      {
        key: "completed",
        label: "Completed",
        value: completed,
        meta: "Demo data",
        icon: ListChecks,
        tone: "bg-green-500",
      },
      {
        key: "cancelled",
        label: "Cancelled",
        value: cancelled,
        meta: "Demo data",
        icon: Clock,
        tone: "bg-red-500",
      },
    ];
  }

  return [
    {
      key: "total",
      label: "Total Schedule Booking",
      value: bookingStats?.scheduled.total ?? 0,
      meta: "All scheduled",
      icon: Calendar,
      tone: "bg-violet-500",
    },
    {
      key: "today",
      label: "Today Schedule",
      value: bookingStats?.scheduled.today ?? 0,
      meta: "Due today",
      icon: Clock,
      tone: "bg-amber-500",
    },
    {
      key: "completed",
      label: "Completed",
      value: bookingStats?.scheduled.completed ?? 0,
      meta: "Completed or converted",
      icon: ListChecks,
      tone: "bg-green-500",
    },
    {
      key: "pending",
      label: "Pending",
      value: bookingStats?.scheduled.pending ?? 0,
      meta: "Outstanding",
      icon: Banknote,
      tone: "bg-purple-500",
    },
  ];
}

export default function BookingPage() {
  const api = useAdminApi();
  const [activeTab, setActiveTab] = useState<BookingTab>("scheduled");
  const [activeCard, setActiveCard] = useState<BookingTableCard>("total");
  const [bookingStats, setBookingStats] = useState<BookingStatsResponse | null>(
    null,
  );
  const [detailRows, setDetailRows] = useState<BookingTableRow[]>([]);
  const [detailTotal, setDetailTotal] = useState(0);
  const [detailPage, setDetailPage] = useState(1);
  const [statsLoading, setStatsLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(true);
  const [rideStatusFilter, setRideStatusFilter] = useState<RideStatusFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const activeTabMeta = useMemo(
    () => TAB_CONFIG.find((tab) => tab.key === activeTab) ?? TAB_CONFIG[1],
    [activeTab],
  );

  const activeSummaryCards = useMemo(
    () => buildSummaryCards(activeTab, bookingStats),
    [activeTab, bookingStats],
  );

  const activeCardMeta = useMemo(
    () =>
      activeSummaryCards.find((card) => card.key === activeCard) ??
      activeSummaryCards[0],
    [activeCard, activeSummaryCards],
  );

  const loadBookingStats = useCallback(
    async ({ force }: { force?: boolean } = {}) => {
      setStatsLoading(true);

      try {
        const result = await api.getJsonCached<BookingStatsResponse>(
          "booking-stats:v1",
          "/api/admin/booking-stats",
          { ttlMs: CACHE_TTL_MS, force },
        );

        setBookingStats(result);
      } catch (error) {
        notify.error(
          error instanceof Error
            ? error.message
            : "Could not load booking summary.",
        );
      } finally {
        setStatsLoading(false);
      }
    },
    [api],
  );

  const loadTableRows = useCallback(
    async ({ force }: { force?: boolean } = {}) => {
      if (activeTab === "courier") {
        setDetailLoading(true);
        const result = getCourierRows(activeCard, 1, COURIER_ROWS.length);
        const filtered = applyCourierSearch(
          applyCourierStatusFilter(result.rows, rideStatusFilter),
          searchQuery,
        );
        const from = (detailPage - 1) * PAGE_SIZE;

        setDetailRows(filtered.slice(from, from + PAGE_SIZE));
        setDetailTotal(filtered.length);
        setDetailLoading(false);
        return;
      }

      setDetailLoading(true);

      try {
        const params = new URLSearchParams({
          tab: activeTab,
          card: activeCard,
          status: rideStatusFilter,
          page: String(detailPage),
          pageSize: String(PAGE_SIZE),
        });

        if (searchQuery.trim()) {
          params.set("search", searchQuery.trim());
        }

        const cacheKey = `booking-table:${params.toString()}`;
        const result = await api.getJsonCached<BookingTableResponse>(
          cacheKey,
          `/api/admin/booking-table?${params.toString()}`,
          { ttlMs: CACHE_TTL_MS, force },
        );

        setDetailRows(result.rows ?? []);
        setDetailTotal(result.total ?? 0);
      } catch (error) {
        notify.error(
          error instanceof Error
            ? error.message
            : "Could not load booking details.",
        );
        setDetailRows([]);
        setDetailTotal(0);
      } finally {
        setDetailLoading(false);
      }
    },
    [activeCard, activeTab, api, detailPage, rideStatusFilter, searchQuery],
  );

  useEffect(() => {
    setActiveCard(getDefaultCard(activeTab));
    setDetailPage(1);
    setRideStatusFilter("all");
    setSearchQuery("");
  }, [activeTab]);

  useEffect(() => {
    setDetailPage(1);
  }, [activeCard, rideStatusFilter, searchQuery]);

  useEffect(() => {
    if (!api.ready) {
      return;
    }

    void loadBookingStats();
  }, [api.ready, loadBookingStats]);

  useEffect(() => {
    if (!api.ready) {
      return;
    }

    void loadTableRows();
  }, [activeCard, activeTab, api.ready, detailPage, loadTableRows]);

  const handleRefresh = useCallback(async () => {
    await loadBookingStats({ force: true });
    await loadTableRows({ force: true });
  }, [loadBookingStats, loadTableRows]);

  const rideStatusOptions = useMemo(
    () => getRideStatusOptions(activeTab),
    [activeTab],
  );

  return (
    <div className="p-4 md:p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-200">
              <activeTabMeta.icon size={20} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Booking Overview
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {activeTabMeta.description}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => void handleRefresh()}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
            disabled={statsLoading || detailLoading}
          >
            <RefreshCw
              size={16}
              className={statsLoading || detailLoading ? "animate-spin" : ""}
            />
            Refresh
          </button>
        </div>

        <div className="mb-6 rounded-xl border border-gray-200 bg-white p-2 dark:border-gray-700 dark:bg-gray-800">
          <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
            {TAB_CONFIG.map((tab) => {
              const Icon = tab.icon;
              const isActive = tab.key === activeTab;

              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center gap-3 rounded-lg px-4 py-3 text-left transition ${
                    isActive
                      ? "bg-blue-600 text-white shadow-sm"
                      : "bg-transparent text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-700"
                  }`}
                >
                  <span
                    className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                      isActive
                        ? "bg-white/15 text-white"
                        : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                    }`}
                  >
                    <Icon size={18} />
                  </span>
                  <span>
                    <span className="block text-sm font-semibold">{tab.label}</span>
                    <span
                      className={`block text-xs ${
                        isActive
                          ? "text-blue-100"
                          : "text-gray-500 dark:text-gray-400"
                      }`}
                    >
                      {tab.description}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {statsLoading && !bookingStats && activeTab !== "courier" ? (
            Array.from({ length: 4 }).map((_, index) => (
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
            ))
          ) : (
            activeSummaryCards.map((card) => {
              const Icon = card.icon;
              const isSelected = card.key === activeCard;

              return (
                <button
                  key={card.label}
                  type="button"
                  onClick={() => setActiveCard(card.key)}
                  className={`rounded-lg border bg-white p-4 text-left transition hover:shadow-lg dark:bg-gray-800 md:p-6 ${
                    isSelected
                      ? "border-blue-500 ring-2 ring-blue-200 dark:border-blue-400 dark:ring-blue-900/40"
                      : "border-gray-200 dark:border-gray-700"
                  }`}
                >
                  <div className="mb-4 flex items-center justify-between">
                    <div className={statIconWrapper(card.tone)}>
                      <Icon size={22} className="text-white" />
                    </div>
                    <span
                      className={`text-sm font-semibold ${
                        isSelected
                          ? "text-blue-600 dark:text-blue-300"
                          : "text-gray-500 dark:text-gray-300"
                      }`}
                    >
                      {card.meta}
                    </span>
                  </div>
                  <h3 className="mb-1 text-sm text-gray-600 dark:text-gray-400">
                    {card.label}
                  </h3>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {card.value.toLocaleString()}
                  </p>
                </button>
              );
            })
          )}
        </div>

        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
          <div className="flex flex-col gap-2 border-b border-gray-200 px-4 py-4 dark:border-gray-700 md:flex-row md:items-center md:justify-between md:px-6">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {activeCardMeta?.label ?? "Booking Details"}
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                 Showing {PAGE_SIZE} rows per page.
              </p>
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-300">
              {detailLoading ? "Loading..." : `${detailTotal.toLocaleString()} records`}
            </div>
          </div>

          <div className="border-b border-gray-200 px-4 py-4 dark:border-gray-700 md:px-6">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  Filter by ride status
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Narrow down the highlighted booking card and search by name, date, phone number, or time.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-[220px_minmax(0,320px)]">
                <select
                  value={rideStatusFilter}
                  onChange={(event) =>
                    setRideStatusFilter(event.target.value as RideStatusFilter)
                  }
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-transparent focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                >
                  {rideStatusOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>

                <div className="relative">
                  <Search
                    size={16}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                  />
                  <input
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder="Search name, date, phone, time..."
                    className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-9 pr-3 text-sm text-gray-900 outline-none transition focus:border-transparent focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                  />
                </div>
              </div>
            </div>
          </div>

          {detailLoading ? (
            <div className="space-y-3 p-4 md:p-6">
              {Array.from({ length: 8 }).map((_, index) => (
                <SkeletonBlock key={index} className="h-12 w-full" />
              ))}
            </div>
          ) : detailRows.length === 0 ? (
            <div className="p-6 text-center text-sm text-gray-600 dark:text-gray-300">
              No booking records found for this selection.
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-900/40">
                    <tr>
                      {[
                        "SN",
                        "Date",
                        "Time",
                        "Rider Name",
                        "Rider Number",
                        "Driver Name",
                        "Driver Number",
                        "Pickup",
                        "Drop Off",
                        "Amount",
                        "Payment Status",
                        "Ride Status",
                      ].map((heading) => (
                        <th
                          key={heading}
                          className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400"
                        >
                          {heading}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-800">
                    {detailRows.map((row, index) => (
                      <tr key={row.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                        <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                          {(detailPage - 1) * PAGE_SIZE + index + 1}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                          {formatDateOnly(row.date)}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                          {formatTimeOnly(row.date)}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">
                          {row.riderName}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                          {row.riderPhone}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                          {row.driverName}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                          {row.driverPhone}
                        </td>
                        <td className="max-w-xs truncate px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                          {row.pickup}
                        </td>
                        <td className="max-w-xs truncate px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                          {row.dropOff}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">
                          {formatNaira(row.amount)}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-sm">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${statusClasses(
                              row.paymentStatus,
                            )}`}
                          >
                            {row.paymentStatus}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-sm">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${statusClasses(
                              row.rideStatus,
                            )}`}
                          >
                            {row.rideStatus}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <TablePagination
                currentPage={detailPage}
                pageSize={PAGE_SIZE}
                totalItems={detailTotal}
                itemLabel="bookings"
                onPageChange={setDetailPage}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
