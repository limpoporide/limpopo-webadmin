import { NextRequest, NextResponse } from 'next/server';
import {
  createServiceClient,
  createUserClient,
  getBearerToken,
  getSupabaseConfig,
  requireActiveAdmin,
} from '@/lib/supabaseAdmin';

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
        { error: 'Only active admin accounts can manage pricing.' },
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

  const { data: pricing, error } = await resolved.serviceClient!
    .from('vehicle_pricing')
    .select('*')
    .order('vehicle_type', { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ pricing: pricing ?? [] });
}

type PricingBody = {
  id?: string;
  vehicleType?: string;
  baseFare?: number;
  pricePerKm?: number;
  pricePerMin?: number;
  delayPricePerMin?: number;
  freeDelayMins?: number;
  maxDelayMins?: number;
  stateLevy?: number;
  vatPercentage?: number;
  isActive?: boolean;
};

function parsePricingBody(body: PricingBody | null) {
  const vehicleType = body?.vehicleType?.trim();
  const baseFare = Number(body?.baseFare);
  const pricePerKm = Number(body?.pricePerKm);
  const pricePerMin = Number(body?.pricePerMin);
  const delayPricePerMin = Number(body?.delayPricePerMin);
  const freeDelayMins = Number(body?.freeDelayMins ?? 0);
  const maxDelayMins = Number(body?.maxDelayMins ?? 0);
  const stateLevy = Number(body?.stateLevy ?? 0);
  const vatPercentage = Number(body?.vatPercentage ?? 0);
  const isActive = body?.isActive ?? true;

  const numericFields = {
    baseFare,
    pricePerKm,
    pricePerMin,
    delayPricePerMin,
    freeDelayMins,
    maxDelayMins,
    stateLevy,
    vatPercentage,
  };

  if (!vehicleType) {
    return { error: 'Vehicle type is required.' };
  }

  for (const [field, value] of Object.entries(numericFields)) {
    if (!Number.isFinite(value) || value < 0) {
      return { error: `${field} must be a valid non-negative number.` };
    }
  }

  return {
    row: {
      vehicle_type: vehicleType,
      base_fare: baseFare,
      price_per_km: pricePerKm,
      price_per_min: pricePerMin,
      delay_price_per_min: delayPricePerMin,
      free_delay_mins: freeDelayMins,
      max_delay_mins: maxDelayMins,
      state_levy: stateLevy,
      vat_percentage: vatPercentage,
      is_active: isActive,
    },
  };
}

export async function POST(request: NextRequest) {
  const resolved = await resolveAdmin(request);

  if (resolved.error) {
    return resolved.error;
  }

  const body = (await request.json().catch(() => null)) as PricingBody | null;
  const parsed = parsePricingBody(body);

  if (parsed.error) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const { data: pricing, error } = await resolved.serviceClient!
    .from('vehicle_pricing')
    .insert(parsed.row!)
    .select('*')
    .single();

  if (error || !pricing) {
    return NextResponse.json(
      { error: error?.message || 'Could not create the pricing plan.' },
      { status: 400 },
    );
  }

  return NextResponse.json({ pricing });
}

export async function PATCH(request: NextRequest) {
  const resolved = await resolveAdmin(request);

  if (resolved.error) {
    return resolved.error;
  }

  const body = (await request.json().catch(() => null)) as PricingBody | null;
  const id = body?.id?.trim();

  if (!id) {
    return NextResponse.json({ error: 'Pricing id is required.' }, { status: 400 });
  }

  const parsed = parsePricingBody(body);

  if (parsed.error) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const { data: pricing, error } = await resolved.serviceClient!
    .from('vehicle_pricing')
    .update(parsed.row!)
    .eq('id', id)
    .select('*')
    .single();

  if (error || !pricing) {
    return NextResponse.json(
      { error: error?.message || 'Could not update the pricing plan.' },
      { status: 400 },
    );
  }

  return NextResponse.json({ pricing });
}

export async function DELETE(request: NextRequest) {
  const resolved = await resolveAdmin(request);

  if (resolved.error) {
    return resolved.error;
  }

  const id = request.nextUrl.searchParams.get('id')?.trim();

  if (!id) {
    return NextResponse.json({ error: 'Pricing id is required.' }, { status: 400 });
  }

  const { error } = await resolved.serviceClient!
    .from('vehicle_pricing')
    .delete()
    .eq('id', id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
