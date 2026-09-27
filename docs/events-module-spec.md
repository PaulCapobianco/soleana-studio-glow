# Module « Événements » — cahier des charges (Phase 1 : proposition, non construit)

Statut : **spécification uniquement**. Aucun code n'a été écrit, aucune migration créée, aucune
écriture en base pour ce module. Ce document se base sur la page Noël 2026 actuelle et sur la
fondation `photos-storage` (branche non fusionnée, migration non appliquée).

Ne pas commencer la construction avant la fin du chantier vitesse mobile et du reste des pages SEO.
La branche `evenements` n'est pas créée.

## Objectif

La photographe crée et modifie seule ses pages événement (mini-séances de Noël, séances à
domicile, etc.) depuis l'admin, sur le modèle de la page Noël 2026 actuelle : une seule mise en
page, générique, pilotée par les données.

## Décisions actées (à relire avant toute implémentation)

1. **Couleurs** : deux couleurs configurables par événement — une couleur **principale** (le rôle
   du bordeaux sur la page Noël actuelle) et une couleur **d'accent** (le rôle du doré). Avant, seul
   le bordeaux était propre à l'événement ; le doré réutilisait l'accent global du site. Les deux
   sont désormais indépendantes par événement.
2. **Slug** : modifiable tant que l'événement n'a **jamais** été publié ; figé dès la première
   publication.
3. **Adresse publique** : à la racine du site (option A), comme Noël aujourd'hui
   (`/mini-seances-noel-2026`), pas sous un préfixe `/evenements/`. Toute collision avec un slug de
   `seo_pages` ou une route statique existante doit être bloquée par une liste de réserve.
4. **Contrôle de lisibilité (WCAG AA)** : **bloquant**, avec proposition automatique de la nuance
   conforme la plus proche (même teinte, luminosité ajustée).
5. **Photos** : redimensionnement (400/800/1600) et conversion AVIF + WebP **dans le navigateur**, avant
   l'envoi. Pas de génération de variantes côté serveur. Les métadonnées (EXIF) sont supprimées par
   le réencodage — **à vérifier techniquement** (l'orientation EXIF doit être appliquée avant
   suppression, sous peine de photos pivotées).
6. **Teaser** : un seul actif à la fois. L'admin empêche d'en activer un second sur une période qui
   chevauche celle déjà active.
7. **Fin d'édition** : le mode « Édition terminée » reste affiché indéfiniment (comme aujourd'hui) ;
   la dépublication complète reste une action manuelle séparée.
8. **Référence de migration Noël 2026** : ce qui sera effectivement en ligne à la fin de l'édition
   (74 photos par séance à ce jour). La note mémoire indiquant « 11 photos verrouillées » est
   obsolète et ne doit pas être utilisée comme référence.
9. **Import Noël 2026** : script one-shot écrit par Claude, exécuté par Paul (jamais par Claude, et
   jamais contre la production sans vérification préalable en lecture seule).
10. **`20260926000003` reste inchangée** : la table `events` n'existe pas encore. Le module
    Événements ajoutera ses colonnes et politiques à `photo_placements` dans sa propre migration.
11. **Pas de génération de variantes côté serveur** : confirmé, cohérent avec la décision 5.

---

## 1. Schéma de données complet (SQL proposé, non créé)

### 1.1 `events` et ses tables filles

