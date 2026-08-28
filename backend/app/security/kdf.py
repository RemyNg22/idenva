import secrets

from argon2.low_level import Type, hash_secret_raw


ARGON2_TIME_COST = 3
ARGON2_MEMORY_COST = 65536  # 64 Mo de ram par tentative de dévérouillage
ARGON2_PARALLELISM = 4 # utilise 4 coeurs du processeur en parallèle
KEY_LENGTH = 32  # 256 bits requis pour AES-256
SALT_LENGTH = 16


def generate_salt():
    return secrets.token_bytes(SALT_LENGTH)


def derive_key(password: str, salt: bytes):
    if not password:
        raise ValueError("Le mot de passe ne peut pas être vide.")

    return hash_secret_raw(
        secret=password.encode("utf-8"),
        salt=salt,
        time_cost=ARGON2_TIME_COST,
        memory_cost=ARGON2_MEMORY_COST,
        parallelism=ARGON2_PARALLELISM,
        hash_len=KEY_LENGTH,
        type=Type.ID)  # Argon2id