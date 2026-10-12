# Idenva — Digital Identity Manager

---

## English

> **[Download Latest Release](https://github.com/RemyNg22/idenva/releases/latest)**

**Idenva** is a local application for **visual digital identity management**. It allows you to organize and map your entire digital footprint (identities, accounts, passwords, phone numbers, API keys, etc.) within an interactive canvas.

All data remains strictly on your local machine — no internet connection is required.


### Key Features

- **Visual & Interactive Canvas**:
  - **Identity Panels**: Each identity forms a dedicated block on the canvas, grouping all attached accounts and services.
  - **Linked Data**: Direct association of emails, phone numbers, domains, notes, and tasks with each account.
- **Encrypted Vault**:
  - Passwords, notes, phone numbers and generic credentials (API keys, SSH keys, tokens) are **encrypted** (AES-256-GCM) with a key derived from your master password (Argon2id).
  - Everything else (identity and service names, usernames, emails, domains, tags, tasks) is stored **in plaintext** in the local database so it can be searched. See `docs/security.md`.
- **Security / OPSEC Dashboard**:
  - Real-time analysis: Detection of weak or reused passwords, alerts for disabled 2FA.
  - Exposure analysis: Detection of correlations and data overlaps between your different identities.
- **Master Password Management**:
  - Update your master password at any time without re-encrypting the entire vault.
- **Search & organization**: global search (Ctrl+K), tags, a global Notes & Tasks panel, light/dark theme (follows the system), English and French.
- **Import / Export & Backups**:
  - Encrypted export/import of the vault protected by a dedicated password.
  - Creation and restoration of local encrypted backups directly from the interface.
  - **Where the files go:** an *export* is downloaded through the app like a normal download (your system's Downloads folder). A *backup* is saved in the application's data folder (`backups/`, see "Where your data is stored") and is **not** copied to Downloads; use the "Download" button next to a backup to get a copy.
- **100% Local & Private**:
  - The application server and database run exclusively on `localhost`. No telemetry or data is sent externally.

### Project structure

```
idenva/
├── .github/
│   └── workflows/
│       └── release.yml        # GitHub Actions CI/CD (Windows, macOS, Linux builds)
│
├── backend/
│   ├── app/
│   │   ├── main.py            # FastAPI / Uvicorn server entry point
│   │   ├── config.py          # Settings (timeout, file paths)
│   │   ├── database.py        # SQLite connection setup
│   │   ├── models/            # Database ORM models
│   │   ├── schemas/           # Pydantic schemas (API request/response payloads)
│   │   ├── api/               # HTTP API routes (identities, accounts, credentials...)
│   │   ├── services/          # Business logic
│   │   └── security/          # Encryption, key derivation, vault session management
│   ├── tests/                 # Backend test suite (pytest)
│   ├── pytest.ini             # Pytest configuration
│   ├── run_server.py          # Backend entry point (also the PyInstaller entry of the packaged app)
│   └── requirements.txt       # Python dependencies (backend root)
│
├── frontend/
│   ├── src/
│   │   ├── components/        # Reusable UI components (PasswordField, NotesSection, TasksSection...)
│   │   ├── nodes/             # Canvas node components (Person, Identity, Account...)
│   │   ├── panels/            # Side panels (AccountPanel, IdentityPanel...)
│   │   ├── pages/             # Main screens (unlock screen, dashboard...)
│   │   ├── utils/             # CSS color palette, utilities
│   │   ├── services/          # API client and network calls (api.ts)
│   │   ├── locales/           # i18n translation files (fr.json, en.json)
│   │   ├── App.tsx            # React root component
│   │   └── main.tsx           # React entry point
│   │
│   ├── src-tauri/             # Tauri configuration and native wrapper code
│   │   ├── binaries/          # OS-specific compiled backend sidecar executables (git-ignored)
│   │   ├── icons/             # Application icons (.ico, .icns, PNGs)
│   │   ├── capabilities/      # Tauri permissions and capabilities (default.json)
│   │   ├── src/               # Rust source code (main.rs, lib.rs)
│   │   ├── tauri.conf.json    # Tauri config (externalBin sidecar, bundler)
│   │   ├── Cargo.toml         # Rust dependencies
│   │   └── build.rs           # Tauri build script
│   │
│   ├── public/                # Static assets (favicon, SVG icons)
│   ├── package.json           # Node.js / React dependencies
│   ├── package-lock.json      # npm dependency lock file
│   ├── .oxlintrc.json         # Oxlint linter configuration
│   └── vite.config.ts         # Vite bundler configuration
│
├── data/                      # Local database folder (idenva.db) — git-ignored
├── docs/
│   └── security.md            # Security documentation (encryption details, limits)
│
├── PRIVACY.md                 # Privacy policy
├── README.md
├── requirements.txt           # Global project requirements
└── .gitignore                 # Git exclusion rules
```

### Running Idenva

#### Option 1 — Installed app (Windows only, for now)

Download the installer from the project's [GitHub Releases](../../releases) page and run it. This installs Idenva like any desktop app, with a shortcut you can use directly.

> The installer is not code-signed yet, so Windows SmartScreen may show a warning ("More info" → "Run anyway"). Only download it from this repository's Releases page.

You can also launch it from the command line instead of the shortcut:
```cmd
cd "%LOCALAPPDATA%\Idenva"
idenva.exe
```
*(Adjust the path above to wherever the installer actually placed it on your machine — it depends on the install location you chose.)*

macOS and Linux don't have a packaged installer yet — use dev mode below on those platforms.

#### Option 2 — Dev mode (all platforms: Windows, macOS, Linux)

**Requirements** (install once):
- [Python 3.12 or newer](https://www.python.org/downloads/) — check "Add Python to PATH" during Windows install
- [Node.js LTS version](https://nodejs.org/)

```bash
python --version   # Windows
python3 --version  # macOS/Linux
node --version
```

**Installation** (once):
```bash
git clone https://github.com/RemyNg22/idenva.git
cd idenva

python -m venv venv
venv\Scripts\activate        # Windows
source venv/bin/activate     # macOS/Linux
pip install -r requirements.txt

cd frontend
npm install
cd ..
```


**Manual launch (two separate terminals):**

Terminal 1 — backend:
```bash
venv\Scripts\activate        # Windows
source venv/bin/activate     # macOS/Linux
cd backend
python -m uvicorn app.main:app --reload --port 18492
```

Terminal 2 — frontend :
```bash
venv\Scripts\activate        # Windows
source venv/bin/activate     # macOS/Linux
cd frontend
npm run dev
```

Then open: `http://localhost:5173/`

### First launch

No vault exists yet -> the "Create Master Password" screen appears. Choose a strong, memorable master password: **it cannot be recovered if lost**. There is no recovery mechanism or backdoor. The "Forgot password?" button on the unlock screen only **erases the whole vault** (after you type a confirmation word) so you can start over. Backups and exports you made keep their own export password.

### Where your data is stored

| Platform | Application data folder |
|---|---|
| Windows | `%APPDATA%\Idenva` |
| macOS | `~/Library/Application Support/Idenva` |
| Linux | `~/.local/share/Idenva` |
| Dev mode | `data/` at the project root |

It contains the database (`idenva.db`) and the `backups/` folder. Exports are not stored there (they are downloaded, see above). If you ever install the Microsoft Store version, Windows keeps its data in a private folder of the package and **deletes it on uninstall, backups included**: export first. The GitHub and Store versions do not share data.

### Security — read this

See `docs/security.md` for exactly what is encrypted, what is not, and the limits of the protection (notably: no protection against malware already present on the machine during an unlocked session). Do not consider this application "unbreakable" just because it uses AES-256-GCM and Argon2id.


---

## Français

> **[Télécharger la dernière version (Release)](https://github.com/RemyNg22/idenva/releases/latest)**

**Idenva** est une application locale de **gestion visuelle d'identités numériques**. Elle vous permet d'organiser et de cartographier l'ensemble de votre empreinte numérique (identités, comptes, mots de passe, numéros de téléphone, clés API, etc.) au sein d'un canvas interactif.

Toutes les données restent strictement sur votre machine — aucune connexion Internet n'est requise.


### Fonctionnalités clés

- **Canvas visuel & interactif** :
  - **Panneaux d'identité** : chaque identité forme un bloc dédié sur le canvas, regroupant l'ensemble des comptes et services qui lui sont rattachés.
  - **Données liées** : association directe des emails, numéros de téléphone, domaines, notes et tâches à chaque compte.
- **Coffre fort chiffré** :
  - Mots de passe, notes, numéros de téléphone et identifiants génériques (clés API, clés SSH, jetons) sont **chiffrés** (AES-256-GCM) avec une clé dérivée de votre mot de passe maître (Argon2id).
  - Tout le reste (noms d'identités et de services, noms d'utilisateur, emails, domaines, tags, tâches) est stocké **en clair** dans la base locale pour permettre la recherche. Voir `docs/security.md`.
- **Dashboard Sécurité / OPSEC** :
  - Analyse en temps réel : détection des mots de passe faibles ou réutilisés, alerte sur la 2FA non activée.
  - Analyse d'exposition : détection des corrélations et croisements d'informations entre vos différentes identités.
- **Gestion du mot de passe maître** :
  - Modification possible du mot de passe maître à tout moment sans ré-encodage complet de la base.
- **Recherche & organisation** : recherche globale (Ctrl+K), tags, panneau global Notes & Tâches, thème clair/sombre (suit le système), français et anglais.
- **Import / Export & Sauvegardes** :
  - Export/Import chiffré du coffre-fort avec un mot de passe dédié.
  - Création et restauration de sauvegardes locales chiffrées directement depuis l'interface.
  - **Où vont les fichiers :** un *export* est téléchargé via l'application comme un téléchargement classique (dossier Téléchargements du système). Une *sauvegarde* est enregistrée dans le dossier de données de l'application (`backups/`, voir « Où sont stockées vos données ») et n'est **pas** copiée dans Téléchargements ; utilisez le bouton « Télécharger » à côté d'une sauvegarde pour en obtenir une copie.
- **100 % Local & Confidentialité** :
  - Le serveur d'application et la base de données s'exécutent exclusivement en local (`localhost`). Aucune télémétrie ni donnée n'est envoyée vers l'extérieur.

### Arborescence du projet

```
idenva/
├── .github/
│   └── workflows/
│       └── release.yml        # CI/CD GitHub Actions (build Windows, macOS, Linux)
│
├── backend/
│   ├── app/
│   │   ├── main.py            # Point d'entrée du serveur FastAPI / Uvicorn
│   │   ├── config.py          # Paramètres (timeout, chemins)
│   │   ├── database.py        # Connexion SQLite
│   │   ├── models/            # Tables de la base de données
│   │   ├── schemas/           # Formats des données envoyées/reçues par l'API
│   │   ├── api/               # Routes HTTP (identities, accounts, credentials...)
│   │   ├── services/          # Logique métier
│   │   └── security/          # Chiffrement, dérivation de clé, session du coffre
│   ├── tests/                 # Suite de tests backend (pytest)
│   ├── pytest.ini             # Configuration Pytest
│   ├── run_server.py          # Point d'entrée du backend (aussi celui de PyInstaller pour l'app empaquetée)
│   └── requirements.txt       # Dépendances Python
│
├── frontend/
│   ├── src/
│   │   ├── components/        # Éléments d'interface (PasswordField, NotesSection, TasksSection...)
│   │   ├── nodes/             # Nœuds du canvas (Person, Identity, Account...)
│   │   ├── panels/            # Panneaux d'édition (AccountPanel, IdentityPanel...)
│   │   ├── pages/             # Écrans (déverrouillage, page principale)
│   │   ├── utils/             # Palette de couleur css notamment pour le mode clair
│   │   ├── services/          # Appels API (api.ts)
│   │   ├── locales/           # Fichiers de traduction i18n (fr.json, en.json)
│   │   ├── App.tsx            # Composant racine React
│   │   └── main.tsx           # Point d'entrée React
│   │
│   ├── src-tauri/             # Configuration et fichiers natifs Tauri
│   │   ├── binaries/          # Executables backend générés pour chaque OS
│   │   │   ├── idenva-backend-x86_64-pc-windows-msvc.exe
│   │   │   ├── idenva-backend-aarch64-apple-darwin
│   │   │   └── idenva-backend-x86_64-unknown-linux-gnu
│   │   ├── icons/             # Icônes de l'application (.ico, .icns, .png)
│   │   ├── capabilities/      # Permissions et capacités Tauri (default.json)
│   │   ├── src/               # Code Rust principal (main.rs, lib.rs)
│   │   ├── tauri.conf.json    # Configuration Tauri (sidecar externalBin, bundle)
│   │   ├── build.rs           # Script de build Tauri
│   │   └── Cargo.toml         # Dépendances Rust
│   │
│   ├── public/                # Ressources statiques (favicon, icônes SVG)
│   ├── package.json           # Dépendances Node.js / React
│   ├── package-lock.json      # Verrouillage des dépendances npm
│   ├── .oxlintrc.json         # Configuration du linter Oxlint
│   └── vite.config.ts         # Configuration du bundler Vite
│
├── data/                      # Base de données locale (idenva.db) — jamais versionnée
├── docs/
│   └──  security.md            # Ce qui est protégé / ce qui ne l'est pas
│
├── PRIVACY.md                 # Politique de confidentialité
├── README.md
├── requirements.txt           # Dépendances globales du projet
└── .gitignore                 # Règles d'exclusion Git
```

### Lancer Idenva

#### Option 1 — Application installée (Windows uniquement, pour l'instant)

Téléchargez l'installeur depuis la page [GitHub Releases](../../releases) du projet et lancez-le. Idenva s'installe comme n'importe quelle application de bureau, avec un raccourci directement utilisable.

> L'installeur n'est pas encore signé : Windows SmartScreen peut afficher un avertissement (« Informations complémentaires » → « Exécuter quand même »). Ne le téléchargez que depuis la page Releases de ce dépôt.

Vous pouvez aussi le lancer depuis l'invite de commandes plutôt que le raccourci :
```cmd
cd "%LOCALAPPDATA%\Idenva"
idenva.exe
```
*(Ajustez le chemin ci-dessus à l'endroit où l'installeur a réellement placé l'appli sur votre machine — ça dépend de l'emplacement choisi à l'installation.)*

macOS et Linux n'ont pas encore d'installeur empaqueté — utilisez le mode développement ci-dessous sur ces plateformes.

#### Option 2 — Mode développement (toutes plateformes : Windows, macOS, Linux)

**Prérequis** (une seule fois) :
- [Python 3.12 ou plus récent](https://www.python.org/downloads/) — cocher "Add Python to PATH" sous Windows
- [Node.js version LTS](https://nodejs.org/)

```bash
python --version   # Windows
python3 --version  # macOS/Linux
node --version
```

**Installation** (une seule fois) :
```bash
git clone https://github.com/RemyNg22/idenva.git
cd idenva

python -m venv venv
venv\Scripts\activate        # Windows
source venv/bin/activate     # macOS/Linux
pip install -r requirements.txt

cd frontend
npm install
cd ..
```


**Lancement manuel (deux terminaux séparés) :**

Terminal 1 — backend :
```bash
venv\Scripts\activate        # Windows
source venv/bin/activate     # macOS/Linux
cd backend
python -m uvicorn app.main:app --reload --port 18492
```

Terminal 2 — frontend :
```bash
venv\Scripts\activate        # Windows
source venv/bin/activate     # macOS/Linux
cd frontend
npm run dev
```

Puis ouvrir : `http://localhost:5173/`

### Premier lancement

Aucun coffre n'existe encore -> l'écran "Create Master Password" s'affiche. Choisissez un mot de passe maître solide et mémorisable : **il ne peut pas être récupéré s'il est perdu**. Il n'existe aucun mécanisme de récupération ni porte dérobée. Le bouton « Mot de passe oublié ? » de l'écran de déverrouillage **efface uniquement tout le coffre** (après saisie d'un mot de confirmation) pour repartir de zéro. Vos sauvegardes et exports gardent leur propre mot de passe d'export.

### Où sont stockées vos données

| Plateforme | Dossier de données de l'application |
|---|---|
| Windows | `%APPDATA%\Idenva` |
| macOS | `~/Library/Application Support/Idenva` |
| Linux | `~/.local/share/Idenva` |
| Mode développement | `data/` à la racine du projet |

Il contient la base de données (`idenva.db`) et le dossier `backups/`. Les exports n'y sont pas stockés (ils sont téléchargés, voir plus haut). Si vous installez un jour la version Microsoft Store, Windows garde ses données dans un dossier privé du paquet et **les supprime à la désinstallation, sauvegardes comprises** : exportez avant. Les versions GitHub et Store ne partagent pas leurs données.

### Sécurité — à lire

Voir `docs/security.md` pour le détail exact de ce qui est chiffré, ce qui ne l'est pas, et les limites de la protection (notamment : pas de protection contre un malware déjà présent sur la machine pendant une session déverrouillée). Ne pas considérer cette application comme "inviolable" simplement parce qu'elle utilise AES-256-GCM et Argon2id.