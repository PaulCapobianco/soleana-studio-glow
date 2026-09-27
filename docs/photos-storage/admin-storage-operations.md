# Photos Storage : capacité, import et opérations admin

État au 27 septembre 2026. Ce document prépare les opérations futures ; aucune migration,
écriture Supabase, suppression distante ni modification de production n'a été exécutée.

## Contrat verrouillé

Les fichiers de `../soleana-originaux/` sont des sources locales de génération seulement. Ils ne
sont jamais uploadés, ni ajoutés à Git ; le site n'assure pas leur sauvegarde. Le rapport privé qui
relie originaux et clés anonymes reste hors dépôt. Supabase Storage ne reçoit que six variantes web
par photo : 400, 800 et 1600 px en AVIF et WebP. Chaque variante est calculée directement depuis le
fichier source local, sans recadrage, sans agrandissement, en conservant le ratio et l'orientation.
Si une source est plus petite que la cible, la plus grande variante garde sa largeur native (au plus
1600 px) plutôt que d'être agrandie ; ses six chemins ne sont donc pas toujours exactement 400/800/1600.
L'interface ne propose jamais de réutiliser une variante compressée comme source.

## Génération du panel et qualité

Les réglages de référence hors ligne de `generate-variants.mjs` sont Sharp 0.34.5, libvips 8.17.3,
AOM 3.13.1 et libwebp 1.6.0 : AVIF qualité 70, effort 4, 4:4:4, 8 bits ; WebP qualité 90,
effort 4, `smartSubsample: true`, `alphaQuality: 100`.

Le navigateur utilise désormais des encodeurs WASM chargés à la demande : `@jsquash/avif` (libavif)
en qualité 70, vitesse/effort 4, chroma 4:4:4 (`subsample: 3`), 8 bits ; `@jsquash/webp` (libwebp)
en qualité 90, méthode 4, `use_sharp_yuv: 1` (équivalent pratique visé de `smartSubsample`),
qualité alpha 100. Les nombres de qualité entre versions ou encodeurs ne sont pas une échelle
commune. Les paramètres navigateur ont été retenus après comparaison côte à côte de six photos
représentatives à 1600 px contre les variantes Sharp : portrait/peau, cheveux, tissu, sombre, ciel,
et scène très détaillée. Les sorties WASM 70/90 étaient visuellement proches des sorties Sharp ;
le contrôle qualité huit cas du lot est décrit dans [quality-review.md](quality-review.md). Ces
versions de codecs, leurs choix de quantification et leurs profils de conteneur diffèrent, donc une
égalité binaire ou une équivalence universelle n'est pas promise.

Le navigateur décode via `createImageBitmap` avec `imageOrientation: from-image`, puis via
`Image.decode()` en repli. Le canevas sRGB applique cette orientation avant le redimensionnement ;
les pixels ne reçoivent aucune correction de couleur volontaire. Les profils HDR / wide-gamut
peuvent être ramenés au sRGB par ce trajet ; les photos de référence sont SDR sRGB. Les codecs
reçoivent des pixels et les variantes ne contiennent pas les métadonnées de l'original. Chaque
sortie doit avoir le MIME **et la signature binaire** AVIF/WebP attendus. Aucun `canvas.toBlob()`
WebP n'est utilisé : la norme autorise un repli PNG lorsque le format demandé n'est pas pris en
charge.

## Safari et sélection sur iPhone

Le champ accepte JPG/JPEG, HEIC/HEIF et PNG sans perte. Safari 17 a ajouté la prise en charge HEIC,
mais la lecture réelle dépend de la version d'iOS, du type de HEIF et du chemin de décodage
disponible. Le code essaie d'abord `createImageBitmap`, puis l'élément image natif. Si les deux
échouent, il affiche une consigne de conversion en JPG et n'envoie rien. Apple propose « Most
Compatible » dans Réglages > Appareil photo > Formats pour créer de nouveaux JPG ; cela ne convertit
pas rétroactivement les photos HEIC existantes. L'encodage AVIF et WebP est fourni par WASM ; les
formats sont contrôlés avant tout upload.

Le contrôle a été fait dans l'environnement de développement et sur les codecs WASM, pas sur un
iPhone physique. Il reste à tester les modèles/version iOS réellement utilisés, l'accès à Photos et
Fichiers, les HEIC HDR, la mémoire disponible sur une grande photo, l'orientation portrait et la
reprise après mise en arrière-plan. Un JPG reste le repli supporté si un HEIC particulier ne se
décode pas.

## Capacité Storage dans le panel

