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

}
