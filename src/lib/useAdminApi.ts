"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";

type CacheEntry<T> = {
  at: number;
  ttl: number;
  data: T;
};

type CacheKey = string;

const jsonCache = new Map<CacheKey, CacheEntry<unknown>>();
const inFlight = new Map<CacheKey, Promise<unknown>>();

export type AdminApi = {
  ready: boolean;
  accessToken: string | null;
  fetchWithAdmin: (input: RequestInfo, init?: RequestInit) => Promise<Response>;
  getJson: <T>(input: RequestInfo, init?: RequestInit) => Promise<T>;
  getJsonCached: <T>(
    key: string,
    input: RequestInfo,
    options: { ttlMs: number; force?: boolean; init?: RequestInit },
  ) => Promise<T>;
  invalidate: (predicate?: (key: string) => boolean) => void;
};

function now() {
  return Date.now();
}

export function useAdminApi(): AdminApi {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;

    void supabase.auth.getSession().then(({ data }) => {
      if (!mountedRef.current) {
        return;
      }

      setAccessToken(data.session?.access_token ?? null);
    });

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setAccessToken(session?.access_token ?? null);
    });

    return () => {
      mountedRef.current = false;
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

  const getJson = useCallback(
    async <T,>(input: RequestInfo, init?: RequestInit) => {
      const response = await fetchWithAdmin(input, init);
      const payload = (await response.json().catch(() => null)) as unknown;

      if (!response.ok) {
        const message =
          payload && typeof payload === "object" && "error" in payload
            ? String((payload as { error?: unknown }).error ?? "Request failed.")
            : "Request failed.";
        throw new Error(message);
      }

      return payload as T;
    },
    [fetchWithAdmin],
  );

  const getJsonCached = useCallback(
    async <T,>(
      key: string,
      input: RequestInfo,
      options: { ttlMs: number; force?: boolean; init?: RequestInit },
    ) => {
      const ttl = Math.max(0, options.ttlMs);
      const force = Boolean(options.force);
      const cacheKey = key;

      if (!force) {
        const cached = jsonCache.get(cacheKey);

        if (cached && now() - cached.at < cached.ttl) {
          return cached.data as T;
        }

        const existing = inFlight.get(cacheKey);
        if (existing) {
          return (await existing) as T;
        }
      }

      const task = (async () => {
        try {
          const data = await getJson<T>(input, options.init);
          jsonCache.set(cacheKey, { at: now(), ttl, data });
          return data;
        } finally {
          inFlight.delete(cacheKey);
        }
      })();

      inFlight.set(cacheKey, task as Promise<unknown>);
      return task;
    },
    [getJson],
  );

  const invalidate = useCallback((predicate?: (key: string) => boolean) => {
    if (!predicate) {
      jsonCache.clear();
      return;
    }

    for (const key of Array.from(jsonCache.keys())) {
      if (predicate(key)) {
        jsonCache.delete(key);
      }
    }
  }, []);

  const ready = useMemo(() => Boolean(accessToken), [accessToken]);

  return {
    ready,
    accessToken,
    fetchWithAdmin,
    getJson,
    getJsonCached,
    invalidate,
  };
}
