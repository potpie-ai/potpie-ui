import axios from "axios";
import getHeaders from "@/app/utils/headers.util";

const baseUrl = () => process.env.NEXT_PUBLIC_BASE_URL;

export interface SourceConnection {
  provider: string;
  kind: string;
  connected: boolean;
  integration_id: string | null;
  name: string | null;
}

export interface LinearTeam {
  id: string;
  name: string;
  key?: string;
}

export interface ProjectSourceRow {
  id: string;
  provider: string;
  source_kind: string;
  scope_json: Record<string, unknown>;
  sync_enabled: boolean;
  last_sync_at: string | null;
  last_error: string | null;
  health_score: number | null;
  integration_id: string | null;
}

/**
 * Unified Sources API (/api/v1/sources/*) — Linear team ↔ project linking.
 */
export default class SourcesService {
  static async getConnections(): Promise<SourceConnection[]> {
    const headers = await getHeaders();
    const res = await axios.get<{ connections: SourceConnection[] }>(
      `${baseUrl()}/api/v1/sources/connections`,
      { headers }
    );
    return res.data.connections ?? [];
  }

  static async getLinearTeams(integrationId: string): Promise<LinearTeam[]> {
    const headers = await getHeaders();
    const res = await axios.get<{ teams: LinearTeam[] }>(
      `${baseUrl()}/api/v1/sources/linear/teams`,
      {
        headers,
        params: { integration_id: integrationId },
      }
    );
    return res.data.teams ?? [];
  }

  static async attachLinearTeam(
    projectId: string,
    body: {
      integration_id: string;
      team_id: string;
      team_name?: string | null;
    }
  ): Promise<{ id: string; provider: string; scope_json: Record<string, unknown> }> {
    const headers = await getHeaders();
    const res = await axios.post(
      `${baseUrl()}/api/v1/sources/projects/${encodeURIComponent(projectId)}/sources/linear`,
      {
        integration_id: body.integration_id,
        team_id: body.team_id,
        team_name: body.team_name ?? undefined,
      },
      { headers }
    );
    return res.data;
  }

  static async getProjectSources(projectId: string): Promise<ProjectSourceRow[]> {
    const headers = await getHeaders();
    const res = await axios.get<{ sources: ProjectSourceRow[] }>(
      `${baseUrl()}/api/v1/sources/projects/${encodeURIComponent(projectId)}/sources`,
      { headers }
    );
    return res.data.sources ?? [];
  }

  static async syncProjectSources(projectId: string): Promise<unknown> {
    const headers = await getHeaders();
    const res = await axios.post(
      `${baseUrl()}/api/v1/sources/projects/${encodeURIComponent(projectId)}/sources/sync`,
      {},
      { headers }
    );
    return res.data;
  }
}
