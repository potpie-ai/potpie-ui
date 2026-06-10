import axios from "axios";
import getHeaders from "@/app/utils/headers.util";

const baseUrl = () => process.env.NEXT_PUBLIC_BASE_URL;

export type PotRole = "owner" | "user";

// The not-yet-answered invite for the signed-in user on a pot they can
// already see (invitees are auto-added on invite). Drives the Accept /
// Decline banner; `token` is what the accept/decline endpoints take.
export type PotPendingInvitation = {
  id: string;
  role: PotRole;
  token: string;
  status: "pending";
  expires_at: string | null;
};

export type Pot = {
  id: string;
  display_name: string | null;
  slug: string | null;
  primary_repo_name: string | null;
  created_by_user_id: string | null;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
  role: PotRole;
  pending_invitation: PotPendingInvitation | null;
};

export type PotSlugAvailability = {
  slug: string;
  available: boolean;
};

export type PotRepository = {
  id: string;
  repo_name: string;
  owner: string;
  repo: string;
  provider: string;
  provider_host: string;
  default_branch: string | null;
  remote_url: string | null;
  external_repo_id: string | null;
  added_by_user_id: string | null;
  created_at: string | null;
};

export type PotMember = {
  user_id: string;
  role: PotRole;
  email: string | null;
  display_name: string | null;
  invited_by_user_id: string | null;
  created_at: string | null;
  updated_at: string | null;
};

export type PotInvitation = {
  id: string;
  pot_id: string;
  email: string;
  role: PotRole;
  status: "pending" | "accepted" | "revoked" | "expired" | "declined";
  invited_by_user_id: string;
  accepted_by_user_id: string | null;
  expires_at: string | null;
  created_at: string | null;
  accepted_at: string | null;
  token?: string;
};

export type PotSource = {
  id: string;
  pot_id: string;
  integration_id: string | null;
  provider: string;
  source_kind: string;
  scope: Record<string, unknown>;
  sync_enabled: boolean;
  sync_mode: string | null;
  webhook_status: string | null;
  last_sync_at: string | null;
  last_error: string | null;
  health_score: string | null;
  added_by_user_id: string | null;
  created_at: string | null;
  updated_at: string | null;
};

export type PotIntegration = {
  id: string;
  integration_type: string;
  provider: string;
  provider_host: string | null;
  external_account_id: string | null;
  created_by_user_id: string | null;
  created_at: string | null;
  updated_at: string | null;
};

export type PotEvent = {
  id: string;
  event_id: string;
  status: string;
  lifecycle_status: string;
  stage?: string | null;
  ingestion_kind: string;
  source_system?: string | null;
  source_channel?: string | null;
  event_type?: string | null;
  action?: string | null;
  repo_name?: string | null;
  provider?: string | null;
  received_at?: string | null;
  submitted_at?: string | null;
  completed_at?: string | null;
  error?: string | null;
  payload?: Record<string, unknown> | null;
  metadata?: Record<string, unknown> | null;
  step_total?: number;
  step_done?: number;
  step_error?: number;
  episode_steps?: PotEpisodeStep[];
  reconciliation_runs?: PotReconciliationRun[];
};

export type PotEpisodeStep = {
  sequence: number;
  step_kind: string;
  status: string;
  attempt_count: number;
  applied_at?: string | null;
  error?: string | null;
};

export type PotReconciliationWorkEvent = {
  id: string;
  sequence: number;
  event_kind: string;
  title?: string | null;
  body?: string | null;
  payload?: Record<string, unknown> | null;
  created_at: string;
};

export type PotReconciliationRun = {
  id: string;
  attempt_number: number;
  status: string;
  agent_name?: string | null;
  agent_version?: string | null;
  toolset_version?: string | null;
  plan_summary?: string | null;
  episode_count?: number | null;
  entity_mutation_count?: number | null;
  edge_mutation_count?: number | null;
  error?: string | null;
  started_at?: string | null;
  completed_at?: string | null;
  work_events?: PotReconciliationWorkEvent[];
};

export type PotIngestionConfig = {
  pot_id: string;
  mode: "immediate" | "windowed";
  window_minutes: number;
  min_batch_size: number | null;
};

export type PotEventPage = {
  items: PotEvent[];
  next_cursor: string | null;
};

