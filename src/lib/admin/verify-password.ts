import { createClient } from "@supabase/supabase-js";

/**
 * Vérifie le mot de passe actuel avec un client jetable (rien n'est stocké) : la session en cours,
 * et son niveau de double authentification, ne sont pas touchés.
 */
export async function verifyCurrentPassword(email: string, password: string): Promise<boolean> {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return false;
  const probe = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  const { error } = await probe.auth.signInWithPassword({ email, password });
  return !error;
}
