# Photos → Supabase Storage : phase 1 (galeries des pages SEO)

État : **préparation terminée, rien d'appliqué ni d'envoyé**. Périmètre : les 8 galeries des pages
couple, famille, grossesse et portrait (170 photos, 190 emplacements). Pas Noël, pas l'accueil,
pas À propos. Voir aussi `docs/photos-storage-plan.md` (plan général).

## Ce qui existe dans le dépôt

| Élément | Rôle |
|---|---|
| `docs/photos-storage/preflight-selects.sql` | Requêtes de vérification en lecture seule (bucket, politiques, tables, comptes). |
| `docs/photos-storage/postflight-selects.sql` | Contrôles de schéma, RLS, variantes, emplacements et objets après migration et import. |
| `docs/photos-storage/bug-02-activation.md` | État du correctif BUG-02 et ordre d'activation après import. |
| `supabase/migrations/20260926000003_add_photo_variants_and_placements.sql` | Schéma additif (`photos.source_key`, `photo_variants`, `photo_placements`) avec RLS et politiques aal2. **Non appliquée, inchangée.** |
| `supabase/migrations/20260926000004_add_avif_photo_variants.sql` | Ajoute le format AVIF à `photo_variants` et autorise deux formats par largeur. **Non appliquée ; à lancer après 000003.** |
| `docs/photos-storage/manifest-phase1.json` | Manifeste v3 : clés opaques et empreintes SHA-256, dimensions et emplacements. Aucun chemin ni nom d'original. |
| `scripts/photos-storage/match-originals.mjs` | Compare chaque WebP du manifeste à **tous** les fichiers des sous-dossiers de `../soleana-originaux/galeries/` par corrélation de pixels. Le tableau des 170 correspondances et les chemins restent hors dépôt dans `../soleana-originaux/storage-variants/matching-report.csv`. |
| `scripts/photos-storage/generate-variants.mjs` | Génère AVIF et WebP à 400, 800 et 1600 px au plus, sans agrandissement ni métadonnées, depuis les originaux retenus. Repli sur le WebP actuel si aucun original n'atteint le seuil de ressemblance. |
| `scripts/photos-storage/measure-gallery-bytes.mjs` | Mesure locale dans Chrome les octets réellement chargés pour la galerie couple 1, avant et après, sur trois largeurs d'écran. |
| `scripts/photos-storage/verify-variants.mjs` | Vérifie dimensions, poids, empreintes, absence d'EXIF/XMP/ICC, clés de stockage. |
| `scripts/photos-storage/import-photos.mjs` | Import. **Simulation par défaut.** Mode réel : `--apply --confirm <hôte>`. |
| `scripts/photos-storage/rollback-import.mjs` | Retour arrière à partir du journal (supprime seulement ce que le lot a créé). |
| `src/lib/photo-storage.ts` | Interrupteur `STORAGE_GALLERIES_ENABLED`, helper unique `publicImageUrl()`, lecture des emplacements. |

Les 171 fichiers des sous-dossiers représentent **170 originaux distincts** : une copie est
strictement identique à son original. Les 170 photos du manifeste ont chacune un original retenu
(score minimal **99,677 %** ; aucun repli ni correspondance douteuse). Le tableau complet, avec
score et deuxième meilleur score, est privé hors dépôt. `../soleana-originaux/pages/` n'est jamais
lu par ces scripts. Les noms des originaux ne sont ni dans le manifeste ni dans les clés Storage.

