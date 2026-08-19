import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabasePublishableKey = process.env.SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl) {
  throw new Error('Missing SUPABASE_URL environment variable.');
}

if (!supabasePublishableKey) {
  throw new Error('Missing SUPABASE_PUBLISHABLE_KEY environment variable.');
}

export const supabase = createClient(supabaseUrl, supabasePublishableKey);