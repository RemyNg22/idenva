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

export interface Identity {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  color: string | null;
  tags: string[] | null;
  importance: number;
  created_at: string;
  updated_at: string;
}

export interface Account {
  id: string;
  identity_id: string;
  service_name: string;
  url: string | null;
  username: string | null;
  email_id: string | null;
  has_2fa: boolean;
  has_password: boolean;
  has_totp: boolean;
  account_type: string | null;
  importance: number;
  created_at: string;
  updated_at: string;
  last_password_change: string | null;
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

export interface PasswordGeneratorOptions {
  length?: number;
  uppercase?: boolean;
  lowercase?: boolean;
  numbers?: boolean;
  symbols?: boolean;
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

  createGraphNode: (entityType: string, entityId: string, posX: number, posY: number) =>
    request<GraphNode>("/api/graph/nodes", {
      method: "POST",
      body: JSON.stringify({ entity_type: entityType, entity_id: entityId, pos_x: posX, pos_y: posY }),
    }),

  createGraphEdge: (sourceNodeId: string, targetNodeId: string, relationType: string) =>
    request<GraphEdge>("/api/graph/edges", {
      method: "POST",
      body: JSON.stringify({
        source_node_id: sourceNodeId,
        target_node_id: targetNodeId,
        relation_type: relationType,
      }),
    }),

  listIdentities: () => request<Identity[]>("/api/identities"),

  createIdentity: (name: string) =>
    request<Identity>("/api/identities", { method: "POST", body: JSON.stringify({ name }) }),

  updateIdentity: (id: string, patch: Partial<Pick<Identity, "name" | "description" | "importance">>) =>
    request<Identity>(`/api/identities/${id}`, { method: "PUT", body: JSON.stringify(patch) }),

  deleteIdentity: (id: string) => request<void>(`/api/identities/${id}`, { method: "DELETE" }),

  listAccounts: (identityId?: string) =>
    request<Account[]>(`/api/accounts${identityId ? `?identity_id=${identityId}` : ""}`),

  createAccount: (data: {
    identity_id: string;
    service_name: string;
    username?: string;
    url?: string;
    password?: string;
    has_2fa?: boolean;
  }) => request<Account>("/api/accounts", { method: "POST", body: JSON.stringify(data) }),

  updateAccount: (
    id: string,
    patch: Partial<{
      service_name: string;
      username: string;
      url: string;
      password: string;
      has_2fa: boolean;
    }>,
  ) => request<Account>(`/api/accounts/${id}`, { method: "PUT", body: JSON.stringify(patch) }),

  deleteAccount: (id: string) => request<void>(`/api/accounts/${id}`, { method: "DELETE" }),

  revealPassword: (accountId: string) =>
    request<{ value: string }>(`/api/accounts/${accountId}/reveal-password`, { method: "POST" }),

  revealTotp: (accountId: string) =>
    request<{ value: string }>(`/api/accounts/${accountId}/reveal-totp`, { method: "POST" }),

  generatePassword: (options: PasswordGeneratorOptions = {}) => {
    const params = new URLSearchParams();
    if (options.length !== undefined) params.set("length", String(options.length));
    if (options.uppercase !== undefined) params.set("uppercase", String(options.uppercase));
    if (options.lowercase !== undefined) params.set("lowercase", String(options.lowercase));
    if (options.numbers !== undefined) params.set("numbers", String(options.numbers));
    if (options.symbols !== undefined) params.set("symbols", String(options.symbols));
    return request<{ password: string }>(`/api/utils/generate-password?${params.toString()}`);
  },
};