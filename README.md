# Idenva — Digital Identity Manager

---

## English

Local application for visually managing digital identities and accounts, through an interactive canvas (n8n-style). All data stays on your machine — no Internet connection required to use it.

### Features

- Interactive canvas: identities, accounts, emails, notes, tasks represented as connected nodes
- Encrypted vault: passwords, TOTP secrets and API keys are never stored in plaintext
- Security / OPSEC dashboard: detects weak or reused passwords, disabled 2FA, correlation between identities
- 100% local: backend and database run on `127.0.0.1`, nothing is sent over the Internet

### Project structure

```
idenva/
├── backend/
│   ├── app/
│   └── tests/
│
├── frontend/
│   ├── src/
│   └── package.json
│
├── data/
├── docs/
│   ├── security.md
│   └── threat-model.md
│
├── start.bat   # one-click launch (Windows)
├── start.sh    # one-click launch (Mac/Linux)
├── README.md
└── .gitignore
```

### Requirements (install once)

- [Python 3.12 or newer](https://www.python.org/downloads/) — check "Add Python to PATH" during Windows install
- [Node.js LTS version](https://nodejs.org/) — install the version recommended for most users

Check the installation worked, in a terminal:
```bash
python --version
node --version
```

### Installation (once)

```bash
# Clone the project
git clone <repo-url>
cd idenva

# Backend
cd backend
python -m venv venv
venv\Scripts\activate        # Windows
source venv/bin/activate     # Mac/Linux
pip install -r requirements.txt
cd ..

# Frontend
cd frontend
npm install
cd ..
```

### Running the application

**Simple option (recommended for first launch):**

- Windows: double-click `start.bat`
- Mac/Linux: `./start.sh` in a terminal (or double-click if execution is allowed)

This script starts the backend and frontend automatically, then opens `http://127.0.0.1:5173` in your browser.

**Manual option (two separate terminals):**

Terminal 1 — backend:
```bash
cd backend
venv\Scripts\activate        # Windows
source venv/bin/activate     # Mac/Linux
uvicorn app.main:app --reload
```

Terminal 2 — frontend:
```bash
cd frontend
npm run dev
```

Then open: `http://127.0.0.1:5173`

### First launch

No vault exists yet → the "Create Master Password" screen appears. Choose a strong, memorable master password: **it cannot be recovered if lost**, and no "forgot password" feature exists by design (that would be a backdoor in the encryption).

### Security — read this

See `docs/security.md` for exactly what is encrypted, what is not, and the limits of the protection (notably: no protection against malware already present on the machine during an unlocked session). Do not consider this application "unbreakable" just because it uses AES-256-GCM and Argon2id.


### Roadmap (simplified packaging)

A standalone executable (`.exe` / `.app`) with no Python or Node installation required is planned for a later phase — not available yet. In the meantime, `start.bat` / `start.sh` cover the need for a simple launch.

---

## Français

Application locale de gestion visuelle d'identités numériques et de comptes, sous forme de canvas interactif (type n8n). Toutes les données restent sur ta machine — aucune connexion Internet requise pour l'utiliser.

### Fonctionnalités

- Canvas interactif : identités, comptes, emails, notes, tâches représentés en nœuds reliés entre eux
- Coffre chiffré : mots de passe, secrets TOTP et clés API jamais stockés en clair
- Dashboard sécurité / OPSEC : détection de mots de passe faibles, réutilisés, 2FA désactivée, corrélation entre identités
- 100% local : backend et base de données tournent sur `127.0.0.1`, rien n'est envoyé sur Internet

### Arborescence du projet

```
idenva/
├── backend/
│   ├── app/
│   └── tests/
│
├── frontend/
│   ├── src/
│   └── package.json
│
├── data/
├── docs/
│   ├── security.md
│   └── threat-model.md
│
├── start.bat   # lancement en un clic (Windows)
├── start.sh    # lancement en un clic (Mac/Linux)
├── README.md
└── .gitignore
```

### Prérequis (à installer une seule fois)

- [Python 3.12 ou plus récent](https://www.python.org/downloads/) — cocher "Add Python to PATH" pendant l'installation Windows
- [Node.js version LTS](https://nodejs.org/) — installer la version recommandée pour la plupart des utilisateurs

Vérifier que l'installation a fonctionné, dans un terminal :
```bash
python --version
node --version
```

### Installation (à faire une seule fois)

```bash
# Cloner le projet
git clone <url-du-repo>
cd idenva

# Backend
cd backend
python -m venv venv
venv\Scripts\activate        # Windows
source venv/bin/activate     # Mac/Linux
pip install -r requirements.txt
cd ..

# Frontend
cd frontend
npm install
cd ..
```

### Lancer l'application

**Option simple (recommandée pour un premier lancement) :**

- Windows : double-clic sur `start.bat`
- Mac/Linux : `./start.sh` dans un terminal (ou double-clic si l'exécution est autorisée)

Ce script démarre le backend et le frontend automatiquement, puis ouvre `http://127.0.0.1:5173` dans le navigateur.

**Option manuelle (deux terminaux séparés) :**

Terminal 1 — backend :
```bash
cd backend
venv\Scripts\activate        # Windows
source venv/bin/activate     # Mac/Linux
uvicorn app.main:app --reload
```

Terminal 2 — frontend :
```bash
cd frontend
npm run dev
```

Puis ouvrir : `http://127.0.0.1:5173`

### Premier lancement

Aucun coffre n'existe encore → l'écran "Create Master Password" s'affiche. Choisis un mot de passe maître solide et mémorisable : **il ne peut pas être récupéré s'il est perdu**, et aucune fonctionnalité de "mot de passe oublié" n'existe par design (ce serait une porte dérobée dans le chiffrement).

### Sécurité — à lire

Voir `docs/security.md` pour le détail exact de ce qui est chiffré, ce qui ne l'est pas, et les limites de la protection (notamment : pas de protection contre un malware déjà présent sur la machine pendant une session déverrouillée). Ne pas considérer cette application comme "inviolable" simplement parce qu'elle utilise AES-256-GCM et Argon2id.


### Feuille de route (packaging simplifié)

Un exécutable autonome (`.exe` / `.app`) sans installation de Python ni Node est prévu en phase avancée du projet, pas encore disponible. En attendant, `start.bat` / `start.sh` couvrent le besoin de lancement simple.