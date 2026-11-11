// Client Supabase chargé à la demande. Les pages publiques lisent leurs données côté serveur
// (loaders) : un import statique du client ajoutait ≈ 53 Ko de JavaScript compressé (supabase-js)
// à CHAQUE page, y compris celles qui n'interrogent jamais Supabase dans le navigateur. Avec cet
// import dynamique, le code n'est téléchargé que lorsqu'une requête part réellement du navigateur
// (galeries de /portfolio/<catégorie>, navigation vers une page à loader). L'admin garde l'import
// statique de `@/integrations/supabase/client`.
export async function getSupabase() {
  return (await import("@/integrations/supabase/client")).supabase;
}
