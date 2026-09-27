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

### Poids servi et échantillons temporaires

Mesure des huit photos mises en avant sur les quatre pages SEO. Chaque galerie est `variant="single"` :
une photo est chargée au premier affichage et la lightbox s'ouvre sur cette même photo. Les essais
ont été encodés directement depuis les originaux, dans `/tmp/soleana-storage-quality-samples-20260927`
et `/tmp/soleana-storage-detail-crops-100pct.png`; aucun original ni échantillon n'a été ajouté au
dépôt ou envoyé vers Supabase. Aucun fichier du lot de 170 photos n'a été régénéré.

Le `srcset` comprend désormais dans le calcul d'essai 400/800/1200/1600 px. Vérification dans Chrome
headless avec les `sizes` de l'aperçu (`960px` dès 1024 px, sinon `100vw`) : 390 px à DPR 3 sélectionne
1200 px; 1280 px à DPR 1 sélectionne également 1200 px. Pour la lightbox, 390 px à DPR 3 sélectionne
1200 px et 1280 px à DPR 1 sélectionne 1600 px. L'ouverture utilise le même fichier qu'au premier
affichage sur mobile (0 octet réseau supplémentaire si conservé en cache); sur desktop elle demande
la variante 1600 px, sauf si celle-ci a déjà été préchargée. La comparaison ci-dessous porte sur le
premier affichage demandé.

| Profil du premier affichage | Candidat Storage | WebP local actuel (8 photos) | AVIF q55 (8 photos) | AVIF q60 (8 photos) | WebP q80 (8 photos) |
|---|---:|---:|---:|---:|---:|
| Mobile 390 px, DPR 3 | 1200 px | 866 566 o | 848 691 o (-2,1 %) | 1 022 791 o (+18,0 %) | 1 325 364 o (+52,9 %) |
| Desktop 1280 px, DPR 1 | 1200 px | 866 566 o | 848 691 o (-2,1 %) | 1 022 791 o (+18,0 %) | 1 325 364 o (+52,9 %) |

Les deux profils ont le même total car ils choisissent chacun 1200 px pour l'aperçu. Le total AVIF
correspond au format choisi sur navigateur AVIF; le WebP q80 est le repli et n'est pas téléchargé en
plus par le même navigateur. La lightbox desktop peut télécharger 1600 px : cette comparaison de
premier affichage ne prétend donc pas chiffrer le transfert supplémentaire de la lightbox.

| Galerie | WebP local  | AVIF q55 | AVIF q60 | WebP q80 |
|---|---:|---:|---:|---:|
| Grossesse / galerie 1 | 156 726 o | 111 326 o | 132 828 o | 154 024 o |
| Grossesse / galerie 2 | 148 334 o | 189 260 o | 227 673 o | 292 026 o |
| Famille / galerie 1 | 155 548 o | 183 196 o | 219 450 o | 271 710 o |
| Famille / galerie 2 | 90 876 o | 54 306 o | 65 415 o | 86 790 o |
| Couple / galerie 1 | 66 228 o | 37 675 o | 45 235 o | 65 334 o |
| Couple / galerie 2 | 68 878 o | 72 999 o | 88 736 o | 125 456 o |
| Couple / galerie 3 | 86 202 o | 90 838 o | 110 143 o | 152 366 o |
| Portrait / galerie 1 | 93 774 o | 109 091 o | 133 311 o | 177 658 o |

Planche hors dépôt : `/tmp/soleana-storage-detail-crops-100pct.png`, recadrages exacts 320×320 sans
redimensionnement sur peau/tissu, cheveux/peau et tissu/détails; elle compare WebP local, AVIF q70,
AVIF q55/q60 et WebP q80/q90. Visuellement, les trois zones ne montrent pas de banding ni de
changement évident de couleur. q55 présente une légère douceur de microtexture sur certains détails,
sans aplats ou contours artificiels manifestes à ces crops. C'est un contrôle qualitatif ciblé de
trois crops issus des huit images mises en avant, pas une validation de chaque photo du lot.

Estimation du poids complet des 170 photos, avec quatre largeurs et deux formats par photo :

| Profil estimé | Anciennes largeurs 400/800/1600 | Ajout estimé 1200 | Total estimé |
|---|---:|---:|---:|
| AVIF q55 + WebP q80 | 91 388 938 o | 46 198 669 o | 137 587 607 o (137,59 Mo) |
| AVIF q60 + WebP q80 | 98 503 694 o | 49 898 294 o | 148 401 987 o (148,40 Mo) |

