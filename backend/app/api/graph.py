from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.auth import get_current_dek
from app.database import get_db
from app.models import Edge, Node
from app.schemas.graph import EdgeCreate, EdgeOut, GraphOut, NodeCreate, NodeOut, NodePositionUpdate

router = APIRouter(prefix="/api/graph", tags=["graph"], dependencies=[Depends(get_current_dek)])


@router.get("", response_model=GraphOut)
def get_graph(db: Session = Depends(get_db)):
    return GraphOut(nodes=db.query(Node).all(), edges=db.query(Edge).all())


@router.post("/nodes", response_model=NodeOut, status_code=201)
def create_node(payload: NodeCreate, db: Session = Depends(get_db)):
    node = Node(**payload.model_dump())
    db.add(node)
    db.commit()
    db.refresh(node)
    return node


@router.patch("/nodes/{node_id}", response_model=NodeOut)
def update_node_position(node_id: str, payload: NodePositionUpdate, db: Session = Depends(get_db)):
    node = db.get(Node, node_id)
    if node is None:
        raise HTTPException(status_code=404, detail="Nœud introuvable.")

    node.pos_x = payload.pos_x
    node.pos_y = payload.pos_y
    db.commit()
    db.refresh(node)
    return node


@router.delete("/nodes/{node_id}", status_code=204)
def delete_node(node_id: str, db: Session = Depends(get_db)):
    node = db.get(Node, node_id)
    if node is None:
        raise HTTPException(status_code=404, detail="Nœud introuvable.")

    db.query(Edge).filter(
        (Edge.source_node_id == node.id) | (Edge.target_node_id == node.id)
    ).delete(synchronize_session=False)
    db.delete(node)
    db.commit()


@router.post("/edges", response_model=EdgeOut, status_code=201)
def create_edge(payload: EdgeCreate, db: Session = Depends(get_db)):
    if db.get(Node, payload.source_node_id) is None or db.get(Node, payload.target_node_id) is None:
        raise HTTPException(status_code=404, detail="Nœud source ou cible introuvable.")

    edge = Edge(**payload.model_dump())
    db.add(edge)
    db.commit()
    db.refresh(edge)
    return edge


@router.delete("/edges/{edge_id}", status_code=204)
def delete_edge(edge_id: str, db: Session = Depends(get_db)):
    edge = db.get(Edge, edge_id)
    if edge is None:
        raise HTTPException(status_code=404, detail="Arête introuvable.")
    db.delete(edge)
    db.commit()