// One row in the activity timeline (what changed, when, by/affecting what).
// Backed by the canonical timeline reader over Activity claims; `verb_class`
// is the event kind, `timestamp` is the event's occurred_at.
export type PotActivityItem = {
  id: string;
  activity_key: string | null;
  timestamp: string | null;
  verb_class: string | null; // code_change | deployment | alert | discussion | decision
  title: string | null;
  predicate: string | null; // TOUCHED | PERFORMED_BY | MENTIONS
  subject_key: string | null;
  object_key: string | null;
  source_system: string | null;
  source_ref: string | null;
  evidence_strength: string | null;
  score: number | null;
};

export type PotActivityTimeline = {
  pot_id: string;
  items: PotActivityItem[];
  coverage: string | null; // overall_confidence: high | medium | low | unknown
  window: { since: string | null; until: string | null };
};

export type PotIngestPipeline = {
  pot_id: string;
  mode: "immediate" | "windowed";
  window_minutes: number;
  min_batch_size: number | null;
  open_batch: {
    batch_id: string;
    created_at: string | null;
    event_count: number;
    window_deadline: string | null;
  } | null;
  queued_event_count: number;
};

export type RawIngestionResult = {
  event_id: string;
  status: string;
  pot_id: string;
  error: string | null;
};

export type ContextGraphGoal =
  | "retrieve"
  | "answer"
  | "investigate"
  | "neighborhood"
  | "timeline"
  | "aggregate";

export type ContextGraphStrategy =
  | "auto"
  | "semantic"
  | "exact"
  | "hybrid"
  | "traversal"
  | "temporal";

export type ContextGraphScope = {
  repo_name?: string;
  branch?: string;
  file_path?: string;
  function_name?: string;
  symbol?: string;
  pr_number?: number;
  services?: string[];
  features?: string[];
  environment?: string;
  ticket_ids?: string[];
  user?: string;
  source_refs?: Array<string | Record<string, unknown>>;
};

export type ContextGraphBudget = {
  max_items?: number;
  max_tokens?: number;
  timeout_ms?: number;
  freshness?: string;
};

export type ContextGraphQuery = {
  pot_id: string;
  query?: string;
  goal?: ContextGraphGoal;
  strategy?: ContextGraphStrategy;
  include?: string[];
  exclude?: string[];
  scope?: ContextGraphScope;
  node_labels?: string[];
  source_descriptions?: string[];
  episode_uuids?: string[];
  as_of?: string;
  include_invalidated?: boolean;
  limit?: number;
  consumer_hint?: string;
  intent?: string;
  source_policy?:
    | "references_only"
    | "summary"
    | "snippets"
    | "verify"
    | "deep"
    | string;
  artifact?: { kind: string; identifier: string } | null;
  budget?: ContextGraphBudget;
};

export type ContextGraphResult<T = unknown> = {
  kind: string;
  goal: ContextGraphGoal | string;
  strategy: ContextGraphStrategy | string;
  result: T;
  error?: string | null;
  meta?: Record<string, unknown>;
};

export type ContextAnswerEnvelope = {
  ok?: boolean;
  answer?: {
    summary?: string;
    artifacts?: unknown[];
    recent_changes?: unknown[];
    decisions?: unknown[];
    discussions?: unknown[];
    owners?: unknown[];
    project_map?: unknown[];
    debugging_memory?: unknown[];
  };
  facts?: Record<string, unknown>;
  evidence?: Array<Record<string, unknown>>;
  source_refs?: Array<string | Record<string, unknown>>;
  source_resolution?: unknown;
  confidence?: string | number | null;
  as_of?: string | null;
  open_conflicts?: unknown[];
  coverage?: {
    status?: string;
    gaps?: string[];
    [key: string]: unknown;
  };
  freshness?: Record<string, unknown>;
  quality?: {
    status?: string;
    recommended_maintenance?: string[];
    [key: string]: unknown;
  };
  verification_state?: unknown;
  fallbacks?: unknown[];
  recommended_next_actions?: string[];
  errors?: unknown[];
  meta?: Record<string, unknown>;
  bundle?: unknown;
  // Present only for goal=investigate (the agentic read loop): the tool
  // trace the agent followed to reach the answer.
  agent?: {
    iterations?: number;
    steps?: Array<{
      tool: string;
      arguments?: Record<string, unknown>;
      result_kind?: string;
      result_count?: number;
    }>;
    usage?: Record<string, unknown> | null;
  };
};

