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

---

## 5. Résultats (branche `refactor-structure`, 16 commits, non fusionnée, non déployée)

### Mesures avant / après (build avec le flag des galeries, `wrangler dev --local`)
| Mesure | Avant | Après |
|---|---|---|
| Typecheck | 0 erreur | 0 erreur |
| Tests | 307 + 7 | **330 + 7** (+23 : variantes, source de galerie, chargement des catégories) |
| Build | vert, 64 fichiers JS | vert, 65 fichiers JS |
| JavaScript par page (gzip) | accueil 188,5 · portfolio 183,1 · couple 186,5 · SEO/Noël 199,1 · À propos 185,0 · Contact 182,7 · FAQ 189,1 · Prestations 182,4 Ko | **186,6 · 181,2 · 184,6 · 197,1 · 183,1 · 180,8 · 187,2 · 180,5 Ko** (−1,9 Ko partout) |
| Lighthouse mobile (accueil / portfolio / couple / SEO couple) | 89 / 93 / 89 / 100 | 89 / 93 / 89 / 100 (une passe isolée à 89 sur `/portfolio` ; trois repasses : 93, 93, 93 = bruit) |
| 16 URLs | référence | **HTML et en-têtes identiques** (empreintes et horodatages neutralisés), mêmes codes et tailles |
| Galeries | 11+20, 47+20, 10+17+53, 12 ; Famille 47 distinctes | **identiques**, 0 écart d'ordre |
| Console / CSP | 0 message | **0 message** sur 13 pages publiques et `/admin/login` |
| Requêtes Supabase du navigateur sur `/portfolio/<catégorie>` | 4 (dont 2 inutiles, 2 en série) | **1** |
| ESLint (`src`, `scripts`, `vite.config.ts`) | 242 écarts Prettier + 6 avertissements | 0 écart hors fichiers protégés (import/rollback, générés, `admin-guide.ts`) ; 6 avertissements du kit shadcn conservés |
| Fichiers de plus de 300 lignes (hors générés, kit UI, protégés) | `PhotosAdmin` 1 454 · `EventEditor` 850 · `photo-storage` 454 · … | `PhotosAdmin` 655 · `EventEditor` 573 · `photo-storage.ts` supprimé (5 modules ≤ 235 lignes) |

### Lot par lot
- **A. Code propre** : supprimés `GalleryCategoryCard.tsx` (aucune référence), `config.server.ts` (plus d'appelant), deux exports sans usage, trois imports/types laissés par les découpages. Déjà propres : aucun `any` applicatif, aucun `console.log`, aucun TODO. Prettier : seulement `vite.config.ts` et les scripts photos non protégés (commit `style:` séparé) ; `src/` était déjà conforme. `tsc --noUnusedLocals` : 0 résultat hors kit UI.
- **B. Duplication** : `lib/photos/variants.ts` (tri/filtre WebP-AVIF, plus grande variante, appariement) remplace quatre copies ; une seule constante `PLACEMENT_SELECT` (la chaîne était écrite deux fois) ; 12 tests.
- **C. Structure** : `components/site/admin` → `components/admin` (séparation public/admin, 30 fichiers touchés, aucun changement de logique) ; `lib/photo-storage.ts` éclaté en `lib/photos/{flags,public-url,gallery-loaders,browser-encoder,quality}.ts` (les tests suivent leur module) ; `PhotosAdmin` découpé en page + `photos/{PhotoCard,NewPlacementForm,PlacementEditor,StorageCapacityPanel,helpers,types}` (code déplacé tel quel) ; `EventEditor` : `EventEditorHeader` et `EventListSections` (formules, FAQ) extraits. Aucune route ni URL modifiée.
- **D. Optimisations** (gardées parce que mesurées) : `/portfolio/<catégorie>` passe de 4 à 1 requête (les requêtes de repli de l'ancienne table ne partent plus pendant le chargement de Storage ni quand Storage a des photos ; catégorie + page SEO + placements en une seule jointure, au lieu de deux requêtes en série) ; listes de l'admin Photos lues page par page (photos, placements SEO, placements d'événement, variantes : PostgREST tronque à 1 000 lignes sans erreur).
- **E. Documentation** : `README.md` (n'existait pas : architecture, scripts, variables, déploiement, retour arrière), `docs/README.md` (index), règle des fichiers de route dans `src/routes/README.md`.

### Abandonné, avec la raison
- **Retirer zod du chemin public** (`vendor-zod`, 12 Ko préchargés partout) : validation de JSON venant de la base et des entrées des fonctions serveur ; réécrire à la main change le comportement de validation, gain ≈ +1 point. Non fait.
- **Fusionner les deux chaînes d'envoi de photo** (`PhotosAdmin` pour les pages SEO, `event-upload.ts` pour les événements) : elles diffèrent volontairement (messages, gestion de l'échec de nettoyage, catégorie) et la partie admin n'est testable qu'avec un mock partiel. Risque supérieur au bénéfice.
- **Découper `routes/index.tsx` (701), `a-propos.tsx` (536), `$slug.tsx` (533), `CategoryGallerySection` (436)** : pages publiques, rendu et préchargements à surveiller ; peu de couverture de test ; non fait.
- **Supprimer les 40 composants `components/ui/*` inutilisés** : c'est le kit shadcn, conservé tel quel (leurs dépendances Radix restent déclarées).
- **Constantes de `data/noel-2026.ts` sans appelant** (`NOEL_2026_COLORS`, `isNoel2026EditionOver`, `NOEL_2026_CAMPAIGN`…) : liées au retrait complet du Noël codé en dur, qui dépend de `legacy-noel.ts` (protégé) ; à traiter ensemble.
- **Dépendances et mémoïsation** : aucune dépendance d'exécution inutilisée ; aucune mémoïsation manquante mesurable (TBT 0 ms).
- **`knip`** : refusé par l'environnement (code téléchargé) ; remplacé par un script maison (fichiers sans importeur, exports sans usage) et `tsc --noUnusedLocals`.

### Risques restants
- Découpages de l'admin non testés dans un navigateur connecté : seuls les tests automatiques (composants, erreurs, envoi simulé) les couvrent. Tester à la main : Photos (envoi, cadrage, suppression), Mon compte, fiche événement (en-tête, formules, FAQ, galeries).
- `PhotosAdmin.tsx` (655) et `EventEditor.tsx` (573) restent grands : la logique (envoi, enregistrement) y est encore.
- Les pages `/portfolio/<catégorie>` dépendent maintenant d'une jointure PostgREST (`seo_pages!inner`) : vérifiée en réel (47 / 80 / 31 / 12 photos) ; si Supabase la refusait un jour, la page retomberait sur l'ancienne table (liste vide, puis « Galerie en cours de remplissage »).
