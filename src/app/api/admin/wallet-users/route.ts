import { NextRequest, NextResponse } from "next/server";
import {
  createServiceClient,
  createUserClient,
  getBearerToken,
  getSupabaseConfig,
  requireActiveAdmin,
} from "@/lib/supabaseAdmin";

export type WalletProfile = {
  id: string;
  name: string;
  phone: string;
  walletAccount: string | null;
  bank: string | null;
  walletBalance: number;
};

export type WalletUsersResponse = {
  riders: WalletProfile[];
  drivers: WalletProfile[];
};

const PAGE_SIZE = 500;

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
        { error: "Only active admin accounts can view wallet profiles." },
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

  try {
    const [riders, drivers] = await Promise.all([
      loadRiders(serviceClient),
      loadDrivers(serviceClient),
    ]);

    return NextResponse.json({ riders, drivers } satisfies WalletUsersResponse);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Could not load wallet profiles.",
      },
      { status: 400 },
    );
  }
}

async function loadRiders(
  serviceClient: ReturnType<typeof createServiceClient>,
) {
  const profiles: WalletProfile[] = [];

  for (let offset = 0; ; offset += PAGE_SIZE) {
    const { data, error } = await serviceClient
      .from("rider_profile")
      .select(
        "uuid, first_name, last_name, phone_num, wallet_account, bank_name, wallet_balance",
      )
      .order("first_name", { ascending: true })
      .range(offset, offset + PAGE_SIZE - 1);

    if (error) {
      throw error;
    }

    profiles.push(
      ...(data ?? []).map((profile) => ({
        id: profile.uuid,
        name: `${profile.first_name} ${profile.last_name}`.trim(),
        phone: profile.phone_num,
        walletAccount: profile.wallet_account,
        bank: profile.bank_name,
        walletBalance: Number(profile.wallet_balance ?? 0),
      })),
    );

    if ((data?.length ?? 0) < PAGE_SIZE) {
      return profiles;
    }
  }
}

async function loadDrivers(
  serviceClient: ReturnType<typeof createServiceClient>,
) {
  const profiles: WalletProfile[] = [];

  for (let offset = 0; ; offset += PAGE_SIZE) {
    const { data, error } = await serviceClient
      .from("driver_profile")
      .select(
        "uuid, first_name, last_name, phone_num, wallet_account, bank_name, wallet_balance",
      )
      .order("first_name", { ascending: true })
      .range(offset, offset + PAGE_SIZE - 1);

    if (error) {
      throw error;
    }

    profiles.push(
      ...(data ?? []).map((profile) => ({
        id: profile.uuid,
        name: `${profile.first_name} ${profile.last_name}`.trim(),
        phone: profile.phone_num,
        walletAccount: profile.wallet_account,
        bank: profile.bank_name,
        walletBalance: Number(profile.wallet_balance ?? 0),
      })),
    );

    if ((data?.length ?? 0) < PAGE_SIZE) {
      return profiles;
    }
  }
}