// ---- Project graph (used by the Graph tab) ----------------------------------

export type ProjectGraphNode = {
  id: string;
  entity_key: string;
  labels: string[];
  properties: Record<string, unknown>;
  relationships: Array<{
    type: string;
    direction: "in" | "out";
    target_key?: string;
    target_labels?: string[];
    target_name?: string | null;
    source_key?: string;
    source_labels?: string[];
    source_name?: string | null;
  }>;
};

export type ProjectGraphEdge = {
  from: string;
  type: string;
  to: string;
  properties: Record<string, unknown>;
};

export type ProjectGraph = {
  pot_id: string;
  pr_number: number | null;
  limit: number;
  nodes: ProjectGraphNode[];
  edges: ProjectGraphEdge[];
  message: string;
};

// ---- infra_topology envelope → ProjectGraph --------------------------------
// The structural `project_graph` reader was removed with Graphiti. Topology is
// now served by the `infra_topology` P9 reader, which returns one item per
// canonical edge: `payload = { predicate, subject_key, object_key, environment,
// ... }`. We rebuild the {nodes, edges} shape the canvas renders from those
// edge rows. `OWNED_BY` is in the reader's predicate set, so this covers
// ownership too — no separate owners leg is needed.

type TopologyEdgePayload = {
  predicate?: string;
  subject_key?: string;
  object_key?: string;
  fact?: string;
  environment?: string | null;
  source_ref?: string | null;
  source_system?: string | null;
  valid_at?: string | null;
  evidence_strength?: string | null;
};

type AgentEnvelopeItem = {
  include?: string;
  candidate_key?: string;
  score?: number;
  payload?: TopologyEdgePayload;
};

type AgentEnvelopeResult = { items?: AgentEnvelopeItem[] };

// Canonical entity-key prefix → ontology label (mirrors the identity policies in
// app/src/context-engine/domain/ontology.py).
const ENTITY_KEY_LABEL: Record<string, string> = {
  // canonical single-segment prefixes
  service: "Service",
  repo: "Repository",
  environment: "Environment",
  datastore: "DataStore",
  cluster: "Cluster",
  team: "Team",
  person: "Person",
  document: "Document",
  observation: "Observation",
  quality: "QualityIssue",
  // two-segment namespaces that show up in raw / soft-downgraded data
  "github:repo": "Repository",
  "github:user": "Person",
  "github:org": "Team",
  "timeline:activity": "Activity",
  "timeline:period": "Period",
};

function entityLabelFromKey(key: string): string {
  const parts = key.split(":");
  const two = parts.length >= 2 ? `${parts[0]}:${parts[1]}`.toLowerCase() : "";
  if (two && ENTITY_KEY_LABEL[two]) return ENTITY_KEY_LABEL[two];
  const prefix = (parts[0] ?? "").toLowerCase();
  return (
    ENTITY_KEY_LABEL[prefix] ??
    (prefix ? prefix.charAt(0).toUpperCase() + prefix.slice(1) : "Entity")
  );
}

// Both the semantic infra_topology reader and the raw_graph visualization read
// return edge-shaped item payloads; accept either.
const EDGE_INCLUDE_FAMILIES = new Set(["infra_topology", "raw_graph"]);

function entityNameFromKey(key: string): string {
  const idx = key.indexOf(":");
  return idx >= 0 ? key.slice(idx + 1) : key;
}