Variantes générées : **1 020 fichiers, 78,30 Mo** (26,17 Mo d'AVIF et 52,13 Mo de WebP).
La vérification a contrôlé dimensions, poids, SHA-256 et absence de métadonnées sur chaque fichier.
Clés de stockage : `galleries/<catégorie>/<id opaque de 12 caractères>/<hash8>-<largeur>.<avif|webp>`
(aucun nom de client ni de fichier d'origine ; clé versionnée par le contenu, jamais écrasée).
La génération utilise au plus six photos en parallèle, garde un index de progression hors dépôt et
réutilise uniquement les variantes dont la source, le format, les dimensions et l'empreinte sont
valides. Un essai a réparé un fichier supprimé et un fichier tronqué en conservant les 1 018
autres variantes. Les 1 190 anciennes sorties hors index ont été retirées ; il reste exactement
1 020 fichiers dans le dossier des variantes.

Mesure locale dans Chrome, galerie `photographe-couple-marseille/gallery-1` complète (10 images,
cache désactivé, défilement jusqu'à chaque image) :

| Écran / DPR | WebP actuel | AVIF avec `srcset` | Baisse |
|---|---:|---:|---:|
| 360 px / 3 | 1 129 722 octets | 524 896 octets | 53,5 % |
| 768 px / 2 | 1 129 722 octets | 524 896 octets | 53,5 % |
| 1 280 px / 1 | 1 129 722 octets | 191 565 octets | 83,0 % |

Ce sont les octets des images servies par le serveur local, pas une mesure du temps de chargement
en production ni de l'effet d'un CDN. Les dix requêtes après bascule ont bien choisi l'AVIF.

## Côté site : lecture préparée mais inactive

- Tant que `VITE_GALLERIES_FROM_STORAGE` n'est pas `true` au build, le site lit les fichiers locaux,
  sans requête ni donnée en plus : le HTML est identique à celui d'avant.
- Activé **seulement après l'import complet**, le `loader` de `/$slug` lit les emplacements publiés
  (rendu serveur conservé). Storage devient la source de la galerie : les ajouts, retraits et
  dépublications de l'admin peuvent changer son nombre de photos. En cas d'erreur de lecture ou de
  table absente, les fichiers locaux restent affichés. Une galerie volontairement vide reste vide.
- Une photo Storage n'est utilisable que si elle possède les variantes AVIF et WebP aux mêmes
  largeurs. La galerie affiche alors `<picture>` (AVIF, puis WebP) ; les photos locales conservent
  exactement leurs balises `<img>` actuelles.
- `VITE_IMAGE_BASE_URL` (ex. `https://images.soleanastudio.fr`) remplace l'hôte des images sans
  toucher aux composants (sous-domaine Cloudflare avec cache devant le bucket).

L'écran admin « Photos » reste lisible avant les migrations, mais désactive l'ajout et la suppression
tant que `photo_variants` et `photo_placements` ne sont pas disponibles. Après application, l'envoi
réencode sur l'appareil en AVIF (encodeur WASM chargé à la demande) et WebP. Le texte alternatif est
obligatoire. Les emplacements SEO ont une page, une galerie, un ordre libre, un cadrage et un état de
publication. Les cases Accueil / Portfolio restent masquées : ces pages ne lisent toujours pas ces
colonnes. L'envoi n'a **pas** été exécuté contre la production ; la logique est testée localement.
Sur une image JPEG avec orientation EXIF, nom d'auteur et profil ICC, le test Chrome local a confirmé
deux sorties correctement orientées (400 × 600), AVIF et WebP, sans EXIF, ICC, XMP ni IPTC. Un test
automatisé simule l'envoi, le nettoyage après échec et la suppression confirmée. Si un navigateur
ne décode pas un HEIC, essayer un JPG ; si l'encodage WebP échoue, changer le format de la source
ne suffit pas. Voir la [proposition de repli pour Safari iOS](safari-ios.md), à valider sur appareil
avant d'ajouter une dépendance.

## Procédure pas à pas : test réel sur 4 photos (à faire par Paul)

Rien de ceci n'a été exécuté. Chaque étape a un retour arrière.

1. **Vérifier l'état de production** : exécuter les requêtes de `preflight-selects.sql` une à une
   (lecture seule) et noter : bucket `photos` public, politiques du stockage, `source_key` absente,
   nouvelles tables absentes, nombre de lignes de `photos`. *Retour arrière : sans objet.*
2. **Sauvegarder** : exporter `photos`, `categories`, `seo_pages`, les objets et leurs métadonnées
   du bucket `photos` (télécharger ses fichiers s'il contient déjà des photos), et conserver les
   exports hors dépôt. Vérifier que les sauvegardes sont lisibles.
3. **Appliquer la migration** `20260926000003_...sql` dans le SQL Editor (copier le fichier entier).
   Si les admins sont déjà enrôlés au second facteur, conserver le bloc final « aal2 ». Sinon,
   retirer ce bloc **seulement dans la copie collée au SQL Editor**, jamais du fichier versionné,
   et prévoir son ajout quand les admins seront enrôlés. Vérifier aussi les politiques aal2
   existantes des tables `photos` et `storage.objects` : elles peuvent déjà imposer ce facteur.
   Contrôle : les deux tables existent, `SELECT count(*) FROM pg_policies WHERE tablename IN
   ('photo_variants','photo_placements');` (attendu : 4 sans le bloc aal2, 10 avec).
   *Retour arrière : bloc « Retour arrière » commenté en bas du fichier (tables vides).*
   **Puis appliquer `20260926000004_add_avif_photo_variants.sql`** : contrôle par
   `SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND
   table_name = 'photo_variants' AND column_name = 'format';` (une ligne attendue).
4. **Régénérer et vérifier les variantes en local** (déjà fait, rejouable) :
   `node scripts/photos-storage/build-manifest.mjs`, puis `node scripts/photos-storage/match-originals.mjs`,
   `node scripts/photos-storage/generate-variants.mjs` et `node scripts/photos-storage/verify-variants.mjs`.
   *Retour arrière : supprimer le dossier hors dépôt.*
5. **Simulations** : `node scripts/photos-storage/import-photos.mjs --limit 4`, puis
   `node scripts/photos-storage/import-photos.mjs` → relire les envois et insertions prévus.
   Résultats locaux : 4 photos / 24 variantes / 4 emplacements (2,36 Mo), puis 170 photos /
   1 020 variantes / 190 emplacements (78,30 Mo). Un journal prévisionnel est écrit hors dépôt.
   *Aucun appel réseau, aucun effet en base.*
6. **Import réel de 4 photos** (les emplacements restent non publiés, donc invisibles du public) :
   ```
   export SUPABASE_URL='https://<projet>.supabase.co'
   read -rsp 'Clé service_role : ' SUPABASE_SERVICE_ROLE_KEY; echo
   export SUPABASE_SERVICE_ROLE_KEY
   SUPABASE_HOST_TO_CONFIRM="$(node -p 'new URL(process.env.SUPABASE_URL).host')"
   node scripts/photos-storage/import-photos.mjs --apply --confirm "$SUPABASE_HOST_TO_CONFIRM" --limit 4
   unset SUPABASE_SERVICE_ROLE_KEY
   ```
   Le script vérifie l'hôte, n'écrase rien, saute ce qui existe et écrit un journal
   `import-<date>.jsonl` dans `../soleana-originaux/storage-variants/journals/`.
   Désactiver l'historique du shell le temps de saisir les commandes si le shell les enregistre ;
   `read -s` ne montre jamais la valeur et elle n'est écrite dans aucun fichier.
7. **Vérifier** : exécuter `postflight-selects.sql` (attendu après le test : 4 photos, 12 AVIF,
   12 WebP, 4 emplacements non publiés, 24 objets) ; puis ouvrir dans un navigateur
   l'URL publique d'une variante (`https://<projet>.supabase.co/storage/v1/object/public/photos/<storage_path>`)
   et vérifier `content-type: image/avif` puis `image/webp` et l'en-tête de cache ; avec la clé publique (anon),
   `photo_placements` doit renvoyer une liste vide (non publiés) ; l'écran admin « Photos » liste
   les 4 photos avec leur texte alternatif.
8. **Retour arrière du test** si besoin : `node scripts/photos-storage/rollback-import.mjs --journal
   <journal>` (simulation), puis avec `--apply --confirm <hôte>`. Il supprime seulement les lignes et
   objets créés par ce lot.
9. **Import complet** (une fois le test validé) : saisir de nouveau la clé en mémoire, puis :
   ```
   export SUPABASE_URL='https://<projet>.supabase.co'
   read -rsp 'Clé service_role : ' SUPABASE_SERVICE_ROLE_KEY; echo
   export SUPABASE_SERVICE_ROLE_KEY
   SUPABASE_HOST_TO_CONFIRM="$(node -p 'new URL(process.env.SUPABASE_URL).host')"
   node scripts/photos-storage/import-photos.mjs --apply --confirm "$SUPABASE_HOST_TO_CONFIRM"
   unset SUPABASE_SERVICE_ROLE_KEY
   ```
   Refaire `postflight-selects.sql` : 170 photos, 510 AVIF, 510 WebP, 190 emplacements
   non publiés, 1 020 objets. Comparer chaque galerie au manifeste avant publication.
10. **Publier puis activer côté site** : ressaisir la clé et publier uniquement les emplacements
    du manifeste, avec journal de retour arrière :
   ```
   export SUPABASE_URL='https://<projet>.supabase.co'
   read -rsp 'Clé service_role : ' SUPABASE_SERVICE_ROLE_KEY; echo
   export SUPABASE_SERVICE_ROLE_KEY
   SUPABASE_HOST_TO_CONFIRM="$(node -p 'new URL(process.env.SUPABASE_URL).host')"
   node scripts/photos-storage/import-photos.mjs --publish-existing
   node scripts/photos-storage/import-photos.mjs --apply --confirm "$SUPABASE_HOST_TO_CONFIRM" --publish-existing
   unset SUPABASE_SERVICE_ROLE_KEY
   ```
   Vérifier 190 emplacements publiés dans `postflight-selects.sql`. Construire avec
   `VITE_GALLERIES_FROM_STORAGE=true`, vérifier les 4 pages
   (ordre, texte alternatif, cadrage, chargement des images à 360, 768 et 1280 px), puis déployer.
   *Retour arrière immédiat : redéployer sans la variable (les fichiers locaux sont toujours dans le code).*
11. **Ensuite seulement** : BUG-02 suivant `bug-02-activation.md` (pages `/portfolio/<catégorie>`), sous-domaine d'images Cloudflare,
    puis chantier séparé de suppression des anciens fichiers du dépôt.

## Limites connues

- Les originaux de cette phase ont tous au moins 1600 px de large : variantes 400, 800 et 1600 px.
- Les dossiers `thumbs/` des galeries restent dans le dépôt pour le moment. Ils ne sont ni comparés
  aux originaux ni importés dans Storage ; prévoir leur suppression avec les anciens WebP au nettoyage
  final, après l'activation et la validation des galeries.
- Le texte alternatif actuel est répétitif (« Séance photo … - photo N ») : il est repris tel quel
  pour ne rien changer à l'affichage ; à améliorer photo par photo dans l'admin ensuite.
- Le mode réel du script n'a pas pu être testé contre un vrai projet (règle : production en lecture
  seule) ; sa logique suit la simulation et la migration a été testée dans un Postgres local jetable.

## Cases « Accueil » / « Portfolio » masquées dans l'admin (2026-09-26)

Les colonnes `photos.on_home` et `photos.on_portfolio` existent en base mais ne sont lues par
aucune page publique : seules `published` et `category_id` déterminent aujourd'hui ce qui
s'affiche sur le site (voir `src/components/site/CategoryGallery.tsx` et
`CategoryGallerySection.tsx`). Les deux cases à cocher correspondantes ont donc été masquées dans
`src/routes/admin/_authed/photos.tsx` pour ne pas laisser croire à un effet qui n'existe pas.
Les colonnes et les données ne sont pas touchées.

À réafficher (avec une explication à jour) quand la migration Storage des photos fait lire
l'accueil et/ou le portfolio depuis la base, si ces colonnes sont conservées pour piloter cet
affichage.
