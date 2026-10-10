const API_BASE = "";

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

export interface Note {
  id: string;
  owner_type: string;
  owner_id: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: string;
  title: string;
  description: string | null;
  status: string; // "todo" | "in_progress" | "done"
  priority: string; // "low" | "normal" | "high"
  due_date: string | null;
  related_type: string | null;
  related_id: string | null;
  created_at: string;
  updated_at: string;
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

export interface SecurityOverview {
  identities_count: number;
  accounts_count: number;
  passwords_count: number;
  two_fa_enabled_count: number;
  two_fa_total_count: number;
  weak_passwords_count: number;
  reused_passwords_count: number;
  old_passwords_count: number;
}

export interface SecurityAlert {
  severity: "critical" | "warning" | "info";
  identity_id: string | null;
  identity_name: string | null;
  account_id: string | null;
  service_name: string | null;
  message: string;
}

export interface OpsecFactor {
  label: string;
  points: number;
}

export interface IdentityOpsecScore {
  identity_id: string;
  identity_name: string;
  score: number;
  factors: OpsecFactor[];
}

export interface CorrelationAlert {
  identity_a_id: string;
  identity_a_name: string;
  identity_b_id: string;
  identity_b_name: string;
  shared_fields: string[];
}

export interface SecurityDashboard {
  overview: SecurityOverview;
  alerts: SecurityAlert[];
  scores: IdentityOpsecScore[];
  correlations: CorrelationAlert[];
}

export interface ExportFile {
  format_version: number;
  exported_at: string;
  kdf_salt: string;
  nonce: string;
  ciphertext: string;
}

export interface ImportSummary {
  identities_imported: number;
  accounts_imported: number;
  notes_imported: number;
  tasks_imported: number;
  nodes_imported: number;
  edges_imported: number;
}

export interface BackupInfo {
  filename: string;
  created_at: string;
  size_bytes: number;
}

export interface Credential {
  id: string;
  owner_type: "identity" | "account";
  owner_id: string;
  label: string;
  secret_type: string;
  created_at: string;
}

export interface EmailEntity {
  id: string;
  identity_id: string;
  address: string;
  is_sensitive: boolean;
  created_at: string;
}

export interface Phone {
  id: string;
  identity_id: string;
  number: string;
  created_at: string;
}

export interface Domain {
  id: string;
  identity_id: string;
  domain_name: string;
  registrar?: string;
  expiry_date?: string;
  created_at: string;
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

