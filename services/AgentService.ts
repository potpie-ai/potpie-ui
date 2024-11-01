import axios from "axios";
import getHeaders from "@/app/utils/headers.util";

export default class AgentService {

    static async getAgentTypes() {
        const headers = await getHeaders();
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
        try {
            const response = await axios.get(`${baseUrl}/api/v1/list-available-agents/`, {
                headers: headers,
            });
            return response.data;
        } catch (error) {
            throw new Error("Error fetching agent types");
        }
    }

    static async getAgentStatus(agentId: string) {
        const headers = await getHeaders();
        const baseUrl = process.env.NEXT_PUBLIC_POTPIE_PLUS_URL;
        try {
            const response = await axios.get(`${baseUrl}/deployment/agents/${agentId}/status`, {
                headers: headers,
            });
            return response.data.status;
        } catch (error) {
            throw new Error("Error fetching agent status");
        }
    }

}
