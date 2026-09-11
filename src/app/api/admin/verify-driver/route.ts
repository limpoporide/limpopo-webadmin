import { NextRequest, NextResponse } from 'next/server';
import {
  createServiceClient,
  createUserClient,
  getBearerToken,
  getSupabaseConfig,
  requireActiveAdmin,
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
    return NextResponse.json({ error: 'Missing admin session.' }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as {
    driverUuid?: string;
    verified?: boolean;
  } | null;

  const driverUuid = body?.driverUuid;
  const verified = body?.verified;

  if (!driverUuid || typeof verified !== 'boolean') {
    return NextResponse.json(
      { error: 'driverUuid and verified are required.' },
      { status: 400 },
    );
  }

  const userClient = createUserClient(config.supabaseUrl, config.publishableKey);

  const {
    data: { user: requesterUser },
    error: requesterUserError,
  } = await userClient.auth.getUser(token);

  if (requesterUserError || !requesterUser) {
    return NextResponse.json({ error: 'Invalid admin session.' }, { status: 401 });
  }

  const serviceClient = createServiceClient(config.supabaseUrl, config.serviceRoleKey);

  if (!(await requireActiveAdmin(serviceClient, requesterUser.id))) {
    return NextResponse.json(
      { error: 'Only active admin accounts can verify drivers.' },
      { status: 403 },
    );
  }

  const { data: driver, error: updateError } = await serviceClient
    .from('driver_profile')
    .update({ admin_verify: verified, updated_at: new Date().toISOString() })
    .eq('uuid', driverUuid)
    .select('*')
    .single();

  if (updateError || !driver) {
    return NextResponse.json(
      { error: updateError?.message || 'Could not update driver verification.' },
      { status: 400 },
    );
  }

  return NextResponse.json({ driver });
}
