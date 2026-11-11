# Événements : l'autonomie de la photographe

Branche `events-autonomie`. Objectif : qu'elle crée, date, publie, illustre, duplique et archive ses événements seule, depuis l'administration. Ce document : l'audit de son parcours, ce qui a été corrigé, ce qui existait déjà, ce qui reste à décider, le guide intégré, la préparation de l'import des photos de Noël et la liste de ce qu'il faut tester avec elle.

Décisions de départ respectées : un seul interrupteur (`VITE_GALLERIES_FROM_STORAGE`), expiration d'affichage inchangée, dates = colonnes de `events` (pas de table dédiée : une édition = une liste de jours entiers, aucun besoin d'horaires ni de plages multiples), pages baptême/mariage/anniversaire hors périmètre. **Aucune migration n'est nécessaire** pour ce qui suit.

## 1. Audit du parcours (relu en me mettant à sa place)

| # | Friction | État |
|---|---|---|
| 1 | Pas de rappel de ce qui manque avant de publier (couverture, lieu, galerie vide, photo sans description) | **Corrigé** : cadre « À vérifier avant de publier » (non bloquant) et rappel dans la confirmation de publication |
| 2 | Publication impossible sans titre, date, présentation, lien de réservation | Déjà en place (`validateEventForPublish`) ; titre, adresse de page (minuscules, chiffres, tirets), unicité de l'adresse (refusée par la base, message en français) et dates cohérentes aussi |
| 3 | Dates de report : cohérence (après la première séance, pas de doublon avec une séance) | Déjà en place |
| 4 | Changement de dates d'un événement publié : aucune explication, aucune confirmation | **Corrigé** : aide dépliable avec l'exemple de Noël 2026 (7 et 11 novembre → 28 et 29 novembre) ; confirmation à l'enregistrement qui annonce les nouvelles dates affichées |
| 5 | Lien de réservation : seulement « https » vérifié, n'importe quel domaine accepté | **Corrigé** : lien Pelli obligatoire (`https://soleana-studio.pelli.io/…` ou sous-domaine de `pelli.io`, sans identifiants) ; message dédié ; **aperçu du bouton** avec un lien « tester » (nouvel onglet) |
| 6 | Prévisualisation | **Déjà possible** : bouton « Aperçu » = la page telle qu'elle sera, avec les valeurs saisies même non enregistrées, dans l'administration (donc réservée aux administratrices connectées), sans rien publier ni indexer. Un brouillon ou un événement archivé répond 404 + `noindex` au public. Documenté dans le guide |
| 7 | Dupliquer pour l'année suivante | **Déjà clair** : fenêtre avec trois options expliquées, copie en brouillon sans dates ni teaser |
| 8 | Archivage réversible | Déjà en place (« Archiver » / « Remettre en brouillon ») |
| 9 | Suppression : confirmation sans le nombre de photos | **Corrigé** : « Ses galeries contiennent N photos : elles seront retirées de l'événement mais restent dans l'administration des photos » ; seul un brouillon jamais publié se supprime |
| 10 | Jargon : « texte alternatif », « emplacement », « variantes web », « migration » visibles | **Corrigé** : « Description de la photo (obligatoire) » avec un exemple, « Afficher cette photo sur le site », « cadrage horizontal / vertical », « préparée pour le site sur cet appareil », messages « demandez à Paul de l'activer » |
| 11 | iPhone/iPad : Safari zoomait sur chaque champ (texte < 16 px) ; boutons de 28–32 px | **Corrigé** (admin seulement, aucun octet de plus pour le public) : champs à 16 px sur mobile, cibles tactiles de 44 px sur écran tactile |
| 12 | Image de couverture absente : aucun message | **Corrigé** : avertissement clair avant de publier |
| 13 | Teaser d'accueil | **Déjà contrôlable** (case « Afficher sur la page d'accueil », texte, bouton, ordre) avec explication ; l'accueil n'en montre qu'un (le plus proche dans le temps) |
| 14 | Chargements sans retour visuel | Envois : libellés « Envoi en cours… » / « Préparation et envoi… » et progression dans les galeries ; listes : « Chargement… ». Rien d'ajouté |
| 15 | Perte de connexion pendant un envoi | **Déjà géré** : l'envoi n'est pas une transaction, mais tout ce qu'il a créé est supprimé en cas d'échec (testé) ; message « Connexion impossible » ; le guide dit « rien n'est ajouté à moitié, recommencez » |
| 16 | Événement sans photo / sans date / dates passées / événement référencé non publié | Sans date : bloque la publication ; dates passées : avertissement « toutes les dates sont passées » ; sans photo : la galerie vide n'apparaît pas et le cadre le signale ; « Édition précédente » ne s'affiche que si l'événement référencé est publié (testé) |
| 17 | Aucune aide dans l'administration | **Corrigé** : page « Aide » (voir §3) |
| 18 | Double authentification : message trompeur | Corrigé auparavant (`write-error.ts`) ; expliqué dans le guide |