Ces volumes extrapolent les ratios q55/q70 (0,6261), q60/q70 (0,7545) et q80/q90 (0,5853) mesurés
sur huit images à 1200 px; les 400/800/1600 sont mis à l'échelle depuis l'index AVIF q70/WebP q90
actuel, et le 1200 est estimé par la moyenne des échantillons ×170. Ce sont des estimations de
planification, pas les octets exacts d'une régénération. Le lot validé reste 1 020 fichiers et
**152 280 609 octets (152,28 Mo)**; aucun réglage de production ni fichier du lot n'a changé. q55
ramène le premier affichage moyen légèrement sous le WebP local, tandis que q60 et le repli q80 sont
plus lourds; la décision de réglage reste à prendre après examen de la planche.

## Audit des migrations 00002–00005

Ordre obligatoire, chaque fichier une seule fois et dans une transaction de migration distincte :
`00002` → `00003` → `00004` → `00005`.

| Migration | Dépendances et effet | Rejouabilité / contrôle |
|---|---|---|
| `20260926000002_require_aal2_for_admin_writes.sql` | Ajoute 26 policies restrictives AAL2 aux tables admin, `contact_requests` et objets du bucket `photos`; les policies permissives admin existantes restent nécessaires. Les autres buckets ne sont pas restreints par ces conditions. Lecture inchangée. | Réexécutable pour ses policies nommées (drop/create). Le bloc de retour arrière ne retire que ses propres policies. Vérifier exactement les 26 policies attendues. |
| `20260926000003_add_photo_variants_and_placements.sql` | Exige RLS sur `photos`, `seo_pages`, `categories`; ajoute `photos.source_key`, deux tables RLS, contraintes/index/FK et policies publiques/admin/AAL2. FK vers photo/page/catégorie en `RESTRICT`; aucune suppression en cascade involontaire. | Garde-fous refusent les tables/colonne déjà présentes : migration à appliquer une fois, pas une migration de réparation. Les deux nouvelles tables ont 10 policies au total avec les policies restrictives AAL2. |
| `20260926000004_add_avif_photo_variants.sql` | Dépend de 00003; ajoute `format`, remplace l'unicité `(photo_id,width)` par `(photo_id,width,format)` et lie extension au format. | `ALTER TABLE` sans garde de répétition : une seule application. Vérifier `format` et les contraintes après exécution. |
| `20260926000005_photo_storage_admin_operations.sql` | Exige 00002–00004 et le bucket public existant. Restreint l'énumération aux admins, les uploads aux chemins/mime de variantes, ajoute les fonctions capacité/suppression et une outbox RLS inaccessible directement. | Transactionnelle mais `CREATE TABLE`/policies ne sont pas rejouables. Vérifier les fonctions, droits, outbox, policies et métriques après application. Retour arrière commenté et conditionné à l'absence de données/outbox. |

### Variante pré-déploiement sans 00002 : analyse et décision

| Élément | Peut fonctionner sans 00002 ? | Constat |
|---|---|---|
| 00003 | Oui, techniquement | Ses prérequis SQL sont RLS sur `photos`, `seo_pages`, `categories`; elle ne lit ni ne crée les policies de 00002. Ses propres policies restrictives AAL2 limitent les écritures authentifiées dans `photo_variants` et `photo_placements`. L'écran Photos actuellement en ligne (version `main`) ne consulte ni ces tables ni `source_key`; ces policies ne bloquent donc pas son upload legacy. |
| 00004 | Oui, après 00003 | Elle ne modifie que `photo_variants` créé en 00003 et n'exige aucune policy de 00002. |
| 00005 | **Non, telle qu'écrite** | Son garde-fou SQL refuse explicitement l'absence de « Require aal2 for photos uploads » sur `storage.objects` et de « Require aal2 for admin inserts » sur `photos`. Elle dépend donc explicitement de 00002, en plus de 00003/00004. |
| Import avec `service_role` | Oui, vis-à-vis de RLS/AAL2 | `service_role` contourne la RLS; l'import SQL/Storage peut s'exécuter sans 00002. Cela ne rend pas l'importeur actuel non-public : il insère toujours `photos.published=true`; seul `photo_placements.published` dépend du flag `--publish`. |

