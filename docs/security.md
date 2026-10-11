# Architecture & Modèle de Sécurité — Idenva

# Security & Cryptographic Architecture — Idenva

This document details Idenva's security architecture, the cryptographic mechanisms in place, the actual scope of data protection, and the threat model's inherent limits.

## 1. Data Protection Scope

Idenva applies selective field-level encryption. The master key only decrypts data classified as "secrets".

```text
+-----------------------------------------------------------------------+
|                              DATABASE                                 |
|                                                                       |
|  [ PLAINTEXT DATA ]                   [ ENCRYPTED DATA (AES-GCM) ]    |
|  - Identities (names, descriptions)   - Passwords                     |
|  - Services (names, URLs)             - Note content                  |
|  - Usernames                          - Phone numbers                 |
|  - Domain names, tags                 - Generic credentials           |
|  - Tasks                                (API keys, etc.)              |
|  - Emails                                                              |
+-----------------------------------------------------------------------+
```

### Scope Summary

| **Data Category** | **Cryptographic Status** | **Impact if the .db File Leaks** |
|---|---|---|
| **Secrets** *(Passwords, Notes, Phone numbers, Generic credentials)* | **Encrypted** *(AES-256-GCM)* | Unreadable without the master key. |
| **Metadata** *(Identities, services, usernames, emails, domains, tags, tasks)* | **Plaintext** | The topology of your digital presence remains analyzable. |

> **Architecture note:** The database model and API technically support marking an individual email as "sensitive" to encrypt it, but nothing in the current application ever sets that flag — in practice, every email is always stored in plaintext today, the same as a username. Encrypting the storage file as a whole (metadata included) would be an additional protection layer, not currently implemented.

## 2. Encryption Model & Key Management

Idenva uses a two-level key hierarchy (envelope encryption). The master password is **never stored** on disk, neither as plaintext nor as a traditional hash.

### Unlock Flow

```text
Master Password + Salt
              │
              ▼
    [ Argon2id (KDF) ]
              │
              ▼
   Vault Key (Master Key)
              │
              ▼ (Decrypts)
+------------------------------------+
|  Encrypted Data Key (On-Disk)      |
+------------------------------------+
              │
              ▼
   Data Key (DEK) ────────────► [ Encrypts / Decrypts Secrets ]
 (Stored only in RAM)
```

### Derivation and Envelope Mechanism

1. **Vault creation:** a random key is generated — the **Data Encryption Key** (DEK). This is the key that actually encrypts your secrets.
2. **Password derivation:** the master password goes through **Argon2id** to produce the **Vault Key** (Master Key).
3. **Envelope encryption:** the Vault Key encrypts the Data Key. Only the encrypted version of the Data Key is saved in the SQLite file.
4. **Password validation:** the master password's correctness is validated by the Data Key's decryption succeeding. No separate verification hash is kept.

### Changing the Master Password

When changing the master password, only the **Data Key** is re-encrypted with the new Vault Key. All secrets in the database do not need to be re-encrypted, making this an instant, atomic operation.

### Reset and Lost Master Password

There is no recovery mechanism. Two reset paths exist, and both wipe the vault completely (identities, accounts, notes, tasks, tags, the encrypted Data Key) and return the app to its first-launch state:

- **Vault unlocked:** the reset requires the master password to be typed again and to correctly decrypt the Data Key. An open session alone is not enough.
- **Password forgotten ("Forgot password?" on the unlock screen):** only available while the vault is locked, and only from the local machine (`127.0.0.1`). It requires typing a confirmation word. No password is asked, because there is none to give. It deletes data; it never reveals any.

Consequences to be aware of:

- Anyone with access to your session can wipe the vault without the password. This is a loss-of-availability risk, not a confidentiality risk, and it is not new: the same person could already delete the data folder.
- Backup files in the `backups/` folder are **not** deleted by a reset. They are encrypted with their own export password, which is independent of the master password, so they remain usable if you remember that export password.
- Deleting rows does not securely erase the SQLite file: freed pages may still contain old data until they are overwritten. Encrypted secrets stay unreadable without the key, but plaintext metadata (names, usernames, emails, domains, tags, tasks) may remain recoverable from the file with forensic tools.

## 3. Key Lifecycle in RAM

For as long as the vault is unlocked, the Data Key (DEK) lives exclusively in RAM.

```text
   +--------------------+
   |   Vault Unlocked   | ─── Data Key active in RAM
   +--------------------+
             │
     ┌───────┴───────┐
     │    Triggers   │
     └───────┬───────┘
             ├─────────────────► User action ("Lock")
             │
             └─────────────────► Inactivity (configurable timeout, e.g. 15 min)
             │
             ▼
   +--------------------+
   | RAM Overwrite      | ─── Explicitly replaced with 0x00
   +--------------------+
             │
             ▼
   +--------------------+
   |    Vault Locked    | ─── Key removed from memory
   +--------------------+
```

### Locking & Memory Cleanup

On every lock (manual or on inactivity timeout):

