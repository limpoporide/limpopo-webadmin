"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  ArrowDownLeft,
  ArrowLeftRight,
  ArrowUpRight,
  Calendar,
  Car,
  Download,
  Eye,
  Filter,
  Loader2,
  Receipt,
  Search,
  TrendingUp,
  Users,
  X,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { notify } from "@/lib/notify";
import TablePagination from "@/components/TablePagination";
import type {
  AdminTransaction,
  TransactionScope,
} from "@/app/api/admin/transactions/route";

const SUCCESS_STATUSES = new Set([
  "success",
  "successful",
  "completed",
  "paid",
]);

const FAILED_STATUSES = new Set([
  "failed",
  "failure",
  "reversed",
  "cancelled",
  "canceled",
]);

const TRANSACTIONS_PAGE_SIZE = 10;

// Payouts and ride charges move money away from the account holder;
// everything else credits it.
const DEBIT_TYPES = new Set([
  "payout",
  "withdrawal",
  "ride_payment",
  "wallet_debit",
]);

function isSuccessful(status: string) {
  return SUCCESS_STATUSES.has(status.toLowerCase());
}

function formatMoney(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: currency || "NGN",
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

function formatDateTime(value: string | null) {
  if (!value) {
    return "Not set";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-NG", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function toDateKey(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toISOString().slice(0, 10);
}

function formatLabel(value: string) {
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function statusClasses(status: string) {
  const normalized = status.toLowerCase();

  if (isSuccessful(normalized)) {
    return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
  }

  if (FAILED_STATUSES.has(normalized)) {
    return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
  }

  return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400";
}

function sumSince(transactions: AdminTransaction[], days: number) {
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;

  return transactions.reduce((total, txn) => {
    if (!isSuccessful(txn.status)) {
      return total;
    }

    const timestamp = new Date(txn.paidAt || txn.createdAt).getTime();

    if (Number.isNaN(timestamp) || timestamp < cutoff) {
      return total;
    }

    return total + txn.amount;
  }, 0);
}

function buildReceiptText(txn: AdminTransaction) {
  return [
    "LIMPOPO RIDE-HAILING SERVICE",
    "Official Transaction Receipt",
    "",
    `Reference        : ${txn.reference}`,
    `Date             : ${formatDateTime(txn.paidAt || txn.createdAt)}`,
    `Account Type     : ${txn.scope === "rider" ? "Rider" : "Driver"}`,
    `Name             : ${txn.counterpartyName}`,
    `Email            : ${txn.counterpartyEmail ?? "Not set"}`,
    `Phone            : ${txn.counterpartyPhone ?? "Not set"}`,
    `Transaction Type : ${formatLabel(txn.type)}`,
    `Status           : ${formatLabel(txn.status)}`,
    `Channel          : ${txn.channel ? formatLabel(txn.channel) : "Not set"}`,
    `Gateway          : ${txn.gateway ?? "Not set"}`,
    "",
    `Requested Amount : ${
      txn.requestedAmount === null
        ? "Not set"
        : formatMoney(txn.requestedAmount, txn.currency)
    }`,
    `Fee              : ${formatMoney(txn.fee, txn.currency)}`,
    `Amount           : ${formatMoney(txn.amount, txn.currency)}`,
    "",
    "Thank you for choosing Limpopo!",
    "For support: support@limpopo.com",
  ].join("\n");
}

// --- Shared chrome for this page's two modals -----------------------------

function ModalHeader({
  icon: Icon,
  title,
  onClose,
  actions,
}: {
  icon: LucideIcon;
  title: string;
  onClose: () => void;
  actions?: React.ReactNode;
}) {
  return (
    <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 bg-white px-5 py-4 dark:border-gray-700 dark:bg-gray-800">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-100 text-green-600 dark:bg-green-900/40 dark:text-green-300">
          <Icon size={20} />
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-green-600 dark:text-green-400">
            Transactions
          </p>

          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            {title}
          </h2>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {actions}

        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          title="Close"
          className="rounded-lg p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white"
        >
          <X size={22} />
        </button>
      </div>
    </div>
  );
}

function DetailSection({
  icon: Icon,
  label,
  children,
}: {
  icon: LucideIcon;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700">
      <div className="flex items-center gap-2 border-b border-gray-200 bg-gray-50 px-4 py-2.5 dark:border-gray-700 dark:bg-gray-700/40">
        <Icon size={15} className="text-green-600 dark:text-green-400" />

        <p className="text-sm font-semibold text-gray-900 dark:text-white">
          {label}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 bg-white p-4 sm:grid-cols-2 dark:bg-gray-800">
        {children}
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
            {label}
          </p>

          <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">
            {value}
          </p>
        </div>

        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-green-50 text-green-600 dark:bg-green-950/40 dark:text-green-400">
          <Icon size={20} />
        </div>
      </div>
    </div>
  );
}

export default function TransactionsPage() {
  const [activeTab, setActiveTab] = useState<TransactionScope>("rider");

  const [riderTransactions, setRiderTransactions] = useState<
    AdminTransaction[]
  >([]);

  const [driverTransactions, setDriverTransactions] = useState<
    AdminTransaction[]
  >([]);

  const [loading, setLoading] = useState(true);

  const [selectedTransaction, setSelectedTransaction] =
    useState<AdminTransaction | null>(null);

  const [showModal, setShowModal] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);

  const [dateFilter, setDateFilter] = useState("");
  const [nameFilter, setNameFilter] = useState("");
  const [referenceFilter, setReferenceFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const loadTransactions = useCallback(async () => {
    setLoading(true);

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.access_token) {
      notify.error("Your session expired. Please sign in again");
      setLoading(false);
      return;
    }

    const response = await fetch("/api/admin/transactions", {
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    });

    const result = (await response.json()) as {
      riderTransactions?: AdminTransaction[];
      driverTransactions?: AdminTransaction[];
      error?: string;
    };

    if (!response.ok) {
      notify.error(result.error || "Could not load transactions.");
      setLoading(false);
      return;
    }

    setRiderTransactions(result.riderTransactions ?? []);
    setDriverTransactions(result.driverTransactions ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  const activeTransactions =
    activeTab === "rider" ? riderTransactions : driverTransactions;

  const typeOptions = useMemo(
    () => Array.from(new Set(activeTransactions.map((txn) => txn.type))).sort(),
    [activeTransactions],
  );

  const statusOptions = useMemo(
    () =>
      Array.from(new Set(activeTransactions.map((txn) => txn.status))).sort(),
    [activeTransactions],
  );

  const filteredTransactions = useMemo(() => {
    const name = nameFilter.trim().toLowerCase();
    const reference = referenceFilter.trim().toLowerCase();

    return activeTransactions.filter((txn) => {
      const matchesDate =
        dateFilter === "" || toDateKey(txn.createdAt) === dateFilter;

      const matchesName =
        name === "" ||
        `${txn.counterpartyName} ${txn.counterpartyEmail ?? ""} ${
          txn.counterpartyPhone ?? ""
        }`
          .toLowerCase()
          .includes(name);

      const matchesReference =
        reference === "" || txn.reference.toLowerCase().includes(reference);

      const matchesType = typeFilter === "" || txn.type === typeFilter;

      const matchesStatus = statusFilter === "" || txn.status === statusFilter;

      return (
        matchesDate &&
        matchesName &&
        matchesReference &&
        matchesType &&
        matchesStatus
      );
    });
  }, [
    activeTransactions,
    dateFilter,
    nameFilter,
    referenceFilter,
    statusFilter,
    typeFilter,
  ]);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, dateFilter, nameFilter, referenceFilter, typeFilter, statusFilter]);

  useEffect(() => {
    const totalPages = Math.max(
      1,
      Math.ceil(filteredTransactions.length / TRANSACTIONS_PAGE_SIZE),
    );

    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, filteredTransactions.length]);

  const pageStartIndex = (currentPage - 1) * TRANSACTIONS_PAGE_SIZE;
  const paginatedTransactions = filteredTransactions.slice(
    pageStartIndex,
    pageStartIndex + TRANSACTIONS_PAGE_SIZE,
  );

  const currency = activeTransactions[0]?.currency ?? "NGN";

  const totalDaily = formatMoney(sumSince(activeTransactions, 1), currency);

  const totalWeekly = formatMoney(sumSince(activeTransactions, 7), currency);

  const totalMonthly = formatMoney(sumSince(activeTransactions, 30), currency);

  const handleTabChange = (tab: TransactionScope) => {
    setActiveTab(tab);
    setTypeFilter("");
    setStatusFilter("");
  };

  const handleViewDetails = (txn: AdminTransaction) => {
    setSelectedTransaction(txn);
    setShowModal(true);
    setShowReceipt(false);
  };

  const handleViewReceipt = (txn: AdminTransaction) => {
    setSelectedTransaction(txn);
    setShowReceipt(true);
    setShowModal(false);
  };

  const handleDownloadReceipt = () => {
    if (!selectedTransaction) {
      return;
    }

    const blob = new Blob([buildReceiptText(selectedTransaction)], {
      type: "text/plain;charset=utf-8",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `limpopo-receipt-${selectedTransaction.reference}.txt`;
    link.click();

    URL.revokeObjectURL(url);

    notify.success("Receipt downloaded successfully");
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setShowReceipt(false);
    setSelectedTransaction(null);
  };

  return (
    <div className="p-4 md:p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            {/* Transactions page icon */}
            <ArrowLeftRight
              size={28}
              className="text-green-600 dark:text-green-400"
            />

            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Transactions
              </h1>

              <p className="text-sm text-gray-500 dark:text-gray-400">
                {filteredTransactions.length}{" "}
                {activeTab === "rider" ? "rider" : "driver"} records in current
                view
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={loadTransactions}
            disabled={loading}
            className="self-start rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-60 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
          >
            Refresh
          </button>
        </div>

        <div className="mb-6 inline-flex rounded-lg border border-gray-200 bg-white p-1 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <button
            type="button"
            onClick={() => handleTabChange("rider")}
            className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-semibold transition ${
              activeTab === "rider"
                ? "bg-green-600 text-white shadow-sm"
                : "text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
            }`}
          >
            <Users size={16} />
            Rider Transactions
            <span className="rounded-full bg-black/10 px-2 py-0.5 text-xs dark:bg-white/10">
              {riderTransactions.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => handleTabChange("driver")}
            className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-semibold transition ${
              activeTab === "driver"
                ? "bg-green-600 text-white shadow-sm"
                : "text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
            }`}
          >
            <Car size={16} />
            Driver Transactions
            <span className="rounded-full bg-black/10 px-2 py-0.5 text-xs dark:bg-white/10">
              {driverTransactions.length}
            </span>
          </button>
        </div>

        {/* Stats Cards */}
        <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
          <StatCard icon={Calendar} label="Last 24 Hours" value={totalDaily} />

          <StatCard icon={TrendingUp} label="Last 7 Days" value={totalWeekly} />

          <StatCard icon={Receipt} label="Last 30 Days" value={totalMonthly} />
        </div>

        {/* Filters */}
        <div className="mb-6 rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
          <div className="mb-4 flex items-center gap-2">
            <Filter size={18} className="text-gray-600 dark:text-gray-400" />

            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
              Filters
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-5">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">
                Date
              </label>

              <input
                type="date"
                value={dateFilter}
                onChange={(event) => setDateFilter(event.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-transparent focus:ring-2 focus:ring-green-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">
                {activeTab === "rider" ? "Rider" : "Driver"}
              </label>

              <div className="relative">
                <Search
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                />

                <input
                  type="text"
                  value={nameFilter}
                  onChange={(event) => setNameFilter(event.target.value)}
                  placeholder="Name, email, or phone"
                  className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-9 pr-3 text-sm text-gray-900 outline-none transition placeholder:text-gray-500 focus:border-transparent focus:ring-2 focus:ring-green-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder:text-gray-400"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">
                Reference
              </label>

              <div className="relative">
                <Search
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                />

                <input
                  type="text"
                  value={referenceFilter}
                  onChange={(event) => setReferenceFilter(event.target.value)}
                  placeholder="Search reference"
                  className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-9 pr-3 text-sm text-gray-900 outline-none transition placeholder:text-gray-500 focus:border-transparent focus:ring-2 focus:ring-green-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder:text-gray-400"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">
                Type
              </label>

              <select
                value={typeFilter}
                onChange={(event) => setTypeFilter(event.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-transparent focus:ring-2 focus:ring-green-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              >
                <option value="">All Types</option>

                {typeOptions.map((option) => (
                  <option key={option} value={option}>
                    {formatLabel(option)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">
                Status
              </label>

              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-transparent focus:ring-2 focus:ring-green-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              >
                <option value="">All Statuses</option>

                {statusOptions.map((option) => (
                  <option key={option} value={option}>
                    {formatLabel(option)}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
          {loading ? (
            <div className="flex items-center justify-center gap-2 p-10 text-sm text-gray-500 dark:text-gray-400">
              <Loader2 className="h-5 w-5 animate-spin" />
              Loading transactions...
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[820px]">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      {[
                        "SN",
                        activeTab === "rider" ? "Rider" : "Driver",
                        "Type",
                        "Channel",
                        "Amount",
                        "Fee",
                        "Status",
                        "Actions",
                      ].map((header) => (
                        <th
                          key={header}
                          className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400"
                        >
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {paginatedTransactions.map((txn, index) => {
                      const isDebit = DEBIT_TYPES.has(txn.type.toLowerCase());

                      return (
                        <tr
                          key={txn.id}
                          className="transition hover:bg-gray-50 dark:hover:bg-gray-700/50"
                        >
                          <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                            {pageStartIndex + index + 1}
                          </td>

                          <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                            <p className="font-medium">{txn.counterpartyName}</p>

                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {txn.counterpartyEmail ??
                                txn.counterpartyPhone ??
                                "—"}
                            </p>
                          </td>

                          <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-900 dark:text-white">
                            <span className="inline-flex items-center gap-1">
                              {isDebit ? (
                                <ArrowUpRight
                                  size={14}
                                  className="text-red-500"
                                />
                              ) : (
                                <ArrowDownLeft
                                  size={14}
                                  className="text-green-500"
                                />
                              )}

                              {formatLabel(txn.type)}
                            </span>
                          </td>

                          <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                            {txn.channel ? formatLabel(txn.channel) : "—"}
                          </td>

                          <td
                            className={`whitespace-nowrap px-4 py-3 text-sm font-semibold ${
                              isDebit
                                ? "text-red-600 dark:text-red-400"
                                : "text-green-600 dark:text-green-400"
                            }`}
                          >
                            {formatMoney(txn.amount, txn.currency)}
                          </td>

                          <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                            {formatMoney(txn.fee, txn.currency)}
                          </td>

                          <td className="px-4 py-3 text-sm">
                            <span
                              className={`rounded-full px-2 py-1 text-xs font-medium ${statusClasses(
                                txn.status,
                              )}`}
                            >
                              {formatLabel(txn.status)}
                            </span>
                          </td>

                          <td className="whitespace-nowrap px-4 py-3 text-sm">
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => handleViewDetails(txn)}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700 transition hover:border-green-600 hover:text-green-600 dark:border-gray-600 dark:text-gray-300 dark:hover:border-green-400 dark:hover:text-green-400"
                              >
                                <Eye size={14} />
                                View
                              </button>

                              <button
                                type="button"
                                onClick={() => handleViewReceipt(txn)}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700 transition hover:border-green-600 hover:text-green-600 dark:border-gray-600 dark:text-gray-300 dark:hover:border-green-400 dark:hover:text-green-400"
                              >
                                <Receipt size={14} />
                                Receipt
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <TablePagination
                currentPage={currentPage}
                pageSize={TRANSACTIONS_PAGE_SIZE}
                totalItems={filteredTransactions.length}
                itemLabel="transactions"
                onPageChange={setCurrentPage}
              />
            </>
          )}

          {!loading && filteredTransactions.length === 0 && (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">
              No transactions found matching your filters.
            </div>
          )}
        </div>
      </div>

      {/* Details Modal */}
      {showModal && selectedTransaction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-0 sm:p-6">
          <div className="flex h-full w-full max-w-3xl flex-col overflow-hidden bg-white shadow-2xl dark:bg-gray-800 sm:h-auto sm:max-h-[92vh] sm:rounded-xl">
            <ModalHeader
              icon={ArrowLeftRight}
              title="Transaction Details"
              onClose={handleCloseModal}
            />

            <div className="flex-1 space-y-4 overflow-y-auto p-5">
              <DetailSection
                icon={ArrowLeftRight}
                label="Transaction Information"
              >
                <DetailCard
                  label="Reference"
                  value={selectedTransaction.reference}
                />

                <DetailCard
                  label="Type"
                  value={formatLabel(selectedTransaction.type)}
                />

                <DetailCard
                  label="Status"
                  value={formatLabel(selectedTransaction.status)}
                />

                <DetailCard
                  label="Created"
                  value={formatDateTime(selectedTransaction.createdAt)}
                />

                <DetailCard
                  label="Paid At"
                  value={formatDateTime(selectedTransaction.paidAt)}
                />

                <DetailCard
                  label="Narration"
                  value={selectedTransaction.narration ?? "Not set"}
                />
              </DetailSection>

              <DetailSection
                icon={selectedTransaction.scope === "rider" ? Users : Car}
                label={
                  selectedTransaction.scope === "rider"
                    ? "Rider Account"
                    : "Driver Account"
                }
              >
                <DetailCard
                  label="Name"
                  value={selectedTransaction.counterpartyName}
                />

                <DetailCard
                  label="Email"
                  value={selectedTransaction.counterpartyEmail ?? "Not set"}
                />

                <DetailCard
                  label="Phone"
                  value={selectedTransaction.counterpartyPhone ?? "Not set"}
                />

                <DetailCard
                  label="Profile UUID"
                  value={selectedTransaction.counterpartyUuid}
                />
              </DetailSection>

              <DetailSection icon={ArrowLeftRight} label="Payment Information">
                <DetailCard
                  label="Channel"
                  value={
                    selectedTransaction.channel
                      ? formatLabel(selectedTransaction.channel)
                      : "Not set"
                  }
                />

                <DetailCard
                  label="Gateway"
                  value={selectedTransaction.gateway ?? "Not set"}
                />

                <DetailCard
                  label="Requested Amount"
                  value={
                    selectedTransaction.requestedAmount === null
                      ? "Not set"
                      : formatMoney(
                          selectedTransaction.requestedAmount,
                          selectedTransaction.currency,
                        )
                  }
                />

                <DetailCard
                  label="Fee"
                  value={formatMoney(
                    selectedTransaction.fee,
                    selectedTransaction.currency,
                  )}
                />

                {selectedTransaction.scope === "rider" ? (
                  <>
                    <DetailCard
                      label="Sender Name"
                      value={selectedTransaction.senderName ?? "Not set"}
                    />

                    <DetailCard
                      label="Sender Account"
                      value={selectedTransaction.senderAccount ?? "Not set"}
                    />
                  </>
                ) : (
                  <>
                    <DetailCard
                      label="Payout Bank"
                      value={selectedTransaction.bankName ?? "Not set"}
                    />

                    <DetailCard
                      label="Payout Account"
                      value={
                        selectedTransaction.accountNumber
                          ? `${selectedTransaction.accountNumber} — ${
                              selectedTransaction.accountName ?? "Unnamed"
                            }`
                          : "Not set"
                      }
                    />
                  </>
                )}

                <div className="rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-900/40 dark:bg-green-950/20 sm:col-span-2">
                  <p className="text-xs font-medium text-green-700 dark:text-green-400">
                    Amount
                  </p>

                  <p className="mt-1 text-2xl font-bold text-green-700 dark:text-green-400">
                    {formatMoney(
                      selectedTransaction.amount,
                      selectedTransaction.currency,
                    )}
                  </p>
                </div>
              </DetailSection>
            </div>
          </div>
        </div>
      )}

      {/* Receipt Modal */}
      {showReceipt && selectedTransaction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-0 sm:p-6">
          <div className="flex h-full w-full max-w-2xl flex-col overflow-hidden bg-white shadow-2xl dark:bg-gray-800 sm:h-auto sm:max-h-[92vh] sm:rounded-xl">
            <ModalHeader
              icon={ArrowLeftRight}
              title="Receipt"
              onClose={handleCloseModal}
              actions={
                <button
                  type="button"
                  onClick={handleDownloadReceipt}
                  className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-green-700"
                >
                  <Download size={16} />
                  Download
                </button>
              }
            />

            <div className="flex-1 overflow-y-auto p-6">
              <div className="rounded-lg border-2 border-gray-300 p-8 dark:border-gray-600">
                <div className="mb-8 text-center">
                  <h1 className="mb-2 text-3xl font-bold text-green-600 dark:text-green-400">
                    LIMPOPO
                  </h1>

                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Ride-Hailing Service
                  </p>

                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-500">
                    Official Receipt
                  </p>
                </div>

                <div className="mb-6 border-b-2 border-t-2 border-gray-300 py-4 dark:border-gray-600">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-600 dark:text-gray-400">
                        Reference:
                      </p>

                      <p className="break-all font-semibold text-gray-900 dark:text-white">
                        {selectedTransaction.reference}
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="text-gray-600 dark:text-gray-400">Date:</p>

                      <p className="font-semibold text-gray-900 dark:text-white">
                        {formatDateTime(
                          selectedTransaction.paidAt ||
                            selectedTransaction.createdAt,
                        )}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mb-6 space-y-4">
                  <ReceiptRow
                    label={
                      selectedTransaction.scope === "rider" ? "Rider" : "Driver"
                    }
                    value={selectedTransaction.counterpartyName}
                  />

                  <ReceiptRow
                    label="Contact"
                    value={
                      selectedTransaction.counterpartyEmail ??
                      selectedTransaction.counterpartyPhone ??
                      "Not set"
                    }
                  />

                  <ReceiptRow
                    label="Type"
                    value={formatLabel(selectedTransaction.type)}
                  />

                  <ReceiptRow
                    label="Status"
                    value={formatLabel(selectedTransaction.status)}
                  />

                  <ReceiptRow
                    label="Channel"
                    value={
                      selectedTransaction.channel
                        ? formatLabel(selectedTransaction.channel)
                        : "Not set"
                    }
                  />

                  <ReceiptRow
                    label="Fee"
                    value={formatMoney(
                      selectedTransaction.fee,
                      selectedTransaction.currency,
                    )}
                  />
                </div>

                <div className="border-t-2 border-gray-300 pt-4 dark:border-gray-600">
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-bold text-gray-900 dark:text-white">
                      Total Amount:
                    </span>

                    <span className="text-2xl font-bold text-green-600 dark:text-green-400">
                      {formatMoney(
                        selectedTransaction.amount,
                        selectedTransaction.currency,
                      )}
                    </span>
                  </div>
                </div>

                <div className="mt-8 text-center">
                  <p className="text-xs text-gray-500 dark:text-gray-500">
                    Thank you for choosing Limpopo!
                  </p>

                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-500">
                    For support: support@limpopo.com
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DetailCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-700/50">
      <p className="mb-1 text-xs text-gray-600 dark:text-gray-400">{label}</p>

      <p className="break-all text-sm font-semibold text-gray-900 dark:text-white">
        {value}
      </p>
    </div>
  );
}

function ReceiptRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 text-sm">
      <span className="text-gray-600 dark:text-gray-400">{label}:</span>

      <span className="break-all text-right font-semibold text-gray-900 dark:text-white">
        {value}
      </span>
    </div>
  );
}
