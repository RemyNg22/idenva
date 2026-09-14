const API_BASE = "http://127.0.0.1:8000";

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    credentials: "include",
    headers: { "Content-Type": "application/json", ...options.headers },
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({ detail: response.statusText }));
    throw new ApiError(response.status, body.detail ?? "Erreur inconnue.");
  }

  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export interface VaultStatus {
  vault_exists: boolean;
  unlocked: boolean;
}

export interface GraphNode {
  id: string;
  entity_type: string;
  entity_id: string;
  pos_x: number;
  pos_y: number;
  width: number | null;
  height: number | null;
  visual_state: Record<string, unknown> | null;
}

export interface GraphEdge {
  id: string;
  source_node_id: string;
  target_node_id: string;
  relation_type: string;
  label: string | null;
}

export interface Graph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export const api = {
  getStatus: () => request<VaultStatus>("/api/auth/status"),

  setupVault: (masterPassword: string) =>
    request<{ status: string }>("/api/auth/setup", {
      method: "POST",
      body: JSON.stringify({ master_password: masterPassword }),
    }),

  unlockVault: (masterPassword: string) =>
    request<{ status: string }>("/api/auth/unlock", {
      method: "POST",
      body: JSON.stringify({ master_password: masterPassword }),
    }),

  lockVault: () => request<{ status: string }>("/api/auth/lock", { method: "POST" }),

  getGraph: () => request<Graph>("/api/graph"),

  updateNodePosition: (nodeId: string, posX: number, posY: number) =>
    request<GraphNode>(`/api/graph/nodes/${nodeId}`, {
      method: "PATCH",
      body: JSON.stringify({ pos_x: posX, pos_y: posY }),
    }),
};