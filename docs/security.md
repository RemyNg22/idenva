# Architecture & Modèle de Sécurité — Idenva

Ce document détaille l'architecture de sécurité d'Idenva, les mécanismes cryptographiques mis en oeuvre, la portée de la protection des données ainsi que les limites inhérentes au modèle de menace de l'application.

## 1. Périmètre de Protection des Données

Idenva applique un chiffrement sélectif au niveau des champs (*Field-Level Encryption*). La clé principale ne déchiffre que les données qualifiées de "secrets".

```text
+-----------------------------------------------------------------------+
|                           BASE DE DONNÉES                             |
|                                                                       |
|  [ DONNÉES EN CLAIR ]                 [ DONNÉES CHIFFRÉES (AES-GCM) ] |
|  - Identités (Noms, descriptions)     - Mots de passe                 |
|  - Services (Noms, URLs)              - Secrets TOTP (2FA)            |
|  - Identifiants (Usernames)           - Contenu des notes             |
|  - Noms de domaine, tags              - Numéros de téléphone          |
|  - Titres des tâches                  - E-mails marqués sensibles     |
+-----------------------------------------------------------------------+
```

### Synthèse du Périmètre

| **Catégorie de Donnée** | **Statut Cryptographique** | **Impact en cas de Fuite du Fichier .db** |
|---|---|---|
| **Secrets** *(Mots de passe, TOTP, Notes, Tel, Emails sensibles)* | **Chiffré** *(AES-256-GCM)* | Illisibles sans la clé maître. |
| **Métadonnées** *(Noms de services, usernames, tags, structures)* | **En clair** | La topologie de votre présence numérique reste analysable. |

> **Note d'Architecture :** Pour protéger l'intégralité du fichier de base de données (métadonnées incluses), un chiffrement au niveau du stockage constitue une couche complémentaire envisageable.

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
2. Une procédure d'écrasement binaire (remplacement par des zéros `0x00`) est exécutée sur la zone mémoire ciblée.


## 4. Modèle de Menace & Limites de Sécurité

Idenva est conçu pour contrer le vol ou l'analyse à froid (*offline attack*) du fichier de base de données. Cependant, certaines limites matérielles et logicielles s'imposent :

- **Infection de la machine hôte (*Malware / Keylogger*) :** Si un logiciel malveillant est actif sur le système d'exploitation pendant la session d'utilisation, il peut intercepter les frappes clavier ou analyser la mémoire RAM pour extraire la clé.
- **Perte du Mot de Passe Maître :** En l'absence de porte dérobée (*backdoor*) ou de mécanisme de récupération, la perte du mot de passe maître entraîne l'impossibilité définitive de déchiffrer les secrets.
- **Protection des Sauvegardes :** Les copies de sauvegarde du fichier `idenva.db` héritent exactement du même niveau de protection et des mêmes métadonnées en clair que le fichier original.

## 5. Spécifications Cryptographiques

L'application s'appuie sur des primitives et standards cryptographiques modernes et éprouvés :

- **KDF (Key Derivation Function) :** `Argon2id`
  - Paramétré pour résister aux attaques par matériel dédié (GPU / ASIC) et attaques par canaux auxiliaires.
- **Chiffrement Symétrique :** `AES-256-GCM` (Galois/Counter Mode)
  - Fournit un chiffrement authentifié (AEAD), garantissant à la fois la **confidentialité** des secrets et la **détection d'altérations** non autorisées des données.
