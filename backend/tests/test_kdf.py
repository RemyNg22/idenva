from app.security.kdf import KEY_LENGTH, SALT_LENGTH, derive_key, generate_salt


def test_generate_salt_has_correct_length():
    salt = generate_salt()
    assert len(salt) == SALT_LENGTH


def test_generate_salt_is_random():
    salt1 = generate_salt()
    salt2 = generate_salt()
    assert salt1 != salt2


def test_derive_key_is_deterministic():
    """Même mot de passe + même sel => toujours la même clé."""
    salt = generate_salt()
    key1 = derive_key("mon_mot_de_passe_maitre", salt)
    key2 = derive_key("mon_mot_de_passe_maitre", salt)
    assert key1 == key2


def test_derive_key_has_correct_length():
    salt = generate_salt()
    key = derive_key("mon_mot_de_passe_maitre", salt)
    assert len(key) == KEY_LENGTH


def test_different_passwords_produce_different_keys():
    salt = generate_salt()
    key1 = derive_key("mot_de_passe_A", salt)
    key2 = derive_key("mot_de_passe_B", salt)
    assert key1 != key2


def test_different_salts_produce_different_keys():
    """Le même mot de passe avec deux sels différents doit donner deux clés différentes."""
    key1 = derive_key("mon_mot_de_passe_maitre", generate_salt())
    key2 = derive_key("mon_mot_de_passe_maitre", generate_salt())
    assert key1 != key2


def test_derive_key_rejects_empty_password():
    import pytest

    with pytest.raises(ValueError):
        derive_key("", generate_salt())