import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { api, type Account, type Identity } from "../services/api";
import { IdentityNode, type IdentityNodeData } from "../nodes/IdentityNode";
import { AccountNode, type AccountNodeData } from "../nodes/AccountNode";
import { IdentityPanel } from "../panels/IdentityPanel";
import { AccountPanel } from "../panels/AccountPanel";
import "./CanvasPage.css";

const POSITION_SAVE_DEBOUNCE_MS = 500;

const nodeTypes = { identity: IdentityNode, account: AccountNode };

interface CanvasPageProps {
  onLock: () => void;
}

type EntityNodeIndex = Record<string, string>;

export function CanvasPage({ onLock }: CanvasPageProps) {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [identitiesById, setIdentitiesById] = useState<Record<string, Identity>>({});
  const [accountsById, setAccountsById] = useState<Record<string, Account>>({});
  const [identityNodeByEntityId, setIdentityNodeByEntityId] = useState<EntityNodeIndex>({});
  const [accountNodeByEntityId, setAccountNodeByEntityId] = useState<EntityNodeIndex>({});
  const [selected, setSelected] = useState<{ type: "identity" | "account"; entityId: string } | null>(null);
  const [newIdentityName, setNewIdentityName] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const saveTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  useEffect(() => {
    Promise.all([api.getGraph(), api.listIdentities(), api.listAccounts()])
      .then(([graph, identities, accounts]) => {
        const identitiesMap = Object.fromEntries(identities.map((i) => [i.id, i]));
        const accountsMap = Object.fromEntries(accounts.map((a) => [a.id, a]));
        const accountCountByIdentity: Record<string, number> = {};
        accounts.forEach((a) => {
          accountCountByIdentity[a.identity_id] = (accountCountByIdentity[a.identity_id] ?? 0) + 1;
        });

        const identityNodeIndex: EntityNodeIndex = {};
        const accountNodeIndex: EntityNodeIndex = {};

        const flowNodes: Node[] = graph.nodes.map((n) => {
          if (n.entity_type === "identity") {
            identityNodeIndex[n.entity_id] = n.id;
            const identity = identitiesMap[n.entity_id];
            const data: IdentityNodeData = {
              label: identity?.name ?? "?",
              accountCount: accountCountByIdentity[n.entity_id] ?? 0,
            };
            return { id: n.id, type: "identity", position: { x: n.pos_x, y: n.pos_y }, data };
          }
          accountNodeIndex[n.entity_id] = n.id;
          const account = accountsMap[n.entity_id];
          const data: AccountNodeData = {
            label: account?.service_name ?? "?",
            hasPassword: account?.has_password ?? false,
            has2fa: account?.has_2fa ?? false,
          };
          return { id: n.id, type: "account", position: { x: n.pos_x, y: n.pos_y }, data };
        });

        setIdentitiesById(identitiesMap);
        setAccountsById(accountsMap);
        setIdentityNodeByEntityId(identityNodeIndex);
        setAccountNodeByEntityId(accountNodeIndex);
        setNodes(flowNodes);
        setEdges(
          graph.edges.map((e) => ({
            id: e.id,
            source: e.source_node_id,
            target: e.target_node_id,
            label: e.label ?? e.relation_type,
          })),
        );
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
    if (saveTimers.current[node.id]) clearTimeout(saveTimers.current[node.id]);
    saveTimers.current[node.id] = setTimeout(() => {
      api.updateNodePosition(node.id, node.position.x, node.position.y).catch(() => {
        setError("Échec de la sauvegarde de la position d'un nœud.");
      });
    }, POSITION_SAVE_DEBOUNCE_MS);
  }, []);

  const onNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      if (node.type === "identity") {
        const entityId = Object.entries(identityNodeByEntityId).find(([, nodeId]) => nodeId === node.id)?.[0];
        if (entityId) setSelected({ type: "identity", entityId });
      } else if (node.type === "account") {
        const entityId = Object.entries(accountNodeByEntityId).find(([, nodeId]) => nodeId === node.id)?.[0];
        if (entityId) setSelected({ type: "account", entityId });
      }
    },
    [identityNodeByEntityId, accountNodeByEntityId],
  );

  async function handleCreateIdentity(e: React.FormEvent) {
    e.preventDefault();
    if (!newIdentityName.trim()) return;
    try {
      const identity = await api.createIdentity(newIdentityName.trim());
      const posX = 100 + Math.random() * 400;
      const posY = 100 + Math.random() * 300;
      const graphNode = await api.createGraphNode("identity", identity.id, posX, posY);

      setIdentitiesById((prev) => ({ ...prev, [identity.id]: identity }));
      setIdentityNodeByEntityId((prev) => ({ ...prev, [identity.id]: graphNode.id }));
      setNodes((prev) => [
        ...prev,
        {
          id: graphNode.id,
          type: "identity",
          position: { x: posX, y: posY },
          data: { label: identity.name, accountCount: 0 } as IdentityNodeData,
        },
      ]);
      setNewIdentityName("");
    } catch {
      setError("Échec de la création de l'identité.");
    }
  }

  function handleAccountCreated(account: Account) {
    const identityNodeId = identityNodeByEntityId[account.identity_id];
    const identityFlowNode = nodes.find((n) => n.id === identityNodeId);
    const posX = (identityFlowNode?.position.x ?? 200) + 220;
    const posY = (identityFlowNode?.position.y ?? 200) + 40;

    api.createGraphNode("account", account.id, posX, posY).then(async (graphNode) => {
      setAccountsById((prev) => ({ ...prev, [account.id]: account }));
      setAccountNodeByEntityId((prev) => ({ ...prev, [account.id]: graphNode.id }));
      setNodes((prev) => [
        ...prev,
        {
          id: graphNode.id,
          type: "account",
          position: { x: posX, y: posY },
          data: {
            label: account.service_name,
            hasPassword: account.has_password,
            has2fa: account.has_2fa,
          } as AccountNodeData,
        },
      ]);

      if (identityNodeId) {
        const edge = await api.createGraphEdge(identityNodeId, graphNode.id, "CONTIENT");
        setEdges((prev) => [...prev, { id: edge.id, source: identityNodeId, target: graphNode.id, label: "CONTIENT" }]);
      }

      setNodes((prev) =>
        prev.map((n) =>
          n.id === identityNodeId
            ? { ...n, data: { ...(n.data as IdentityNodeData), accountCount: (n.data as IdentityNodeData).accountCount + 1 } }
            : n,
        ),
      );
    });
  }

  function handleIdentityUpdated(identity: Identity) {
    setIdentitiesById((prev) => ({ ...prev, [identity.id]: identity }));
    const nodeId = identityNodeByEntityId[identity.id];
    setNodes((prev) =>
      prev.map((n) => (n.id === nodeId ? { ...n, data: { ...(n.data as IdentityNodeData), label: identity.name } } : n)),
    );
  }

  function handleIdentityDeleted(identityId: string) {
    const nodeId = identityNodeByEntityId[identityId];
    const accountsOfIdentity = Object.values(accountsById).filter((a) => a.identity_id === identityId);
    const accountNodeIds = new Set(accountsOfIdentity.map((a) => accountNodeByEntityId[a.id]).filter(Boolean));

    setNodes((prev) => prev.filter((n) => n.id !== nodeId && !accountNodeIds.has(n.id)));
    setEdges((prev) => prev.filter((e) => e.source !== nodeId && e.target !== nodeId));
    setSelected(null);
  }

  function handleAccountUpdated(account: Account) {
    setAccountsById((prev) => ({ ...prev, [account.id]: account }));
    const nodeId = accountNodeByEntityId[account.id];
    setNodes((prev) =>
      prev.map((n) =>
        n.id === nodeId
          ? {
              ...n,
              data: {
                label: account.service_name,
                hasPassword: account.has_password,
                has2fa: account.has_2fa,
              } as AccountNodeData,
            }
          : n,
      ),
    );
  }

  function handleAccountDeleted(accountId: string) {
    const nodeId = accountNodeByEntityId[accountId];
    setNodes((prev) => prev.filter((n) => n.id !== nodeId));
    setEdges((prev) => prev.filter((e) => e.source !== nodeId && e.target !== nodeId));
    setSelected(null);
  }

  async function handleLock() {
    try {
      await api.lockVault();
    } finally {
      onLock();
    }
  }

  const accountsOfSelectedIdentity = useMemo(() => {
    if (selected?.type !== "identity") return [];
    return Object.values(accountsById).filter((a) => a.identity_id === selected.entityId);
  }, [selected, accountsById]);

  return (
    <div className="canvas-page">
      <form className="canvas-page__toolbar" onSubmit={handleCreateIdentity}>
        <input
          className="canvas-page__toolbar-input"
          placeholder="Nouvelle identité..."
          value={newIdentityName}
          onChange={(e) => setNewIdentityName(e.target.value)}
        />
        <button type="submit" className="canvas-page__toolbar-btn">+ Identité</button>
      </form>

      <button className="canvas-page__lock-button" onClick={handleLock} title="Verrouiller le coffre fort">
        🔒 Lock
      </button>

      {error && <div className="canvas-page__error">{error}</div>}

      {!loading && (
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeDragStop={onNodeDragStop}
          onNodeClick={onNodeClick}
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

      {selected?.type === "identity" && identitiesById[selected.entityId] && (
        <IdentityPanel
          identity={identitiesById[selected.entityId]}
          accounts={accountsOfSelectedIdentity}
          onClose={() => setSelected(null)}
          onIdentityUpdated={handleIdentityUpdated}
          onIdentityDeleted={handleIdentityDeleted}
          onAccountCreated={handleAccountCreated}
          onSelectAccount={(accountId) => setSelected({ type: "account", entityId: accountId })}
        />
      )}

      {selected?.type === "account" && accountsById[selected.entityId] && (
        <AccountPanel
          account={accountsById[selected.entityId]}
          onClose={() => setSelected(null)}
          onAccountUpdated={handleAccountUpdated}
          onAccountDeleted={handleAccountDeleted}
        />
      )}
    </div>
  );
}