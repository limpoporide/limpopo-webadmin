"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Car,
  CreditCard,
  Landmark,
  Loader2,
  Phone,
  Search,
  Users,
  Wallet,
} from "lucide-react";
import TablePagination from "@/components/TablePagination";
import { useAdminApi } from "@/lib/useAdminApi";
import type {
  WalletProfile,
  WalletUsersResponse,
} from "@/app/api/admin/wallet-users/route";

type WalletTab = "rider" | "driver";

const PAGE_SIZE_OPTIONS = [10, 25, 50];

function formatBalance(value: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 2,
  }).format(value);
}

export default function WalletPage() {
  const { getJson, ready } = useAdminApi();
  const [activeTab, setActiveTab] = useState<WalletTab>("rider");
  const [riders, setRiders] = useState<WalletProfile[]>([]);
  const [drivers, setDrivers] = useState<WalletProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [pageSize, setPageSize] = useState(PAGE_SIZE_OPTIONS[0]);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    if (!ready) {
      return;
    }

    let active = true;
    setLoading(true);
    setError(null);

    void getJson<WalletUsersResponse>("/api/admin/wallet-users")
      .then((result) => {
        if (!active) {
          return;
        }

        setRiders(result.riders);
        setDrivers(result.drivers);
      })
      .catch((loadError: unknown) => {
        if (active) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Could not load wallet profiles.",
          );
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [getJson, ready]);

  const profiles = activeTab === "rider" ? riders : drivers;
  const filteredProfiles = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();

    if (!query) {
      return profiles;
    }

    return profiles.filter((profile) =>
      [profile.name, profile.phone, profile.walletAccount, profile.bank]
        .filter(Boolean)
        .some((value) => value!.toLocaleLowerCase().includes(query)),
    );
  }, [profiles, search]);
  const pageProfiles = filteredProfiles.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );

  const selectTab = (tab: WalletTab) => {
    setActiveTab(tab);
    setCurrentPage(1);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl 2xl:max-w-screen-2xl">
        <div className="mb-6 flex items-center gap-3">
          <Wallet size={27} className="text-green-600 dark:text-green-400" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Wallet Management
            </h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Rider and driver wallet accounts
            </p>
          </div>
        </div>

        <div className="border-b border-gray-200 dark:border-gray-700">
          <div className="flex gap-6" role="tablist" aria-label="Wallet user type">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "rider"}
              onClick={() => selectTab("rider")}
              className={`inline-flex items-center gap-2 border-b-2 px-1 pb-3 text-sm font-semibold transition ${
                activeTab === "rider"
                  ? "border-green-600 text-green-700 dark:border-green-400 dark:text-green-400"
                  : "border-transparent text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
              }`}
            >
              <Users size={17} />
              Rider
              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                {riders.length}
              </span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "driver"}
              onClick={() => selectTab("driver")}
              className={`inline-flex items-center gap-2 border-b-2 px-1 pb-3 text-sm font-semibold transition ${
                activeTab === "driver"
                  ? "border-green-600 text-green-700 dark:border-green-400 dark:text-green-400"
                  : "border-transparent text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
              }`}
            >
              <Car size={17} />
              Driver
              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                {drivers.length}
              </span>
            </button>
          </div>
        </div>

        <section
          role="tabpanel"
          aria-label={`${activeTab === "rider" ? "Rider" : "Driver"} wallets`}
          className="mt-5 overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800"
        >
          <div className="flex flex-col gap-3 border-b border-gray-200 p-4 dark:border-gray-700 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-semibold text-gray-900 dark:text-white">
                {activeTab === "rider" ? "Rider wallets" : "Driver wallets"}
              </h2>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {filteredProfiles.length} {activeTab === "rider" ? "riders" : "drivers"}
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <label className="relative block sm:w-72">
                <Search
                  size={17}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <input
                  type="search"
                  value={search}
                  onChange={(event) => {
                    setSearch(event.target.value);
                    setCurrentPage(1);
                  }}
                  placeholder="Search name, number, account or bank"
                  className="w-full rounded-md border border-gray-300 bg-white py-2 pl-9 pr-3 text-sm text-gray-900 outline-none focus:border-green-600 focus:ring-2 focus:ring-green-600/20 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                />
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                Rows
                <select
                  value={pageSize}
                  onChange={(event) => {
                    setPageSize(Number(event.target.value));
                    setCurrentPage(1);
                  }}
                  className="rounded-md border border-gray-300 bg-white px-2 py-2 text-sm text-gray-900 outline-none focus:border-green-600 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                >
                  {PAGE_SIZE_OPTIONS.map((size) => (
                    <option key={size} value={size}>
                      {size}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          {error ? (
            <div className="flex items-center gap-3 p-6 text-sm text-red-700 dark:text-red-300">
              <AlertCircle size={18} />
              {error}
            </div>
          ) : loading ? (
            <div className="flex min-h-48 items-center justify-center gap-2 text-sm text-gray-500 dark:text-gray-400">
              <Loader2 size={18} className="animate-spin" />
              Loading wallet accounts...
            </div>
          ) : filteredProfiles.length === 0 ? (
            <div className="flex min-h-48 flex-col items-center justify-center gap-2 px-4 text-center text-sm text-gray-500 dark:text-gray-400">
              <Wallet size={22} />
              {search ? "No wallet accounts match your search." : "No wallet accounts found."}
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[850px] text-left text-sm">
                  <thead className="bg-gray-50 text-xs uppercase text-gray-500 dark:bg-gray-700/50 dark:text-gray-400">
                    <tr>
                      <th scope="col" className="px-5 py-3 font-semibold">Name</th>
                      <th scope="col" className="px-5 py-3 font-semibold">Number</th>
                      <th scope="col" className="px-5 py-3 font-semibold">Wallet account</th>
                      <th scope="col" className="px-5 py-3 font-semibold">Bank</th>
                      <th scope="col" className="px-5 py-3 text-right font-semibold">Wallet balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {pageProfiles.map((profile) => (
                      <tr key={profile.id} className="text-gray-700 hover:bg-gray-50/70 dark:text-gray-200 dark:hover:bg-gray-700/30">
                        <td className="whitespace-nowrap px-5 py-4 font-medium text-gray-900 dark:text-white">
                          {profile.name || "Not set"}
                        </td>
                        <td className="whitespace-nowrap px-5 py-4">
                          <span className="inline-flex items-center gap-2">
                            <Phone size={15} className="text-gray-400" />
                            {profile.phone || "Not set"}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-5 py-4">
                          <span className="inline-flex items-center gap-2">
                            <CreditCard size={15} className="text-gray-400" />
                            {profile.walletAccount || "Not set"}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-5 py-4">
                          <span className="inline-flex items-center gap-2">
                            <Landmark size={15} className="text-gray-400" />
                            {profile.bank || "Not set"}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-5 py-4 text-right font-semibold text-gray-900 dark:text-white">
                          {formatBalance(profile.walletBalance)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <TablePagination
                currentPage={currentPage}
                pageSize={pageSize}
                totalItems={filteredProfiles.length}
                itemLabel={activeTab === "rider" ? "riders" : "drivers"}
                onPageChange={setCurrentPage}
              />
            </>
          )}
        </section>
      </div>
    </div>
  );
}
