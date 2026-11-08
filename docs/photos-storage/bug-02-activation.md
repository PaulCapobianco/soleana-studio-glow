# BUG-02 : activation différée des pages portfolio par catégorie

Le correctif existe déjà dans l'historique de `photos-storage` : commit `0a23b0f`, qui rend les
pages `/portfolio/<catégorie>` dans l'outlet du routeur. Le commit `d46c2db` l'a **annulé** en
attendant l'import des photos. Aucun fichier portfolio n'est modifié dans ce chantier et BUG-02
reste donc inactif aujourd'hui.

Après les migrations 000003 et 000004, l'import complet, la publication des 190 emplacements et
la vérification des quatre pages SEO, réactiver le correctif dans une étape dédiée :

```bash
git revert d46c2db
npm run typecheck
npm test
npm run build
git diff --check
```

Contrôler sur mobile, tablette et ordinateur les URLs `/portfolio/couple`,
`/portfolio/famille`, `/portfolio/grossesse` et `/portfolio/portrait`, les liens depuis l'index,
les images, le clavier, les titres et les balises SEO. Ce `git revert` touche uniquement
`src/routes/portfolio.tsx` et `src/routes/portfolio/index.tsx` ; il ne doit être exécuté **qu'après**
l'import et sur la branche prévue pour cette activation. Le retour arrière est un nouveau revert
du commit ainsi créé.
