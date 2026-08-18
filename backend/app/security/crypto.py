import secrets

from cryptography.exceptions import InvalidTag
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

NONCE_LENGTH = 12
DEK_LENGTH = 32


class DecryptionError(Exception):
    # Volontairement générique : ne pas distinguer "mauvaise clé" de "données corrompues", pour ne rien donner à un attaquant.
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