function topologyEnvelopeToProjectGraph(
  result: AgentEnvelopeResult | undefined | null,
  potId: string,
  limit: number,
): ProjectGraph {
  const items = Array.isArray(result?.items) ? result!.items! : [];
  const nodes = new Map<string, ProjectGraphNode>();
  const edges: ProjectGraphEdge[] = [];
  const seenEdges = new Set<string>();

  const ensureNode = (key: string): ProjectGraphNode => {
    let node = nodes.get(key);
    if (!node) {
      node = {
        id: key,
        entity_key: key,
        labels: [entityLabelFromKey(key)],
        properties: { name: entityNameFromKey(key) },
        relationships: [],
      };
      nodes.set(key, node);
    }
    return node;
  };

  for (const item of items) {
    if (item.include && !EDGE_INCLUDE_FAMILIES.has(item.include)) continue;
    const p = item.payload ?? {};
    const from = p.subject_key;
    const to = p.object_key;
    const type = p.predicate;
    if (!from || !to || !type) continue;

    const subject = ensureNode(from);
    const object = ensureNode(to);

    const edgeId = `${from}|${type}|${to}`;
    if (seenEdges.has(edgeId)) continue;
    seenEdges.add(edgeId);

    edges.push({
      from,
      type,
      to,
      properties: {
        ...(p.environment ? { environment: p.environment } : {}),
        ...(p.source_ref ? { source_ref: p.source_ref } : {}),
        ...(p.source_system ? { source_system: p.source_system } : {}),
        ...(p.evidence_strength
          ? { evidence_strength: p.evidence_strength }
          : {}),
        ...(p.valid_at ? { valid_at: p.valid_at } : {}),
      },
    });
    subject.relationships.push({
      type,
      direction: "out",
      target_key: to,
      target_labels: object.labels,
      target_name: entityNameFromKey(to),
    });
    object.relationships.push({
      type,
      direction: "in",
      source_key: from,
      source_labels: subject.labels,
      source_name: entityNameFromKey(from),
    });
  }

  return {
    pot_id: potId,
    pr_number: null,
    limit,
    nodes: Array.from(nodes.values()),
    edges,
    message: "",
  };
}

function errorMessage(error: unknown, fallback: string) {
  if (axios.isAxiosError(error)) {
    const detail = (error.response?.data as { detail?: string } | undefined)
      ?.detail;
    return detail || error.message || fallback;
  }
  if (error instanceof Error) return error.message || fallback;
  return fallback;
}

export default class PotService {
  static async listPots(): Promise<Pot[]> {
    const headers = await getHeaders();
    try {
      const response = await axios.get(`${baseUrl()}/api/v1/context/pots`, {
        headers,
      });
      return response.data as Pot[];
    } catch (error) {
      throw new Error(errorMessage(error, "Error fetching pots"));
    }
  }

  static async createPot(body: {
    slug: string;
    display_name?: string;
    primary_repo_name?: string;
  }): Promise<Pot> {
    const headers = await getHeaders();
    try {
      const response = await axios.post(
        `${baseUrl()}/api/v1/context/pots`,
        body,
        { headers },
      );
      return response.data as Pot;
    } catch (error) {
      throw new Error(errorMessage(error, "Error creating pot"));
    }
  }

  static async checkSlugAvailability(
    slug: string,
  ): Promise<PotSlugAvailability> {
    const headers = await getHeaders();
    try {
      const response = await axios.get(
        `${baseUrl()}/api/v1/context/pots/slug-availability/${encodeURIComponent(slug)}`,
        { headers },
      );
      return response.data as PotSlugAvailability;
    } catch (error) {
      throw new Error(errorMessage(error, "Error checking pot slug"));
    }
  }

  static async patchPot(
    potId: string,
    body: { display_name?: string; slug?: string; archived?: boolean },
  ): Promise<Pot> {
    const headers = await getHeaders();
    try {
      const response = await axios.patch(
        `${baseUrl()}/api/v1/context/pots/${potId}`,
        body,
        { headers },
      );
      return response.data as Pot;
    } catch (error) {
      throw new Error(errorMessage(error, "Error updating pot"));
    }
  }

  static async listRepositories(potId: string): Promise<PotRepository[]> {
    const headers = await getHeaders();
    try {
      const response = await axios.get(
        `${baseUrl()}/api/v1/context/pots/${potId}/repositories`,
        { headers },
      );
      return response.data as PotRepository[];
    } catch (error) {
      throw new Error(errorMessage(error, "Error fetching pot repositories"));
    }
  }

  static async addRepository(
    potId: string,
    body: { owner: string; repo: string; default_branch?: string },
  ) {
    const headers = await getHeaders();
    try {
      const response = await axios.post(
        `${baseUrl()}/api/v1/context/pots/${potId}/repositories`,
        { provider: "github", provider_host: "github.com", ...body },
        { headers },
      );
      return response.data;
    } catch (error) {
      throw new Error(errorMessage(error, "Error adding repository"));
    }
  }

