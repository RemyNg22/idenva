# Privacy Policy — Idenva

_Last updated: [DATE]_

## English

**Publisher:** RNG Labs — contact: rngxlabs@gmail.com

Idenva is a local application. It does not have an account system, a cloud service or a server operated by the publisher.

**What data Idenva handles.** Identities, accounts, usernames, emails, domains, tags, tasks, notes, phone numbers, passwords and other credentials that **you** enter. Passwords, notes, phone numbers and generic credentials are encrypted (AES-256-GCM) with a key derived from your master password (Argon2id). Other fields (identity and service names, usernames, emails, domains, tags, tasks) are stored **unencrypted** in the local database file. See [security.md](docs/security.md) for the exact scope and limits.

**Where it is stored.** Only on your device, in the application data folder. Nothing is sent to the publisher or to any third party.

**Network use.** The application starts a local server that listens only on `127.0.0.1` (your own machine) and is used by the application's interface. Idenva does not send your data over the Internet. No telemetry, analytics, crash reporting or automatic update check is included.

**Backups and exports.** Encrypted with a separate password, your exports are downloaded directly to your system (Downloads folder), while your backups are stored internally in the application's data folder (backups/) and require a manual download from the interface.

**Deleting your data.** You can reset the vault from within the application (using your master password, or via "Forgot password?" when the vault is locked). Uninstalling the application does not automatically delete your data or backups, but it is always recommended to perform an export for security.

**Lost password.** There is no recovery mechanism. If you lose your master password, encrypted data cannot be recovered; the only option is a full reset.

**Children.** Idenva is not directed at children and collects no data from anyone.

**Changes.** Changes to this policy will be published in this file in the project repository.

## Français

**Éditeur :** RNG Labs — contact : rngxlabs@gmail.com

Idenva est une application locale. Elle n'a ni système de comptes, ni service cloud, ni serveur exploité par l'éditeur.

**Données traitées.** Identités, comptes, noms d'utilisateur, e-mails, domaines, tags, tâches, notes, numéros de téléphone, mots de passe et autres identifiants que **vous** saisissez. Les mots de passe, notes, numéros de téléphone et credentials génériques sont chiffrés (AES-256-GCM) avec une clé dérivée de votre mot de passe maître (Argon2id). Les autres champs (noms d'identités et de services, noms d'utilisateur, e-mails, domaines, tags, tâches) sont stockés **en clair** dans le fichier de base de données local. Le périmètre exact et les limites sont décrits dans [security.md](docs/security.md).

**Où elles sont stockées.** Uniquement sur votre appareil, dans le dossier de données de l'application. Rien n'est envoyé à l'éditeur ni à un tiers.

**Utilisation du réseau.** L'application démarre un serveur local qui écoute uniquement sur `127.0.0.1` (votre propre machine) et sert l'interface de l'application. Idenva n'envoie pas vos données sur Internet. Aucune télémétrie, statistique d'usage, rapport de plantage ni vérification automatique de mise à jour n'est incluse.

**Sauvegardes et exports.** Chiffrés à l'aide d'un mot de passe distinct, vos exports sont téléchargés directement sur votre système (dossier Téléchargements), tandis que vos sauvegardes sont stockées en interne dans le dossier de données de l'application (backups/) et nécessitent un téléchargement manuel depuis l'interface.

**Suppression des données.** Vous pouvez réinitialiser le coffre depuis l'application (avec votre mot de passe maître, ou via « Mot de passe oublié ? » quand le coffre est verrouillé). La désinstallation de l'application ne supprime pas automatiquement vos données ni vos sauvegardes, mais il est toujours recommandé d'effectuer un export par sécurité.

**Mot de passe perdu.** Il n'existe aucun mécanisme de récupération. Si vous perdez votre mot de passe maître, les données chiffrées sont irrécupérables ; la seule issue est une réinitialisation complète.

**Enfants.** Idenva ne s'adresse pas aux enfants et ne collecte de données auprès de personne.

**Modifications.** Les changements de cette politique seront publiés dans ce fichier, dans le dépôt du projet.