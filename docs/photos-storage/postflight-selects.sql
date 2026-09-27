-- Contrôles de production en LECTURE SEULE après 000003 et 000004, puis après chaque import.
-- Exécuter chaque bloc séparément dans le SQL Editor ; aucun bloc ne modifie des données.

-- 1. Les deux tables ont la RLS et les politiques attendues (4 sans aal2, 10 avec aal2).
SELECT c.relname AS table_name, c.relrowsecurity AS rls_active
FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relname IN ('photo_variants', 'photo_placements')
ORDER BY c.relname;

SELECT tablename, policyname, cmd, permissive, roles
FROM pg_policies
WHERE schemaname = 'public' AND tablename IN ('photo_variants', 'photo_placements')
ORDER BY tablename, policyname;

-- 2. AVIF et WebP sont autorisés à une même largeur ; aucune ligne incomplète.
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'photo_variants' AND column_name = 'format';

SELECT count(*) AS photos_importees
FROM public.photos WHERE source_key IS NOT NULL;

SELECT format, count(*) AS variantes, count(DISTINCT photo_id) AS photos
FROM public.photo_variants GROUP BY format ORDER BY format;

SELECT photo_id, width, count(*) AS formats,
       count(*) FILTER (WHERE format = 'avif') AS avif,
       count(*) FILTER (WHERE format = 'webp') AS webp
FROM public.photo_variants
GROUP BY photo_id, width
HAVING count(*) <> 2 OR count(*) FILTER (WHERE format = 'avif') <> 1
   OR count(*) FILTER (WHERE format = 'webp') <> 1;
-- Dernière requête : zéro ligne attendue.

-- 2a. Cible du lot : 170 photos sources, 680 variantes par format, 340 par largeur.
-- Adapter les égalités uniquement si une source ne permet pas une taille cible sans agrandissement.
SELECT format, count(*) AS variantes
FROM public.photo_variants v
JOIN public.photos p ON p.id = v.photo_id
WHERE p.source_key IS NOT NULL
GROUP BY format ORDER BY format;

SELECT width, count(*) AS variantes
FROM public.photo_variants v
JOIN public.photos p ON p.id = v.photo_id
WHERE p.source_key IS NOT NULL
GROUP BY width ORDER BY width;

-- Avant publication, toutes les photos importées doivent rester brouillons sans catégorie legacy.
SELECT id, source_key, published, category_id, on_home, on_portfolio
FROM public.photos
WHERE source_key IS NOT NULL AND (published IS DISTINCT FROM FALSE OR category_id IS NOT NULL
   OR on_home IS DISTINCT FROM FALSE OR on_portfolio IS DISTINCT FROM FALSE);
-- Zéro ligne attendue avant l'étape de publication séparée, et les flags accueil/portfolio restent faux ensuite.

-- 3. Emplacements et publication. Après le test : 4 emplacements non publiés.
-- Après l'import complet : 190 ; après activation : 190 publiés (hors éditions ultérieures).
SELECT count(*) AS emplacements,
       count(*) FILTER (WHERE published) AS publies,
       count(DISTINCT photo_id) AS photos_placees
FROM public.photo_placements WHERE context_type = 'seo';

SELECT s.slug, p.slot, count(*) AS photos,
       count(*) FILTER (WHERE p.published) AS publiees
FROM public.photo_placements p JOIN public.seo_pages s ON s.id = p.seo_page_id
WHERE p.context_type = 'seo'
GROUP BY s.slug, p.slot ORDER BY s.slug, p.slot;

-- 4. Objets réellement présents dans le bucket et leur taille.
SELECT count(*) AS objets_importes,
       pg_size_pretty(sum((metadata->>'size')::bigint)) AS poids
FROM storage.objects
WHERE bucket_id = 'photos' AND name LIKE 'galleries/%';

SELECT name, metadata->>'mimetype' AS mime, (metadata->>'size')::bigint AS octets
FROM storage.objects
WHERE bucket_id = 'photos' AND name LIKE 'galleries/%'
ORDER BY name LIMIT 12;
