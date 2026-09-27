# Contrôle qualité et contrat de stockage des photos

État au 27 septembre 2026. Contrôle effectué sur le lot local des galeries : **170 photos uniques**,
190 emplacements et **1 020 variantes**. Aucun original n'a été envoyé à Supabase ou ajouté au dépôt.
Les originaux de `../soleana-originaux/` sont uniquement des sources locales de génération ; leur
sauvegarde relève de la photographe et de son dispositif externe, jamais du site.

## Réglages d'encodage

Le générateur hors ligne est `scripts/photos-storage/generate-variants.mjs`. Il utilise Sharp
0.34.5 (libvips 8.17.3, AOM 3.13.1, libwebp 1.6.0) :

| Format | Réglages actuels | Sous-échantillonnage / profondeur |
|---|---|---|
| AVIF | qualité 70/100, effort 4, avec perte | 4:4:4, 8 bits, explicitement fixé |
| WebP | qualité 90/100, effort 4, `smartSubsample: true`, `alphaQuality: 100` | WebP lossy 8 bits, YUV 4:2:0 ; `smartSubsample` améliore le calcul du chroma |

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
est de **895 768 octets (895,8 kB décimaux) par photo** pour les six variantes. Au même ratio moyen,
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
400, 800 et 1600 px, AVIF et WebP, sans métadonnées. Les originaux JPG/HEIC/HEIF sont des entrées
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

Adaptations avant d'activer ce flux :

- Les migrations `00003` et `00004` restent non appliquées ; l'écran désactive déjà l'ajout et la
  suppression tant que les tables requises ne sont pas présentes. Après import des variantes, les
  appliquer selon la procédure documentée et valider RLS avant usage.
- Le générateur navigateur actuel encode AVIF à qualité 50 via `@jsquash/avif` et WebP via
  `canvas.toBlob(..., 0.8)`. Ces réglages ne correspondent pas aux réglages locaux AVIF 70/WebP 90.
  Avant activation admin, choisir et contrôler des réglages navigateur de qualité équivalente, ou
  centraliser le traitement dans un service temporaire explicitement conçu pour ne jamais conserver
  les sources. Aucun service de traitement n'est implémenté dans cette étape.
- Tester sur appareils réels le décodage JPG/HEIC, l'orientation et l'encodage WebP de Safari iOS.
  La proposition `@jsquash/webp` de secours reste non ajoutée et est décrite dans
  [safari-ios.md](safari-ios.md).
- Les suppressions compensatoires actuelles nettoient une erreur remontée par l'opération, mais une
  coupure réseau ambiguë peut laisser un objet orphelin. Ajouter une reprise/réconciliation basée
  sur les clés de contenu avant un usage admin large ; ne jamais résoudre ce cas en conservant
  l'original dans Storage.

Les simulations locales 4 photos (24 variantes, 4 emplacements, 4,27 Mo) et 170 photos
(1 020 variantes, 190 emplacements, 152,28 Mo) n'ont effectué aucun appel réseau ni écriture en
base. Les migrations et l'upload Supabase restent hors de cette phase.
