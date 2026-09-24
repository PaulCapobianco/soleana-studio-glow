# Audit technique — Soleana Studio

**Date :** 23 septembre 2026
**Périmètre :** dépôt `soleana-studio-glow-main` (code source, migrations SQL, configuration de build et de déploiement, build `dist/` présent).
**Méthode :** lecture seule. Analyse statique du code, `npx tsc --noEmit`, `npx eslint .`, `npm audit`, inspection du bundle compilé `dist/`, lecture des migrations SQL.
**Hors périmètre :** le code du prestataire **Pelli** (formulaire de contact, réservation, espace client), qui n'est pas dans ce dépôt. Pelli est néanmoins traité sous l'angle RGPD. La base Supabase en production n'a pas été interrogée : les constats sur les droits d'accès reposent sur les migrations SQL du dépôt.

---

## Synthèse

Le projet est un **site vitrine SSR** (TanStack Start + React 19 sur Cloudflare Workers) adossé à **Supabase** pour le contenu éditorial et un back-office d'administration. La partie publique est soignée : SEO structuré, images `.webp` avec `srcset`, `alt` renseignés sur les 23 balises `<img>`, `prefers-reduced-motion` géré dans les styles, RLS activée sur toutes les tables. La conception de sécurité côté base de données est correcte dans son principe.

En revanche, **le code déployé contient deux régressions bloquantes** qui rendent des pans entiers du site inopérants, et le projet souffre d'une **absence totale de versionnement** (aucun dépôt Git, `.env` non protégé).

### Les 5 risques majeurs

1. **Le back-office d'administration est entièrement non fonctionnel** (BUG-01). La fonction `loadSupabaseClient` est appelée dans 7 fichiers sans y être importée. Vérifié dans le bundle livré : `dist/client/assets/demandes-CvLaf9Ec.js` appelle `loadSupabaseClient()` alors que le symbole n'y est pas défini. Toute navigation vers `/admin/*` lève une `ReferenceError`.
2. **Les 4 pages de portfolio par catégorie sont inaccessibles** (BUG-02). `portfolio.tsx` est une route parente qui ne rend pas d'`<Outlet />` : `/portfolio/couple`, `/famille`, `/grossesse`, `/portrait` affichent la page portfolio générique.
3. **Aucun dépôt Git, et `.env` non listé dans `.gitignore`** (SEC-01, CONF-01). Pas d'historique, pas de sauvegarde, pas de possibilité de revenir en arrière ; et le jour où Git sera initialisé en l'état, `.env` sera committé.
4. **La protection anti-spam du formulaire de contact existe mais n'est branchée nulle part** (SEC-03). `submitContactRequest` (CSRF + Turnstile + honeypot) est absent du build. La table `contact_requests` reste ouverte à l'insertion anonyme via l'API REST Supabase, dont la clé publiable est dans le bundle client.
5. **Non-conformité RGPD sur le consentement cookies** (RGPD-01). Les mentions légales affichent « En poursuivant votre navigation, vous acceptez l'utilisation éventuelle de ces cookies », formulation invalide depuis les lignes directrices CNIL de 2020, alors que le site charge trois iframes tiers sans aucun mécanisme de recueil du consentement.

**Bonne nouvelle sur deux points prioritaires :** la clé `service_role` n'est **jamais** exposée côté navigateur (vérifié dans `dist/client`), et les 312 Mo d'assets sources ne sont **pas** un problème pour Cloudflare — seuls 40 Mo partent en production.

---

## Réponses aux questions posées

### Le back-office est-il déployé en production ?

**Oui.** `wrangler.jsonc:5-10` route `soleanastudio.fr/*` vers le Worker, et `main` pointe sur `dist/server/server.js` qui sert l'intégralité de l'arbre de routes, `/admin/*` compris. Les chunks admin sont présents dans `dist/client/assets/` (`_authed-DZKjtYCr.js`, `demandes-CvLaf9Ec.js`, etc.). Aucune exclusion de route, aucun garde d'environnement. `public/robots.txt` contient `Disallow: /admin`, ce qui empêche l'indexation mais **pas** l'accès.

### 1. Que peut réellement faire un compte non-admin créé via `/admin/login` ?

`src/routes/admin/login.tsx:33-39` expose un mode « Créer un compte » accessible à n'importe quel visiteur. Analyse table par table d'après `supabase/migrations/20260530053910_*.sql` :

| Objet | Lecture par un compte non-admin | Écriture par un compte non-admin |
|---|---|---|
| `user_roles` | Ses propres lignes uniquement (`user_id = auth.uid()`, l. 21) — donc aucune | **Non** : aucune politique INSERT/UPDATE/DELETE. Auto-attribution du rôle admin impossible |
| `categories` | Oui (politique publique, l. 34) — déjà accessible en anonyme | Non : `has_role(auth.uid(), 'admin')` requis (l. 35) |
| `photos` | Oui, `published = true` (l. 62) — déjà accessible en anonyme | Non (l. 63) |
| `services` | Oui, `active = true` (l. 84) | Non (l. 85) |
| `reviews` | Oui, `published = true` (l. 108) | Non (l. 109) |
| `faq` | Oui, `published = true` (l. 128) | Non (l. 129) |
| `seo_pages` | Oui, `published = true` (l. 191) | Non (l. 192) |
| `site_settings` | Oui, toutes les lignes (l. 219) — déjà accessible en anonyme | Non (l. 220) |
| `contact_requests` | **Non** : SELECT réservé aux admins (l. 169) | INSERT autorisé (l. 163) — mais déjà autorisé en anonyme |
| Bucket Storage `photos` | Lecture publique (l. 227) — bucket déclaré `public` (l. 225) | Non : INSERT/UPDATE/DELETE exigent le rôle admin (l. 228-230) |

**Conclusion :** un compte non-admin **n'obtient strictement rien de plus qu'un visiteur anonyme**. Le modèle RLS est correct et `has_role` est bien `SECURITY DEFINER` avec `search_path = public` figé (l. 17), ce qui est la bonne pratique. Les risques résiduels de l'inscription libre sont donc indirects mais réels : pollution de `auth.users`, **utilisation du quota d'e-mails Supabase pour envoyer des messages de confirmation à des adresses arbitraires** (vecteur de spam par rebond), et surtout le fait que toute politique RLS assouplie à l'avenir deviendrait immédiatement exploitable par un attaquant déjà authentifié. Voir SEC-02.

> **Point à vérifier en base :** les migrations déclarent `GRANT SELECT ON <table> TO anon, authenticated` sans `GRANT INSERT/UPDATE/DELETE` pour les tables de contenu. Si les privilèges par défaut de Supabase (`ALTER DEFAULT PRIVILEGES ... GRANT ALL ... TO anon, authenticated`) sont actifs — ce qui est le cas sur un projet Supabase standard — les écritures admin fonctionnent et seule la RLS filtre. S'ils ont été révoqués, **les écritures du back-office échoueraient avec `permission denied`, y compris pour un vrai admin**, sur toutes les tables sauf `contact_requests` (seule à recevoir `GRANT SELECT, UPDATE, DELETE`, l. 160). À contrôler avec `\dp public.*` une fois BUG-01 corrigé.

### 2. La clé service-role est-elle exposée côté navigateur ?

**Non.** Vérifications effectuées :

