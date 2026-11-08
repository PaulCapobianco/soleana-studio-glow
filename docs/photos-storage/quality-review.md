# Contrôle qualité et contrat de stockage des photos

État au 28 septembre 2026. Les tableaux initiaux ci-dessous décrivent le lot antérieur q70/q90 et
sont historiques; la section « Régénération définitive q55 » donne les réglages et mesures qui font
foi. Contrôle effectué sur **170 photos uniques** et 190 emplacements. Aucun original n'a été envoyé
à Supabase ou ajouté au dépôt.
Les originaux de `../soleana-originaux/` sont uniquement des sources locales de génération ; leur
sauvegarde relève de la photographe et de son dispositif externe, jamais du site.

## Réglages d'encodage

Le générateur hors ligne est `scripts/photos-storage/generate-variants.mjs`. Il utilise Sharp
0.34.5 (libvips 8.17.3, AOM 3.13.1, libwebp 1.6.0) :

| Format | Réglages actuels | Sous-échantillonnage / profondeur |
|---|---|---|
| AVIF, ancien profil | qualité 70/100, effort 4, avec perte | 4:4:4, 8 bits, explicitement fixé |
| WebP, ancien profil | qualité 90/100, effort 4, `smartSubsample: true`, `alphaQuality: 100` | WebP lossy 8 bits, YUV 4:2:0 ; `smartSubsample` améliore le calcul du chroma |

Les réglages précédents étaient AVIF qualité 50, effort 4 et WebP qualité 80 avec l'effort par défaut
4. L'examen visuel a révélé une perte de microtexture sur des cheveux, du tricot et des détails fins,
plus marquée en AVIF 1600. Le nouveau réglage réduit cette perte. Il a été choisi pour la fidélité
photographique ; aucune réduction supplémentaire n'a été recherchée pour économiser du stockage.

