# Journal de travail autonome — Soleana Studio

Dernière mise à jour : 11 novembre 2026. Branche de travail : `photos-storage-v2` (jamais `main`).

## Point de départ constaté
- `photos-storage-v2` (issue de `main`) a déjà absorbé `photos-storage` (merge 80b92d3) et contient le module Événements.
- Déjà écrit : migrations 000002–000005, `20261109` (catégories), `20261110` (galeries d'événements), scripts de génération/vérification/import/rollback (`scripts/photos-storage/`), admin Photos (envoi AVIF/WebP, suppression fiable, réordonnancement, textes alternatifs, catégories créables/renommables/masquables, galeries d'événement), chargement Storage derrière `VITE_GALLERIES_FROM_STORAGE`.
- Base de tests au démarrage : typecheck OK, 244 tests OK, build OK. Lint : 301 erreurs, toutes `prettier/prettier` et antérieures (non corrigées pour ne pas noyer les diffs).

## Fait dans cette session
1. **BUG-02 réactivé, derrière l'interrupteur** (commit e4a481d) : avec `VITE_GALLERIES_FROM_STORAGE=true`, `/portfolio` devient une route de mise en page et `/portfolio/<catégorie>` s'affiche ; les 4 pages reviennent dans le sitemap. Interrupteur éteint : comportement identique à aujourd'hui.
2. **Pages catégories alimentées par Storage** : `loadCategoryPhotos` / `flattenGalleries` (`src/lib/photo-storage.ts`, testé) lisent les photos publiées de la page SEO correspondante, dédupliquées, avec `srcset`. Repli sur l'ancienne table `photos` si Storage ne renvoie rien.
3. **RGPD** : la politique de confidentialité mentionne l'hébergement des photos par Supabase (UE) et le retrait de la photo du stockage sur demande.

## Décisions (et pourquoi)
- **Branche** : la consigne dit `photos-storage`, mais `photos-storage-v2` la contient et est plus récente ; continuer dessus est le plus sûr.
- **BUG-02 non « nu »** : le revert d46c2db avait été fait car les pages affichaient « Galerie en cours de remplissage » (aucune photo publiée avec `category_id`). Or l'import crée des photos `category_id = NULL`, donc un simple revert resterait vide même après import. D'où la source Storage (galeries SEO) et l'interrupteur, réversible en retirant la variable.
- **Dates d'événement** : aucune table dédiée créée. Les dates (`event_dates`, `fallback_dates`) sont déjà des colonnes de `events`, éditables dans l'admin Événements ; une table séparée ajouterait une migration et une RLS sans bénéfice. À reconsidérer seulement si une même édition doit avoir plusieurs plages horaires.
- **Expiration d'affichage des événements** : non touchée.
- **Pages baptême/mariage/anniversaire** : non touchées.
- `src/data/admin-guide.ts` (non suivi, antérieur à la session) : laissé tel quel, non commité, non référencé.

## Points bloquants (pour Paul)
- **Double authentification de la photographe** : à activer avec elle avant l'étape 5 de l'ordre de production (`docs/photos-storage-plan.md`). Je n'y ai pas touché.
- **Migrations non appliquées** (000002 à 000005, 20261109, 20261110) : à appliquer par Paul dans l'ordre documenté, avec les contrôles. Je n'ai exécuté aucune migration, aucun import, aucun déploiement.
- **Import des 190 photos** : exige la base de production et les originaux hors dépôt ; non lancé. Simulation possible : `node scripts/photos-storage/import-photos.mjs --plan-only`.
- **Lighthouse mobile** : non mesuré (pas de navigateur piloté dans cette session). Interrupteur éteint, le HTML public est inchangé ; à mesurer après activation.
- **Test E2E admin** (créer/supprimer un élément de test) : nécessite la session admin de Paul.

## Reste à faire
- Appliquer les migrations, importer en brouillon, valider visuellement, puis activer l'interrupteur (cela active aussi BUG-02 et le sitemap catégories).
- Mesurer Lighthouse mobile avant/après activation.
- Photos de Noël (74, contexte `event`) : chantier séparé.
- Nettoyages : retirer `src/lib/events/legacy-noel.ts` après le test E2E ; `prettier --write` global dans un commit dédié.

## Trois prochaines actions pour Paul
1. Activer la double authentification avec la photographe, puis appliquer les migrations dans l'ordre (étapes 2 à 11 du plan), un contrôle après chacune.
2. Lancer la simulation puis l'import en brouillon des photos, valider visuellement, puis construire avec `VITE_GALLERIES_FROM_STORAGE=true`.
3. Vérifier Lighthouse mobile et le sitemap, puis seulement déployer (`npm run deploy:cf`).

## Message clair quand la double authentification manque (session AAL1)
- Les politiques RLS « Require aal2 » refusaient l'écriture d'un admin connecté sans second facteur, et l'interface affichait « Vous n'avez pas les droits nécessaires » : trompeur.
- Nouveau helper unique `src/lib/admin/write-error.ts` (`toastAdminError`, `resolveAdminError`) : si l'erreur est un refus RLS (code 42501 ou « row-level security ») **et** que la session n'est pas en aal2, le message devient « Cette action demande la double authentification… » (aucun facteur enregistré) ou « Reconnectez-vous avec votre code à 6 chiffres pour modifier le site. » (facteur enregistré), avec un bouton « Mon compte » (`/admin/compte`). En aal2, ou pour toute autre erreur, le message habituel est conservé.
- Appliqué à toutes les écritures de l'admin (événements, galeries, photos, catégories, FAQ, avis, prestations, pages SEO, paramètres via `use-editable-record`). Les erreurs de lecture gardent `friendlySupabaseError`.
- Tests : `src/lib/admin/write-error.test.ts`. Aucun déploiement, aucune migration.

---

## Session du 11 novembre 2026 : Lighthouse mobile, correctifs, prettier

Méthode : build avec `VITE_GALLERIES_FROM_STORAGE=false` puis `=true`, servi par `wrangler dev` en local (le même serveur que la production, `vite preview` ne sert pas ce build Nitro/Cloudflare), Lighthouse mobile par défaut (throttling simulé, Chrome headless), base de production en lecture seule. Script de mesure hors dépôt. Les scores varient d'environ ±1 point d'un passage à l'autre.

| Page | Interrupteur | Perf | A11y | BP | SEO | LCP |
|---|---|---:|---:|---:|---:|---:|
| Accueil | faux, avant | 85 | 100 | 100 | 100 | 4,4 s |
| Accueil | faux, après | 86 | 100 | 100 | 100 | 4,2 s |
| Accueil | vrai, après | 86 | 100 | 100 | 100 | 4,2 s |
| /portfolio | faux, avant | 90 | 96 | 100 | 100 | 3,6 s |
| /portfolio | faux, après | 91 | 96 | 100 | 100 | 3,5 s |
| /portfolio | vrai, après | 90 | 96 | 100 | 100 | 3,6 s |
| /portfolio/couple | faux | 90 | 96 | 100 | **92** | 3,6 s |
| /portfolio/couple | vrai, avant | 86 | 100 | 96 | 100 | 4,2 s |
| /portfolio/couple | vrai, après | 85 | 100 | 100 | 100 | 4,4 s |
| Noël (mini-séances) | les deux | 100 | 100 | 100 | 100 | 0,9 s |

Lecture :
- **Interrupteur faux, /portfolio/couple** : la page affiche le portfolio générique (BUG-02 inactif), d'où le SEO à 92 (balises dupliquées). C'est la raison d'être de BUG-02 ; avec l'interrupteur vrai, la page est la vraie page catégorie (SEO 100, accessibilité 100).
- **Best-practices 96 sur la page catégorie (vrai, avant)** : erreur console `Could not find the table 'public.photo_placements'` (404 Supabase) car les migrations ne sont pas appliquées en production. Le repli fonctionne ; l'erreur disparaît dès que les migrations sont passées. Le 100 « après » vient d'un passage sans l'erreur, à reconfirmer après migration.
- **Pourquoi les pages à image perdent des points** : le LCP *observé* est bon (0,3 à 0,5 s en local) ; c'est le LCP *simulé* (4G lente, CPU ralenti) qui monte à 3,5–4,4 s. Cause : le LCP est une image (logo, ou image d'en-tête de la page catégorie) en concurrence avec les polices préchargées (≈ 90 Ko), `hero_1.avif` (43 Ko) et le CSS bloquant (21 Ko, ≈ 300 ms). Noël (LCP textuel) est à 100. Autres constats : ≈ 140 Kio de JavaScript non utilisé (Supabase, index), image d'en-tête de la page catégorie 87 Ko servie à 412 px (≈ 35 Ko de gain possible).

