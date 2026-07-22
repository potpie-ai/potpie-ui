import axios from "axios";
import getHeaders from "@/app/utils/headers.util";
import {
  getDemoAcceptedInvitation,
  getDemoContextGraphResult,
  getDemoDeclinedInvitation,
  getDemoEvent,
  getDemoEventPage,
  getDemoGraphOverview,
  getDemoIngestionConfig,
  getDemoIngestPipeline,
  getDemoIntegrations,
  getDemoInvitation,
  getDemoInvitations,
  getDemoMembers,
  getDemoPatchedPot,
  getDemoPotTimeline,
  getDemoProjectGraph,
  getDemoRawIngestionResult,
  getDemoRepositories,
  getDemoSourcePatched,
  getDemoSources,
  isDemoEventId,
  isDemoInviteToken,
  isDemoPotId,
} from "@/lib/mock/demoPots";

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

// ---- Activity timeline ------------------------------------------------------

/** Lightweight pointer to another graph entity (person, repo, service, …). */
export type TimelineEntityRef = {
  key: string;
  name: string;
  labels: string[];
};

/**
 * One event on the pot's activity timeline. The backend timeline reader
 * returns a thin claim row (title/verb/keys); the demo pots enrich it with
 * everything the mock graph knows (actor, summary, touched entities), so all
 * fields beyond the core set are optional and the UI degrades gracefully.
 */
export type TimelineActivity = {
  id: string;
  activity_key: string;
  /** Event time (occurred_at of the source event), ISO 8601. */
  timestamp: string | null;
  /** Event kind, e.g. "pr_merged", "deploy_succeeded", "alert_fired". */
  verb_class: string | null;
  title: string | null;
  activity_type?: string | null;
  summary?: string | null;
  description?: string | null;
  actor?: TimelineEntityRef | null;
  repo_name?: string | null;
  url?: string | null;
  number?: number | null;
  state?: string | null;
  touched?: TimelineEntityRef[];
  mentions?: TimelineEntityRef[];
  source_system?: string | null;
  source_ref?: string | null;
  evidence_strength?: number | null;
  score?: number | null;
};

export type PotTimeline = {
  pot_id: string;
  items: TimelineActivity[];
  window: { since: string | null; until: string | null };
};

export type PotTimelineOptions = {
  services?: string[];
  /** Relative lookback ('24h', '7d', '30d', …); ignored when `since` is set. */
  window?: string;
  since?: string;
  until?: string;
  verbClasses?: string[];
  limit?: number;
  includeInvalidated?: boolean;
};

function refNameFromKey(key: string): string {
  const idx = key.indexOf(":");
  return idx >= 0 ? key.slice(idx + 1) : key;
}

