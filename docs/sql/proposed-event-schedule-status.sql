-- PROPOSITION, NON APPLIQUÉE. Statut d'édition « reporté » / « annulé » pour les événements.
-- À relire et exécuter par Paul (SQL Editor). Le code actuel n'y fait pas référence : rien à masquer,
-- rien ne casse tant qu'elle n'est pas appliquée. Une fois appliquée, il faudra ajouter (en code) un
-- sélecteur « Statut de l'édition » dans la fiche événement et utiliser la valeur dans le JSON-LD
-- (`eventStatus` : EventScheduled / EventPostponed / EventRescheduled / EventCancelled).
--
-- RLS : la table `events` a déjà RLS, politiques de lecture publique (publié seulement) et d'écriture
-- admin aal2 ; une colonne de plus ne change aucune politique (rien à adapter).

ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS schedule_status TEXT NOT NULL DEFAULT 'scheduled';

ALTER TABLE public.events
  ADD CONSTRAINT events_schedule_status_check
  CHECK (schedule_status IN ('scheduled', 'postponed', 'rescheduled', 'cancelled'));

-- Contrôles :
-- SELECT slug, status, schedule_status FROM public.events;            -- attendu : 'scheduled' partout
-- SELECT conname FROM pg_constraint WHERE conname = 'events_schedule_status_check';

-- Retour arrière :
-- ALTER TABLE public.events DROP CONSTRAINT IF EXISTS events_schedule_status_check;
-- ALTER TABLE public.events DROP COLUMN IF EXISTS schedule_status;
