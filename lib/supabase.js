import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://pesyehozqtwpsjgvnmwv.supabase.co';
const supabaseKey = 'sb_publishable_R45VaNEZnUKpgou89J0OPA_ZIER_G4G';

export const supabase = createClient(supabaseUrl, supabaseKey);

export const supabaseAdminAuth = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false, autoRefreshToken: false }
});
