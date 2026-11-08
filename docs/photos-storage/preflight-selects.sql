-- Vérifications en LECTURE SEULE à exécuter soi-même dans le SQL Editor du projet de production,
-- avant d'appliquer 20260926000003_add_photo_variants_and_placements.sql. Rien ici n'écrit.
-- Copier chaque bloc séparément et noter les résultats.

-- 1) Le bucket « photos » : existence, public, limites.
SELECT id, name, public, file_size_limit, allowed_mime_types, created_at
FROM storage.buckets
ORDER BY id;

-- 2) Les politiques du stockage (lecture publique, écritures admin, éventuelles politiques aal2).
SELECT policyname, cmd, permissive, roles, qual, with_check
FROM pg_policies
WHERE schemaname = 'storage' AND tablename = 'objects'
ORDER BY policyname;

-- 3) Ce que contient déjà le bucket : nombre d'objets, poids, premiers chemins.
SELECT bucket_id, count(*) AS objets,
       pg_size_pretty(sum((metadata->>'size')::bigint)) AS poids_total
FROM storage.objects
GROUP BY bucket_id;

SELECT name, (metadata->>'size')::bigint AS octets, created_at
FROM storage.objects
WHERE bucket_id = 'photos'
ORDER BY created_at
LIMIT 20;

-- 4) Colonnes de public.photos et de public.categories (source_key ne doit pas exister).
SELECT table_name, ordinal_position, column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name IN ('photos', 'categories', 'seo_pages')
ORDER BY table_name, ordinal_position;

-- 5) Les nouvelles tables ne doivent pas exister encore (les deux lignes doivent être vides).
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public' AND table_name IN ('photo_variants', 'photo_placements');

-- 6) Nombre de lignes : photos (total, publiées, par catégorie), catégories, pages SEO.
SELECT count(*) AS photos_total, count(*) FILTER (WHERE published) AS photos_publiees FROM public.photos;

SELECT c.slug, c.name, count(p.id) AS photos, count(p.id) FILTER (WHERE p.published) AS publiees
FROM public.categories c LEFT JOIN public.photos p ON p.category_id = c.id
GROUP BY c.slug, c.name, c.display_order
ORDER BY c.display_order;

SELECT count(*) FILTER (WHERE category_id IS NULL) AS photos_sans_categorie FROM public.photos;

SELECT slug, published FROM public.seo_pages ORDER BY slug;

-- 7) RLS et politiques des tables concernées (photos, categories, seo_pages).
SELECT c.relname, c.relrowsecurity AS rls_active
FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relname IN ('photos', 'categories', 'seo_pages');

SELECT tablename, policyname, cmd, permissive, roles
FROM pg_policies
WHERE schemaname = 'public' AND tablename IN ('photos', 'categories', 'seo_pages')
ORDER BY tablename, policyname;

-- 8) La fonction de rôle utilisée par toutes les politiques.
SELECT proname, prosecdef AS security_definer, proconfig
FROM pg_proc WHERE proname = 'has_role' AND pronamespace = 'public'::regnamespace;

-- 9) Quota de stockage : taille de la base et des objets (comparer au plan Supabase).
SELECT pg_size_pretty(pg_database_size(current_database())) AS taille_base;
