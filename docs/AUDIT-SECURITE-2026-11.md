# Audit de code et de sécurité — Soleana Studio (11 novembre 2026)

Branche `photos-storage-v2`, site en production avec `VITE_GALLERIES_FROM_STORAGE=true`. Méthode : lecture du code et des 15 migrations, recherche de secrets (noms de fichiers seulement, aucune valeur lue ni affichée), `npm audit`, lectures publiques avec la clé anonyme (aucune écriture Supabase), Chrome headless piloté en temps réel pour la console et la CSP, Lighthouse mobile. Aucun déploiement, aucune migration appliquée.

## Résumé

1. **Aucun secret** dans le code suivi, l'historique git, `dist/` ou le bundle client : pas de `.env` commité, aucun jeton JWT, pas de `service_role` côté client.
2. **Critique corrigé** : `@tanstack/react-start` 1.168.17 était vulnérable à une XSS réfléchie dans les réponses des fonctions serveur (GHSA-qx66-fv34-fjm8, CVSS 9.3) et à des désérialisations `seroval`. Mis à jour en 1.168.60 : `npm audit` production passe de 15 vulnérabilités dont 6 critiques à 8 dont 0 critique.
3. **Élevé corrigé** : l'admin Photos ne recevait que 1 000 des 1 360 variantes (plafond silencieux de PostgREST). Lecture paginée.
4. **Moyen corrigé** : la CSP n'était qu'en simple rapport, sans destinataire (aucune donnée collectée) ; elle est désormais **bloquante** sur le site public, sans l'ancien hôte Supabase, avec 0 violation sur 15 pages testées.
5. **Moyen corrigé** : le JSON-LD injecté dans `<script>` n'échappait pas `</script>` (XSS stockée possible par un texte saisi dans l'admin) ; échappement ajouté, testé.
6. **Moyen, à décider** : les inscriptions Supabase Auth sont **ouvertes** (`disable_signup: false`) ; n'importe qui peut créer un compte. La RLS l'empêche d'écrire ou de lire du non publié, mais c'est inutile et ouvre à l'envoi d'e-mails de confirmation. À fermer dans le tableau de bord (pas de SQL).
7. **Moyen, à décider** : le bucket public `photos` n'a ni taille maximale ni types MIME autorisés (SQL proposé, non appliqué).
8. **RLS conforme** : toutes les tables ont la RLS ; lecture publique limitée au publié (vérifiée en anonyme : 0 brouillon visible) ; écritures réservées aux admins en aal2 ; fonctions `SECURITY DEFINER` fixées sur `search_path` vide, contrôle admin + aal2 dans le corps, non exécutables par anon (vérifié : 401). Ce qui ne se vérifie pas sans SQL est dans `docs/sql/audit-security-checks.sql`.
9. **Performance** : cache `immutable` d'un an sur les fichiers `/assets` (étaient en `max-age=0, must-revalidate`, donc revalidés à chaque visite) ; Lighthouse inchangé (86 / 90 / 85 / 100), aucune régression visuelle.
10. **Reste à décider par Paul** : 4 réglages hors code (inscriptions, bucket, `has_role`, vérification des politiques par le SQL fourni), 3 mises à jour majeures (zod 4, vite 8, `@tanstack/react-start` 1.169+), un déploiement pour mettre en ligne les correctifs de code.

Les correctifs de code ci-dessous sont **commités et poussables, mais pas déployés** : la production tourne encore sur la version précédente.

---

## Constats

### Critique

