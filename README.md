# Idenva — Digital Identity Manager

---

## English

Local application for visually managing digital identities and accounts, through an interactive canvas. All data stays on your machine — no Internet connection required to use it.

### Features

- Interactive canvas: identities, accounts, emails, phones, domains, notes, tasks represented as connected nodes
- Encrypted vault: passwords and generic credentials (API keys, etc.) are never stored in plaintext
- Phone numbers are always encrypted; emails and domains are stored as plain metadata
- Security / OPSEC dashboard: detects weak or reused passwords, disabled 2FA, correlation between identities
- Change your master password at any time — nothing needs to be re-encrypted
- Encrypted export / import of your whole vault, protected by a password of your choice
- Encrypted backups, created and managed from the app
- 100% local: backend and database run on `localhost`, nothing is sent over the Internet

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
│   ├── requirements.txt       # Python dependencies
│   └── tests/
│
├── frontend/
│   ├── src/
│   │   ├── components/        # Reusable UI components (PasswordField, NotesSection, TasksSection...)
│   │   ├── nodes/             # Canvas node components (Person, Identity, Account...)
│   │   ├── panels/            # Side panels (AccountPanel, IdentityPanel...)
│   │   ├── pages/             # Main screens (unlock screen, dashboard...)
│   │   └── services/          # API client and network calls (api.ts)
│   │
│   ├── src-tauri/             # Tauri configuration and native wrapper code
│   │   ├── binaries/          # OS-specific compiled backend sidecar executables
│   │   │   ├── idenva-backend-x86_64-pc-windows-msvc.exe
│   │   │   ├── idenva-backend-aarch64-apple-darwin
│   │   │   └── idenva-backend-x86_64-unknown-linux-gnu
│   │   ├── icons/             # Application icons (.ico, .icns, .png)
│   │   ├── src/               # Rust source code (main.rs, lib.rs)
│   │   ├── tauri.conf.json    # Tauri config (externalBin declaration, window settings, bundler)
│   │   └── Cargo.toml         # Rust dependencies
│   │
│   ├── package.json           # Node.js / React dependencies
│   └── vite.config.ts         # Vite bundler configuration
│
├── data/                      # Local database folder (idenva.db) — git-ignored
├── docs/
│   └── security.md            # Security documentation (threat model, encryption details)
│
├── README.md
├── requirements.txt
└── .gitignore
```

### Running Idenva

#### Option 1 — Installed app (Windows only, for now)

Download the installer from the project's [GitHub Releases](../../releases) page and run it. This installs Idenva like any desktop app, with a shortcut you can use directly.

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

cd backend
python -m venv venv
venv\Scripts\activate        # Windows
source venv/bin/activate     # macOS/Linux
pip install -r requirements.txt
cd ..

cd frontend
npm install
cd ..
```


**Manual launch (two separate terminals):**

Terminal 1 — backend:
```bash
cd backend
venv\Scripts\activate        # Windows
source venv/bin/activate     # macOS/Linux
uvicorn app.main:app --reload
```

Terminal 2 — frontend:
```bash
cd frontend
npm run dev
```

Then open: `http://localhost:5173/`

### First launch

No vault exists yet -> the "Create Master Password" screen appears. Choose a strong, memorable master password: **it cannot be recovered if lost**, and no "forgot password" feature exists by design (that would be a backdoor in the encryption).

### Security — read this

See `docs/security.md` for exactly what is encrypted, what is not, and the limits of the protection (notably: no protection against malware already present on the machine during an unlocked session). Do not consider this application "unbreakable" just because it uses AES-256-GCM and Argon2id.

---

## Français

Application locale de gestion visuelle d'identités numériques et de comptes, sous forme de canvas interactif. Toutes les données restent sur votre machine — aucune connexion Internet requise pour l'utiliser.

### Fonctionnalités

