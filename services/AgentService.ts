import axios, { AxiosResponse } from "axios";
import getHeaders from "@/app/utils/headers.util";
import { CustomAgentsFormValues } from "@/lib/Schema";
import { generateHmacSignature } from "@/app/utils/hmac.util";

export default class AgentService {
  static async getAgentTypes() {
    const headers = await getHeaders();
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
    try {
      const response = await axios.get(
        `${baseUrl}/api/v1/list-available-agents/`,
        {
          headers: headers,
        }
      );
      return response.data;
    } catch (error) {
      throw new Error("Error fetching agent types");
    }
  }

  static async getAgentList(includePublic = false, includeShared = false) {
    const headers = await getHeaders();
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
    try {
      console.log("Fetching agent list with params:", { includePublic, includeShared });
      const response: any = await axios.get(
        `${baseUrl}/api/v1/list-available-agents/`,
        { 
          params: { 
            list_system_agents: false,
            include_public: includePublic,
            include_shared: includeShared 
          }, 
          headers: headers 
        }
      );
      console.log("Agent list response:", response.data);
      
      // Log visibility information for each agent
      if (response.data && Array.isArray(response.data)) {
        response.data.forEach((agent: any) => {
          console.log(`Agent ${agent.id} (${agent.name}) visibility: ${agent.visibility}`);
        });
      }
      
      return response.data;
    } catch (error) {
      throw new Error("Error fetching agent types");
    }
  }

  static async updateAgent(
    agentId: string,
    customAgentData: CustomAgentsFormValues
  ) {
    const headers = await getHeaders();
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
    try {
      const response = await axios.put(
        `${baseUrl}/api/v1/custom-agents/agents/${agentId}`,
        customAgentData,
        { headers }
      );
      return response.data as AxiosResponse<CustomAgentType, any>;
    } catch (error) {
      throw new Error("Error updating agent");
    }
  }

  static async createAgent(customAgentData: CustomAgentsFormValues) {
    const headers = await getHeaders();
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
    try {
      const response = await axios.post(
        `${baseUrl}/api/v1/custom-agents/agents/`,
        customAgentData,
        {
          headers,
        }
      );
      return response.data as AxiosResponse<CustomAgentType, any>;
    } catch (error) {
      throw new Error("Error creating agent");
    }
  }

  static async redeployAgent(
    agentId: string,
  ) {
    const headers = await getHeaders();
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
    try {
      const response = await axios.post(
        `${baseUrl}/deployment/agents/${agentId}/redeploy`,{},{
          headers
        });
      return response.data as AxiosResponse<
        {
          agent_id: "string";
          deployment_url: "string";
        },
        any
      >;
    } catch (error) {
      throw new Error("Error redeploying agent");
    }
  }

  static async createAgentFromPrompt(prompt: string) {
    const headers = await getHeaders();
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
    try {
      const response = await axios.post(
        `${baseUrl}/api/v1/custom-agents/agents/auto/`,
        { prompt },
        { headers }
      );
      return response.data;
    } catch (error) {
      throw new Error("Error creating agent from prompt");
    }
  }

  static async getAgentDetails(agentId: string, userId: string) {
    const headers = await getHeaders();
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
    const hmacSignature = generateHmacSignature(userId);
    
    try {
      const response = await axios.get(
        `${baseUrl}/api/v1/custom-agents/agents/${agentId}`,
        {
          headers: {
            ...headers,
            'X-Hmac-Signature': hmacSignature
          },
          params: {
            user_id: userId,
          },
        }
      );
      return response.data;
    } catch (error) {
      console.error("Error fetching agent details:", error);
      throw new Error("Error fetching agent details");
    }
  }

  // New methods for agent sharing functionality
  static async setAgentVisibility(agentId: string, visibility: "private" | "public" | "shared") {
    const headers = await getHeaders();
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
    try {
      console.log(`Setting agent ${agentId} visibility to:`, visibility);
      const response = await axios.post(
        `${baseUrl}/api/v1/custom-agents/agents/share`,
        {
          agent_id: agentId,
          visibility: visibility
        },
        { headers }
      );
      console.log("Set visibility API response:", response.data);
      return response.data;
    } catch (error) {
      console.error("API Error updating agent visibility:", error);
      throw new Error("Error updating agent visibility");
    }
  }

  static async shareAgentWithEmail(agentId: string, email: string) {
    const headers = await getHeaders();
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
    try {
      const response = await axios.post(
        `${baseUrl}/api/v1/custom-agents/agents/share`,
        {
          agent_id: agentId,
          visibility: "shared",
          shared_with_email: email
        },
        { headers }
      );
      return response.data;
    } catch (error) {
      throw new Error("Error sharing agent with email");
    }
  }

  static async revokeAgentAccess(agentId: string, email: string) {
    const headers = await getHeaders();
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
    try {
      const response = await axios.post(
        `${baseUrl}/api/v1/custom-agents/agents/revoke-access`,
        {
          agent_id: agentId,
          user_email: email
        },
        { headers }
      );
      return response.data;
    } catch (error) {
      throw new Error("Error revoking agent access");
    }
  }

  static async getSharedAgentsDetails(agentId: string) {
    const headers = await getHeaders();
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
    try {
      console.log(`Fetching sharing details for agent ${agentId}`);
      const response = await axios.get(
        `${baseUrl}/api/v1/custom-agents/agents/${agentId}/shares`,
        { headers }
      );
      console.log("Agent sharing details API response:", response.data);
      return response.data;
    } catch (error) {
      console.error("API Error fetching shared agent details:", error);
      throw new Error("Error fetching shared agent details");
    }
  }
}