- `.env` ne contient que **trois noms** de variables, tous préfixés `VITE_` et donc publics par construction : `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_TURNSTILE_SITE_KEY`. **Aucune variable de secret n'y figure** (valeurs non lues, conformément à la consigne).
- `grep -rl "SERVICE_ROLE\|service_role" dist/client` → **aucune occurrence**.
- `grep -rlE "eyJ[A-Za-z0-9_-]{30,}" dist/client` → **aucun JWT**.
- `src/integrations/supabase/client.server.ts` lit `process.env.SUPABASE_SERVICE_ROLE_KEY` (l. 10), sans préfixe `VITE_`, dans un fichier `.server.ts` exclu du bundle client.
- Son unique importateur est `src/lib/api/contact.functions.ts:73`, via un `await import()` situé **dans** le corps d'un `createServerFn` — donc tree-shaké du client.

La clé publiable (`anon`) est bien présente dans `dist/client/assets/vendor-supabase-*.js` : c'est **normal et voulu**, cette clé est publique par conception et sa sécurité repose entièrement sur la RLS.

**Réserve :** `SUPABASE_SERVICE_ROLE_KEY` et `TURNSTILE_SECRET_KEY` ne sont définis nulle part dans le dépôt (pas de `.dev.vars`, pas de section `vars` dans `wrangler.jsonc`). Comme le seul code qui les consomme est mort, cela n'a aucun effet aujourd'hui — mais ces secrets devront être créés via `wrangler secret put` si la fonction est un jour réactivée. Voir ARCH-01.

### 3. `loadSupabaseClient` : le back-office est-il fonctionnel ?

**Non, il est totalement inopérant.** Le symbole est appelé 14 fois dans 7 fichiers sans y être jamais importé :

`_authed.tsx:38,44` · `avis.tsx:16,27,33` · `demandes.tsx:20,38` · `faq.tsx:15,24,30` · `pages-seo.tsx:15` · `parametres.tsx:16` · `photos.tsx:19,28,53,60` · `prestations.tsx:16`

Ces fichiers importent `supabase` depuis `@/integrations/supabase/client` et l'utilisent correctement à d'autres endroits — la moitié des appels a manifestement été migrée vers l'import dynamique `loadSupabaseClient` sans que l'import soit ajouté. Seul `dashboard.tsx` est indemne.

L'erreur est confirmée dans le build livré : `dist/client/assets/demandes-CvLaf9Ec.js` contient `loadSupabaseClient(),{data:t}=await s.from("contact_requests")` alors que `grep -c "function loadSupabaseClient\|loadSupabaseClient="` sur ce même fichier retourne **0**.

Impact concret : `_authed.tsx:38` s'exécute dans un `useEffect` au montage du layout admin. **Toute page `/admin/*` plante immédiatement** après la vérification du rôle, et affiche la page d'erreur de `__root.tsx`. La photographe ne peut ni consulter ses demandes de contact, ni gérer ses photos, ses tarifs, sa FAQ ou ses avis.

La cause racine est que **`vite build` ne lance aucun type-check** : `npx tsc --noEmit` remonte ces 17 erreurs `TS2304: Cannot find name 'loadSupabaseClient'`, mais rien ne les bloque au build ni au déploiement (voir QUAL-01).

### 4. `portfolio.tsx` sans `<Outlet />` : les 4 sous-pages sont-elles accessibles ?

**Non.** `src/routeTree.gen.ts:601-618` établit que `PortfolioCoupleRoute`, `PortfolioFamilleRoute`, `PortfolioGrossesseRoute`, `PortfolioPortraitRoute` et `PortfolioIndexRoute` sont enfants de `PortfolioRoute`. Or `src/routes/portfolio.tsx:19-25` rend uniquement `<SiteShell><PortfolioEditorialSection /></SiteShell>`, sans `<Outlet />`. Les seules occurrences d'`<Outlet />` du projet sont dans `__root.tsx:162` et `admin/_authed.tsx:73`.

En TanStack Router, une route parente qui ne rend pas d'`<Outlet />` n'affiche jamais ses enfants. Conséquences :

- Les 4 URL retournent bien un **HTTP 200** avec les bonnes balises `<title>`, `description` et `canonical` (le `head` des routes enfants est fusionné indépendamment du rendu), **mais le contenu affiché est celui de `/portfolio`**. C'est un cas typique de *contenu dupliqué* pour les moteurs de recherche : 5 URL, 5 titres différents, 1 seul contenu.
- Les composants `CategoryHero`, `CategoryGallery`, `ExperienceSection` et `RelatedCategories` ne sont jamais rendus, alors que `CategoryHero.tsx:23` porte le seul `<h1>` de ces pages. **Les 4 pages sont donc servies sans `<h1>`.**
- `RelatedCategories.tsx:31` génère des liens vers `/portfolio/${category.slug}` : des liens internes qui mènent à un cul-de-sac.
- Ces 4 URL ne sont référencées nulle part ailleurs dans la navigation : `index.tsx:308` pointe vers `/$slug` (pages SEO), pas vers `/portfolio/*`. Elles sont en revanche déclarées dans `sitemap[.]xml.ts:9-12`.

### 5. Les 312 Mo d'assets et les limites Cloudflare

**Aucun blocage Cloudflare.** `src/assets/` pèse 312 Mo, mais Vite ne bundle que les fichiers effectivement importés : `dist/client` ne fait que **40 Mo pour 421 fichiers** (370 `.webp`, 44 `.js`, 3 `.woff2`, 1 `.jpg`, 1 `.png`, 1 `.css`). C'est confortablement sous les limites des Workers Static Assets (20 000 fichiers, 25 Mo par fichier) : aucun fichier ne dépasse 20 Mo et le plus gros JS total est de 0,85 Mo.

**Deux vrais problèmes subsistent malgré tout :**