**C-1. XSS réfléchie dans les réponses des fonctions serveur TanStack Start** — *corrigé (502a1f9), non déployé*
- Fichier : `package.json:53` (`@tanstack/react-start`), transitif `@tanstack/start-server-core` 1.169.7.
- Preuve : `npm audit --omit=dev` signalait 6 critiques (`react-start`, `start-server-core`, `start-plugin-core`, `react-start-rsc`, `react-start-server`, `seroval`). Avis GHSA-qx66-fv34-fjm8 : plage affectée `start-server-core < 1.169.39`, `react-start < 1.168.60`. Un visiteur qui ouvre un lien forgé vers une fonction serveur reçoit du HTML contrôlé par l'attaquant, exécuté sur l'origine du site (donc avec accès au jeton de session admin stocké dans `localStorage` si c'est la photographe qui clique).
- Impact : vol de session admin, modification du site. Le site expose des fonctions serveur (`src/lib/photos/storage-admin.functions.ts:80,89`, `src/lib/events/queries.ts`).
- Correctif : `@tanstack/react-start@1.168.60` (start-server-core 1.169.39, seroval 1.8.1), sans changer de lignée (la 1.169.x exige Vite 8 en peer). Deux petits ajustements de types dans `src/routes/__root.tsx` (`error: unknown`, `globalNotFound` retiré). Vérifié : typecheck, 283 tests, build, rendu local, pages 404 identiques à la production (`<meta robots noindex>`).
- Déploiement requis pour que la production en bénéficie.

### Élevé

**E-1. Inscriptions Supabase Auth ouvertes** — *à décider par Paul (réglage, pas de code)*
- Preuve : `GET /auth/v1/settings` avec la clé publique renvoie `disable_signup: false`, `mailer_autoconfirm: false`, fournisseur `email`.
- Impact : tout visiteur peut créer un compte `authenticated`. Ce compte n'a aucun droit utile (aucune politique ne l'autorise ; `user_roles` n'a pas de politique d'écriture), mais : envoi de mails de confirmation depuis votre domaine d'expéditeur, pollution de `auth.users`, et dépendance à ce qu'aucune future politique ne cible « tout `authenticated` ».
- Correctif proposé : tableau de bord Supabase > Authentication > Sign In / Providers > désactiver « Allow new users to sign up ». Le compte admin existe déjà. Contrôle : `docs/sql/audit-security-checks.sql` bloc 9.

**E-2. Admin Photos : 360 variantes sur 1 360 jamais chargées** — *corrigé (71e3ef5), non déployé*
- Fichier : `src/routes/admin/_authed/photos.tsx:161-171` (avant correctif).
- Preuve : `photo_variants` contient 1 360 lignes ; une lecture sans pagination renvoie **1 000** (mesuré avec la clé anonyme). PostgREST plafonne sans erreur.
- Impact : vignettes et formats manquants pour ~45 photos dans l'admin, risque de décision fondée sur des données tronquées (par exemple « photo sans variante »).
- Correctif : `fetchAllRows` (`src/lib/supabase-pagination.ts`, 5 tests dont le cas 1 360 lignes), tri stable par `id`. Les autres listes sont sous 1 000 lignes (photos 170, emplacements 190) ; à surveiller si le volume croît (74 photos de Noël prévues).

### Moyen

