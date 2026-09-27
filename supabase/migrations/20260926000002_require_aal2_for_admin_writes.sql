-- Objet : exiger la double authentification (session de niveau aal2) pour TOUTES les écritures
-- de l'administration, en plus du rôle admin (has_role) déjà exigé par les politiques existantes.
-- Date : 26 septembre 2026.
--
-- ############################################################################################
-- # À APPLIQUER MANUELLEMENT, ET SEULEMENT APRÈS que TOUS les comptes admin ont :             #
-- #   1. enregistré un second facteur (TOTP) depuis « Mon compte » dans l'administration ;    #
-- #   2. réussi au moins une connexion complète avec le code à 6 chiffres.                    #
-- # Sinon, une session sans second facteur (aal1) ne pourra PLUS RIEN ÉCRIRE : photos,       #
-- # prestations, avis, FAQ, pages SEO, réglages, envoi d'images… (verrouillage).              #
-- # Cette migration n'a PAS été exécutée.                                                     #
-- ############################################################################################
--
-- Méthode : politiques RESTRICTIVES (elles se cumulent avec les politiques existantes par un ET
-- logique ; elles ne remplacent ni n'affaiblissent rien). Elles ne concernent que les écritures
-- (INSERT / UPDATE / DELETE) du rôle authenticated : la lecture publique et la lecture admin
-- restent inchangées. service_role (tableau de bord Supabase, éditeur SQL) n'est pas soumis à la RLS.
--
-- Tables couvertes : categories, photos, services, reviews, faq, seo_pages, site_settings,
-- contact_requests (mise à jour / suppression admin), et storage.objects pour le bucket 'photos'.
-- user_roles n'a aucune politique d'écriture : rien à ajouter.
--
-- Retour arrière (à exécuter si besoin de débloquer les écritures) : voir le bloc en bas de fichier.

DO $aal2$
DECLARE
  tbl TEXT;
  aal2 CONSTANT TEXT := '(SELECT auth.jwt() ->> ''aal'') = ''aal2''';
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'categories', 'photos', 'services', 'reviews', 'faq', 'seo_pages', 'site_settings'
  ] LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Require aal2 for admin inserts" ON public.%I', tbl);
    EXECUTE format('DROP POLICY IF EXISTS "Require aal2 for admin updates" ON public.%I', tbl);
    EXECUTE format('DROP POLICY IF EXISTS "Require aal2 for admin deletes" ON public.%I', tbl);
    EXECUTE format(
      'CREATE POLICY "Require aal2 for admin inserts" ON public.%I AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK (%s)',
      tbl, aal2);
    EXECUTE format(
      'CREATE POLICY "Require aal2 for admin updates" ON public.%I AS RESTRICTIVE FOR UPDATE TO authenticated USING (%s) WITH CHECK (%s)',
      tbl, aal2, aal2);
    EXECUTE format(
      'CREATE POLICY "Require aal2 for admin deletes" ON public.%I AS RESTRICTIVE FOR DELETE TO authenticated USING (%s)',
      tbl, aal2);
  END LOOP;
END
$aal2$;

-- contact_requests : plus d'insertion possible (migration 20260926000000) ; mise à jour et suppression admin.
DROP POLICY IF EXISTS "Require aal2 for admin updates" ON public.contact_requests;
DROP POLICY IF EXISTS "Require aal2 for admin deletes" ON public.contact_requests;
CREATE POLICY "Require aal2 for admin updates" ON public.contact_requests
  AS RESTRICTIVE FOR UPDATE TO authenticated
  USING ((SELECT auth.jwt() ->> 'aal') = 'aal2')
  WITH CHECK ((SELECT auth.jwt() ->> 'aal') = 'aal2');
CREATE POLICY "Require aal2 for admin deletes" ON public.contact_requests
  AS RESTRICTIVE FOR DELETE TO authenticated
  USING ((SELECT auth.jwt() ->> 'aal') = 'aal2');

-- Stockage : envoi, modification et suppression d'images du bucket 'photos'.
DROP POLICY IF EXISTS "Require aal2 for photos uploads" ON storage.objects;
DROP POLICY IF EXISTS "Require aal2 for photos updates" ON storage.objects;
DROP POLICY IF EXISTS "Require aal2 for photos deletes" ON storage.objects;
CREATE POLICY "Require aal2 for photos uploads" ON storage.objects
  AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (bucket_id <> 'photos' OR (SELECT auth.jwt() ->> 'aal') = 'aal2');
CREATE POLICY "Require aal2 for photos updates" ON storage.objects
  AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (bucket_id <> 'photos' OR (SELECT auth.jwt() ->> 'aal') = 'aal2')
  WITH CHECK (bucket_id <> 'photos' OR (SELECT auth.jwt() ->> 'aal') = 'aal2');
CREATE POLICY "Require aal2 for photos deletes" ON storage.objects
  AS RESTRICTIVE FOR DELETE TO authenticated
  USING (bucket_id <> 'photos' OR (SELECT auth.jwt() ->> 'aal') = 'aal2');

-- Contrôle : 3 politiques par table du DO (21), 2 sur contact_requests, 3 sur storage.objects = 26.
-- SELECT count(*) FROM pg_policies
--  WHERE policyname LIKE 'Require aal2 for %';

-- ---------------------------------------------------------------------------------------------
-- RETOUR ARRIÈRE (à exécuter seulement pour débloquer les écritures ; garde le reste intact) :
-- DO $undo$
-- DECLARE tbl TEXT;
-- BEGIN
--   FOREACH tbl IN ARRAY ARRAY[
--     'categories', 'photos', 'services', 'reviews', 'faq', 'seo_pages', 'site_settings'
--   ] LOOP
--     EXECUTE format('DROP POLICY IF EXISTS "Require aal2 for admin inserts" ON public.%I', tbl);
--     EXECUTE format('DROP POLICY IF EXISTS "Require aal2 for admin updates" ON public.%I', tbl);
--     EXECUTE format('DROP POLICY IF EXISTS "Require aal2 for admin deletes" ON public.%I', tbl);
--   END LOOP;
--   DROP POLICY IF EXISTS "Require aal2 for admin updates" ON public.contact_requests;
--   DROP POLICY IF EXISTS "Require aal2 for admin deletes" ON public.contact_requests;
--   DROP POLICY IF EXISTS "Require aal2 for photos uploads" ON storage.objects;
--   DROP POLICY IF EXISTS "Require aal2 for photos updates" ON storage.objects;
--   DROP POLICY IF EXISTS "Require aal2 for photos deletes" ON storage.objects;
-- END
-- $undo$;
-- ---------------------------------------------------------------------------------------------
