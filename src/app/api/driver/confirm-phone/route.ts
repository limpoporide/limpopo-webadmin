import { NextRequest, NextResponse } from 'next/server';
import {
  createServiceClient,
  createUserClient,
  getBearerToken,
  getSupabaseConfig,
} from '@/lib/supabaseAdmin';

export async function POST(request: NextRequest) {
  const config = getSupabaseConfig();

  if (!config) {
    return NextResponse.json(
      { error: 'Supabase server credentials are not configured.' },
      { status: 500 },
    );
  }

  const token = getBearerToken(request.headers.get('authorization'));

  if (!token) {
    return NextResponse.json({ error: 'Missing session.' }, { status: 401 });
  }

  const userClient = createUserClient(config.supabaseUrl, config.publishableKey);

  const {
    data: { user },
    error: userError,
  } = await userClient.auth.getUser(token);

  if (userError || !user) {
    return NextResponse.json({ error: 'Invalid session.' }, { status: 401 });
  }

  const serviceClient = createServiceClient(config.supabaseUrl, config.serviceRoleKey);

  const { data: driverRows, error: driverError } = await serviceClient
    .from('driver_profile')
    .select('uuid, email, first_name, last_name, phone_num, phone_verified, admin_verify')
    .eq('uuid', user.id)
    .limit(2);

  if (driverError) {
    return NextResponse.json({ error: driverError.message }, { status: 400 });
  }

  if ((driverRows?.length ?? 0) !== 1) {
    return NextResponse.json(
      { error: 'This account is not linked to a driver profile.' },
      { status: 404 },
    );
  }

  const driver = driverRows![0];

  // Supabase stamps phone_confirmed_at once the Twilio OTP is accepted.
  if (user.phone_confirmed_at && !driver.phone_verified) {
    const { error: updateError } = await serviceClient
      .from('driver_profile')
      .update({ phone_verified: true, updated_at: new Date().toISOString() })
      .eq('uuid', driver.uuid);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 400 });
    }

    driver.phone_verified = true;
  }

  return NextResponse.json({ profile: driver });
}