`admin_photo_storage_status()` est une RPC `SECURITY DEFINER` sans secret de service dans le
navigateur. Elle exige un rôle admin et `aal2`, agrège les octets `metadata.size` des objets Storage
existants dans **tous les buckets du projet**, puis calcule séparément octets/objets du bucket
`photos`. Le panel affiche également la moyenne des variantes réellement stockées pour les photos
complètes et estime les photos possibles avec le budget restant. La RPC ne retourne pas les chemins
orphelins au navigateur ; une autre action serveur les filtre sur un motif de chemin de variantes
avant suppression via l'API Storage. Les écritures/suppressions de fichiers passent par l'API
Storage ; la table interne `storage.objects` n'est jamais modifiée directement.

Configurer côté Worker (variable serveur, jamais `VITE_`) :

- `PHOTOS_STORAGE_LIMIT_BYTES` : entier positif représentant la limite propre au projet ; aucune
  valeur par défaut n'est supposée.
- `PHOTOS_STORAGE_CRITICAL_UPLOAD_MODE=warn|block` : défaut `warn`. `block` refuse l'ajout si le
  total projet plus les variantes préparées dépasserait la limite configurée ; sans limite valide,
  le mode `block` refuse l'upload. En mode `warn`, l'envoi continue.

À 70 %, le panneau donne une information ; à 85 %, un avertissement important ; à 95 %, une alerte
critique. Ces seuils ne bloquent jamais à eux seuls. Le mode `block` est configurable et compare le
poids réel des blobs de la photo avant transfert avec l'usage global mesuré. L'écran propose de
supprimer d'anciennes photos, nettoyer des variantes orphelines après 24 heures, ou augmenter la
capacité configurée.

La mesure est un instantané et l'envoi Storage est direct depuis le navigateur après la pré-vérification.
Deux admins simultanés peuvent donc faire une course, ou un appel Storage direct peut contourner le
contrôle de l'interface ; ce mécanisme est une anticipation pour l'admin, pas un quota transactionnel
au niveau Supabase. Une garantie stricte contre les courses nécessiterait une réservation serveur
atomique et un chemin d'upload médié par serveur, à concevoir séparément.

Les sommes reflètent la taille logique des objets actuellement présents dans `storage.objects`.
Elles ne représentent pas une mesure de facturation : les éventuelles versions historiques,
sauvegardes internes ou autres frais de stockage gérés par Supabase ne sont pas visibles dans cette
agrégation.

### Estimations avec 2 Go configurés

Les **2 000 000 000 octets** ci-dessous sont un exemple de configuration du projet, pas une limite
universelle de Supabase. Au ratio actuel de 152,28 Mo pour 170 photos (environ 895 768 octets par
photo complète), en supposant qu'aucun autre bucket ne consomme de capacité :

| Seuil | Octets utilisés | Photos totales équivalentes | Ajouts après les 170 actuelles |
|---:|---:|---:|---:|
| 70 % | 1,4 Go | ≈ 1 562 | ≈ 1 392 |
| 85 % | 1,7 Go | ≈ 1 897 | ≈ 1 727 |
| 95 % | 1,9 Go | ≈ 2 121 | ≈ 1 951 |

