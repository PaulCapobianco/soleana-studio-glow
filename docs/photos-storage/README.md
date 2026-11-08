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
| `supabase/migrations/20260926000003_add_photo_variants_and_placements.sql` | Schéma additif (`photos.source_key`, `photo_variants`, `photo_placements`) avec RLS et politiques aal2. **Non appliquée ; ordre, préflight et limites de rejeu dans [migration-preflight.md](migration-preflight.md).** |
| `supabase/migrations/20260926000004_add_avif_photo_variants.sql` | Ajoute le format AVIF à `photo_variants` et autorise deux formats par largeur. **Non appliquée ; à lancer après 000003.** |
| `supabase/migrations/20260926000005_photo_storage_admin_operations.sql` | Prépare le suivi de capacité, la file compensatoire de suppression et les policies Storage photo. **Non appliquée ; à lancer après 00002, 00003 et 00004.** |
| `docs/photos-storage/manifest-phase1.json` | Manifeste v3 : clés opaques et empreintes SHA-256, dimensions et emplacements. Aucun chemin ni nom d'original. |
| `scripts/photos-storage/match-originals.mjs` | Compare chaque WebP du manifeste à **tous** les fichiers des sous-dossiers de `../soleana-originaux/galeries/` par corrélation de pixels. Le tableau des 170 correspondances et les chemins restent hors dépôt dans `../soleana-originaux/storage-variants/matching-report.csv`. |
| `scripts/photos-storage/generate-variants.mjs` | Génère AVIF et WebP à 400, 800, 1200 et 1600 px au plus, sans agrandissement ni métadonnées, depuis les originaux retenus. Profil définitif : `--profile q55`. |
| `docs/photos-storage/quality-review.md` | Contrôle visuel représentatif, réglages d'encodage, métriques finales et contrat de stockage sans originaux. |
| `docs/photos-storage/admin-storage-operations.md` | Réglages navigateur, Safari, capacité, suppression fiable, import futur, contrôles et retour arrière. |
| `docs/photos-storage/migration-preflight.md` | Audit final 00002–00005, résultats READY/NOT READY et procédure opérateur avec critères GO/NO-GO. |
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