```sql
CREATE TABLE public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),

  -- Textes
  title TEXT NOT NULL,
  subtitle TEXT NOT NULL DEFAULT '',
  intro TEXT NOT NULL DEFAULT '',
  practical_info TEXT NOT NULL DEFAULT '',
  gallery_caption TEXT NOT NULL DEFAULT '',
  hero_cta_label TEXT NOT NULL DEFAULT 'Réserver une séance',
  closing_title TEXT NOT NULL DEFAULT '',
  closing_text TEXT NOT NULL DEFAULT '',
  ended_title TEXT NOT NULL DEFAULT 'Édition terminée',
  ended_text TEXT NOT NULL DEFAULT '',
  ended_button_label TEXT NOT NULL DEFAULT 'Voir les prestations',

  -- Lieu et calendrier
  location TEXT NOT NULL DEFAULT '',
  ends_at TIMESTAMPTZ NOT NULL,  -- bascule automatique en mode "terminée"

  -- Teaser accueil (indépendant des dates de l'événement)
  teaser_enabled BOOLEAN NOT NULL DEFAULT false,
  teaser_title TEXT NOT NULL DEFAULT '',
  teaser_text TEXT NOT NULL DEFAULT '',
  teaser_cta_label TEXT NOT NULL DEFAULT '',
  teaser_starts_at TIMESTAMPTZ NULL,
  teaser_ends_at TIMESTAMPTZ NULL,

  -- SEO
  meta_title TEXT NOT NULL DEFAULT '',
  meta_description TEXT NOT NULL DEFAULT '',
  og_title TEXT NULL,
  og_description TEXT NULL,

  -- Couleurs (mise en page, polices et espacements restent figés)
  primary_color TEXT NOT NULL DEFAULT '#5E1112' CHECK (primary_color ~ '^#[0-9a-fA-F]{6}$'),
  accent_color TEXT NOT NULL DEFAULT '#C6966F' CHECK (accent_color ~ '^#[0-9a-fA-F]{6}$'),

  published BOOLEAN NOT NULL DEFAULT false,
  first_published_at TIMESTAMPTZ NULL,  -- posé une fois, à la première publication ; gèle le slug
  display_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.event_dates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  label TEXT NOT NULL,
  is_rescheduled BOOLEAN NOT NULL DEFAULT false,
  display_order INT NOT NULL DEFAULT 0,
  UNIQUE (event_id, date)
);

CREATE TABLE public.event_formules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  price_eur INT NOT NULL CHECK (price_eur >= 0),
  features TEXT[] NOT NULL DEFAULT '{}',
  pelli_url TEXT NOT NULL,
  featured BOOLEAN NOT NULL DEFAULT false,
  published BOOLEAN NOT NULL DEFAULT true,
  display_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.event_faq (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  published BOOLEAN NOT NULL DEFAULT true,
  display_order INT NOT NULL DEFAULT 0
);

CREATE TABLE public.event_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  display_order INT NOT NULL DEFAULT 0,
  published BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

RLS : même patron que `supabase/migrations/20260530053910_...sql` pour les 5 tables (lecture
publique si la ligne **et** l'événement parent sont publiés ; écriture réservée à `has_role(...,
'admin')`), plus le bloc de politiques restrictives aal2 (`FOREACH tbl IN ARRAY ARRAY['events',
'event_dates', 'event_formules', 'event_faq', 'event_sessions']`), sur le modèle exact de
`20260926000002`/`20260926000003`.

### 1.2 Slug : modifiable avant la première publication, figé ensuite, sans collision

Appliqué par un trigger (pas seulement côté admin, pour ne pas dépendre uniquement de l'interface) :

```sql
CREATE OR REPLACE FUNCTION public.enforce_event_slug_rules()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  reserved CONSTANT TEXT[] := ARRAY[
    'admin', 'portfolio', 'prestations', 'contact', 'reservation', 'espace-client',
    'a-propos', 'faq', 'confidentialite', 'mentions-legales', 'tarifs',
    'mini-seances-noel-2026', 'sitemap.xml', 'robots.txt'
  ];
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.slug <> OLD.slug AND OLD.first_published_at IS NOT NULL THEN
    RAISE EXCEPTION 'Le slug est figé après la première publication de l''événement.';
  END IF;

  IF NEW.slug = ANY (reserved) THEN
    RAISE EXCEPTION 'Cette adresse est réservée : choisissez un autre slug.';
  END IF;

  IF EXISTS (SELECT 1 FROM public.seo_pages WHERE slug = NEW.slug) THEN
    RAISE EXCEPTION 'Cette adresse est déjà utilisée par une page SEO.';
  END IF;

  -- Première publication : geler first_published_at.
  IF NEW.published AND NEW.first_published_at IS NULL THEN
    NEW.first_published_at := now();
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER events_slug_rules BEFORE INSERT OR UPDATE ON public.events
  FOR EACH ROW EXECUTE FUNCTION public.enforce_event_slug_rules();
