# Photos → Supabase Storage : phase 1 (galeries des pages SEO)

État : **préparation terminée, rien d'appliqué ni d'envoyé**. Périmètre : les 8 galeries des pages
couple, famille, grossesse et portrait (170 photos, 190 emplacements). Pas Noël, pas l'accueil,
pas À propos. Voir aussi `docs/photos-storage-plan.md` (plan général).

## Ce qui existe dans le dépôt

| Élément | Rôle |
|---|---|
| `docs/photos-storage/preflight-selects.sql` | Requêtes de vérification en lecture seule (bucket, politiques, tables, comptes). |
| `supabase/migrations/20260926000003_add_photo_variants_and_placements.sql` | Schéma additif (`photos.source_key`, `photo_variants`, `photo_placements`) avec RLS et politiques aal2. **Non appliquée, inchangée.** |
| `supabase/migrations/20260926000004_add_avif_photo_variants.sql` | Ajoute le format AVIF à `photo_variants` et autorise deux formats par largeur. **Non appliquée ; à lancer après 000003.** |
| `docs/photos-storage/manifest-phase1.json` | Manifeste : chaque photo (fichier source, clé opaque, dimensions) et chaque emplacement (galerie, ordre, texte alternatif actuel, cadrage 50/50). Généré par `build-manifest.mjs`. |
| `scripts/photos-storage/generate-variants.mjs` | Génère AVIF et WebP en 400 px, 800 px et largeur native (sans agrandissement), toujours réencodés sans métadonnées, dans `../soleana-originaux/storage-variants/` (hors dépôt). |
| `scripts/photos-storage/verify-variants.mjs` | Vérifie dimensions, poids, empreintes, absence d'EXIF/XMP/ICC, clés de stockage. |
| `scripts/photos-storage/import-photos.mjs` | Import. **Simulation par défaut.** Mode réel : `--apply --confirm <hôte>`. |
| `scripts/photos-storage/rollback-import.mjs` | Retour arrière à partir du journal (supprime seulement ce que le lot a créé). |
| `src/lib/photo-storage.ts` | Interrupteur `STORAGE_GALLERIES_ENABLED`, helper unique `publicImageUrl()`, lecture des emplacements. |

