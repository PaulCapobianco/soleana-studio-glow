-- Objet : table `events` — pages événement (mini-séances de Noël, etc.) et leur teaser d'accueil,
-- éditables depuis l'administration. Insère l'édition « Mini-séances de Noël 2026 » telle qu'elle
-- est affichée aujourd'hui (src/data/noel-2026.ts), pour que le contenu en base soit identique.
-- Date : 6 novembre 2026.
--
-- ############################################################################################
-- # À APPLIQUER MANUELLEMENT (éditeur SQL Supabase). Cette migration n'a PAS été exécutée.   #
-- # Elle est idempotente pour la table et la ligne Noël (IF NOT EXISTS / ON CONFLICT).       #
-- ############################################################################################
--
-- Choix de modélisation :
--   * une seule table ; les formules (prix, contenu, lien de réservation) et la FAQ sont des
--     tableaux JSON, validés par l'application (zod) et par un contrôle « c'est bien un tableau » ;
--   * statut : draft (brouillon) / published (publié, visible) / archived (archivé, invisible) ;
--   * RLS : lecture publique des seuls événements publiés ; toute écriture réservée à l'admin ;
--   * images : bucket Storage `photos` existant, préfixe `events/` (politiques admin déjà en place) ;
--   * le slug est figé dès la première publication (l'adresse de la page ne change plus).

CREATE TABLE IF NOT EXISTS public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE
    CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' AND char_length(slug) <= 80),

  -- Contenu de la page
  title TEXT NOT NULL CHECK (char_length(title) BETWEEN 1 AND 120),
  subtitle TEXT NOT NULL DEFAULT '' CHECK (char_length(subtitle) <= 300),
  description TEXT NOT NULL DEFAULT '' CHECK (char_length(description) <= 4000),
  location TEXT NOT NULL DEFAULT '' CHECK (char_length(location) <= 160),
  edition_label TEXT NOT NULL DEFAULT '' CHECK (char_length(edition_label) <= 80),
  experience_steps TEXT[] NOT NULL DEFAULT '{}',
  closing_title TEXT NOT NULL DEFAULT '' CHECK (char_length(closing_title) <= 200),

  -- Dates (jour entier, sans heure) : séances, puis dates de report en cas de mauvaise météo
  event_dates DATE[] NOT NULL DEFAULT '{}',
  fallback_dates DATE[] NOT NULL DEFAULT '{}',
  availability_note TEXT NOT NULL DEFAULT '' CHECK (char_length(availability_note) <= 300),

  -- Réservation : formules [{name, price_eur, features[], booking_url, featured}]
  -- et FAQ [{question, answer}] ; booking_url sert aux événements sans formules.
  formules JSONB NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(formules) = 'array'),
  faq JSONB NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(faq) = 'array'),
  booking_url TEXT NULL CHECK (booking_url IS NULL OR booking_url ~ '^https://'),

  -- Image de couverture (deux tailles WebP envoyées depuis l'admin)
  cover_image_url TEXT NULL CHECK (cover_image_url IS NULL OR cover_image_url ~ '^https://'),
  cover_image_small_url TEXT NULL CHECK (cover_image_small_url IS NULL OR cover_image_small_url ~ '^https://'),
  cover_image_alt TEXT NOT NULL DEFAULT '' CHECK (char_length(cover_image_alt) <= 300),

  -- Fin d'édition (affichée à la place de la page une fois les dates passées)
  ended_title TEXT NOT NULL DEFAULT '' CHECK (char_length(ended_title) <= 200),
  ended_text TEXT NOT NULL DEFAULT '' CHECK (char_length(ended_text) <= 1000),

  -- Teaser de la page d'accueil
  show_teaser BOOLEAN NOT NULL DEFAULT false,
  teaser_title TEXT NOT NULL DEFAULT '' CHECK (char_length(teaser_title) <= 120),
  teaser_text TEXT NOT NULL DEFAULT '' CHECK (char_length(teaser_text) <= 400),
  teaser_cta TEXT NOT NULL DEFAULT '' CHECK (char_length(teaser_cta) <= 60),

  -- Référencement (vide = valeurs déduites du titre / sous-titre)
  meta_title TEXT NOT NULL DEFAULT '' CHECK (char_length(meta_title) <= 120),
  meta_description TEXT NOT NULL DEFAULT '' CHECK (char_length(meta_description) <= 320),
  og_title TEXT NOT NULL DEFAULT '' CHECK (char_length(og_title) <= 120),
  og_description TEXT NOT NULL DEFAULT '' CHECK (char_length(og_description) <= 320),

  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  first_published_at TIMESTAMPTZ NULL,
  display_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Un événement visible doit avoir au moins une date.
  CONSTRAINT events_published_needs_date CHECK (status <> 'published' OR cardinality(event_dates) > 0)
);

CREATE INDEX IF NOT EXISTS events_status_order_idx ON public.events (status, display_order);