- **PERF-01 — un JPG de 9,2 Mo est servi aux visiteurs.** `dist/client/assets/grossesse-DCz8bMzC.jpg` pèse 9,22 Mo, soit **23 % du poids total du build**, et représente à lui seul plus que les 370 `.webp` réunis. Il provient de `src/assets/originals-jpg/grossesse.jpg`, importé en `catGrossesseJpg` par `index.tsx:12` puis placé comme source `700w` du `srcSet` de la carte « Grossesse » en page d'accueil (`index.tsx:314`). Les trois autres catégories utilisent correctement un `.webp`. Tout navigateur dont le viewport déclenche le palier `700w` télécharge 9,2 Mo pour afficher une vignette d'environ 350 × 470 px.
- **PERF-02 — 73 Mo de JPG originaux dans les sources.** `src/assets/originals-jpg/` (9 fichiers, jusqu'à 11 Mo pièce) et des doublons entre `src/assets/portfolio/*.jpg` et `src/assets/originals-jpg/*.jpg`. Sans incidence sur la production, mais rédhibitoire pour un futur dépôt Git : ces fichiers gonfleraient l'historique de façon irréversible. À traiter **avant** l'initialisation de Git.

### 6. `submitContactRequest` : code mort à supprimer ou à conserver ?

**C'est du code entièrement mort, et il faut trancher — mais pas le supprimer à l'aveugle.**

Constats : `grep -rl "submitContactRequest\|siteverify\|TURNSTILE_SECRET" dist/` ne retourne **rien**. Aucun fichier n'importe `contact.functions.ts`, `contact-form.schema.ts` ni `TurnstileWidget.tsx`. `VITE_TURNSTILE_SITE_KEY` est déclaré dans `.env` mais n'est lu nulle part dans `src/`. La page `/contact` a été remplacée par une `<iframe>` vers `https://soleana-studio.pelli.io/embedded/contact` (`contact.tsx:126-133`).

Le code mort en lui-même **ne présente aucun risque d'exposition** : n'étant pas dans le manifeste serveur, il n'y a pas de point d'entrée HTTP, et `client.server.ts` n'est jamais chargé.

Le vrai problème est ailleurs : **la protection a disparu, pas la surface d'attaque.** La table `contact_requests` conserve sa politique `Anyone can submit a contact request` (migration `20260601000000`, l. 236-248) qui autorise l'INSERT anonyme. La clé publiable étant dans le bundle client, n'importe qui peut écrire directement dans cette table via `POST {SUPABASE_URL}/rest/v1/contact_requests`, sans Turnstile, sans CSRF, sans honeypot et sans limite de débit. Voir SEC-03.

**Recommandation :** conserver le code (il est correct et complet : CSRF via `createCsrfMiddleware`, vérification Turnstile avec contrôle du `hostname`, honeypot `website`, délai minimum de 1,2 s, expiration à 24 h, validation Zod) mais **le documenter explicitement comme inactif** en attendant la décision : soit Pelli reste le canal unique et il faut alors révoquer l'INSERT anonyme sur `contact_requests` puis supprimer ce code, soit le formulaire natif revient et il faut le rebrancher. Laisser trois modules orphelins sans commentaire garantit qu'un futur intervenant croira la protection active.

---

## Constats par gravité

### 🔴 Critique

#### BUG-01 — `loadSupabaseClient` non importé : back-office hors service
**Axe :** Bugs et logique · **Effort :** rapide
**Localisation :** `src/routes/admin/_authed.tsx:38,44` ; `_authed/avis.tsx:16,27,33` ; `_authed/demandes.tsx:20,38` ; `_authed/faq.tsx:15,24,30` ; `_authed/pages-seo.tsx:15` ; `_authed/parametres.tsx:16` ; `_authed/photos.tsx:19,28,53,60` ; `_authed/prestations.tsx:16`
**Description :** 14 appels à une fonction jamais importée. `src/lib/supabase-browser.ts` l'exporte, mais aucun de ces fichiers ne contient `import { loadSupabaseClient }`.
**Impact :** `ReferenceError: loadSupabaseClient is not defined` au montage du layout admin (`_authed.tsx:38`, dans un `useEffect`). L'ensemble du back-office est inutilisable en production. Confirmé dans le bundle déployé.
**Correction :** ajouter `import { loadSupabaseClient } from "@/lib/supabase-browser";` dans les 7 fichiers — ou, plus simple et plus cohérent, remplacer les appels par le `supabase` déjà importé en haut de chacun de ces fichiers et supprimer `supabase-browser.ts`. Ajouter ensuite un type-check bloquant au build (QUAL-01).

#### BUG-02 — `/portfolio` sans `<Outlet />` : 4 pages inaccessibles
**Axe :** Bugs et logique / SEO · **Effort :** rapide
**Localisation :** `src/routes/portfolio.tsx:19-25` ; enfants déclarés dans `src/routeTree.gen.ts:601-618`
**Description :** route parente rendant son propre contenu sans point de montage pour ses routes enfants.
**Impact :** `/portfolio/couple`, `/portfolio/famille`, `/portfolio/grossesse`, `/portfolio/portrait` renvoient 200 avec les bonnes métadonnées mais le contenu de `/portfolio` — contenu dupliqué sur 5 URL, pages sans `<h1>`, liens internes de `RelatedCategories` en cul-de-sac, 4 URL du sitemap trompeuses.
**Correction :** soit ajouter `<Outlet />` dans `Portfolio()` et déplacer `PortfolioEditorialSection` vers `portfolio/index.tsx` (qui renvoie actuellement `null`), soit renommer `portfolio.tsx` en `portfolio/index.tsx` si aucune mise en page partagée n'est souhaitée.

---

### 🟠 Élevée

#### SEC-01 — Aucun dépôt Git et `.env` non ignoré
**Axe :** Configuration et déploiement / Sécurité · **Effort :** rapide
**Localisation :** racine du projet ; `.gitignore:1-34`
**Description :** aucun répertoire `.git`. Le `.gitignore` existe mais ne contient **aucune entrée `.env`** — il couvre `.dev.vars` et `*.local`, pas `.env`. Le fichier `.env` est présent à la racine.
**Impact :** aucun historique, aucune possibilité de revenir sur une régression (BUG-01 et BUG-02 auraient été identifiables par `git diff`), aucune sauvegarde du code. Et à la première initialisation de Git en l'état, `.env` part dans le premier commit. Même si `.env` ne contient aujourd'hui que des clés publiques, ce fichier accueillera tôt ou tard un secret.
**Correction :** ajouter `.env`, `.env.*` et `!.env.example` au `.gitignore`, purger `src/assets/originals-jpg/` (73 Mo) **avant** le premier commit, puis `git init` et pousser sur un dépôt privé. Créer un `.env.example` listant les noms de variables sans valeurs.

#### SEC-02 — Inscription libre sur la page de connexion admin
**Axe :** Sécurité · **Effort :** rapide
**Localisation :** `src/routes/admin/login.tsx:33-39,65-67`
**Description :** bouton « Pas encore de compte ? Créer un compte » exposé publiquement sur `/admin/login`, appelant `supabase.auth.signUp()`. Le message de succès (l. 37) indique même à l'inscrit de demander le rôle admin.
**Impact :** la RLS empêche tout accès privilégié (cf. tableau plus haut) : **aucune élévation de privilège n'est possible**. Les risques sont la création illimitée de comptes dans `auth.users`, la consommation du quota d'e-mails Supabase pour envoyer des confirmations à des adresses arbitraires (usage détourné en relais de spam), et l'existence d'une population d'attaquants déjà authentifiés qui bénéficierait immédiatement de tout assouplissement futur de la RLS.
**Correction :** désactiver l'inscription dans le tableau de bord Supabase (*Authentication → Providers → Email → Disable signup*) et retirer le mode `signup` de ce composant. Les comptes admin se créent depuis la console Supabase, suivis d'un `INSERT INTO user_roles`. Activer par ailleurs la protection contre les mots de passe compromis et le MFA sur le compte de la photographe.

#### SEC-03 — Insertion anonyme non protégée dans `contact_requests`
**Axe :** Sécurité · **Effort :** moyen
**Localisation :** migration `20260601000000_add_consent_to_contact_requests.sql:236-248` ; protection inactive dans `src/lib/api/contact.functions.ts:47-94`
**Description :** la politique `Anyone can submit a contact request` autorise l'INSERT par le rôle `anon`, avec pour seules contraintes `consent IS TRUE` et des bornes de longueur. La clé publiable étant dans `dist/client/assets/vendor-supabase-*.js`, l'endpoint REST est directement appelable. Le `serverFn` qui portait Turnstile, CSRF, honeypot et délai minimum est absent du build (cf. point 6).
**Impact :** inondation de la table par un script, saturation de la boîte de réception de la photographe, coût Supabase, et pollution de données personnelles (des tiers pourraient y injecter les coordonnées de personnes réelles). Aucune limitation de débit au niveau base.
**Correction :** si Pelli reste le canal unique, révoquer la politique INSERT anonyme (`DROP POLICY "Anyone can submit a contact request"`) — la table ne sert alors plus qu'à l'historique. Si le formulaire natif est réactivé, restreindre l'INSERT au seul `service_role` et faire passer les soumissions par `submitContactRequest`. Dans les deux cas, ajouter une règle Cloudflare Rate Limiting.

#### SEC-04 — Aucun en-tête de sécurité HTTP
**Axe :** Sécurité · **Effort :** rapide
**Localisation :** `wrangler.jsonc` (aucune section `headers`) ; aucun fichier `public/_headers` ; `src/server.ts:40-53` ne pose aucun en-tête
**Description :** absence totale de `Content-Security-Policy`, `X-Frame-Options` / `frame-ancestors`, `Strict-Transport-Security`, `Referrer-Policy`, `X-Content-Type-Options` et `Permissions-Policy`.
**Impact :** aucune défense en profondeur contre le XSS (le risque direct est faible — React échappe par défaut et le seul `dangerouslySetInnerHTML` est dans `components/ui/chart.tsx:73`, composant jamais importé) ; surtout, **`/admin/*` peut être encadré dans une iframe tierce**, ce qui ouvre la voie au clickjacking sur les actions de suppression du back-office. Pas de `Referrer-Policy` alors que le site pointe vers des domaines tiers.
**Correction :** créer `public/_headers` (servi tel quel par Cloudflare Static Assets). Prévoir une CSP autorisant explicitement `frame-src https://soleana-studio.pelli.io`, `connect-src` vers le projet Supabase, et `frame-ancestors 'none'`. Démarrer en `Content-Security-Policy-Report-Only` pour valider sans casser les iframes.

#### BUG-03 — `/$slug` intercepte toute URL inconnue et affiche « Chargement… » indéfiniment
**Axe :** Bugs et logique / SEO · **Effort :** moyen
**Localisation :** `src/routes/$slug.tsx:409-430`
**Description :** la `queryFn` fait `if (!data) throw notFound()` (l. 419). Comme `throwOnError` n'est pas activé sur TanStack Query, l'erreur est stockée dans l'état de la requête et n'est jamais relancée pendant le rendu — le `notFoundComponent` de la route (l. 396-402) ne se déclenche donc jamais. La garde `if (isLoading || !page)` (l. 424) retombe sur l'état « chargement » : à l'échec, `isLoading` vaut `false` et `page` est `undefined`, l'écran reste bloqué sur « Chargement… ».
**Impact :** `/$slug` étant une route attrape-tout à un segment, **toute URL inconnue** (`/nimportequoi`, une ancienne URL, une faute de frappe) renvoie un **HTTP 200 avec un écran de chargement perpétuel** au lieu d'un 404. C'est un *soft 404* : Google indexe des pages vides et le budget de crawl est gaspillé. Trois URL sont concernées directement : `sitemap[.]xml.ts:25-27` déclare `/photographe-bapteme-marseille`, `/photographe-mariage-marseille` et `/photographe-anniversaire-marseille`, qui n'ont **aucune ligne correspondante** dans `seo_pages` (la migration n'en insère que 5 : grossesse, famille, couple, portrait, lifestyle).
**Correction :** distinguer les trois états de la requête (`isLoading` / `isError` / succès) et rendre le `notFoundComponent` sur erreur, ou passer par un `loader` de route qui lève `notFound()` côté serveur pour obtenir un vrai statut 404. Retirer les 3 slugs orphelins du sitemap ou créer les lignes `seo_pages` correspondantes.

