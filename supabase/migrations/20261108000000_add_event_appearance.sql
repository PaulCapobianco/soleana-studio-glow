-- Objet : apparence d'un événement (thème de couleurs, couleur d'accent personnalisée, icônes).
-- Date : 8 novembre 2026. Complète 20261106000000_create_events.sql (déjà appliquée, non modifiée).
--
-- ############################################################################################
-- # À APPLIQUER MANUELLEMENT (éditeur SQL Supabase). Cette migration n'a PAS été exécutée.   #
-- # À appliquer AVANT d'enregistrer un événement depuis l'admin mis à jour : l'écran envoie  #
-- # ces quatre colonnes à chaque enregistrement.                                             #
-- ############################################################################################
--
-- Valeurs par défaut = apparence actuelle de « Mini-séances de Noël 2026 » : la ligne existante
-- reçoit ces valeurs et ne change PAS d'aspect (bordeaux #5E1112, or doux, étoile de Noël,
-- puces d'origine).
--
-- Les listes d'identifiants des CHECK sont celles de src/lib/events/theme.ts et icons.ts ; le test
-- src/lib/events/theme.test.ts vérifie qu'elles restent identiques. Ajouter un thème ou une icône
-- = modifier le code ET une nouvelle migration qui remplace la contrainte.
--
-- RLS : les politiques de `events` portent sur les lignes (pas sur des colonnes) et les droits sont
-- accordés à la table entière : les nouvelles colonnes sont donc couvertes sans changement
-- (lecture publique des seuls événements publiés, écriture admin, aal2 si activée).
-- Opération sur table existante : ALTER TABLE ... ADD COLUMN avec valeur par défaut constante
-- (aucune réécriture des lignes, aucun verrou long, aucune donnée supprimée).

ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS theme TEXT NOT NULL DEFAULT 'noel-classique'
    CONSTRAINT events_theme_known CHECK (theme IN ('noel-classique', 'sapin', 'noel-dore', 'hiver', 'printemps', 'ete', 'automne', 'elegant')),
  ADD COLUMN IF NOT EXISTS accent_color TEXT NULL
    CONSTRAINT events_accent_color_hex CHECK (accent_color IS NULL OR accent_color ~ '^#[0-9a-fA-F]{6}$'),
  ADD COLUMN IF NOT EXISTS icon_main TEXT NOT NULL DEFAULT 'etoile-noel'
    CONSTRAINT events_icon_main_known CHECK (icon_main IN (
    'etoile-noel', 'star', 'sparkles', 'snowflake', 'tree-pine', 'gift', 'heart', 'hand-heart',
    'camera', 'calendar', 'calendar-days', 'map-pin', 'clock', 'sun', 'moon', 'cloud-sun',
    'umbrella', 'flower-2', 'leaf', 'sprout', 'trees', 'mountain', 'baby', 'users', 'smile',
    'music', 'bell', 'candy-cane', 'cake', 'party-popper', 'wine', 'coffee', 'flame', 'gem',
    'crown', 'ribbon', 'bird', 'check'
    )),
  ADD COLUMN IF NOT EXISTS icon_bullet TEXT NOT NULL DEFAULT 'defaut'
    CONSTRAINT events_icon_bullet_known CHECK (icon_bullet IN (
    'defaut', 'etoile-noel', 'star', 'sparkles', 'snowflake', 'tree-pine', 'gift', 'heart',
    'hand-heart', 'camera', 'calendar', 'calendar-days', 'map-pin', 'clock', 'sun', 'moon',
    'cloud-sun', 'umbrella', 'flower-2', 'leaf', 'sprout', 'trees', 'mountain', 'baby',
    'users', 'smile', 'music', 'bell', 'candy-cane', 'cake', 'party-popper', 'wine', 'coffee',
    'flame', 'gem', 'crown', 'ribbon', 'bird', 'check'
    ));

-- Contrôles après application :
-- SELECT slug, theme, accent_color, icon_main, icon_bullet FROM public.events;
--   -- attendu : mini-seances-noel-2026 | noel-classique | NULL | etoile-noel | defaut (idem pour tout autre événement)
-- SELECT conname FROM pg_constraint WHERE conrelid = 'public.events'::regclass AND conname LIKE 'events_%_known';
--   -- attendu : 3 lignes (theme, icon_main, icon_bullet)
-- SELECT policyname, cmd FROM pg_policies WHERE tablename = 'events';
--   -- attendu : inchangé (2 politiques, ou 5 avec aal2)
