# Photos / Storage — préparation du 25 septembre 2026

**Statut : proposition locale, aucune opération Supabase exécutée.** Les fichiers locaux restent la source publique. BUG-02 reste reporté après la bascule Photos, selon la décision validée. Le sitemap n'est pas modifié.

## Inventaire reproductible

Exécuter `node scripts/inventory-images.mjs` depuis la racine. Ce script lit uniquement les assets et les sources TS/TSX/CSS, calcule les empreintes et écrit `docs/image-inventory.json`. Il ne charge pas `.env`, n'utilise aucun secret, n'importe rien en base et ne fait aucun appel réseau. `sharp` est déjà présent transitivement : aucune dépendance ajoutée.

Le JSON donne **pour chaque fichier** : chemin, format, octets, dimensions, SHA-256, références directes ou glob avec ligne source, caractère critique, classement et source locale. Les références sont les imports/globs, pas une preuve du nombre d'usages rendus. Les originaux hors dépôt n'ont pas été rapprochés ni modifiés.

| Groupe | Fichiers physiques | Taille arrondie | Usage / classement |
| --- | ---: | ---: | --- |
| Identité | 4 | 79 Kio | Logos/favicon, A : garder locaux |
| Accueil | 9 | 1 412 Kio | 5 référencés, 4 non référencés ; hero critique + portrait |
| À propos | 11 | 1 255 Kio | 9 référencés, 2 non référencés |
| Fonds Contact / Prestations | 2 | 286 Kio | Décoratifs, B ; alt vide / arrière-plan préservés |
| Portfolio | 24 | 2 528 Kio | 4 photos × 6 variantes, B |
| Couple | 160 | 14 972 Kio | 80 photos + miniatures, B |
| Famille | 94 | 5 874 Kio | 47 photos + miniatures, B |
| Grossesse | 62 | 3 696 Kio | 31 photos + miniatures, B |
| Portrait | 24 | 1 417 Kio | 12 photos + miniatures, B |
| Noël 2026 | 20 | 3 959 Kio | 9 photos / candidats, C : maintien local en attendant choix de gestion |

Total : **410 fichiers images, 36 330 599 octets (34,65 Mio)**. Quatre logos restent locaux ; 380 fichiers sont candidats Storage ; 26 sont à confirmer (20 variantes Noël + 6 fichiers non référencés). Aucun fichier non référencé n'est supprimé.

Les **190 photos validées** sont retrouvées exactement : 170 photos des galeries + 4 photos portfolio + 16 autres (4 hero accueil, 1 portrait accueil, 9 À propos, 2 fonds). Leurs fichiers de base pèsent 17 144 678 octets, hors variantes. Noël ajoute 9 photos, distinctes de ce périmètre historique ; aucune inclusion automatique dans l'import des 190.

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

### Point d'arrêt et rollback

L'application SQL, l'upload, l'import et la modification des policies/buckets exigent l'action de Paul. Aucun de ces actes n'a été effectué.

Rollback privilégié : remettre le frontend sur les références locales, conserver les tables additives et les fichiers uploadés pendant l'analyse. Si nettoyage décidé, supprimer uniquement les placements/variantes/photos et objets dont la création figure dans le journal du lot, après vérification d'absence d'autres références ; jamais supprimer le bucket, ni les lignes/photos préexistantes. Une table nouvelle ne doit être supprimée que si elle ne contient aucun travail admin ultérieur.
