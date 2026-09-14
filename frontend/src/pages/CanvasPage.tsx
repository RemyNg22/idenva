import { useCallback, useEffect, useRef, useState } from "react";
import {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  ReactFlow,
  applyEdgeChanges,
  applyNodeChanges,
  type Edge,
  type Node,
  type OnEdgesChange,
  type OnNodeDrag,
  type OnNodesChange,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { api, type GraphEdge, type GraphNode } from "../services/api";
import "./CanvasPage.css";

const POSITION_SAVE_DEBOUNCE_MS = 500;

interface CanvasPageProps {
  onLock: () => void;
}

function toFlowNode(n: GraphNode): Node {
  return {
    id: n.id,
    position: { x: n.pos_x, y: n.pos_y },
    data: { label: `${n.entity_type}:${n.entity_id.slice(0, 8)}` },
    type: "default",
  };
}

function toFlowEdge(e: GraphEdge): Edge {
  return {
    id: e.id,
    source: e.source_node_id,
    target: e.target_node_id,
    label: e.label ?? e.relation_type,
  };
}

export function CanvasPage({ onLock }: CanvasPageProps) {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const saveTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  useEffect(() => {
    api
      .getGraph()
      .then((graph) => {
        setNodes(graph.nodes.map(toFlowNode));
        setEdges(graph.edges.map(toFlowEdge));
      })
      .catch(() => setError("Impossible de charger le canvas."))
      .finally(() => setLoading(false));
  }, []);

  const onNodesChange: OnNodesChange = useCallback(
    (changes) => setNodes((nds) => applyNodeChanges(changes, nds)),
    [],
  );

  const onEdgesChange: OnEdgesChange = useCallback(
    (changes) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    [],
  );

  const onNodeDragStop: OnNodeDrag = useCallback((_event, node) => {
    if (saveTimers.current[node.id]) {
      clearTimeout(saveTimers.current[node.id]);
    }
    saveTimers.current[node.id] = setTimeout(() => {
      api.updateNodePosition(node.id, node.position.x, node.position.y).catch(() => {
        setError("Échec de la sauvegarde de la position d'un nœud.");
      });
    }, POSITION_SAVE_DEBOUNCE_MS);
  }, []);

  async function handleLock() {
    try {
      await api.lockVault();
    } finally {
      onLock();
    }
  }

  return (
    <div className="canvas-page">
      <button className="canvas-page__lock-button" onClick={handleLock} title="Verrouiller le vault">
        🔒 Lock
      </button>

      {error && <div className="canvas-page__error">{error}</div>}

      {!loading && (
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeDragStop={onNodeDragStop}
          fitView
          minZoom={0.2}
          maxZoom={2}
          proOptions={{ hideAttribution: true }}
        >
          <Background variant={BackgroundVariant.Dots} gap={28} size={1} color="#2a2e3a" />
          <Controls showInteractive={false} />
          <MiniMap
            pannable
            zoomable
            maskColor="rgba(20, 22, 28, 0.7)"
            nodeColor="#5b8def"
            style={{ background: "#1c1f28", border: "1px solid #2a2e3a" }}
          />
        </ReactFlow>
      )}
    </div>
  );
}