### Ce qui reste à décider (par Paul)
- **Statut « reporté » / « annulé »** : le modèle n'a que brouillon / publié / archivé. Les dates de report météo sont gérées, mais on ne peut pas marquer une édition « annulée » (données structurées `EventCancelled`). Faisable avec une colonne, proposition non appliquée : `docs/sql/proposed-event-schedule-status.sql`. Tant qu'elle n'est pas appliquée, rien ne change.
- Limiter les liens de réservation à Pelli est volontaire (seul canal) : à relâcher si un autre outil est un jour utilisé (`src/lib/events/publish-checks.ts`, `isPelliUrl`).
- Titres proposés des galeries de Noël (« Séance 1 à 4 », « Décor ») : modifiables ensuite par la photographe.
- L'affichage d'un lien « Aide » dans le menu est visible de toute personne connectée à l'administration ; l'aide n'existe pas côté public (vérifié par le script de contrôle).

## 2. Corrections livrées (une par commit, avec tests)
- Avertissements non bloquants et rappel à la publication : `src/lib/events/publish-checks.ts` (+ composant `PublishChecklist`).
- Confirmation d'un changement de dates sur un événement publié ; aide sur les dates avec l'exemple de Noël.
- Lien Pelli obligatoire (`bookingUrlProblem`) et `BookingLinkPreview`.
- Suppression d'un brouillon : nombre de photos annoncé.
- Ergonomie iPhone/iPad : `src/lib/admin/mobile-css.ts`, `AdminStyles` (un `<style>` rendu par les seuls écrans d'administration ; une feuille CSS importée par une route aurait été chargée sur toutes les pages publiques).
- Vocabulaire de la photographe (photos, galeries).
- SEO : chaque offre des données structurées `Event` pointe vers son lien Pelli et déclare sa disponibilité.
- Page « Aide » intégrée (`/admin/aide`).
- Tests : 445 (dont 51 qui vérifient que chaque libellé cité par le guide existe dans l'interface, 22 sur les contrôles de publication, 8 sur le plan d'import de Noël).

## 3. Guide intégré (`/admin/aide`, contenu dans `src/data/admin-guide.ts`)
Étapes numérotées courtes, en français simple, sans capture d'écran :
1. **Activer la double authentification** (Mon compte, application d'authentification, QR code, code à 6 chiffres) ;
2. **Créer et publier un événement** (Nouvel événement, fiche, Enregistrer, Aperçu, cadre « À vérifier », Publier) ;
3. **Régler ou changer les dates (et le mauvais temps)**, avec l'exemple de Noël 2026 ;
4. **Ajouter une galerie « édition précédente »** (Nouvelle galerie, Ajouter des photos, ordre, Masquer, « Afficher aussi les photos d'une autre édition ») ;
5. **Envoyer des photos et régler leur cadrage** (JPG/HEIC/PNG, 25 Mo, description, destination, cadrage) ;
6. **Dupliquer pour l'année suivante, archiver, supprimer** ;
7. **Montrer l'événement sur la page d'accueil** ;
8. les autres rubriques (Prestations, Avis, FAQ, Pages SEO, Paramètres : modifier puis Enregistrer) ;
9. **Dépannage** : message « double authentification », session expirée, mot de passe oublié (12 caractères, une lettre, un chiffre), téléphone perdu, modification invisible, à qui s'adresser (Paul).
Chaque rubrique indique ce que cela change sur le site et un piège fréquent. Vérification : un test extrait tous les libellés entre « guillemets » du guide et contrôle qu'ils existent dans le code de l'interface (un bouton renommé fait échouer le test).

## 4. SEO des pages d'événement (état)
Déjà en place et vérifié en production : `<title>`, description, `canonical`, Open Graph (titre, description, URL, image), JSON-LD `Event` (un par jour de séance : nom, dates, lieu, description, image, organisateur, offres) échappé par `safeJsonLd`, événements publiés dans le sitemap, brouillons et archivés en 404 `noindex` donc absents du sitemap. Pas de données structurées une fois l'édition terminée (inchangé). Ajouté : offres vers leurs liens Pelli. Non faisable sans migration : statut annulé/reporté (voir §1). Le contrôle de production (`scripts/smoke-test.mjs`) vérifie le sitemap, le JSON-LD de Noël (valide), le canonical, l'absence de `noindex` sur Noël et le 404 `noindex` d'un événement inconnu. **Attention** : après la fin de l'édition de Noël (30 novembre 2026), le JSON-LD disparaît par conception et ce contrôle passera à KO : c'est attendu.

## 5. Noël : migration des 74 photos vers Storage (préparation, rien d'exécuté)

### Choix faits (les plus raisonnables et réversibles)
- **Source** : les WebP 1600 px du dépôt (aucun original de Noël hors dépôt) ; 4 largeurs 400/800/1200/1600 en AVIF + WebP, profil q55 comme les 170 photos : **592 variantes, 61 Mo** (simulation).
- **Galeries** (titres proposés, modifiables ensuite dans la fiche) : Séance 1 (13 photos), Séance 2 (11), Séance 3 (19), Séance 4 (12), Décor (19) = 74.
- **Descriptions** : une phrase unique par photo (« Mini-séances de Noël 2026 : séance 1, photo 3 », « Décor des mini-séances de Noël 2026 en extérieur, photo 5 ») : correct pour l'accessibilité et Google, à affiner par la photographe dans l'admin (champ de description de chaque photo).
- **Brouillon d'abord** : photos et emplacements importés non publiés, sans catégorie ; `events.galleries` complété sans modifier les galeries existantes ; publication séparée.
- **Affichage** : le code affiche déjà les galeries de la base à la place de la galerie locale dès qu'elles existent (`EventPage` : `galleryGroups.length > 0`). La publication change donc l'apparence de la galerie de Noël (mise en page générique des galeries d'événement à la place de la mosaïque « Noël ») : à valider visuellement avant de publier.
- **Les 6 photos du bandeau, de l'introduction et de la fin** (`noel-hero-a/b`, `noel-s03-07`, `noel-decor-15`, `noel-decor-19`) restent locales (gérées par `event-assets.ts`) : elles ne font pas partie des 74.

### Outils (testés en simulation, jamais exécutés en réel)
- `scripts/photos-storage/noel-event-manifest.mjs` : manifeste `docs/photos-storage/manifest-noel-event.json`.
- `scripts/photos-storage/generate-event-variants.mjs` : variantes (simulation par défaut ; `--write` écrit hors dépôt).
- `scripts/photos-storage/import-event-photos.mjs` : simulation / import en brouillon / publication / retour arrière, journal compatible.
- Logique pure et tests : `event-import-plan.mjs`, `event-import-plan.test.ts`.

### Commandes exactes pour Paul (à lancer depuis la racine du dépôt)
```
# 0. Vérifier le manifeste et simuler l'encodage (rien n'est écrit ; ≈ 3 minutes)
node scripts/photos-storage/noel-event-manifest.mjs
node scripts/photos-storage/generate-event-variants.mjs --all

# 1. Générer les 592 variantes localement (écrit dans ../soleana-originaux/storage-variants/noel-event/)
node scripts/photos-storage/generate-event-variants.mjs --all --write

# 2. Simulation de l'import (aucun service contacté)
node scripts/photos-storage/import-event-photos.mjs

# 3. Clé service_role saisie en mémoire (jamais dans un fichier)
export SUPABASE_URL=https://kvzzzwjddanwedzotaka.supabase.co
read -rsp 'Clé service_role : ' SUPABASE_SERVICE_ROLE_KEY; echo; export SUPABASE_SERVICE_ROLE_KEY

# 4. Essai sur 4 photos (brouillon)
node scripts/photos-storage/import-event-photos.mjs --apply --confirm kvzzzwjddanwedzotaka.supabase.co --limit 4

# 5. Contrôle : dans l'admin, fiche « Mini-séances de Noël 2026 » > Galeries photos : « Séance 1 » avec 4 photos
#    (masquées). Si tout est bon, import complet :
node scripts/photos-storage/import-event-photos.mjs --apply --confirm kvzzzwjddanwedzotaka.supabase.co

# 6. Contrôle en base (SQL Editor, lecture seule) : 74 photos, 592 variantes, 74 emplacements, tous non publiés
#    SELECT count(*) FROM photo_placements WHERE context_type='event' AND placement_key LIKE 'events/mini-seances-noel-2026/%';

# 7. Publication (seulement après validation visuelle de l'aperçu)
node scripts/photos-storage/import-event-photos.mjs --publish-existing --apply --confirm kvzzzwjddanwedzotaka.supabase.co

# 8. Contrôle du site
node scripts/smoke-test.mjs https://soleanastudio.fr
#    puis ouvrir /mini-seances-noel-2026 : 74 photos dans 5 galeries.

# Retour arrière (dépublie, supprime ce que le journal marque « créé », remet events.galleries comme avant)
node scripts/photos-storage/import-event-photos.mjs --rollback --journal <fichier.jsonl>                              # simulation
node scripts/photos-storage/import-event-photos.mjs --rollback --journal <fichier.jsonl> --apply --confirm kvzzzwjddanwedzotaka.supabase.co
```
Le journal de chaque étape est écrit dans `../soleana-originaux/storage-variants/journals/event-import-*.jsonl` (hors dépôt).

### Plan de suppression de l'ancien Noël (à ne faire qu'après l'import, la publication et la vérification)
`src/lib/events/legacy-noel.ts` n'est **pas** supprimé. Il sert de repli si la base ne répond pas (`queries.ts`, `sitemap`) et fournit les images du bandeau via `event-assets.ts`.
- **Étape A (galeries locales, risque faible)** : supprimer `src/components/site/NoelGallery.tsx`, `NoelGallerySection.tsx`, `src/data/noel-2026-sessions.ts`, la branche `NoelGallerySection` de `EventPage.tsx`, et les 142 fichiers `src/assets/noel-2026/noel-s0[1-4]-*.webp` et `noel-decor-*.webp` (148 au total moins les 3 images conservées en 2 tailles : `noel-s03-07`, `noel-decor-15`, `noel-decor-19`).
- **Étape B (repli et contenu codé en dur, risque moyen)** : supprimer `src/lib/events/legacy-noel.ts`, les repli de `src/lib/events/queries.ts` (`legacyPage`, `legacyNoelEvent`, repli du teaser), `LEGACY_NOEL_SLUG` dans `src/routes/sitemap[.]xml.ts` et `event-assets.ts`, puis ce qui reste utile de `src/data/noel-2026.ts` ; déplacer le bandeau, l'introduction et la fin vers la couverture de l'événement (champ « Image de couverture ») : cela change la mise en page de Noël, à décider avec elle.
- Après chaque étape : typecheck, tests, build, `node scripts/smoke-test.mjs`.

## 6. Évolutions SQL
Aucune migration requise. Proposition non appliquée : `docs/sql/proposed-event-schedule-status.sql` (statut reporté/annulé). Le code n'y fait pas référence : rien à masquer, rien à casser.

## 7. À tester à la main avec la photographe (séance de prise en main)
Voir la liste à la fin de `docs/JOURNAL-AUTONOME.md` (section « Événements : autonomie »).
