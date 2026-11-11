// Contenu du guide d'aide affiché sur /admin/aide (composant src/components/admin/AdminGuide.tsx).
// Modifiable ici sans toucher à la mise en page. Ton : bienveillant, phrases courtes, sans jargon.
// Chaque étape a été vérifiée dans le code de l'administration (libellés des boutons et des champs
// repris tels quels, entre guillemets). Si un libellé change dans l'admin, le changer ici aussi.

export type AdminGuideSection = {
  id: string;
  title: string;
  summary: string;
  /** Étapes numérotées, courtes. */
  steps: string[];
  /** Ce que cela change sur le site public. */
  publicImpact: string;
  /** Un piège fréquent et sa solution. */
  commonMistake?: { problem: string; fix: string };
};

export const ADMIN_GUIDE_SECTIONS: AdminGuideSection[] = [
  {
    id: "double-authentification",
    title: "Activer la double authentification",
    summary:
      "Pour modifier le site, l'administration demande, en plus du mot de passe, un code à 6 chiffres donné par une application sur votre téléphone. Vous ne le faites qu'une fois.",
    steps: [
      "Installez sur votre téléphone une application d'authentification (Google Authenticator, Microsoft Authenticator, Authy, 1Password…).",
      "Dans le menu de l'administration, ouvrez « Mon compte ».",
      "Cliquez sur « Activer la double authentification ».",
      "Scannez le QR code affiché avec l'application.",
      "Saisissez le code à 6 chiffres que l'application affiche, puis validez.",
      "La prochaine fois, après votre mot de passe, l'écran vous demandera ce code à 6 chiffres.",
    ],
    publicImpact: "Rien ne change sur le site : c'est la protection de votre accès.",
    commonMistake: {
      problem: "Un message dit que l'action « demande la double authentification ».",
      fix: "Activez-la dans « Mon compte », puis reconnectez-vous avec votre code à 6 chiffres. Si elle est déjà activée, déconnectez-vous et reconnectez-vous : le message « Reconnectez-vous avec votre code à 6 chiffres pour modifier le site » vous le demande.",
    },
  },
  {
    id: "creer-evenement",
    title: "Créer et publier un événement",
    summary:
      "Un événement est une page du site (par exemple des mini-séances) avec ses dates, ses formules et son lien de réservation. Tant qu'il est un brouillon, personne ne le voit.",
    steps: [
      "Dans le menu, ouvrez « Événements ».",
      "Dans « Nouvel événement », tapez un titre (par exemple « Mini-séances de printemps 2027 ») puis cliquez sur « + Créer ». Une fiche s'ouvre : c'est un brouillon.",
      "Complétez la fiche de haut en bas : « Informations générales » (titre, adresse de la page, lieu), « Dates », « Présentation », « Formules et réservation » (nom, prix, contenu et « Lien de réservation » copié depuis Pelli), « Image de couverture ».",
      "Cliquez sur « Enregistrer » régulièrement. Le bouton n'est actif que si vous avez changé quelque chose.",
      "Cliquez sur « Aperçu » pour voir la page avec vos modifications, même non enregistrées. Rien n'est public.",
      "Regardez le cadre orange « À vérifier avant de publier » s'il apparaît : il ne bloque rien, il vous rappelle par exemple l'image de couverture ou une galerie vide.",
      "Cliquez sur « Publier » et confirmez. La page est alors visible par tout le monde à l'adresse indiquée sous le titre.",
    ],
    publicImpact:
      "Dès la publication, la page est en ligne et apparaît dans la liste des pages que Google peut visiter. Ensuite, chaque « Enregistrer » est visible tout de suite. Pour retirer la page, utilisez « Dépublier » : elle redevient un brouillon.",
    commonMistake: {
      problem: "« Impossible de publier » s'affiche.",
      fix: "Le message dit ce qui manque : au moins une date, une présentation, et un lien de réservation Pelli (pour l'événement ou pour chaque formule). Le lien doit commencer par https://soleana-studio.pelli.io/. L'adresse de la page ne peut plus être changée après la première publication.",
    },
  },
  {
    id: "dates",
    title: "Régler ou changer les dates (et le mauvais temps)",
    summary:
      "Les dates sont des jours entiers. La page passe toute seule en « édition terminée » le lendemain de la dernière date, dates de report comprises.",
    steps: [
      "Ouvrez la fiche de l'événement, section « Dates ».",
      "Pour changer de dates : cliquez sur « Retirer » à côté des anciennes dates, puis « Ajouter une date » pour chaque nouvelle date.",
      "Pour le mauvais temps : « Ajouter une date de report » sous « Dates de report en cas de mauvais temps ». Elles doivent venir après la première date de séance.",
      "Cliquez sur « Enregistrer ». Si l'événement est déjà publié, une confirmation rappelle les dates qui vont s'afficher.",
      "Exemple : les mini-séances de Noël 2026 sont passées du 7 et du 11 novembre au 28 et 29 novembre. On retire le 7 et le 11, on ajoute le 28 et le 29, on enregistre.",
    ],
    publicImpact:
      "Le haut de la page, l'invitation sur l'accueil et les informations lues par Google montrent les nouvelles dates dès l'enregistrement. Les dates de report apparaissent sous la forme « En cas de mauvais temps, les séances sont reportées aux… ».",
    commonMistake: {
      problem:
        "Le message dit qu'une date est « indiquée deux fois » ou qu'une date de report est aussi une date de séance.",
      fix: "Supprimez le doublon : une même journée ne peut pas être à la fois une séance et un report.",
    },
  },
  {
    id: "galerie-edition-precedente",
    title: "Ajouter une galerie « édition précédente »",
    summary:
      "Une galerie est un groupe de photos affiché sous la présentation de l'événement. Vous pouvez en créer plusieurs, ou montrer les photos de l'année précédente.",
    steps: [
      "Ouvrez la fiche de l'événement, section « Galeries photos ».",
      "Dans « Nouvelle galerie », tapez un nom (par exemple « Édition précédente » ou « Famille ») puis cliquez sur « + Créer la galerie ».",
      "Dans la galerie, cliquez sur « Ajouter des photos » et choisissez-en une ou plusieurs.",
      "Pour chaque photo, vérifiez le champ de description, changez l'ordre avec les flèches ← et →, et utilisez « Masquer » pour la cacher sans la supprimer.",
      "Autre possibilité : sous « Afficher aussi les photos d'une autre édition », choisissez l'événement de l'année précédente. Ses photos apparaissent sous le titre « Édition précédente », sans être copiées (seulement si cet événement est publié).",
      "Une galerie vide peut être supprimée avec « Supprimer la galerie ».",
    ],
    publicImpact:
      "Les galeries et leurs photos publiées apparaissent sur la page de l'événement dans l'ordre choisi. Une galerie sans photo n'apparaît pas.",
    commonMistake: {
      problem:
        "Les galeries ne sont pas proposées, ou un message dit qu'elles ne sont pas encore activées.",
      fix: "Demandez à Paul de les activer : c'est un réglage technique que lui seul peut faire.",
    },
  },
  {
    id: "photos-cadrage",
    title: "Envoyer des photos et régler leur cadrage",
    summary:
      "Les photos sont préparées sur votre appareil (téléphone, tablette ou ordinateur) avant d'être envoyées. Votre fichier d'origine n'est jamais envoyé.",
    steps: [
      "Depuis une galerie d'événement : « Ajouter des photos ». Depuis le menu « Photos » : « Ajouter une photo ».",
      "Choisissez une photo JPG, HEIC (iPhone) ou PNG de 25 Mo au plus. Si l'iPhone ou le navigateur ne lit pas un fichier HEIC, utilisez la version JPG.",
      "Dans « Photos », remplissez « Description de la photo (obligatoire) » : une phrase simple, par exemple « Une famille rit dans un champ de lavande ». Elle aide Google et les personnes malvoyantes.",
      "Choisissez la « Destination » : « Page du site » ou « Événement » (puis l'événement et sa galerie).",
      "Réglez le cadrage : « Cadrage horizontal » et « Cadrage vertical » (de 0 à 100). Dans la fiche d'un événement, utilisez les curseurs « Horizontal » et « Vertical », puis « Enregistrer le cadrage ».",
      "Cliquez sur « Ajouter à la galerie » et attendez la fin de l'envoi.",
    ],
    publicImpact:
      "Une photo envoyée dans la galerie d'un événement s'affiche avec l'événement. Le cadrage décide quelle partie de la photo reste visible quand elle est recadrée.",
    commonMistake: {
      problem: "L'envoi s'arrête ou un message parle de connexion.",
      fix: "Rien n'est ajouté à moitié : recommencez simplement l'envoi quand la connexion est revenue.",
    },
  },
  {
    id: "dupliquer-archiver",
    title: "Dupliquer pour l'année suivante, archiver, supprimer",
    summary:
      "Pour une nouvelle édition, ne repartez pas de zéro : dupliquez l'événement précédent.",
    steps: [
      "Ouvrez la fiche de l'événement de l'an dernier et cliquez sur « Dupliquer ».",
      "Choisissez que faire des galeries : « Sans les galeries photos », « Reprendre les galeries » ou « Afficher les photos de l'édition précédente ». L'explication est écrite sous chaque choix.",
      "Cliquez sur « Dupliquer » : une copie est créée en brouillon, sans dates. Choisissez les nouvelles dates, adaptez les textes, puis publiez.",
      "Pour retirer un événement terminé du site sans le perdre : « Archiver ». Il n'est plus visible. « Remettre en brouillon » le rend modifiable de nouveau.",
      "« Supprimer ce brouillon » n'existe que pour un événement jamais publié. Une confirmation indique combien de photos sont concernées ; elles restent dans « Photos ».",
    ],
    publicImpact:
      "Un événement archivé ou en brouillon n'est plus visible sur le site ni proposé à Google. La copie n'est visible qu'après votre publication.",
    commonMistake: {
      problem: "Les photos d'un événement dupliqué ont disparu des deux événements.",
      fix: "Avec « Reprendre les galeries », les photos sont partagées : supprimer une photo dans « Photos » la retire des deux événements. Préférez « Afficher les photos de l'édition précédente ».",
    },
  },
  {
    id: "accueil",
    title: "Montrer l'événement sur la page d'accueil",
    summary:
      "Une invitation à découvrir l'événement peut apparaître sur l'accueil. L'accueil n'en montre qu'une : celle dont la prochaine date est la plus proche.",
    steps: [
      "Ouvrez la fiche de l'événement, section « Page d'accueil ».",
      "Cochez « Afficher sur la page d'accueil » (l'événement doit être publié).",
      "Écrivez le texte de l'invitation ; le titre et le texte du bouton sont facultatifs.",
      "Cliquez sur « Enregistrer ».",
    ],
    publicImpact:
      "L'invitation apparaît sur l'accueil dès l'enregistrement et disparaît toute seule à la fin de l'édition. Décochez la case pour la retirer plus tôt.",
  },
];