Dans le panel, l'estimation est plus prudente et dynamique : `(limite - octets globaux mesurés) /
moyenne actuelle des variantes par photo`, arrondie vers le bas. Elle tient donc compte des autres
buckets et des variations du poids des photos ajoutées.

## Suppression admin et cohérence des données

`admin_delete_photo()` (admin + aal2) réalise dans une transaction SQL unique : verrouillage de la
photo, copie des six chemins Storage (ou du seul chemin historique reconnu) dans une file durable,
puis suppression des placements, des lignes de variantes et de la ligne photo. Après le commit, le
client appelle `storage.from('photos').remove(paths)`, puis ferme la tâche. Si Storage échoue, la
tâche garde l'erreur et le panneau permet de relancer la suppression. Il n'y a pas de transaction
atomique entre PostgreSQL et Storage ; l'outbox rend la fenêtre de compensation durable et
rejouable. Le site cesse de référencer la photo dès le commit SQL, même si un objet en attente de
nettoyage existe encore temporairement.

Les doublons de chemin sont évités par les clés de contenu et les contraintes SQL. Le script d'import
refuse les chemins dupliqués dans le manifeste. En reprise, un objet déjà présent est téléchargé et
son poids/empreinte SHA-256 comparés ; une divergence arrête le lot sans écrasement. Les lignes photo,
variantes et placements déjà présentes sont comparées au manifeste avant d'être considérées comme
terminées. Le script de rollback n'efface que ce que son journal indique comme créé par ce lot.

Le bucket `photos` reste public afin que les URLs d'images publiques restent accessibles ; cela
rend le téléchargement direct d'un objet public, pas l'énumération de sa liste. La migration 00005
retire la lecture de liste publique, réserve la liste aux admins, restreint insert/update aux chemins
de variantes AVIF/WebP et exige aal2 pour les suppressions. Le nom de chemin et le MIME ne prouvent
pas à eux seuls que les octets sont une image valide : le générateur vérifie le type réel avant
l'envoi. `photo_variants` et `photo_placements` gardent leurs RLS : lecture publique des seuls
emplacements publiés et gestion admin, avec aal2 lorsque la politique correspondante est activée.

## Procédure future : 170 photos / 1 020 variantes

Ne pas lancer avant validation explicite de la phase. Préconditions : accès confirmé au bon projet,
second facteur configuré par chaque admin, sauvegarde vérifiée, fenêtre de changement planifiée et
lecture des `preflight-selects.sql`. Ne jamais placer de clé privilégiée dans `.env`, le dépôt ou le
client ; l'import historique utilise un secret en mémoire dans un terminal contrôlé, jamais pour
uploader les originaux.

1. Confirmer que le bucket `photos` existe et est public, relever toutes ses policies, l'état du
   schéma, les comptes admin et la présence d'objets ; sauvegarder les tables et objets avant action.
2. Tous les admins s'étant enrôlés au TOTP et ayant ouvert une session aal2, appliquer dans l'ordre
   `20260926000002_require_aal2_for_admin_writes.sql`, puis
   `20260926000003_add_photo_variants_and_placements.sql` (bloc aal2 inclus),
   `20260926000004_add_avif_photo_variants.sql`, et enfin
   `20260926000005_photo_storage_admin_operations.sql`. Si 00002 ne peut pas encore être activée,
   arrêter avant 00005 : la migration 00005 exige aal2 pour ses opérations admin. Ne pas rejouer une
   migration déjà enregistrée.
3. Relire les policies et privilèges dans les tables concernées, le bucket public `photos`, les
   règles de liste/upload/update/delete, et vérifier que les fonctions admin sont exécutables
   seulement par `authenticated` et refusent une session sans admin + aal2. Les buckets non
   concernés ne doivent pas changer de politique métier.
4. Vérifier localement les sources et variantes avec `verify-variants.mjs`, puis refaire les
   simulations d'import : `node scripts/photos-storage/import-photos.mjs --limit 4` puis
   `node scripts/photos-storage/import-photos.mjs`. Attendus : 4 photos / 24 variantes / 4
   placements / 4,27 Mo, puis 170 photos / 1 020 variantes / 190 placements / 152,28 Mo. Simulation
   uniquement : elle ne fait aucun appel réseau.
5. Après validation du test de 4 photos, exécuter l'import avec confirmation explicite de l'hôte,
   vérifier les comptes et les hashes par `postflight-selects.sql`, puis rollback via le journal si
   nécessaire. Les emplacements de test doivent rester non publiés.
6. Exécuter le lot complet. Le script vérifie les objets/lignes présents avant reprise, réutilise
   seulement les contenus identiques et consigne les créations dans un journal privé hors dépôt.
   Vérifier 170 photos, 510 lignes AVIF, 510 lignes WebP, 190 placements et 1 020 objets, ainsi que
   chaque hash et format. En cas d'interruption, rejouer avec le même manifeste ; ne pas changer la
   clé ou écraser un objet divergent. Les uploads interrompus avant insertion DB seront candidats
   à la réconciliation, pas effacés immédiatement.
7. Publier les emplacements après inspection visuelle du site et des galeries. Activer
   `VITE_GALLERIES_FROM_STORAGE` et déployer seulement dans une étape ultérieure distincte. Le
   retour immédiat côté rendu consiste à désactiver le flag ; conserver les fichiers locaux durant
   la période d'observation.

### Retour arrière

En cas d'échec du test ou de l'import, utiliser le journal correspondant pour supprimer uniquement
les lignes/objets créés par le lot, vérifier que ses tâches de nettoyage sont terminées, puis
contrôler le nombre de lignes et objets avant de réessayer. Ne pas annuler 00005 tant qu'une tâche
outbox reste en attente. Après annulation des imports et validation de sauvegardes, la copie inverse
de 00005 doit supprimer d'abord les fonctions, policies créées et la table `photo_storage_cleanup_jobs`,
puis restaurer les policies de lecture et upload précédentes du bucket. Ensuite seulement, revenir
sur 00004 puis 00003 selon leurs sections de rollback ; ne pas supprimer des données de production
pour faire correspondre un schéma. Toute exécution de ce rollback est une opération réelle distincte,
hors de la présente préparation.
