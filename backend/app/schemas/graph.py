from pydantic import BaseModel, ConfigDict


class NodeCreate(BaseModel):
    entity_type: str
    entity_id: str
    pos_x: float = 0.0
    pos_y: float = 0.0
    width: float | None = None
    height: float | None = None
    visual_state: dict | None = None


class NodePositionUpdate(BaseModel):
    pos_x: float
    pos_y: float


class NodeOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    entity_type: str
    entity_id: str
    pos_x: float
    pos_y: float
    width: float | None
    height: float | None
    visual_state: dict | None


class EdgeCreate(BaseModel):
    source_node_id: str
    target_node_id: str
    relation_type: str
    label: str | None = None


class EdgeOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    source_node_id: str
    target_node_id: str
    relation_type: str
    label: str | None


class GraphOut(BaseModel):
    nodes: list[NodeOut]
    edges: list[EdgeOut]