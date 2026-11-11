# Plan de refactorisation — branche `refactor-structure`

Branche créée à partir de `photos-storage-v2` (commit b64caaa). Objectif : nettoyer et mieux structurer le code **sans changer** le rendu, les routes, les URLs, la base, la CSP ni les en-têtes. Rien n'est fusionné ni déployé.

## 1. État des lieux (avant toute modification)

### Mesures de référence (build avec `VITE_GALLERIES_FROM_STORAGE=true`, comme la production)
| Mesure | Valeur |
|---|---|
| `npm run typecheck` | 0 erreur |
| Tests | 307 (36 fichiers) + 7 (`scripts/photos-storage`, config à part) |
| Build | vert, 64 fichiers JavaScript, 1,3 Mo non compressé |
| JavaScript chargé par page (gzip) | accueil 188,5 Ko · `/portfolio` 183,1 · `/portfolio/couple` 186,5 · pages SEO galeries et Noël 199,1 · À propos 185,0 · Contact 182,7 · FAQ 189,1 · Prestations 182,4 |
| Lighthouse mobile (local) | accueil 89 · `/portfolio` 93 · `/portfolio/couple` 89 · page SEO couple 100 |
| Galeries (données publiques) | grossesse 11+20, famille 47+20 (47 distinctes), couple 10+17+53, portrait 12 ; ordre = manifeste ; 0 écart |
| 16 URLs | HTML et en-têtes capturés (accueil, Noël, 4 pages SEO, lifestyle, `/portfolio`, `/portfolio/couple`, prestations, À propos, FAQ, contact, 404, `sitemap.xml`, `robots.txt`) |
| ESLint (`src`, `scripts`, `vite.config.ts`) | 242 écarts `prettier/prettier`, 6 avertissements `react-refresh/only-export-components`, aucune autre règle |
| Imports circulaires (madge) | 1, normale : `routeTree.gen.ts` ↔ `router.tsx` (généré par TanStack) |

### Constats de structure
- **Fichiers de plus de 300 lignes** (hors générés) : `PhotosAdmin.tsx` 1 454 · `EventEditor.tsx` 850 · `routes/index.tsx` 701 · `EventGalleriesAdmin.tsx` 537 · `routes/a-propos.tsx` 536 · `routes/$slug.tsx` 532 · `AccountAdmin.tsx` 496 · `lib/photo-storage.ts` 454 · `CategoryGallerySection.tsx` 436 · `lib/events/admin.ts` 390 · `components/site/EventPage.tsx` 313.
- **Mélange public / admin** : 12 composants d'administration vivent dans `src/components/site/admin/`, dossier des composants du site public.
- **`photo-storage.ts`** réunit trois responsabilités : construction des URLs publiques, lecture des galeries (public) et encodage AVIF/WebP dans le navigateur (admin).
- **`PhotosAdmin.tsx`** contient la page et quatre composants (`PhotoCard`, `NewPlacementForm`, `PlacementEditor`, `PhotoStorageCapacityPanel`) plus des helpers.
- **Duplication** : sélection des variantes WebP triées par largeur, répétée dans `photo-storage.ts`, `gallery-admin.ts`, `event-upload.ts`, `PhotosAdmin.tsx`.
- **Code mort réel** (références vérifiées) : `components/site/GalleryCategoryCard.tsx` (aucun import), `lib/config.server.ts` (plus d'appelant depuis la suppression de l'exemple de fonction serveur), quelques exports sans usage (`ACTIVE_BROWSER_PHOTO_QUALITY_PROFILE`, type `PhotoStorageCapacity`, constantes de `data/noel-2026.ts` à confirmer).
- **Déjà propre** : aucun `any` applicatif (les seuls sont dans `routeTree.gen.ts`, généré), aucun `console.log` hors tests, aucun TODO/FIXME. Les 40 composants `components/ui/*` non utilisés sont le kit shadcn : conservés (voir « abandonné »).
- Dépendances : toutes les dépendances d'exécution sont importées ; les « non importées » sont des outils (plugins Vite, ESLint, types).

## 2. Lots, ordre et risques

| Lot | Contenu | Risque | Garde-fous |
|---|---|---|---|
| **A** Code propre | Supprimer les 2 fichiers morts et les exports sans usage ; commentaires obsolètes ; avertissements `react-refresh` ; **Prettier + ESLint en commit séparé à la fin du lot** (hors fichiers protégés) | Faible | typecheck, tests, build ; fichiers protégés listés plus bas |
| **B** Duplication | Module unique pour les variantes de photos (WebP triées, plus grande WebP) utilisé par les 4 sites ; tests | Faible à moyen | tests de caractérisation avant la factorisation |
| **C** Structure | C1 : `components/site/admin` → `components/admin` (séparation public/admin) ; C2 : découper `photo-storage.ts` en modules `lib/photos/*` ; C3 : extraire de `PhotosAdmin.tsx` ses 4 sous-composants et helpers ; C4 : même traitement pour `EventEditor.tsx` si les frontières sont nettes | Moyen (imports, chunks) | aucun changement de route ; comparaison des 16 URLs, poids JS par page |
| **D** Optimisations | Requêtes sans limite ou dupliquées, chunks, préchargements ; on ne garde que ce qui améliore une mesure | Faible | Lighthouse avant/après, sinon abandon |
| **E** Documentation | README (architecture, scripts, variables, déploiement, retour arrière) ; organisation de `docs/` | Nul | relecture |

Après chaque lot : typecheck, tests, build ; comparaison HTML + en-têtes des 16 URLs ; décomptes de galeries ; console/CSP sur les pages publiques ; poids du JavaScript. Un lot qui casse une vérification est annulé par `git revert` et noté.

## 3. Fichiers et zones protégés (non modifiés)

`src/lib/events/legacy-noel.ts`, `src/data/admin-guide.ts` (non suivi), pages baptême/mariage/anniversaire, migrations existantes, `scripts/photos-storage/import-*.mjs`, `rollback-import.mjs`, `lib.mjs` (documentation seulement). Fichiers générés non reformatés : `src/routeTree.gen.ts`, `src/integrations/supabase/types.ts`.

## 4. Suivi

Les résultats lot par lot, les mesures avant/après et ce qui a été abandonné sont ajoutés à la fin de ce fichier et résumés dans `docs/JOURNAL-AUTONOME.md`.
