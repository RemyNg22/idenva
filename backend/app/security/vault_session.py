import secrets
from datetime import datetime, timedelta, timezone

from app.config import settings

VAULT_SESSION_TIMEOUT = timedelta(minutes=settings.vault_session_timeout_minutes)


class VaultLockedError(Exception):
    pass


class _Session:
    def __init__(self, dek: bytes):
        self.dek = dek
        self.last_activity = datetime.now(timezone.utc)

    def is_expired(self) -> bool:
        return datetime.now(timezone.utc) - self.last_activity > VAULT_SESSION_TIMEOUT

    def touch(self) -> None:
        self.last_activity = datetime.now(timezone.utc)


class VaultSessionStore:
    """
    Garde la DEK en mémoire process, jamais sur disque, associée à un
    token de session. Une seule instance vit pour toute la durée du
    process FastAPI (voir dépendance get_vault_session dans api/auth.py)
    """

    def __init__(self):
        self._sessions: dict[str, _Session] = {}

    def create(self, dek: bytes) -> str:
        token = secrets.token_urlsafe(32)
        self._sessions[token] = _Session(dek)
        return token

    def get_dek(self, token: str | None) -> bytes:
        if token is None or token not in self._sessions:
            raise VaultLockedError("Vault verrouillé ou session invalide.")

        session = self._sessions[token]
        if session.is_expired():
            del self._sessions[token]
            raise VaultLockedError("Session expirée, vault verrouillé.")

        session.touch()
        return session.dek

    def is_unlocked(self, token: str | None) -> bool:
        try:
            self.get_dek(token)
            return True
        except VaultLockedError:
            return False

    def lock(self, token: str | None) -> None:
        if token and token in self._sessions:
            """
            écrasement du buffer avant suppression
            """
            session = self._sessions.pop(token)
            session.dek = b"\x00" * len(session.dek)


vault_session_store = VaultSessionStore()