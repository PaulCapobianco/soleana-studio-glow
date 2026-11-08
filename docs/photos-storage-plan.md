# Photos / Storage — préparation du 25 septembre 2026

> **Mise à jour du 9 novembre 2026.** Branche `photos-storage-v2` (issue de `main`, qui contient déjà le
> module Événements et le correctif CSP). Changements par rapport à la préparation de septembre : contexte
> `event` dans `photo_placements` ; gestion des catégories (créer, renommer, réordonner, masquer, supprimer)
> dans l'admin Photos, avec la migration `20261109000000_photo_categories_management.sql` ; chiffres de
> l'inventaire rafraîchis ; Noël 2026 compté pour 74 photos. Rien n'est appliqué en production : ni
> migration, ni import, ni activation de `VITE_GALLERIES_FROM_STORAGE`. Le projet Supabase de production est
> `kvzzzwjddanwedzotaka` (celui de `.env` et du site en ligne) ; `project_id` de `supabase/config.toml`
> (`hvfvvbiupyzoounzyqoz`) ne répond plus et ne doit pas servir de référence.

**Statut : proposition locale, aucune opération Supabase exécutée.** Les fichiers locaux restent la source publique. BUG-02 reste reporté après la bascule Photos, selon la décision validée. Le sitemap n'est pas modifié.

## Inventaire reproductible

Exécuter `node scripts/inventory-images.mjs` depuis la racine. Ce script lit uniquement les assets et les sources TS/TSX/CSS, calcule les empreintes et écrit `docs/image-inventory.json`. Il ne charge pas `.env`, n'utilise aucun secret, n'importe rien en base et ne fait aucun appel réseau. `sharp` est déjà présent transitivement : aucune dépendance ajoutée.

Le JSON donne **pour chaque fichier** : chemin, format, octets, dimensions, SHA-256, références directes ou glob avec ligne source, caractère critique, classement et source locale. Les références sont les imports/globs, pas une preuve du nombre d'usages rendus. Les originaux hors dépôt n'ont pas été rapprochés ni modifiés.

| Groupe | Fichiers physiques | Taille arrondie | Usage / classement |
| --- | ---: | ---: | --- |
| Identité (racine des assets) | 11 | 614 Kio | 7 fichiers logos/favicon, A : garder locaux ; 4 fichiers de la racine candidats |
| Accueil | 14 | 1 707 Kio | hero (WebP + AVIF) et portrait ; 4 non référencés (C) |
| À propos | 20 | 2 082 Kio | 9 photos en WebP + AVIF ; 2 non référencés (C) |
| Portfolio | 48 | 3 479 Kio | 4 photos × 6 variantes WebP + AVIF, B |
| Couple | 160 | 7 774 Kio | 80 photos + miniatures, B |
| Famille | 94 | 5 874 Kio | 47 photos + miniatures, B |
| Grossesse | 62 | 3 696 Kio | 31 photos + miniatures, B |
| Portrait | 24 | 1 417 Kio | 12 photos + miniatures, B |
| Noël 2026 | 154 | 25 326 Kio | **74 photos** (voir ci-dessous) + bandeaux et décor, C : hors périmètre actuel |

