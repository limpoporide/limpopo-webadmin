import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';

function getSupabaseConfig() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;

  if (!supabaseUrl || !publishableKey || !serviceRoleKey) {
    return null;
  }

  return { publishableKey, serviceRoleKey, supabaseUrl };
}

export async function POST(request: NextRequest) {
  const config = getSupabaseConfig();

  if (!config) {
    return NextResponse.json(
      { error: 'Supabase server credentials are not configured.' },
      { status: 500 },
    );
  }

  const authorization = request.headers.get('authorization');
  const token = authorization?.startsWith('Bearer ')
    ? authorization.slice('Bearer '.length)
    : null;

  if (!token) {
    return NextResponse.json({ error: 'Missing session.' }, { status: 401 });
  }

  const userClient = createClient<Database>(config.supabaseUrl, config.publishableKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const {
    data: { user },
    error: userError,
  } = await userClient.auth.getUser(token);

  if (userError || !user) {
    return NextResponse.json({ error: 'Invalid session.' }, { status: 401 });
  }

  // Use service role to bypass RLS and fetch the pending admin profile
  const serviceClient = createClient<Database>(config.supabaseUrl, config.serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const { data, error } = await serviceClient
    .from('admin_profile')
    .select('uuid, email, first_name, last_name, role, is_active')
    .eq('uuid', user.id)
    .limit(2);

  if (error) {
    console.error('[GET-INVITE-PROFILE ERROR]', error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  if ((data?.length ?? 0) > 1) {
    return NextResponse.json(
      { error: 'Multiple admin profiles are linked to this user.' },
      { status: 400 },
    );
  }

  const adminProfile = data?.[0] ?? null;

  if (!adminProfile) {
    return NextResponse.json(
      { error: 'This invite is not linked to an admin profile.' },
      { status: 404 },
    );
  }

  return NextResponse.json({ profile: adminProfile });
}