**M-1. CSP en simple rapport, sans collecte, avec l'ancien hôte** — *corrigé (ad28a3b), non déployé*
- Fichier : `src/server.ts:24-36` (avant) : `Content-Security-Policy-Report-Only` sans `report-uri` : le commentaire « collects violation reports » était faux, rien ne bloquait ni ne remontait ; hôte `hvfvvbiupyzoounzyqoz` conservé alors qu'il n'est plus utilisé nulle part dans le code.
- Correctif : politique dans `src/lib/security-headers.ts` (testée, 5 tests) : **bloquante** sur le site public, en rapport seul sur `/admin`. Ajouts : `upgrade-insecure-requests`, `blob:` en images, `'wasm-unsafe-eval'` (encodeurs AVIF/WebP de l'admin). Retrait de l'ancien hôte.
- Vérification : Chrome headless piloté en temps réel, console lue : 0 message sur `/`, `/portfolio`, `/portfolio/couple`, `/portfolio/famille` (47 photos Supabase chargées), les 4 pages SEO, Noël, contact, réservation, FAQ, À propos, prestations, mentions, confidentialité. La méthode de capture a été validée sur une violation volontaire.
- Limite honnête : `script-src` garde `'unsafe-inline'` (scripts d'hydratation TanStack et JSON-LD) ; ce n'est pas une barrière contre une injection de script en ligne. Pistes : nonce par requête (support TanStack à vérifier) ou hachages ; changement à étudier, non fait.
- Non testé en navigateur connecté : l'envoi de photos de l'admin sous cette politique, d'où le simple rapport sur `/admin`. Pour basculer l'admin en mode bloquant, ouvrir `/admin/photos`, envoyer une photo de test, lire la console : aucune ligne « Content Security Policy » = prêt.
- Pelli : le `frame-src` est conservé ; le formulaire ne se charge qu'après un clic (non simulé ici).

**M-2. JSON-LD non échappé dans `<script>`** — *corrigé (61955de), non déployé*
- Fichiers : `src/routes/$slug.tsx:353`, `src/routes/__root.tsx:124`. TanStack Router insère le contenu de `scripts[].children` tel quel (`dangerouslySetInnerHTML`, `node_modules/@tanstack/react-router/dist/esm/Asset.js`).
- Preuve : `JSON.stringify` laisse `<`, `>`, `&` intacts ; un titre d'événement ou le champ « zone desservie » contenant `</script><img onerror=…>` sortait de la balise. Source : texte saisi dans l'admin (donc exploitable seulement avec un compte admin compromis ou une saisie copiée d'une source hostile).
- Correctif : `safeJsonLd` (`src/lib/seo.ts`) échappe `<`, `>`, `&`, U+2028/2029 ; le JSON relu est identique. 3 tests. Sortie réelle vérifiée sur la page d'accueil.

**M-3. Bucket public sans limite de taille ni de type MIME** — *à décider par Paul (SQL proposé)*
- Fichier : `supabase/migrations/20260926000005_photo_storage_admin_operations.sql:49-60` : la politique d'envoi contraint le nom (`galleries/<cat>/<hex>/<hex>-<largeur>.avif|webp`) et le type annoncé, mais le type est déclaré par le client et le bucket n'a ni `file_size_limit` ni `allowed_mime_types`.
- Impact : faible tant que seul un admin aal2 écrit (le navigateur réencode : `src/lib/photo-storage.ts:239-252` impose JPG/PNG/HEIC, 25 Mo, 100 millions de pixels, puis `assertEncodedFormat`). Une limite côté bucket protège si le compte admin est compromis (fichier de 500 Mo, quota de stockage).
- Correctif proposé : `docs/sql/proposed-hardening-2026-11.sql` bloc M-3 : 3 Mo, `image/avif` et `image/webp` (plus gros fichier actuel : 916 Ko).

**M-4. Dépendances : mises à jour majeures nécessaires pour fermer le reste** — *à décider par Paul*
- `zod` 3.x (`package.json:74`) : avis « mémoire épuisée sur de grosses collections » corrigé en 4.6.7 (majeure). Exposition : le site ne valide avec zod que des données venant de sa propre base (`src/lib/events/parse.ts`, `galleries.ts`, `queries.ts`) et les entrées des fonctions serveur. Faible en pratique ; la migration 3→4 touche ces fichiers.
- `@tanstack/react-start` ≥ 1.169 : exige Vite 8 (peer) ; Vite 8 est une majeure (et `@lovable.dev/vite-tanstack-config` impose Vite 7).
- Dev uniquement (aucun n'est livré dans le Worker) : `postcss`, `nanoid`, `js-yaml`, `browserslist`, `source-map-js`, `esbuild`, `baseline-browser-mapping` : correctifs transitifs que `npm update` n'a pas pu appliquer (erreur interne d'npm). Reste 28 vulnérabilités avec les outils de dev, 8 en production.
- Autres mises à jour disponibles sans urgence : `@supabase/supabase-js` 2.106 → 2.119, `@tanstack/react-query` 5.100 → 5.107, Radix UI, `lucide-react` (0.575 → 1.x majeure).

### Faible

**F-1. Garde `/admin` côté client** — *par conception, pas un défaut de protection*
- `src/routes/admin/_authed.tsx:19-37` vérifie session, rôle et aal dans `beforeLoad` ; la session vit dans `localStorage` (`src/integrations/supabase/client.ts:24`), donc le serveur Worker ne peut pas la lire. Le HTML de `/admin` est public (il redirige vers la connexion) ; **la protection réelle est la RLS + aal2**, vérifiée. Les deux fonctions serveur (`storage-admin.functions.ts`) exigent un jeton Bearer et s'appuient sur les RPC qui contrôlent admin + aal2.
- Une session admin sans second facteur enregistré passe la garde (le niveau aal2 n'est exigé que si un facteur existe) ; ses écritures sont refusées par la RLS, ses lectures admin restent possibles (voir F-2). Contrôle : SQL bloc 8 (chaque admin a un facteur vérifié).

**F-2. Lecture des demandes de contact en aal1** — *à décider par Paul (SQL proposé)*
- `supabase/migrations/20260926000002_require_aal2_for_admin_writes.sql` : l'aal2 n'est exigé que pour INSERT/UPDATE/DELETE. La table `contact_requests` est vide et fermée à l'insertion (`20260926000000`), donc sans impact aujourd'hui. Proposition : politique restrictive SELECT aal2 (bloc F-2).

**F-3. Purge RGPD des demandes de contact non automatisée** — *à décider*
- La politique de confidentialité (`src/routes/confidentialite.tsx:98-110`) annonce 3 ans ; `20260926000000` laisse la purge en commentaire. Sans objet tant que la table reste vide et fermée ; à planifier sinon.

**F-4. `has_role()` exécutable par anon** — *à décider (SQL proposé, à tester)*
- `supabase/migrations/20260530053910_6355f423-7a5c-41ef-ac0a-97bb7ca6c56d.sql:16-19`. Vérifié : `rpc/has_role` répond 200 `false` en anonyme. Permet seulement de tester si un UUID connu est admin. Retrait proposé, avec le risque indiqué dans le fichier SQL.

**F-5. Liens externes `rel="noreferrer"` sans `noopener`** — *non modifié, sans impact*
- 7 liens (`src/routes/a-propos.tsx:445,456,477,493`, `src/components/site/SiteFooter.tsx:159,175`, `src/routes/espace-client.tsx:74`). `noreferrer` implique `noopener` dans tous les navigateurs actuels.

**F-6. Code mort** — *partiellement corrigé*
- `src/lib/api/example.functions.ts` (fonction serveur d'exemple, point d'entrée public sans appelant) : **supprimée (01f5277)**. `src/lib/config.server.ts` n'est plus utilisé : conservé, sans risque.
- `src/components/ui/chart.tsx:73` (`dangerouslySetInnerHTML`, composant shadcn, CSS construit depuis une configuration statique) : aucun import dans l'application.
- **`src/lib/events/legacy-noel.ts` : encore utilisé** par `src/lib/events/queries.ts`, `src/routes/sitemap[.]xml.ts` et `src/components/site/event-assets.ts` ; ne pas supprimer avant l'import des photos de Noël et le test E2E.
- 33 occurrences de `any`, en majorité dans les types générés.

**F-7. Concurrence dans l'admin** — *connu, non modifié*
- Le réordonnancement de photos d'événement passe par 3 écritures (`src/lib/events/gallery-admin.ts`, échange via ordre temporaire) ; en cas d'échec au milieu, une restauration est tentée mais non transactionnelle. Deux onglets admin ouverts en même temps peuvent s'écraser. Correctif propre : fonction SQL atomique (migration), non écrite.

---

## Vérifié conforme

- **Secrets** : aucun `.env` suivi (`.gitignore` : `.env`, `.env.*`, sauf `.env.example`), aucun JWT ni motif de clé (`sk_`, `ghp_`, `AKIA`, `xox`) dans les fichiers suivis, l'historique git ou `dist/` ; aucun `service_role` dans `src/` ni `dist/client`.
- **RLS en anonyme** (clé publique, lectures seulement) : `user_roles` et `contact_requests` 0 ligne ; brouillons invisibles (événements, pages SEO, catégories, avis, FAQ, prestations, photos : 0) ; `photo_storage_cleanup_jobs` 401 (`42501`) ; RPC `admin_photo_storage_status` et `admin_pending_photo_cleanup_jobs` : 401 « permission denied ». Colonnes de `site_settings` et `events` : aucune donnée secrète (e-mail et téléphone publics du studio).
- **Storage** : la politique de lecture par liste a été supprimée (`20260926000005:42`) ; listing refusé en anonyme, URLs directes servies.
- **Authentification** : mot de passe oublié sans énumération de comptes (`src/routes/admin/login.tsx`, même réponse que l'adresse existe ou non) ; erreurs de connexion traduites sans distinguer compte inconnu et mauvais mot de passe (Supabase `invalid_credentials`) ; double authentification TOTP appliquée par la RLS (restrictives aal2) et par la garde ; redirections toutes internes.
- **Formulaires publics** : aucun formulaire local (Pelli, en iframe sur demande, est le seul canal ; insertion directe fermée à `anon` dans la base). Pas de limite de débit ni de honeypot à gérer côté site.
- **XSS** : un seul `dangerouslySetInnerHTML` applicatif (composant `chart.tsx` inutilisé) ; textes de la base rendus par React (échappés) ; balises meta échappées par TanStack ; les JSON-LD sont désormais échappés.
- **Envois de fichiers** : SVG et HTML refusés (types acceptés JPG/PNG/HEIC), réencodage dans le navigateur (aucun original envoyé), nom de fichier généré (hash), chemins imposés par la politique Storage.
- **En-têtes** : HSTS 2 ans, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` (géolocalisation, micro, caméra), CSP. `public/_headers` et le Worker restent alignés (`src/lib/security-headers.ts`).
- **RGPD** : aucun cookie de mesure d'audience ni traceur (aucun script d'analyse dans le code) ; seuls cookies possibles : ceux de Pelli après clic sur « Afficher le formulaire », annoncés dans `src/routes/mentions-legales.tsx:158-175` ; stockage local (`localStorage`) réservé à la session admin. Cohérent avec la politique de confidentialité, qui mentionne aussi l'hébergement des photos par Supabase.

---

## Performance

Mesures Lighthouse mobile (build avec le flag, `wrangler dev` local, Chrome headless, mêmes réglages qu'avant) :

| Page | Avant (réf.) | Après tous les changements | LCP après |
|---|---:|---:|---:|
| Accueil | 86 | 86 | 4,3 s |
| /portfolio | 90 | 90 | 3,7 s |
| /portfolio/couple | 85 | 85 | 4,4 s |
| /photographe-couple-marseille | 100 | 100 | 1,1 s |

Accessibilité 100 / 96 / 100 / 96, bonnes pratiques et SEO 100 partout : inchangés. Lighthouse mesure un premier chargement à froid : le gain du cache n'y apparaît pas.

- **Fait (407bbbc)** : `Cache-Control: public, max-age=31536000, immutable` sur `/assets/*` (`public/_headers`). Les 637 fichiers de ce dossier portent une empreinte de contenu (vérifié). Avant : `max-age=0, must-revalidate` (une requête de revalidation par fichier à chaque visite). Vérifié en local avec `wrangler dev` (en-têtes de sécurité conservés).
- **Pas changé, avec raison** : le JavaScript public pèse ≈ 190 Ko compressés (`index` 86 Ko, supabase 53 Ko, react 61 Ko) ; `vendor-zod` (12 Ko compressés) est préchargé sur toutes les pages car `src/lib/events/queries.ts:2` valide des JSON de la base avec zod. Le retirer demande de réécrire cette validation à la main (changement de comportement possible) : proposition, non faite. Les pages galeries chargent leurs images en différé (47 sur 50 sur `/portfolio/famille` au chargement). Aucune requête dupliquée constatée dans la console ou le réseau lors des chargements testés.

---

## Ce que je n'ai pas pu vérifier

- **L'état réel des politiques et des droits en base** (`pg_policies`, droits `anon`, `EXECUTE` des fonctions, réglages du bucket) : la clé anonyme n'y accède pas. Il faut lancer `docs/sql/audit-security-checks.sql` (lecture seule, 9 blocs, résultat attendu indiqué pour chacun). En particulier : que la migration `20260926000002` (aal2) est appliquée avant `20261106000000`, dont le bloc aal2 de la table `events` est conditionnel.
- **Écritures anonymes** (UPDATE/DELETE/envoi dans le bucket) : non testées par prudence, aucune écriture permise ; couvertes par le SQL ci-dessus.
- **L'admin dans un navigateur connecté** : envoi de photos sous la CSP, réordonnancement, double authentification réelle, message d'erreur 2FA. Non testable sans session.
- **Le formulaire Pelli** (iframe chargée après clic) sous la nouvelle CSP.
- **Réglages hors dépôt** : paramètres Cloudflare (WAF, règles de limitation de débit, HTTPS), modèles d'e-mail et limites de débit Supabase Auth, sauvegardes, journaux d'accès.
- **Historique git** : recherche de motifs de secrets (JWT, `sk_`, `ghp_`, `AKIA`, `xox`) ; un secret sans motif connu n'aurait pas été vu. Aucun `.env` n'a jamais été ajouté (`git log --diff-filter=A`).
- **Tests de charge, fuzzing, énumération de comptes en conditions réelles** : exclus par consigne.

---

## À décider ou appliquer, par ordre de priorité

### Demande un déploiement (code déjà commité sur `photos-storage-v2`)
1. **Déployer les correctifs** (C-1, E-2, M-1, M-2, cache, code mort) : `VITE_GALLERIES_FROM_STORAGE=true npm run deploy:cf` (production actuelle avec flag). Avant : relire ce rapport ; après : ouvrir le site (galeries, `/portfolio/couple`), lancer un contrôle de la console, vérifier les en-têtes (`curl -sI https://soleanastudio.fr/ | grep -i content-security`). Retour arrière : `wrangler rollback`.
2. **Après le déploiement** : se connecter à `/admin`, envoyer une photo de test dans une galerie d'événement de test, lire la console ; si aucune ligne « Content Security Policy » : passer `/admin` en CSP bloquante (une ligne dans `src/lib/security-headers.ts`, fonction `securityHeadersFor`).
3. **Plus tard** : mises à jour majeures (zod 4, Vite 8 + `@tanstack/react-start` ≥ 1.169, `lucide-react` 1.x) dans une branche dédiée ; nonce CSP pour retirer `'unsafe-inline'` de `script-src`.

### Demande une action de ta part côté Supabase (pas de déploiement)
1. **Fermer les inscriptions** (tableau de bord Authentication) : constat E-1, la plus utile.
2. **Lancer `docs/sql/audit-security-checks.sql`** (lecture seule) et me communiquer les résultats si un bloc diffère de l'attendu.

### Demande une migration SQL de ta part (non appliquée ; contenu complet dans `docs/sql/proposed-hardening-2026-11.sql`)
1. **M-3** : limites du bucket `photos` (3 Mo, AVIF/WebP) :
   ```sql
   UPDATE storage.buckets
   SET file_size_limit = 3145728, allowed_mime_types = ARRAY['image/avif', 'image/webp']
   WHERE id = 'photos';
   ```
2. **F-4** : retirer `has_role` à `anon` (à tester, risque indiqué) :
   ```sql
   REVOKE EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) FROM PUBLIC, anon;
   GRANT EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) TO authenticated;
   ```
3. **F-2** : lecture des demandes de contact en aal2 :
   ```sql
   CREATE POLICY "Require aal2 for admin reads" ON public.contact_requests
     AS RESTRICTIVE FOR SELECT TO authenticated
     USING ((SELECT auth.jwt() ->> 'aal') = 'aal2');
   ```
4. **F-3** (si la table de contacts est un jour réutilisée) : purge à 3 ans planifiée.
5. **F-7** (si le besoin se confirme) : fonction SQL atomique pour réordonner les photos.

### Décisions produit
- Séparer ou non les galeries d'événement du flag (déjà tranché : un seul interrupteur) ; photos de Noël : voir `docs/JOURNAL-AUTONOME.md`.