```

`events.slug UNIQUE` couvre déjà les collisions entre événements. La liste `reserved` doit être
tenue à jour manuellement si une nouvelle route statique est ajoutée au site — à documenter dans
`src/routes/README.md` le jour de l'implémentation.

### 1.3 Un seul teaser actif à la fois

```sql
CREATE OR REPLACE FUNCTION public.enforce_single_active_teaser()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.teaser_enabled AND EXISTS (
    SELECT 1 FROM public.events e
    WHERE e.id <> NEW.id
      AND e.teaser_enabled
      AND tstzrange(e.teaser_starts_at, e.teaser_ends_at, '[]') && tstzrange(NEW.teaser_starts_at, NEW.teaser_ends_at, '[]')
  ) THEN
    RAISE EXCEPTION 'Un autre événement a déjà un teaser actif sur cette période.';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER events_single_active_teaser BEFORE INSERT OR UPDATE ON public.events
  FOR EACH ROW EXECUTE FUNCTION public.enforce_single_active_teaser();
```

`tstzrange` avec des bornes `NULL` est considéré non borné (toujours en chevauchement) : si l'une
des deux dates de teaser est vide, l'admin doit l'imposer comme obligatoire dès que `teaser_enabled
= true`, sans quoi un teaser « toujours actif » bloquerait tout autre teaser indéfiniment.

### 1.4 Extension de `photo_placements` (dans la migration du module Événements)

Appliquer d'abord `20260926000003` et `20260926000004` telles quelles. Le SQL suivant est une
ébauche pour la future migration du module, à exécuter seulement après la création de `events` et
`event_sessions`. La migration finale devra identifier le nom réel de la contrainte XOR existante,
adapter la politique de lecture publique et vérifier la RLS après l'ajout des colonnes.

```sql
ALTER TABLE public.photo_placements
  ADD COLUMN event_id UUID NULL REFERENCES public.events(id) ON DELETE RESTRICT,
  ADD COLUMN event_session_id UUID NULL REFERENCES public.event_sessions(id) ON DELETE RESTRICT;

ALTER TABLE public.photo_placements DROP CONSTRAINT photo_placements_context_type_check;
ALTER TABLE public.photo_placements ADD CONSTRAINT photo_placements_context_type_check
  CHECK (context_type IN ('page', 'seo', 'category', 'event'));

ALTER TABLE public.photo_placements DROP CONSTRAINT <nom_du_check_xor_existant>;
ALTER TABLE public.photo_placements ADD CONSTRAINT photo_placements_context_xor_check CHECK (
  (context_type = 'page' AND page_key IS NOT NULL AND seo_page_id IS NULL AND event_id IS NULL AND event_session_id IS NULL)
  OR (context_type = 'seo' AND page_key IS NULL AND seo_page_id IS NOT NULL AND event_id IS NULL AND event_session_id IS NULL)
  OR (context_type = 'category' AND page_key IS NULL AND seo_page_id IS NULL AND event_id IS NULL AND event_session_id IS NULL AND category_id IS NOT NULL)
  OR (context_type = 'event' AND page_key IS NULL AND seo_page_id IS NULL AND event_id IS NOT NULL)
);

CREATE UNIQUE INDEX photo_placements_event_order ON public.photo_placements
  (event_id, COALESCE(event_session_id, '00000000-0000-0000-0000-000000000000'::uuid), slot, display_order)
  WHERE context_type = 'event';

DROP POLICY "Public read published photo placements" ON public.photo_placements;
CREATE POLICY "Public read published photo placements" ON public.photo_placements
  FOR SELECT TO anon, authenticated
  USING (
    published
    AND EXISTS (SELECT 1 FROM public.photos p WHERE p.id = photo_id AND p.published)
    AND (seo_page_id IS NULL OR EXISTS (SELECT 1 FROM public.seo_pages s WHERE s.id = seo_page_id AND s.published))
    AND (event_id IS NULL OR EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_id AND e.published))
  );