Correctifs retenus (rendu inchangé), commit `perf: high-priority nav logo…` :
1. Logo de la barre de navigation : `loading="eager"`, `fetchpriority="high"`, `decoding="async"` (c'est le LCP de /portfolio ; gain ≈ +1).
2. Accueil : le préchargement du logo reprenait la variante 280 px alors que l'écran mobile charge la 404 px (23 Ko téléchargés pour rien) ; il utilise maintenant le même `srcset`/`sizes` que l'image affichée (gain ≈ +1).

Non fait, volontairement : générer des variantes plus petites de l'image d'en-tête de la page catégorie (nouveaux fichiers d'images, hors « sans changer le rendu » strict), retirer des préchargements de polices (risque de FOUT visible), scinder le JavaScript (chantier plus large). Les gains restants sont petits (≈ 1 à 3 points) ; le score mobile réel sera à remesurer en production derrière Cloudflare (HTTP/2, compression, cache).

**Photos Supabase** : non mesurées, car rien n'est importé. À refaire après l'import : variantes AVIF/WebP déjà servies en `srcset` par `CategoryGalleries`/`CategoryGallery`.

### Prettier
Commit dédié `style: prettier --write on src` : 8 fichiers reformatés, aucun changement de logique ; typecheck, 245 tests et build restent verts. Le lint contient encore des erreurs prettier hors de `src/` (ex. `vite.config.ts`, scripts) : non touchées.

### `src/data/admin-guide.ts`
Fichier non suivi (221 lignes, guide d'aide de l'admin). **Aucune référence** dans le code et la page `src/routes/admin/_authed/aide.tsx` annoncée dans son en-tête **n'existe pas**. Recommandation : **ne pas le committer seul** (fichier mort). Le committer avec la page d'aide et son lien dans le menu admin, ou le garder hors dépôt.

## Simulation d'import des photos (11 novembre 2026)
Lancée : `node scripts/photos-storage/import-photos.mjs --plan-only --profile q55` (4 puis 170 photos) et la simulation complète `... --profile q55` (sans `--apply`). Aucune clé exigée : la simulation ne contacte aucun service ; seul un journal prévisionnel est écrit hors dépôt (`../soleana-originaux/storage-variants/journals/dry-run-*.jsonl`). Aucune écriture Supabase, aucun upload, aucun correctif nécessaire.

**Résultat : 170 photos, 1 360 variantes (126,26 Mo), 190 emplacements.**
- 8 variantes par photo : 4 largeurs (400/800/1200/1600) × AVIF et WebP ; 1 360 chemins Storage uniques.
- Brouillon : photos `published=false`, `category_id=NULL`, `on_home=false`, `on_portfolio=false` ; placements `published=false` (170 lignes photo et 190 lignes placement de la simulation).
- Clés Storage : toutes de la forme `galleries/<catégorie>/<12 hex>/<8 hex>-<largeur>.<avif|webp>` ; aucun nom de client ni de fichier.
- Réutilisations : 20 photos placées deux fois, toutes dans la page Famille (gallery-1 et gallery-2) ; 170 photos pour 190 emplacements.
- Cadrage : `object_position_x_pct` / `y_pct` présents et compris entre 0 et 100 sur les 190 placements.
- Ordre : `display_order` contigu 0..n-1 dans les 8 galeries (11, 20, 47, 20, 10, 17, 53, 12). Contrôle par SHA-256 des 190 WebP actuels du dépôt, triés comme le site (`localeCompare` sur le nom sans extension) : 190 sur 190 concordent avec le manifeste.
- Noël (74 photos) : absent du manifeste, donc exclu.

**Écart de périmètre (à décider par Paul, non modifié)** : la consigne parlait de 190 photos (170 galeries + 4 portfolio + 16 autres). Le manifeste et l'importeur de la phase 1 couvrent **170 photos / 190 emplacements** : les galeries des 4 pages SEO uniquement. Les 4 portfolio, 4 hero accueil, 1 portrait accueil, 9 À propos et 2 fonds (20 photos) ne sont pas dans `manifest-phase1.json` ; `docs/photos-storage-plan.md` les compte dans les « 190 validées » mais prévoit leur import après les galeries (le README précise « pas l'accueil, pas À propos »). « 190 » dans la simulation désigne les emplacements. Étendre le manifeste est une décision produit : je n'y ai pas touché.

### Import réel (Paul, après migrations 00003 et 00004 et contrôle postflight)
Terminal contrôlé ; la clé service_role se saisit en mémoire, jamais dans un fichier :
```
export SUPABASE_URL=https://<projet>.supabase.co
read -rsp 'Clé service_role : ' SUPABASE_SERVICE_ROLE_KEY; echo; export SUPABASE_SERVICE_ROLE_KEY
# 1. essai sur 4 photos, contrôle des lignes, puis rollback du journal de cet essai
node scripts/photos-storage/import-photos.mjs --apply --confirm <projet>.supabase.co --profile q55 --limit 4
# 2. import complet en brouillon
node scripts/photos-storage/import-photos.mjs --apply --confirm <projet>.supabase.co --profile q55
```
Prérequis : `SUPABASE_URL` et `SUPABASE_SERVICE_ROLE_KEY` ; les 1 360 variantes q55 présentes dans `../soleana-originaux/storage-variants` (`verify-variants.mjs` vert).

### Contrôle postflight
`docs/photos-storage/postflight-selects.sql` est du SQL en lecture seule, sans commande shell : l'ouvrir dans le SQL Editor Supabase et exécuter chaque bloc séparément, après 00003/00004 puis après chaque import (attendu après import complet : 170 photos, 1 360 variantes, 190 placements, tous non publiés, `category_id` NULL).

## Préparation de la bascule des galeries vers Storage (11 novembre 2026)
Rien n'a été modifié en production : aucune écriture Supabase, aucun déploiement, aucun import. Un build local avec l'interrupteur a seulement servi à vérifier que le code compile (`dist/` est ignoré par git).

### 1. Publier photos et placements, sans catégorie
**Moyen sûr existant, rien à écrire** : `import-photos.mjs --publish-existing` (déjà dans le dépôt, testé en simulation).
- Il ne touche que les lignes dont la `source_key` / `placement_key` figure dans le manifeste (170 photos, 190 placements), par lots de 100.
- Il **refuse** de publier si une photo a `category_id` non NULL, `on_home` ou `on_portfolio` vrai.
- Il ne fait que `published=false → true` (`.eq("published", false)`), vérifie que chaque placement pointe sa photo, et journalise chaque ligne modifiée dans `../soleana-originaux/storage-variants/journals/`.
- Retour arrière : `rollback-import.mjs` sur ce journal remet `published=false` (lignes `publish_photo` / `publish_placement`) sans rien supprimer.
- Dans l'admin, la même opération existe photo par photo (bascule « Publié » de l'emplacement) : trop lent pour 190 lignes.

