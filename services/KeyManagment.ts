import axios from "axios";
import getHeaders from "@/app/utils/headers.util";
import { generateHmacSignature } from "@/app/utils/hmac.util";

export default class KeyManagmentService {
  static async ListAvailableLLM() {
    try {
      const headers = await getHeaders();
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/v1/list-available-llms/`,
        {
          headers,
        }
      );
      return response.data as {
        id: "string";
        name: "string";
        description: "string";
      }[];
    } catch (error) {
      console.log("Error fetching LLM's:", error);
    }
  }
  static async GetPrefferredLLM({ userId }: { userId: string }) {
    try {
      const headers = await getHeaders();
      const hmacSignature = generateHmacSignature(userId);
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/v1/get-preferred-llm/`,
        {
          headers: {
            ...headers,
            "X-Hmac-Signature": hmacSignature,
          },
        }
      );
      console.log(response.data);
      return response.data as {
        preferred_llm: "string";
        model_type: "string";
      };
    } catch (error) {
      console.log("Error fetching LLM's:", error);
    }
  }
  static async SetGlobalAiProvider(provider: string) {
    try {
      const headers = await getHeaders();
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/v1/set-global-ai-provider/`,
        {
          provider,
        },
        {
          headers,
        }
      );
      return response.data;
    } catch (error) {
      console.log("Error Setting Provider:", error);
    }
  }
  static async GetSecreteForProvider (provider: string) {
    try {
      const headers = await getHeaders();
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/v1/secrets/${provider}`,
        {
          headers,
        }
      );
      return response.data;
    } catch (error) {
      console.log("Error getting Provider:", error);
    }
  }
  static async CreateSecret ({api_key, provider}: {api_key: string, provider: string}) {
    try {
      const headers = await getHeaders();
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/v1/secrets`,
        {
          api_key,
          provider
        },
        {
          headers,
        }
      );
      return response.data;
    } catch (error) {
      console.log("Error getting Provider:", error);
    }
  }
  static async UpdateSecret ({api_key, provider}: {api_key: string, provider: string}) {
    try {
      const headers = await getHeaders();
      const response = await axios.put(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/v1/secrets`,
        {
          api_key,
          provider
        },
        {
          headers,
        }
      );
      return response.data;
    } catch (error) {
      console.log("Error getting Provider:", error);
    }
  }
}
