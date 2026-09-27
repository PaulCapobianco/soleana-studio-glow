-- Objet : préparer la migration des photos des galeries vers Supabase Storage (phase 1 : galeries
-- des pages SEO couple, famille, grossesse, portrait). Schéma ADDITIF uniquement : colonne
-- photos.source_key, tables photo_variants et photo_placements, avec RLS, politiques et droits
-- dans la même transaction. Aucun import, aucun bucket ni aucune politique existante modifiés.
-- Date : 26 septembre 2026.
-- À APPLIQUER MANUELLEMENT : cette migration est créée dans le dépôt mais n'a PAS été exécutée.
--
-- Ordre conseillé : 1) requêtes de vérification de docs/photos-storage/README.md ; 2) cette migration ;
-- 3) import de test sur 3 ou 4 photos ; 4) import complet ; 5) activation côté site.
-- Les politiques restrictives aal2 ci-dessous s'appliquent toujours aux écritures admin de ces deux
-- tables. Appliquer 20260926000002 après que tous les admins ont vérifié leur MFA/AAL2, avant cette
-- migration ; ne jamais retirer le bloc aal2 pour contourner un compte non enrôlé. L'import local
-- utilise le script opérateur avec une clé service_role gardée dans le terminal, jamais dans le site.

BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_class WHERE oid = 'public.photos'::regclass AND relrowsecurity)
     OR NOT EXISTS (SELECT 1 FROM pg_class WHERE oid = 'public.seo_pages'::regclass AND relrowsecurity)
     OR NOT EXISTS (SELECT 1 FROM pg_class WHERE oid = 'public.categories'::regclass AND relrowsecurity) THEN
    RAISE EXCEPTION 'Expected RLS on photos, seo_pages and categories';
  END IF;
  IF to_regclass('public.photo_variants') IS NOT NULL
     OR to_regclass('public.photo_placements') IS NOT NULL
     OR EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'photos' AND column_name = 'source_key') THEN
    RAISE EXCEPTION 'Schema already exists or diverges: inspect before applying';
  END IF;
END $$;

-- Les politiques existantes de photos limitent déjà les écritures aux admins.
-- Clé non secrète qui identifie une source importée indépendamment de ses URL.
ALTER TABLE public.photos ADD COLUMN source_key TEXT NULL
  CHECK (source_key IS NULL OR source_key ~ '^[a-z0-9][a-z0-9/_-]{0,199}$');
CREATE UNIQUE INDEX photos_source_key_unique ON public.photos (source_key) WHERE source_key IS NOT NULL;

CREATE TABLE public.photo_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  photo_id UUID NOT NULL REFERENCES public.photos(id) ON DELETE RESTRICT,
  storage_path TEXT NOT NULL UNIQUE CHECK (
    storage_path ~ '^[a-z0-9][a-z0-9/_-]*\.webp$'
  ),
  width INTEGER NOT NULL CHECK (width > 0),
  height INTEGER NOT NULL CHECK (height > 0),
  byte_size BIGINT NOT NULL CHECK (byte_size > 0),
  sha256 TEXT NOT NULL CHECK (sha256 ~ '^[0-9a-f]{64}$'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (photo_id, width)
);
ALTER TABLE public.photo_variants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin manage photo variants" ON public.photo_variants
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
GRANT SELECT ON public.photo_variants TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.photo_variants TO authenticated;
GRANT ALL ON public.photo_variants TO service_role;