1. The Data Key is removed from active memory.
2. A binary overwrite procedure (replacement with `0x00` zeros) is run on the targeted memory region. This is best effort: Python does not guarantee that every copy of the key is erased from memory (immutable `bytes` objects, copies made by the runtime or the OS, swap files).

## 4. Threat Model & Security Limits

Idenva is designed to resist theft or offline analysis of the database file. However, some hardware and software limits apply:

- **Host machine infection (Malware / Keylogger):** if malicious software is active on the OS during a session, it can intercept keystrokes or analyze RAM to extract the key.
- **Lost master password:** with no backdoor or recovery mechanism, losing the master password makes decrypting the secrets permanently impossible. The only way forward is a full reset (see section 2), which erases the vault.
- **Backup protection:** copies of the `idenva.db` file inherit exactly the same level of protection, and the same plaintext metadata, as the original file. Backups created by the app are different: they are exports encrypted with a separate export password.
- **Unencrypted emails:** if you use an alias or address you consider sensitive, keep in mind it remains readable in plaintext in the database file.

## 5. Cryptographic Specifications

The application relies on modern, proven cryptographic primitives and standards:

- **KDF (Key Derivation Function):** `Argon2id`
  - Tuned to resist dedicated-hardware attacks (GPU / ASIC) and side-channel attacks.
- **Symmetric Encryption:** `AES-256-GCM` (Galois/Counter Mode)
  - Provides authenticated encryption (AEAD), guaranteeing both the **confidentiality** of secrets and the **detection of unauthorized alteration** of data.

---

Ce document détaille l'architecture de sécurité d'Idenva, les mécanismes cryptographiques mis en oeuvre, la portée de la protection des données ainsi que les limites inhérentes au modèle de menace de l'application.

## 1. Périmètre de Protection des Données

Idenva applique un chiffrement sélectif au niveau des champs (*Field-Level Encryption*). La clé principale ne déchiffre que les données qualifiées de "secrets".

```text
+-----------------------------------------------------------------------+
|                           BASE DE DONNÉES                             |
|                                                                       |
|  [ DONNÉES EN CLAIR ]                 [ DONNÉES CHIFFRÉES (AES-GCM) ] |
|  - Identités (Noms, descriptions)     - Mots de passe                 |
|  - Services (Noms, URLs)              - Contenu des notes             |
|  - Identifiants (Usernames)           - Numéros de téléphone          |
|  - Noms de domaine, tags              - Credentials génériques        |
|  - Tâches                               (clés API, etc.)              |
|  - E-mails                                                            |
+-----------------------------------------------------------------------+
```

### Synthèse du Périmètre

| **Catégorie de Donnée** | **Statut Cryptographique** | **Impact en cas de Fuite du Fichier .db** |
|---|---|---|
| **Secrets** *(Mots de passe, Notes, Téléphone, Credentials génériques)* | **Chiffré** *(AES-256-GCM)* | Illisibles sans la clé maître. |
| **Métadonnées** *(Identités, services, usernames, emails, domaines, tags, tâches)* | **En clair** | La topologie de votre présence numérique reste analysable. |

> **Note d'Architecture :** Les emails ne sont pas chiffrés dans la version actuelle — ils sont traités comme une métadonnée, au même titre qu'un username. Pour protéger l'intégralité du fichier de base de données (métadonnées incluses), un chiffrement au niveau du stockage constitue une couche complémentaire envisageable.

## 2. Modèle de Chiffrement & Gestion des Clés

Idenva s'appuie sur une hiérarchie de clés à deux niveaux (*Envelope Encryption*). Le mot de passe maître n'est **jamais stocké** sur le disque, ni sous forme de texte brut, ni sous forme de hash traditionnel.

### Schéma du Flux de Déverrouillage

```text
Mot de Passe Maître + Sel (Salt)
              │
              ▼
    [ Argon2id (KDF) ]
              │
              ▼
   Clé du Coffre (Master Key)
              │
              ▼ (Déchiffre)
+------------------------------------+
|  Clé des Données Chiffrée (On-Disk)|
+------------------------------------+
              │
              ▼
   Clé des Données (DEK) ────────────► [ Chiffre / Déchiffre les Secrets ]
 (Stockée uniquement en RAM)
```

### Mécanisme de Dérivation et d'Enveloppe

1. **Création du coffre :** Une clé aléatoire est générée : la **Clé des Données** (*Data Encryption Key - DEK*). C'est cette clé qui chiffre effectivement vos secrets.
2. **Dérivation du mot de passe :** Le mot de passe maître passe par la fonction de dérivation **Argon2id** pour produire la **Clé du Coffre** (*Master Key*).
3. **Chiffrement d'enveloppe :** La Clé du Coffre chiffre la Clé des Données. Seule la version chiffrée de la Clé des Données est sauvegardée dans le fichier SQLite.
4. **Validation de l'authentification :** L'exactitude du mot de passe maître est validée par le succès du déchiffrement de la Clé des Données. Aucun hash de contrôle dédié n'est conservé.

### Changement du Mot de Passe Maître

Lors du changement du mot de passe maître, seule la **Clé des Données** est rechiffrée avec la nouvelle Clé du Coffre. L'ensemble des secrets de la base de données n'a pas besoin d'être réencrypté, garantissant une opération instantanée et atomique.

