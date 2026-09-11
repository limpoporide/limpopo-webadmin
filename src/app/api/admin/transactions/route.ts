import { NextRequest, NextResponse } from "next/server";
import {
  createServiceClient,
  createUserClient,
  getBearerToken,
  getSupabaseConfig,
  requireActiveAdmin,
} from "@/lib/supabaseAdmin";

export type TransactionScope = "rider" | "driver";

export type AdminTransaction = {
  id: string;
  scope: TransactionScope;
  reference: string;
  type: string;
  status: string;
  channel: string | null;
  gateway: string | null;
  currency: string;
  amount: number;
  fee: number;
  requestedAmount: number | null;
  narration: string | null;
  senderName: string | null;
  senderAccount: string | null;
  bankName: string | null;
  accountNumber: string | null;
  accountName: string | null;
  paidAt: string | null;
  createdAt: string;
  counterpartyUuid: string;
  counterpartyName: string;
  counterpartyEmail: string | null;
  counterpartyPhone: string | null;
};

type EmbeddedProfile = {
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone_num: string | null;
} | null;

const MAX_ROWS = 500;

function buildName(profile: EmbeddedProfile) {
  const name =
    `${profile?.first_name ?? ""} ${profile?.last_name ?? ""}`.trim();
  return name || "Unknown user";
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
        { error: "Only active admin accounts can view transactions." },
        { status: 403 },
      ),
    };
  }

  return { serviceClient };
}

export async function GET(request: NextRequest) {
  const resolved = await resolveAdmin(request);

  if (resolved.error) {
    return resolved.error;
  }

  const serviceClient = resolved.serviceClient!;

  const [riderResult, driverResult] = await Promise.all([
    serviceClient
      .from("rider_transaction")
      .select(
        "id, rider_uuid, reference, type, status, channel, gateway, currency, amount, fees, requested_amount, narration, sender_name, sender_account, paid_at, created_at, rider_profile(first_name, last_name, email, phone_num)",
      )
      .order("created_at", { ascending: false })
      .limit(MAX_ROWS),
    serviceClient
      .from("driver_transaction")
      .select(
        "id, driver_uuid, reference, type, status, channel, gateway, currency, amount, fee, requested_amount, narration, sender_name, sender_account, bank_name, account_number, account_name, paid_at, created_at, driver_profile(first_name, last_name, email, phone_num)",
      )
      .order("created_at", { ascending: false })
      .limit(MAX_ROWS),
  ]);

  if (riderResult.error || driverResult.error) {
    return NextResponse.json(
      {
        error:
          riderResult.error?.message ||
          driverResult.error?.message ||
          "Could not load transactions.",
      },
      { status: 400 },
    );
  }

  const riderTransactions: AdminTransaction[] = (riderResult.data ?? []).map(
    (row) => {
      const profile = row.rider_profile as EmbeddedProfile;

      return {
        id: row.id,
        scope: "rider",
        reference: row.reference,
        type: row.type,
        status: row.status,
        channel: row.channel,
        gateway: row.gateway,
        currency: row.currency,
        amount: Number(row.amount ?? 0),
        fee: Number(row.fees ?? 0),
        requestedAmount:
          row.requested_amount === null ? null : Number(row.requested_amount),
        narration: row.narration,
        senderName: row.sender_name,
        senderAccount: row.sender_account,
        bankName: null,
        accountNumber: null,
        accountName: null,
        paidAt: row.paid_at,
        createdAt: row.created_at,
        counterpartyUuid: row.rider_uuid,
        counterpartyName: buildName(profile),
        counterpartyEmail: profile?.email ?? null,
        counterpartyPhone: profile?.phone_num ?? null,
      };
    },
  );

  const driverTransactions: AdminTransaction[] = (driverResult.data ?? []).map(
    (row) => {
      const profile = row.driver_profile as EmbeddedProfile;

      return {
        id: row.id,
        scope: "driver",
        reference: row.reference,
        type: row.type,
        status: row.status,
        channel: row.channel,
        gateway: row.gateway,
        currency: row.currency,
        amount: Number(row.amount ?? 0),
        fee: Number(row.fee ?? 0),
        requestedAmount:
          row.requested_amount === null ? null : Number(row.requested_amount),
        narration: row.narration,
        senderName: row.sender_name,
        senderAccount: row.sender_account,
        bankName: row.bank_name,
        accountNumber: row.account_number,
        accountName: row.account_name,
        paidAt: row.paid_at,
        createdAt: row.created_at,
        counterpartyUuid: row.driver_uuid,
        counterpartyName: buildName(profile),
        counterpartyEmail: profile?.email ?? null,
        counterpartyPhone: profile?.phone_num ?? null,
      };
    },
  );

  return NextResponse.json({
    riderTransactions,
    driverTransactions,
  });
}