Le flux en ligne actuel (`git show main:src/routes/admin/_authed/photos.tsx`) envoie un fichier à la racine du bucket sous un nom UUID et son extension d'origine, puis insère `photos`. Après 00002, un admin en session AAL1 serait bloqué sur l'envoi Storage et l'insertion/modification/suppression de `photos`; la lecture et l'ouverture de l'écran restent possibles. Après 00005, même un admin AAL2 ne pourrait plus envoyer avec cet écran : sa policy restrictive n'accepte que `galleries/.../<largeur>.avif|webp` avec le MIME correspondant. La règle 00005 actuelle n'inclut d'ailleurs pas 1200 px.

**Décision pour la route demandée** : `00003` puis `00004` avant déploiement est techniquement possible; la séquence complète `00003–00005` avant déploiement, sans 00002, est **NO-GO** avec les SQL actuels. Il n'existe pas de variante sûre consistant à ignorer/retirer le garde-fou de 00005 : le même SQL restreint les envois du panneau déjà en ligne, et il a été conçu pour n'accepter que des variantes Web AVIF/WebP. Les placements seuls non publiés ne suffisent pas à cacher les imports, car les galeries legacy interrogent directement `photos` avec `published=true`.

Route pré-déploiement sûre la plus proche, sous réserve d'une prochaine version de l'importeur qui accepte explicitement un mode brouillon photo (`photos.published=false`) et dont la simulation vérifie ce champ :

1. GO uniquement après les contrôles de schéma/RLS préalables : appliquer 00003, vérifier ses tables/policies, puis appliquer 00004 et vérifier `format`/contraintes.
2. GO pour un import privé par `service_role` uniquement si la simulation confirme `photos.published=false` **et** `photo_placements.published=false` pour chaque ligne, sans modifier les photos déjà existantes. Les objets du bucket public ont des URL devinables/connues et ne sont pas confidentiels; ils ne doivent pas être considérés privés. Le code actuel n'offre pas ce mode : ne pas lancer l'import pré-déploiement avec `import-photos.mjs` tel quel.
3. NO-GO pour 00005 avant 00002 et NO-GO pour l'activation des galeries Storage. Après déploiement de `apres-noel`, enrôlement et vérification AAL2 de tous les admins, appliquer 00002 puis réviser 00005 afin d'accepter 1200 px et le parcours du nouveau panneau; vérifier ensuite les policies avant l'activation des galeries.

Ainsi, la demande précise « 00003–00005 et imports non publiés avant déploiement sans 00002 » n'est pas un chemin exécutable actuellement. Pour la rendre GO, il faudra une décision de conception et une révision dédiée de 00005 (séparant ses opérations de préparation des restrictions de l'admin), plus un mode d'import brouillon testé. Ne pas altérer les migrations déjà prêtes ni lancer d'import tant que ces préconditions ne sont pas levées.

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

Ordre de la route complète actuelle, qui comprend 00002 et 00005 : **déployer `apres-noel`**, vérifier
que son écran
`/admin/compte` et son parcours MFA sont accessibles, faire activer et vérifier la double
authentification par **tous** les admins, confirmer une session `aal2` pour chacun, puis seulement
appliquer 00002 à 00005. L'exception pré-déploiement limitée à 00003/00004 est décrite dans la section
précédente; elle ne rend pas possible 00005 sans 00002. Aucun déploiement, enrôlement ou migration n'a
été exécuté dans ce préflight.

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
| 9. Test réel limité | **NO-GO avec l'importeur actuel.** Avant tout test, ajouter et simuler un mode brouillon qui insère `photos.published=false` et `photo_placements.published=false`; sinon les pages legacy peuvent afficher les lignes dès l'insertion de `photos`, même sans `--publish`. | GO seulement quand la simulation montre les deux champs à `false`, n'altère aucune ligne préexistante, et un test de lecture publique confirme qu'aucune photo de test n'est visible. |
| 10. Lot complet | Seulement après le test limité privé, vérification de capacité et validation du script brouillon. Garder le manifeste et le journal privé inchangés. | 170 photos, 1 020 variantes actuelles, 190 placements, environ 152 280 609 octets; le plan 1200 px à quatre tailles demande une future version de génération/import et un nouveau poids vérifié. Une divergence de poids/SHA ou une ligne photo publiée = arrêt. |
| 11. Publication/lecture | Après accord, utiliser une action de publication explicitement testée qui publie les photos et placements souhaités, puis activer `VITE_GALLERIES_FROM_STORAGE=true` dans un déploiement distinct et ultérieur. `--publish-existing` ne publie actuellement que les placements. | GO quand la sélection publiée est exacte et la lecture validée sur les pages SEO. Retour au rendu précédent en désactivant le flag; objets conservés. |
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
