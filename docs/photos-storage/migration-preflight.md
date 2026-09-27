# Préflight final des migrations Storage photos

État au 27 septembre 2026. **Aucune migration, écriture Supabase, suppression distante ou
modification de production n'a été exécutée.** Le préflight local du manifeste et des fichiers est
`READY`. Le préflight global des migrations et de l'import réel est `NOT READY` tant que les
contrôles en lecture seule du projet réel n'ont pas été faits.

## Résultats et conditions de GO

| Contrôle | Résultat | Condition avant opération réelle |
|---|---|---|
| Branche et code | `photos-storage`, synchronisée au départ avec `origin/photos-storage`; `main` reste `cfda0d3` | Relire le statut Git avant commit/push. |
| Fichiers locaux | 170 photos, 1 020 variantes (510 AVIF, 510 WebP), 190 placements; 152 280 609 octets | `verify-variants.mjs` et `import-photos.mjs --preflight` verts. |
| Bucket et policies de production | Non interrogés pendant ce préflight | Sorties de `preflight-selects.sql` concordantes, bucket `photos` public et aucune policy permissive inconnue. |
| MFA des administrateurs | Non interrogée en production | Chaque compte admin a un TOTP `verified` et a ouvert une session `aal2`. |
| Capacité du projet | `PHOTOS_STORAGE_LIMIT_BYTES` absente du processus local; usage Storage de production non interrogé | Configurer la limite Worker, mesurer l'usage global, puis confirmer `usage + 152 280 609 <= limite`. |
| SQL PostgreSQL réel | Non exécuté; `psql` et le CLI Supabase ne sont pas disponibles ici | Appliquer une migration à la fois dans le SQL Editor et vérifier chaque résultat avant de continuer. |
| HEIC sur iPhone | Non testé sur appareil physique | **TEST PHYSIQUE IPHONE REQUIS** avant de déclarer HEIC pris en charge en production. |

### Simulation locale du lot

Commandes exécutées dans ce worktree, sans appeler Supabase et sans créer de journal :

```bash
node scripts/photos-storage/verify-variants.mjs
node scripts/photos-storage/import-photos.mjs --preflight
```

Résultat : `READY`, 170 photos uniques, 1 020 variantes, 190 placements, poids indexé de
152,28 Mo. Le vérificateur a contrôlé chaque octet : SHA-256, taille, signature/mime, dimensions,
proportions, unicité, absence de métadonnées et absence d'image non indexée. Les placements
référencent tous une photo, portent une clé unique et ont un texte alternatif cohérent. Le lot
complet vaut 152 280 609 octets; les quatre premières photos du manifeste représentent 4 274 097
octets. Les six fichiers par photo sont attendus pour ce lot haute définition.

Cette simulation valide le manifeste et les variantes locales, pas la configuration ni l'état de
la base et du bucket en production. Les tests du helper de capacité couvrent un bucket vide, 100 Mo,
69/70/84/85/94/95 %, les modes `warn` et `block`, un dépassement prévisionnel et le refus en mode
`block` sans limite. Le composant admin appelle ce contrôle avant le premier upload; son test vérifie
qu'un refus ne produit ni upload, ni insertion de ligne. Les seuils 70/85/95 déclenchent des messages,
pas un blocage automatique. `warn` autorise même un dépassement; `block` le refuse.

La file de suppression est testée localement pour stockage indisponible après suppression SQL,
suppression partielle de trois objets sur six suivie d'une reprise, objets déjà absents, tâche
dupliquée et échec de confirmation SQL. La règle de nettoyage des orphelins de moins de 24 h est
exclue par le prédicat SQL strict `created_at < now() - interval '24 hours'`; une variante plus
ancienne que 24 h devient candidate si aucune ligne `photo_variants` ni `photos.image_url` ne la
référence. Ce prédicat a été relu statiquement, pas exécuté sur PostgreSQL.

### Poids au premier affichage et à l'ouverture de la lightbox