  static async deleteRepository(potId: string, repositoryId: string) {
    const headers = await getHeaders();
    try {
      const response = await axios.delete(
        `${baseUrl()}/api/v1/context/pots/${potId}/repositories/${repositoryId}`,
        { headers },
      );
      return response.data;
    } catch (error) {
      throw new Error(errorMessage(error, "Error removing repository"));
    }
  }

  // ---- Members -----------------------------------------------------

  static async listMembers(potId: string): Promise<PotMember[]> {
    const headers = await getHeaders();
    try {
      const response = await axios.get(
        `${baseUrl()}/api/v1/context/pots/${potId}/members`,
        { headers },
      );
      return response.data as PotMember[];
    } catch (error) {
      throw new Error(errorMessage(error, "Error fetching members"));
    }
  }

  static async removeMember(potId: string, memberUserId: string) {
    const headers = await getHeaders();
    try {
      const response = await axios.delete(
        `${baseUrl()}/api/v1/context/pots/${potId}/members/${memberUserId}`,
        { headers },
      );
      return response.data;
    } catch (error) {
      throw new Error(errorMessage(error, "Error removing member"));
    }
  }

  // ---- Invitations -------------------------------------------------

  static async listInvitations(potId: string): Promise<PotInvitation[]> {
    const headers = await getHeaders();
    try {
      const response = await axios.get(
        `${baseUrl()}/api/v1/context/pots/${potId}/invitations`,
        { headers },
      );
      return response.data as PotInvitation[];
    } catch (error) {
      throw new Error(errorMessage(error, "Error fetching invitations"));
    }
  }

  static async inviteByEmail(
    potId: string,
    body: { email: string; role?: "user"; expires_in_days?: number },
  ): Promise<PotInvitation> {
    const headers = await getHeaders();
    try {
      const response = await axios.post(
        `${baseUrl()}/api/v1/context/pots/${potId}/invitations`,
        { role: "user", ...body },
        { headers },
      );
      return response.data as PotInvitation;
    } catch (error) {
      throw new Error(errorMessage(error, "Error sending invitation"));
    }
  }

  static async revokeInvitation(potId: string, invitationId: string) {
    const headers = await getHeaders();
    try {
      const response = await axios.delete(
        `${baseUrl()}/api/v1/context/pots/${potId}/invitations/${invitationId}`,
        { headers },
      );
      return response.data;
    } catch (error) {
      throw new Error(errorMessage(error, "Error revoking invitation"));
    }
  }

  static async resendInvitation(potId: string, invitationId: string) {
    const headers = await getHeaders();
    try {
      const response = await axios.post(
        `${baseUrl()}/api/v1/context/pots/${potId}/invitations/${invitationId}/resend`,
        null,
        { headers },
      );
      return response.data as { ok: boolean; invitation_id: string };
    } catch (error) {
      throw new Error(errorMessage(error, "Error resending invitation"));
    }
  }

  static async acceptInvitation(token: string) {
    const headers = await getHeaders();
    try {
      const response = await axios.post(
        `${baseUrl()}/api/v1/context/pot-invitations/${encodeURIComponent(token)}/accept`,
        null,
        { headers },
      );
      return response.data as { ok: boolean; pot_id: string; role: PotRole };
    } catch (error) {
      throw new Error(errorMessage(error, "Error accepting invitation"));
    }
  }

  static async declineInvitation(token: string) {
    const headers = await getHeaders();
    try {
      const response = await axios.post(
        `${baseUrl()}/api/v1/context/pot-invitations/${encodeURIComponent(token)}/decline`,
        null,
        { headers },
      );
      return response.data as {
        ok: boolean;
        pot_id: string;
        declined: boolean;
      };
    } catch (error) {
      throw new Error(errorMessage(error, "Error declining invitation"));
    }
  }

  // ---- Sources -----------------------------------------------------

  static async listSources(potId: string): Promise<PotSource[]> {
    const headers = await getHeaders();
    try {
      const response = await axios.get(
        `${baseUrl()}/api/v1/context/pots/${potId}/sources`,
        { headers },
      );
      return response.data as PotSource[];
    } catch (error) {
      throw new Error(errorMessage(error, "Error fetching sources"));
    }
  }

