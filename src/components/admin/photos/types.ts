import type { Database } from "@/integrations/supabase/types";

export type PhotoRow = Database["public"]["Tables"]["photos"]["Row"];
export type CategoryRow = Database["public"]["Tables"]["categories"]["Row"];
export type PhotoWithCategory = PhotoRow & {
  source_key?: string | null;
  category: Pick<CategoryRow, "name" | "slug"> | null;
};
export type SeoPage = { id: string; slug: string; h1: string; published: boolean };
export type Placement = {
  id: string;
  photo_id: string;
  seo_page_id: string;
  slot: string;
  display_order: number;
  object_position_x_pct: number;
  object_position_y_pct: number;
  published: boolean;
};
export type PhotoVariant = {
  id: string;
  photo_id: string;
  storage_path: string;
  format: string;
  width: number;
};

export const GALLERY_SLOTS: Record<string, string[]> = {
  "photographe-couple-marseille": ["gallery-1", "gallery-2", "gallery-3"],
  "photographe-famille-marseille": ["gallery-1", "gallery-2"],
  "photographe-grossesse-marseille": ["gallery-1", "gallery-2"],
  "photographe-portrait-marseille": ["gallery-1"],
};

export const galleryCategory = (slug: string) =>
  slug.match(/^photographe-(couple|famille|grossesse|portrait)-marseille$/)?.[1];
