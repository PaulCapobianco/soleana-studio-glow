# Soleana Studio

Site vitrine d'une photographe (Marseille) : pages publiques, galeries photos servies depuis Supabase Storage, module Événements (mini-séances de Noël…) et administration protégée par double authentification.

**Pile** : TanStack Start (React 19, rendu serveur) · Vite · Tailwind 4 · Supabase (base, Auth, Storage) · Cloudflare Workers · Vitest. **npm uniquement** (ne pas toucher à `bun.lock`).

Avant toute intervention : lire `CLAUDE.md` (règles de travail) et `AUDIT.md`.

## Démarrer

```bash
npm install
cp .env.example .env       # puis renseigner les deux variables Supabase (jamais commiter .env)
npm run dev                # serveur de développement
npm run typecheck && npm test && npm run build
```

⚠️ L'environnement local utilise la **base de production** : ne jamais modifier de contenu réel pour tester (créer puis supprimer un élément de test).

### Scripts

| Commande | Effet |
|---|---|
| `npm run dev` | développement (Vite) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run build` | typecheck puis build Vite |
| `npm test` | tests (Vitest) ; `npx vitest run --config scripts/photos-storage/vitest.config.ts` pour les tests des scripts photos |
| `npm run lint` / `npm run format` | ESLint / Prettier |
| `npm run dev:cf` | build puis `wrangler dev` (Worker en local) |
| `npm run deploy:cf` | build puis `wrangler deploy` (**production**) |

## Variables d'environnement

Lues **au build** (Vite remplace les `VITE_*`) sauf mention contraire.

| Variable | Rôle | Défaut |
|---|---|---|
| `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` | projet Supabase (clé publique) | obligatoires |
| `VITE_GALLERIES_FROM_STORAGE` | `true` : galeries lues depuis Supabase Storage (sinon fichiers locaux) ; active aussi `/portfolio/<catégorie>`, le sitemap des catégories et les galeries d'événement | éteint |
| `VITE_IMAGE_BASE_URL` | remplace l'hôte des images de galerie (sous-domaine de cache) | absent |
| `VITE_IMAGE_PROXY` | `true` : images relayées par le Worker (`/img/*`, voir `docs/images-cloudflare-cache.md`) | éteint |
| `PHOTOS_STORAGE_LIMIT_BYTES`, `PHOTOS_STORAGE_CRITICAL_UPLOAD_MODE` | capacité de stockage affichée/imposée dans l'admin (`warn` ou `block`), lues à l'exécution par le Worker | absentes |
| `SUPABASE_SERVICE_ROLE_KEY` | **uniquement** pour les scripts d'import (`scripts/photos-storage`), saisie en mémoire dans le terminal | jamais dans un fichier |

## Architecture

```
src/
  routes/               routes fichier par fichier (TanStack Router). Un fichier de route n'exporte
                        QUE `Route` (sinon il n'est pas découpé et alourdit toutes les pages).
    admin/              espace privé (garde dans admin/_authed.tsx : session, rôle, double authentification)
  components/
    site/               composants des pages publiques
    admin/              composants d'administration (PhotosAdmin + photos/, EventEditor + sections…)
    ui/                 kit shadcn (composants génériques, certains inutilisés)
  lib/
    photos/             photos : URLs publiques, lecture des galeries, encodage AVIF/WebP dans le
                        navigateur, envoi d'événement, règles sur les variantes, capacité de stockage
    events/             module Événements : types, validation, dates, thème, lecture, administration
    admin/              aides d'administration : messages d'erreur 2FA, mot de passe, double authentification
    image-proxy.ts      relais d'images du Worker (désactivé par défaut)
    security-headers.ts en-têtes de sécurité et CSP (src/server.ts les applique)
    supabase-lazy.ts    import dynamique du client Supabase pour les pages publiques
    supabase-pagination.ts  lecture page par page (PostgREST plafonne à 1 000 lignes)
  integrations/supabase client et types (générés, ne pas éditer à la main)
  data/                 contenus statiques (Noël 2026)
  server.ts             entrée du Worker : en-têtes de sécurité, page d'erreur, relais d'images
supabase/migrations/    migrations SQL (appliquées à la main par Paul, jamais automatiquement)
scripts/photos-storage/ génération, vérification, import et retour arrière des photos (hors déploiement)
docs/                   documentation (voir docs/README.md)
```

### Principes à connaître
- **La RLS est la seule protection réelle** des données : les droits Supabase par défaut accordent aussi l'écriture à `anon`. Toute table a la RLS et ses politiques dans la même migration ; les écritures admin exigent le rôle `admin` **et** une session `aal2`.
- **Public sans Supabase dans le JavaScript** : les loaders lisent côté serveur ; le client (`supabase-js`, ≈ 53 Ko) n'est chargé dans le navigateur qu'à la demande (`getSupabase()`), l'admin garde le client statique.
- **Photos** : jamais d'original dans le dépôt ni dans Supabase (`../soleana-originaux`, hors dépôt). Chaque photo a 8 variantes (AVIF + WebP × 400/800/1200/1600) ; une photo sans AVIF **et** WebP aux mêmes largeurs n'est pas affichée.
- **Photos d'événement** : jamais de catégorie (`category_id` NULL), pour ne pas apparaître dans les anciens affichages par catégorie.

## Déploiement et retour arrière

Production : Cloudflare Workers, route `soleanastudio.fr/*` (`wrangler.jsonc`).

```bash
# 1. vérifications
npm run typecheck && npm test
# 2. déploiement (build inclus) ; la production utilise le flag des galeries Storage
VITE_GALLERIES_FROM_STORAGE=true npm run deploy:cf
```

- **Retour arrière rapide** : `npx wrangler rollback` (version précédente) ; l'historique : `npx wrangler deployments list`.
- Une **préversion** (non déployée) : `VITE_GALLERIES_FROM_STORAGE=true npm run build && npx wrangler versions upload`. Ne jamais utiliser `wrangler versions deploy` sans décision explicite.
- Après un déploiement : comparer la page d'accueil et une page galerie, vérifier la console (aucune violation CSP), tester l'admin (envoi d'une photo de test).
- Les migrations ne sont **jamais** appliquées par un déploiement : voir `supabase/migrations/` et `docs/photos-storage/`.

## Contrôle de production (lecture seule)

```bash
node scripts/smoke-test.mjs https://soleanastudio.fr
```

35 contrôles (GET/HEAD seulement, 4 requêtes en parallèle au plus) : pages publiques en 200 et 404 d'une URL inexistante, sitemap (19 URLs dont les 4 `/portfolio/<catégorie>`), `robots.txt`, en-têtes (CSP bloquante, HSTS, nosniff, Referrer-Policy, cache `immutable` d'un an sur `/assets`), galeries (`<picture>` AVIF puis WebP, 4 largeurs, dimensions, pas de « Galerie en cours de remplissage », pas de fichier local), images des 4 pages SEO en `image/avif` ou `image/webp`, lien Pelli de la page Noël autorisé par la CSP, `/admin` redirigé vers la connexion sans donnée d'admin. Affiche un tableau OK / KO et sort avec le code 1 si un contrôle échoue. À lancer après chaque déploiement ; il ne remplace pas les tests dans un navigateur (admin connecté, Pelli).

## Tests

`npm test` (≈ 345 tests : helpers, validation, composants d'administration, en-têtes, relais d'images, lecture des galeries). Les tests des scripts photos ont leur configuration (`scripts/photos-storage/vitest.config.ts`).