  static async addGithubRepositorySource(
    potId: string,
    body: {
      owner: string;
      repo: string;
      default_branch?: string;
      external_repo_id?: string;
      remote_url?: string;
      provider_host?: string;
    },
  ) {
    const headers = await getHeaders();
    try {
      const response = await axios.post(
        `${baseUrl()}/api/v1/context/pots/${potId}/sources/github/repository`,
        body,
        { headers },
      );
      return response.data as {
        id: string;
        repository_id: string;
        source: PotSource;
        already_attached: boolean;
      };
    } catch (error) {
      throw new Error(
        errorMessage(error, "Error adding GitHub repository source"),
      );
    }
  }

  static async deleteSource(potId: string, sourceId: string) {
    const headers = await getHeaders();
    try {
      const response = await axios.delete(
        `${baseUrl()}/api/v1/context/pots/${potId}/sources/${sourceId}`,
        { headers },
      );
      return response.data;
    } catch (error) {
      throw new Error(errorMessage(error, "Error removing source"));
    }
  }

  static async patchSource(
    potId: string,
    sourceId: string,
    body: { sync_enabled?: boolean },
  ): Promise<PotSource> {
    const headers = await getHeaders();
    try {
      const response = await axios.patch(
        `${baseUrl()}/api/v1/context/pots/${potId}/sources/${sourceId}`,
        body,
        { headers },
      );
      return response.data as PotSource;
    } catch (error) {
      throw new Error(errorMessage(error, "Error updating source"));
    }
  }

  static async listLinearTeams(
    potId: string,
    integrationId: string,
  ): Promise<{ id: string; name: string; key?: string }[]> {
    const headers = await getHeaders();
    try {
      const response = await axios.get(
        `${baseUrl()}/api/v1/context/pots/${potId}/sources/linear/teams`,
        { headers, params: { integration_id: integrationId } },
      );
      return (response.data?.teams || []) as {
        id: string;
        name: string;
        key?: string;
      }[];
    } catch (error) {
      throw new Error(errorMessage(error, "Error fetching Linear teams"));
    }
  }

  static async addLinearTeamSource(
    potId: string,
    body: { integration_id: string; team_id: string; team_name?: string },
  ) {
    const headers = await getHeaders();
    try {
      const response = await axios.post(
        `${baseUrl()}/api/v1/context/pots/${potId}/sources/linear/team`,
        body,
        { headers },
      );
      return response.data as {
        id: string;
        source: PotSource;
        already_attached: boolean;
      };
    } catch (error) {
      throw new Error(errorMessage(error, "Error attaching Linear team"));
    }
  }

  // ---- Integrations ------------------------------------------------

  static async listIntegrations(potId: string): Promise<PotIntegration[]> {
    const headers = await getHeaders();
    try {
      const response = await axios.get(
        `${baseUrl()}/api/v1/context/pots/${potId}/integrations`,
        { headers },
      );
      return response.data as PotIntegration[];
    } catch (error) {
      throw new Error(errorMessage(error, "Error fetching pot integrations"));
    }
  }

  // ---- Events & raw ingestion -------------------------------------

  static async listEvents(
    potId: string,
    options: {
      limit?: number;
      cursor?: string;
      status?: string[];
      ingestion_kind?: string[];
      source_system?: string[];
      from_date?: string;
      to_date?: string;
      q?: string;
    } = {},
  ): Promise<PotEventPage> {
    const headers = await getHeaders();
    const params: Record<string, string | number | string[]> = {};
    if (options.limit != null) params.limit = options.limit;
    if (options.cursor) params.cursor = options.cursor;
    if (options.status && options.status.length > 0)
      params.status = options.status;
    if (options.ingestion_kind && options.ingestion_kind.length > 0)
      params.ingestion_kind = options.ingestion_kind;
    if (options.source_system && options.source_system.length > 0)
      params.source_system = options.source_system;
    if (options.from_date) params.from_date = options.from_date;
    if (options.to_date) params.to_date = options.to_date;
    if (options.q) params.q = options.q;
    try {
      const response = await axios.get(
        `${baseUrl()}/api/v1/context/pots/${potId}/events`,
        {
          headers,
          params,
          paramsSerializer: (p) => {
            const q = new URLSearchParams();
            Object.entries(p).forEach(([k, v]) => {
              if (Array.isArray(v))
                v.forEach((item) => q.append(k, String(item)));
              else if (v != null) q.append(k, String(v));
            });
            return q.toString();
          },
        },
      );
      return response.data as PotEventPage;
    } catch (error) {
      throw new Error(errorMessage(error, "Error fetching pot events"));
    }
  }

