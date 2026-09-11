import { NextRequest, NextResponse } from 'next/server';
import { toE164 } from '@/lib/phone';
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
    email?: string;
    firstName?: string;
    lastName?: string;
    phoneNumber?: string;
    address?: string | null;
    city?: string | null;
    state?: string | null;
    experience?: string | null;
    nin?: string | null;
    licenseUpload?: string | null;
    vehicleType?: string | null;
    healthStatus?: 'yes' | 'no';
    healthYes?: string | null;
  } | null;

  const email = body?.email?.trim().toLowerCase();
  const firstName = body?.firstName?.trim();
  const lastName = body?.lastName?.trim();
  const phoneNumber = body?.phoneNumber?.trim();
  const address = body?.address?.trim() || null;
  const city = body?.city?.trim() || null;
  const state = body?.state?.trim() || null;
  const experience = body?.experience?.trim() || null;
  const nin = body?.nin?.trim() || null;
  const licenseUpload = body?.licenseUpload?.trim() || null;
  const vehicleType = body?.vehicleType?.trim() || null;
  const healthStatus = body?.healthStatus === 'yes' ? 'yes' : 'no';
  const healthYes = healthStatus === 'yes' ? body?.healthYes?.trim() || null : null;

  if (!email || !email.includes('@')) {
    return NextResponse.json({ error: 'A valid email is required.' }, { status: 400 });
  }

  if (!firstName || !lastName) {
    return NextResponse.json(
      { error: 'First name and last name are required.' },
      { status: 400 },
    );
  }

  if (!phoneNumber) {
    return NextResponse.json({ error: 'Phone number is required.' }, { status: 400 });
  }

  if (!/^\d{11}$/.test(phoneNumber)) {
    return NextResponse.json(
      { error: 'Phone number must be exactly 11 digits.' },
      { status: 400 },
    );
  }

  const phoneE164 = toE164(phoneNumber);

  if (!phoneE164) {
    return NextResponse.json(
      { error: 'Phone number could not be converted to an international number.' },
      { status: 400 },
    );
  }

  if (nin && !/^\d{11}$/.test(nin)) {
    return NextResponse.json({ error: 'NIN must be exactly 11 digits.' }, { status: 400 });
  }

  if (healthStatus === 'yes' && !healthYes) {
    return NextResponse.json(
      { error: 'Please describe the health condition.' },
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
      { error: 'Only active admin accounts can create drivers.' },
      { status: 403 },
    );
  }

  const { data: existingProfiles, error: existingProfilesError } = await serviceClient
    .from('driver_profile')
    .select('uuid')
    .or(`email.eq.${email},phone_num.eq.${phoneNumber},phone_num.eq.${phoneE164}`)
    .limit(2);

  if (existingProfilesError) {
    return NextResponse.json({ error: existingProfilesError.message }, { status: 400 });
  }

  if ((existingProfiles?.length ?? 0) > 0) {
    return NextResponse.json(
      { error: 'A driver profile already exists for this email or phone number.' },
      { status: 409 },
    );
  }

  const redirectTo = `${request.nextUrl.origin}/auth/driver-verify-phone`;

  // The phone is attached now (unconfirmed) so the driver app's
  // signInWithOtp({ phone }) resolves this exact user instead of creating a new one.
  const { data: created, error: createError } = await serviceClient.auth.admin.createUser({
    email,
    email_confirm: true,
    phone: phoneE164,
    phone_confirm: false,
    user_metadata: {
      first_name: firstName,
      last_name: lastName,
      phone_num: phoneE164,
      role: 'driver',
      signup_complete: false,
    },
  });

  if (createError || !created?.user) {
    const alreadyRegistered = /already been registered|already registered|already exists/i.test(
      createError?.message ?? '',
    );

    return NextResponse.json(
      {
        error: alreadyRegistered
          ? 'A Supabase Auth account already uses this email or phone number. Remove that orphaned auth user, or use different details.'
          : createError?.message || 'Could not create the driver auth account.',
      },
      { status: alreadyRegistered ? 409 : 400 },
    );
  }

  const authUserId = created.user.id;

  const now = new Date().toISOString();
  const driverProfilePayload = {
    uuid: authUserId,
    email,
    first_name: firstName,
    last_name: lastName,
    phone_num: phoneE164,
    address,
    city,
    state,
    experience,
    nin,
    license_upload: licenseUpload,
    vehicle_type: vehicleType,
    health_status: healthStatus,
    health_yes: healthYes,
    admin_verify: false,
    phone_verified: false,
    is_online: false,
    // Step 1 is covered by the admin form; step 2 is left for the driver so the app
    // still walks them through it and provisions their payout account.
    check1: true,
    check2: false,
    created_at: now,
    updated_at: now,
  };

  const { data: driver, error: profileError } = await serviceClient
    .from('driver_profile')
    .insert(driverProfilePayload)
    .select('*')
    .single();

  if (profileError || !driver) {
    await serviceClient.auth.admin.deleteUser(authUserId);

    return NextResponse.json(
      { error: profileError?.message || 'Could not create driver profile.' },
      { status: 400 },
    );
  }

  // generateLink never sends mail; signInWithOtp is what actually dispatches it.
  const generated = await serviceClient.auth.admin.generateLink({
    type: 'magiclink',
    email,
    options: { redirectTo },
  });

  const inviteUrl = generated.data?.properties?.action_link ?? null;

  const { error: mailError } = await userClient.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: redirectTo, shouldCreateUser: false },
  });

  const emailSent = !mailError;
  const emailError = mailError?.message ?? null;

  const invitationMessage = [
    'Limpopo Ride Driver Invitation',
    '',
    `Hello ${firstName} ${lastName},`,
    'You have been registered as a driver on Limpopo Ride.',
    `Verify the phone number ${phoneE164} and create your password here:`,
    inviteUrl ?? redirectTo,
  ].join('\n');

  console.log('\n=== Limpopo Driver Invite ===');
  console.log(invitationMessage);
  if (!emailSent) {
    console.log(`Invite email was not sent: ${emailError ?? 'unknown error'}`);
  }
  console.log('=== End Limpopo Driver Invite ===\n');

  return NextResponse.json({
    driver,
    invitationMessage,
    emailSent,
    emailError,
    inviteUrl,
  });
}
