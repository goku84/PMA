"use server";

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://pesyehozqtwpsjgvnmwv.supabase.co';
// The service role key must be kept secret and used only on the server
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey || '', {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

export async function deleteAuthUser(authUserId) {
  try {
    if (!supabaseServiceKey) {
      return { error: "SUPABASE_SERVICE_ROLE_KEY is not configured in environment variables." };
    }
    const { data, error } = await supabaseAdmin.auth.admin.deleteUser(authUserId);
    if (error) return { error: error.message };
    return { data };
  } catch (err) {
    return { error: err.message };
  }
}

export async function updateAuthUserCredentials(authUserId, updates) {
  try {
    if (!supabaseServiceKey) {
      return { error: "SUPABASE_SERVICE_ROLE_KEY is not configured in environment variables." };
    }
    const { data, error } = await supabaseAdmin.auth.admin.updateUserById(authUserId, updates);
    if (error) return { error: error.message };
    return { data };
  } catch (err) {
    return { error: err.message };
  }
}
