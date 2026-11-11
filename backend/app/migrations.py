"""migration SQLite : ajoute emails/phones/domains.account_id aux bases
existantes (create_all ne modifie jamais une table déjà créée)."""
from sqlalchemy import Engine

TABLES = ("emails", "phones", "domains")


def add_account_scope(engine: Engine) -> None:
    with engine.begin() as conn:
        for table in TABLES:
            cols = {row[1] for row in conn.exec_driver_sql(f"PRAGMA table_info({table})")}
            if not cols or "account_id" in cols:
                continue 

            conn.exec_driver_sql(f"ALTER TABLE {table} ADD COLUMN account_id VARCHAR REFERENCES accounts(id)")

            # Données existantes : rattacher chaque ligne à un compte, sans rien supprimer.
            # 1) emails : au compte qui la référence déjà via accounts.email_id
            if table == "emails":
                conn.exec_driver_sql(
                    "UPDATE emails SET account_id = "
                    "(SELECT a.id FROM accounts a WHERE a.email_id = emails.id LIMIT 1) "
                    "WHERE account_id IS NULL"
                )
            # 2) sinon : au plus ancien compte de la même identité (choix par défaut, modifiable ensuite)
            conn.exec_driver_sql(
                f"UPDATE {table} SET account_id = "
                f"(SELECT a.id FROM accounts a WHERE a.identity_id = {table}.identity_id "
                f"ORDER BY a.created_at LIMIT 1) WHERE account_id IS NULL"
            )