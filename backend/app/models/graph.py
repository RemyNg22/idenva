import uuid

from sqlalchemy import JSON, Float, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class Node(Base):
    """Représentation visuelle d'une entité sur le canvas. Une entité a un sens sur le canva grâce à un Node"""

    __tablename__ = "nodes"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    entity_type: Mapped[str] = mapped_column(String, nullable=False)
    entity_id: Mapped[str] = mapped_column(String, nullable=False)

    pos_x: Mapped[float] = mapped_column(Float, default=0.0)
    pos_y: Mapped[float] = mapped_column(Float, default=0.0)
    width: Mapped[float | None] = mapped_column(Float, nullable=True)
    height: Mapped[float | None] = mapped_column(Float, nullable=True)
    visual_state: Mapped[dict | None] = mapped_column(JSON, nullable=True)

    def __repr__(self) -> str:
        return f"<Node id={self.id} entity_type={self.entity_type!r}>"


class Edge(Base):
    __tablename__ = "edges"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    source_node_id: Mapped[str] = mapped_column(ForeignKey("nodes.id"), nullable=False)
    target_node_id: Mapped[str] = mapped_column(ForeignKey("nodes.id"), nullable=False)
    relation_type: Mapped[str] = mapped_column(String, nullable=False)
    label: Mapped[str | None] = mapped_column(String, nullable=True)

    def __repr__(self) -> str:
        return f"<Edge {self.source_node_id} -{self.relation_type}-> {self.target_node_id}>"