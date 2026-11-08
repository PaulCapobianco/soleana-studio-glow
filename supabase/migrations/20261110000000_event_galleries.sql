-- Objet : galeries photos d'un événement. Ajoute à `events` la liste de ses galeries (titre + identifiant
-- de galerie, dans l'ordre d'affichage) et une référence facultative vers un autre événement dont les
-- galeries sont affichées sous « Édition précédente ».
-- Date : 10 novembre 2026. Complète 20261106000000 (appliquée) ; ne dépend d'aucune table de photos.
--
-- ############################################################################################
-- # À APPLIQUER MANUELLEMENT (éditeur SQL Supabase). Cette migration n'a PAS été exécutée.   #
-- # À appliquer AVANT d'enregistrer un événement depuis l'admin mis à jour (l'écran envoie    #
-- # ces colonnes). Les PHOTOS des galeries, elles, exigent 20260926000003 (contexte `event`). #
-- ############################################################################################
--
-- `galleries` : [{ "slot": "galerie-1", "title": "Famille" }, …] ; le `slot` est la clé des
-- emplacements photo_placements (context_type = 'event') ; validé par l'application (zod).
-- `gallery_reference_event_id` : la fiche affiche aussi les galeries publiées de cet événement ;
-- si celui-ci est supprimé la référence disparaît (SET NULL) ; il ne peut pas pointer sur lui-même.
-- Affichage public : uniquement si l'événement référencé est publié (RLS de photo_placements).
--
-- RLS : politiques par ligne et droits au niveau de la table : les colonnes ajoutées sont couvertes
-- sans changement (lecture publique des événements publiés, écriture admin, aal2 si activée).
-- ADD COLUMN à défaut constant : aucune réécriture ; aucune donnée supprimée ; Noël reste inchangé.

ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS galleries JSONB NOT NULL DEFAULT '[]'::jsonb
    CONSTRAINT events_galleries_is_array CHECK (jsonb_typeof(galleries) = 'array'),
  ADD COLUMN IF NOT EXISTS gallery_reference_event_id UUID NULL
    REFERENCES public.events(id) ON DELETE SET NULL;

ALTER TABLE public.events
  ADD CONSTRAINT events_gallery_reference_not_self
    CHECK (gallery_reference_event_id IS NULL OR gallery_reference_event_id <> id);

-- Contrôles après application :
-- SELECT slug, galleries, gallery_reference_event_id FROM public.events;
--   -- attendu : galleries = [] et référence NULL pour chaque événement existant
-- SELECT conname FROM pg_constraint WHERE conrelid = 'public.events'::regclass
--   AND conname IN ('events_galleries_is_array', 'events_gallery_reference_not_self');
--   -- attendu : 2 lignes
-- SELECT policyname, cmd FROM pg_policies WHERE tablename = 'events';
--   -- attendu : inchangé (2 politiques, ou 5 avec aal2)
