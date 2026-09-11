import { NextRequest, NextResponse } from 'next/server';
import {
  createServiceClient,
  createUserClient,
  getBearerToken,
  getSupabaseConfig,
  requireActiveAdmin,
} from '@/lib/supabaseAdmin';

const DRIVER_FIELDS =
  'uuid, first_name, last_name, phone_num, email, profile_img, address, city, state, location_lat, location_lng, is_online, admin_verify';

// Known fleet types, merged with whatever already exists in the DB so the list never goes stale.
const BASE_VEHICLE_TYPES = ['Limpopo Pro', 'Limpopo Pro-Max (SUV)', 'Limpopo Comfort'];

function getVehicleTypeOptions(
  vehicles: {
    vehicle_type: string | null;
  }[],
) {
  const types = new Set(BASE_VEHICLE_TYPES);

  for (const vehicle of vehicles) {
    if (vehicle.vehicle_type) {
      types.add(vehicle.vehicle_type);
    }
  }

  return Array.from(types.values());
}

async function resolveAdmin(request: NextRequest) {
  const config = getSupabaseConfig();

  if (!config) {
    return {
      error: NextResponse.json(
        { error: 'Supabase server credentials are not configured.' },
        { status: 500 },
      ),
    };
  }

  const token = getBearerToken(request.headers.get('authorization'));

  if (!token) {
    return { error: NextResponse.json({ error: 'Missing admin session.' }, { status: 401 }) };
  }

  const userClient = createUserClient(config.supabaseUrl, config.publishableKey);

  const {
    data: { user },
    error: userError,
  } = await userClient.auth.getUser(token);

  if (userError || !user) {
    return { error: NextResponse.json({ error: 'Invalid admin session.' }, { status: 401 }) };
  }

  const serviceClient = createServiceClient(config.supabaseUrl, config.serviceRoleKey);

  if (!(await requireActiveAdmin(serviceClient, user.id))) {
    return {
      error: NextResponse.json(
        { error: 'Only active admin accounts can manage vehicles.' },
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

  const { data: vehicles, error: vehiclesError } = await serviceClient
    .from('vehicle_management')
    .select('*')
    .order('created_at', { ascending: false });

  if (vehiclesError) {
    return NextResponse.json({ error: vehiclesError.message }, { status: 400 });
  }

  const { data: drivers, error: driversError } = await serviceClient
    .from('driver_profile')
    .select(DRIVER_FIELDS)
    .order('first_name', { ascending: true });

  if (driversError) {
    return NextResponse.json({ error: driversError.message }, { status: 400 });
  }

  const driversByUuid = new Map((drivers ?? []).map((driver) => [driver.uuid, driver]));
  const assignedUuids = new Set(
    (vehicles ?? []).map((vehicle) => vehicle.assigned).filter(Boolean) as string[],
  );
  const vehicleTypeOptions = getVehicleTypeOptions(vehicles ?? []);

  return NextResponse.json({
    vehicles: (vehicles ?? []).map((vehicle) => ({
      ...vehicle,
      driver: vehicle.assigned ? driversByUuid.get(vehicle.assigned) ?? null : null,
    })),
    vehicleTypeOptions,
    availableDrivers: (drivers ?? []).filter(
      (driver) => driver.admin_verify && !assignedUuids.has(driver.uuid),
    ),
  });
}

export async function POST(request: NextRequest) {
  const resolved = await resolveAdmin(request);

  if (resolved.error) {
    return resolved.error;
  }

  const serviceClient = resolved.serviceClient!;

  const body = (await request.json().catch(() => null)) as {
    vehicleType?: string;
    vehicleModel?: string;
    vehicleNumber?: string;
    assignedDriver?: string;
    access?: string;
  } | null;

  const vehicleType = body?.vehicleType?.trim();
  const vehicleModel = body?.vehicleModel?.trim();
  const vehicleNumber = body?.vehicleNumber?.trim().toUpperCase();
  const assignedDriver = body?.assignedDriver?.trim();
  const access = body?.access === 'rented' ? 'rented' : 'open';

  if (!vehicleType || !vehicleModel || !vehicleNumber) {
    return NextResponse.json(
      { error: 'Vehicle type, model and number are required.' },
      { status: 400 },
    );
  }

  if (!assignedDriver) {
    return NextResponse.json({ error: 'Select a driver to assign.' }, { status: 400 });
  }

  // access_duration only accepts 'valid' | 'expired' | '7 days' per the DB check constraint.
  const accessDuration = access === 'rented' ? '7 days' : 'valid';

  const { data: driverRows, error: driverError } = await serviceClient
    .from('driver_profile')
    .select('uuid, admin_verify')
    .eq('uuid', assignedDriver)
    .limit(2);

  if (driverError) {
    return NextResponse.json({ error: driverError.message }, { status: 400 });
  }

  if ((driverRows?.length ?? 0) !== 1) {
    return NextResponse.json({ error: 'That driver could not be found.' }, { status: 404 });
  }

  if (!driverRows![0].admin_verify) {
    return NextResponse.json(
      { error: 'Only verified drivers can be assigned a vehicle.' },
      { status: 400 },
    );
  }

  const { data: conflicts, error: conflictError } = await serviceClient
    .from('vehicle_management')
    .select('id, vehicle_num, assigned')
    .or(`assigned.eq.${assignedDriver},vehicle_num.eq.${vehicleNumber}`)
    .limit(2);

  if (conflictError) {
    return NextResponse.json({ error: conflictError.message }, { status: 400 });
  }

  if ((conflicts?.length ?? 0) > 0) {
    const takenDriver = conflicts!.some((row) => row.assigned === assignedDriver);

    return NextResponse.json(
      {
        error: takenDriver
          ? 'That driver is already assigned to a vehicle.'
          : 'That vehicle number is already registered.',
      },
      { status: 409 },
    );
  }

  const now = new Date().toISOString();

  const { data: vehicle, error: insertError } = await serviceClient
    .from('vehicle_management')
    .insert({
      vehicle_type: vehicleType,
      vehicle_model: vehicleModel,
      vehicle_num: vehicleNumber,
      assigned: assignedDriver,
      assigned_date: now,
      access,
      access_duration: accessDuration,
      created_at: now,
      updated_at: now,
    })
    .select('*')
    .single();

  if (insertError || !vehicle) {
    // Postgres check_violation: surface a clear message instead of the raw constraint name.
    if (insertError?.code === '23514') {
      const constraint = (insertError as { message: string }).message;
      const friendly = constraint.includes('vehicle_model')
        ? 'That vehicle model is not accepted by the system. Try an existing model (e.g. Wuling) or ask engineering to allow the new value.'
        : constraint.includes('access_duration')
          ? 'That access duration value is not accepted by the system.'
          : 'That value is not accepted by the system.';

      return NextResponse.json({ error: friendly }, { status: 400 });
    }

    return NextResponse.json(
      { error: insertError?.message || 'Could not assign the vehicle.' },
      { status: 400 },
    );
  }

  return NextResponse.json({ vehicle });
}