  changeMasterPassword: (currentPassword: string, newPassword: string) =>
    request<{ status: string }>("/api/auth/change-master-password", {
      method: "POST",
      body: JSON.stringify({
        current_password: currentPassword,
        new_password: newPassword,
      }),
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

  // --- CREDENTIALS ---
  listCredentials: (ownerType?: string, ownerId?: string) => {
    const params = new URLSearchParams();
    if (ownerType) params.append("owner_type", ownerType);
    if (ownerId) params.append("owner_id", ownerId);
    return request<Credential[]>(`/api/credentials?${params.toString()}`);
  },

  createCredential: (
    ownerType: "identity" | "account",
    ownerId: string,
    label: string,
    secretType: string,
    secret: string
  ) =>
    request<Credential>("/api/credentials", {
      method: "POST",
      body: JSON.stringify({
        owner_type: ownerType,
        owner_id: ownerId,
        label,
        secret_type: secretType,
        secret,
      }),
    }),

  revealCredential: (credentialId: string) =>
    request<{ value: string }>(`/api/credentials/${credentialId}/reveal`, { method: "POST" }),

  deleteCredential: (credentialId: string) =>
    request<void>(`/api/credentials/${credentialId}`, { method: "DELETE" }),

  // --- EMAILS ---
  listEmails: (identityId?: string) =>
    request<EmailEntity[]>(`/api/emails${identityId ? `?identity_id=${identityId}` : ""}`),

  createEmail: (identityId: string, address: string, isSensitive = false) =>
    request<EmailEntity>("/api/emails", {
      method: "POST",
      body: JSON.stringify({ identity_id: identityId, address, is_sensitive: isSensitive }),
    }),

  deleteEmail: (emailId: string) => request<void>(`/api/emails/${emailId}`, { method: "DELETE" }),

  // --- PHONES ---
  listPhones: (identityId?: string) =>
    request<Phone[]>(`/api/phones${identityId ? `?identity_id=${identityId}` : ""}`),

  createPhone: (identityId: string, number: string) =>
    request<Phone>("/api/phones", {
      method: "POST",
      body: JSON.stringify({ identity_id: identityId, number }),
    }),

  deletePhone: (phoneId: string) => request<void>(`/api/phones/${phoneId}`, { method: "DELETE" }),

  // --- DOMAINS ---
  listDomains: (identityId?: string) =>
    request<Domain[]>(`/api/domains${identityId ? `?identity_id=${identityId}` : ""}`),

  createDomain: (identityId: string, domainName: string, registrar?: string, expiryDate?: string) =>
    request<Domain>("/api/domains", {
      method: "POST",
      body: JSON.stringify({
        identity_id: identityId,
        domain_name: domainName,
        registrar,
        expiry_date: expiryDate,
      }),
    }),

  deleteDomain: (domainId: string) => request<void>(`/api/domains/${domainId}`, { method: "DELETE" }),

  // --- NOTES ---
  listNotes: (ownerId?: string, ownerType = "account") =>
    request<Note[]>(`/api/notes${ownerId ? `?owner_id=${ownerId}&owner_type=${ownerType}` : ""}`),

  createNote: (data: { owner_id: string; content: string; owner_type?: string }) =>
    request<Note>("/api/notes", {
      method: "POST",
      body: JSON.stringify({ owner_type: "account", ...data }),
    }),

  updateNote: (id: string, content: string) =>
    request<Note>(`/api/notes/${id}`, { method: "PUT", body: JSON.stringify({ content }) }),

  deleteNote: (id: string) => request<void>(`/api/notes/${id}`, { method: "DELETE" }),

  // --- TASKS ---
  listTasks: (relatedId?: string, relatedType = "account") =>
    request<Task[]>(`/api/tasks${relatedId ? `?related_id=${relatedId}&related_type=${relatedType}` : ""}`),

  createTask: (data: {
    title: string;
    related_id?: string;
    related_type?: string;
    description?: string;
    status?: string;
    priority?: string;
    due_date?: string;
  }) =>
    request<Task>("/api/tasks", {
      method: "POST",
      body: JSON.stringify({ related_type: "account", status: "todo", priority: "normal", ...data }),
    }),

  updateTask: (
    id: string,
    patch: Partial<{
      title: string;
      description: string;
      status: string;
      priority: string;
      due_date: string;
    }>,
  ) => request<Task>(`/api/tasks/${id}`, { method: "PUT", body: JSON.stringify(patch) }),

  deleteTask: (id: string) => request<void>(`/api/tasks/${id}`, { method: "DELETE" }),

  getSecurityDashboard: () => request<SecurityDashboard>("/api/dashboard/security"),

  // -- Module de recherche
  searchVault: (query: string) =>
    request<{ identities: Identity[]; accounts: Account[] }>(
      `/api/search?q=${encodeURIComponent(query)}`
    ),


  // -- Export du coffre fort
  exportVault: (exportPassword: string) =>
    request<ExportFile>("/api/vault/export", {
      method: "POST",
      body: JSON.stringify({ export_password: exportPassword }),
    }),

  importVault: (exportPassword: string, exportData: ExportFile) =>
    request<ImportSummary>("/api/vault/import", {
      method: "POST",
      body: JSON.stringify({ export_password: exportPassword, export_data: exportData }),
    }),

  createBackup: (exportPassword: string) =>
    request<BackupInfo>("/api/vault/backup", {
      method: "POST",
      body: JSON.stringify({ export_password: exportPassword }),
    }),

  listBackups: () => request<BackupInfo[]>("/api/vault/backups"),

  downloadBackup: (filename: string) => request<ExportFile>(`/api/vault/backups/${filename}`),

  resetVault: (masterPassword: string) =>
    request<{ status: string }>("/api/vault/reset", {
      method: "POST",
      body: JSON.stringify({ master_password: masterPassword }),
    }),
};