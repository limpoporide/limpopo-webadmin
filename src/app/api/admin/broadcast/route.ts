import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import type { Json } from "@/types/database.types";
import {
  createServiceClient,
  createUserClient,
  getBearerToken,
  getSupabaseConfig,
  requireActiveAdmin,
} from "@/lib/supabaseAdmin";

type Audience = "drivers" | "riders" | "all";

type BroadcastInsertResult = {
  broadcastId: string;
  inserted: number;
  recipients: {
    total: number;
    drivers: number;
    riders: number;
  };
};

type BroadcastUpdateResult = {
  broadcastId: string;
  updated: number;
};

type BroadcastDeleteResult = {
  broadcastId: string;
  deleted: number;
};

type BroadcastSummary = {
  broadcastId: string;
  title: string;
  body: string;
  audience: Audience;
  createdAt: string;
  recipients: {
    total: number;
    drivers: number;
    riders: number;
  };
};

const LIST_CACHE_HEADERS = {
  "Cache-Control": "private, max-age=10, stale-while-revalidate=30",
  Vary: "Authorization",
};

const COUNT_CACHE_HEADERS = {
  "Cache-Control": "private, max-age=30, stale-while-revalidate=60",
  Vary: "Authorization",
};

function normalizeAudience(value: unknown): Audience | null {
  if (value === "drivers" || value === "riders" || value === "all") {
    return value;
  }

  return null;
}

function chunk<T>(items: T[], size: number) {
  const result: T[][] = [];

  for (let index = 0; index < items.length; index += size) {
    result.push(items.slice(index, index + size));
  }

  return result;
}

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
        { error: "Only active admin accounts can send broadcasts." },
        { status: 403 },
      ),
    };
  }

  return { adminUuid: user.id, serviceClient };
}

async function fetchRecipientUuids(
  serviceClient: ReturnType<typeof createServiceClient>,
  audience: Audience,
) {
  const shouldIncludeDrivers = audience === "drivers" || audience === "all";
  const shouldIncludeRiders = audience === "riders" || audience === "all";

  const [driverResult, riderResult] = await Promise.all([
    shouldIncludeDrivers
      ? serviceClient.from("driver_profile").select("uuid").limit(100000)
      : Promise.resolve({ data: [], error: null }),
    shouldIncludeRiders
      ? serviceClient.from("rider_profile").select("uuid").limit(100000)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (driverResult.error) {
    return { error: driverResult.error.message };
  }

  if (riderResult.error) {
    return { error: riderResult.error.message };
  }

  const driverUuids = (driverResult.data ?? [])
    .map((row) => row.uuid)
    .filter((uuid): uuid is string => Boolean(uuid));
  const riderUuids = (riderResult.data ?? [])
    .map((row) => row.uuid)
    .filter((uuid): uuid is string => Boolean(uuid));

  return { driverUuids, riderUuids };
}

async function fetchRecipientCount(
  serviceClient: ReturnType<typeof createServiceClient>,
  audience: Audience,
) {
  const shouldIncludeDrivers = audience === "drivers" || audience === "all";
  const shouldIncludeRiders = audience === "riders" || audience === "all";

  const [driverCountResult, riderCountResult] = await Promise.all([
    shouldIncludeDrivers
      ? serviceClient
          .from("driver_profile")
          .select("uuid", { count: "exact", head: true })
      : Promise.resolve({ count: 0, error: null }),
    shouldIncludeRiders
      ? serviceClient
          .from("rider_profile")
          .select("uuid", { count: "exact", head: true })
      : Promise.resolve({ count: 0, error: null }),
  ]);

  if (driverCountResult.error) {
    return { error: driverCountResult.error.message };
  }

  if (riderCountResult.error) {
    return { error: riderCountResult.error.message };
  }

  const drivers = driverCountResult.count ?? 0;
  const riders = riderCountResult.count ?? 0;

  return {
    recipients: {
      total: drivers + riders,
      drivers,
      riders,
    },
  };
}

export async function GET(request: NextRequest) {
  const resolved = await resolveAdmin(request);

  if (resolved.error) {
    return resolved.error;
  }

  const { serviceClient } = resolved;
  const url = new URL(request.url);
  const action = url.searchParams.get("action");
  const audience = normalizeAudience(url.searchParams.get("audience"));

  if (action === "count") {
    if (!audience) {
      return NextResponse.json(
        { error: "Audience is required." },
        { status: 400 },
      );
    }

    const countResult = await fetchRecipientCount(serviceClient, audience);

    if ("error" in countResult) {
      return NextResponse.json({ error: countResult.error }, { status: 400 });
    }

    return NextResponse.json(countResult, { headers: COUNT_CACHE_HEADERS });
  }

  const { data: rows, error } = await serviceClient
    .from("notifications")
    .select("id, title, body, created_at, data, type")
    .eq("type", "broadcast")
    .order("created_at", { ascending: false })
    .limit(250);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const summaries = new Map<string, BroadcastSummary>();

  for (const row of rows ?? []) {
    const payload = (row.data ?? {}) as Record<string, unknown>;
    const broadcastId =
      typeof payload.broadcast_id === "string" && payload.broadcast_id
        ? payload.broadcast_id
        : row.id;
    const storedAudience = normalizeAudience(payload.audience);

    if (!summaries.has(broadcastId)) {
      const recipients =
        typeof payload.recipients === "object" && payload.recipients
          ? (payload.recipients as BroadcastSummary["recipients"])
          : { total: 0, drivers: 0, riders: 0 };

      summaries.set(broadcastId, {
        broadcastId,
        title: row.title,
        body: row.body,
        audience: storedAudience ?? "all",
        createdAt: row.created_at,
        recipients,
      });
    }
  }

  return NextResponse.json(
    {
      broadcasts: Array.from(summaries.values()),
    },
    { headers: LIST_CACHE_HEADERS },
  );
}

export async function POST(request: NextRequest) {
  const resolved = await resolveAdmin(request);

  if (resolved.error) {
    return resolved.error;
  }

  const { adminUuid, serviceClient } = resolved;

  const body = (await request.json().catch(() => null)) as {
    title?: string;
    message?: string;
    audience?: Audience;
    data?: Json | null;
  } | null;

  const title = body?.title?.trim();
  const message = body?.message?.trim();
  const audience = normalizeAudience(body?.audience);
  const extraData = body?.data ?? null;

  if (!title || !message || !audience) {
    return NextResponse.json(
      { error: "Title, message, and audience are required." },
      { status: 400 },
    );
  }

  const recipientsResult = await fetchRecipientUuids(serviceClient, audience);

  if ("error" in recipientsResult) {
    return NextResponse.json(
      { error: recipientsResult.error },
      { status: 400 },
    );
  }

  const { driverUuids, riderUuids } = recipientsResult;
  const broadcastId = randomUUID();
  const now = new Date().toISOString();

  const recipientCounts = {
    drivers: driverUuids.length,
    riders: riderUuids.length,
    total: driverUuids.length + riderUuids.length,
  };

  if (recipientCounts.total === 0) {
    return NextResponse.json(
      { error: "No recipients found for the selected audience." },
      { status: 400 },
    );
  }

  const broadcastPayload = {
    broadcast_id: broadcastId,
    audience,
    sender_admin_uuid: adminUuid,
    sent_at: now,
    recipients: recipientCounts,
    ...(extraData ? { extra: extraData } : {}),
  } satisfies Record<string, unknown>;

  const rows: {
    recipient_id: string;
    recipient_role: string;
    title: string;
    body: string;
    type: string;
    created_at: string;
    is_read: boolean;
    data: Json;
  }[] = [];

  for (const uuid of driverUuids) {
    rows.push({
      recipient_id: uuid,
      recipient_role: "driver",
      title,
      body: message,
      type: "broadcast",
      created_at: now,
      is_read: false,
      data: broadcastPayload as Json,
    });
  }

  for (const uuid of riderUuids) {
    rows.push({
      recipient_id: uuid,
      recipient_role: "rider",
      title,
      body: message,
      type: "broadcast",
      created_at: now,
      is_read: false,
      data: broadcastPayload as Json,
    });
  }

  let inserted = 0;

  for (const batch of chunk(rows, 500)) {
    const { error: insertError } = await serviceClient
      .from("notifications")
      .insert(batch);

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 400 });
    }

    inserted += batch.length;
  }

  const response: BroadcastInsertResult = {
    broadcastId,
    inserted,
    recipients: recipientCounts,
  };

  return NextResponse.json(response);
}