```

`slot` distingue les emplacements : `'hero'`, `'intro'`, `'decor'`, `'session'` (photos rattachées à
une `event_session`, couverture en `display_order = 0`).

`photos.source_key` (ajouté par `000003`) devient obsolète pour les photos d'événements : les
photos envoyées depuis l'admin (redimensionnées côté navigateur, voir §5) n'ont pas de fichier
source hors-dépôt à référencer. `source_key` reste `NULL` pour ces lignes — le schéma le permet déjà
(`NULL` autorisé).

### 1.5 `photo_variants` : qui les insère ?

Avec la génération dans le navigateur, c'est l'admin (client authentifié) qui envoie AVIF et WebP
pour chaque taille disponible et insère jusqu'à 6 lignes `photo_variants`, pas `service_role` via un script hors-ligne. Les politiques
RLS existantes de `photo_variants` (« Admin manage photo variants », `FOR ALL TO authenticated USING
has_role admin`) couvrent déjà ce cas sans modification.

---

## 2. Parcours admin, écran par écran

Sections empilées dans une longue page (patron `pages-seo.tsx`/`parametres.tsx`), pas d'onglets,
pour rester cohérent avec le reste de l'admin. Nouvelle entrée `nav` dans `_authed.tsx` : «
Événements », icône `CalendarDays`.

1. **Liste** (`/admin/evenements`) : une carte par événement (titre, dates, badge Publié/Brouillon,
   badge Teaser actif), actions Ouvrir / Dupliquer / + Nouvel événement.
2. **Création** : titre + slug (pré-rempli depuis le titre, modifiable — verrouillé après la
   première publication, §1.2). Crée une ligne `published = false` et ouvre la fiche.
3. **Duplication** (ex. Noël 2026 → Noël 2027) : copie textes, dates (à revoir), formules, FAQ et
   sessions ; **ne copie pas** les photos (`photo_placements`) pour éviter qu'une photo d'une
   édition reste accrochée à la suivante par erreur. Le nouvel événement est créé `published =
   false`, donc avec un slug encore modifiable.
4. **Fiche événement** :
   - **Informations** : titre, sous-titre, slug (lecture seule si `first_published_at` non nul),
     lieu, dates (liste éditable avec case « date de report »), date de fin d'édition.
   - **Textes** : présentation, infos pratiques, légende de galerie, texte du bouton d'ouverture,
     clôture, textes de fin d'édition.
   - **Formules** : cartes nom/prix/contenu/lien Pelli/mise en avant/ordre — même patron que
     Prestations.
   - **FAQ** : cartes question/réponse/ordre — même patron que l'écran FAQ actuel.
   - **Photos** : sous-sections Ouverture (1), Intro (2-3), Sessions (une carte par session : titre,
     ordre, puis ses photos avec couverture et ordre), Décor (galerie libre). Envoi = redimensionnement
     et conversion WebP dans le navigateur (§5) puis rattachement via `photo_placements`.
   - **Teaser accueil** : case à cocher (désactivée si un autre événement a déjà un teaser actif sur
     la période choisie, cf. §1.3), titre/texte/bouton, dates d'affichage, photo.
   - **Couleurs** : deux sélecteurs (principale, accent), voir §4.
   - **SEO** : meta title/description avec compteurs, OG title/description.
   - **Publier / Dépublier**.
   - **Aperçu**.

---

## 3. Route publique

`$slug.tsx` est un catch-all racine unique : impossible d'ajouter un second segment dynamique
concurrent. **Décision : option A.** Le loader de `$slug.tsx` interroge d'abord `seo_pages`, puis
`events` si rien ne correspond ; le composant choisit le rendu selon le type trouvé. Les événements
gardent une adresse à la racine (`/mini-seances-noel-2026`, etc.), comme Noël aujourd'hui, et la
collision est empêchée en base par le trigger du §1.2 (pas seulement côté admin).

- **404** : même patron que `$slug.tsx` — `notFound()` si absent ou non publié, `robots noindex`
  (déjà géré globalement par `__root.tsx`).
- **JSON-LD** : généraliser `noel-2026-jsonld.ts` (un `Event` par ligne `event_dates`, `location`,
  `event_formules` comme `offers`).
- **Sitemap** : `sitemap[.]xml.ts` est aujourd'hui un tableau statique, sans requête base. Ajouter
  une requête `events` où `published = true` (client anon) pour générer ces entrées dynamiquement ;
  le reste du fichier reste inchangé pour l'instant.
- **Fin d'édition (décision 7)** : `published` reste `true` tant que la dépublication n'est pas
  manuelle ; `ends_at` ne fait basculer que l'affichage (mode « Édition terminée »), jamais la
  visibilité. La page continue donc de répondre 200 indéfiniment après la fin, comme aujourd'hui,
  jusqu'à une dépublication volontaire.

---

## 4. Système de couleurs

Deux couleurs configurables par événement — `primary_color` (rôle du bordeaux) et `accent_color`
(rôle du doré) — sur le mécanisme déjà éprouvé par Noël : injectées en `style` inline sur le
wrapper, dérivées en tokens `--event-*` via `color-mix`, consommées par un module CSS générique
(`NoelCampaign.module.css` → `EventCampaign.module.css`, classes déjà neutres comme `.eyebrow`,
`.night`, `.button`). Mise en page, polices et espacements restent figés.

Tokens dérivés (généralisation de `NoelCampaign.module.css` L7-14, qui codait le doré en dur comme
`var(--accent)` global — ce n'est plus le cas, chaque événement a désormais son propre accent) :

```css
--event-primary: <primary_color>;
--event-accent: <accent_color>;
--event-accent-text: <version claire de accent_color, calculée pour rester lisible en petit texte
  sur --event-primary — équivalent du --noel-gold-text actuel>;