Commandes (Paul ; `SUPABASE_URL` et clé service_role en mémoire, comme pour l'import) :
```
node scripts/photos-storage/import-photos.mjs --publish-existing --profile q55            # simulation
node scripts/photos-storage/import-photos.mjs --publish-existing --profile q55 --limit 4 --apply --confirm <projet>.supabase.co   # essai
node scripts/photos-storage/import-photos.mjs --publish-existing --profile q55 --apply --confirm <projet>.supabase.co
```
Ensuite : `postflight-selects.sql` (170 photos / 190 placements publiés).

**Rattacher la catégorie : à ne PAS faire.** Le code n'en a pas besoin et le rattachement ajouterait un risque :
- Les galeries SEO lisent `photo_placements` (contexte `seo`, via `seo_page_id` + `slot`) ; les pages `/portfolio/<catégorie>` lisent les mêmes placements via la page SEO de la catégorie (`CATEGORY_SEO_SLUG` dans `src/lib/photo-storage.ts`). `photos.category_id` n'est lu que par le chemin hérité (`CategoryGallery`, `CategoryGallerySection` sans photos manuelles).
- Poser `category_id` + `published=true` ferait apparaître ces photos dans ce chemin hérité (jusqu'à 9 par galerie, sans cadrage ni AVIF) et l'importeur refuse justement ce cas. La catégorie reste donc portée par la page SEO du placement. Aucun SQL n'est fourni : si un besoin produit apparaît (filtre par catégorie dans l'admin), c'est une décision à part.

**Ce que la publication change en production aujourd'hui : rien de visible.** Avec l'interrupteur éteint, le site public ne lit jamais `photo_placements` ni `photo_variants`, et ses lectures de `photos` filtrent sur `category_id` (NULL ici). Publier avant la préversion est donc sans effet sur le site actuel, et c'est nécessaire : la préversion lit la même base, et la RLS publique masque les brouillons.

### 2. Préversion Cloudflare (sans toucher à la production)
Build : `VITE_GALLERIES_FROM_STORAGE=true npm run build` (vérifié : passe ; l'interrupteur est lu au build, pas à l'exécution). Les autres `VITE_*` (Supabase) viennent de `.env` comme d'habitude.
Publication : 
```
npx wrangler versions upload --message "preview galeries Storage"
```
`versions upload` crée une version **non déployée** : `wrangler deploy` n'est jamais appelé, la route `soleanastudio.fr/*` continue de servir la version active. L'URL de préversion est affichée à la fin (forme `https://<id>-soleana-studio.<sous-domaine>.workers.dev`) ; elle exige que les URL de préversion / workers.dev soient actives pour ce Worker (Cloudflare → Workers → soleana-studio → Settings → Domains & Routes). Ne pas lancer `wrangler versions deploy`. Piège : `npm run deploy:cf` reconstruit *sans* le flag puis déploie en production ; ne pas l'utiliser pour la préversion. Le build suivant sans variable redonne le site actuel.
Limite : la préversion et la production partagent la même base Supabase ; `sitemap.xml` de la préversion liste les 4 pages `/portfolio/<catégorie>` (absentes du sitemap de production).

### 3. Checklist préversion ↔ site actuel
Ouvrir côte à côte `https://soleanastudio.fr` et l'URL de préversion, mobile et ordinateur.
- [ ] Pages galeries SEO : `/photographe-grossesse-marseille`, `-famille-`, `-couple-`, `-portrait-` : même nombre de photos par galerie (grossesse 11 + 20, famille 47 + 20, couple 10 + 17 + 53, portrait 12), même titre, même texte, même mise en page.
- [ ] Ordre : première photo (mise en avant) et suite identiques ; contrôler au moins la 1re, la 5e et la dernière de chaque galerie ; les 20 photos réutilisées de Famille apparaissent dans les deux galeries.
- [ ] Textes alternatifs : inspecter 3 `<img>` par page (« Séance photo … - photo N ») ; identiques au site actuel.
- [ ] Cadrage : vignettes et photo principale cadrées comme avant (`object-position` 50 % 50 % partout au départ) ; tester un portrait vertical dans le cadre 16/10.
- [ ] Format : `<picture>` AVIF puis WebP, `srcset` 400/800/1200/1600 ; onglet Réseau : AVIF servi sur Chrome/Firefox, WebP sur Safari ancien ; pas de requête vers les fichiers locaux.
- [ ] Lightbox : ouverture, flèches clavier, fermeture, focus.
- [ ] `/portfolio` : identique à aujourd'hui (cartes catégories, liens) ; `/portfolio/grossesse`, `/famille`, `/couple`, `/portrait` : s'affichent (404 aujourd'hui), photos dédupliquées, hero et sections inchangés, liens « catégories liées » valides.
- [ ] `/sitemap.xml` préversion : les 4 URLs `/portfolio/<catégorie>` en plus, rien d'autre de changé ; titres et balises canoniques des 4 pages.
- [ ] Poids et vitesse : Lighthouse mobile sur une page galerie (LCP, CLS : pas de décalage, dimensions fournies).
- [ ] Console : aucune erreur `[photo_placements]` (sinon repli local silencieux : à investiguer).
- [ ] Contrôles non visuels : accueil, À propos, Noël, `/admin` inchangés.

### 4. Ce qui s'affiche avec `VITE_GALLERIES_FROM_STORAGE=true`
Code lu : `src/routes/$slug.tsx` (loader, `SeoPage`), `src/lib/photo-storage.ts`, `CategoryGallerySection.tsx`, `CategoryGallery.tsx`, `src/routes/portfolio*.tsx`, sitemap, et la politique RLS de `photo_placements`.

**Tant que les photos sont en brouillon (état actuel de la production)** : la RLS publique ne renvoie aucun placement non publié, donc la requête réussit avec **0 ligne**, et `loadStorageGalleries` renvoie `{}` (et non `null`).
- Les 4 pages SEO affichent leurs galeries **vides** : « Galerie en cours de remplissage… ». Il n'y a **pas** de repli sur les fichiers locaux : le repli (`null`) ne se produit qu'en cas d'erreur de lecture ou de table absente, pas pour une réponse vide (comportement voulu dans le code : « une galerie volontairement vide reste vide »). Textes, titres et SEO de la page restent.
- `/portfolio/<catégorie>` : s'affiche (BUG-02 actif) avec « Galerie en cours de remplissage... » (aucune photo Storage, repli sur la table `photos` par `category_id`, vide aujourd'hui).
- Le sitemap liste déjà les 4 pages catégories, donc des pages quasi vides seraient annoncées aux moteurs de recherche.
- **Conclusion : ne jamais activer l'interrupteur en production avant la publication.** Une préversion avec photos en brouillon montre des galeries vides : publier d'abord (section 1).

**Une fois publiées** (photo `published` ET placement `published` ET page SEO publiée) :
- Chaque galerie `gallery-N` est remplie, dans l'ordre `display_order`, depuis les placements ; une photo sans variantes AVIF et WebP aux mêmes largeurs est ignorée (la galerie compte alors une photo de moins, à repérer avec le décompte ci-dessus).
- Rendu : `<picture>` AVIF/WebP, `srcset` 400→1600, `object-position` du placement, texte alternatif du placement (sinon celui de la photo), dimensions de la plus grande variante.
- Images servies par l'URL publique du bucket Supabase, ou par `VITE_IMAGE_BASE_URL` si définie (non définie : à décider avant la bascule).
- `/portfolio/<catégorie>` : toutes les photos de la page SEO correspondante, galeries concaténées dans l'ordre des slots, doublons retirés (donc 11+20, 47+20 sans les 20 doublons de Famille → 47 photos distinctes, etc.).
- Retour arrière : retirer la variable et reconstruire/déployer (les fichiers locaux sont toujours dans le dépôt) ; ou dépublier avec le journal de `rollback-import.mjs`, mais cela laisserait des galeries vides tant que l'interrupteur est actif.

## Vérifications après import et galeries d'événements (11 novembre 2026)
Aucune écriture Supabase, aucun déploiement, aucune publication, aucun import, aucune migration. Les contrôles réseau ont été faits en lecture seule avec la clé publique (chargée par `node --env-file=.env` dans un script hors dépôt ; je n'ai pas lu ni affiché le contenu de `.env`).

### Partie 1 : résultats
**1. Variantes accessibles : 1 360 sur 1 360 conformes, 0 échec.**
Les 1 360 chemins viennent de `variants-index.json` (hors dépôt). Pour chacun : requête HEAD puis GET `Range: bytes=0-0` (1 octet, pas de téléchargement) sur `/storage/v1/object/public/photos/<chemin>`.
- Statut 200 (HEAD) et 206 (GET partiel) partout ; content-type exact (680 `image/avif`, 680 `image/webp`) ; taille identique à l'index (HEAD `content-length` et `content-range`).
- `cache-control` : **`public, max-age=31536000`** sur les 1 360 (un an). Piège : la réponse **HEAD** de Supabase annonce `private, no-cache` ; c'est le comportement de HEAD, pas des objets. Seul le GET reflète ce que verra un navigateur (confirmé : `cf-cache-status: HIT`). Ne pas conclure d'un HEAD seul.
- Limitation de débit : à 16 requêtes en parallèle, Supabase répond **429** (256 sur 1 360 au premier essai). Le contrôle final a été fait à 4 en parallèle avec reprise ; il a duré 8 minutes. À connaître si un test de charge est un jour fait sur ce bucket.
- Hôte interrogé : `kvzzzwjddanwedzotaka.supabase.co` (celui de `VITE_SUPABASE_URL` dans `.env`). **Écart à vérifier** : `supabase/config.toml` indique un autre `project_id` (`hvfvvbiupyzoounzyqoz`). Les 1 360 objets existent bien sur l'hôte du `.env`, qui est donc celui où l'import a été fait ; vérifier que c'est le projet de production voulu et que `config.toml` est simplement périmé.

**2. Sécurité en accès anonyme (clé publique) : conforme.**
- Lecture : `photos` (toutes, brouillons ou non), `photo_placements` et `photo_variants` renvoient **0 ligne** (aucun brouillon lisible, rien de publié). Les tables du suivi de capacité (`photo_storage_usage`, `storage_deletion_outbox`) sont introuvables (404) côté anonyme.
- Écriture : un INSERT anonyme est refusé (HTTP 401, code Postgres `42501`, « violates row-level security policy ») sur `photos`, `categories`, `photo_variants`, `photo_placements`, `seo_pages` ; sur `events`, refus par absence de droit (`42501`, pas de GRANT INSERT à `anon`). Méthode sûre : chaque INSERT mettait NULL dans une colonne obligatoire, donc même une politique trop permissive n'aurait rien écrit (erreur 23502 attendue seulement en cas de faille ; elle n'est jamais apparue).
- **Non testés par l'API, par prudence** (aucun test sans risque d'écriture) : UPDATE et DELETE anonymes, et l'envoi anonyme dans le bucket. Une réponse à 0 ligne est identique que la politique refuse ou non, et un envoi de test aurait écrit un fichier. À vérifier par `postflight-selects.sql` (bloc des politiques) ; les migrations n'accordent l'écriture qu'à `has_role(admin)`.
- Bucket : le listing public est **refusé** (`POST /object/list/photos` renvoie `[]`, y compris sous `galleries/`) alors que les URLs directes répondent 200 ; une URL de dossier renvoie 404.

**3. Préversion avec `VITE_GALLERIES_FROM_STORAGE=true` : compile.** Build vert ; le worker a été lancé en local (`wrangler dev --local`, aucun déploiement) et les pages rendues en HTML : `/photographe-couple-marseille` (200, 3 galeries `gallery-…-1..3`, 0 `<img>` de galerie, texte « Galerie en cours de remplissage… »), `/portfolio/couple` (200, même message), `/portfolio` (200, 6 images, inchangé), `/sitemap.xml` (liste les 4 `/portfolio/<catégorie>`). **Cela confirme l'analyse du 11 novembre : tant que les photos sont en brouillon, le flag donne des galeries vides.** `dist/` a été reconstruit sans le flag (propre).

**Comment fixer le flag pour la production** (non appliqué) : `npm run deploy:cf` = `npm run build && wrangler deploy` ; npm transmet l'environnement du shell à Vite, qui lit les `VITE_*` du processus avant les fichiers `.env`. Aucun changement de code n'est donc nécessaire pour un déploiement ponctuel : `VITE_GALLERIES_FROM_STORAGE=true npm run deploy:cf`. Un `.env.production` marcherait aussi mais `.env.*` est ignoré par git : réglage invisible et non reproductible. Changement minimal proposé, dans `package.json` :
```
"preview:cf": "VITE_GALLERIES_FROM_STORAGE=true npm run build && wrangler versions upload",
"deploy:cf:storage": "VITE_GALLERIES_FROM_STORAGE=true npm run deploy:cf"
```
`deploy:cf` reste sans flag (retour arrière = relancer ce script). Une fois les galeries validées, on peut faire basculer `deploy:cf` lui-même (commit relu, historique clair).