### Réinitialisation et Mot de Passe Maître Perdu

Il n'existe aucun mécanisme de récupération. Deux chemins de réinitialisation existent, et les deux effacent entièrement le coffre (identités, comptes, notes, tâches, tags, Clé des Données chiffrée) pour revenir à l'état du premier lancement :

- **Coffre déverrouillé :** la réinitialisation exige de retaper le mot de passe maître, qui doit déchiffrer correctement la Clé des Données. Une session ouverte ne suffit pas.
- **Mot de passe oublié (« Mot de passe oublié ? » sur l'écran de déverrouillage) :** disponible uniquement quand le coffre est verrouillé, et uniquement depuis la machine locale (`127.0.0.1`). Elle exige de taper un mot de confirmation. Aucun mot de passe n'est demandé, puisqu'il n'est plus connu. Elle supprime des données, elle n'en révèle aucune.

Conséquences à connaître :

- Toute personne qui a accès à votre session peut effacer le coffre sans le mot de passe. C'est un risque de perte de disponibilité, pas de confidentialité, et il n'est pas nouveau : cette personne pouvait déjà supprimer le dossier de données.
- Les fichiers du dossier `backups/` ne sont **pas** supprimés par une réinitialisation. Ils sont chiffrés avec leur propre mot de passe d'export, indépendant du mot de passe maître : ils restent utilisables si vous vous souvenez de ce mot de passe d'export.
- Supprimer des lignes n'efface pas le fichier SQLite de façon sécurisée : des pages libérées peuvent contenir d'anciennes données tant qu'elles ne sont pas écrasées. Les secrets chiffrés restent illisibles sans la clé, mais les métadonnées en clair (noms, usernames, emails, domaines, tags, tâches) peuvent rester récupérables dans le fichier avec des outils d'analyse forensique.

## 3. Cycle de Vie de la Clé en Mémoire Vive (RAM)

Pendant toute la durée où le coffre est déverrouillé, la Clé des Données (*DEK*) réside exclusivement en mémoire vive (RAM).

```text
   +--------------------+
   | Coffre Déverrouillé| ─── Clé des Données active en RAM
   +--------------------+
             │
     ┌───────┴───────┐
     │  Déclencheurs │
     └───────┬───────┘
             ├─────────────────► Action Utilisateur ("Verrouiller")
             │
             └─────────────────► Inactivité (Timeout configurable, ex: 15 min dans notre cas)
             │
             ▼
   +--------------------+
   | Écrasement RAM     | ─── Remplacement explicite par des 0x00
   +--------------------+
             │
             ▼
   +--------------------+
   |   Coffre Verrouillé| ─── Clé supprimée de la mémoire
   +--------------------+
```

### Verrouillage & Nettoyage Mémoire

Lors d'un verrouillage (manuel ou sur expiration du délai d'inactivité) :

1. La Clé des Données est supprimée de la mémoire active.
2. Une procédure d'écrasement binaire (remplacement par des zéros `0x00`) est exécutée sur la zone mémoire ciblée. Il s'agit d'un effort au mieux : Python ne garantit pas que toutes les copies de la clé soient effacées de la mémoire (objets `bytes` immuables, copies faites par le runtime ou l'OS, fichiers d'échange).

## 4. Modèle de Menace & Limites de Sécurité

Idenva est conçu pour contrer le vol ou l'analyse à froid (*offline attack*) du fichier de base de données. Cependant, certaines limites matérielles et logicielles s'imposent :

- **Infection de la machine hôte (*Malware / Keylogger*) :** Si un logiciel malveillant est actif sur le système d'exploitation pendant la session d'utilisation, il peut intercepter les frappes clavier ou analyser la mémoire RAM pour extraire la clé.
- **Perte du Mot de Passe Maître :** En l'absence de porte dérobée (*backdoor*) ou de mécanisme de récupération, la perte du mot de passe maître entraîne l'impossibilité définitive de déchiffrer les secrets. La seule issue est une réinitialisation complète (voir section 2), qui efface le coffre.
- **Protection des Sauvegardes :** Les copies de sauvegarde du fichier `idenva.db` héritent exactement du même niveau de protection et des mêmes métadonnées en clair que le fichier original. Les sauvegardes créées par l'application sont différentes : ce sont des exports chiffrés avec un mot de passe d'export distinct.
- **Emails non chiffrés :** Si vous utilisez un alias ou une adresse que vous considèrez sensible, gardez en tête qu'elle reste lisible en clair dans le fichier de base de données.

## 5. Spécifications Cryptographiques

L'application s'appuie sur des primitives et standards cryptographiques modernes et éprouvés :

- **KDF (Key Derivation Function) :** `Argon2id`
  - Paramétré pour résister aux attaques par matériel dédié (GPU / ASIC) et attaques par canaux auxiliaires.
- **Chiffrement Symétrique :** `AES-256-GCM` (Galois/Counter Mode)
  - Fournit un chiffrement authentifié (AEAD), garantissant à la fois la **confidentialité** des secrets et la **détection d'altérations** non autorisées des données.