--event-cream: #fffdf8;
--event-ink: #140c0b;
--event-rule: color-mix(in srgb, var(--event-primary) 20%, transparent);
```

**Écran couleur (dans la fiche événement) :**
1. **Vos couleurs** en premier : les teintes de marque du site (`--primary` #8A5A44, `--secondary`
   #C89B7B, `--accent` #C6966F).
2. **Grille par ambiance**, en **paires** (principale + accent), valeurs à valider visuellement avant
   livraison :

   | Ambiance | Principale | Accent |
   |---|---|---|
   | Noël / hiver | `#5E1112` (bourgogne, déjà utilisé) | `#C9A24B` (doré) |
   | Printemps | `#6B8F71` | `#D9B44A` |
   | Été | `#3E7C8C` | `#E0A93E` |
   | Automne | `#7A2E2E` | `#C99A2E` |
   | Neutres | `#4A423C` | `#B8B0A8` |

3. **Accents « fête »** (pour la couleur d'accent uniquement) : doré `#C9A24B`, argenté `#B8B9BB`,
   cuivré `#B5651D`, blanc cassé `#F0E9DD`.
4. **Sélecteur libre** pour chacune des deux couleurs (`<input type="color">` + champ hex).
5. **Contrôle WCAG AA — bloquant** : une fonction pure (luminance relative WCAG, testable en
   vitest) vérifie au minimum : texte crème sur la couleur principale (boutons, sections « nuit ») ;
   la couleur principale sur le fond et la surface du site ; le texte d'accent clair sur la couleur
   principale. Si un couple échoue, **l'enregistrement est bloqué** et l'écran propose
   automatiquement la nuance conforme la plus proche : même teinte (H constant en HSL), luminosité
   ajustée par pas jusqu'au premier seuil AA franchi, avec un bouton « Utiliser cette teinte » qui
   remplace la valeur choisie. Contrairement aux compteurs de caractères existants (non bloquants),
   ce contrôle-ci bloque explicitement, par décision du 27/09/2026.
6. **Aperçu en direct** : les deux sélecteurs pilotent le rendu de l'aperçu (§2) sans passer par un
   enregistrement.

---

## 5. Photos : redimensionnement et conversion dans le navigateur

Décision : pas de génération de variantes côté serveur, ni de script hors-ligne pour les photos
d'événements. L'admin envoie un fichier ; le navigateur produit les 3 tailles (400/800/1600, largeur
maximale — pas d'agrandissement au-delà de l'image source, comme `generate-variants.mjs` sur
`photos-storage`) et les convertit en AVIF et WebP avant l'envoi.

**Mécanisme proposé** (nouveau, à écrire — `src/lib/admin/image-variants.ts`) :
1. `createImageBitmap(file, { imageOrientation: "from-image" })` — applique l'orientation EXIF
   avant tout dessin, pour ne pas livrer de photo pivotée une fois les métadonnées supprimées.
2. Pour chaque largeur cible ≤ largeur source : dessiner sur un `OffscreenCanvas` (ou `<canvas>`) à
   cette largeur, puis exporter en `image/avif` et `image/webp` (avec vérification du type réellement
   renvoyé par le navigateur ; si AVIF est indisponible, signaler le blocage clairement).
3. Le blob obtenu ne contient que les pixels réencodés : **aucune métadonnée EXIF/XMP/ICC n'est
   recopiée par le canvas**, donc la suppression est effectivement garantie par le réencodage — la
   vérification demandée porte surtout sur l'étape 1 (l'orientation doit être correcte malgré tout,
   sous peine de photos pivotées sans métadonnée pour le signaler). **À tester réellement sur un
   échantillon de photos avec orientation EXIF non neutre avant de considérer ce point acquis.**