Total : **587 fichiers image, 53 217 321 octets (50,75 Mio)** (inventaire régénéré le 9 novembre 2026 par
`node scripts/inventory-images.mjs` ; le format « heif » de l'inventaire désigne les fichiers AVIF).
581 sont référencés. Classement : 7 locaux (A), 420 candidats Storage (B), 160 à confirmer (C : tout
Noël + 6 fichiers non référencés). Aucun fichier non référencé n'est supprimé.

### Noël 2026 : 74 photos, hors périmètre actuel, prévues pour une étape ultérieure

La page Noël est maintenant pilotée par la base (module « Événements »), mais ses images restent des
fichiers du site : 74 photos en cinq galeries (famille 13, couple A 11, couple B 19, couple C 12, décor 19),
plus bandeaux et photos d'introduction. Elles **ne font pas partie des 190 photos de la phase 1** et ne
sont pas importées avec elles. Pour les migrer plus tard par le même système, `photo_placements` accepte le
contexte `event` (migration `20260926000003`, amendée avant application) : une galerie = un `slot`
(`hero`, `intro`, `decor`, `session-01`…), la couverture d'une galerie étant son `display_order` 0.
Le chargement existe (`loadEventGalleries`, `src/lib/photo-storage.ts`, testé) ; il reste à brancher
l'affichage de `EventPage` et un cible « Événement » dans l'admin Photos. Les photos de Noël ne seront
sélectionnées et importées qu'après décision explicite.

Les **190 photos validées** sont retrouvées exactement : 170 photos des galeries + 4 photos portfolio + 16 autres (4 hero accueil, 1 portrait accueil, 9 À propos, 2 fonds). Leurs fichiers de base pèsent 17 144 678 octets, hors variantes. Noël (74 photos, voir plus haut) est distinct de ce périmètre historique ; aucune inclusion automatique dans l'import des 190.

## Usages à conserver dans le manifeste d'import

- Accueil : quatre diapositives dans leur ordre, portrait, quatre cartes catégories ; `hero_1` est aussi utilisé pour OG et JSON-LD.
- Portfolio : mêmes quatre photos de carte, avec **leurs cadrages propres**. Le partage d'une photo ne partage pas son cadrage.
- À propos : neuf imports ; relever chaque usage, y compris les réutilisations dans les tableaux et compositions.
- Contact et Prestations : chacun son fond décoratif.
- SEO Grossesse : galerie 1 = 11, galerie 2 = 20.
- SEO Couple : galeries de 10, 17 et 53 photos.
- SEO Famille : première galerie = 27 + 20 = 47 ; seconde = les mêmes 20 de `famille_2`. **Préserver ces 20 réutilisations.**
- SEO Portrait : 12 photos. Lifestyle n'a pas de galerie actuelle.
- Ordre des galeries : reproduire le `localeCompare` du code actuel, pas un tri numérique « naturel » qui déplacerait les images `-10` / `-2`.
- Futures sous-pages portfolio : carte en premier, puis toutes les photos publiées de la catégorie selon l'ordre importé des galeries SEO, en dédupliquant la même photo entre galeries. Les quatre hero de sous-pages actuelles réutilisent des photos des galeries ; documenter leurs usages sans rendre ces pages accessibles avant validation Photos.
- Les cinq catégories de production sont conservées : grossesse 1, famille 2, couple 3, portrait 4, evenement 5. `evenement` ne reçoit aucune photo et aucune carte inventée. Lifestyle est un slug SEO, pas une catégorie photo à créer automatiquement.

**Avant import, verrou obligatoire :** produire et relire le manifeste de chaque placement (clé, fichier source, photo, contexte, slot, ordre, alt, x/y). L'inventaire de fichiers ne remplace pas ce manifeste. Convertir toutes les classes/styles de cadrage en pourcentages explicites, vérifier à 360/768/1440 px. Ne pas supposer que tous les cadrages sont centrés. Les placements adaptatifs différents selon breakpoint nécessiteraient une extension validée ; ne pas les aplatir silencieusement.

## État du schéma et Storage constaté dans le dépôt

La migration initiale définit `photos.image_url` (URL complète obligatoire), `category_id`, `title`, `location`, `alt_text`, `display_order`, `on_home`, `on_portfolio`, `published` et timestamps. Elle définit un seul bucket public `photos` et des policies Storage lecture publique / mutations admin. L'admin charge actuellement le fichier original sélectionné (JPG/PNG/WebP, maximum 10 Mo), sans génération de variantes, puis insère son URL publique dans `photos`. Son nom original sert d'alt par défaut : à remplacer par un champ descriptif dans le futur flux.

Les contenus publics utilisent surtout imports et globs locaux ; l'admin Photos ne pilote donc pas encore ces usages. `seo_pages.image_url` et `image_alt` existent mais ne sont actuellement ni édités ni rendus. Leur rôle (photo de contenu ou image de partage) doit être explicité avant branchement ; aucune réaffectation silencieuse.

Ce sont des constats **du code/migrations**, pas une vérification de l'état distant actuel du bucket ou de ses policies.

## Architecture proposée

- Conserver **un bucket public `photos`**, sous réserve du contrôle de production.
- Clés sans nom de client : `portfolio/<categorie>/<identifiant-opaque>/<hash-variante>-800.webp`, `pages/<identifiant-opaque>/<hash-variante>-1600.webp`. `noel-2026/...` seulement si son inclusion est validée ultérieurement.
- Stocker les clés relatives dans `photo_variants`, construire l'URL avec `storage.from('photos').getPublicUrl(storage_path)`. Conserver `photos.image_url` pour compatibilité pendant la transition.
- Clés versionnées immuables ; `upsert: false`, `cacheControl: '31536000'`. Toute retouche crée une nouvelle clé. Ne pas écraser un fichier déjà caché.
- Produire localement des WebP 400/800/1600 et 2400 pour les hero si la source le permet, sans agrandissement. Dimensions et tailles réelles dans le manifeste. Une variante native suffit si la source est plus petite ; dédupliquer les largeurs identiques.
- Nouveaux uploads admin : décodage d'image puis `canvas.toBlob('image/webp')` dans le navigateur avant envoi ; vérifier format, dimensions, taille, résultat du décodage et erreur de conversion. Upload des variantes validées puis création de la photo et des usages ; nettoyage des seules variantes nouvellement envoyées en cas d'échec. Ajouter une validation serveur pour les mutations administratives et les contraintes de bucket après validation du flux.
- `srcset`, `sizes`, dimensions et `object-position: x% y%` par usage. `alt_text_override = NULL` reprend l'alt photo ; une chaîne vide reste autorisée pour un usage décoratif.
- Les clés, pas les URLs dépendantes du domaine, deviennent l'identité de stockage. `photos.source_key` sert à la reprise d'import sans doublon.

Le plan Free inclut actuellement 1 Go de stockage, 5 Go de trafic non caché et 5 Go de trafic caché : le volume de fichiers paraît compatible, mais le trafic mensuel doit être mesuré avant décision. À titre d'ordre de grandeur, 1 Mo d'images par visite × 5 000 visites représente 5 Go ; ce n'est pas une prévision de fréquentation. [Tarification Supabase](https://supabase.com/pricing), [bande passante Storage](https://supabase.com/docs/guides/storage/serving/bandwidth).

**Un bucket public ne protège pas les octets d'une photo dépubliée dont l'URL est connue.** Les RLS masquent les références en base ; les images privées clients et les originaux ne doivent pas aller dans ce bucket.

## SQL préparé, non exécuté

`docs/sql/prepare-photo-storage.sql` est volontairement hors du répertoire des migrations automatiques, en attente de validation.

- Transaction additive ; arrêt si tables/colonne existent déjà ou RLS manquante.
- `photos.source_key TEXT NULL` + index unique partiel.
- `photo_variants` : FK photo, clé Storage unique, largeur/hauteur, taille, empreinte, timestamp ; unicité photo/largeur.
- `photo_placements` : UUID, clé d'usage unique, FK photo, contexte `page`/`seo`/`category`, page_key, FK seo_page/category selon contexte, slot, ordre, x/y pourcentages contraints, alt facultatif, publication indépendante, timestamps.
- Contraintes de contexte, index uniques de tri par emplacement, index FK.
- RLS activée et policies dans la même transaction sur les deux nouvelles tables ; public SELECT seulement si photo publiée et, pour un usage SEO, page publiée ; admin mutations via `has_role`.
- Aucune policy existante et aucun bucket modifiés. Le `source_key` n'est pas secret et reste couvert par les policies de `photos` existantes. Les timestamps `updated_at` sont à renseigner par les écritures admin/import.
- Rejouer ce brouillon provoque volontairement un arrêt avant toute nouvelle mutation ; pas de `IF NOT EXISTS` qui accepterait un schéma divergent.

## Exécution future, dans cet ordre

1. Paul exporte/sauvegarde les lignes de `photos`, `categories`, `seo_pages`, les schémas/policies et la liste d'objets Storage. Conserver les copies hors Git.
2. Vérifier par SELECT la RLS, les policies réelles, le bucket public, les quotas utilisés et les privilèges. Ne pas exécuter toutes les anciennes migrations : `20260602000000_remove_vieux_quartiers_from_faq.sql` est explicitement abandonnée.
3. Valider les 190 sources et le manifeste complet des placements, les dimensions, les crops et les variantes générées. Pas d'original dans Git.
4. Après validation humaine, copier **uniquement** le SQL relu dans le SQL Editor Supabase du projet choisi, puis Run. Aucun bucket supplémentaire prévu si `photos` correspond à l'attendu. Tester le schéma/policies d'abord sur un projet isolé.
5. Préparer ensuite l'importeur séparé et son mode simulation à partir du manifeste verrouillé. Il doit comparer source_key, empreintes et références existantes, échouer sur divergence et journaliser les objets/lignes créés. **Aucun importeur mutateur n'est livré à ce stade : le contenu réel de `photos` et le manifeste des placements ne sont pas encore validés.** Ne pas inventer une commande d'import exécutable qui n'existe pas.
6. Paul exécute l'upload des variantes, sans écrasement, puis l'import transactionnel des références. Objets Storage et SQL n'étant pas atomiques ensemble, prévoir une reprise et un nettoyage limité au journal d'import.
7. Comparer nombre de photos, chaque emplacement, ordre, alt, dimensions, crops et réponses HTTP des variantes. Tester RLS anonyme/non-admin/admin avec des données de test isolées. Aucun contenu de production utilisé pour les essais d'écriture.
8. Basculer les composants en conservant les fichiers locaux et un repli explicite vers le manifeste local pendant validation. Aucun changement visible accepté.
9. Valider la bascule ; seulement ensuite corriger BUG-02 et afficher toutes les photos publiées par catégorie, carte d'abord. Pas de nouvelle sélection éditoriale.
10. Suppression éventuelle des anciens assets **dans un chantier séparé**, après recherche de références et validation. Les 18 suppressions historiques restent exclues.

### Ordre exact de mise en production (mis à jour le 10 novembre 2026)

Chaque étape est faite par Paul ; rien n'est exécuté par l'assistant. Les migrations se collent dans
l'éditeur SQL du projet de production `kvzzzwjddanwedzotaka`. **Après chaque migration, lancer le contrôle
indiqué et ne passer à la suivante que si le résultat est celui attendu** ; sinon s'arrêter et le signaler.

> ### ⚠ Avertissement : double authentification obligatoire AVANT l'étape 5
> Dès que `20260926000002` est appliquée (étape 5) puis le bloc `DO $aal2$` d'`events` relancé (étape 6), **toute
> écriture sur `events`** (créer, modifier, publier, archiver, dupliquer, envoyer une couverture), comme sur
> les photos, les catégories, les prestations, la FAQ, les avis, les pages SEO et les paramètres, **exige une
> session avec double authentification**. Une personne qui n'a pas enregistré son second facteur ne pourra plus
> rien écrire (elle verra « Vous n'avez pas les droits nécessaires »). **La photographe doit donc avoir
> enregistré son second facteur (« Mon compte ») et s'être reconnectée avec le code à 6 chiffres avant
> l'étape 5.** Même vérification pour tout autre compte admin. Retour arrière documenté en bas de
> `20260926000002_require_aal2_for_admin_writes.sql`.

**Étape 1 — Correctif CSP déployé** (hôte `kvzzz…` autorisé) : fait le 10 novembre 2026.

**Étape 2 — Sauvegardes** : lignes de `photos`, `categories`, `seo_pages`, `events`, schémas et politiques, liste des objets Storage.

**Étape 3 — Double authentification de tous les comptes admin** (voir l'avertissement).
- Contrôle : chaque compte se déconnecte, se reconnecte, saisit le code, et ouvre « Mon compte » sans erreur.

**Étape 4 — Préflight** : `docs/photos-storage/preflight-selects.sql` (lecture seule) — tout conforme.

**Étape 5 — `20260926000002_require_aal2_for_admin_writes.sql`** (obligatoire : `…000005` refuse de s'appliquer sans elle).
- Contrôle : `SELECT count(*) FROM pg_policies WHERE policyname LIKE 'Require aal2 for %';` → **26**.
- Test avec le compte de la photographe (connectée avec son code) : enregistrer une modification d'un
  événement de test en brouillon réussit.

**Étape 6 — Relancer le bloc `DO $aal2$` de `20261106000000_create_events.sql`** (`events` suit la règle).
- Contrôle : même requête → **29** ; `SELECT count(*) FROM pg_policies WHERE tablename = 'events';` → **5**.

**Étape 7 — `20260926000003_add_photo_variants_and_placements.sql`** (amendée : contexte `event`).
- Contrôles : `SELECT tablename, count(*) FROM pg_policies WHERE tablename IN ('photo_variants','photo_placements') GROUP BY 1;`
  → **5 et 5** ; `SELECT column_name FROM information_schema.columns WHERE table_name = 'photo_placements' AND column_name = 'event_id';`
  → **1 ligne** ; `SELECT column_name FROM information_schema.columns WHERE table_name = 'photos' AND column_name = 'source_key';` → **1 ligne**.

**Étape 8 — `20260926000004_add_avif_photo_variants.sql`.**
- Contrôle : `SELECT column_name FROM information_schema.columns WHERE table_name = 'photo_variants' AND column_name = 'format';` → **1 ligne**.

**Étape 9 — `20260926000005_photo_storage_admin_operations.sql`** (amendée : accepte aussi les couvertures `events/…`).
Retire la lecture/listing public des objets du bucket : les URL des images continuent de fonctionner, pas le listing anonyme.
- Contrôles : `SELECT count(*) FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname IN ('Admin list photos objects','Admin upload photos','Restrict photos object uploads to web variants','Restrict photos object updates to web variants','Require aal2 for photo web variant deletes');`
  → **5** ; `… policyname = 'Public read photos bucket'` → **0** ;
  `SELECT to_regclass('public.photo_storage_cleanup_jobs'), to_regproc('public.admin_delete_photo');` → **deux valeurs non nulles**.

**Étape 10 — `20261109000000_photo_categories_management.sql`.**
- Contrôles : ceux du bas du fichier (5 catégories `published = true`, 2 politiques sur `categories` plus 3 aal2, trigger `categories_enforce_rules`).

**Étape 11 — `20261110000000_event_galleries.sql`.**
- Contrôles : ceux du bas du fichier (`galleries = []` et référence `NULL` partout, 2 contraintes, politiques d'`events` inchangées : 5).

**Étape 12 — Déployer le code**, `VITE_GALLERIES_FROM_STORAGE` **non défini**. Contrôles publics : accueil, Noël, pages
galeries, sitemap, 404, en-têtes (HTML identique à avant). L'admin Photos, les catégories et les galeries d'événements sont
alors utilisables ; le site public reste sur les fichiers locaux. Avec le compte admin : créer un événement de test, une galerie,
envoyer une photo, la réordonner, la masquer, dupliquer l'événement avec chaque option, puis tout supprimer.

**Étape 13 — Import** : simulation, import de test, import complet **en brouillon** (voir `README.md`), puis
`postflight-selects.sql`. Contrôle : nombre de photos, de variantes (8 par photo) et d'emplacements = manifeste.

**Étape 14 — Validation visuelle, puis activation** : `VITE_GALLERIES_FROM_STORAGE=true` au build, déploiement. Contrôles : galeries
des pages SEO et des événements identiques à avant (ordre, textes alternatifs, cadrage), aucune erreur dans les journaux.

**Étape 15 — BUG-02** (pages catégories du portfolio) seulement ensuite ; les photos de Noël (74, contexte `event`) dans un chantier séparé.

> Supprimer une photo depuis l'administration des photos la retire de **toutes** les galeries qui l'utilisent, y compris
> celles d'un événement dupliqué avec « Reprendre les galeries » (les photos sont partagées, pas copiées).

> Supprimer une photo depuis l'administration des photos la retire de **toutes** les galeries qui l'utilisent, y compris
> celles d'un événement dupliqué avec « Reprendre les galeries » (les photos sont partagées, pas copiées).

### Point d'arrêt et rollback

L'application SQL, l'upload, l'import et la modification des policies/buckets exigent l'action de Paul. Aucun de ces actes n'a été effectué.

Rollback privilégié : remettre le frontend sur les références locales, conserver les tables additives et les fichiers uploadés pendant l'analyse. Si nettoyage décidé, supprimer uniquement les placements/variantes/photos et objets dont la création figure dans le journal du lot, après vérification d'absence d'autres références ; jamais supprimer le bucket, ni les lignes/photos préexistantes. Une table nouvelle ne doit être supprimée que si elle ne contient aucun travail admin ultérieur.
