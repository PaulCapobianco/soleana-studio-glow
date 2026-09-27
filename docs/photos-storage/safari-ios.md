# Envoi de photos depuis Safari iOS

## État du flux actuel

L'admin redimensionne la photo sur un `<canvas>`, produit l'AVIF avec l'encodeur WASM déjà
présent, puis demande le WebP à `canvas.toBlob(..., "image/webp")`. Le code vérifie le type
du `Blob` avant tout envoi. Si le navigateur renvoie du PNG en repli, l'opération échoue avec
un message explicite et aucun fichier n'est envoyé.

Ce contrôle est nécessaire : [WebKit remplace un format de sortie non pris en charge par
`image/png`](https://github.com/WebKit/WebKit/blob/main/Source/WebCore/html/HTMLCanvasElement.cpp).
Le décodage d'un HEIC/HEIF et l'orientation via `createImageBitmap` doivent aussi être
vérifiés sur un vrai iPhone ; un test dans Chrome de bureau ne les valide pas pour Safari iOS.

## Proposition si le test iPhone confirme l'échec WebP

Ajouter `@jsquash/webp` comme encodeur de secours **chargé seulement lorsque** `toBlob` ne
renvoie pas un vrai WebP. Lui passer le même `ImageData` que celui utilisé pour l'AVIF, puis
conserver la vérification de signature, de dimensions, de métadonnées et d'empreinte avant
l'envoi. [jSquash fournit un encodeur WebP pour le
navigateur](https://github.com/jamsinclair/jSquash#usage-in-the-browser).

Avant l'ajout : mesurer le poids du module WASM et le temps d'encodage pour une photo de
25 Mo sur iPhone, vérifier son intégration Vite en build de production, puis tester le flux
sur Safari iOS avec JPG et HEIC réels. Le repli ne doit charger aucun code supplémentaire
pour les navigateurs où l'encodage natif fonctionne. Aucune dépendance n'est ajoutée à ce
stade, faute de test Safari iOS sur appareil.
