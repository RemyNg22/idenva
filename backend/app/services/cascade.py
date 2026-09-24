from sqlalchemy.orm import Session

from app.models import Account, Credential, Edge, Node, Note, Task


def delete_node_and_edges(db: Session, entity_type: str, entity_id: str) -> None:
    """Supprime le noeud de canvas représentant une entité, ainsi que
    toutes les arêtes qui le touchent. """
    node = db.query(Node).filter_by(entity_type=entity_type, entity_id=entity_id).first()
    if node is None:
        return
    db.query(Edge).filter(
        (Edge.source_node_id == node.id) | (Edge.target_node_id == node.id)
    ).delete(synchronize_session=False)
    db.delete(node)


def delete_account_cascade(db: Session, account: Account) -> None:
    """Supprime un compte et tout ce qui lui appartient"""
    db.query(Note).filter_by(owner_type="account", owner_id=account.id).delete(synchronize_session=False)
    db.query(Credential).filter_by(owner_type="account", owner_id=account.id).delete(synchronize_session=False)
    db.query(Task).filter_by(related_type="account", related_id=account.id).delete(synchronize_session=False)
    delete_node_and_edges(db, "account", account.id)
    db.delete(account)