/** Map a thin backend timeline row onto the UI's TimelineActivity shape. */
function normalizeTimelineItem(row: Record<string, unknown>): TimelineActivity {
  const str = (v: unknown) => (typeof v === "string" && v ? v : null);
  const predicate = (str(row.predicate) ?? "").toUpperCase();
  const subjectKey = str(row.subject_key);
  const objectKey = str(row.object_key);
  // For PERFORMED / AUTHORED the subject is the person acting; for
  // TOUCHED / MENTIONS the object is the entity the activity touched.
  const actorKey =
    predicate === "PERFORMED" || predicate === "AUTHORED" ? subjectKey : null;
  const touchedKey =
    predicate === "TOUCHED" || predicate === "MENTIONS" ? objectKey : null;
  return {
    id: str(row.id) ?? str(row.activity_key) ?? crypto.randomUUID(),
    activity_key: str(row.activity_key) ?? str(row.id) ?? "",
    timestamp: str(row.timestamp),
    verb_class: str(row.verb_class),
    title: str(row.title),
    actor: actorKey
      ? { key: actorKey, name: refNameFromKey(actorKey), labels: ["Person"] }
      : null,
    touched: touchedKey
      ? [{ key: touchedKey, name: refNameFromKey(touchedKey), labels: [] }]
      : [],
    source_system: str(row.source_system),
    source_ref: str(row.source_ref),
    evidence_strength:
      typeof row.evidence_strength === "number" ? row.evidence_strength : null,
    score: typeof row.score === "number" ? row.score : null,
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
    if (isDemoPotId(potId)) return getDemoPatchedPot(potId, body);
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
    if (isDemoPotId(potId)) return getDemoRepositories(potId);
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
    if (isDemoPotId(potId)) {
      return { ok: true, repo_name: `${body.owner}/${body.repo}`, demo: true };
    }
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
    if (isDemoPotId(potId)) return { ok: true, id: repositoryId, demo: true };
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
    if (isDemoPotId(potId)) return getDemoMembers(potId);
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
    if (isDemoPotId(potId)) return { ok: true, user_id: memberUserId, demo: true };
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
    if (isDemoPotId(potId)) return getDemoInvitations(potId);
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
    if (isDemoPotId(potId)) return getDemoInvitation(potId, body.email);
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
    if (isDemoPotId(potId)) return { ok: true, id: invitationId, demo: true };
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
    if (isDemoPotId(potId)) {
      return { ok: true, invitation_id: invitationId };
    }
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
    if (isDemoInviteToken(token)) return getDemoAcceptedInvitation(token);
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
    if (isDemoInviteToken(token)) return getDemoDeclinedInvitation(token);
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
    if (isDemoPotId(potId)) return getDemoSources(potId);
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
    if (isDemoPotId(potId)) {
      const [source] = getDemoSources(potId);
      return {
        id: source.id,
        repository_id: `repo-${body.owner}-${body.repo}`,
        source,
        already_attached: true,
      };
    }
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
    if (isDemoPotId(potId)) return { ok: true, id: sourceId, demo: true };
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
    if (isDemoPotId(potId)) return getDemoSourcePatched(potId, sourceId, body);
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
    if (isDemoPotId(potId)) return [];
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
    if (isDemoPotId(potId)) {
      const [source] = getDemoSources(potId);
      return { id: source.id, source, already_attached: true };
    }
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
    if (isDemoPotId(potId)) return getDemoIntegrations(potId);
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
    if (isDemoPotId(potId)) {
      return getDemoEventPage(potId, {
        status: options.status,
        source_system: options.source_system,
        from_date: options.from_date,
        to_date: options.to_date,
        q: options.q,
      });
    }
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
    if (isDemoEventId(eventId)) return getDemoEvent(eventId);
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
    if (isDemoEventId(eventId)) {
      return { status: "queued", event_id: eventId, batch_id: null };
    }
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
    if (isDemoPotId(potId)) return getDemoIngestionConfig(potId);
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
    if (isDemoPotId(potId)) {
      return {
        pot_id: potId,
        mode: body.mode,
        window_minutes: body.window_minutes,
        min_batch_size: body.min_batch_size ?? null,
      };
    }
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
    if (isDemoPotId(potId)) {
      return { pot_id: potId, batch_id: `flush-${potId.slice(0, 8)}`, status: "flushed" };
    }
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
    if (isDemoPotId(potId)) return getDemoIngestPipeline(potId);
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
    if (isDemoPotId(potId)) {
      return {
        status: "queued",
        pot_id: potId,
        batch_id: `batch-${potId.slice(0, 8)}`,
        event_ids: eventIds,
        count: eventIds.length,
      };
    }
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
    if (isDemoPotId(potId)) return getDemoRawIngestionResult(potId);
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
    if (isDemoPotId(potId)) return getDemoGraphOverview(potId);
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
    if (isDemoPotId(potId)) return getDemoProjectGraph(potId);
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

  static async getPotTimeline(
    potId: string,
    options: PotTimelineOptions = {},
  ): Promise<PotTimeline> {
    if (isDemoPotId(potId)) return getDemoPotTimeline(potId, options);
    const headers = await getHeaders();
    const params = new URLSearchParams();
    for (const s of options.services ?? []) params.append("service", s);
    // "all" is a UI-only value — the backend has no unbounded window, so an
    // explicit epoch `since` (which overrides `window`) opens it fully.
    if (options.since) params.set("since", options.since);
    else if (options.window === "all")
      params.set("since", "1970-01-01T00:00:00Z");
    else if (options.window) params.set("window", options.window);
    if (options.until) params.set("until", options.until);
    for (const v of options.verbClasses ?? []) params.append("verb_class", v);
    if (options.limit) params.set("limit", String(options.limit));
    if (options.includeInvalidated) params.set("include_invalidated", "true");
    try {
      const response = await axios.get(
        `${baseUrl()}/api/v1/context/pots/${encodeURIComponent(potId)}/timeline?${params.toString()}`,
        { headers },
      );
      const data = response.data as {
        pot_id: string;
        items?: Array<Record<string, unknown>>;
        window?: { since: string | null; until: string | null };
      };
      return {
        pot_id: data.pot_id,
        items: (data.items ?? []).map(normalizeTimelineItem),
        window: data.window ?? { since: null, until: null },
      };
    } catch (error) {
      throw new Error(errorMessage(error, "Error loading activity timeline"));
    }
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
    if (isDemoPotId(body.pot_id)) return getDemoContextGraphResult<T>(body);
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
