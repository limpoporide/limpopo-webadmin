import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';

type AdminRole = Database['public']['Enums']['admin_role'];

const adminRoles: AdminRole[] = [
  'super-admin',
  'manager',
  'finance',
  'support',
  'marketing',
];

function normalizeOrigin(value: string) {
  return value.replace(/\/+$/, '');
}

function resolveAppOrigin(request: NextRequest) {
  const explicit =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.APP_URL;

  if (explicit) {
    return normalizeOrigin(explicit);
  }

  if (process.env.VERCEL_URL) {
    return normalizeOrigin(`https://${process.env.VERCEL_URL}`);
  }

  return normalizeOrigin(request.nextUrl.origin);
}

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
    return NextResponse.json({ error: 'Missing admin session.' }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as {
    email?: string;
    firstName?: string;
    lastName?: string;
    phoneNumber?: string | null;
    role?: AdminRole;
  } | null;

  const email = body?.email?.trim().toLowerCase();
  const firstName = body?.firstName?.trim();
  const lastName = body?.lastName?.trim();
  const phoneNumber = body?.phoneNumber?.trim() || null;
  const role = body?.role;

  if (!email || !email.includes('@')) {
    return NextResponse.json({ error: 'A valid email is required.' }, { status: 400 });
  }

  if (!firstName || !lastName) {
    return NextResponse.json(
      { error: 'First name and last name are required.' },
      { status: 400 },
    );
  }

  if (!role || !adminRoles.includes(role)) {
    return NextResponse.json({ error: 'A valid admin role is required.' }, { status: 400 });
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
    return NextResponse.json({ error: 'Invalid admin session.' }, { status: 401 });
  }

  const serviceClient = createClient<Database>(config.supabaseUrl, config.serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const { data: requesterRows, error: requesterError } = await serviceClient
    .from('admin_profile')
    .select('role, is_active')
    .eq('uuid', user.id)
    .limit(2);

  const requester = requesterRows?.[0] ?? null;

  if (
    requesterError ||
    (requesterRows?.length ?? 0) !== 1 ||
    !requester?.is_active ||
    requester.role !== 'super-admin'
  ) {
    return NextResponse.json(
      { error: 'Only active super-admin accounts can invite admins.' },
      { status: 403 },
    );
  }

  const { data: existingProfiles, error: existingProfilesError } = await serviceClient
    .from('admin_profile')
    .select('uuid, email, is_active')
    .eq('email', email)
    .limit(2);

  if (existingProfilesError) {
    return NextResponse.json(
      { error: existingProfilesError.message },
      { status: 400 },
    );
  }

  const existingProfile = existingProfiles?.[0] ?? null;

  if (existingProfiles && existingProfiles.length > 1) {
    await serviceClient.from('admin_profile').delete().eq('email', email).eq('is_active', false);
  }

  if (existingProfile?.is_active) {
    return NextResponse.json(
      { error: 'An active admin profile already exists for this email.' },
      { status: 409 },
    );
  }

  if (phoneNumber) {
    const { data: existingPhoneProfiles, error: existingPhoneProfilesError } = await serviceClient
      .from('admin_profile')
      .select('uuid')
      .eq('phone_num', phoneNumber)
      .limit(2);

    if (existingPhoneProfilesError) {
      return NextResponse.json(
        { error: existingPhoneProfilesError.message },
        { status: 400 },
      );
    }

    if ((existingPhoneProfiles?.length ?? 0) > 1) {
      return NextResponse.json(
        {
          error:
            'Multiple admin profiles exist for this phone number. Please clean up the duplicate pending rows before sending another invite.',
        },
        { status: 409 },
      );
    }

    const existingPhoneProfile = existingPhoneProfiles?.[0] ?? null;

    if (existingPhoneProfile && existingPhoneProfile.uuid !== existingProfile?.uuid) {
      return NextResponse.json(
        { error: 'An admin profile already exists for this phone number.' },
        { status: 409 },
      );
    }
  }

  const appOrigin = resolveAppOrigin(request);
  const redirectTo = `${appOrigin}/auth/accept-invite`;

  const inviteResult = await serviceClient.auth.admin.generateLink({
    type: 'invite',
    email,
    options: {
      data: {
        first_name: firstName,
        last_name: lastName,
        role,
      },
      redirectTo,
    },
  });

  let linkData = inviteResult.data;
  let linkError = inviteResult.error;
  let createdNewAuthUser = !linkError;

  // Email already exists in Supabase Auth: issue a recovery link so they can set a new password.
  if (
    linkError &&
    /already been registered|already registered|already exists/i.test(linkError.message)
  ) {
    const recoveryResult = await serviceClient.auth.admin.generateLink({
      type: 'recovery',
      email,
      options: { redirectTo },
    });

    linkData = recoveryResult.data;
    linkError = recoveryResult.error;
    createdNewAuthUser = false;
  }

  const inviteUrl = linkData?.properties?.action_link;

  if (linkError || !linkData?.user || !inviteUrl) {
    return NextResponse.json(
      { error: linkError?.message || 'Could not generate invite link.' },
      { status: 400 },
    );
  }

  const authUserId = linkData.user.id;

  await serviceClient
    .from('admin_profile')
    .delete()
    .eq('email', email)
    .eq('is_active', false)
    .neq('uuid', authUserId);

  let publicInviteUrl = inviteUrl;

  try {
    const parsed = new URL(inviteUrl);
    const tokenFromLink = parsed.searchParams.get('token');
    const typeFromLink = parsed.searchParams.get('type');

    if (tokenFromLink && (typeFromLink === 'invite' || typeFromLink === 'recovery')) {
      publicInviteUrl = `${appOrigin}/auth/invite?token=${encodeURIComponent(
        tokenFromLink,
      )}&type=${encodeURIComponent(typeFromLink)}`;
    }
  } catch {
    publicInviteUrl = inviteUrl;
  }

  const invitationMessage = [
    'Limpopo Ride Admin Invitation',
    '',
    `Hello ${firstName} ${lastName},`,
    `You have been invited as ${role} on the Limpopo WebAdmin dashboard.`,
    'Open this link to accept the invite and create your password:',
    publicInviteUrl,
  ].join('\n');

  console.log('\n=== Limpopo Admin Invite ===');
  console.log(invitationMessage);
  console.log('=== End Limpopo Admin Invite ===\n');
  console.log('[INVITE DEBUG] User ID from link:', linkData.user.id);
  console.log('[INVITE DEBUG] Email:', email);
  console.log('[INVITE DEBUG] Created new auth user:', createdNewAuthUser);

  const now = new Date().toISOString();
  const adminProfilePayload = {
    uuid: authUserId,
    email,
    first_name: firstName,
    last_name: lastName,
    phone_num: phoneNumber,
    role,
    is_active: false,
    created_at: now,
    updated_at: now,
  };

  const { data: admin, error: profileError } = await serviceClient
    .from('admin_profile')
    .upsert(adminProfilePayload, { onConflict: 'uuid' })
    .select('*')
    .single();

  if (profileError) {
    console.error('[INVITE ERROR] Failed to insert admin_profile:', profileError);
  } else {
    console.log('[INVITE DEBUG] Successfully inserted admin_profile with UUID:', admin?.uuid);
  }

  if (profileError || !admin) {
    // Only remove the auth user if this request created it.
    if (createdNewAuthUser) {
      await serviceClient.auth.admin.deleteUser(linkData.user.id);
    }
    const duplicatePhoneError =
      profileError?.code === '23505' &&
      profileError.message.includes('admin_profile_phone_num_key');

    return NextResponse.json(
      {
        error: duplicatePhoneError
          ? 'An admin profile already exists for this phone number.'
          : profileError?.message || 'Could not create pending admin profile.',
      },
      { status: 400 },
    );
  }

  return NextResponse.json({ admin, invitationMessage, inviteUrl: publicInviteUrl });
}