-- Droits : lecture pour tous, écriture pour `authenticated` (filtrée par la RLS ci-dessous).
-- Les droits par défaut de Supabase accordent aussi l'écriture à `anon` : on la retire explicitement.
REVOKE ALL ON public.events FROM anon;
REVOKE ALL ON public.events FROM authenticated;
GRANT SELECT ON public.events TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.events TO authenticated;
GRANT ALL ON public.events TO service_role;

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read published events" ON public.events;
DROP POLICY IF EXISTS "Admin manage events" ON public.events;
CREATE POLICY "Public read published events" ON public.events
  FOR SELECT TO anon, authenticated USING (status = 'published');
CREATE POLICY "Admin manage events" ON public.events
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Règles appliquées en base (pas seulement dans l'interface) : date de modification, slug figé
-- après la première publication, slug jamais égal à une page existante.
CREATE OR REPLACE FUNCTION public.enforce_event_rules()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
DECLARE
  reserved CONSTANT TEXT[] := ARRAY[
    'admin', 'portfolio', 'prestations', 'contact', 'reservation', 'espace-client',
    'a-propos', 'faq', 'confidentialite', 'mentions-legales', 'tarifs'
  ];
BEGIN
  NEW.updated_at := now();

  IF TG_OP = 'UPDATE' AND NEW.slug <> OLD.slug AND OLD.first_published_at IS NOT NULL THEN
    RAISE EXCEPTION 'Le slug est figé après la première publication de l''événement.';
  END IF;

  IF TG_OP = 'INSERT' OR NEW.slug <> OLD.slug THEN
    IF NEW.slug = ANY (reserved) THEN
      RAISE EXCEPTION 'Cette adresse est réservée : choisissez un autre slug.';
    END IF;
    IF EXISTS (SELECT 1 FROM public.seo_pages WHERE slug = NEW.slug) THEN
      RAISE EXCEPTION 'Cette adresse est déjà utilisée par une page du site.';
    END IF;
  END IF;

  IF NEW.status = 'published' AND NEW.first_published_at IS NULL THEN
    NEW.first_published_at := now();
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS events_enforce_rules ON public.events;
CREATE TRIGGER events_enforce_rules BEFORE INSERT OR UPDATE ON public.events
  FOR EACH ROW EXECUTE FUNCTION public.enforce_event_rules();

-- Double authentification : si la migration 20260926000002 est déjà appliquée, `events` suit la
-- même règle (écritures admin en session aal2 uniquement). Sinon rien n'est ajouté, pour ne pas
-- bloquer l'écriture ici alors qu'elle reste ouverte sur les autres tables. Si 20260926000002 est
-- appliquée APRÈS celle-ci, ré-exécuter ce bloc DO (il est ré-exécutable).
DO $aal2$
DECLARE
  aal2 CONSTANT TEXT := '(SELECT auth.jwt() ->> ''aal'') = ''aal2''';
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'site_settings'
      AND policyname = 'Require aal2 for admin inserts'
  ) THEN
    DROP POLICY IF EXISTS "Require aal2 for admin inserts" ON public.events;
    DROP POLICY IF EXISTS "Require aal2 for admin updates" ON public.events;
    DROP POLICY IF EXISTS "Require aal2 for admin deletes" ON public.events;
    EXECUTE format(
      'CREATE POLICY "Require aal2 for admin inserts" ON public.events AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK (%s)', aal2);
    EXECUTE format(
      'CREATE POLICY "Require aal2 for admin updates" ON public.events AS RESTRICTIVE FOR UPDATE TO authenticated USING (%s) WITH CHECK (%s)', aal2, aal2);
    EXECUTE format(
      'CREATE POLICY "Require aal2 for admin deletes" ON public.events AS RESTRICTIVE FOR DELETE TO authenticated USING (%s)', aal2);
  END IF;
END
$aal2$;

