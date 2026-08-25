# Architecture de Sécurité & Cryptographie — Idenva

Idenva est un coffre-fort d'identités et de secrets locaux conçu selon le principe de **Connaissance Nulle (Zero-Knowledge Architecture)**. Vos mots de passe, clés et données personnelles restent sous votre contrôle exclusif : **aucune donnée en clair et aucun secret permettant de les déchiffrer ne sont jamais enregistrés sur votre disque**.

---

## 1. Principes Fondamentaux

### A. Le modèle Zero-Knowledge local
Dans un système classique, le serveur vérifie souvent le mot de passe en le comparant à un hash (comme bcrypt ou Argon2). 
Idenva n'utilise **aucun système de vérification directe du mot de passe (Zero-Verification)** :
* Il n'y a **aucun hash** du mot de passe maître stocké dans la base de données.
* La seule preuve que le mot de passe est correct réside dans la **réussite cryptographique du déchiffrement**. Si le mot de passe est faux, la clé générée sera fausse, le tag d'authentification AES-GCM rejettera le bloc, et l'accès sera immédiatement bloqué.

### B. Séparation stricte entre Mémoire (RAM) et Disque (BDD)
* **Sur le disque (BDD SQLite) :** Tout est chiffré en `AES-256-GCM` ou sous forme de métadonnées cryptographiques non exploitables sans le mot de passe maître.
* **En mémoire vive (RAM) :** La clé principale de chiffrement n'existe que le temps de votre session utilisateur. Dès la fermeture ou l'inactivité de l'application, elle est effacée par écrasement d'octets.

---

## 2. La Hiérarchie des Clés

Plutôt que d'utiliser directement le mot de passe utilisateur pour chiffrer chaque champ de la base de données (ce qui poserait un problème majeur en cas de changement de mot de passe), Idenva utilise un système de **chiffrement d'enveloppe à 3 niveaux** :

```text
               +----------------------------------+
               |   Mot de Passe Maître (Humain)   |
               +----------------------------------+
                                |
                                | + Sel Argon2id (16 bytes)
                                v
               +----------------------------------+
               |     KEK (Key Encryption Key)     |
               |     Dérivée à la volée en RAM    |
               +----------------------------------+
                                |
                                | Chiffre / Déchiffre (AES-256-GCM)
                                v
               +----------------------------------+
               |     DEK (Data Encryption Key)    |
               | Clé binaire 256 bits (Master Key) |
               +----------------------------------+
                                |
        +-----------------------+-----------------------+
        |                       |                       |
        v                       v                       v
[ Mots de passe ]       [ Secrets TOTP/2FA ]     [ Notes & Données ]
```

### 1. Master Password (Mot de passe maître)
C'est le mot de passe saisi par l'utilisateur. Il n'est stocké nulle part, ni sur disque, ni en variable globale.

### 2. KEK (Key Encryption Key - Clé de chiffrement de clé)
* C'est une clé temporaire binaire de 256 bits générée uniquement en mémoire au moment du déverrouillage.
* Elle est calculée en passant le mot de passe maître et un sel unique dans l'algorithme d'étirement de clé **Argon2id**.
* **Son rôle :** Protéger et déchiffrer la **DEK**.

### 3. DEK (Data Encryption Key — Clé de chiffrement des données)
* C'est une clé binaire de 256 bits générée aléatoirement lors de la toute première création du coffre-fort.
* **Son rôle :** C'est la véritable "clé maîtresse" qui chiffre et déchiffre l'ensemble de vos données (mots de passe, notes, numéros).
* La DEK reste stockée sur le disque sous forme **chiffrée par la KEK** (`dek_ciphertext`).


---

## 3. Fonctionnement Pas-à-Pas des Opérations

### A. Création du Coffre (Initialisation)
1. L'utilisateur définit son mot de passe maître.
2. Idenva génère un **Sel Argon2id** de 16 octets et un **Nonce AES-GCM** de 12 octets via un générateur aléatoire.
3. L'application calcule la **KEK** via Argon2id(MotDePasse, Sel).
4. Idenva génère une **DEK** complètement aléatoire de 32 octets.
5. La **DEK** est chiffrée avec la **KEK** en AES-256-GCM.
6. La base de données enregistre uniquement dans `vault_meta` :
   * Le sel Argon2id (`argon2_salt`)
   * Le nonce de la DEK (`dek_nonce`)
   * La DEK chiffrée (`dek_ciphertext`)