CREATE TABLE public.photo_placements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  placement_key TEXT NOT NULL UNIQUE CHECK (placement_key ~ '^[a-z0-9][a-z0-9/_-]{0,199}$'),
  photo_id UUID NOT NULL REFERENCES public.photos(id) ON DELETE RESTRICT,
  context_type TEXT NOT NULL CHECK (context_type IN ('page', 'seo', 'category')),
  page_key TEXT NULL CHECK (page_key ~ '^[a-z0-9][a-z0-9/_-]{0,99}$'),
  seo_page_id UUID NULL REFERENCES public.seo_pages(id) ON DELETE RESTRICT,
  category_id UUID NULL REFERENCES public.categories(id) ON DELETE RESTRICT,
  slot TEXT NOT NULL CHECK (slot ~ '^[a-z0-9][a-z0-9_-]{0,99}$'),
  display_order INTEGER NOT NULL CHECK (display_order >= 0),
  object_position_x_pct NUMERIC(6,3) NOT NULL DEFAULT 50 CHECK (object_position_x_pct BETWEEN 0 AND 100),
  object_position_y_pct NUMERIC(6,3) NOT NULL DEFAULT 50 CHECK (object_position_y_pct BETWEEN 0 AND 100),
  alt_text_override TEXT NULL,
  published BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (
    (context_type = 'page' AND page_key IS NOT NULL AND seo_page_id IS NULL)
    OR (context_type = 'seo' AND page_key IS NULL AND seo_page_id IS NOT NULL)
    OR (context_type = 'category' AND page_key IS NULL AND seo_page_id IS NULL AND category_id IS NOT NULL)
  )
);
CREATE UNIQUE INDEX photo_placements_page_order ON public.photo_placements (page_key, slot, display_order) WHERE context_type = 'page';
CREATE UNIQUE INDEX photo_placements_seo_order ON public.photo_placements (seo_page_id, slot, display_order) WHERE context_type = 'seo';
CREATE UNIQUE INDEX photo_placements_category_order ON public.photo_placements (category_id, slot, display_order) WHERE context_type = 'category';
CREATE INDEX photo_placements_photo_id ON public.photo_placements (photo_id);
CREATE INDEX photo_placements_category_id ON public.photo_placements (category_id) WHERE category_id IS NOT NULL;
ALTER TABLE public.photo_placements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read published photo placements" ON public.photo_placements
  FOR SELECT TO anon, authenticated
  USING (
    published
    AND EXISTS (SELECT 1 FROM public.photos p WHERE p.id = photo_id AND p.published)
    AND (seo_page_id IS NULL OR EXISTS (SELECT 1 FROM public.seo_pages s WHERE s.id = seo_page_id AND s.published))
  );
CREATE POLICY "Admin manage photo placements" ON public.photo_placements
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
GRANT SELECT ON public.photo_placements TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.photo_placements TO authenticated;
GRANT ALL ON public.photo_placements TO service_role;

-- Le public ne découvre les chemins de variantes que si un emplacement visible référence la photo.
-- Le bucket reste public : toute URL connue sert l'image, mais la table n'énumère pas les variantes
-- des brouillons ou des photos sans placement publié.
CREATE POLICY "Public read published photo variants" ON public.photo_variants
  FOR SELECT TO anon, authenticated
  USING (
    EXISTS (SELECT 1 FROM public.photos p WHERE p.id = photo_id AND p.published)
    AND EXISTS (
      SELECT 1 FROM public.photo_placements pl
      WHERE pl.photo_id = photo_variants.photo_id
        AND pl.published
        AND (pl.seo_page_id IS NULL OR EXISTS (
          SELECT 1 FROM public.seo_pages s WHERE s.id = pl.seo_page_id AND s.published
        ))
    )
  );


-- Écritures admin : session aal2 exigée (politiques restrictives, cumulées avec has_role).
DO $aal2$
DECLARE
  tbl TEXT;
  cond CONSTANT TEXT := '(SELECT auth.jwt() ->> ''aal'') = ''aal2''';
BEGIN
  FOREACH tbl IN ARRAY ARRAY['photo_variants', 'photo_placements'] LOOP
    EXECUTE format('CREATE POLICY "Require aal2 for admin inserts" ON public.%I AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK (%s)', tbl, cond);
    EXECUTE format('CREATE POLICY "Require aal2 for admin updates" ON public.%I AS RESTRICTIVE FOR UPDATE TO authenticated USING (%s) WITH CHECK (%s)', tbl, cond, cond);
    EXECUTE format('CREATE POLICY "Require aal2 for admin deletes" ON public.%I AS RESTRICTIVE FOR DELETE TO authenticated USING (%s)', tbl, cond);
  END LOOP;
END
$aal2$;

COMMIT;

-- Retour arrière (tables vides ou créées par un lot d'import journalisé uniquement) :
-- DROP TABLE public.photo_placements;
-- DROP TABLE public.photo_variants;
-- DROP INDEX public.photos_source_key_unique;
-- ALTER TABLE public.photos DROP COLUMN source_key;