  static async getActivityTimeline(
    potId: string,
    options: {
      service?: string[];
      window?: string; // "24h" | "7d" | "14d" | "30d" | "90d"
      since?: string;
      until?: string;
      verb_class?: string[];
      limit?: number;
      include_invalidated?: boolean;
    } = {},
  ): Promise<PotActivityTimeline> {
    const headers = await getHeaders();
    const params: Record<string, string | number | boolean | string[]> = {};
    if (options.service && options.service.length > 0)
      params.service = options.service;
    if (options.window) params.window = options.window;
    if (options.since) params.since = options.since;
    if (options.until) params.until = options.until;
    if (options.verb_class && options.verb_class.length > 0)
      params.verb_class = options.verb_class;
    if (options.limit != null) params.limit = options.limit;
    if (options.include_invalidated)
      params.include_invalidated = options.include_invalidated;
    try {
      const response = await axios.get(
        `${baseUrl()}/api/v1/context/pots/${potId}/timeline`,
        {
          headers,
          params,
          paramsSerializer: (p) => {
            const q = new URLSearchParams();
            Object.entries(p).forEach(([k, v]) => {
              if (Array.isArray(v))
                v.forEach((item) => q.append(k, String(item)));
              else if (v != null) q.append(k, String(v));
            });
            return q.toString();
          },
        },
      );
      return response.data as PotActivityTimeline;
    } catch (error) {
      throw new Error(errorMessage(error, "Error fetching activity timeline"));
    }
  }

  static async getEvent(eventId: string): Promise<PotEvent> {
    const headers = await getHeaders();
    try {
      const response = await axios.get(
        `${baseUrl()}/api/v1/context/events/${encodeURIComponent(eventId)}`,
        { headers },
      );
      return response.data as PotEvent;
    } catch (error) {
      throw new Error(errorMessage(error, "Error fetching event"));
    }
  }

  static async retryEvent(
    eventId: string,
  ): Promise<{ status: string; event_id: string; batch_id: string | null }> {
    const headers = await getHeaders();
    try {
      const response = await axios.post(
        `${baseUrl()}/api/v1/context/events/${encodeURIComponent(eventId)}/retry`,
        null,
        { headers },
      );
      return response.data as {
        status: string;
        event_id: string;
        batch_id: string | null;
      };
    } catch (error) {
      throw new Error(errorMessage(error, "Error retrying event"));
    }
  }

  static async getIngestionConfig(
    potId: string,
  ): Promise<PotIngestionConfig> {
    const headers = await getHeaders();
    try {
      const response = await axios.get(
        `${baseUrl()}/api/v1/context/pots/${encodeURIComponent(potId)}/ingestion-config`,
        { headers },
      );
      return response.data as PotIngestionConfig;
    } catch (error) {
      throw new Error(errorMessage(error, "Error fetching ingestion config"));
    }
  }

  static async updateIngestionConfig(
    potId: string,
    body: {
      mode: "immediate" | "windowed";
      window_minutes: number;
      min_batch_size?: number | null;
    },
  ): Promise<PotIngestionConfig> {
    const headers = await getHeaders();
    try {
      const response = await axios.put(
        `${baseUrl()}/api/v1/context/pots/${encodeURIComponent(potId)}/ingestion-config`,
        body,
        { headers },
      );
      return response.data as PotIngestionConfig;
    } catch (error) {
      throw new Error(errorMessage(error, "Error updating ingestion config"));
    }
  }