### B. Déverrouillage du Coffre
1. L'utilisateur entre son mot de passe.
2. Idenva lit `argon2_salt`, `dek_nonce` et `dek_ciphertext` depuis la base de données.
3. L'application dérive la **KEK candidate** avec le mot de passe entré et le sel.
4. L'application tente de déchiffrer `dek_ciphertext` avec la KEK candidate :
   * **Cas 1 : Le mot de passe est BON** -> AES-GCM valide le tag d'authentification. La DEK est déchiffrée et chargée dans le gestionnaire de session RAM (`VaultSessionStore`).
   * **Cas 2 : Le mot de passe est FAUX** -> AES-GCM échoue (erreur `InvalidTag`). Aucune donnée n'est chargée, l'accès est rejeté.

### C. Changement de Mot de Passe Maître
Grâce au chiffrement d'enveloppe, vous n'avez **pas besoin de re-chiffrer tous vos mots de passe** si vous changez votre mot de passe maître :
1. Idenva déchiffre la **DEK** avec l'ancien mot de passe maître.
2. Un nouveau sel Argon2id est généré, et une **nouvelle KEK** est calculée avec le nouveau mot de passe.
3. La **DEK** (qui reste la même) est re-chiffrée avec la **nouvelle KEK**.
4. La base de données met à jour la table `vault_meta`. Vos secrets en base restent inchangés et sécurisés.

---

## 4. Schéma et Chiffrement des Modèles (`models/`)

Pour permettre un affichage rapide de vos listes dans l'interface sans déchiffrer des données inutilement, Idenva sépare les métadonnées de recherche des secrets stricts :

| Modèle | Champs en Clair | Champs Chiffrés (AES-256-GCM) | Rôle & Justification |
| :--- | :--- | :--- | :--- |
| **`VaultMeta`** | `id`, `created_at` | `dek_ciphertext` *(Chiffré par KEK)* | métadonnées de l'instance unique du coffre-fort. |
| **`Account`** | `service_name`, `username`, `url`, `has_2fa` | `password_ciphertext`, `totp_ciphertext` | Permet de rechercher un compte sans exposer son mot de passe ou son secret 2FA. |
| **`Email`** | `address` *(si non sensible)* | `address_ciphertext` *(si marqué sensible)* | Mode hybride pour protéger la vie privée des emails personnels/alias. |
| **`Phone`** | *Aucun* | `number_ciphertext` | Masquage systématique pour prévenir la corrélation d'identité ou le SIM Swapping. |
| **`Note`** | `owner_type`, `owner_id` | `content_ciphertext` | Les notes confidentielles sont entièrement chiffrées par bloc. |

---

## 5. Sécurité en Mémoire RAM (`VaultSessionStore`)

Garder la clé de chiffrement (DEK) en mémoire présente un risque si la session reste ouverte indéfiniment. Idenva applique deux contre-mesures strictes :

1. **Auto-Verrouillage par Inactivité (`VAULT_SESSION_TIMEOUT`)**
   Chaque requête utilisateur réinitialise un minuteur (`touch()`). Si aucune activité n'est détectée pendant la durée configurée (ex: 15 minutes), la session expire et la DEK est purgée.

2. **Effacement Actif de la Mémoire (Zeroization / Zero-fill)**
   En Python, le Garbage Collector ne garantit pas la suppression immédiate des données de la RAM. Lors d'un verrouillage manuel ou automatique, Idenva exécute :
   ```python
   session.dek = b"\x00" * len(session.dek)
   ```

Cette ligne écrase physiquement les octets de la clé en mémoire avec des nuls (0x00) avant d'abandonner la référence à la session, empêchant ainsi la récupération de la clé via une analyse de la mémoire vive (RAM Dump).