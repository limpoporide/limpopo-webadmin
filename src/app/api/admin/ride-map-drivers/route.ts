import { NextRequest, NextResponse } from "next/server";
import {
  createServiceClient,
  createUserClient,
  getBearerToken,
  getSupabaseConfig,
  requireActiveAdmin,
} from "@/lib/supabaseAdmin";

const DRIVER_FIELDS =
  "uuid, first_name, last_name, phone_num, profile_img, vehicle_type, is_online, admin_verify, location_lat, location_lng, updated_at";

export type RideMapDriver = {
  uuid: string;
  first_name: string;
  last_name: string;
  phone_num: string;
  profile_img: string | null;
  vehicle_type: string | null;
  is_online: boolean;
  admin_verify: boolean;
  location_lat: number | null;
  location_lng: number | null;
  updated_at: string;
};

export type RideMapDriversResponse = {
  drivers: RideMapDriver[];
};

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
      error: NextResponse.json({ error: "Missing admin session." }, { status: 401 }),
    };
  }

  const userClient = createUserClient(config.supabaseUrl, config.publishableKey);
  const {
    data: { user },
    error: userError,
  } = await userClient.auth.getUser(token);

  if (userError || !user) {
    return {
      error: NextResponse.json({ error: "Invalid admin session." }, { status: 401 }),
    };
  }

  const serviceClient = createServiceClient(config.supabaseUrl, config.serviceRoleKey);

  if (!(await requireActiveAdmin(serviceClient, user.id))) {
    return {
      error: NextResponse.json(
        { error: "Only active admin accounts can view the ride map." },
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

  const { data: drivers, error } = await resolved.serviceClient!
    .from("driver_profile")
    .select(DRIVER_FIELDS)
    .order("first_name", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({
    drivers: (drivers ?? []) as RideMapDriver[],
  });
}

