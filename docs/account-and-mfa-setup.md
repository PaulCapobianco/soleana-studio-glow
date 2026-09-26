# Compte admin, mot de passe et double authentification — mise en place

Écrit le 26 septembre 2026. Concerne l'écran **Mon compte** (`/admin/compte`), la connexion avec code
à 6 chiffres (TOTP), « Mot de passe oublié ? » (`/admin/reinitialiser`) et la migration
`supabase/migrations/20260926000002_require_aal2_for_admin_writes.sql` (**créée, non appliquée**).

Les comptes admin restent créés uniquement depuis le tableau de bord Supabase ; l'inscription publique
est désactivée (Authentication → Sign In / Providers → « Allow new users to sign up » désactivé).

## 1. Configuration Supabase nécessaire

Dans le tableau de bord du projet, section **Authentication** (les intitulés exacts peuvent varier
légèrement selon la version de l'interface) :

1. **URL Configuration**
   - *Site URL* : `https://soleanastudio.fr`
   - *Redirect URLs* (liste d'autorisation) : ajouter
     - `https://soleanastudio.fr/admin/reinitialiser` (lien de réinitialisation du mot de passe) ;
     - `https://soleanastudio.fr/admin/login` (retour après validation d'un changement d'e-mail) ;
     - pour les essais en local : `http://localhost:8082/admin/reinitialiser` et
       `http://localhost:8082/admin/login`.
   - Un lien dont l'adresse n'est pas dans cette liste est refusé ou renvoyé sur la Site URL.
2. **Sign In / Providers → Email**
   - *Confirm email* : activé.
   - *Secure email change* : activé (le changement d'adresse doit être confirmé par les deux adresses).
   - *Secure password change* : au choix. S'il est activé et que la session date de plus de 24 h,
     Supabase exige un code reçu par e-mail : l'écran « Mon compte » gère ce cas (il envoie le code et
     le demande).
3. **Multi-Factor Authentication (MFA)** : activer **TOTP** (inscription *Enroll* et vérification
   *Verify* activées). Sans cela, l'activation depuis « Mon compte » échoue avec un message
   « La double authentification n'est pas activée sur le projet ».
4. **Email Templates** : vérifier que les modèles « Reset Password » et « Change Email Address »
   contiennent bien le lien `{{ .ConfirmationURL }}` (ils peuvent être traduits en français).
5. **SMTP personnalisé** : voir le point 2 ci-dessous.

## 2. Limite du service d'e-mail par défaut de Supabase

Le service d'envoi intégré de Supabase est prévu pour des essais : le nombre d'e-mails est très faible
(de l'ordre de quelques messages par heure pour tout le projet) et il peut être restreint aux adresses
des membres de l'équipe du projet. Vérifier les limites actuelles dans la documentation Supabase
(« Auth → Rate limits » et « Custom SMTP »).

Conséquences : le lien « Mot de passe oublié ? », le changement d'e-mail et le code de confirmation
peuvent arriver en retard, être refusés (« trop de tentatives ») ou ne pas arriver du tout. Il faut donc
**configurer un SMTP personnalisé** avant de compter sur ces fonctions :

- Authentication → SMTP Settings → *Enable Custom SMTP* avec un fournisseur transactionnel (Brevo,
  Mailjet, Resend, OVH…) ; expéditeur du type `no-reply@soleanastudio.fr`.
- Côté DNS du domaine : enregistrements **SPF**, **DKIM** et **DMARC** du fournisseur (sinon les
  messages finissent en courrier indésirable).
- Ensuite, relever si besoin la limite d'envois dans Authentication → Rate Limits.
- Tester un « Mot de passe oublié ? » réel et vérifier la réception.

## 3. Procédure de secours : la photographe perd son téléphone

Sans le téléphone, le code à 6 chiffres est impossible : il faut retirer le second facteur depuis le
tableau de bord (accès « service », non soumis aux règles de la base). Pas à pas :

1. **Vérifier l'identité** de la personne (appel, message d'un canal connu). Ne jamais retirer un
   facteur sur simple demande par e-mail.
2. Ouvrir le tableau de bord Supabase du projet → **Authentication → Users**.
3. Ouvrir la fiche de l'utilisateur concerné (recherche par e-mail).
4. Utiliser l'action **« Remove MFA factors »** (menu de la fiche) si elle est proposée. Sinon, passer
   par l'éditeur SQL :
   ```sql
   -- 1) repérer le compte et ses facteurs
   SELECT u.id, u.email, f.id AS factor_id, f.factor_type, f.status, f.friendly_name
   FROM auth.users u LEFT JOIN auth.mfa_factors f ON f.user_id = u.id
   WHERE u.email = 'adresse-du-compte@exemple.fr';

   -- 2) supprimer les facteurs de CE compte (remplacer l'identifiant)
   DELETE FROM auth.mfa_factors WHERE user_id = '00000000-0000-0000-0000-000000000000';
   ```
   (les défis associés sont supprimés en cascade ; une session déjà ouverte reste valable jusqu'à
   expiration mais ne peut plus valider de code).
5. Demander à la personne de **se connecter avec son mot de passe seul** : sans facteur enregistré, la
   connexion passe. Si le mot de passe est aussi perdu, utiliser d'abord « Mot de passe oublié ? ».
6. Elle ouvre **Mon compte → Double authentification → Activer** et enregistre son nouveau téléphone
   (scan du QR code, saisie du code). Elle se déconnecte puis se reconnecte avec un code pour vérifier.
7. **Prévention** : lors de l'activation, noter la *clé de configuration* affichée sous le QR code
   dans un gestionnaire de mots de passe (elle permet de recréer le générateur de codes sur un autre
   téléphone) ; prévoir un **deuxième compte admin de secours** créé depuis le tableau de bord.

Cette procédure fonctionne aussi une fois la migration `require_aal2` appliquée : le tableau de bord et
l'éditeur SQL ne sont pas soumis à la RLS.

## 4. Ordre de mise en place sans risque de blocage

1. **Configurer Supabase** : URLs, MFA TOTP activé, SMTP personnalisé (points 1 et 2). Aucun impact sur
   le site actuel.
2. **Déployer le code** de la branche `apres-noel` (après le déploiement de Noël). Tant que la migration
   `require_aal2` n'est pas appliquée, rien n'est obligatoire : la double authentification est
   facultative et la connexion par mot de passe seul continue de fonctionner.
3. **Essayer avec un compte de test** (jamais avec le seul compte réel) : créer l'utilisateur depuis le
   tableau de bord, lui donner le rôle admin
   (`INSERT INTO public.user_roles (user_id, role) SELECT id, 'admin' FROM auth.users WHERE email = '…';`),
   puis dérouler la liste de tests (connexion, changement de mot de passe, activation du TOTP,
   connexion avec code, mot de passe oublié, désactivation).
4. **Compte réel** : se connecter, changer le mot de passe, activer le TOTP, noter la clé de
   configuration, se déconnecter et se reconnecter avec un code. Vérifier que le **mot de passe oublié**
   fonctionne réellement (e-mail reçu).
5. **Avoir un accès de secours** : deuxième compte admin avec son propre second facteur, et procédure
   du point 3 lue.
6. **Seulement alors, appliquer la migration** `20260926000002_require_aal2_for_admin_writes.sql`
   (à la main dans l'éditeur SQL). Vérifier `SELECT count(*) FROM pg_policies WHERE policyname LIKE
   'Require aal2 for %';` (attendu : 26), puis faire **une écriture de test** depuis l'administration
   (avec un compte au niveau aal2) et une tentative depuis un compte sans second facteur (doit
   échouer).
7. **Retour arrière** si besoin : le bloc commenté en bas du fichier de migration supprime toutes les
   politiques `Require aal2 for …` sans toucher au reste.

**Ne jamais appliquer la migration avant les étapes 2 à 5** : sans code déployé ou sans second facteur
enregistré, plus aucune écriture n'est possible depuis l'administration.
