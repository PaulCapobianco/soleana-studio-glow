# Images des galeries et cache Cloudflare

État au 11 novembre 2026. Rien de ce qui suit n'est activé : le relais d'images est **désactivé par défaut** et aucun réglage Cloudflare n'a été modifié.

## Comment les URLs d'images sont construites

`publicImageUrl(chemin)` dans `src/lib/photo-storage.ts` est le seul endroit qui fabrique l'URL d'une variante (AVIF/WebP, 4 largeurs). Par ordre de priorité :

1. `VITE_IMAGE_BASE_URL` définie (ex. `https://images.soleanastudio.fr`) : `<base>/<chemin>`, sans le préfixe `/storage/v1/object/public/photos/`.
2. `VITE_IMAGE_PROXY=true` : `/img/<chemin>` (relais du Worker, voir plus bas).
3. Sinon : `<VITE_SUPABASE_URL>/storage/v1/object/public/photos/<chemin>` (état actuel, identique à ce que renvoyait `supabase-js`, vérifié par test).

Ne passent **pas** par cette fonction : les images locales (`/assets/…`, déjà en cache d'un an depuis le commit 407bbbc), les couvertures d'événements et les anciennes photos (`image_url` stockée en base, URL Supabase complète).

## Ce qui existe déjà côté Supabase

Mesuré le 11 novembre (GET d'une variante de 1600 px) : `cache-control: public, max-age=31536000` et `cf-cache-status: HIT`. Le bucket est donc déjà servi par un CDN Cloudflare appartenant à Supabase, avec un cache d'un an. Le relais n'apporte pas « un cache là où il n'y en avait pas » ; il apporte :

- **la même origine** : pas de DNS, de TLS ni de connexion à ouvrir vers `kvzzzwjddanwedzotaka.supabase.co` (le coût le plus visible sur mobile, 100 à 300 ms), et multiplexage HTTP/2 avec la page ;
- **l'indépendance vis-à-vis des limites de Supabase** : 429 observés à 16 requêtes en parallèle depuis une même adresse ; le cache du Worker absorbe les rafales ;
- `immutable` (le navigateur ne revalide plus) et une liste blanche de chemins.

## Ce que fait le relais (dans le dépôt)

`src/lib/image-proxy.ts`, branché dans `src/server.ts` avant l'application, actif seulement si `VITE_IMAGE_PROXY=true` au build :

- GET et HEAD uniquement (405 sinon, `Allow: GET, HEAD`).
- Chemins autorisés : mêmes motifs que les politiques Storage (`galleries/<cat>/<hex>/<hex>-<largeur>.avif|webp`, couvertures `events/<uuid>/cover-…webp`). Rejet (404, sans contacter Supabase) de tout `..`, `%`, `\`, `//`, autre bucket, autre extension, URL absolue. L'URL générée est toujours relative (`/img/…`) : pas de redirection ouverte, et le relais ne suit jamais une redirection (`redirect: "manual"`).
- Aucun en-tête du visiteur n'est transmis à Supabase (ni cookie, ni jeton) ; seul `Accept` part. De la réponse, seuls `Content-Type`, `Content-Length`, `ETag`, `Last-Modified` reviennent.
- Seules les réponses `image/avif` ou `image/webp` de moins de 3 Mo (le plus gros fichier actuel : 916 Ko) sont servies ; le reste donne 502 sans cache.
- `Cache-Control: public, max-age=31536000, immutable` ; copie dans le cache du Worker (`caches.default`) ; en-tête de diagnostic `X-Image-Cache: HIT|MISS`.
- 23 tests (`src/lib/image-proxy.test.ts`) : chemins refusés, méthodes, en-têtes, cache, type et taille, redirection, erreurs.

Variable absente : `/img/…` renvoie 404 et le site est identique octet pour octet (16 URLs comparées).

## Mesures locales (`wrangler dev --local`, base de production en lecture)

| Cas | Temps |
|---|---:|
| Relais, 1re requête (récupération chez Supabase) | 192 ms |
| Relais, requêtes suivantes (cache du Worker) | 3 à 4 ms |
| Direct Supabase (déjà en cache chez eux) | 63 à 76 ms |
| Lighthouse mobile, avec / sans relais | accueil 89 / 89, /portfolio 93 / 93, /portfolio/couple 88 / 89, page SEO 100 / 100 |

Lecture honnête : en local, l'écart (3 ms contre 70 ms) vient de l'absence de réseau entre le navigateur et le Worker ; Lighthouse ne voit **aucun gain** (le calcul simulé n'isole pas bien le coût d'une origine supplémentaire). Le bénéfice réel ne se mesure qu'en production, depuis un mobile (voir « À mesurer »).

## Risques et coûts

- **Une requête Worker par image**, y compris pour un hit de cache. Une page galerie charge une vingtaine d'images (les autres sont différées) : l'offre gratuite Workers (100 000 requêtes par jour) serait atteinte vers 5 000 visites par jour ; l'offre payante inclut 10 millions par mois. À vérifier dans Cloudflare avant d'activer. C'est le principal risque.
- **Retrait d'une photo (RGPD)** : la politique de confidentialité promet un retrait « du site et de son stockage dans les meilleurs délais ». Avec `immutable` un an, les copies restent dans le cache du Worker et dans les navigateurs. Côté Cloudflare : Caching, Configuration, Purge Cache, « Custom purge » avec l'URL `https://soleanastudio.fr/img/<chemin>` ; côté visiteurs, impossible avant expiration. Si cela pose problème, réduire la durée (constante `CACHE_CONTROL` de `image-proxy.ts`, par exemple 30 jours).
- **Cache par centre de données** : le cache du Worker n'est pas répliqué ; la première vue dans chaque ville est un MISS. Le cache du Worker ne fonctionne pas sur un domaine `*.workers.dev` : une préversion donnera toujours MISS.
- **Cache éviction** : possible à tout moment ; le relais retourne simplement chercher chez Supabase.
- Les noms de fichiers sont à contenu unique (empreintes) : une modification de photo crée de nouveaux chemins, donc pas de risque de voir l'ancienne image servie.

## Alternative sans Worker par image (non testée, à valider avec Cloudflare)

Un sous-domaine `images.soleanastudio.fr` (DNS proxifié, CNAME vers l'hôte Supabase) avec : règle de cache « tout mettre en cache, TTL 1 an », réécriture d'URL `/<chemin>` vers `/storage/v1/object/public/photos/<chemin>`, et remplacement de l'en-tête `Host` par celui du projet Supabase (Origin Rules). Puis `VITE_IMAGE_BASE_URL=https://images.soleanastudio.fr` au build, sans le relais. Avantage : aucune requête Worker consommée. Inconvénients : trois règles à maintenir hors dépôt, et la CSP (`src/lib/security-headers.ts`, `img-src`) doit autoriser ce sous-domaine. Je n'ai pas pu vérifier ces fonctions sur le compte (pas d'accès au tableau de bord).

## Ce que Paul devra faire s'il active le relais

1. Vérifier le plan Workers (limite de requêtes) et l'estimation de trafic.
2. Construire et déployer : `VITE_GALLERIES_FROM_STORAGE=true VITE_IMAGE_PROXY=true npm run deploy:cf`. Aucun réglage Cloudflare n'est requis : la route `soleanastudio.fr/*` du `wrangler.jsonc` couvre déjà `/img/*`.
3. Tester : `curl -sI https://soleanastudio.fr/img/<chemin d'une variante>` deux fois : `X-Image-Cache` doit passer de `MISS` à `HIT`, `cache-control: public, max-age=31536000, immutable`.
4. Mesurer depuis un mobile réel (PageSpeed Insights sur `/photographe-couple-marseille` et `/portfolio/couple`) avant et après ; conserver seulement si le LCP baisse.
5. Retour arrière : redéployer sans `VITE_IMAGE_PROXY` (`VITE_GALLERIES_FROM_STORAGE=true npm run deploy:cf`) ou `wrangler rollback`.
