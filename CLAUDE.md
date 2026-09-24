# Instructions du projet Soleana Studio

## Contexte

Site vitrine d'une photographe : TanStack Start, React, Vite, Tailwind, Supabase et Cloudflare Workers. Utiliser npm uniquement. Lire `AUDIT.md` avant toute intervention. Les originaux haute résolution sont dans `../soleana-originaux`, hors dépôt ; ne jamais les commiter.

## Règles de travail

- Ne jamais déployer ni lancer de migration. Préparer les migrations et laisser Paul les appliquer.
- Ne jamais lire le contenu de `.env`.
- Faire un commit dédié par étape. Exécuter `npm run typecheck` et `npm run build`, tous deux au vert, avant chaque commit.
- L'environnement local utilise la base de production : ne jamais modifier de contenu réel pendant les tests. Pour tester une écriture, créer puis supprimer un élément de test.
- Poser la question à Paul lorsqu'une décision produit est nécessaire.
- Ne pas toucher à `bun.lock` : npm est le seul gestionnaire de paquets utilisé.

## Règles de base de données

- La RLS est la seule protection réelle : les droits Supabase par défaut accordent aussi `INSERT`, `UPDATE` et `DELETE` aux rôles `anon` et `authenticated`.
- Créer toute nouvelle table avec `ENABLE ROW LEVEL SECURITY` et ses policies dans la même migration, sur le modèle de `supabase/migrations/20260530053910_6355f423-7a5c-41ef-ac0a-97bb7ca6c56d.sql`.
- Lors d'un ajout de colonne, vérifier et adapter les policies RLS concernées dans la même migration.
