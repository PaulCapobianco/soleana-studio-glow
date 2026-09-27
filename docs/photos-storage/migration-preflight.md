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
| 2. AAL2 | Vérifier tous les comptes `user_roles.role='admin'` et leur `auth.users.id`; chaque personne vérifie TOTP puis ouvre une session AAL2 dans `/admin/compte`. | Tous les comptes recensés, sans exception, AAL2 confirmé = GO; un compte manquant/AAL1 = **NO-GO**. |
| 3. 00002 | Dans SQL Editor, appliquer intégralement `20260926000002_require_aal2_for_admin_writes.sql` une fois. Compter ses policies avec les noms `Require aal2 for %` et les tables prévues. Tester login/lecture admin et une session AAL2; ne pas tester en écrivant en production. | 26 policies (21 sur 7 tables, 2 sur `contact_requests`, 3 sur `storage.objects`); admin accessible. AAL1 doit être refusé en écriture. Sinon arrêter et utiliser le rollback exact documenté dans 00002 seulement selon décision opérateur. |
| 4. 00003 | Appliquer `20260926000003_add_photo_variants_and_placements.sql` une fois. Exécuter le bloc RLS/policies correspondant de `postflight-selects.sql`. | Les deux tables existent, RLS activée, 10 policies combinées; aucun enregistrement de contenu créé. Une table/policy absente ou inattendue = **NO-GO**. |
| 5. 00004 | Appliquer `20260926000004_add_avif_photo_variants.sql` une fois. Lire la colonne `format` et les contraintes de `photo_variants`. | `format` non nullable, défaut `webp`, valeurs AVIF/WebP, unicité incluant format et chemin lié à l'extension. |
| 6. Capacité | Configurer `PHOTOS_STORAGE_LIMIT_BYTES` comme variable serveur Worker (jamais `VITE_`) et le mode souhaité `PHOTOS_STORAGE_CRITICAL_UPLOAD_MODE=block` pour le garde-fou admin. Relever l'usage global projet par `admin_photo_storage_status()` après 00005, plus les autres buckets. | Pour l'importer qui contourne le contrôle UI via `service_role`, l'opérateur confirme séparément `used_bytes + 152280609 <= limite`. Toute limite absente, usage invalide ou projection supérieure = **NO-GO**. |
| 7. 00005 | Appliquer `20260926000005_photo_storage_admin_operations.sql` une fois. Exécuter les vérifications postflight; vérifier politiques de liste/upload/update/delete et privilèges des quatre RPC. | RPC appelée en lecture sans rôle ou en AAL1 = refus; admin+AAL2 autorisé. Non-admin ne peut ni lister, upload, supprimer, ni appeler une RPC privilégiée. Anonyme peut faire GET d'une URL publique connue, pas lister les noms. Si ce contrat n'est pas constaté = **NO-GO**. |
| 8. Test réel limité | Après GO explicite, fournir `SUPABASE_URL` et `SUPABASE_SERVICE_ROLE_KEY` uniquement dans un terminal contrôlé (le script ne lit pas `.env`). Exécuter `node scripts/photos-storage/import-photos.mjs --apply --confirm <project-ref>.supabase.co --limit 4` sans `--publish`. | 4 photos, 24 objets/lignes variantes, 4 placements non publiés, environ 4 274 097 octets. Confirmer Storage count/SHA/MIME et lignes DB. Sinon rollback par le journal `import-*.jsonl` correspondant, après sa simulation. |
| 9. Lot complet | Seulement après vérification du test limité : `node scripts/photos-storage/import-photos.mjs --apply --confirm <project-ref>.supabase.co`. Garder le même manifeste et préserver le journal privé. | Total attendu 170 photos, 1 020 variantes (510 de chaque format), 190 placements, environ 152 280 609 octets. Rejouer le même import en cas d'arrêt; l'outil compare l'existant et n'écrase pas. Toute divergence de SHA/poids = arrêt. |
| 10. Publication/lecture | Inspecter le rendu sur les 4 pages. Publier seulement après accord via `node scripts/photos-storage/import-photos.mjs --apply --confirm <project-ref>.supabase.co --publish-existing`. Activer `VITE_GALLERIES_FROM_STORAGE=true` dans une étape de déploiement ultérieure, après validation séparée. | Les placements attendus deviennent publiés; les requêtes publiques ne lisent que les placements publiés. L'URL Storage connue reste publique. Revenir au rendu précédent en désactivant le flag; les objets restent en place. |
| 11. Rollback de lot | Simuler d'abord : `node scripts/photos-storage/rollback-import.mjs --journal <chemin-journal-import.jsonl>`. Si le plan correspond exactement au lot fautif, agir ensuite avec `--apply --confirm <project-ref>.supabase.co`. | N'efface que les IDs/objets dont le journal réel indique `created: true`; un journal `dry-run` est refusé. Vérifier zéro lignes/objets de ce lot et file outbox vide. |

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
