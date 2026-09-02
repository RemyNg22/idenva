import { useCallback, useState } from "react";
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
  type OnNodesChange,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { api } from "../services/api";
import "./CanvasPage.css";

const initialNodes: Node[] = [];
const initialEdges: Edge[] = [];

interface CanvasPageProps {
  onLock: () => void;
}

export function CanvasPage({ onLock }: CanvasPageProps) {
  const [nodes, setNodes] = useState<Node[]>(initialNodes);
  const [edges, setEdges] = useState<Edge[]>(initialEdges);

  const onNodesChange: OnNodesChange = useCallback(
    (changes) => setNodes((nds) => applyNodeChanges(changes, nds)),
    [],
  );

  const onEdgesChange: OnEdgesChange = useCallback(
    (changes) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    [],
  );

  async function handleLock() {
    try {
      await api.lockVault();
    } finally {
      onLock();
    }
  }

  return (
    <div className="canvas-page">
      <button className="canvas-page__lock-button" onClick={handleLock} title="Verrouiller le coffre-fort">
        Verrouiller le coffre-fort 🔒
      </button>

      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        fitView
        minZoom={0.2}
        maxZoom={2}
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Dots} gap={28} size={1} color="#284394" />
        <Controls showInteractive={false} />
        <MiniMap
          pannable
          zoomable
          maskColor="rgba(20, 22, 28, 0.7)"
          nodeColor="#5b8def"
          style={{ background: "#1c1f28", border: "1px solid #2a2e3a" }}
        />
      </ReactFlow>
    </div>
  );
}