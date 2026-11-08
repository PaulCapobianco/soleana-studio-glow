-- Objet : gestion des catégories de photos depuis l'admin (créer, renommer, réordonner, masquer,
-- supprimer). Ajoute `categories.published` (masquer sans supprimer), des contraintes de format,
-- et des garde-fous en base : adresse (slug) jamais modifiable, catégories de base jamais supprimées,
-- suppression refusée tant que des photos y sont rattachées.
-- Date : 9 novembre 2026.
--
-- ############################################################################################
-- # À APPLIQUER MANUELLEMENT (éditeur SQL Supabase), APRÈS 20260926000003 (elle réécrit une   #
-- # politique de photo_placements). Cette migration n'a PAS été exécutée.                    #
-- ############################################################################################
--
-- RLS (colonne ajoutée => politiques revues dans la même migration) :
--   * lecture publique de `categories` : désormais « published » seulement (avant : tout) ;
--     l'admin voit toujours tout via « Admin manage categories » (inchangée) ;
--   * lecture publique de `photo_placements` : un emplacement de contexte `category` n'est plus
--     visible si sa catégorie est masquée (même politique que 20260926000003 + une condition) ;
--   * écritures : « Admin manage categories » (has_role admin) inchangée ; les politiques aal2 de
--     20260926000002 couvrent déjà `categories` quand elles sont appliquées.
-- Opérations sur table existante : ADD COLUMN à défaut constant (aucune réécriture), deux CHECK sur
-- les 5 lignes actuelles (slugs et noms existants conformes), remplacement de deux politiques.
-- Aucune donnée supprimée. Les catégories actuelles restent toutes visibles (published = true).

DO $$
BEGIN
  IF to_regclass('public.photo_placements') IS NULL THEN
    RAISE EXCEPTION 'Apply 20260926000003_add_photo_variants_and_placements.sql first';
  END IF;
END $$;

ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS published BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE public.categories
  ADD CONSTRAINT categories_slug_format CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' AND char_length(slug) <= 60),
  ADD CONSTRAINT categories_name_length CHECK (char_length(btrim(name)) BETWEEN 1 AND 80);

DROP POLICY IF EXISTS "Public read categories" ON public.categories;
CREATE POLICY "Public read categories" ON public.categories
  FOR SELECT TO anon, authenticated USING (published);

DROP POLICY IF EXISTS "Public read published photo placements" ON public.photo_placements;
CREATE POLICY "Public read published photo placements" ON public.photo_placements
  FOR SELECT TO anon, authenticated
  USING (
    published
    AND EXISTS (SELECT 1 FROM public.photos p WHERE p.id = photo_id AND p.published)
    AND (seo_page_id IS NULL OR EXISTS (SELECT 1 FROM public.seo_pages s WHERE s.id = seo_page_id AND s.published))
    AND (event_id IS NULL OR EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_id AND e.status = 'published'))
    AND (category_id IS NULL OR EXISTS (SELECT 1 FROM public.categories c WHERE c.id = category_id AND c.published))
  );

-- Garde-fous appliqués en base (pas seulement dans l'interface).
-- Les slugs ci-dessous sont lus par le code du site (galeries des pages SEO, portfolio) : jamais supprimés.
CREATE OR REPLACE FUNCTION public.enforce_category_rules()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
DECLARE
  protected CONSTANT TEXT[] := ARRAY['grossesse', 'famille', 'couple', 'portrait', 'evenement'];
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF NEW.slug <> OLD.slug THEN
      RAISE EXCEPTION 'L''adresse d''une catégorie ne peut pas être modifiée : créez une nouvelle catégorie.';
    END IF;
    RETURN NEW;
  END IF;

  -- DELETE
  IF OLD.slug = ANY (protected) THEN
    RAISE EXCEPTION 'Cette catégorie est utilisée par le site et ne peut pas être supprimée : masquez-la plutôt.';
  END IF;
  IF EXISTS (SELECT 1 FROM public.photos WHERE category_id = OLD.id) THEN
    RAISE EXCEPTION 'Cette catégorie contient encore des photos : déplacez-les dans une autre catégorie, ou masquez la catégorie.';
  END IF;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS categories_enforce_rules ON public.categories;
CREATE TRIGGER categories_enforce_rules BEFORE UPDATE OR DELETE ON public.categories
  FOR EACH ROW EXECUTE FUNCTION public.enforce_category_rules();

-- Contrôles après application :
-- SELECT slug, name, display_order, published FROM public.categories ORDER BY display_order;
--   -- attendu : 5 lignes, published = true partout
-- SELECT policyname, cmd FROM pg_policies WHERE tablename = 'categories';
--   -- attendu : 2 (« Public read categories », « Admin manage categories »), plus 3 aal2 si 000002 est appliquée
-- SELECT tgname FROM pg_trigger WHERE tgrelid = 'public.categories'::regclass AND NOT tgisinternal;
--   -- attendu : categories_enforce_rules