export type AdminGuideOtherSection = { name: string; text: string };

/** Rubriques qui fonctionnent toutes de la même façon : modifier, puis « Enregistrer ». */
export const ADMIN_GUIDE_OTHER_SECTIONS: AdminGuideOtherSection[] = [
  { name: "Prestations", text: "tarifs, durées et nombre de photos de la page Prestations." },
  { name: "Avis", text: "les avis clients affichés sur le site." },
  { name: "FAQ", text: "les questions et réponses de la page FAQ." },
  {
    name: "Pages SEO",
    text: "les textes des pages grossesse, famille, couple, portrait et lifestyle.",
  },
  { name: "Paramètres", text: "vos coordonnées et liens affichés sur tout le site." },
];

export type AdminGuideTroubleshootingItem = { question: string; answer: string };

export const ADMIN_GUIDE_TROUBLESHOOTING: AdminGuideTroubleshootingItem[] = [
  {
    question: "Le message dit que l'action « demande la double authentification ».",
    answer:
      "Ouvrez « Mon compte » et activez la double authentification (voir plus haut), puis reconnectez-vous avec votre code à 6 chiffres. Si elle est déjà activée, déconnectez-vous et reconnectez-vous.",
  },
  {
    question: "Je vois « Votre session a expiré » ou « Connexion impossible ».",
    answer:
      "Vérifiez votre connexion internet. Si le message parle de session, reconnectez-vous. Ce que vous aviez écrit dans une fiche et pas enregistré peut être perdu : enregistrez souvent.",
  },
  {
    question: "J'ai oublié mon mot de passe.",
    answer:
      "Sur l'écran de connexion, cliquez sur « Mot de passe oublié ? », entrez votre e-mail, puis ouvrez le lien reçu par e-mail (regardez aussi dans les courriers indésirables). Le nouveau mot de passe doit faire au moins 12 caractères, avec une lettre et un chiffre.",
  },
  {
    question: "J'ai perdu mon téléphone (double authentification).",
    answer:
      "Sans votre téléphone, vous ne pouvez plus entrer le code à 6 chiffres. Contactez Paul : lui seul peut réinitialiser la double authentification.",
  },
  {
    question: "Une modification n'apparaît pas sur le site.",
    answer:
      "Actualisez la page du site (Ctrl+F5 sur ordinateur). Vérifiez que l'événement est bien « Publié » (et non brouillon ou archivé) et que vous avez cliqué sur « Enregistrer ». Sinon, contactez Paul.",
  },
  {
    question: "À qui m'adresser ?",
    answer:
      "À Paul pour tout ce qui est technique : activer les galeries, réinitialiser la double authentification, un message d'erreur qui revient. Notez le texte exact du message et ce que vous faisiez.",
  },
];