**4. Impossible à vérifier sans navigateur ni publication : à tester à la main**
- Rendu réel avec photos **publiées** : tout le chemin « galerie remplie » (décompte par galerie, ordre, `<picture>` AVIF/WebP, `srcset`, cadrage, texte alternatif) : les lectures anonymes renvoient 0 ligne tant que rien n'est publié.
- Lightbox, clavier, focus, mise en page mobile/ordinateur, absence de décalage (CLS), Lighthouse.
- Format réellement servi par navigateur (AVIF vs WebP) ; Safari/iPhone.
- Préversion Cloudflare : URL de préversion active ? (réglage du tableau de bord).
- Admin : envoi, réordonnancement, suppression, double authentification ; test d'écriture avec session aal2 (créer puis supprimer un élément de test).
- UPDATE/DELETE anonymes et envoi anonyme dans le bucket (voir plus haut) via `postflight-selects.sql`.
- Sitemap et indexation réelle côté Google après bascule.

### Partie 2 : galeries de photos par événement
**État des lieux** (déjà là avant cette session) : contexte `event` de `photo_placements` (migration 000003 amendée) ; colonnes `events.galleries` et `gallery_reference_event_id` (migration 20261110, **à appliquer** si ce n'est pas fait) ; admin Événements : `EventGalleriesAdmin` dans la fiche (créer, renommer, réordonner et supprimer une galerie vide, envoyer des photos, ordre, publication, texte alternatif, retrait, « Édition précédente ») ; `uploadEventPhoto` (réencodage AVIF/WebP dans le navigateur, nettoyage en cas d'échec) ; lecture `loadEventGalleries` + `loadGalleryGroups` ; affichage `EventGallerySection` dans `EventPage` (galeries de l'événement puis « Édition précédente » si l'événement référencé est publié). Expiration d'affichage : non touchée.

