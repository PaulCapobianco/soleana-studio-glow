-- Contrôles de sécurité en LECTURE SEULE (SQL Editor Supabase, projet kvzzzwjddanwedzotaka).
-- Aucun de ces blocs n'écrit quoi que ce soit. Exécuter chaque bloc séparément ; les résultats
-- attendus sont indiqués. Ils couvrent ce que la clé anonyme ne permet pas de vérifier (pg_policies,
-- droits, fonctions, réglages du bucket). Voir docs/AUDIT-SECURITE-2026-11.md.

-- 1. Toutes les tables du schéma public ont la RLS active. Attendu : 0 ligne.
SELECT c.relname AS table_sans_rls
FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relkind = 'r' AND NOT c.relrowsecurity;

-- 2. Politiques d'écriture : chaque table écrite par l'admin doit avoir une politique RESTRICTIVE aal2.
--    Attendu : 3 politiques « Require aal2 » (INSERT/UPDATE/DELETE) pour chacune des tables
--    categories, photos, services, reviews, faq, seo_pages, site_settings, photo_variants,
--    photo_placements, events ; 2 (UPDATE/DELETE) pour contact_requests ; photo_storage_cleanup_jobs
--    et user_roles n'ont aucune politique d'écriture.
SELECT tablename, count(*) FILTER (WHERE policyname LIKE 'Require aal2%') AS politiques_aal2
FROM pg_policies WHERE schemaname = 'public'
GROUP BY tablename ORDER BY tablename;

-- 3. Aucune politique d'écriture ouverte à anon / public sur les tables du site. Attendu : 0 ligne.
SELECT schemaname, tablename, policyname, cmd, roles
FROM pg_policies
WHERE schemaname IN ('public', 'storage')
  AND cmd IN ('INSERT', 'UPDATE', 'DELETE', 'ALL')
  AND (roles::text ~ 'anon' OR roles::text ~ 'public')
  AND policyname NOT LIKE 'Restrict photos object %';   -- politiques RESTRICTIVES de 20260926000005

-- 4. Droits de table accordés à anon au-delà de SELECT (les droits par défaut de Supabase sont larges :
--    seule la RLS protège). Attendu : lister et vérifier que chaque ligne est couverte par une RLS.
SELECT table_name, string_agg(privilege_type, ', ' ORDER BY privilege_type) AS droits_anon
FROM information_schema.role_table_grants
WHERE table_schema = 'public' AND grantee = 'anon' AND privilege_type <> 'SELECT'
GROUP BY table_name ORDER BY table_name;

-- 5. Fonctions SECURITY DEFINER et qui peut les exécuter.
--    Attendu : admin_* non exécutables par anon/PUBLIC ; has_role exécutable par PUBLIC (voir constat M-4).
SELECT p.proname,
       p.prosecdef AS security_definer,
       p.proconfig AS config,
       has_function_privilege('anon', p.oid, 'EXECUTE') AS anon_peut_executer,
       has_function_privilege('authenticated', p.oid, 'EXECUTE') AS authenticated_peut_executer
FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public' AND p.prosecdef
ORDER BY p.proname;

-- 6. Politiques du stockage (bucket photos). Attendu : pas de lecture publique par liste
--    (« Public read photos bucket » supprimée), envoi réservé aux admins aal2, nom de fichier contraint.
SELECT policyname, cmd, permissive, roles FROM pg_policies
WHERE schemaname = 'storage' AND tablename = 'objects' ORDER BY policyname;

-- 7. Réglages du bucket : taille maximale et types MIME autorisés (voir constat M-3).
--    Aujourd'hui attendu : file_size_limit et allowed_mime_types à NULL (non limités).
SELECT id, public, file_size_limit, allowed_mime_types FROM storage.buckets WHERE id = 'photos';

-- 8. Comptes : qui est admin, et chaque admin a-t-il un second facteur vérifié ? Attendu : 1 ligne par
--    admin avec au moins un facteur « verified ». Ne retourne aucun secret.
SELECT u.email, r.role,
       (SELECT count(*) FROM auth.mfa_factors f WHERE f.user_id = u.id AND f.status = 'verified') AS facteurs_verifies
FROM public.user_roles r JOIN auth.users u ON u.id = r.user_id;

-- 9. Comptes qui ne sont pas admin (inscriptions ouvertes, voir constat E-1). Attendu : 0 ou connus.
SELECT count(*) AS comptes_sans_role
FROM auth.users u WHERE NOT EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = u.id);