#### PERF-01 — JPG de 9,2 Mo servi dans le `srcSet` de la page d'accueil
**Axe :** Performance · **Effort :** rapide
**Localisation :** `src/routes/index.tsx:12,94,314` (`catGrossesseJpg`) ; également `src/components/site/PortfolioEditorialSection.tsx:3`
**Description :** `@/assets/originals-jpg/grossesse.jpg` (9,2 Mo) est utilisé comme palier `700w` du `srcSet` de la carte « Grossesse », là où les trois autres catégories utilisent un `.webp` de quelques dizaines de Ko. Le fichier représente 23 % du poids total de `dist/client`.
**Impact :** dégradation majeure du LCP et du CLS sur la page la plus visitée, plusieurs secondes de chargement en 4G, et consommation de bande passante Cloudflare disproportionnée. Impact direct sur les Core Web Vitals et donc sur le référencement.
**Correction :** générer `grossesse-700.webp` comme pour les autres catégories et remplacer l'import. `src/assets/portfolio/grossesse.jpg` (10,5 Mo) présente le même risque s'il venait à être importé.

#### RGPD-01 — Consentement cookies invalide et absence de bandeau
**Axe :** RGPD · **Effort :** moyen
**Localisation :** `src/routes/mentions-legales.tsx` §6 « Cookies » ; `src/routes/confidentialite.tsx` §8 ; aucun composant de gestion du consentement dans `src/`
**Description :** les mentions légales indiquent « En poursuivant votre navigation, vous acceptez l'utilisation éventuelle de ces cookies ». Cette formulation est explicitement rejetée par les lignes directrices CNIL du 17 septembre 2020 : la poursuite de la navigation ne constitue pas un consentement valide. La politique de confidentialité emploie de son côté un conditionnel non engageant (« ne devraient être déposés qu'avec votre consentement »). **Aucun bandeau ni CMP n'existe dans le code.**
**Impact :** le site charge trois iframes tiers — `soleana-studio.pelli.io/embedded/contact`, `/embedded/booking`, `/embedded` (`contact.tsx:127`, `reservation.tsx:54`, `espace-client.tsx:59`) — chargés sans condition dès l'affichage de la page. Si Pelli dépose le moindre traceur non strictement nécessaire, le site est en infraction à l'article 82 de la loi Informatique et Libertés (sanction CNIL possible, jusqu'à 2 % du CA ou 20 M€ au titre du RGPD pour les autres manquements). **Point à vérifier :** l'inspection effective des cookies déposés par Pelli n'a pas pu être faite depuis ce dépôt — elle doit être réalisée dans un navigateur, onglet Application → Cookies, sur les trois pages concernées.
**Correction :** auditer les cookies réellement déposés par les iframes Pelli. Si des traceurs non essentiels sont présents, installer un bandeau de consentement (Tarteaucitron, Axeptio ou équivalent conforme CNIL) et ne charger les iframes qu'après acceptation. Si Pelli ne dépose que du strictement nécessaire, réécrire les deux sections pour l'affirmer clairement et retirer la phrase « En poursuivant votre navigation ».

---

### 🟡 Moyenne

#### QUAL-01 — 54 erreurs TypeScript, aucun type-check au build
**Axe :** Architecture et qualité · **Effort :** moyen
**Localisation :** projet entier ; `package.json:9` (`"build": "vite build"`)
**Description :** `npx tsc --noEmit` remonte 54 erreurs : 17 `TS2304` (BUG-01), 15 `TS2339` (propriétés absentes sur des types inférés — `PortfolioEditorialSection.tsx:80,159`, `a-propos.tsx:284,291`), 10 `TS2345` (`_authed.tsx:11,46` : `redirect({ to: "/admin/login" })` sans le paramètre `search` requis), 8 `TS7006`/`TS7031` (paramètres implicitement `any`), 3 `TS2322` (dont `RelatedCategories.tsx:31` : chemin dynamique non assignable au type d'union des routes, et `TurnstileWidget.tsx:108`), 1 `TS2769`.
**Impact :** le build ne type-vérifie pas — c'est la raison pour laquelle BUG-01 est parti en production. Les erreurs `TS2345` sur `_authed.tsx` signalent en outre un bug latent : les redirections vers `/admin/login` omettent le paramètre `search` que `validateSearch` rend obligatoire (`login.tsx:7`).
**Correction :** ajouter `"typecheck": "tsc --noEmit"` et faire de `"build": "npm run typecheck && vite build"`. Corriger les 54 erreurs (la majorité disparaît avec BUG-01). Idéalement, brancher un contrôle automatique avant déploiement.

#### DEP-01 — 15 vulnérabilités, toutes dans la chaîne de build
**Axe :** Dépendances · **Effort :** moyen
**Localisation :** `package.json`, `package-lock.json`
**Description :** `npm audit` signale 12 vulnérabilités hautes, 1 moyenne et 2 basses sur 707 paquets. Les paquets concernés : `@cloudflare/vite-plugin` (direct), `vite` (direct), `wrangler` (direct), `undici`, `ws`, `sharp`, `miniflare`, `postcss`, `nanoid`, `js-yaml`, `browserslist`, `brace-expansion`, `esbuild`, `baseline-browser-mapping`, `postcss-selector-parser`.
**Impact :** **à relativiser** — `npm ls` confirme que toutes ces dépendances sont des outils de développement et de build (`undici`, `ws` et `sharp` viennent tous de `@cloudflare/vite-plugin → miniflare` ; `nanoid` de `vite → postcss`). **Aucune n'est embarquée dans le bundle client ni dans le Worker déployé.** L'exposition réelle se limite au poste de développement et à un éventuel environnement de CI. Plusieurs avis (`esbuild`, `vite`, `launch-editor`) ne concernent que Windows.
**Correction :** `npm audit fix` couvre l'ensemble des cas (`fixAvailable: true` partout). À exécuter après l'initialisation de Git, pour pouvoir revenir en arrière. Noter que `nitro` est épinglé sur `3.0.260429-beta` — une version bêta en production mérite un suivi.

#### RGPD-02 — Contradiction entre les mentions légales et la réalité des transferts
**Axe :** RGPD · **Effort :** rapide
**Localisation :** `src/routes/mentions-legales.tsx` §4
**Description :** « Ces données ne sont jamais revendues, ni cédées, ni transmises à des tiers, sauf obligation légale. » Or les données transitent par Pelli (formulaire, réservation, espace client), sont stockées chez Supabase et le site est hébergé par Cloudflare. La politique de confidentialité, elle, décrit correctement le recours à des sous-traitants (§4).
**Impact :** information inexacte au sens de l'article 13 du RGPD, et incohérence entre deux documents du même site. Facilement opposable en cas de réclamation.
**Correction :** reformuler en « ne sont jamais revendues ni cédées à des fins commerciales » et renvoyer explicitement à la section 4 de la politique de confidentialité pour la liste des sous-traitants.

#### RGPD-03 — Sous-traitants non nommés
**Axe :** RGPD · **Effort :** rapide
**Localisation :** `src/routes/confidentialite.tsx` §4 et §6
**Description :** la politique évoque « les prestataires techniques strictement nécessaires » sans jamais nommer **Pelli**, **Supabase** ni **Cloudflare**. La section 6 sur les transferts hors UE reste au conditionnel (« peuvent être situés »).
**Impact :** l'article 13 autorise la mention de *catégories* de destinataires, mais la CNIL recommande fortement de les nommer, en particulier lorsqu'un sous-traitant collecte directement les données via une iframe — ce qui est ici le cas principal. La personne concernée ne peut pas savoir que ses données de réservation partent chez un tiers.
**Correction :** nommer Pelli (formulaire de contact, réservation, espace client), Supabase (base de données) et Cloudflare (hébergement). Préciser la région du projet Supabase et, si elle est hors UE, indiquer les garanties (clauses contractuelles types). Signer un contrat de sous-traitance (article 28) avec Pelli s'il n'existe pas déjà.

#### RGPD-04 — Durées de conservation non chiffrées et absence de purge
**Axe :** RGPD · **Effort :** moyen
**Localisation :** `src/routes/confidentialite.tsx` §5 ; `src/routes/mentions-legales.tsx` §5 ; table `contact_requests`
**Description :** la politique indique que les durées « ne sont pas illimitées » sans en donner aucune. Côté base, `contact_requests` (`created_at`, statut `archive` disponible) n'est soumise à aucun mécanisme de suppression automatique — ni trigger, ni `pg_cron`, ni tâche applicative.
**Impact :** manquement au principe de limitation de la conservation (article 5.1.e). En pratique, les demandes de contact — nom, prénom, e-mail, téléphone, lieu, message libre — s'accumulent indéfiniment.
**Correction :** fixer des durées explicites (usage courant : 3 ans après le dernier contact pour un prospect, 10 ans pour les pièces comptables d'un client) et les écrire dans la politique. Mettre en place une purge automatique via `pg_cron` sur `contact_requests`. Demander à Pelli ses propres durées de conservation.

#### RGPD-05 — Deux adresses de contact RGPD différentes
**Axe :** RGPD · **Effort :** rapide
**Localisation :** `src/routes/confidentialite.tsx` §1, §7, §10 (`contact@soleanastudio.fr`) ; `src/routes/mentions-legales.tsx` §1, §4, §5 (`anaischartonphotographie@gmail.com`)
**Description :** deux adresses distinctes sont indiquées pour l'exercice des droits selon la page consultée.
**Impact :** confusion pour la personne qui souhaite exercer ses droits ; risque qu'une demande adressée à l'une des deux reste sans réponse dans le délai d'un mois imposé par l'article 12.3.
**Correction :** retenir une seule adresse — de préférence `contact@soleanastudio.fr`, cohérente avec le domaine — et l'harmoniser sur les deux pages.

#### ARCH-01 — Code mort important
**Axe :** Architecture et qualité · **Effort :** moyen
**Localisation :** `src/lib/api/contact.functions.ts` (95 l.) · `src/lib/contact-form.schema.ts` (54 l.) · `src/components/site/TurnstileWidget.tsx` (154 l.) · `src/lib/api/example.functions.ts` (21 l.) · `src/integrations/supabase/auth-middleware.ts` (80 l.) · `src/integrations/supabase/auth-attacher.ts` (15 l.) · `src/lib/config.server.ts` (26 l.) · `src/routes/portfolio/index.tsx` · 37 des 46 composants de `src/components/ui/`
**Description :** trois modules du circuit de contact sont orphelins (cf. point 6). `auth-attacher.ts:5-6` documente qu'il « doit être enregistré comme `functionMiddleware` global dans `src/start.ts` » — ce qui n'est **pas** le cas : `start.ts:20-22` n'enregistre qu'`errorMiddleware`. `requireSupabaseAuth` n'est utilisé par aucun `serverFn`. Côté UI, seuls 9 composants shadcn sur 46 sont importés ; les 37 autres tirent une trentaine de paquets `@radix-ui/*`, `recharts`, `embla-carousel-react`, `react-day-picker`, `input-otp`, `vaul`, `cmdk`, `react-resizable-panels`, `date-fns` et `@hookform/resolvers`.
**Impact :** les composants non importés sont tree-shakés et ne pèsent pas sur le bundle, mais ils allongent les installations, la surface d'audit de dépendances et le temps de compréhension du projet. Plus grave : les commentaires de `auth-attacher.ts` et `client.server.ts` décrivent une architecture de sécurité qui n'est pas celle en place, ce qui induira en erreur.
**Correction :** supprimer `example.functions.ts`, `config.server.ts`, `portfolio/index.tsx`, `auth-middleware.ts` et `auth-attacher.ts` (ou les brancher). Documenter en tête de `contact.functions.ts` qu'il est inactif, avec la décision prise. Élaguer `components/ui/` et les dépendances associées de `package.json`.

#### A11Y-01 — Carrousel automatique sans contrôle de pause
**Axe :** Front-end / accessibilité · **Effort :** rapide
**Localisation :** `src/components/site/HeroSlideshow.tsx:6-10`
**Description :** `setInterval` fait défiler les images de la bannière toutes les 5,5 s, sans bouton pause/arrêt et sans prise en compte de `prefers-reduced-motion` dans le composant (la media query est bien gérée dans `styles.css:277` pour les animations CSS, mais elle ne coupe pas ce timer JavaScript).
**Impact :** manquement au critère WCAG 2.2.2 (*Pause, Stop, Hide*, niveau A) : tout contenu en mouvement automatique de plus de 5 secondes doit être contrôlable. Gêne pour les personnes sujettes aux troubles de l'attention ou au mal des transports numérique.
**Correction :** ajouter un bouton de pause accessible et interrompre l'intervalle si `window.matchMedia("(prefers-reduced-motion: reduce)").matches`.

#### A11Y-02 — Lightbox non accessible au clavier
**Axe :** Front-end / accessibilité · **Effort :** moyen
**Localisation :** `src/components/site/CategoryGallery.tsx:99-126`
**Description :** la visionneuse est un simple `<div>` positionné en `fixed`, sans `role="dialog"`, sans `aria-modal`, sans piège de focus et sans gestion de la touche Échap. L'`alt` de l'image affichée est vide (l. 118). À l'inverse, `CategoryGallerySection.tsx` utilise correctement le composant `Dialog` de Radix, avec navigation au clavier (`useEffect` l. 81-100) et `aria-label` sur les boutons.
**Impact :** un utilisateur au clavier ne peut pas fermer la visionneuse autrement qu'en cliquant, et le focus reste piégé derrière la surcouche. Les lecteurs d'écran n'annoncent pas l'ouverture d'une boîte de dialogue.
**Correction :** aligner `CategoryGallery` sur l'implémentation de `CategoryGallerySection` en réutilisant `Dialog`/`DialogContent`, et renseigner l'`alt` de l'image agrandie.

#### PERF-02 — 312 Mo d'assets sources, dont 73 Mo de JPG originaux
**Axe :** Performance / configuration · **Effort :** rapide
**Localisation :** `src/assets/` (452 fichiers) ; `src/assets/originals-jpg/` (9 fichiers, 73 Mo)
**Description :** les originaux JPG (jusqu'à 11 Mo pièce) coexistent avec leurs dérivés `.webp`, et `src/assets/portfolio/*.jpg` duplique en partie `src/assets/originals-jpg/*.jpg`. Un seul de ces fichiers est effectivement importé (cf. PERF-01).
**Impact :** nul en production (40 Mo seulement partent sur Cloudflare), mais rédhibitoire pour un futur dépôt Git : ces fichiers binaires gonfleraient l'historique de façon irréversible et rendraient chaque clone très lourd.
**Correction :** sortir `originals-jpg/` du répertoire de travail vers un stockage séparé (disque, Drive, bucket) **avant** le premier commit, et l'ajouter au `.gitignore`. Si les originaux doivent rester versionnés, prévoir Git LFS.

#### CONF-01 — Deux gestionnaires de paquets concurrents
**Axe :** Configuration et déploiement · **Effort :** rapide
**Localisation :** `bun.lock` (176 Ko) et `package-lock.json` (389 Ko) à la racine
**Description :** les deux fichiers de verrouillage coexistent. `bunfig.toml` configure par ailleurs une protection anti-supply-chain intéressante (`minimumReleaseAge = 86400`, ignorer les versions publiées depuis moins de 24 h) — mais elle ne s'applique qu'aux installations via bun.
**Impact :** risque d'arbres de dépendances divergents entre le poste de développement et la plateforme de build. La protection `minimumReleaseAge` est contournée dès qu'une installation passe par npm.
**Correction :** choisir un gestionnaire unique et supprimer l'autre fichier de verrouillage. Si bun est retenu, la garde anti-supply-chain est un vrai atout à conserver.

#### TEST-01 — Aucun test
**Axe :** Tests · **Effort :** important
**Localisation :** projet entier (aucun `*.test.*`, `*.spec.*`, `vitest.config.*` ni `playwright.config.*`)
**Description :** aucun framework de test n'est installé ni configuré.
**Impact :** BUG-01 et BUG-02 sont précisément le type de régressions qu'un test de fumée aurait interceptées — un simple rendu de `/admin/dashboard` et une assertion sur le `<h1>` de `/portfolio/couple` auraient suffi. En l'absence de tests **et** de type-check au build, rien ne protège le déploiement.
**Correction :** commencer par le plus rentable — quelques tests de bout en bout Playwright sur les parcours critiques : chargement de l'accueil, accès aux 4 pages catégorie avec vérification du `<h1>`, connexion admin et affichage des demandes, code 404 sur une URL inconnue. Le test unitaire peut venir ensuite.

#### DOC-01 — Pas de README
**Axe :** Documentation · **Effort :** rapide
**Localisation :** racine du projet (aucun `.md` hormis `src/routes/README.md`)
**Description :** aucune documentation d'installation, de configuration ou de déploiement. `src/routes/README.md` documente bien les conventions de routage TanStack, mais ne couvre pas le reste.
**Impact :** aucune trace des variables d'environnement à définir (`SUPABASE_SERVICE_ROLE_KEY` et `TURNSTILE_SECRET_KEY` ne sont documentés nulle part), de la procédure de déploiement, ni de l'existence des sous-traitants. Un intervenant extérieur — ou la photographe elle-même dans six mois — repart de zéro.
**Correction :** rédiger un `README.md` : prérequis, installation, variables d'environnement (noms et rôles, sans valeurs), commandes (`dev`, `build`, `deploy:cf`), architecture en quelques lignes, et procédure d'application des migrations Supabase.

---

### 🔵 Faible

#### SEC-05 — Messages d'erreur Supabase bruts affichés à l'utilisateur
**Axe :** Sécurité · **Effort :** rapide
**Localisation :** `src/routes/admin/login.tsx:31,36` ; `admin/_authed/photos.tsx:43` ; `avis.tsx:23` ; `prestations.tsx:18` ; `parametres.tsx:22` ; `demandes.tsx:31` ; `$slug.tsx:392`
**Description :** `toast.error(error.message)` relaie tel quel le message renvoyé par Supabase. Sur `/admin/login`, cela distingue « Invalid login credentials » d'autres messages, et `$slug.tsx:392` affiche l'erreur brute dans une page publique.
**Impact :** limité (pas de trace d'exécution ni de secret exposé), mais les messages d'authentification permettent une énumération partielle des comptes, et `$slug.tsx` peut révéler des détails d'implémentation de la base à des visiteurs anonymes.
**Correction :** afficher un message générique côté utilisateur et journaliser le détail via `console.error` (repris par l'observabilité Cloudflare, déjà activée dans `wrangler.jsonc:11-13`).

#### SEO-01 — Image Open Graph inexistante
**Axe :** Front-end / SEO · **Effort :** rapide
**Localisation :** `src/routes/__root.tsx:121` (`absoluteUrl("/og-image.jpg")`)
**Description :** le bloc JSON-LD `ProfessionalService` référence `https://soleanastudio.fr/og-image.jpg`. Or `public/` ne contient que `robots.txt`, et `dist/client` ne comporte qu'un seul `.jpg` (le fichier `grossesse-*.jpg` de PERF-01). L'URL renvoie donc un 404. Par ailleurs, seule la page d'accueil déclare un `og:image` (`index.tsx:68`) ; les autres pages n'en ont aucun.
**Impact :** données structurées incorrectes pour Google, et aucune vignette au partage sur les réseaux sociaux pour toutes les pages sauf l'accueil — dommageable pour une activité qui se diffuse via Instagram et TikTok.
**Correction :** déposer une image `og-image.jpg` (1200 × 630) dans `public/`, et ajouter un `og:image` par défaut dans `buildPageSeo` (`src/lib/seo.ts:14-31`).

#### BUG-04 — Route `/portfolio/` sans contenu
**Axe :** Bugs et logique · **Effort :** rapide
**Localisation :** `src/routes/portfolio/index.tsx:6-8` (`function PortfolioIndex() { return null; }`)
**Description :** route index déclarée qui ne rend rien. Sans effet visible aujourd'hui puisque BUG-02 empêche son montage, mais elle deviendra une page blanche dès l'ajout de l'`<Outlet />`.
**Correction :** à traiter conjointement avec BUG-02 — c'est l'emplacement naturel de `PortfolioEditorialSection`.

#### PERF-03 — Cascade de requêtes dans les galeries
**Axe :** Performance · **Effort :** moyen
**Localisation :** `src/components/site/CategoryGallerySection.tsx:57-77`
**Description :** la `queryFn` exécute deux requêtes séquentielles : d'abord `categories` pour résoudre les slugs en identifiants, puis `photos` filtrée sur ces identifiants. Le second appel attend nécessairement le premier.
**Impact :** un aller-retour réseau supplémentaire par galerie affichée — modéré, car les pages qui utilisent ce composant passent aujourd'hui par `photos` fournies localement (`manualPhotos`), ce qui court-circuite la requête (garde l. 58 et `enabled` l. 78).
**Correction :** une jointure unique `photos.select("*, categories!inner(slug)").in("categories.slug", slugs)` supprimerait la cascade.

#### QUAL-02 — 167 erreurs de formatage Prettier
**Axe :** Architecture et qualité · **Effort :** rapide
**Localisation :** principalement `src/routes/admin/**` et `src/routes/index.tsx:212-218`, `vite.config.ts:46`
**Description :** `npx eslint .` remonte 175 problèmes, dont 167 erreurs `prettier/prettier` toutes corrigeables automatiquement. Les fichiers admin sont visiblement écrits dans un style très condensé, à l'écart de la convention du reste du projet.
**Impact :** cosmétique, mais le bruit de formatage masque les vrais signaux dans la sortie du linter — ce qui a contribué à laisser passer BUG-01.
**Correction :** `npm run format`, puis faire du lint une étape bloquante avant déploiement.

#### QUAL-03 — Ré-export incohérent
**Axe :** Architecture et qualité · **Effort :** rapide
**Localisation :** `src/routes/admin/_authed.tsx:79` (`export { cn };`)
**Description :** un fichier de route ré-exporte l'utilitaire `cn` importé de `@/lib/utils`. Aucun consommateur.
**Impact :** nul, mais cela déclenche l'avertissement `react-refresh/only-export-components` et brouille la séparation des responsabilités.
**Correction :** supprimer la ligne.

#### A11Y-03 — Pas de lien d'évitement
**Axe :** Front-end / accessibilité · **Effort :** rapide
**Localisation :** `src/components/site/SiteShell.tsx:245-249`
**Description :** aucun lien « Aller au contenu principal » avant la navigation. Le `<main>` existe bien (l. 248) mais n'a pas d'`id` cible.
**Impact :** un utilisateur au clavier doit traverser les 7 liens de navigation sur chaque page. Critère WCAG 2.4.1 (niveau A).
**Correction :** ajouter un lien d'évitement visible au focus en tête de `SiteShell`, pointant vers `<main id="contenu">`.

---

### 💡 Suggestions

- **SUG-01 — Journalisation et supervision.** `wrangler.jsonc:11-13` active l'observabilité Cloudflare : bien. En revanche, aucune remontée d'erreur applicative. `lovable-error-reporting.ts` dépend de `window.__lovableEvents`, injecté par la plateforme Lovable — il ne fonctionnera pas sur le domaine de production. Envisager Sentry ou un simple point de collecte côté Worker.
- **SUG-02 — Sauvegardes.** Aucune procédure de sauvegarde n'est documentée, ni pour la base Supabase, ni pour le bucket Storage `photos` (qui contient les photos téléversées par la photographe, non versionnées). Vérifier la rétention des sauvegardes automatiques du plan Supabase souscrit.
- **SUG-03 — Séparation dev/prod.** Un seul projet Supabase (`hvfvvbiupyzoounzyqoz`, `supabase/config.toml`) et une seule cible Cloudflare. Toute expérimentation se fait donc sur les données de production. Un projet Supabase de préproduction et un Worker `soleana-studio-preview` limiteraient le risque.
- **SUG-04 — Migrations.** Les trois migrations ne sont pas idempotentes (`CREATE TABLE` sans `IF NOT EXISTS`) et aucun script de restauration n'existe. Ajouter les gardes habituelles pour permettre une remise à plat d'un environnement neuf.
- **SUG-05 — `defaultPreloadStaleTime: 0`** dans `src/router.tsx:12` désactive toute mise en cache des préchargements de route. Sur un site dont le contenu bouge peu, une valeur de quelques secondes réduirait les requêtes inutiles vers Supabase.
- **SUG-06 — Effet à dépendances incomplètes.** `CategoryGallerySection.tsx:100` liste `[lightboxIndex, fetchedPhotos.length]` alors que le corps de l'effet utilise `photos.length`. Sans conséquence aujourd'hui (les deux sources sont stables une fois la galerie montée), mais fragile.

---

## Plan d'action priorisé

### Étape 0 — Préalable indispensable : mettre le projet sous Git

**À faire avant toute correction, sans exception.** Aucune des modifications qui suivent ne doit être entreprise sur un projet sans historique : la moindre erreur serait irréversible.

1. Déplacer `src/assets/originals-jpg/` (73 Mo) hors du répertoire de travail, vers un stockage séparé (PERF-02). Vérifier au préalable que `src/assets/portfolio/grossesse.jpg` n'est référencé nulle part avant de le déplacer lui aussi.
2. Compléter `.gitignore` avec `.env`, `.env.*` et `!.env.example` — le fichier actuel ne couvre que `.dev.vars` et `*.local` (SEC-01).
3. Créer `.env.example` listant les trois noms de variables `VITE_*`, sans valeurs.
4. `git init`, premier commit, push sur un dépôt **privé**.
5. Contrôler avec `git ls-files | grep -i env` que `.env` n'a pas été capturé.

### Temps 1 — À corriger immédiatement (cette semaine)

| Ordre | ID | Action | Effort |
|---|---|---|---|
| 1 | **BUG-01** | Importer `loadSupabaseClient` dans les 7 fichiers admin — ou basculer sur le `supabase` déjà importé. Rétablit le back-office | rapide |
| 2 | **BUG-02** | Ajouter `<Outlet />` à `portfolio.tsx` et déplacer `PortfolioEditorialSection` vers `portfolio/index.tsx`. Rétablit 4 pages et corrige le contenu dupliqué | rapide |
| 3 | **QUAL-01** | Rendre le type-check bloquant : `"build": "tsc --noEmit && vite build"`. **Sans cela, BUG-01 se reproduira** | moyen |
| 4 | **SEC-02** | Désactiver l'inscription dans Supabase et retirer le mode `signup` de `login.tsx` | rapide |
| 5 | **PERF-01** | Générer `grossesse-700.webp` et retirer le JPG de 9,2 Mo du `srcSet` | rapide |
| 6 | **SEC-04** | Créer `public/_headers` avec au minimum `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy` et HSTS | rapide |

À l'issue de cette étape, vérifier manuellement : connexion admin puis affichage des demandes, accès aux 4 pages catégorie, et contrôle des privilèges en base (`\dp public.*`, cf. réserve du point 1) — les écritures admin n'ayant jamais pu être testées tant que BUG-01 était présent.

### Temps 2 — À court terme (2 à 4 semaines)

| ID | Action | Effort |
|---|---|---|
| **RGPD-01** | Auditer les cookies déposés par les iframes Pelli, puis installer un bandeau de consentement si nécessaire et réécrire la section « Cookies » des deux pages légales | moyen |
| **RGPD-02/03/05** | Harmoniser les pages légales : nommer Pelli, Supabase et Cloudflare ; corriger « jamais transmises à des tiers » ; unifier l'adresse de contact RGPD | rapide |
| **SEC-03** | Trancher sur le formulaire de contact (Pelli seul ou retour au formulaire natif) et aligner la politique RLS de `contact_requests` en conséquence. Ajouter une règle Cloudflare Rate Limiting | moyen |
| **BUG-03** | Corriger le soft 404 de `/$slug` et retirer du sitemap les 3 slugs sans ligne en base | moyen |
| **DEP-01** | `npm audit fix` (maintenant possible sans risque grâce à Git) | moyen |
| **CONF-01** | Choisir bun **ou** npm et supprimer le second fichier de verrouillage | rapide |
| **DOC-01** | Rédiger le `README.md` | rapide |
| **SEO-01**, **SEC-05**, **QUAL-02/03**, **BUG-04**, **A11Y-03** | Lot de corrections rapides | rapide |

### Temps 3 — À moyen terme (1 à 3 mois)

| ID | Action | Effort |
|---|---|---|
| **TEST-01** | Mettre en place Playwright et couvrir les parcours critiques : accueil, 4 pages catégorie, connexion admin, 404 | important |
| **ARCH-01** | Élaguer le code mort et les dépendances associées ; documenter la décision sur `contact.functions.ts` | moyen |
| **RGPD-04** | Fixer et publier des durées de conservation ; automatiser la purge de `contact_requests` via `pg_cron` ; signer un contrat de sous-traitance avec Pelli | moyen |
| **A11Y-01/02** | Bouton de pause sur le carrousel, `prefers-reduced-motion` ; refonte de la lightbox de `CategoryGallery` sur le modèle Radix | moyen |
| **SUG-02/03** | Sauvegardes documentées et environnement de préproduction (projet Supabase + Worker séparés) | moyen |
| **PERF-02/03**, **SUG-01/04/05** | Optimisation continue : pipeline d'images, jointure unique dans les galeries, supervision des erreurs, migrations idempotentes | moyen |

---

## Points positifs

Le projet est loin d'être en mauvais état, et plusieurs choix méritent d'être soulignés.

**Sécurité de la base de données.** La conception RLS est solide et cohérente : RLS activée sur **toutes** les tables, séparation nette entre lecture publique filtrée (`published = true`, `active = true`) et écriture réservée aux admins, table `user_roles` séparée plutôt qu'une colonne `role` sur le profil, et surtout une fonction `has_role` correctement déclarée `SECURITY DEFINER` avec `SET search_path = public` (`migration:17`) — c'est la protection standard contre le détournement de `search_path`, et elle est souvent oubliée. Le bucket Storage applique la même logique. **Un attaquant qui crée un compte n'obtient rien de plus qu'un visiteur anonyme.**

**Cloisonnement des secrets.** La séparation `client.ts` / `client.server.ts` est respectée, la clé `service_role` n'apparaît ni dans `dist/client`, ni dans une variable préfixée `VITE_`, et le seul accès se fait via un `await import()` situé dans le corps d'un `serverFn`. Les commentaires de `config.server.ts:1-17` expliquent clairement les trois stratégies d'accès aux variables d'environnement, y compris le piège du binding par requête sur Cloudflare Workers.

**Qualité du formulaire de contact — même s'il dort.** `contact.functions.ts` cumule protection CSRF, vérification Turnstile côté serveur **avec contrôle du `hostname`** (l. 42-44, souvent omis), honeypot, délai minimum de soumission, expiration à 24 h et validation Zod partagée. C'est un niveau de protection anti-spam supérieur à ce qu'on rencontre habituellement sur un site vitrine. Le regret est qu'il ne soit pas branché.

**Performance front.** Le découpage manuel des chunks (`vite.config.ts:25-51`) maintient le JavaScript total à 0,85 Mo. `content-visibility: auto` avec `contain-intrinsic-size` sur les sections longues de l'accueil, polices `.woff2` auto-hébergées en `font-display: swap` et préchargées, `width`/`height` systématiques sur les images (donc pas de décalage de mise en page), `loading="lazy"` et `fetchPriority` gérés finement, `srcSet` à trois paliers avec `sizes` corrects. Hors PERF-01, l'optimisation d'images est sérieuse.

**Accessibilité de base.** Les **23** balises `<img>` du projet ont un attribut `alt`, y compris les décoratives avec `aria-hidden="true"`. Les éléments interactifs des galeries sont de vrais `<button>` avec `aria-label`, le menu mobile gère `aria-expanded`/`aria-controls` ainsi que la fermeture à l'Échap et au clic extérieur (`SiteNav.tsx:31-55`), les états `focus-visible` sont explicitement stylés, et `prefers-reduced-motion` est pris en compte dans `styles.css:277`.

**Gestion des erreurs serveur.** `src/server.ts:21-38` traite un cas réel et subtil : h3 transforme silencieusement les exceptions de rendu SSR en réponse 500 JSON générique, que le `try/catch` ne voit jamais. Le contournement — capture hors bande via `error-capture.ts` avec durée de vie de 5 s, puis détection de la signature `{"unhandled":true,...}` — est bien pensé et soigneusement commenté.

**SEO.** Métadonnées centralisées dans `buildPageSeo` avec canoniques, `noIndex` sur l'espace client, sitemap généré dynamiquement avec priorités différenciées, `robots.txt` interdisant `/admin`, JSON-LD `ProfessionalService` avec `areaServed`, `noindex,nofollow` sur toutes les pages admin, et cinq pages SEO locales pilotées depuis la base.

**Chaîne d'outils.** Pile récente et cohérente (React 19, Vite 7, Tailwind 4), ESLint et Prettier configurés avec une règle `no-restricted-imports` sur mesure pour bloquer le paquet `server-only` de Next.js — signe d'une attention réelle portée aux spécificités de TanStack Start. `bunfig.toml` ajoute une garde anti-supply-chain de 24 h, avec une liste d'exceptions documentée exigeant une validation explicite. `src/routes/README.md` documente les conventions de routage.

---

*Rapport établi par analyse statique en lecture seule. Les constats reposent sur le code présent dans le dépôt au 23 septembre 2026, le build `dist/` livré et les migrations SQL versionnées. Trois points n'ont pas pu être vérifiés depuis ce dépôt et sont signalés comme tels dans le corps du rapport : l'état réel des privilèges `GRANT` en base de production, les cookies effectivement déposés par les iframes Pelli, et le contenu du formulaire de contact hébergé par Pelli (mentions d'information et case de consentement).*