**Ce qui manquait et a été fait** (2 commits, tests inclus) :
- `0af236f` : `src/lib/photos/upload-target.ts` (+ tests, 6) : choix des galeries d'un événement, validation et calcul de l'ordre, libellé « Événement · Galerie ».
- `bb46af2` : admin **Photos** : nouvelle destination « Événement » dans « Ajouter une photo » (événement, galerie de l'événement, ordre, cadrage, publication), qui réutilise `uploadEventPhoto` ; les cartes de la bibliothèque indiquent « Galerie d'événement : Événement · Galerie ». Les erreurs d'écriture passent par `toastAdminError` (`write-error.ts`) ; les erreurs de saisie gardent leur message. La destination reste masquée tant que la colonne `galleries` n'existe pas (migration 20261110 non appliquée).
- Aucune migration nouvelle. Les 74 photos de Noël ne sont ni importées ni ajoutées au manifeste.

**Reste à décider / à savoir**
- **Les galeries d'événement ne s'affichent qu'avec `VITE_GALLERIES_FROM_STORAGE=true`** (même interrupteur que les galeries SEO, `src/lib/events/queries.ts`). Tant qu'il est éteint, la photographe peut les préparer mais rien n'apparaît sur la page. Si elle doit publier avant la bascule des galeries SEO, il faut un interrupteur séparé (petit changement, décision à valider).
- Le cadrage n'est pas réglable pour les photos d'une galerie d'événement dans la fiche (valeur 50/50 ; réglable à l'envoi depuis l'admin Photos, pas ensuite).
- Photos uploadées via l'admin : `photos.published=true` et `category_id` = catégorie « Événement » : comme pour les galeries SEO, ce chemin peut les exposer à l'affichage hérité par catégorie ; à garder en tête (non modifié).

### Points à tester à la main (Partie 2)
1. Fiche événement de test (créer, puis supprimer) : créer une galerie « Édition précédente », envoyer 2 photos, vérifier ordre, texte alternatif, publier.
2. Admin Photos : destination « Événement » → les mêmes photos apparaissent ; la carte affiche « Galerie d'événement » ; l'ordre déjà pris est refusé.
3. Avec une session sans double authentification : le message « double authentification » du helper s'affiche (à la place de « droits nécessaires »).
4. Page publique de l'événement en préversion avec le flag : galeries sous la fiche, puis « Édition précédente » depuis l'événement référencé (publié seulement).
5. Mobile : sélecteurs de la destination « Événement » et envoi depuis un iPhone.

### Trois prochaines actions pour Paul
1. Vérifier le projet Supabase (`.env` : `kvzzzwjddanwedzotaka` vs `config.toml` : `hvfvvbiupyzoounzyqoz`) et lancer `postflight-selects.sql` (politiques UPDATE/DELETE, bucket).
2. Publier les 170 photos (`--publish-existing`, essai sur 4 puis tout), puis préversion (`npm run build` avec le flag + `wrangler versions upload`) et dérouler la checklist ci-dessus.
3. Appliquer la migration `20261110000000_event_galleries.sql` si ce n'est pas fait, tester une galerie d'événement de bout en bout, et décider d'un interrupteur séparé pour les galeries d'événement.

## Déploiement sans flag, préversion et mesures (11 novembre 2026, autonomie)
Cadre : déploiement de production demandé explicitement par Paul pour cette séance (exception à la règle « ne jamais déployer » de CLAUDE.md), **sans** `VITE_GALLERIES_FROM_STORAGE`. Aucune migration, aucun import, aucune écriture Supabase, aucun secret lu ni écrit.

### 1. Déploiement de production sans flag : fait, site identique
- Typecheck, build, 257 tests verts ; branche poussée (`origin/photos-storage-v2`) ; `npm run deploy:cf` (flag absent de l'environnement vérifié) → version **05e26e6a-4285-4d69-af36-12032f452461**, 100 % du trafic (toujours le cas à la fin de la séance).
- Comparaison avant/après (capture de `soleanastudio.fr` avant le déploiement, puis après) sur 16 URLs : accueil, portfolio, prestations, à propos, FAQ, contact, 4 pages galeries SEO, lifestyle, Noël (`/mini-seances-noel-2026`), `/portfolio/couple`, une 404, `sitemap.xml`, `robots.txt`. Codes HTTP identiques (200, 404 pour l'inexistante), `sitemap.xml` et `robots.txt` octet pour octet, en-têtes identiques (hors date/identifiants). Le HTML est identique une fois les noms de fichiers hachés neutralisés ; seule différence : une nouvelle précharge de chunk `vendor-zod` (+98 octets par page), conséquence du découpage du build. Aucun écart de contenu.

### 2. Publication des 170 photos : NON FAITE
`SUPABASE_URL` et `SUPABASE_SERVICE_ROLE_KEY` sont absentes de l'environnement de la séance (testé sans rien afficher) ; je ne les ai cherchées nulle part. **Les photos et placements sont toujours en brouillon.** Commandes à lancer par Paul, dans l'ordre (voir « Préparation de la bascule », section 1) :
```
export SUPABASE_URL=https://kvzzzwjddanwedzotaka.supabase.co
read -rsp 'Clé service_role : ' SUPABASE_SERVICE_ROLE_KEY; echo; export SUPABASE_SERVICE_ROLE_KEY
node scripts/photos-storage/import-photos.mjs --publish-existing --profile q55                       # simulation
node scripts/photos-storage/import-photos.mjs --publish-existing --profile q55 --limit 4 --apply --confirm kvzzzwjddanwedzotaka.supabase.co
node scripts/photos-storage/import-photos.mjs --publish-existing --profile q55 --apply --confirm kvzzzwjddanwedzotaka.supabase.co
```
Retour arrière si besoin : `scripts/photos-storage/rollback-import.mjs` sur le journal produit.

### 3. Préversion avec le flag
- `VITE_GALLERIES_FROM_STORAGE=true npm run build` puis `npx wrangler versions upload` → version **af1a6b4d-58b0-4d55-9c70-aad083b45951** (« preview galeries Storage », `has_preview: true`). `versions deploy` jamais utilisé ; la production est restée à 100 % sur 05e26e6a (vérifié avec `wrangler deployments status`).
- **URL de préversion : non obtenue.** `versions upload` n'affiche pas d'URL et je n'ai pas le sous-domaine `workers.dev` du compte (le récupérer par l'API aurait demandé d'extraire un jeton : non fait). Forme attendue : `https://af1a6b4d-soleana-studio.<sous-domaine>.workers.dev` (Cloudflare → Workers → soleana-studio → Versions ; ou onglet de la version 54). L'en-tête `Cloudflare-Workers-Version-Overrides` ne marche pas : la version n'est pas dans le déploiement actif.
- **Checklist de comparaison : non déroulée** sur la préversion (URL absente et photos encore en brouillon, donc aucune galerie remplie). Sur le même build servi en local (`wrangler dev --local`, base de production en lecture seule), l'état « brouillon + flag » est confirmé : galeries SEO et `/portfolio/couple` en « Galerie en cours de remplissage… ». Comptage contre le manifeste (170 photos, 190 emplacements ; 11+20, 47+20, 10+17+53, 12) : à faire après publication.
- **Lighthouse mobile** (build avec flag, `wrangler dev` local, Chrome headless, mêmes réglages que la séance précédente) :

| Page | Perf | A11y | BP | SEO | LCP | Avant |
|---|---:|---:|---:|---:|---:|---:|
| Accueil | 86 | 100 | 100 | 100 | 4,3 s | 86 |
| /portfolio | 90 | 96 | 100 | 100 | 3,7 s | 90 |
| /portfolio/couple | 85 | 100 | 100 | 100 | 4,4 s | 85 |
| /photographe-couple-marseille | 100 | 96 | 100 | 100 | 0,9 s | n/m |

Aucune régression ; aucun correctif de performance appliqué (rien à corriger sans changer le rendu). **Le 100 de la page SEO couple est trompeur** : la galerie est vide (brouillon) ; elle doit être remesurée une fois les photos publiées (images AVIF/WebP, LCP probablement une photo). Accessibilité 96 sur cette page : à examiner à ce moment-là.
- `dist/` reconstruit **sans** le flag (propre).

### 4. Nettoyages
- `supabase/config.toml` : `project_id` = `kvzzzwjddanwedzotaka` (commit 531800f). Restent mentionnant l'ancien projet : `AUDIT.md`, des docs, et la CSP de `src/server.ts` (autorise les deux hôtes) ; non modifiés, la CSP pourra être resserrée plus tard.
- `src/data/admin-guide.ts` : non commité, laissé tel quel.

### À tester à la main
1. **Publier** les 170 photos (commandes ci-dessus), puis lancer `postflight-selects.sql` (170 photos et 190 placements publiés, `category_id` NULL).
2. Obtenir l'URL de préversion (version af1a6b4d ou en rééditer une après publication) et la comparer au site actuel : 4 pages SEO (décompte par galerie : grossesse 11+20, famille 47+20, couple 10+17+53, portrait 12), ordre (1re, 5e, dernière), textes alternatifs, cadrage, `/portfolio/<catégorie>` (47 photos distinctes pour Famille), sitemap (+4 URLs).
3. Rendu visuel mobile et ordinateur, lightbox (ouverture, flèches, Échap, focus), absence de décalage ; **Safari/iPhone** : AVIF/WebP, lightbox, envoi de photo depuis l'admin ; réseau : AVIF servi sur Chrome.
4. Lighthouse mobile réel de la préversion avec photos publiées (surtout les pages galeries, accessibilité 96).
5. Admin : session **sans** double authentification (message dédié), puis avec aal2 : créer/supprimer un élément de test, envoi d'une photo (page du site et destination « Événement »), galerie d'événement de bout en bout (nécessite la migration `20261110`).
6. Console navigateur : aucune erreur `[photo_placements]`.

### Commande exacte de la bascule finale (après validation visuelle)
```
VITE_GALLERIES_FROM_STORAGE=true npm run deploy:cf
```
(`deploy:cf` = build puis `wrangler deploy` ; npm transmet la variable à Vite.) Retour arrière : `npm run deploy:cf` sans la variable (ou `wrangler rollback` vers 05e26e6a). Ne la lancer qu'après publication des photos : avec des brouillons, les galeries sont vides.

## Phase A et B après publication par Paul (11 novembre 2026)
Aucune clé disponible dans ma session (comme demandé : lecture publique uniquement, clé anon via `node --env-file=.env`, `.env` jamais lu ni affiché). Aucune écriture Supabase, aucune migration, aucun déploiement de production.

### Phase A : résultats
| Critère | Attendu | Constaté |
|---|---|---|
| Photos | 170, toutes publiées | 170 lisibles par anon, 170 `published=true` ✔ |
| `category_id` / `on_home` / `on_portfolio` | aucun | 0 / 0 / 0 ✔ |
| Placements publiés | 190 | **0 lisible par anon ✘** |
| Variantes lisibles | 1 360 | **0 lisible par anon ✘** (la RLS des variantes exige un placement publié) |
| Pages SEO publiées | 5 | 5 ✔ |
| Objets du bucket (1 360) | présents | non recontrôlés (listing refusé à anon) ; contrôle précédent 1 360/1 360 |
| Site public (flag éteint) | identique | production toujours sur 05e26e6a, 100 % ; page couple 200, sitemap sans `/portfolio/` ✔ |

**Écart de données, à traiter par Paul** : les journaux de publication (`../soleana-originaux/storage-variants/journals/import-2026-11-11T19-43-57-454Z.jsonl` et `…58-576Z.jsonl`) contiennent 4 + 166 lignes `publish_photo` et **aucune** `publish_placement`. Les photos ont été publiées mais pas les 190 placements (étape probablement interrompue ou en erreur : relire la sortie du terminal). Tant que les placements sont en brouillon, la RLS masque placements et variantes : avec le flag, les galeries restent vides. Je n'ai pas les droits d'écriture ; relancer la même commande reprend là où elle s'est arrêtée (`--publish-existing` ne touche que `published=false`) :
```
node scripts/photos-storage/import-photos.mjs --publish-existing --profile q55 --apply --confirm kvzzzwjddanwedzotaka.supabase.co
```
Puis contrôler : 190 placements et 1 360 variantes visibles en anon (je peux relancer `db.mjs`-équivalent).

**Non exécutés faute de placements visibles** (à refaire une fois publiés) : décompte par galerie (11+20, 47+20, 10+17+53, 12 ; Famille catégorie = 47), ordre vs manifeste, `<picture>`/`srcset`/alt/object-position, GET des URLs d'images (4 en parallèle), console `[photo_placements]`, sitemap +4 URLs, Lighthouse avec vraies photos (références : 86 / 90 / 85). Les mesures Lighthouse avec brouillons restent celles de la séance précédente (86 / 90 / 85 / SEO 100, galerie vide).

### Préversion
`VITE_GALLERIES_FROM_STORAGE=true` + `wrangler versions upload` → version **64682c0f-5256-437e-b3d7-c56941178d3a** (code de la Phase B incluse). Jamais de `versions deploy`. Production inchangée (05e26e6a, 100 %). `dist/` reconstruit sans le flag. URL de préversion : non affichée par la commande ; Cloudflare → Workers → soleana-studio → Versions → 64682c0f (forme `https://64682c0f-soleana-studio.<sous-domaine>.workers.dev`). La précédente préversion af1a6b4d est obsolète.

### Phase B : fait (3 commits, 267 tests verts, typecheck et build verts)
1. **Un seul interrupteur** : inchangé, galeries d'événement derrière `VITE_GALLERIES_FROM_STORAGE`.
2. **Photos « Événement » exposées par catégorie : corrigé** (fff9511). Cause : `uploadEventPhoto` créait la photo avec `category_id` = catégorie « evenement » et `published=true` ; `CategoryGallery` et `CategoryGallerySection` lisent `photos` par `category_id` + `published`, donc ces photos auraient pu apparaître dans l'affichage hérité. Maintenant `category_id = NULL` (`on_home` et `on_portfolio` déjà faux) : la photo n'est visible que par son emplacement `event` (galerie de l'événement, selon le statut de l'événement). Le paramètre `categoryId` est supprimé de l'envoi, de l'admin Photos et de la fiche événement ; `eventCategoryId` supprimé. Test ajouté (`category_id` null, `on_home`/`on_portfolio` faux). Aucune migration. Photos d'événement déjà envoyées avant ce correctif : elles gardent leur catégorie ; à vérifier dans l'admin (aucune, tant que la migration `20261110` n'est pas appliquée et que rien n'a été envoyé).
3. **Cadrage réglable dans la fiche événement** (8de487a) : curseurs horizontal/vertical par photo avec aperçu, bouton « Enregistrer le cadrage », valeurs 0–100 validées (`normalizeFraming`, message français) ; le site public utilisait déjà `object_position_*`. Tests : bornes, NaN, interface.
4. **Cohérence de bout en bout** : tests ajoutés (`gallery-admin.test.ts`) sur ordre (trous, extrémités, photo inconnue), titres vides, identifiants de galeries distincts, déplacement borné ; les tests existants couvrent l'envoi multiple, l'échec partiel, « Édition précédente » et l'événement référencé non publié (`EventGalleriesPage.test.tsx`, `EventGalleries.test.tsx`). Les écritures passent déjà par `toastAdminError` (`write-error.ts`). Non couvert par des tests automatisés : la suppression d'événement avec photos (le comportement dépend des clés étrangères en base, à tester à la main).
5. **Noël, dry-run** (commit `chore(photos): dry-run manifest…`) : `node scripts/photos-storage/noel-event-manifest.mjs` → `docs/photos-storage/manifest-noel-event.json`. **74 photos, 74 emplacements, 592 variantes prévues** : Séance 1 (13), Séance 2 (11), Séance 3 (19), Séance 4 (12), Décor (19) ; les 6 fichiers hero sont ignorés. Aucun import, `legacy-noel.ts` non modifié. **Décisions pour Paul** : (a) titres des galeries (proposés, à valider) ; (b) la source est le WebP 1600 px du dépôt (pas d'original Noël hors dépôt) : acceptable pour un affichage à 1600 px, pas de zoom plus fin ; (c) textes alternatifs génériques à remplacer par de vrais textes ; (d) un script d'import réel pour le contexte `event` reste à écrire (l'importeur actuel ne gère que les pages SEO) ou envoi via l'admin ; (e) la migration `20261110` doit être appliquée avant.
6. Expiration d'affichage des événements : inchangée.

### Pas de déploiement de production
La Phase B a livré du code, mais la Phase A n'est pas au vert côté données (placements), et rien n'oblige à déployer : pas de déploiement, donc pas de comparaison de 16 URLs. Le code Phase B n'est donc que dans la préversion et dans le dépôt.

### Non vérifiable sans navigateur
Rendu visuel, lightbox, curseurs de cadrage, Safari/iPhone, envoi de photo, session aal2, Lighthouse avec photos.

### À tester à la main
1. Relancer la publication des placements, puis vérifier 190 placements / 1 360 variantes en anon.
2. Ouvrir la préversion 64682c0f et comparer aux pages SEO actuelles (décomptes, ordre, alt, cadrage, `/portfolio/<catégorie>`, sitemap +4).
3. Lightbox (ouverture, flèches, Échap, focus), mobile et ordinateur, Safari/iPhone (AVIF/WebP).
4. Admin avec double authentification : fiche événement de test (créer puis supprimer) : galerie, envoi de 2 photos, ordre, texte alternatif, **cadrage**, publication ; vérifier en base que `category_id` est NULL ; destination « Événement » de l'admin Photos ; suppression d'un événement ayant des photos.
5. Session sans double authentification : message dédié.
6. Lighthouse mobile de la préversion avec photos publiées (références 86 / 90 / 85).

### Bascule finale (seulement après 1 à 4 et ta validation)
```
VITE_GALLERIES_FROM_STORAGE=true npm run deploy:cf
```
Retour arrière : `npm run deploy:cf` sans la variable, ou `wrangler rollback` vers 05e26e6a.

## Contrôles de la Phase A après publication des placements (11 novembre 2026)
Lecture publique uniquement (clé anon via `node --env-file=.env`, `.env` jamais lu ni affiché). Aucune écriture Supabase, aucune migration, aucun déploiement. Production toujours sur 05e26e6a (100 %).

### Résultats (tous au vert)
| Critère | Attendu | Constaté |
|---|---|---|
| Photos publiées | 170 | 170 ; `category_id` / `on_home` / `on_portfolio` : 0 / 0 / 0 |
| Placements | 190 publiés | 190 lus en anon, 0 non publié |
| Variantes visibles en anon | 1 360 | **1 360** (les 0 d'avant venaient des placements en brouillon : la RLS des variantes exige un placement publié) |
| Décompte par galerie | 11+20, 47+20, 10+17+53, 12 | exactement ces valeurs, 8 galeries, aucune galerie inattendue |
| Famille en catégorie | 47 distinctes | 47 distinctes sur 67 placements |
| Ordre | identique au manifeste | **les 190** `placement_key` et `source_key` à la bonne position (1re, 5e, dernière de chaque galerie, et échantillon complet = tout) |
| Variantes par photo | AVIF+WebP × 400/800/1200/1600 | présentes pour les 190 emplacements, hauteur et largeur renseignées |
| Alt / cadrage | comme le manifeste | conformes (50 % / 50 %, « Séance photo … - photo N ») |
| HTML des 4 pages SEO (flag) | `<picture>` AVIF puis WebP | `<source avif>` puis `<source webp>` + `<img>` en `srcset` 400/800/1200/1600, `object-position:50% 50%`, largeur 1600 × hauteur 2000 (dimensions de la plus grande variante), alt « Séance photo … - photo 1 », `loading=lazy` |
| URLs d'images du HTML | 200 | **1 360 URL distinctes, 1 360 réponses 206 (GET Range 1 octet), 4 requêtes en parallèle, 0 échec** |
| Fichiers locaux | aucun | 0 référence à un fichier local de galerie dans les 4 pages |
| Erreurs `[photo_placements]` | aucune | 0 dans les journaux du serveur local |
| Sitemap | +4 URLs | 15 URLs en production, 19 avec le flag ; seule différence : `/portfolio/couple`, `/famille`, `/grossesse`, `/portrait` |
| Site sans flag vs production | identique | 16 URLs : mêmes codes ; HTML identique une fois les noms hachés neutralisés (accueil, à propos, galeries, portfolio, Noël…) ; sitemap identique. Seul écart : `robots.txt` (production 2 762 octets, local 86) : Cloudflare ajoute en production un bloc « Content-Signal » en tête ; notre fichier est le même |

Remarque de lecture : le HTML des pages SEO ne contient que la première photo de chaque galerie en `<picture>` ; les autres s'ouvrent dans la lightbox. Le décompte par galerie a donc été fait sur les données lues par le même code que le site (même requête que `loadStorageGalleries`), pas en comptant des `<img>`. `/portfolio/<catégorie>` charge ses photos côté navigateur : le HTML serveur ne contient ni photos ni message « en cours de remplissage ». Le rendu réel de ces 4 pages reste à voir dans un navigateur ; les données sont exactes (Famille = 47).

### Lighthouse mobile avec les vraies photos (build avec flag, `wrangler dev` local)
| Page | Perf | A11y | BP | SEO | LCP | Référence |
|---|---:|---:|---:|---:|---:|---:|
| Accueil | 86 | 100 | 100 | 100 | 4,3 s | 86 |
| /portfolio | 90 | 96 | 100 | 100 | 3,7 s | 90 |
| /portfolio/couple | 85 | 100 | 100 | 100 | 4,4 s | 85 |
| /photographe-couple-marseille | 100 | 96 | 100 | 100 | 1,1 s | n/m |
Aucune régression. Aucun correctif appliqué : tout gain restant demanderait de changer le rendu. Accessibilité 96 de la page SEO : un seul audit, contraste du texte doré `#c6966f` sur crème (2,43 pour 10 px ; couleur de la charte, non modifiée). Le LCP de la page galerie reste bas, car l'image du haut est en `loading=lazy`/`fetchpriority=low` : à surveiller sur mobile réel.

### Défaut corrigé : `import-photos.mjs --publish-existing`
Cause du blocage des placements : après avoir publié les photos, le script contrôlait les emplacements avec `photo.published` lu **avant** l'UPDATE (toujours faux) et s'arrêtait avec « Emplacement incomplet ou photo non publiée » ; les photos étaient publiées, les placements non. Correctif : la Map est mise à jour avec les lignes réellement publiées, et le contrôle est une fonction pure `findIncompletePlacement` (`import-plan.mjs`) testée (état périmé → bloque ; état à jour → passe ; emplacement absent ou autre photo → bloque). 270 tests, typecheck et build verts. Le correctif n'était plus nécessaire en pratique (placements publiés par Paul).

### État final
`dist/` reconstruit sans le flag. Préversion **64682c0f-5256-437e-b3d7-c56941178d3a** (avec le flag) toujours valable : seuls des scripts hors bundle ont changé depuis. URL : Cloudflare → Workers → soleana-studio → Versions → 64682c0f (non obtenue par ligne de commande). Plus rien ne bloque côté données.

### À tester à la main
1. Ouvrir la préversion 64682c0f : les 4 pages SEO (1re photo de chaque galerie, lightbox : ouverture, flèches, Échap, focus ; dernière photo de chaque galerie), mobile et ordinateur.
2. `/portfolio/grossesse`, `/famille`, `/couple`, `/portrait` : les photos apparaissent après chargement (Famille : 47), pas de message « en cours de remplissage » durable ; décalage de mise en page éventuel au chargement.
3. Safari / iPhone : AVIF ou WebP servi, lightbox.
4. Console navigateur : aucune erreur `[photo_placements]`.
5. Admin avec double authentification : fiche événement de test (galerie, envoi de 2 photos, ordre, texte alternatif, cadrage, publication, suppression) ; vérifier `category_id` NULL ; destination « Événement » de l'admin Photos. Sans double authentification : message dédié.
6. Lighthouse mobile réel (PageSpeed) sur la préversion.

### Bascule finale (après tes validations)
```
VITE_GALLERIES_FROM_STORAGE=true npm run deploy:cf
```
Retour arrière : `npm run deploy:cf` sans la variable, ou `wrangler rollback` vers 05e26e6a. Penser à appliquer la migration `20261110000000_event_galleries.sql` avant d'utiliser les galeries d'événement.

## Audit de code et de sécurité (11 novembre 2026)
Rapport complet : `docs/AUDIT-SECURITE-2026-11.md` (constats classés, preuves, état, correctifs proposés). SQL de contrôle en lecture seule : `docs/sql/audit-security-checks.sql` ; SQL proposé, **non appliqué** : `docs/sql/proposed-hardening-2026-11.sql`. Aucun déploiement, aucune migration, aucune écriture Supabase, aucun secret lu.

**Corrigé et commité (non déployé : la production tourne encore sur la version d'avant)** :
- `502a1f9` `@tanstack/react-start` 1.168.60 : XSS réfléchie critique dans les réponses de fonctions serveur (GHSA-qx66-fv34-fjm8) et `seroval` ; `npm audit` production : 15 vulnérabilités dont 6 critiques → 8 dont 0 critique. `b0bc89b` Vite 7.3.8.
- `71e3ef5` admin Photos : lecture paginée des variantes (PostgREST renvoyait 1 000 des 1 360 lignes).
- `ad28a3b` CSP bloquante sur le site public, ancien hôte Supabase retiré, simple rapport sur `/admin` (0 violation sur 15 pages, vérifié par Chrome piloté en temps réel).
- `61955de` JSON-LD échappé (`</script>` venant de la base).
- `407bbbc` cache `immutable` d'un an sur `/assets/*` (637 fichiers hachés).
- `01f5277` fonction serveur d'exemple supprimée ; `736f532` `routeTree.gen.ts` régénéré (ordre seulement).
- 283 tests, typecheck et build verts à chaque commit. Lighthouse mobile inchangé : 86 / 90 / 85 / 100.

**À décider ou appliquer par Paul** : fermer les inscriptions Supabase Auth (ouvertes aujourd'hui), lancer le SQL de contrôle, limites du bucket `photos`, retrait de `has_role` à `anon`, puis déployer (`VITE_GALLERIES_FROM_STORAGE=true npm run deploy:cf`) et tester l'envoi de photo de l'admin avant de rendre la CSP de `/admin` bloquante. `src/lib/events/legacy-noel.ts` est toujours utilisé (queries, sitemap, event-assets) : à ne pas supprimer. `dist/` est actuellement construit avec le flag.

## Vitesse : Supabase différé, relais d'images, images d'en-tête (11 novembre 2026)
Aucun déploiement, aucune migration, aucune écriture Supabase, aucun secret lu, aucun réglage hors dépôt. Mesures locales (`wrangler dev --local`, build avec `VITE_GALLERIES_FROM_STORAGE=true` comme la production, Chrome headless). 307 tests, typecheck et build verts à chaque commit.

### Lot 1 : Supabase hors du JavaScript des pages publiques — GARDÉ
**Cause trouvée** (pas celle qu'on supposait) : le client Supabase n'était pas seulement importé par des pages publiques. Trois fichiers de routes d'administration (`_authed.tsx`, `compte.tsx`, `photos.tsx`) exportaient autre chose que `Route` (`cn`, `PasswordSection`, `PhotosAdmin`) : TanStack ne découpe alors pas ces routes, qui entraient dans le JavaScript commun avec tout l'admin et supabase-js. Preuve : graphe de modules du build (chemin `routeTree.gen.ts` ← route admin ← `client.ts` ← supabase-js) et chunks `a-propos`, `contact`… qui chargeaient `vendor-supabase` en import de bord.

**Changements** (2 commits) :
- `773eed6` : `src/lib/supabase-lazy.ts` (`getSupabase()` = import dynamique) utilisé par `site-settings`, `events/queries`, `gallery-loader`, `$slug`, `faq`, `prestations`, `CategoryGallery`, `CategoryGallerySection`, `photo-storage` ; `publicImageUrl` ne dépend plus du client (test : résultat identique à `supabase-js`, 4 chemins dont un avec espace et accent).
- `4929196` : le corps des pages Photos et Mon compte passe dans `src/components/site/admin/PhotosAdmin.tsx` et `AccountAdmin.tsx` ; les fichiers de routes ne contiennent plus que `Route` ; `beforeLoad` de `_authed.tsx` charge le client à la demande. L'admin garde le client complet (chargé avec ses pages).

**JavaScript chargé par page** (somme des fichiers préchargés ou en `<script>`, compressés gzip) :

| Page | Avant | Après | Écart |
|---|---:|---:|---:|
| Accueil | 269,3 Ko | 188,5 Ko | −80,8 Ko (−30 %) |
| /portfolio | 263,9 Ko | 183,1 Ko | −80,8 Ko |
| /portfolio/couple | 267,3 Ko | 186,5 Ko | −80,8 Ko |
| Pages SEO galeries, Noël | 279,9 Ko | 199,1 Ko | −80,8 Ko |
| À propos | 265,8 Ko | 185,0 Ko | −80,8 Ko |
| Contact / FAQ / Prestations | 263,5 / 269,9 / 263,2 Ko | 182,7 / 189,1 / 182,4 Ko | −80,8 Ko |

(supabase-js 53 Ko + code d'administration ≈ 28 Ko). « Unused JavaScript » de Lighthouse sur l'accueil : ≈ 140 Kio avant, 80 Kio après.

**Lighthouse mobile** :

| Page | Avant | Après | LCP avant → après |
|---|---:|---:|---|
| Accueil | 86 | **89** | 4,3 → 3,9 s |
| /portfolio | 90 | **93** | 3,7 → 3,2 s |
| /portfolio/couple | 85 | **89** | 4,4 → 3,8 s |
| Page SEO couple | 100 | 100 | 1,1 s |

**Comportement identique, vérifié** : HTML des 16 URLs identique ligne à ligne (hors lignes de préchargement : une de moins par page ; codes HTTP et tailles aux 118 octets près) ; dans Chrome piloté en temps réel : `/portfolio/famille` 47 photos Supabase, `/portfolio/couple` 80, `grossesse` 31, `portrait` 12 (chargées à la demande, puisque ces pages lisent dans le navigateur), pages SEO 3/2/1 photos au rendu serveur, navigation côté client vers une page SEO, `/portfolio`, `/faq` (le chunk est alors chargé à la demande), `/admin/login` ; **0 message de console, 0 violation CSP** sur 14 pages.

Piste testée puis abandonnée : déclarer `client.ts` « sans effet de bord » dans la config Rollup (inutile : la vraie cause était l'export des routes), et retirer la règle de chunk `vendor-supabase` (supabase-js retombait dans le fichier d'entrée : +52 Ko pour tout le monde).

### Lot 2 : relais d'images par le Worker — IMPLÉMENTÉ, DÉSACTIVÉ PAR DÉFAUT
- Code : `src/lib/image-proxy.ts` (+ branchement dans `src/server.ts`, `publicImageUrl`), 23 tests, commits `feat(images): optional same-origin image relay…` et `X-Image-Cache HIT/MISS`. Variable de build `VITE_IMAGE_PROXY=true` ; absente, `/img/…` répond 404 et le site est **identique** (16 URLs : HTML et en-têtes identiques, empreintes et horodatages neutralisés).
- Sécurité : GET/HEAD, chemins strictement ceux des politiques Storage, rejet de `..`, `%`, `\`, `//`, SVG/HTML/autre bucket ; aucune redirection suivie, aucun en-tête du visiteur transmis (seul `Accept`), types `image/avif|webp` et taille < 3 Mo imposés ; vérifié aussi en réel (`/img/../package.json`, `%2e%2e`, `.svg` : 404 ; POST : 405 ; HEAD : 200).
- Mesures : relais 192 ms (1re requête) puis 3–4 ms ; Supabase direct 63–76 ms ; **Lighthouse : aucun gain mesurable** (89/89, 93/93, 88/89, 100/100). Ce que le relais pourrait apporter (même origine, pas de 429, `immutable`) ne se voit pas en local : à mesurer en production sur mobile.
- Fait important : le bucket est **déjà** derrière un CDN Cloudflare (Supabase) avec `cache-control: public, max-age=31536000` et `cf-cache-status: HIT`.
- Risques (détail dans `docs/images-cloudflare-cache.md`) : une requête Worker par image, y compris en cache (offre gratuite 100 000/jour) ; retrait RGPD d'une photo (copies d'un an dans le cache et les navigateurs, purge par URL à faire dans Cloudflare) ; cache par centre de données.
- **Recommandation : ne pas l'activer pour l'instant.** Gain non démontré, coût et risque réels. À reconsidérer seulement si Paul mesure un gain en réel, ou préférer l'alternative sans Worker décrite dans le document (sous-domaine + règles Cloudflare, non testée).

### Lot 3 : en-têtes des pages catégories — PROPOSITION, rien appliqué
- Fichiers concernés : `src/components/site/CategoryHero.tsx` (`<img>` unique, `width=1600 height=900`, sans `srcset`) ; images `src/assets/couple/couple_3/fiancailles-1.webp`, `famille/famille_1/04042026-vv7a3177.webp`, `grossesse/grossesse_1/20220418-img7441.webp`, `portrait/portrait_1/20251025-img5650.webp` ; routes `src/routes/portfolio/{couple,famille,grossesse,portrait}.tsx` (qui passent `imageSrc`).
- Constat : les 4 sources font **934 × 1 400 px** (portrait), 43 à 94 Ko en WebP ; aucune variante plus petite ni AVIF. Rien au-delà de 934 px n'a de sens (le hero actuel agrandit déjà l'image sur grand écran).
- Tailles estimées (même profil q55 / WebP q80 que les galeries ; mesurées avec sharp sur les 4 fichiers, rien écrit) :

| Image | Actuel (WebP 934 px) | 480 px | 828 px | 
|---|---:|---:|---:|
| couple | 84 Ko | WebP 37 / AVIF 25 Ko | WebP 69 / AVIF 45 Ko |
| famille | 59 Ko | 22 / 15 Ko | 44 / 28 Ko |
| grossesse | 94 Ko | 34 / 27 Ko | 72 / 53 Ko |
| portrait | 43 Ko | 20 / 12 Ko | 36 / 20 Ko |

- Impact estimé sur mobile (écran 412 px, densité 2 à 2,6) : on servirait la variante 828 px en AVIF : −23 à −40 Ko par page (−45 % environ), soit environ 0,15 à 0,25 s de LCP simulé, donc +1 à +2 points de Lighthouse sur `/portfolio/<catégorie>` (89 aujourd'hui). Non mesuré, estimation.
- Comment : (1) petit script `scripts/photos-storage/` calqué sur `generate-variants.mjs` (profil `q55`, sharp), sortie `src/assets/<catégorie>/hero-480.avif|webp`, `hero-828.avif|webp` + la 934 px existante en repli ; (2) `CategoryHero` devient `<picture>` AVIF puis WebP avec `srcset` 480 / 828 / 934 et `sizes="100vw"` (rendu inchangé : mêmes dimensions, `object-cover`) ; (3) mesurer, puis un commit. Coût : 4 × 4 nouveaux fichiers (≈ 400 Ko dans le dépôt). À valider visuellement par la photographe (q55 déjà validé pour les galeries).

### À configurer ou tester à la main
1. Rien à configurer côté Cloudflare ou Supabase pour le Lot 1 (code seul).
2. Après déploiement du Lot 1 : ouvrir le site sur mobile réel ; `/portfolio/famille` (les 47 photos doivent apparaître comme avant) ; naviguer de l'accueil vers une page SEO, puis vers `/portfolio` (rien ne doit clignoter ni manquer) ; **se connecter à `/admin`**, ouvrir Photos et Mon compte (ils sont maintenant des composants chargés à la demande : une page blanche à l'ouverture serait le signe d'un problème), envoyer une photo de test, lire la console.
3. PageSpeed Insights mobile sur l'accueil, `/portfolio/couple` et une page SEO galerie (références avant déploiement : 86, 85, 100 mesurées en local ; en local après : 89, 89, 100).
4. Relais d'images : ne rien faire tant que la décision n'est pas prise (voir `docs/images-cloudflare-cache.md`).

### Commande exacte de déploiement
```
VITE_GALLERIES_FROM_STORAGE=true npm run deploy:cf
```
(sans `VITE_IMAGE_PROXY` : relais éteint). Retour arrière : `wrangler rollback` vers la version précédente, ou redéployer le commit `ee319e2`. Les corrections de l'audit de sécurité (commits 407bbbc à 736f532) partent dans le même déploiement : voir `docs/AUDIT-SECURITE-2026-11.md`.

### Trois prochaines actions pour Paul
1. **Déployer** avec la commande ci-dessus, puis dérouler le test manuel 2 (galeries, navigation, admin Photos et Mon compte, envoi d'une photo de test).
2. **Fermer les inscriptions Supabase Auth** et lancer `docs/sql/audit-security-checks.sql` (constat E-1 de l'audit), puis, si la photo de test passe sous la CSP, basculer `/admin` en CSP bloquante.
3. **Décider** : appliquer ou non le Lot 3 (variantes d'en-tête, validation visuelle par la photographe) ; ne pas activer le relais d'images sans mesure sur mobile réel.

## Refactorisation (branche `refactor-structure`, 11 novembre 2026)
Branche créée depuis `photos-storage-v2`, **non fusionnée, non déployée**. Aucune migration, aucune écriture Supabase, aucun secret lu, fichiers protégés intacts (`legacy-noel.ts`, `admin-guide.ts`, scripts d'import/rollback, pages baptême/mariage/anniversaire, migrations). Détail, mesures et abandons : `docs/REFACTOR-PLAN.md`.

**Fait** : code mort supprimé (2 fichiers, 5 exports/imports) ; module unique des variantes de photos (4 copies remplacées, 12 tests) ; `components/site/admin` devient `components/admin` ; `photo-storage.ts` éclaté en 5 modules sous `lib/photos/` ; `PhotosAdmin` (1 454 → 655 lignes) et `EventEditor` (850 → 573) découpés ; `/portfolio/<catégorie>` passe de 4 requêtes Supabase à 1 ; listes de l'admin Photos paginées (plafond silencieux de 1 000 lignes) ; Prettier sur les scripts non protégés (commit séparé) ; `README.md` créé, `docs/README.md`, règle des fichiers de route.

**Vérifié** : typecheck 0 erreur, 330 + 7 tests, build vert ; **16 URLs identiques** (HTML et en-têtes, empreintes neutralisées) ; galeries 11+20, 47+20 (47 distinctes), 10+17+53, 12 ; console et CSP : 0 message sur 14 pages ; JavaScript par page −1,9 Ko ; Lighthouse 89 / 93 / 89 / 100 comme avant.

**Abandonné** : retrait de zod, fusion des deux chaînes d'envoi de photo, découpage des grandes pages publiques, suppression du kit shadcn inutilisé (raisons dans le plan).

**À tester à la main (admin)** : Photos (envoyer une photo de test, régler le cadrage, supprimer), Mon compte (mot de passe, double authentification), fiche d'un événement de test (en-tête et boutons, formules, FAQ, galeries, cadrage), `/admin` après connexion, puis le site public (galeries, `/portfolio/famille`).

## Déploiements en production (11 novembre 2026, autorisés par Paul pour la séance)
Aucun retour arrière nécessaire. Aucune migration, aucune écriture Supabase, aucun secret lu, `VITE_IMAGE_PROXY` jamais activé, `main` non touchée, fichiers protégés non touchés. Déploiements : `VITE_GALLERIES_FROM_STORAGE=true npm run deploy:cf`.

### Versions de production (pour le retour arrière)
| Moment | Version | Contenu |
|---|---|---|
| Avant (relevée avec `wrangler deployments status`) | **975b9677-5f88-480e-9795-dc6dcbbb1484** (créée à 20:28 UTC) | déjà conforme au script de contrôle : CSP bloquante, cache `immutable`, 35/35 OK (donc plus récente que « l'ancienne version » annoncée ; origine non investiguée) |
| Après l'étape 1 | **77ac5d9b-0710-4560-bbec-076193f26bbf** | `photos-storage-v2` b64caaa + script de contrôle (3256842) |
| Après l'étape 2 | **32b44504-0437-4e7c-8725-91a72b161cd9** (active, 100 %) | fusion `--no-ff` de `refactor-structure` (eb57390) |

Retour arrière : `npx wrangler rollback` vers 77ac5d9b (état de l'étape 1) ou 975b9677 (avant la séance).

### Contrôle de production : `node scripts/smoke-test.mjs https://soleanastudio.fr`
Écrit sur `refactor-structure` (240ceaa), copié sur `photos-storage-v2` (3256842) ; 35 contrôles en lecture seule, 14 tests unitaires de la logique d'analyse. Une première version a donné 1 KO sur la production d'avant (`/admin` redirige en deux temps : `/admin` → `/admin/dashboard` → `/admin/login`) : c'était le script, corrigé pour suivre la chaîne de redirections.
| Moment | Résultat |
|---|---|
| Production avant la séance (975b9677) | 35/35 OK |
| Étape 1 (77ac5d9b), 1 passage après le déploiement | **35/35 OK** |
| Étape 2 (32b44504), 1 passage après le déploiement | **35/35 OK** |
Détail : 16 pages publiques en 200 + 404 d'une URL inexistante ; sitemap 19 URLs dont les 4 `/portfolio/<catégorie>` ; `robots.txt` ; CSP bloquante, HSTS, nosniff, Referrer-Policy sur 4 pages ; cache `public, max-age=31536000, immutable` sur `/assets` ; galeries des 4 pages SEO (`<picture>` AVIF puis WebP, 4 largeurs, dimensions, aucun message de galerie vide, aucune image locale) ; 64 URLs d'images en 200 `image/avif` ou `image/webp` ; lien Pelli de la page Noël (`soleana-studio.pelli.io`) présent et autorisé par `frame-src` ; `/admin` → connexion, aucune donnée d'admin dans le HTML. Le nouveau code est bien servi (la page d'accueil ne précharge plus `vendor-supabase`).

### Contrôle dans un navigateur réel (Chrome headless, production, après l'étape 2)
13 pages (accueil, portfolio, 4 `/portfolio/<catégorie>`, SEO couple, Noël, contact, À propos, FAQ, prestations, `/admin/login`) : **0 message de console, 0 violation CSP** ; `/portfolio/famille` 47 photos, `couple` 80, `grossesse` 31, `portrait` 12, aucun message de galerie vide ; une seule requête Supabase par page catégorie, aucune sur les autres pages publiques.

### Lighthouse mobile en production (`npx lighthouse` sur l'URL réelle, après l'étape 2)
| Page | Perf | A11y | BP | SEO | LCP | Références |
|---|---:|---:|---:|---:|---:|---:|
| Accueil | **97** | 100 | 100 | 100 | 2,6 s | 89 |
| /portfolio | **97** | 96 | 100 | 100 | 2,6 s | 93 |
| /portfolio/couple | **94** | 100 | 100 | 100 | 3,1 s | 89 |
| Page SEO couple | 100 | 96 | 100 | 100 | 1,1 s | 100 |
Aucune baisse ; hausse de 4 à 8 points (réseau réel, HTTP/2 et compression de Cloudflare, cache). Mesures depuis cette machine, simulation mobile standard de Lighthouse.

### Ce que je n'ai pas pu vérifier : à tester à la main par Paul
1. **Pelli sur la page Noël** : le lien/iframe est présent et son domaine est autorisé par la CSP, mais le chargement réel du formulaire après le clic « Afficher le formulaire » n'a pas été testé (ni cookies Pelli, ni réservation).
2. **Admin Photos** (connecté, avec double authentification) : ouvrir la page, envoyer une photo de test dans une galerie (réencodage AVIF/WebP sous la CSP `/admin` en simple rapport : la console ne doit afficher aucune ligne « Content Security Policy »), régler le cadrage, supprimer la photo de test.
3. **Admin Mon compte** : changement de mot de passe, double authentification ; le message « double authentification » quand la session est en aal1.
4. **Fiche événement de test** (créer puis supprimer) : en-tête et boutons (enregistrer, publier, archiver, dupliquer), formules, FAQ, galeries, cadrage ; la migration `20261110` doit être appliquée pour les galeries.
5. **Safari / iPhone** : galeries (AVIF/WebP), lightbox, navigation vers une page catégorie (le client Supabase se charge à la demande), envoi d'une photo depuis l'admin.
6. Si l'admin envoie une photo de test sans aucune ligne CSP dans la console, passer `/admin` en CSP bloquante (`src/lib/security-headers.ts`) ; puis fermer les inscriptions Supabase Auth (audit E-1) et lancer `docs/sql/audit-security-checks.sql`.

**État final** : la production sert la version 32b44504 (`photos-storage-v2` fusionnée avec `refactor-structure`, flag des galeries actif, relais d'images éteint), au vert sur les 35 contrôles de production et sans message de console sur 13 pages, l'admin connecté et Pelli restant à tester à la main.
