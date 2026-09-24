export async function loadSupabaseClient() {
  return (await import("@/integrations/supabase/client")).supabase;
}