-- Données initiales : « Mini-séances de Noël 2026 », copie exacte du contenu actuellement codé en
-- dur (src/data/noel-2026.ts). Photos du hero, de la galerie et du décor : toujours fournies par
-- le site (pas de migration des photos ici).
INSERT INTO public.events (
  slug, title, subtitle, description, location, edition_label, experience_steps, closing_title,
  event_dates, fallback_dates, availability_note, formules, faq,
  ended_title, ended_text,
  show_teaser, teaser_title, teaser_text, teaser_cta,
  meta_title, meta_description, og_title, og_description,
  status, display_order
) VALUES (
  'mini-seances-noel-2026',
  'Mini-séances de Noël 2026',
  'Une parenthèse magique pour créer de précieux souvenirs en famille',
  E'Le temps d''une mini-séance, on quitte le quotidien pour une parenthèse de Noël en pleine nature, au milieu des sapins. Un décor de fête, une musique d''ambiance, quelques petites douceurs : tout est pensé pour rire, jouer, se retrouver, et repartir avec de vrais souvenirs de cette saison, sincères et lumineux.\n\nPour les couples, les futurs parents, les familles et les enfants.\n\nÀ moins d''une heure de Marseille et de Toulon, à Plan d''Aups Sainte-Baume : dépaysement garanti, le temps d''une escapade.',
  'Plan-d''Aups-Sainte-Baume',
  'Édition Noël 2026',
  ARRAY[
    '25 à 30 minutes de séance',
    'En extérieur, à Plan-d''Aups-Sainte-Baume',
    'Une ambiance de Noël avec décor, musique d''ambiance et petites douceurs',
    'Pour les couples, futurs parents, familles et enfants'
  ],
  'Envie de vivre votre propre parenthèse de Noël ?',
  ARRAY['2026-11-28', '2026-11-29']::date[],
  ARRAY['2026-12-05', '2026-12-06']::date[],
  'Deux journées seulement : les places sont limitées.',
  $json$[
    {
      "name": "Douceur de Noël",
      "price_eur": 110,
      "features": [
        "25 à 30 minutes de séance",
        "Galerie privée en ligne",
        "10 photos numériques HD à choisir sur votre galerie en ligne"
      ],
      "booking_url": "https://soleana-studio.pelli.io/booking/douceur-de-noel-mini-seance-photo-exterieure?month=2026-11&date=2026-11-29&step=time",
      "featured": false
    },
    {
      "name": "Magie de Noël",
      "price_eur": 250,
      "features": [
        "25 à 30 minutes de séance",
        "Galerie privée en ligne",
        "L'ensemble des images finalisées de la galerie en numérique HD (30 photos minimum)",
        "Un grand tirage fine art 20 × 30 cm d'une photo au choix parmi la galerie finale (valeur 35 €, papier français, impression en France)"
      ],
      "booking_url": "https://soleana-studio.pelli.io/booking/magie-de-noel-mini-seance-photo-exterieure",
      "featured": true
    }
  ]$json$::jsonb,
  $json$[
    {"question": "Combien de temps dure la séance ?", "answer": "Entre 25 et 30 minutes — juste ce qu'il faut pour installer une vraie complicité et repartir avec des images sincères."},
    {"question": "La séance a-t-elle lieu en intérieur ou en extérieur ?", "answer": "En extérieur, au cœur des sapins. La lumière, l'ambiance et les couleurs peuvent donc varier légèrement selon l'heure de votre créneau."},
    {"question": "Pourquoi si peu de créneaux ?", "answer": "Deux journées seulement : les places sont limitées. Pour privilégier le temps passé avec chaque famille et chaque couple, sans se presser, et laisser la place à la vraie connexion."},
    {"question": "Et s'il pleut ?", "answer": "En cas de météo trop capricieuse (pluie, vent fort), les créneaux sont reportés aux 5 et 6 décembre, à la même heure : le samedi 28 novembre devient le samedi 5 décembre, le dimanche 29 novembre devient le dimanche 6 décembre. Merci de vous assurer d'être disponible ce jour-là. En cas d'annulation de votre côté, l'acompte versé ne pourra pas être remboursé."},
    {"question": "Comment s'habiller ?", "answer": "Pour un résultat harmonieux, un petit guide des tenues vous sera envoyé, quelle que soit votre formule."},
    {"question": "Comment réserver ma date ?", "answer": "Un acompte de 30 % permet de bloquer votre créneau. Sans acompte versé, la date n'est pas garantie."}
  ]$json$::jsonb,
  'Mini-séances de Noël 2026 — l''édition est terminée',
  'L''édition 2026 des mini-séances de Noël est terminée. Merci à toutes les familles, couples et futurs parents qui l''ont vécue avec moi : à très vite pour la prochaine édition.',
  true,
  '',
  'Une parenthèse de Noël en pleine nature, au milieu des sapins — deux journées seulement, places limitées.',
  'Découvrir les mini-séances',
  'Mini-séances de Noël 2026 près de Marseille | Soleana Studio',
  'Mini-séances photo de Noël en extérieur les 28 et 29 novembre 2026, à Plan-d''Aups-Sainte-Baume. Deux formules, places limitées. Réservez votre créneau.',
  'Mini-séances de Noël 2026 — Soleana Studio',
  'Une parenthèse de Noël en famille, au cœur de la Sainte-Baume. 28 & 29 novembre 2026, places limitées.',
  'published',
  1
)
ON CONFLICT (slug) DO NOTHING;

-- Contrôles après application :
-- SELECT slug, status, event_dates, fallback_dates, jsonb_array_length(formules) AS formules,
--        jsonb_array_length(faq) AS faq, show_teaser FROM public.events;            -- 1 ligne, 2 / 6
-- SELECT policyname, cmd FROM pg_policies WHERE tablename = 'events';               -- 2 (ou 5 avec aal2)
-- SELECT grantee, privilege_type FROM information_schema.role_table_grants
--  WHERE table_name = 'events' AND grantee IN ('anon', 'authenticated');            -- anon : SELECT seul