Le lot q55 définitif a été généré et vérifié : **1 360 fichiers, 126 260 045 octets (126,26 Mo)**,
680 AVIF et 680 WebP, huit variantes par photo. Les 170 sources ont une largeur suffisante pour les
quatre tailles, soit 340 variantes par largeur. Les anciens dérivés des trois tailles ont été retirés
du dossier externe après génération; tous les fichiers de sortie restent hors dépôt.
`verify-variants.mjs` a contrôlé dimensions, poids, SHA-256, signatures, métadonnées et absence de
fichiers image non indexés sur les 1 360 fichiers.
Clés de stockage : `galleries/<catégorie>/<id opaque de 12 caractères>/<hash8>-<largeur>.<avif|webp>`
(aucun nom de client ni de fichier d'origine ; clé versionnée par le contenu, jamais écrasée).
La génération utilise au plus six photos en parallèle, garde un index de progression hors dépôt et
réutilise uniquement les variantes dont la source, le format, les dimensions et l'empreinte sont
valides. Un essai a réparé un fichier supprimé et un fichier tronqué en conservant les 1 018
autres variantes. Les 1 190 anciennes sorties hors index ont été retirées ; il reste exactement
1 020 fichiers dans l'ancien dossier avant la régénération. Le contrôle qualité a relevé une perte
visible de détails fins avec les réglages q70/q90 antérieurs; q55 a depuis été validé visuellement
par la photographe. Le profil final et le contrôle par cas sont détaillés dans
[quality-review.md](quality-review.md).

Mesure locale dans Chrome, galerie `photographe-couple-marseille/gallery-1` complète (10 images,
cache désactivé, défilement jusqu'à chaque image) :

| Écran / DPR | WebP actuel | AVIF avec `srcset` | Baisse |
|---|---:|---:|---:|
| 360 px / 3 | 1 129 722 octets | 1 039 887 octets | 8,0 % |
| 768 px / 2 | 1 129 722 octets | 1 039 887 octets | 8,0 % |
| 1 280 px / 1 | 1 129 722 octets | 380 579 octets | 66,3 % |

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
tant que `photo_variants`, `photo_placements` et le RPC de capacité 00005 ne sont pas disponibles.
Après application, l'envoi réencode sur l'appareil en AVIF et WebP avec encodeurs WASM chargés à la
demande (AVIF q55/effort 4/4:4:4/8 bits ; WebP q80/méthode 4/`use_sharp_yuv`). q55 a été validé
visuellement par la photographe. La calibration et ses limites sont décrites dans
[admin-storage-operations.md](admin-storage-operations.md). Le fichier sélectionné
reste dans le navigateur : seul le tableau de blobs des variantes produites est envoyé à Storage.
L'application ne sauvegarde pas les originaux de la photographe ; ils ne doivent jamais être
envoyés à Supabase ni ajoutés au dépôt. Le texte alternatif est
obligatoire. Les emplacements SEO ont une page, une galerie, un ordre libre, un cadrage et un état de
publication. Les cases Accueil / Portfolio restent masquées : ces pages ne lisent toujours pas ces
colonnes. L'envoi n'a **pas** été exécuté contre la production ; la logique est testée localement.
Sur une image JPEG avec orientation EXIF, nom d'auteur et profil ICC, le test Chrome local a confirmé
deux sorties correctement orientées (400 × 600), AVIF et WebP, sans EXIF, ICC, XMP ni IPTC. Un test
automatisé simule l'envoi, le nettoyage après échec et la suppression confirmée. Si un navigateur
ne décode pas un HEIC, essayer un JPG ; si l'encodage WebP échoue, changer le format de la source
ne suffit pas. La génération WebP utilise maintenant `@jsquash/webp` en WASM, nécessaire pour éviter
le repli silencieux de `canvas.toBlob()` vers PNG. Les limites et essais iPhone requis sont dans
[safari-ios.md](safari-ios.md).

## Runbook : import avant déploiement, activation après MFA

Cette voie n'a pas été exécutée. Les originaux restent hors dépôt et ne sont jamais envoyés; tous les
fichiers Storage issus de l'import sont des variantes AVIF/WebP. Les photos de l'import sont créées
`published=false` et `category_id=NULL`, donc elles ne sont pas sélectionnées par les galeries
legacy `CategoryGallery`.

1. **Vérifier l'état et sauvegarder** : exécuter `preflight-selects.sql` en lecture seule; confirmer
   le bon projet, le bucket, les policies, le schéma et l'état actuel des galeries. Sauvegarder
   `photos`, `categories`, `seo_pages`, leurs objets et métadonnées hors dépôt. Tout écart non
   expliqué est NO-GO.
2. **Préparer le lot q55** : profil validé par la photographe : AVIF q55 + WebP q80. Vérifier le
   manifeste et les correspondances; le rapport des chemins reste privé hors dépôt. Générer avec
   `node scripts/photos-storage/generate-variants.mjs --profile q55`, puis vérifier avec
   `node scripts/photos-storage/verify-variants.mjs`. Attendu : 170 photos, 1 360 variantes (680
   par format) aux tailles 400/800/1200/1600; poids exact indiqué par le vérificateur.
3. **Simuler avant migration**, sans réseau :
   ```
   node scripts/photos-storage/import-photos.mjs --plan-only --profile q55 --limit 4
   node scripts/photos-storage/import-photos.mjs --plan-only --profile q55
   node scripts/photos-storage/import-photos.mjs --limit 4 --profile q55
   node scripts/photos-storage/import-photos.mjs --profile q55
   ```
   Les deux premières commandes comptent le plan sans lire de variantes; les deux suivantes,
   après génération, vérifient fichiers, empreintes et poids et écrivent un journal prévisionnel
   hors dépôt. Attendus : 4 photos / 32 variantes / 4 emplacements puis 170 photos / 1 360 variantes
   / 190 emplacements. Tous les plans prévoient `photos.published=false`,
   `photos.category_id=NULL` et `photo_placements.published=false`.
4. **GO/NO-GO avant import** : manifeste et lot vérifiés; 170 clés uniques; hashes/dimensions/métadonnées
   conformes; simulation exacte; capacité suffisante; sauvegarde et policies concordantes. Tout
   écart = NO-GO.
5. **Avant déploiement, appliquer 00003 puis 00004**, une fois chacune dans une transaction distincte.
   Vérifier RLS, policies, colonnes et contraintes avec `postflight-selects.sql`. Les politiques
   AAL2 de 00003 ne bloquent pas l'import par `service_role`.
6. **Importer avant déploiement en brouillon** : essai réel limité à 4 photos, contrôle des lignes,
   hashes et objets, puis rollback du journal de cet essai; ensuite import complet des 170 photos.
   Les deux actions utilisent `--apply --confirm <hôte> --profile q55` dans un terminal contrôlé,
   avec `SUPABASE_URL` et `SUPABASE_SERVICE_ROLE_KEY` en mémoire. Aucun original n'est lu par
   l'importeur. GO seulement si les lignes nouvelles sont toutes `published=false` et
   `category_id IS NULL`, les placements non publiés, et aucune requête legacy par catégorie ne
   retourne ces photos. Sinon rollback du lot concerné = NO-GO. Cette préparation n'a effectué aucun
   import réel.
7. **Déployer `apres-noel`** après validation du parcours admin. Faire enrôler le TOTP à tous les
   admins et confirmer une session AAL2 pour chacun. Un compte absent ou en AAL1 = NO-GO.
8. **Après déploiement et MFA, appliquer 00002**, puis vérifier les 26 policies et l'accès admin.
9. **Appliquer 00005**; confirmer policies Storage, quatre RPC, outbox et capacité. Les chemins de
   variantes acceptent 400/800/1200/1600 et les largeurs natives inférieures à 1600. Une policy
   inconnue ou RPC accessible sans admin+AAL2 = NO-GO.
10. **Publier séparément**, après inspection : simulation puis exécution de
    `import-photos.mjs --publish-existing --profile q55` (avec `--apply --confirm <hôte>`). Cette
    étape publie les photos et leurs placements, conserve `category_id=NULL` et journalise chaque
    modification; aucune galerie legacy par catégorie ne peut les sélectionner.
11. **Activer les galeries** dans un déploiement distinct avec
    `VITE_GALLERIES_FROM_STORAGE=true`. Vérifier les quatre pages SEO, le choix des tailles 400/800/
    1200/1600, ordre, texte alternatif, cadrage et lightbox. Pour revenir au rendu local, désactiver
    le flag; conserver les objets.
12. **Enfin, traiter BUG-02** suivant [bug-02-activation.md](bug-02-activation.md), dans une étape
    distincte après validation des galeries Storage.

## Limites connues

- Les originaux de cette phase ont tous au moins 1600 px de large : les quatre tailles cibles sont
  bien créées pour chacun d'eux.
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