Chaque variante est générée séparément à partir des octets de l'original sélectionné. Le pipeline
applique l'orientation EXIF éventuelle avec `rotate()`, réduit la largeur sans agrandir et conserve
le ratio. Il n'applique ni recadrage, ni correction colorimétrique volontaire. Les entrées de ce lot
sont JPEG avec profil ICC sRGB ; aucune orientation EXIF n'était déclarée. Sharp produit en sRGB
(web-friendly par défaut) et retire les métadonnées en sortie. Les fichiers contrôlés ne contiennent
ni EXIF, ICC, XMP, IPTC ni marqueur d'orientation. Références : [options Sharp AVIF/WebP](https://sharp.pixelplumbing.com/api-output/),
[orientation](https://sharp.pixelplumbing.com/api-operation/) et [couleurs](https://sharp.pixelplumbing.com/api-colour/).

## Contrôle visuel représentatif

Comparaison côte à côte de chaque original avec ses rendus 800 et 1600 en WebP et AVIF. Huit photos
ont été choisies pour couvrir les sujets et conditions ci-dessous. Les identifiants sont des clés
opaques du manifeste ; aucun nom de fichier original ni chemin privé n'est publié ici.

| Cas observé | Clé opaque | Résultat après réglage actuel |
|---|---|---|
| Portrait et peau | `galleries/portrait/628d9464a088` | Dégradés de peau continus, détails naturels ; pas d'aplats ni de teinte visiblement déplacée. |
| Cheveux et détails fins | `galleries/portrait/14151a90e739` | Mèches mieux définies qu'avec les anciens réglages, sans contours artificiels visibles. |
| Robe, tricot et tissu | `galleries/famille/d023666585f3` | Motif fin plus lisible, sans texture transformée en aplats. |
| Photo sombre | `galleries/portrait/a9b980af7fd2` | Détails des ombres conservés ; pas de noirs bouchés supplémentaires observés. |
| Fort contraste / silhouette | `galleries/couple/ac7bdd56fa2f` | Contours propres, sans halo ou ringing visible. |
| Ciel et dégradé uniforme | `galleries/couple/9b613eac9ffb` | Dégradé régulier ; aucun banding visible à 800 ou 1600. |
| Bokeh et arrière-plan flou | `galleries/portrait/dd83346dedf7` | Flou progressif conservé, sans aplats ni contours de transition visibles. |
| Scène très détaillée | `galleries/couple/528ffc807d6a` | Détails fins de l'eau et des rochers mieux préservés ; pas d'artefact gênant visible. |

Sur ces cas, les comparaisons AVIF et WebP sont cohérentes avec l'original à taille affichée. Les
anciens réglages donnaient des résultats globalement acceptables à 800, mais perdaient visiblement
davantage de texture à 1600. Les huit jeux de variantes retenus ont été régénérés depuis leur
original puis vérifiés : leurs empreintes correspondent aux sorties contrôlées. Il s'agit d'un
contrôle visuel représentatif, pas d'une expertise colorimétrique instrumentée de chaque écran.

## Inventaire et poids vérifiés

`verify-variants.mjs` valide pour chaque fichier le format réel, les dimensions attendues, le poids,
le SHA-256, les en-têtes AVIF/WebP et l'absence de métadonnées. Il détecte également les fichiers
image non indexés. Résultat : six variantes par photo, aucune manquante ou en double, aucun fichier
orphelin. Les 170 clés uniques correspondent aux 170 photos du manifeste ; la correspondance avec
les originaux a été vérifiée localement, et le rapport contenant chemins et noms reste hors dépôt.

| Taille | AVIF | WebP | Total |
|---|---:|---:|---:|
| 400 px | 4,73 Mo | 7,18 Mo | 11,90 Mo |
| 800 px | 13,14 Mo | 21,35 Mo | 34,49 Mo |
| 1600 px | 37,53 Mo | 68,35 Mo | 105,89 Mo |
| **Total** | **55,40 Mo** | **96,88 Mo** | **152,28 Mo** |

Les largeurs sont plafonnées à la largeur source si elle est inférieure à la cible. Le poids moyen
historique était de **895 768 octets (895,8 kB décimaux) par photo** pour les six variantes. Au même ratio moyen,
le stockage des seules variantes serait d'environ :

| Photos | Variantes | Estimation |
|---:|---:|---:|
| 170 | 1 020 | 152,28 Mo |
| 500 | 3 000 | 447,88 Mo |
| 1 000 | 6 000 | 895,77 Mo |
| 2 000 | 12 000 | 1,792 Go |

Ces estimations excluent les lignes de base, les journaux, la réplication, les versions temporaires,
le cache CDN et les frais éventuels de requêtes. Le résultat de 152,28 Mo est supérieur aux
78,30 Mo des réglages précédents : la hausse reflète la priorité accordée à la qualité.

Mesure locale du poids servi sur la galerie couple 1, dix images, cache désactivé :

| Viewport / DPR | WebP historique | AVIF servi après | Écart |
|---|---:|---:|---:|
| 360 px / 3 | 1 129 722 o | 1 039 887 o | −8,0 % |
| 768 px / 2 | 1 129 722 o | 1 039 887 o | −8,0 % |
| 1 280 px / 1 | 1 129 722 o | 380 579 o | −66,3 % |

Mesure du serveur local et du choix de `srcset`, non une mesure de production ni du CDN.

## Architecture de stockage verrouillée

Le bucket Supabase `photos` contiendra uniquement les variantes web nécessaires au site et au panel :
400, 800, 1200 et 1600 px, AVIF et WebP, sans métadonnées. Les originaux JPG/HEIC/HEIF sont des entrées
éphémères de traitement : ils ne sont ni uploadés, ni conservés en Storage, ni déposés dans Git.
Le site n'assure aucune sauvegarde des originaux. Le manifeste publicisé au dépôt ne contient que
des clés anonymes et des informations de variantes ; le rapport privé de correspondance reste
hors dépôt.

Flux admin analysé (aucune migration ni écriture réseau effectuée durant cette validation) :

1. La photographe sélectionne une image depuis son appareil.
2. `generateBrowserPhotoVariants()` la décode en mémoire, applique l'orientation, redimensionne
   sans recadrage et produit les blobs AVIF/WebP.
3. `photos.tsx` envoie seulement ces blobs au bucket, puis crée les lignes photo, variantes et
   emplacements. Le `File` source n'est pas passé à `storage.upload()`.
4. Le navigateur libère sa référence au fichier après l'opération ; Supabase ne reçoit pas
   l'original. Une modification future doit remplacer les variantes par des clés de contenu puis
   nettoyer les anciennes après validation de la nouvelle écriture.

Adaptations préparées avant d'activer ce flux :

- Les migrations `00003` et `00004` restent non appliquées ; l'écran désactive déjà l'ajout et la
  suppression tant que les tables requises ne sont pas présentes. Pour la voie approuvée, les
  appliquer avant l'import brouillon et valider RLS avec le runbook.
- Le générateur navigateur est désormais calé visuellement sur le profil final avec AVIF
  WASM q55/effort 4/4:4:4/8 bits et WebP WASM q80/méthode 4. Les versions d'encodeurs diffèrent,
  donc l'égalité numérique ou binaire n'est pas promise. Les détails figurent dans
  [admin-storage-operations.md](admin-storage-operations.md).
- Safari utilise les codecs WASM pour AVIF et WebP, et son décodeur natif puis `Image.decode()` pour
  HEIC. Aucun essai physique iPhone n'a encore été réalisé ; les limites sont décrites dans
  [safari-ios.md](safari-ios.md).
- La suppression prépare désormais un outbox SQL : lignes de base retirées atomiquement avec leurs
  chemins, suppression Storage via API, puis reprise de la tâche en cas d'échec. La migration
  00005 reste à appliquer. Voir [admin-storage-operations.md](admin-storage-operations.md).

Les simulations initiales indiquées ci-dessus sont historiques. Les simulations q55 actuelles
(4 photos : 32 variantes, 4 emplacements, 3,88 Mo; 170 photos : 1 360 variantes, 190 emplacements,
126,26 Mo) n'ont effectué aucun appel réseau ni écriture en base. Les migrations et l'upload
Supabase restent hors de cette phase.

## Régénération définitive q55

La photographe a validé visuellement AVIF q55. Le profil final de `generate-variants.mjs` est Sharp
0.34.5 / libvips 8.17.3, AVIF q55, effort 4, 4:4:4 et 8 bits; WebP q80, effort 4,
`smartSubsample: true`, `alphaQuality: 100`. Il ne reste aucun profil q60 comme option d'exécution
du lot. La génération complète a produit 1 360 fichiers, puis `verify-variants.mjs` a validé chaque
format, dimension, taille, SHA-256, signature et absence de métadonnées, et n'a trouvé aucun fichier
orphelin ou doublon.

| Mesure finale | AVIF | WebP | Total |
|---|---:|---:|---:|
| 400 px | 3 033 836 o | 4 324 448 o | 7 358 284 o |
| 800 px | 8 254 401 o | 12 515 120 o | 20 769 521 o |
| 1200 px | 14 778 161 o | 23 387 460 o | 38 165 621 o |
| 1600 px | 22 736 459 o | 37 230 160 o | 59 966 619 o |
| **Total** | **48 802 857 o** | **77 457 188 o** | **126 260 045 o** |

Cela représente 126,26 Mo décimaux (120,36 Mio), soit **742 706 octets par photo** en moyenne.
Au même ratio, estimation de stockage des seules variantes : 371 353 074 o pour 500 photos,
742 706 147 o pour 1 000 et 1 485 412 294 o (1,49 Go) pour 2 000. Ces projections n'incluent pas
les autres buckets, sauvegardes, versions internes, cache ni frais de requêtes.

Les empreintes des 170 originaux ont été vérifiées avant et après la génération; elles correspondent
aux `original_sha256` du manifeste et au rapport privé de correspondance. Les dimensions de chaque
entrée du manifeste correspondent aux métadonnées de l'original après prise en compte de l'orientation
EXIF. Aucun champ vérifié de l'original n'a été remplacé par les dimensions d'une source WebP locale.
Les originaux n'ont pas été modifiés.
