# Photos depuis Safari iOS

## État du traitement

Le panel accepte les originaux JPG/JPEG, HEIC/HEIF fixe et PNG de 25 Mo maximum. Il rejette WebP et
AVIF en entrée afin d'éviter de réencoder une ancienne variante web comme si c'était un original.
Le fichier doit également présenter une signature binaire cohérente avec l'un de ces formats ; le
nom et le type MIME seuls ne suffisent pas.

Le décodeur essaie `createImageBitmap(..., { imageOrientation: "from-image" })`, puis un élément
`Image` natif avec URL objet. WebKit annonce le décodage HEIC dans Safari 17 / iOS 17 et versions
ultérieures ; la réussite de `createImageBitmap`, la sélection directe dans Photos/Fichiers et
l'application de l'orientation EXIF doivent néanmoins être confirmées sur un vrai iPhone.
Si les deux chemins échouent, le panel explique de convertir l'image en JPG. Il n'envoie aucun
original avant ou après l'échec.

## Encodage AVIF et WebP

Le panel encode dans deux modules WASM jSquash, chargés à la première préparation d'image et jamais
pour la galerie publique :

- AVIF via `@jsquash/avif`, déjà présent ;
- WebP via `@jsquash/webp`, ajouté car Safari peut retourner un PNG quand un type de sortie Canvas
  n'est pas pris en charge.

Le panel n'utilise plus `canvas.toBlob("image/webp")`. Chaque blob est contrôlé à la fois par son
MIME et sa signature RIFF/WEBP ou ISO-BMFF/AVIF. Un repli PNG, même annoncé avec un MIME trompeur,
arrête le traitement avant le premier upload. Les modules WASM produisent directement des pixels
AVIF/WebP sans blocs EXIF, ICC ou XMP.

Le WebP WASM pèse environ 281 ko non compressé et n'est chargé que dans l'écran admin quand une
photo est préparée. L'AVIF WASM déjà présent pèse environ 3,49 Mo non compressé.

## Limites restantes

- Safari avant iOS 17 n'a pas le décodage HEIC documenté de WebKit : utiliser « Le plus compatible »
  dans Réglages > Appareil photo > Formats ou convertir en JPG dans Photos/Fichiers.
- Le décodage natif HEIC dépend du codec présent sur l'appareil et de la manière dont Photos remet
  le fichier au navigateur. Une photo HEIC avec codec/structure non pris en charge est rejetée avec
  invitation à convertir en JPG.
- Les orientations HEIC/EXIF, les images HDR/wide-gamut et le traitement sur une photo réelle de
  25 Mo doivent être vérifiés sur iPhone. Le canvas standard passe les pixels en sRGB ; aucun
  étalonnage ou changement de rendu n'est appliqué volontairement, mais les profils Display-P3/HDR
  peuvent perdre leur étendue sur ce chemin.
- Aucun test physique d'iPhone n'a été fait dans cette étape. Un build Chrome et les tests Vitest ne
  valident pas l'accès à Photos, le décodage HEIC natif, la mémoire disponible ni la durée WASM sur
  iOS. Le fichier original demeure local et seule la sortie encodée peut être transmise.

Références : [WebKit sur les images HEIC dans Safari 17](https://webkit.org/blog/14445/webkit-features-in-safari-17-0/),
[spécification HTML de repli PNG pour les formats Canvas non supportés](https://html.spec.whatwg.org/multipage/canvas.html#dom-canvas-toblob-dev),
[jSquash et ses encodeurs WASM AVIF/WebP](https://github.com/jamsinclair/jSquash).