4. Envoi des 6 blobs au plus vers le bucket `photos` (chemins distincts par largeur et format), puis
   insertion des lignes `photo_variants` (format, largeur, hauteur, poids, `sha256` calculé côté client via `SubtleCrypto`)
   et d'une ligne `photo_placements`.

Limite connue : le traitement dans le navigateur dépend de l'appareil de la photographe (mobile
inclus) — à tester avec de vraies photos de séance (plusieurs Mo, résolution d'appareil photo) avant
de considérer l'étape fiable en pratique. Aucun test automatisé n'est réaliste ici (pas de Canvas en
environnement Node/vitest) : validation manuelle requise.

---

## 6. Découpage en étapes, branches et responsabilités

**Branche** : `evenements`, à créer à partir de `main` une fois `apres-noel` fusionnée (pas encore
créée — attend la fin du chantier vitesse mobile et des pages SEO, comme demandé).

| # | Étape | Qui applique/teste |
|---|---|---|
| 1 | Migrations fondation photos (`000003` inchangée, puis `000004` AVIF) | Paul applique |
| 2 | Migration `events` + tables filles + extension de `photo_placements` (§1.4) + triggers + RLS + aal2 | Paul applique |
| 3 | Admin : liste, création, duplication, textes/dates/formules/FAQ | Paul teste avec son compte |
| 4 | Admin : photos (redimensionnement navigateur, rattachement, ordre) | Paul teste avec de vraies photos |
| 5 | Admin : couleurs (grille, presets, sélecteur, contrôle WCAG bloquant) + tests | Paul valide visuellement les teintes proposées |
| 6 | Route publique + composant de rendu partagé + JSON-LD + sitemap dynamique | Paul teste |
| 7 | Aperçu admin | Paul teste |
| 8 | Migration des données Noël 2026 (après la fin de l'édition, script one-shot écrit par Claude, lancé par Paul) | Paul lance et vérifie |

---

## 7. Estimation de charge

Hors migration finale de Noël et hors allers-retours de test :

| Bloc | Estimation |
|---|---|
| Migrations (fondation photos + events + triggers slug/teaser) | 1 j |
| Admin CRUD texte/dates/formules/FAQ | 2–3 j |
| Admin photos (redimensionnement navigateur + rattachement, aucune UI existante à ce jour) | 2,5–3,5 j |
| Système de couleurs (2 teintes, grille, contrôle WCAG bloquant + suggestion automatique, tests) | 1,5–2 j |
| Route publique + composant partagé + JSON-LD + sitemap | 2–3 j |
| Aperçu | 0,5 j |
| **Total (hors migration Noël)** | **9,5–14 jours de travail effectif** |
| Migration des données Noël 2026 (après la fin de l'édition) | ~1 j |

---

## 8. Questions restées ouvertes après les décisions du 27/09/2026

Ces points n'ont pas encore de réponse et devront être tranchés avant l'implémentation :

1. La liste des slugs réservés (§1.2) doit-elle inclure d'autres routes prévues mais pas encore
   créées, pour éviter une collision future ?
2. Les 5 paires de teintes par ambiance (§4) sont des propositions : à valider visuellement avant
   de les figer dans le code.
3. Les qualités AVIF/WebP et les 3 largeurs (400/800/1600) sont à confirmer pour les photos
   d'événements (mêmes usages : galerie, hero).