export async function PUT(request: NextRequest) {
  const resolved = await resolveAdmin(request);

  if (resolved.error) {
    return resolved.error;
  }

  const { serviceClient } = resolved;
  const body = (await request.json().catch(() => null)) as {
    broadcastId?: string;
    title?: string;
    message?: string;
  } | null;

  const broadcastId = body?.broadcastId?.trim();
  const title = body?.title?.trim();
  const message = body?.message?.trim();

  if (!broadcastId || !title || !message) {
    return NextResponse.json(
      { error: "BroadcastId, title, and message are required." },
      { status: 400 },
    );
  }

  const { data, error } = await serviceClient
    .from("notifications")
    .update({ title, body: message })
    .eq("type", "broadcast")
    .contains("data", { broadcast_id: broadcastId })
    .select("id");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const updated = data?.length ?? 0;

  if (updated === 0) {
    return NextResponse.json({ error: "Broadcast not found." }, { status: 404 });
  }

  const response: BroadcastUpdateResult = { broadcastId, updated };
  return NextResponse.json(response);
}

export async function DELETE(request: NextRequest) {
  const resolved = await resolveAdmin(request);

  if (resolved.error) {
    return resolved.error;
  }

  const { serviceClient } = resolved;
  const url = new URL(request.url);
  const broadcastId = url.searchParams.get("broadcastId")?.trim();

  if (!broadcastId) {
    return NextResponse.json(
      { error: "BroadcastId is required." },
      { status: 400 },
    );
  }

  const { data, error } = await serviceClient
    .from("notifications")
    .delete()
    .eq("type", "broadcast")
    .contains("data", { broadcast_id: broadcastId })
    .select("id");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const deleted = data?.length ?? 0;

  if (deleted === 0) {
    return NextResponse.json({ error: "Broadcast not found." }, { status: 404 });
  }

  const response: BroadcastDeleteResult = { broadcastId, deleted };
  return NextResponse.json(response);
}
