import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { v2 as cloudinary } from 'cloudinary';
import type { Database } from '@/types/database.types';

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
]);

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

function getCloudinaryConfig() {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    return null;
  }

  return { cloudName, apiKey, apiSecret };
}

function uploadBufferToCloudinary(buffer: Buffer, folder: string) {
  return new Promise<{ secure_url: string; public_id: string }>((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { folder, resource_type: 'auto' },
      (error, result) => {
        if (error || !result) {
          reject(error || new Error('Cloudinary upload failed.'));
          return;
        }

        resolve({ secure_url: result.secure_url, public_id: result.public_id });
      },
    );

    uploadStream.end(buffer);
  });
}

export async function POST(request: NextRequest) {
  const supabaseConfig = getSupabaseConfig();
  const cloudinaryConfig = getCloudinaryConfig();

  if (!supabaseConfig) {
    return NextResponse.json(
      { error: 'Supabase server credentials are not configured.' },
      { status: 500 },
    );
  }

  if (!cloudinaryConfig) {
    return NextResponse.json(
      { error: 'Cloudinary credentials are not configured.' },
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

  const userClient = createClient<Database>(
    supabaseConfig.supabaseUrl,
    supabaseConfig.publishableKey,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  const {
    data: { user: requesterUser },
    error: requesterUserError,
  } = await userClient.auth.getUser(token);

  if (requesterUserError || !requesterUser) {
    return NextResponse.json({ error: 'Invalid admin session.' }, { status: 401 });
  }

  const serviceClient = createClient<Database>(
    supabaseConfig.supabaseUrl,
    supabaseConfig.serviceRoleKey,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  const { data: requesterRows, error: requesterError } = await serviceClient
    .from('admin_profile')
    .select('is_active')
    .eq('uuid', requesterUser.id)
    .limit(2);

  const requester = requesterRows?.[0] ?? null;

  if (requesterError || (requesterRows?.length ?? 0) !== 1 || !requester?.is_active) {
    return NextResponse.json(
      { error: 'Only active admin accounts can upload documents.' },
      { status: 403 },
    );
  }

  const formData = await request.formData().catch(() => null);
  const file = formData?.get('file');

  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: 'No file was provided.' }, { status: 400 });
  }

  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    return NextResponse.json(
      { error: 'Only JPG, PNG, WEBP, or PDF files are allowed.' },
      { status: 400 },
    );
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return NextResponse.json(
      { error: 'File is too large. Maximum size is 10MB.' },
      { status: 400 },
    );
  }

  cloudinary.config({
    cloud_name: cloudinaryConfig.cloudName,
    api_key: cloudinaryConfig.apiKey,
    api_secret: cloudinaryConfig.apiSecret,
  });

  const buffer = Buffer.from(await file.arrayBuffer());

  try {
    const result = await uploadBufferToCloudinary(buffer, 'driver-documents');

    return NextResponse.json({ url: result.secure_url, publicId: result.public_id });
  } catch (error) {
    console.error('[UPLOAD-DOCUMENT ERROR]', error);
    return NextResponse.json({ error: 'Could not upload the document.' }, { status: 500 });
  }
}
