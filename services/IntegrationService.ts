import axios from "axios";
import getHeaders from "@/app/utils/headers.util";
import { parseApiError } from "@/lib/utils";

export interface ConnectedIntegrationResponse {
  status: string;
  count: number;
  connected_integrations: {
    [key: string]: {
      integration_id: string;
      name: string;
      active: boolean;
      integration_type: string;
      id: string;
      auth_data: {
        code: string;
        installation_id: string;
        org_slug: string;
        access_token: string;
        refresh_token: string;
        token_type: string;
        expires_at: string | null;
      };
      scope_data: {
        org_slug: string;
        installation_id: string;
      };
      metadata: {
        instance_name: string;
        created_via: string;
        timestamp: string;
        webhooks?: Array<{
          id: number | string;
          url: string;
          site_id?: string;
        }>;
        [key: string]: any;
      };
      unique_identifier: string;
      created_by: string;
      created_at: string;
      updated_at: string;
    };
  };
}

export interface ConnectedIntegration {
  id: string;
  integration_id: string;
  name: string;
  type: string;
  instanceName: string;
  status: "active" | "error" | "connecting";
  lastSync?: string;
  errorMessage?: string;
  config: Record<string, string>;
  orgSlug?: string;
  installationId?: string;
  uniqueIdentifier?: string;
  createdAt: string;
  updatedAt: string;
  metadata?: {
    instance_name: string;
    created_via: string;
    timestamp?: string;
    webhooks?: Array<{
      id: number | string;
      url: string;
      site_id?: string;
    }>;
    [key: string]: any;
  };
}

export default class IntegrationService {
  static async getConnectedIntegrations(): Promise<ConnectedIntegration[]> {
    const headers = await getHeaders();
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;

    try {
      const response = await axios.get<ConnectedIntegrationResponse>(
        `${baseUrl}/api/v1/integrations/connected`,
        {
          headers: headers,
        }
      );

      // Transform the API response to match the component's expected format
      const connectedIntegrations: ConnectedIntegration[] = Object.values(
        response.data.connected_integrations
      ).map((integration) => ({
        id: integration.integration_id, // Use integration_id as the id
        integration_id: integration.integration_id,
        name: integration.name,
        type: integration.integration_type,
        instanceName: integration.metadata.instance_name,
        status: integration.active ? "active" : "error",
        lastSync: this.formatLastSync(integration.updated_at),
        config: {
          org_slug: integration.scope_data.org_slug,
          installation_id: integration.scope_data.installation_id,
        },
        orgSlug: integration.scope_data.org_slug,
        installationId: integration.scope_data.installation_id,
        uniqueIdentifier: integration.unique_identifier,
        createdAt: integration.created_at,
        updatedAt: integration.updated_at,
        metadata: integration.metadata,
      }));

      return connectedIntegrations;
    } catch (error) {
      const errorMessage = parseApiError(error);
      throw new Error(errorMessage);
    }
  }

  // Linear OAuth methods removed - using backend-only approach
  // The backend handles all OAuth flow, frontend just redirects to backend endpoints

  static async deleteIntegration(integrationId: string): Promise<void> {
    const headers = await getHeaders();
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;

    try {
      await axios.delete(`${baseUrl}/api/v1/integrations/${integrationId}`, {
        headers: headers,
      });
    } catch (error) {
      const errorMessage = parseApiError(error);
      throw new Error(errorMessage);
    }
  }

  static async updateIntegrationName(
    integrationId: string,
    name: string
  ): Promise<void> {
    const headers = await getHeaders();
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;

    try {
      await axios.put(
        `${baseUrl}/api/v1/integrations/schema/${integrationId}`,
        {
          name: name,
        },
        {
          headers: headers,
        }
      );
    } catch (error) {
      const errorMessage = parseApiError(error);
      throw new Error(errorMessage);
    }
  }

  static async checkLinearIntegrationStatus(userId: string): Promise<any> {
    const headers = await getHeaders();
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;

    try {
      const response = await axios.get(
        `${baseUrl}/api/v1/integrations/linear/status/${userId}`,
        {
          headers: headers,
        }
      );

      return response.data;
    } catch (error) {
      const errorMessage = parseApiError(error);
      throw new Error(errorMessage);
    }
  }