- Canvas interactif : identités, comptes, emails, téléphones, domaines, notes, tâches représentés en nœuds reliés entre eux
- Coffre chiffré : mots de passe et credentials génériques (clés API, etc.) jamais stockés en clair
- Les numéros de téléphone sont toujours chiffrés ; emails et domaines sont stockés comme métadonnées en clair
- Dashboard sécurité / OPSEC : détection de mots de passe faibles, réutilisés, 2FA désactivée, corrélation entre identités
- Changement du mot de passe maître à tout moment — rien n'a besoin d'être re-chiffré
- Export / Import chiffré de tout ton coffre, protégé par un mot de passe que vous choisissez
- Sauvegardes chiffrées, créées et gérées depuis l'appli
- 100% local : backend et base de données tournent sur `localhost`, rien n'est envoyé sur Internet

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
│   ├── requirements.txt       # Dépendances Python
│   └── tests/
│
├── frontend/
│   ├── src/
│   │   ├── components/        # Éléments d'interface (PasswordField, NotesSection, TasksSection...)
│   │   ├── nodes/             # Nœuds du canvas (Person, Identity, Account...)
│   │   ├── panels/            # Panneaux d'édition (AccountPanel, IdentityPanel...)
│   │   ├── pages/             # Écrans (déverrouillage, page principale)
│   │   └── services/          # Appels API (api.ts)
│   │
│   ├── src-tauri/             # Configuration et fichiers natifs Tauri
│   │   ├── binaries/          # Executables backend générés pour chaque OS
│   │   │   ├── idenva-backend-x86_64-pc-windows-msvc.exe
│   │   │   ├── idenva-backend-aarch64-apple-darwin
│   │   │   └── idenva-backend-x86_64-unknown-linux-gnu
│   │   ├── icons/             # Icônes de l'application (.ico, .icns, .png)
│   │   ├── src/               # Code Rust principal (main.rs, lib.rs)
│   │   ├── tauri.conf.json    # Configuration Tauri (déclaration d'externalBin, fenêtres, bundle)
│   │   └── Cargo.toml         # Dépendances Rust
│   │
│   ├── package.json           # Dépendances Node.js / React
│   └── vite.config.ts         # Configuration du bundler Vite
│
├── data/                      # Base de données locale (idenva.db) — jamais versionnée
├── docs/
│   └── security.md            # Ce qui est protégé / ce qui ne l'est pas
│
├── README.md
├── requirements.txt
└── .gitignore
```

### Lancer Idenva

#### Option 1 — Application installée (Windows uniquement, pour l'instant)

Téléchargez l'installeur depuis la page [GitHub Releases](../../releases) du projet et lancez-le. Idenva s'installe comme n'importe quelle application de bureau, avec un raccourci directement utilisable.

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

cd backend
python -m venv venv
venv\Scripts\activate        # Windows
source venv/bin/activate     # macOS/Linux
pip install -r requirements.txt
cd ..

cd frontend
npm install
cd ..
```


**Lancement manuel (deux terminaux séparés) :**

Terminal 1 — backend :
```bash
cd backend
venv\Scripts\activate        # Windows
source venv/bin/activate     # macOS/Linux
uvicorn app.main:app --reload
```

Terminal 2 — frontend :
```bash
cd frontend
npm run dev
```

Puis ouvrir : `http://localhost:5173/`

### Premier lancement

Aucun coffre n'existe encore -> l'écran "Create Master Password" s'affiche. Choisissez un mot de passe maître solide et mémorisable : **il ne peut pas être récupéré s'il est perdu**, et aucune fonctionnalité de "mot de passe oublié" n'existe par design (ce serait une porte dérobée dans le chiffrement).

### Sécurité — à lire

Voir `docs/security.md` pour le détail exact de ce qui est chiffré, ce qui ne l'est pas, et les limites de la protection (notamment : pas de protection contre un malware déjà présent sur la machine pendant une session déverrouillée). Ne pas considérer cette application comme "inviolable" simplement parce qu'elle utilise AES-256-GCM et Argon2id.