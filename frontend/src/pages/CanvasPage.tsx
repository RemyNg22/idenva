import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
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
import { GlobalActivityPanel } from "../components/GlobalActivityPanel";
import { ChangePasswordModal } from "../components/ChangePasswordModal";
import { SearchModal } from "../components/SearchModal";
import { VaultDataModal } from "../components/VaultDataModal";
import "./CanvasPage.css";
import { Search, SquareCheck, Shield, HardDrive, KeyRound, Lock } from "lucide-react";

const POSITION_SAVE_DEBOUNCE_MS = 500;
const ACCOUNT_HEIGHT = 55;
const HEADER_OFFSET = 50;

const nodeTypes = { identity: IdentityNode, account: AccountNode };

interface CanvasPageProps {
  onLock: () => void;
  onOpenDashboard: () => void;
}

type EntityNodeIndex = Record<string, string>;

export function CanvasPage({ onLock, onOpenDashboard }: CanvasPageProps) {
  const { t } = useTranslation();
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

  // Modales & Panneaux
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showVaultData, setShowVaultData] = useState(false);
  const [showGlobalActivity, setShowGlobalActivity] = useState(false);

  const saveTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setShowSearch((prev) => !prev);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const loadCanvasData = useCallback(() => {
    setLoading(true);
    Promise.all([api.getGraph(), api.listIdentities(), api.listAccounts()])
      .then(([graph, identities, accounts]) => {
        const identitiesMap = Object.fromEntries(identities.map((i) => [i.id, i]));
        const accountsMap = Object.fromEntries(accounts.map((a) => [a.id, a]));
        const accountCountByIdentity: Record<string, number> = {};
        const accountsByOwner: Record<string, Account[]> = {};

        accounts.forEach((a) => {
          accountCountByIdentity[a.identity_id] = (accountCountByIdentity[a.identity_id] ?? 0) + 1;
          if (!accountsByOwner[a.identity_id]) accountsByOwner[a.identity_id] = [];
          accountsByOwner[a.identity_id].push(a);
        });

        const identityNodeIndex: EntityNodeIndex = {};
        const accountNodeIndex: EntityNodeIndex = {};
        const flowNodes: Node[] = [];


        graph.nodes.forEach((n) => {
          if (n.entity_type === "identity") {
            identityNodeIndex[n.entity_id] = n.id;
            const identity = identitiesMap[n.entity_id];
            const childCount = accountCountByIdentity[n.entity_id] ?? 0;
            const calculatedHeight = Math.max(80, HEADER_OFFSET + childCount * ACCOUNT_HEIGHT + 12);

            flowNodes.push({
              id: n.id,
              type: "identity",
              position: { x: n.pos_x, y: n.pos_y },
              style: { width: 260, height: calculatedHeight },
              data: {
                label: identity?.name ?? "?",
                accountCount: childCount,
              } as IdentityNodeData,
            });
          }
        });

        graph.nodes.forEach((n) => {
          if (n.entity_type === "account") {
            accountNodeIndex[n.entity_id] = n.id;
            const account = accountsMap[n.entity_id];
            if (!account) return;

            const parentNodeId = identityNodeIndex[account.identity_id];
            const ownerAccounts = accountsByOwner[account.identity_id] || [];
            const indexInParent = ownerAccounts.findIndex((a) => a.id === account.id);

            flowNodes.push({
              id: n.id,
              type: "account",
              parentId: parentNodeId,
              extent: "parent",
              position: { x: 12, y: HEADER_OFFSET + Math.max(0, indexInParent) * ACCOUNT_HEIGHT },
              data: {
                label: account.service_name ?? "?",
                hasPassword: account.has_password ?? false,
                has2fa: account.has_2fa ?? false,
              } as AccountNodeData,
            });
          }
        });

        setIdentitiesById(identitiesMap);
        setAccountsById(accountsMap);
        setIdentityNodeByEntityId(identityNodeIndex);
        setAccountNodeByEntityId(accountNodeIndex);
        setNodes(flowNodes);
        setEdges([]);
      })
      .catch(() => setError(t("canvasPage.errors.loadCanvas")))
      .finally(() => setLoading(false));
  }, [t]);

  useEffect(() => {
    loadCanvasData();
  }, [loadCanvasData]);

  const onNodesChange: OnNodesChange = useCallback(
    (changes) => setNodes((nds) => applyNodeChanges(changes, nds)),
    [],
  );

  const onEdgesChange: OnEdgesChange = useCallback(
    (changes) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    [],
  );

  const onNodeDragStop: OnNodeDrag = useCallback((_event, node) => {
    if (node.type !== "identity") return;

    if (saveTimers.current[node.id]) clearTimeout(saveTimers.current[node.id]);
    saveTimers.current[node.id] = setTimeout(() => {
      api.updateNodePosition(node.id, node.position.x, node.position.y).catch(() => {
        setError(t("canvasPage.errors.savePosition"));
      });
    }, POSITION_SAVE_DEBOUNCE_MS);
  }, [t]);

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
      const posX = 100 + Math.random() * 300;
      const posY = 100 + Math.random() * 200;
      const graphNode = await api.createGraphNode("identity", identity.id, posX, posY);

      setIdentitiesById((prev) => ({ ...prev, [identity.id]: identity }));
      setIdentityNodeByEntityId((prev) => ({ ...prev, [identity.id]: graphNode.id }));
      setNodes((prev) => [
        ...prev,
        {
          id: graphNode.id,
          type: "identity",
          position: { x: posX, y: posY },
          style: { width: 260, height: 80 },
          data: { label: identity.name, accountCount: 0 } as IdentityNodeData,
        },
      ]);
      setNewIdentityName("");
    } catch {
      setError(t("canvasPage.errors.createIdentity"));
    }
  }

  function handleAccountCreated(account: Account) {
    const parentNodeId = identityNodeByEntityId[account.identity_id];

    const existingAccounts = Object.values(accountsById).filter(
      (a) => a.identity_id === account.identity_id
    );
    const index = existingAccounts.length;

    api.createGraphNode("account", account.id, 0, 0).then((graphNode) => {
      setAccountsById((prev) => ({ ...prev, [account.id]: account }));
      setAccountNodeByEntityId((prev) => ({ ...prev, [account.id]: graphNode.id }));

      setNodes((prev) => {
        const updatedNodes = prev.map((n) => {
          if (n.id === parentNodeId) {
            const newCount = (n.data as IdentityNodeData).accountCount + 1;
            return {
              ...n,
              style: { ...n.style, height: HEADER_OFFSET + newCount * ACCOUNT_HEIGHT + 12 },
              data: { ...(n.data as IdentityNodeData), accountCount: newCount },
            };
          }
          return n;
        });

        return [
          ...updatedNodes,
          {
            id: graphNode.id,
            type: "account",
            parentId: parentNodeId,
            extent: "parent",
            position: { x: 12, y: HEADER_OFFSET + index * ACCOUNT_HEIGHT },
            data: {
              label: account.service_name,
              hasPassword: account.has_password,
              has2fa: account.has_2fa,
            } as AccountNodeData,
          },
        ];
      });
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

    setIdentitiesById((prev) => {
      const next = { ...prev };
      delete next[identityId];
      return next;
    });

    setAccountsById((prev) => {
      const next = { ...prev };
      Object.values(next).forEach((acc) => {
        if (acc.identity_id === identityId) {
          delete next[acc.id];
        }
      });
      return next;
    });

    setIdentityNodeByEntityId((prev) => {
      const next = { ...prev };
      delete next[identityId];
      return next;
    });

    setNodes((prev) => prev.filter((n) => n.id !== nodeId && n.parentId !== nodeId));
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
    const account = accountsById[accountId];
    const nodeId = accountNodeByEntityId[accountId];
    if (!account) return;

    const parentNodeId = identityNodeByEntityId[account.identity_id];

    setAccountsById((prev) => {
      const next = { ...prev };
      delete next[accountId];
      return next;
    });

    setAccountNodeByEntityId((prev) => {
      const next = { ...prev };
      delete next[accountId];
      return next;
    });

    setNodes((prev) => {
      const filtered = prev.filter((n) => n.id !== nodeId);
      const remainingInParent = filtered.filter((n) => n.parentId === parentNodeId);

      let index = 0;
      return filtered.map((n) => {
        if (n.id === parentNodeId) {
          const newCount = remainingInParent.length;
          return {
            ...n,
            style: { ...n.style, height: Math.max(80, HEADER_OFFSET + newCount * ACCOUNT_HEIGHT + 12) },
            data: { ...(n.data as IdentityNodeData), accountCount: newCount },
          };
        }
        if (n.parentId === parentNodeId) {
          const updated = { ...n, position: { x: 12, y: HEADER_OFFSET + index * ACCOUNT_HEIGHT } };
          index++;
          return updated;
        }
        return n;
      });
    });

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
      {/* Formulaire d'ajout rapide (haut gauche) */}
      <form className="canvas-page__toolbar" onSubmit={handleCreateIdentity}>
        <input
          className="canvas-page__toolbar-input"
          placeholder={t("canvasPage.placeholders.newIdentity")}
          value={newIdentityName}
          onChange={(e) => setNewIdentityName(e.target.value)}
        />
        <button type="submit" className="canvas-page__toolbar-btn">
          {t("canvasPage.buttons.addIdentity")}
        </button>
      </form>

      {/* Barre d'outils verticale / latérale (haut droite) */}
      <nav className="canvas-page__top-actions">
        <button
          className="canvas-page__action-button"
          onClick={() => setShowSearch(true)}
          title={t("canvasPage.titles.search")}
        >
          <Search size={15} />
          <span className="action-label">{t("canvasPage.actions.search")}</span>
        </button>

        <button
          className="canvas-page__action-button"
          onClick={() => setShowGlobalActivity(true)}
          title={t("canvasPage.titles.activity")}
        >
          <SquareCheck size={15} />
          <span className="action-label">{t("canvasPage.actions.activity")}</span>
        </button>

        <button
          className="canvas-page__action-button"
          onClick={onOpenDashboard}
          title={t("canvasPage.titles.security")}
        >
          <Shield size={15} />
          <span className="action-label">{t("canvasPage.actions.security")}</span>
        </button>

        <button
          className="canvas-page__action-button"
          onClick={() => setShowVaultData(true)}
          title={t("canvasPage.titles.vaultData")}
        >
          <HardDrive size={15} />
          <span className="action-label">{t("canvasPage.actions.vaultData")}</span>
        </button>

        <button
          className="canvas-page__action-button"
          onClick={() => setShowChangePassword(true)}
          title={t("canvasPage.titles.password")}
        >
          <KeyRound size={15} />
          <span className="action-label">{t("canvasPage.actions.password")}</span>
        </button>

        <button
          className="canvas-page__action-button canvas-page__action-button--danger"
          onClick={handleLock}
          title={t("canvasPage.titles.lock")}
        >
          <Lock size={15} />
          <span className="action-label">{t("canvasPage.actions.lock")}</span>
        </button>
      </nav>

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
          key={selected.entityId}
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
          key={selected.entityId}
          account={accountsById[selected.entityId]}
          onClose={() => setSelected(null)}
          onAccountUpdated={handleAccountUpdated}
          onAccountDeleted={handleAccountDeleted}
        />
      )}

      {showGlobalActivity && (
        <GlobalActivityPanel
          identitiesById={identitiesById}
          accountsById={accountsById}
          onClose={() => setShowGlobalActivity(false)}
        />
      )}

      {showVaultData && (
        <VaultDataModal
          onClose={() => setShowVaultData(false)}
          onImported={loadCanvasData}
        />
      )}

      {showChangePassword && (
        <ChangePasswordModal onClose={() => setShowChangePassword(false)} />
      )}

      {showSearch && (
        <SearchModal
          identities={Object.values(identitiesById)}
          accounts={Object.values(accountsById)}
          onSelectEntity={(type, entityId) => setSelected({ type, entityId })}
          onClose={() => setShowSearch(false)}
        />
      )}
    </div>
  );
}