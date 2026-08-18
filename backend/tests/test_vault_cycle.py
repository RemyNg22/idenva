import pytest

from app.security.crypto import DecryptionError, decrypt, encrypt, generate_dek
from app.security.kdf import derive_key, generate_salt


def test_full_vault_cycle():
    """
    Simule le cycle complet : création du coffre fort, verrouillage,
    déverrouillage avec le bon mot de passe, accès au secret.
    """
    master_password = "miam-oui-baguette-strasbourg"

    # Création du vault
    salt = generate_salt()
    kek = derive_key(master_password, salt)
    dek = generate_dek()
    dek_nonce, dek_ciphertext = encrypt(dek, kek)

    account_password = b"mon_mot_de_passe_github_super_secret"
    pw_nonce, pw_ciphertext = encrypt(account_password, dek)

    # Simulation d'un redémarrage : plus rien en mémoire, juste ce qu'on aurait stocké en base (salt, dek_ciphertext+nonce, pw_ciphertext+nonce)

    # Déverrouillage avec le bon mot de passe
    kek_unlock = derive_key(master_password, salt)
    dek_unlock = decrypt(dek_nonce, dek_ciphertext, kek_unlock)
    assert dek_unlock == dek

    recovered_password = decrypt(pw_nonce, pw_ciphertext, dek_unlock)
    assert recovered_password == account_password


def test_full_vault_cycle_fails_with_wrong_master_password():
    master_password = "miam-oui-baguette-strasbourg"
    wrong_password = "wrong-password"

    salt = generate_salt()
    kek = derive_key(master_password, salt)
    dek = generate_dek()
    dek_nonce, dek_ciphertext = encrypt(dek, kek)

    kek_attempt = derive_key(wrong_password, salt)

    with pytest.raises(DecryptionError):
        decrypt(dek_nonce, dek_ciphertext, kek_attempt)


def test_change_master_password_keeps_dek_and_secrets_unchanged():
    """
    Vérifie le principe du changement de mot de passe maître :
    la DEK ne change pas, seule la façon de la déchiffrer change.
    """
    old_password = "ancien_mot_de_passe"
    new_password = "nouveau_mot_de_passe"

    old_salt = generate_salt()
    old_kek = derive_key(old_password, old_salt)
    dek = generate_dek()
    old_dek_nonce, old_dek_ciphertext = encrypt(dek, old_kek)

    account_password = b"secret_qui_ne_doit_pas_bouger"
    pw_nonce, pw_ciphertext = encrypt(account_password, dek)

    # Changement de mot de passe
    recovered_dek = decrypt(old_dek_nonce, old_dek_ciphertext, old_kek)
    new_salt = generate_salt()
    new_kek = derive_key(new_password, new_salt)
    new_dek_nonce, new_dek_ciphertext = encrypt(recovered_dek, new_kek)

    # Le secret existant doit rester lisible avec la DEK inchangée, sans avoir eu besoin de le rechiffrer
    kek_after_change = derive_key(new_password, new_salt)
    dek_after_change = decrypt(new_dek_nonce, new_dek_ciphertext, kek_after_change)
    assert dek_after_change == dek

    recovered_password = decrypt(pw_nonce, pw_ciphertext, dek_after_change)
    assert recovered_password == account_password