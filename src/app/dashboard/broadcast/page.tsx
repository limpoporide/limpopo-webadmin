"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Loader2,
  Radio,
  Send,
  Users,
  User,
  UserCog,
  RefreshCw,
  Clock,
  MessageSquare,
} from "lucide-react";
import { notify } from "@/lib/notify";
import { supabase } from "@/lib/supabase";

type Audience = "drivers" | "riders" | "all";

type RecipientCounts = {
  total: number;
  drivers: number;
  riders: number;
};

type BroadcastSummary = {
  broadcastId: string;
  title: string;
  body: string;
  audience: Audience;
  createdAt: string;
  recipients: RecipientCounts;
};

const audienceMeta: Record<
  Audience,
  {
    label: string;
    icon: typeof Users;
    helper: string;
    pill: string;
    active: string;
  }
> = {
  all: {
    label: "All Users",
    icon: Users,
    helper: "Drivers + Riders",
    pill: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
    active:
      "border-purple-500 bg-purple-50 dark:border-purple-400 dark:bg-purple-900/20",
  },
  drivers: {
    label: "Drivers",
    icon: UserCog,
    helper: "Send to drivers only",
    pill: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
    active:
      "border-emerald-500 bg-emerald-50 dark:border-emerald-400 dark:bg-emerald-900/20",
  },
  riders: {
    label: "Riders",
    icon: User,
    helper: "Send to riders only",
    pill: "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300",
    active: "border-sky-500 bg-sky-50 dark:border-sky-400 dark:bg-sky-900/20",
  },
};

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

function truncate(value: string, limit: number) {
  if (value.length <= limit) {
    return value;
  }

  return `${value.slice(0, limit - 1).trimEnd()}…`;
}

const RECIPIENTS_CACHE_MS = 60_000;
const BROADCASTS_CACHE_MS = 20_000;

