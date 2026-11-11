import { supabase } from "@/integrations/supabase/client";

export function queryError(error: unknown) {
  if (error) throw error;
}

export function legacyStoragePath(imageUrl: string): string | null {
  try {
    const probe = new URL(supabase.storage.from("photos").getPublicUrl("_probe_").data.publicUrl);
    const image = new URL(imageUrl);
    const prefix = probe.pathname.slice(0, -"_probe_".length);
    if (image.origin !== probe.origin || !image.pathname.startsWith(prefix)) return null;
    const path = decodeURIComponent(image.pathname.slice(prefix.length));
    if (!path || path.split("/").some((part) => !part || part === "." || part === ".."))
      return null;
    return path;
  } catch {
    return null;
  }
}

export function formatStorageBytes(value: number | null) {
  if (value === null) return "Indisponible";
  if (value < 1_000_000) return `${(value / 1_000).toFixed(0)} kB`;
  return `${(value / 1_000_000).toFixed(2)} MB`;
}