Mesure locale des huit sections des quatre pages SEO. Elles utilisent `variant="single"` : le
premier affichage montre une seule photo, puis la lightbox s'ouvre sur cette même photo. La version
actuelle sert son WebP local complet (933 ou 1 400 px, selon la photo). En Storage, les attributs
`sizes` font choisir le candidat AVIF 1 600 px sur les profils testés : 390 px à DPR 3 (`100vw` ×
DPR) et 1 280 px à DPR 1 (`960px` pour l'aperçu, `1280px` dans la lightbox). L'ouverture reprend
le même candidat en cache : **0 octet supplémentaire** pour cette première image. Le WebP q90
serait le repli si le navigateur n'utilise pas AVIF.

Chaque ligne indique le poids de l'image au premier affichage **et** le total après ouverture de la
lightbox pour cette image. Les nombres sont identiques aux deux profils, qui choisissent tous deux
la variante 1 600 px.

| Page / section | WebP local actuel | Storage AVIF q70 | Écart | Storage WebP q90 (repli) |
|---|---:|---:|---:|---:|
| Grossesse / galerie 1 | 156 726 o | 258 993 o | +65,3 % | 402 880 o |
| Grossesse / galerie 2 | 148 334 o | 495 037 o | +233,7 % | 790 320 o |
| Famille / galerie 1 | 155 548 o | 436 036 o | +180,3 % | 694 498 o |
| Famille / galerie 2 | 90 876 o | 144 583 o | +59,1 % | 252 316 o |
| Couple / galerie 1 | 66 228 o | 83 139 o | +25,5 % | 163 688 o |
| Couple / galerie 2 | 68 878 o | 176 927 o | +156,9 % | 357 298 o |
| Couple / galerie 3 | 86 202 o | 231 591 o | +168,7 % | 422 564 o |
| Portrait / galerie 1 | 93 774 o | 294 615 o | +214,2 % | 550 892 o |

L'AVIF q70 du Storage est donc plus lourd que le WebP local sur les huit images comparées. L'écart
vient aussi du choix de résolution : le WebP local fait 933/1 400 px tandis que le candidat
Storage servi fait 1 600 px. Le navigateur a sélectionné le candidat 1 600 px dans Chrome headless;
les tailles d'octets viennent des fichiers servis localement, sans entêtes HTTP ni cache CDN. La
planche côte à côte, hors dépôt, est
`/tmp/soleana-storage-first-display-comparison.png`; elle compare le WebP local, l'AVIF q70 et le
WebP q90 pour la première image de chaque section. À sa taille d'affichage, aucun défaut évident
n'apparaît, mais elle ne remplace pas l'examen des détails fins à taille réelle.

Un essai **AVIF q55 / WebP q80** est une piste, pas un réglage validé. Aucune variante n'a été
régénérée pour cet essai, conformément à la consigne. Le lot antérieur AVIF q50 / WebP q80 pesait
78,30 Mo, avec une perte visible de microtexture à 1 600 px; il ne permet pas de déduire précisément
le poids q55/q80. Le poids total et la comparaison visuelle des candidats q55/q80 restent à mesurer
après accord pour produire des fichiers d'essai temporaires. Le total actuellement validé reste
**152,28 Mo**.

## Audit des migrations 00002–00005

Ordre obligatoire, chaque fichier une seule fois et dans une transaction de migration distincte :
`00002` → `00003` → `00004` → `00005`.

| Migration | Dépendances et effet | Rejouabilité / contrôle |
|---|---|---|
| `20260926000002_require_aal2_for_admin_writes.sql` | Ajoute 26 policies restrictives AAL2 aux tables admin, `contact_requests` et objets du bucket `photos`; les policies permissives admin existantes restent nécessaires. Les autres buckets ne sont pas restreints par ces conditions. Lecture inchangée. | Réexécutable pour ses policies nommées (drop/create). Le bloc de retour arrière ne retire que ses propres policies. Vérifier exactement les 26 policies attendues. |
| `20260926000003_add_photo_variants_and_placements.sql` | Exige RLS sur `photos`, `seo_pages`, `categories`; ajoute `photos.source_key`, deux tables RLS, contraintes/index/FK et policies publiques/admin/AAL2. FK vers photo/page/catégorie en `RESTRICT`; aucune suppression en cascade involontaire. | Garde-fous refusent les tables/colonne déjà présentes : migration à appliquer une fois, pas une migration de réparation. Les deux nouvelles tables ont 10 policies au total avec les policies restrictives AAL2. |
| `20260926000004_add_avif_photo_variants.sql` | Dépend de 00003; ajoute `format`, remplace l'unicité `(photo_id,width)` par `(photo_id,width,format)` et lie extension au format. | `ALTER TABLE` sans garde de répétition : une seule application. Vérifier `format` et les contraintes après exécution. |
| `20260926000005_photo_storage_admin_operations.sql` | Exige 00002–00004 et le bucket public existant. Restreint l'énumération aux admins, les uploads aux chemins/mime de variantes, ajoute les fonctions capacité/suppression et une outbox RLS inaccessible directement. | Transactionnelle mais `CREATE TABLE`/policies ne sont pas rejouables. Vérifier les fonctions, droits, outbox, policies et métriques après application. Retour arrière commenté et conditionné à l'absence de données/outbox. |

Les trois RPC privilégiées (capacité, suppression, reprise/fin de file) utilisent `SECURITY DEFINER`,
`search_path` vide, vérifient explicitement rôle admin et `aal2`; `EXECUTE` est révoqué à `PUBLIC`
et `anon`, accordé à `authenticated`, puis les fonctions refusent tout appel sans admin+AAL2. La table
outbox n'a aucune policy utilisateur; seuls le propriétaire des fonctions `SECURITY DEFINER` et
`service_role` peuvent y accéder. La fonction de capacité échoue si un objet n'a pas de taille
`metadata.size` entière valide, plutôt que de sous-estimer l'usage.

La suppression SQL copie les chemins exacts issus des lignes de variantes dans l'outbox et supprime
placements/variantes/photo dans une transaction. Après commit, la suppression Storage est rejouable;
la tâche n'est retirée qu'après succès. La contrainte de l'outbox limite une photo à six chemins, ce
qui correspond aux six variantes importées. Les erreurs Storage laissent la tâche en attente. Une
fonction de reprise traite les objets déjà absents comme une réussite idempotente.

Le bucket reste **public** pour GET sur une URL connue. Public ne signifie pas confidentiel : toute
personne connaissant l'URL peut télécharger le fichier. L'API de liste doit rester réservée à l'admin.
Avant 00005, comparer la liste complète issue de `preflight-selects.sql` aux policies attendues;
toute policy permissive supplémentaire sur `storage.objects` peut s'ajouter par OU aux policies
permissives prévues et bloque le GO jusqu'à analyse. La policy de validation de chemin/MIME vérifie
le nom et les métadonnées déclarées; l'importateur et le générateur local vérifient la signature et
les octets. Le `service_role` d'import contourne la RLS; le script n'envoie que les variantes
validées, jamais un original.

## AAL2 : effet et récupération

Ordre obligatoire avant toute migration photos : **déployer `apres-noel`**, vérifier que son écran
`/admin/compte` et son parcours MFA sont accessibles, faire activer et vérifier la double
authentification par **tous** les admins, confirmer une session `aal2` pour chacun, puis seulement
appliquer 00002 à 00005. Aucun de ces déploiements ou enrôlements ne fait partie du présent préflight.

Si 00002 est appliquée avant l'enrôlement, un admin AAL1 peut encore se connecter et lire ce que ses
policies de lecture permettent, mais toutes ses écritures admin protégées sont refusées. Les
policies des nouvelles tables de 00003 exigent aussi AAL2. L'accès au tableau admin n'est pas
globalement redirigé par l'AAL; c'est l'écriture qui échoue. Ne pas retirer le bloc AAL2 de 00003 et
ne pas rendre les policies permissives pour faciliter l'import.

Avant 00002, l'opérateur doit obtenir la liste des utilisateurs admin avec une requête de lecture
seulement (`public.user_roles` jointe à `auth.users`), puis, pour chaque compte, confirmer dans
`/admin/compte` un facteur TOTP vérifié et une connexion/challenge qui donne `currentLevel = aal2`.
Activer auparavant la vérification TOTP dans les réglages Auth Supabase. Si une personne reste AAL1,
arrêter : pas de migration.

Si le facteur est perdu, essayer un autre facteur de secours vérifié. Sinon, un opérateur de confiance
ayant accès serveur au projet peut supprimer le facteur avec l'API Admin Supabase
`auth.admin.mfa.deleteFactor({ id, userId })` (jamais depuis le navigateur), ce qui invalide les
sessions de l'utilisateur; celui-ci se reconnecte, enrôle un facteur et valide AAL2. Ne pas désactiver
les policies comme procédure ordinaire. Voir la
[documentation MFA Supabase](https://supabase.com/docs/guides/auth/auth-mfa), la référence
[deleteFactor](https://supabase.com/docs/reference/javascript/auth-admin-deletefactor) et
[unenroll](https://supabase.com/docs/reference/javascript/auth-mfa-unenroll).

## Procédure opérateur — GO/NO-GO

Ne lancer ces actions que dans une fenêtre validée, avec Paul opérateur et le projet explicitement
confirmé. Conserver les sorties privées de préflight et les journaux d'import hors du dépôt.

| Étape | Action exacte | Résultat attendu et décision |
|---|---|---|
| 1. État/sauvegarde | Dans Supabase Dashboard, confirmer le project ref. Exécuter `docs/photos-storage/preflight-selects.sql` en lecture seule; sauvegarder les tables éditoriales concernées et la liste/état des objets `photos` selon la procédure de sauvegarde du projet. Ne pas copier de clé dans le dépôt. | Vérifier bucket `photos` existant/public, policies connues, schéma pré-migration, aucune table nouvelle préexistante, taille/collisions compris. Tout écart non expliqué = **NO-GO**. |
| 2. Déployer `apres-noel` | Déployer la version validée de `apres-noel` selon son processus de release; vérifier `/admin/compte` et le parcours de challenge TOTP. Ne pas appliquer de migration photos pendant ce déploiement. | Écran d'enrôlement et parcours MFA accessibles; sinon **NO-GO**. |
| 3. Activer le MFA de tous les admins | Vérifier chaque compte `user_roles.role='admin'` avec `auth.users.id`; après le déploiement, chaque admin active/vérifie son TOTP puis ouvre une session AAL2 dans `/admin/compte`. | Tous les comptes recensés, sans exception, session `aal2` confirmée = GO. Compte manquant ou AAL1 = **NO-GO**, aucune migration. |
| 4. 00002 | Dans SQL Editor, appliquer intégralement `20260926000002_require_aal2_for_admin_writes.sql` une fois. Compter ses policies `Require aal2 for %` et tester login/lecture admin; ne pas tester en écrivant en production. | 26 policies (21 sur 7 tables, 2 sur `contact_requests`, 3 sur `storage.objects`); admin accessible, AAL1 refusé en écriture. Sinon arrêter et évaluer le rollback exact de 00002. |
| 5. 00003 | Appliquer `20260926000003_add_photo_variants_and_placements.sql` une fois. Exécuter le bloc RLS/policies correspondant de `postflight-selects.sql`. | Les deux tables existent, RLS activée, 10 policies combinées; aucune ligne de contenu créée. Sinon **NO-GO**. |
| 6. 00004 | Appliquer `20260926000004_add_avif_photo_variants.sql` une fois. Lire la colonne `format` et les contraintes. | `format` non nullable, défaut `webp`, valeurs AVIF/WebP, unicité incluant format, extension liée au format. |
| 7. Capacité | Configurer `PHOTOS_STORAGE_LIMIT_BYTES` comme variable serveur Worker (jamais `VITE_`) et préférer `PHOTOS_STORAGE_CRITICAL_UPLOAD_MODE=block`. Après 00005, relever l'usage global avec `admin_photo_storage_status()`. | L'opérateur confirme séparément `used_bytes + 152280609 <= limite`, puisque l'import `service_role` contourne le contrôle UI. Limite absente/invalide ou projection trop élevée = **NO-GO**. |
| 8. 00005 | Appliquer `20260926000005_photo_storage_admin_operations.sql` une fois. Vérifier policies de liste/upload/update/delete et privilèges des quatre RPC. | RPC sans admin/AAL2 refusée; admin+AAL2 autorisé. Non-admin ne peut lister, uploader, supprimer ou appeler une RPC privilégiée. Anonyme peut GET une URL connue, pas lister. Sinon **NO-GO**. |
| 9. Test réel limité | Après GO explicite, fournir `SUPABASE_URL` et `SUPABASE_SERVICE_ROLE_KEY` dans un terminal contrôlé (le script ne lit pas `.env`). Exécuter `node scripts/photos-storage/import-photos.mjs --apply --confirm <project-ref>.supabase.co --limit 4`, sans `--publish`. | 4 photos, 24 variantes, 4 placements non publiés, environ 4 274 097 octets. Vérifier Storage et DB; sinon simuler puis appliquer le rollback du journal correspondant. |
| 10. Lot complet | Après validation du test limité : `node scripts/photos-storage/import-photos.mjs --apply --confirm <project-ref>.supabase.co`. Garder le manifeste et le journal privé inchangés. | 170 photos, 1 020 variantes, 190 placements, environ 152 280 609 octets. Reprise possible avec même manifeste; divergence de poids/SHA = arrêt. |
| 11. Publication/lecture | Inspecter les quatre pages. Après accord, publier avec `node scripts/photos-storage/import-photos.mjs --apply --confirm <project-ref>.supabase.co --publish-existing`. Activer `VITE_GALLERIES_FROM_STORAGE=true` dans un déploiement distinct et ultérieur. | Placements publiés et lecture testée. Retour au rendu précédent en désactivant le flag; objets conservés. |
| 12. Rollback du lot | Simuler : `node scripts/photos-storage/rollback-import.mjs --journal <chemin-journal-import.jsonl>`. Si le plan correspond au lot fautif, appliquer avec `--apply --confirm <project-ref>.supabase.co`. | Supprime uniquement les identifiants/objets journalisés `created: true`; un journal `dry-run` est refusé. Vérifier l'absence des lignes/objets du lot et une outbox vide. |

Les migrations 00003–00005 ne sont pas idempotentes et ne doivent pas être recollées après une
application réussie. La migration 00002 est la seule de ce groupe dont le remplacement de policies
est conçu pour être rejoué, mais l'historique de migration doit tout de même rester exact. Les blocs
de rollback SQL ne sont pas à exécuter comme tests : ils ne s'appliquent qu'après vérification d'un
retour des données et des objets à l'état antérieur.

## Journaux locaux de simulations à nettoyer manuellement

Les 12 fichiers `dry-run-*.jsonl` ci-dessous se trouvent dans
`../soleana-originaux/storage-variants/journals/`, hors worktree. Leur inspection en lecture seule a
montré uniquement des entrées prévisionnelles (`planned: true`, `created: 0`) : ce ne sont ni des
journaux d'import réel, ni des journaux de rollback. Ils peuvent être supprimés manuellement sans
risque pour Supabase ou les fichiers source. Ils n'ont pas été supprimés pendant ce préflight.

| Fichier | Contenu |
|---|---|
| `dry-run-2026-09-26T12-24-12-900Z.jsonl` | 24 entrées, plan 3 photos / 9 variantes / 3 placements. |
| `dry-run-2026-09-26T12-24-23-796Z.jsonl` | 1 upload prévisionnel isolé (artefact de test). |
| `dry-run-2026-09-27T16-06-01-958Z.jsonl` | 56 entrées, plan 4 photos / 24 variantes / 4 placements. |
| `dry-run-2026-09-27T16-06-05-594Z.jsonl` | 2 400 entrées, plan 170 photos / 1 020 variantes / 190 placements. |
| `dry-run-2026-09-27T18-53-58-896Z.jsonl` | 56 entrées, même simulation de 4 photos. |
| `dry-run-2026-09-27T18-53-58-905Z.jsonl` | 2 400 entrées, même simulation du lot complet. |
| `dry-run-2026-09-27T19-22-28-288Z.jsonl` | 56 entrées, même simulation de 4 photos. |
| `dry-run-2026-09-27T19-22-28-302Z.jsonl` | 2 400 entrées, même simulation du lot complet. |
| `dry-run-2026-09-27T19-24-28-541Z.jsonl` | 56 entrées, même simulation de 4 photos. |
| `dry-run-2026-09-27T19-24-28-572Z.jsonl` | 2 400 entrées, même simulation du lot complet. |
| `dry-run-2026-09-27T20-17-49-151Z.jsonl` | 56 entrées, même simulation de 4 photos. |
| `dry-run-2026-09-27T20-17-49-187Z.jsonl` | 2 400 entrées, même simulation du lot complet. |