export default function BroadcastPage() {
  const [audience, setAudience] = useState<Audience>("all");
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [recipientCounts, setRecipientCounts] = useState<RecipientCounts>({
    total: 0,
    drivers: 0,
    riders: 0,
  });
  const [countsLoading, setCountsLoading] = useState(false);
  const [broadcasts, setBroadcasts] = useState<BroadcastSummary[]>([]);
  const [broadcastsLoading, setBroadcastsLoading] = useState(false);

  const selectedMeta = audienceMeta[audience];
  const SelectedIcon = selectedMeta.icon;

  const initRef = useRef(false);
  const recipientsCacheRef = useRef<{ at: number; data: RecipientCounts } | null>(null);
  const broadcastsCacheRef = useRef<{ at: number; data: BroadcastSummary[] } | null>(null);
  const recipientsInFlightRef = useRef<Promise<void> | null>(null);
  const broadcastsInFlightRef = useRef<Promise<void> | null>(null);

  const estimatedRecipients = useMemo(() => {
    if (audience === "drivers") {
      return recipientCounts.drivers;
    }

    if (audience === "riders") {
      return recipientCounts.riders;
    }

    return recipientCounts.total;
  }, [audience, recipientCounts]);

  useEffect(() => {
    let active = true;

    void supabase.auth.getSession().then(({ data }) => {
      if (!active) {
        return;
      }

      setAccessToken(data.session?.access_token ?? null);
    });

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setAccessToken(session?.access_token ?? null);
    });

    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, []);

  const fetchWithAdmin = useCallback(
    async (input: RequestInfo, init?: RequestInit) => {
      if (!accessToken) {
        throw new Error("Your session expired. Please sign in again.");
      }

      return fetch(input, {
        ...init,
        headers: {
          ...(init?.headers ?? {}),
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/json",
        },
      });
    },
    [accessToken],
  );

  const loadRecipientCounts = useCallback(
    async ({ force }: { force?: boolean } = {}) => {
      const shouldForce = Boolean(force);
      const cached = recipientsCacheRef.current;

      if (
        !shouldForce &&
        cached &&
        Date.now() - cached.at < RECIPIENTS_CACHE_MS
      ) {
        setRecipientCounts(cached.data);
        return;
      }

      if (recipientsInFlightRef.current && !shouldForce) {
        await recipientsInFlightRef.current;
        return;
      }

      const task = (async () => {
        setCountsLoading(true);

        try {
          const response = await fetchWithAdmin(
            `/api/admin/broadcast?action=count&audience=all`,
          );
          const result = (await response.json()) as
            | { error?: string }
            | { recipients: RecipientCounts };

          if (!response.ok) {
            const message =
              "error" in result && result.error
                ? result.error
                : "Could not load recipients.";
            throw new Error(message);
          }

          if ("recipients" in result) {
            recipientsCacheRef.current = { at: Date.now(), data: result.recipients };
            setRecipientCounts(result.recipients);
          }
        } catch (error) {
          notify.error(
            error instanceof Error ? error.message : "Could not load recipients.",
          );
        } finally {
          setCountsLoading(false);
          recipientsInFlightRef.current = null;
        }
      })();

      recipientsInFlightRef.current = task;
      await task;
    },
    [fetchWithAdmin],
  );

  const loadBroadcasts = useCallback(
    async ({ force }: { force?: boolean } = {}) => {
      const shouldForce = Boolean(force);
      const cached = broadcastsCacheRef.current;

      if (
        !shouldForce &&
        cached &&
        Date.now() - cached.at < BROADCASTS_CACHE_MS
      ) {
        setBroadcasts(cached.data);
        return;
      }

      if (broadcastsInFlightRef.current && !shouldForce) {
        await broadcastsInFlightRef.current;
        return;
      }

      const task = (async () => {
        setBroadcastsLoading(true);

        try {
          const response = await fetchWithAdmin("/api/admin/broadcast");
          const result = (await response.json()) as {
            error?: string;
            broadcasts?: BroadcastSummary[];
          };

          if (!response.ok) {
            throw new Error(result.error || "Could not load broadcasts.");
          }

          const data = result.broadcasts ?? [];
          broadcastsCacheRef.current = { at: Date.now(), data };
          setBroadcasts(data);
        } catch (error) {
          notify.error(
            error instanceof Error ? error.message : "Could not load broadcasts.",
          );
        } finally {
          setBroadcastsLoading(false);
          broadcastsInFlightRef.current = null;
        }
      })();

      broadcastsInFlightRef.current = task;
      await task;
    },
    [fetchWithAdmin],
  );

  useEffect(() => {
    if (!accessToken) {
      return;
    }

    if (initRef.current) {
      return;
    }

    initRef.current = true;
    void loadRecipientCounts();
    void loadBroadcasts();
  }, [accessToken, loadBroadcasts, loadRecipientCounts]);

  const handleSend = async () => {
    if (!title.trim() || !message.trim()) {
      notify.error("Title and message are required.");
      return;
    }

    if (estimatedRecipients === 0 && !countsLoading) {
      notify.error("No recipients available for the selected audience.");
      return;
    }

    setIsSending(true);

    try {
      const response = await fetchWithAdmin("/api/admin/broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          message: message.trim(),
          audience,
        }),
      });

      const result = (await response.json()) as { error?: string; inserted?: number };

      if (!response.ok) {
        throw new Error(result.error || "Broadcast failed.");
      }

      notify.success(`Broadcast sent (${result.inserted ?? 0} notifications created).`);
      setTitle("");
      setMessage("");
      await loadBroadcasts({ force: true });
    } catch (error) {
      notify.error(error instanceof Error ? error.message : "Broadcast failed.");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="p-4 md:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">
            <Radio size={22} />
          </div>
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-purple-700 dark:text-purple-300">
              Broadcast
            </p>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Notifications Center
            </h1>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className={`rounded-full px-3 py-1 text-xs font-semibold ${selectedMeta.pill}`}>
                    {selectedMeta.label}
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    {selectedMeta.helper}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    void loadRecipientCounts({ force: true });
                    void loadBroadcasts({ force: true });
                  }}
                  className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-700"
                  disabled={countsLoading || broadcastsLoading}
                >
                  <RefreshCw size={16} className={countsLoading || broadcastsLoading ? "animate-spin" : ""} />
                  Refresh
                </button>
              </div>

              <div className="mt-6 space-y-6">
                <div>
                  <div className="flex items-center gap-2">
                    <Users size={16} className="text-purple-600 dark:text-purple-400" />
                    <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                      Select Audience
                    </h2>
                  </div>

                  <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
                    {(Object.keys(audienceMeta) as Audience[]).map((key) => {
                      const meta = audienceMeta[key];
                      const Icon = meta.icon;
                      const isActive = key === audience;
                      const count =
                        key === "drivers"
                          ? recipientCounts.drivers
                          : key === "riders"
                            ? recipientCounts.riders
                            : recipientCounts.total;

                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => setAudience(key)}
                          className={`group flex flex-col gap-3 rounded-xl border-2 p-4 text-left transition ${
                            isActive
                              ? meta.active
                              : "border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div
                              className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                                isActive
                                  ? meta.pill
                                  : "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-200"
                              }`}
                            >
                              <Icon size={18} />
                            </div>
                            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                              {countsLoading ? "…" : count.toLocaleString()}
                            </span>
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-gray-900 dark:text-white">
                              {meta.label}
                            </p>
                            <p className="text-xs text-gray-600 dark:text-gray-400">{meta.helper}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900/30">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <SelectedIcon size={18} className="text-purple-700 dark:text-purple-300" />
                        <div>
                          <p className="text-sm font-semibold text-gray-900 dark:text-white">
                            Estimated recipients
                          </p>
                          <p className="text-xs text-gray-600 dark:text-gray-400">
                            Based on current profiles in the database.
                          </p>
                        </div>
                      </div>
                      <div className="text-lg font-bold text-gray-900 dark:text-white">
                        {countsLoading ? "…" : estimatedRecipients.toLocaleString()}
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <MessageSquare
                      size={16}
                      className="text-purple-600 dark:text-purple-400"
                    />
                    <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                      Compose Message
                    </h2>
                  </div>

                  <div className="mt-4 space-y-4">
                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-200">
                        Title
                      </label>
                      <input
                        value={title}
                        onChange={(event) => setTitle(event.target.value)}
                        placeholder="Enter notification title..."
                        className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 outline-none transition focus:border-transparent focus:ring-2 focus:ring-purple-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-200">
                        Message
                      </label>
                      <textarea
                        value={message}
                        onChange={(event) => setMessage(event.target.value)}
                        placeholder="Type your message here..."
                        rows={8}
                        className="w-full resize-none rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 outline-none transition focus:border-transparent focus:ring-2 focus:ring-purple-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-3 border-t border-gray-200 pt-5 dark:border-gray-700 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">
                      Ready to send?
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      This creates one notification row per recipient in the notifications table.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => void handleSend()}
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-purple-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-70"
                    disabled={isSending || countsLoading}
                  >
                    {isSending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                    {isSending ? "Sending..." : "Send Broadcast"}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-1">
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">
                    Recent Broadcasts
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    Latest items from notifications table.
                  </p>
                </div>
                <Clock size={18} className="text-gray-500 dark:text-gray-300" />
              </div>

              <div className="mt-5 space-y-3">
                {broadcastsLoading ? (
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                    <Loader2 size={16} className="animate-spin" />
                    Loading broadcasts...
                  </div>
                ) : broadcasts.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-gray-300 p-4 text-sm text-gray-600 dark:border-gray-700 dark:text-gray-300">
                    No broadcasts yet.
                  </div>
                ) : (
                  broadcasts.slice(0, 8).map((item) => {
                    const meta = audienceMeta[item.audience] ?? audienceMeta.all;
                    const Icon = meta.icon;
                    const preview = truncate(item.body, 110);
                    return (
                      <div
                        key={item.broadcastId}
                        className="rounded-xl border border-gray-200 p-4 transition hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-700/40"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3">
                            <div className={`mt-0.5 flex h-9 w-9 items-center justify-center rounded-xl ${meta.pill}`}>
                              <Icon size={16} />
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-gray-900 dark:text-white">
                                {truncate(item.title, 44)}
                              </p>
                              <p className="mt-1 text-xs text-gray-600 dark:text-gray-300">
                                {preview}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-xs font-semibold text-gray-700 dark:text-gray-200">
                              {(item.recipients?.total ?? 0).toLocaleString()}
                            </p>
                            <p className="text-[11px] text-gray-500 dark:text-gray-400">
                              recipients
                            </p>
                          </div>
                        </div>

                        <p className="mt-3 text-[11px] text-gray-500 dark:text-gray-400">
                          {formatDateTime(item.createdAt)}
                        </p>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
