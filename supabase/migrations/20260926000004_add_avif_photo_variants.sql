-- À appliquer manuellement après 20260926000003, avant tout import de variantes AVIF.
-- 000003 reste inchangée. Cette migration permet AVIF et WebP à une même largeur.
-- Les politiques RLS existantes portent sur photo_id et ne dépendent ni du chemin ni du format.
BEGIN;

ALTER TABLE public.photo_variants
  ADD COLUMN format TEXT NOT NULL DEFAULT 'webp' CHECK (format IN ('avif', 'webp'));

ALTER TABLE public.photo_variants
  DROP CONSTRAINT photo_variants_photo_id_width_key,
  DROP CONSTRAINT photo_variants_storage_path_check;

ALTER TABLE public.photo_variants
  ADD CONSTRAINT photo_variants_photo_id_width_format_key UNIQUE (photo_id, width, format),
  ADD CONSTRAINT photo_variants_storage_path_check CHECK (
    storage_path ~ '^[a-z0-9][a-z0-9/_-]*\.(avif|webp)$'
    AND format = (regexp_match(storage_path, '\.(avif|webp)$'))[1]
  );

COMMIT;