  static async forceFlushPot(
    potId: string,
  ): Promise<{ pot_id: string; batch_id: string | null; status: string }> {
    const headers = await getHeaders();
    try {
      const response = await axios.post(
        `${baseUrl()}/api/v1/context/pots/${encodeURIComponent(potId)}/ingest/flush`,
        null,
        { headers },
      );
      return response.data as {
        pot_id: string;
        batch_id: string | null;
        status: string;
      };
    } catch (error) {
      throw new Error(errorMessage(error, "Error forcing flush"));
    }
  }

  static async getIngestPipeline(
    potId: string,
  ): Promise<PotIngestPipeline> {
    const headers = await getHeaders();
    try {
      const response = await axios.get(
        `${baseUrl()}/api/v1/context/pots/${encodeURIComponent(potId)}/ingest/pipeline`,
        { headers },
      );
      return response.data as PotIngestPipeline;
    } catch (error) {
      throw new Error(errorMessage(error, "Error fetching ingest pipeline"));
    }
  }

  static async batchRetryEvents(
    potId: string,
    eventIds: string[],
  ): Promise<{
    status: string;
    pot_id: string;
    batch_id: string | null;
    event_ids: string[];
    count: number;
  }> {
    const headers = await getHeaders();
    try {
      const response = await axios.post(
        `${baseUrl()}/api/v1/context/pots/${encodeURIComponent(potId)}/events/batch-retry`,
        { event_ids: eventIds },
        { headers },
      );
      return response.data as {
        status: string;
        pot_id: string;
        batch_id: string | null;
        event_ids: string[];
        count: number;
      };
    } catch (error) {
      throw new Error(errorMessage(error, "Error re-queuing events"));
    }
  }

  static async submitRawIngestion(
    potId: string,
    body: {
      name: string;
      content?: string;
      url?: string;
      repo_name?: string;
      source_description?: string;
      wait_for_terminal?: boolean;
    },
  ): Promise<RawIngestionResult> {
    const headers = await getHeaders();
    try {
      const response = await axios.post(
        `${baseUrl()}/api/v1/context/pots/${potId}/ingest/raw`,
        body,
        { headers },
      );
      return response.data as RawIngestionResult;
    } catch (error) {
      throw new Error(errorMessage(error, "Error submitting ingestion"));
    }
  }

  static async getProjectGraph(
    potId: string,
    body: {
      repo_name?: string;
      services?: string[];
      features?: string[];
      environment?: string;
      user?: string;
      include?: string[];
      pr_number?: number;
      limit?: number;
      raw?: boolean;
    } = {},
  ): Promise<ProjectGraph> {
    // Topology is served by the `infra_topology` P9 reader (the structural
    // `project_graph` reader + per-family include buckets were removed with
    // Graphiti). Each returned item is a canonical edge; we rebuild the
    // {nodes, edges} graph from them. `infra_topology` ignores repo_name /
    // pr_number / features; `services` anchors the traversal (empty = full
    // project topology) and `environment` filters it.
    //
    // `raw: true` switches to the `raw_graph` read — the WHOLE canonical
    // partition incl. generic RELATED_TO edges and soft-downgraded data — so
    // the explorer can show pots whose edges aren't (yet) canonical topology.
    const limit = body.limit ?? 25;
    const envelope = await this.queryContextGraph<AgentEnvelopeResult>({
      pot_id: potId,
      goal: "retrieve",
      strategy: "auto",
      include: [body.raw ? "raw_graph" : "infra_topology"],
      limit,
      scope: {
        ...(body.services && body.services.length
          ? { services: body.services }
          : {}),
        ...(body.environment ? { environment: body.environment } : {}),
      },
    });
    return topologyEnvelopeToProjectGraph(envelope.result, potId, limit);
  }


  static async queryContextGraph<T = unknown>(
    body: ContextGraphQuery,
  ): Promise<ContextGraphResult<T>> {
    const headers = await getHeaders();
    try {
      const response = await axios.post(
        `${baseUrl()}/api/v1/context/query/context-graph`,
        {
          source_policy: "references_only",
          budget: { max_items: body.limit ?? body.budget?.max_items ?? 12 },
          ...body,
          scope: body.scope ?? {},
        },
        { headers },
      );
      const envelope = response.data as ContextGraphResult<T>;
      if (envelope.error) {
        throw new Error(envelope.error);
      }
      return envelope;
    } catch (error) {
      throw new Error(errorMessage(error, "Error querying context graph"));
    }
  }
}
