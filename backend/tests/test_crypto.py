import pytest

from app.security.crypto import (
    DEK_LENGTH,
    DecryptionError,
    decrypt,
    encrypt,
    generate_dek)


def test_generate_dek_has_correct_length():
    dek = generate_dek()
    assert len(dek) == DEK_LENGTH


def test_generate_dek_is_random():
    dek1 = generate_dek()
    dek2 = generate_dek()
    assert dek1 != dek2


def test_encrypt_decrypt_roundtrip():
    key = generate_dek()
    plaintext = b"mon_super_mot_de_passe_github"

    nonce, ciphertext = encrypt(plaintext, key)
    decrypted = decrypt(nonce, ciphertext, key)

    assert decrypted == plaintext


def test_encrypt_produces_different_nonce_each_time():
    """Deux chiffrements du même texte avec la même clé doivent utiliser
    des nonces différents - condition de sécurité fondamentale d'AES-GCM."""
    key = generate_dek()
    plaintext = b"meme_texte"

    nonce1, _ = encrypt(plaintext, key)
    nonce2, _ = encrypt(plaintext, key)

    assert nonce1 != nonce2


def test_encrypt_output_does_not_contain_plaintext():
    key = generate_dek()
    plaintext = b"secret_lisible"
    _, ciphertext = encrypt(plaintext, key)
    assert plaintext not in ciphertext


def test_decrypt_fails_with_wrong_key():
    key = generate_dek()
    wrong_key = generate_dek()
    plaintext = b"donnee_sensible"

    nonce, ciphertext = encrypt(plaintext, key)

    with pytest.raises(DecryptionError):
        decrypt(nonce, ciphertext, wrong_key)


def test_decrypt_fails_with_corrupted_ciphertext():
    key = generate_dek()
    plaintext = b"donnee_sensible"

    nonce, ciphertext = encrypt(plaintext, key)
    corrupted = bytes([ciphertext[0] ^ 0xFF]) + ciphertext[1:]

    with pytest.raises(DecryptionError):
        decrypt(nonce, corrupted, key)


def test_decrypt_fails_with_wrong_nonce():
    key = generate_dek()
    plaintext = b"donnee_sensible"

    nonce, ciphertext = encrypt(plaintext, key)
    wrong_nonce = bytes([nonce[0] ^ 0xFF]) + nonce[1:]

    with pytest.raises(DecryptionError):
        decrypt(wrong_nonce, ciphertext, key)


def test_encrypt_rejects_wrong_key_length():
    with pytest.raises(ValueError):
        encrypt(b"data", key=b"trop_courte")


def test_decrypt_rejects_wrong_key_length():
    key = generate_dek()
    nonce, ciphertext = encrypt(b"data", key)
    with pytest.raises(ValueError):
        decrypt(nonce, ciphertext, key=b"trop_courte")