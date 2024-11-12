import axios, { AxiosResponse } from "axios";
import getHeaders from "@/app/utils/headers.util";
import { CustomAgentsFormValues } from "@/lib/Schema";

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

  static async getAgentStatus(agentId: string) {
    const headers = await getHeaders();
    const baseUrl = process.env.NEXT_PUBLIC_POTPIE_PLUS_URL;
    try {
      const response = await axios.get(
        `${baseUrl}/deployment/agents/${agentId}/status`,
        {
          headers: headers,
        }
      );
      return response.data.status;
    } catch (error) {
      console.log(error);
    }
  }

  static async getAgentList() {
    const headers = await getHeaders();
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
    try {
      const response: any = await axios.get(
        `${baseUrl}/api/v1/list-available-agents/`,
        { params: { list_system_agents: false }, headers: headers }
      );
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
    const baseUrl = process.env.NEXT_PUBLIC_POTPIE_PLUS_URL;
    try {
      const response = await axios.put(
        `${baseUrl}/custom-agents/agents/${agentId}`,
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
    const baseUrl = process.env.NEXT_PUBLIC_POTPIE_PLUS_URL;
    try {
      const response = await axios.post(
        `${baseUrl}/custom-agents/agents/`,
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
    const baseUrl = process.env.NEXT_PUBLIC_POTPIE_PLUS_URL;
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
}
