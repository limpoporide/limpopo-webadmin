import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';

export function getSupabaseConfig() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;

  if (!supabaseUrl || !publishableKey || !serviceRoleKey) {
    return null;
  }

  return { publishableKey, serviceRoleKey, supabaseUrl };
}

export function createUserClient(supabaseUrl: string, publishableKey: string) {
  return createClient<Database>(supabaseUrl, publishableKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export function createServiceClient(supabaseUrl: string, serviceRoleKey: string) {
  return createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export function getBearerToken(authorization: string | null) {
  return authorization?.startsWith('Bearer ')
    ? authorization.slice('Bearer '.length)
    : null;
}

type ServiceClient = ReturnType<typeof createServiceClient>;

export async function requireActiveAdmin(
  serviceClient: ServiceClient,
  adminUuid: string,
) {
  const { data, error } = await serviceClient
    .from('admin_profile')
    .select('is_active')
    .eq('uuid', adminUuid)
    .limit(2);

  if (error || (data?.length ?? 0) !== 1 || !data![0].is_active) {
    return false;
  }

  return true;
}
