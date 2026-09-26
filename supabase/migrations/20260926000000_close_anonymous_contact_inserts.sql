-- Objet : fermer l'insertion anonyme dans public.contact_requests.
-- Date : 26 septembre 2026.
-- À APPLIQUER MANUELLEMENT : cette migration est créée dans le dépôt mais n'a PAS été exécutée.
--
-- Contexte : le formulaire de contact local est supprimé du code (Pelli est le seul canal) ;
-- contact_requests est vide en production (0 ligne, vérifié le 26/09/2026). Plus rien ne doit
-- écrire dans cette table, alors que la politique INSERT actuelle laisse n'importe qui le faire
-- via l'API Supabase, sans anti-spam.
--
-- Inchangé : la table, ses données, RLS activée, les politiques admin de lecture, de
-- modification et de suppression, et les droits SELECT/UPDATE/DELETE de authenticated
-- (donc l'écran admin « Demandes » continue de fonctionner). service_role garde tous ses droits.

DROP POLICY IF EXISTS "Anyone can submit a contact request" ON public.contact_requests;

REVOKE INSERT ON public.contact_requests FROM anon, authenticated;

-- Purge à 3 ans : NON exécutée, à lancer à la main ou par tâche planifiée si des demandes
-- reviennent un jour dans cette table.
-- DELETE FROM public.contact_requests WHERE created_at < now() - interval '3 years';
