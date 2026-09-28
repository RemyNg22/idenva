import secrets

from cryptography.exceptions import InvalidTag
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

from app.security.kdf import derive_key, generate_salt

NONCE_LENGTH = 12
DEK_LENGTH = 32


class DecryptionError(Exception):
    pass


def generate_dek():
    return secrets.token_bytes(DEK_LENGTH)


def encrypt(plaintext: bytes, key: bytes):
    if len(key) != DEK_LENGTH:
        raise ValueError(f"La clé doit faire {DEK_LENGTH} bytes, reçu {len(key)}.")

    nonce = secrets.token_bytes(NONCE_LENGTH)  # jamais réutilisé avec la même clé
    ciphertext = AESGCM(key).encrypt(nonce, plaintext, associated_data=None)
    return nonce, ciphertext


def decrypt(nonce: bytes, ciphertext: bytes, key: bytes):
    if len(key) != DEK_LENGTH:
        raise ValueError(f"La clé doit faire {DEK_LENGTH} bytes, reçu {len(key)}.")

    try:
        return AESGCM(key).decrypt(nonce, ciphertext, associated_data=None)
    except InvalidTag as exc:
        raise DecryptionError("Échec du déchiffrement : clé incorrecte ou données corrompues.") from exc



def rewrap_dek(current_dek: bytes, new_password: str) -> tuple[bytes, bytes, bytes]:
    """
    Génère un nouveau sel, dérive la nouvelle Master Key via Argon2id
    et rechiffre la DEK existante en AES-256-GCM.
    """
    new_salt = generate_salt()
    new_master_key = derive_key(new_password, new_salt)
    new_nonce, new_encrypted_dek = encrypt(current_dek, new_master_key)
    
    return new_salt, new_nonce, new_encrypted_dek


def verify_master_password(password: str, salt: bytes, nonce: bytes, encrypted_dek: bytes) -> bytes:
    """
    Vérifie le mot de passe maître en tentant de déchiffrer la DEK.
    Lève DecryptionError si le mot de passe est incorrect.
    """
    master_key = derive_key(password, salt)
    return decrypt(nonce, encrypted_dek, master_key)