  static async revokeLinearIntegration(userId: string): Promise<any> {
    const headers = await getHeaders();
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;

    try {
      const response = await axios.delete(
        `${baseUrl}/api/v1/integrations/linear/revoke/${userId}`,
        {
          headers: headers,
        }
      );

      return response.data;
    } catch (error) {
      const errorMessage = parseApiError(error);
      throw new Error(errorMessage);
    }
  }

  static async checkSlackIntegrationStatus(userId: string): Promise<any> {
    const headers = await getHeaders();
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;

    try {
      const response = await axios.get(
        `${baseUrl}/api/v1/integrations/slack/status/${userId}`,
        {
          headers: headers,
        }
      );

      return response.data;
    } catch (error) {
      const errorMessage = parseApiError(error);
      throw new Error(errorMessage);
    }
  }

  static async revokeSlackIntegration(userId: string): Promise<any> {
    const headers = await getHeaders();
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;

    try {
      const response = await axios.delete(
        `${baseUrl}/api/v1/integrations/slack/revoke/${userId}`,
        {
          headers: headers,
        }
      );

      return response.data;
    } catch (error) {
      const errorMessage = parseApiError(error);
      throw new Error(errorMessage);
    }
  }

  static async checkJiraIntegrationStatus(userId: string): Promise<any> {
    const headers = await getHeaders();
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;

    try {
      const response = await axios.get(
        `${baseUrl}/api/v1/integrations/jira/status/${userId}`,
        {
          headers: headers,
        }
      );

      return response.data;
    } catch (error) {
      const errorMessage = parseApiError(error);
      throw new Error(errorMessage);
    }
  }

  static async revokeJiraIntegration(userId: string): Promise<any> {
    const headers = await getHeaders();
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;

    try {
      const response = await axios.delete(
        `${baseUrl}/api/v1/integrations/jira/revoke/${userId}`,
        {
          headers: headers,
        }
      );

      return response.data;
    } catch (error) {
      const errorMessage = parseApiError(error);
      throw new Error(errorMessage);
    }
  }

  static async getJiraProjects(
    integrationId: string,
    startAt: number = 0,
    maxResults: number = 50
  ): Promise<any> {
    const headers = await getHeaders();
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;

    try {
      const response = await axios.get(
        `${baseUrl}/api/v1/integrations/jira/${integrationId}/projects`,
        {
          headers: headers,
          params: {
            start_at: startAt,
            max_results: maxResults,
          },
        }
      );

      return response.data;
    } catch (error) {
      const errorMessage = parseApiError(error);
      throw new Error(errorMessage);
    }
  }

  static async checkConfluenceIntegrationStatus(userId: string): Promise<any> {
    const headers = await getHeaders();
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;

    try {
      const response = await axios.get(
        `${baseUrl}/api/v1/integrations/confluence/status/${userId}`,
        {
          headers: headers,
        }
      );

      return response.data;
    } catch (error) {
      const errorMessage = parseApiError(error);
      throw new Error(errorMessage);
    }
  }

  static async revokeConfluenceIntegration(userId: string): Promise<any> {
    const headers = await getHeaders();
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;

    try {
      const response = await axios.delete(
        `${baseUrl}/api/v1/integrations/confluence/revoke/${userId}`,
        {
          headers: headers,
        }
      );

      return response.data;
    } catch (error) {
      const errorMessage = parseApiError(error);
      throw new Error(errorMessage);
    }
  }

  private static formatLastSync(updatedAt: string): string {
    const now = new Date();
    const updated = new Date(updatedAt);
    const diffInMinutes = Math.floor(
      (now.getTime() - updated.getTime()) / (1000 * 60)
    );

    if (diffInMinutes < 1) {
      return "Just now";
    } else if (diffInMinutes < 60) {
      return `${diffInMinutes} minute${diffInMinutes === 1 ? "" : "s"} ago`;
    } else if (diffInMinutes < 1440) {
      const hours = Math.floor(diffInMinutes / 60);
      return `${hours} hour${hours === 1 ? "" : "s"} ago`;
    } else {
      const days = Math.floor(diffInMinutes / 1440);
      return `${days} day${days === 1 ? "" : "s"} ago`;
    }
  }
}
