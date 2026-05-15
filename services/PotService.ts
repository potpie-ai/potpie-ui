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

export type ContextSearchResult = {
  uuid: string;
  name?: string | null;
  summary?: string | null;
  fact?: string | null;
  source_refs?: Array<string | Record<string, unknown>>;
  score?: number | null;
  created_at?: string;
  valid_at?: string;
  invalid_at?: string;
  expired_at?: string;
};

export type ContextGraphGoal =
  | "retrieve"
  | "answer"
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
  source_policy?: "references_only" | "summary" | "snippets" | "verify" | string;
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
};

// ---- Graph overview + project graph (used by the Graph tab) -----------------

export type GraphLabelRow = {
  label: string;
  category: string;
  description: string;
  count: number;
  required_properties: string[];
  lifecycle_states: string[];
  populated: boolean;
};

export type GraphCategoryRow = {
  category: string;
  label_count: number;
  populated_label_count: number;
  entity_count: number;
  labels: GraphLabelRow[];
};

export type GraphEdgeRow = {
  edge_type: string;
  count: number;
  description?: string;
  predicate_family: string | null;
  populated?: boolean;
};

export type PredicateFamilyRow = {
  family: string;
  members: string[];
  count: number;
};

export type TopEntityRow = {
  entity_key: string;
  labels: string[];
  name: string | null;
  degree: number;
};

export type GraphOverview = {
  pot_id: string;
  message: string;
  ontology_version: string;
  totals: {
    entities: number;
    edges: number;
    entities_without_canonical_label: number;
    canonical_entities: number;
    canonical_edges: number;
    drift_edges: number;
  };
  schema_coverage: {
    populated_labels: number;
    total_labels: number;
    coverage_ratio: number;
    drift_ratio: number;
    by_category: GraphCategoryRow[];
    by_label: GraphLabelRow[];
    unknown_labels: Record<string, number>;
  };
  edge_coverage: {
    canonical: GraphEdgeRow[];
    non_canonical: GraphEdgeRow[];
    predicate_families: PredicateFamilyRow[];
  };
  lifecycle_distribution: Record<string, number>;
  top_entities_by_degree: TopEntityRow[];
  open_conflicts: Array<Record<string, unknown>>;
};

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

  static async getGraphOverview(
    potId: string,
    options: { top_entities_limit?: number } = {},
  ): Promise<GraphOverview> {
    const envelope = await this.queryContextGraph<GraphOverview>({
      pot_id: potId,
      goal: "aggregate",
      strategy: "exact",
      include: ["graph_overview"],
      limit: options.top_entities_limit ?? 20,
    });
    return envelope.result;
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
    } = {},
  ): Promise<ProjectGraph> {
    // The Phase 3 reader registry treats `include` as reader-family routing;
    // prepend the `project_graph` family so the structural traversal reader
    // is invoked. The reader itself still consumes the remaining keys as
    // project-map label buckets (service_map, feature_map, deployments, …).
    const userIncludes = (body.include ?? []).filter((k) => k !== "project_graph");
    const include = ["project_graph", ...userIncludes];
    const envelope = await this.queryContextGraph<ProjectGraph>({
      pot_id: potId,
      goal: "neighborhood",
      strategy: "traversal",
      include,
      limit: body.limit ?? 25,
      scope: {
        services: body.services ?? [],
        features: body.features ?? [],
        ...(body.repo_name ? { repo_name: body.repo_name } : {}),
        ...(body.environment ? { environment: body.environment } : {}),
        ...(body.user ? { user: body.user } : {}),
        ...(body.pr_number ? { pr_number: body.pr_number } : {}),
      },
    });
    // With multiple registered families the registry returns
    // `{ kind: "multi", result: { <family>: payload } }`. Defensively unwrap
    // the project_graph leg so callers always see the same shape.
    const raw = envelope.result as ProjectGraph | Record<string, ProjectGraph>;
    if (raw && typeof raw === "object" && !Array.isArray((raw as ProjectGraph).nodes)) {
      const multi = raw as Record<string, ProjectGraph>;
      if (multi.project_graph && Array.isArray(multi.project_graph.nodes)) {
        return multi.project_graph;
      }
    }
    return raw as ProjectGraph;
  }

  static async searchContext(
    potId: string,
    body: {
      query: string;
      limit?: number;
      node_labels?: string[];
      repo_name?: string;
      source_description?: string;
      include_invalidated?: boolean;
      as_of?: string;
    },
  ): Promise<ContextSearchResult[]> {
    const envelope = await this.queryContextGraph<ContextSearchResult[]>({
      pot_id: potId,
      query: body.query,
      goal: "retrieve",
      strategy: "semantic",
      include: ["semantic_search"],
      limit: body.limit ?? 8,
      scope: {
        ...(body.repo_name ? { repo_name: body.repo_name } : {}),
      },
      node_labels: body.node_labels ?? [],
      source_descriptions: body.source_description ? [body.source_description] : [],
      include_invalidated: body.include_invalidated ?? false,
      ...(body.as_of ? { as_of: body.as_of } : {}),
    });
    return envelope.result;
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