Variantes générées : **1 020 fichiers, 43,7 Mo** (AVIF : 16,0 Mo ; WebP : 27,7 Mo).
La vérification a contrôlé dimensions, poids, SHA-256 et absence de métadonnées sur chaque fichier.
Clés de stockage : `galleries/<catégorie>/<id opaque de 12 caractères>/<hash8>-<largeur>.<avif|webp>`
(aucun nom de client ni de fichier d'origine ; clé versionnée par le contenu, jamais écrasée).

## Côté site : lecture préparée mais inactive

- Tant que `VITE_GALLERIES_FROM_STORAGE` n'est pas `true` au build, le site lit les fichiers locaux,
  sans requête ni donnée en plus : le HTML est identique à celui d'avant.
- Activé **seulement après l'import complet**, le `loader` de `/$slug` lit les emplacements publiés
  (rendu serveur conservé). Storage devient la source de la galerie : les ajouts, retraits et
  dépublications de l'admin peuvent changer son nombre de photos. En cas d'erreur de lecture ou de
  table absente, les fichiers locaux restent affichés. Une galerie volontairement vide reste vide.
- Une photo Storage n'est utilisable que si elle possède les variantes AVIF et WebP aux mêmes
  largeurs. La galerie affiche alors `<picture>` (AVIF, puis WebP) ; les photos locales conservent
  exactement leurs balises `<img>` actuelles.
- `VITE_IMAGE_BASE_URL` (ex. `https://images.soleanastudio.fr`) remplace l'hôte des images sans
  toucher aux composants (sous-domaine Cloudflare avec cache devant le bucket).

L'écran admin « Photos » reste lisible avant les migrations, mais désactive l'ajout et la suppression
tant que `photo_variants` et `photo_placements` ne sont pas disponibles. Après application, l'envoi
réencode sur l'appareil en AVIF (encodeur WASM chargé à la demande) et WebP. Le texte alternatif est
obligatoire. Les emplacements SEO ont une page, une galerie, un ordre libre, un cadrage et un état de
publication. Les cases Accueil / Portfolio restent masquées : ces pages ne lisent toujours pas ces
colonnes. L'envoi n'a **pas** été exécuté contre la production ; la logique est testée localement.
Sur une image JPEG avec orientation EXIF, nom d'auteur et profil ICC, le test Chrome local a confirmé
deux sorties correctement orientées (400 × 600), AVIF et WebP, sans EXIF, ICC, XMP ni IPTC. Un test
automatisé simule l'envoi, le nettoyage après échec et la suppression confirmée. Un navigateur qui
ne sait pas décoder la photo ou encoder WebP ne peut pas l'envoyer ; essayer un JPG récent dans ce cas.

## Procédure pas à pas : test réel sur 4 photos (à faire par Paul)

Rien de ceci n'a été exécuté. Chaque étape a un retour arrière.

1. **Vérifier l'état de production** : exécuter les requêtes de `preflight-selects.sql` une à une
   (lecture seule) et noter : bucket `photos` public, politiques du stockage, `source_key` absente,
   nouvelles tables absentes, nombre de lignes de `photos`. Sauvegarder (export) les tables `photos`,
   `categories`, `seo_pages` et la liste des objets du bucket. *Retour arrière : sans objet.*
2. **Appliquer la migration** `20260926000003_...sql` dans le SQL Editor (copier le fichier entier).
   Si la migration `20260926000002` (aal2) n'est pas encore appliquée et que les admins n'ont pas leur
   second facteur, retirer le bloc « aal2 » en fin de fichier avant de l'exécuter.
   Contrôle : les deux tables existent, `SELECT count(*) FROM pg_policies WHERE tablename IN
   ('photo_variants','photo_placements');` (attendu : 4 sans le bloc aal2, 10 avec).
   *Retour arrière : bloc « Retour arrière » commenté en bas du fichier (tables vides).*
   **Puis appliquer `20260926000004_add_avif_photo_variants.sql`** : contrôle par
   `SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND
   table_name = 'photo_variants' AND column_name = 'format';` (une ligne attendue).
3. **Régénérer et vérifier les variantes en local** (déjà fait, rejouable ; environ 10 minutes) :
   `node scripts/photos-storage/generate-variants.mjs && node scripts/photos-storage/verify-variants.mjs`.
   *Retour arrière : supprimer le dossier hors dépôt.*
4. **Simulations** : `node scripts/photos-storage/import-photos.mjs --limit 4`, puis
   `node scripts/photos-storage/import-photos.mjs` → relire les envois et insertions prévus.
   Résultats locaux : 4 photos / 24 variantes / 4 emplacements (1,84 Mo), puis 170 photos /
   1 020 variantes / 190 emplacements (43,70 Mo). Un journal prévisionnel est écrit hors dépôt.
   *Aucun appel réseau, aucun effet en base.*
5. **Import réel de 4 photos** (les emplacements restent non publiés, donc invisibles du public) :
   ```
   export SUPABASE_URL=https://<projet>.supabase.co
   read -rsp 'Clé service_role : ' SUPABASE_SERVICE_ROLE_KEY; echo
   export SUPABASE_SERVICE_ROLE_KEY
   node scripts/photos-storage/import-photos.mjs --apply --confirm <projet>.supabase.co --limit 4
   unset SUPABASE_SERVICE_ROLE_KEY
   ```
   Le script vérifie l'hôte, n'écrase rien, saute ce qui existe et écrit un journal
   `import-<date>.jsonl` dans `../soleana-originaux/storage-variants/journals/`.
   Désactiver l'historique du shell le temps de saisir les commandes si le shell les enregistre ;
   `read -s` ne montre jamais la valeur et elle n'est écrite dans aucun fichier.
6. **Vérifier** : (a) `SELECT count(*)` sur `photos` (avec `source_key IS NOT NULL`),
   `photo_variants`, `photo_placements` (attendu : 4, 24, 4) ; (b) ouvrir dans un navigateur
   l'URL publique d'une variante (`https://<projet>.supabase.co/storage/v1/object/public/photos/<storage_path>`)
   et vérifier `content-type: image/avif` puis `image/webp` et l'en-tête de cache ; (c) avec la clé publique (anon),
   `photo_placements` doit renvoyer une liste vide (non publiés) ; (d) l'écran admin « Photos » liste
   les 4 photos avec leur texte alternatif.
7. **Retour arrière du test** si besoin : `node scripts/photos-storage/rollback-import.mjs --journal
   <journal>` (simulation), puis avec `--apply --confirm <hôte>`. Il supprime seulement les lignes et
   objets créés par ce lot.
8. **Import complet** (une fois le test validé) : même commande sans `--limit` ; puis publier les
   emplacements : `node scripts/photos-storage/import-photos.mjs --apply --confirm <hôte> --publish-existing`.
   Ce dernier passage écrit aussi un journal permettant d'annuler la publication.
9. **Activation côté site** : construire avec `VITE_GALLERIES_FROM_STORAGE=true`, vérifier les 4 pages
   (ordre, texte alternatif, cadrage, chargement des images à 360, 768 et 1280 px), puis déployer.
   *Retour arrière immédiat : redéployer sans la variable (les fichiers locaux sont toujours dans le code).*
10. **Ensuite seulement** : BUG-02 (pages `/portfolio/<catégorie>`), sous-domaine d'images Cloudflare,
    puis chantier séparé de suppression des anciens fichiers du dépôt.

## Limites connues

- Les photos sources locales font au plus 1400 px : pas de variante 1600 px (aucun agrandissement).
- Le texte alternatif actuel est répétitif (« Séance photo … - photo N ») : il est repris tel quel
  pour ne rien changer à l'affichage ; à améliorer photo par photo dans l'admin ensuite.
- Le mode réel du script n'a pas pu être testé contre un vrai projet (règle : production en lecture
  seule) ; sa logique suit la simulation et la migration a été testée dans un Postgres local jetable.

## Cases « Accueil » / « Portfolio » masquées dans l'admin (2026-09-26)

Les colonnes `photos.on_home` et `photos.on_portfolio` existent en base mais ne sont lues par
aucune page publique : seules `published` et `category_id` déterminent aujourd'hui ce qui
s'affiche sur le site (voir `src/components/site/CategoryGallery.tsx` et
`CategoryGallerySection.tsx`). Les deux cases à cocher correspondantes ont donc été masquées dans
`src/routes/admin/_authed/photos.tsx` pour ne pas laisser croire à un effet qui n'existe pas.
Les colonnes et les données ne sont pas touchées.

À réafficher (avec une explication à jour) quand la migration Storage des photos fait lire
l'accueil et/ou le portfolio depuis la base, si ces colonnes sont conservées pour piloter cet
affichage.
