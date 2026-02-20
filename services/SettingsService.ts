import axios from "axios";
import getHeaders from "@/app/utils/headers.util";

export default class SettingsService {
  static async getApiKey(): Promise<{ api_key: string }> {
    const headers = await getHeaders();
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
    try {
      const response = await axios.get<{ api_key: string }>(
        `${baseUrl}/api/v1/api-keys`,
        { headers }
      );
      return response.data;
    } catch (error) {
      throw new Error("Error fetching API key");
    }
  }

  static async generateApiKey(): Promise<{ api_key: string }> {
    const headers = await getHeaders();
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
    try {
      const response = await axios.post<{ api_key: string }>(
        `${baseUrl}/api/v1/api-keys`,
        {},
        { headers }
      );
      return response.data;
    } catch (error) {
      throw new Error("Error generating API key");
    }
  }

  static async getSecrets(): Promise<{
    inference_config: { api_key: string; provider?: string };
  }> {
    const headers = await getHeaders();
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
    try {
      const response = await axios.get(
        `${baseUrl}/api/v1/secrets/all`,
        { headers }
      );
      return response.data;
    } catch (error) {
      throw new Error("Error fetching secrets");
    }
  }

  static async saveProviderKey(provider: string, api_key: string): Promise<void> {
    const headers = await getHeaders();
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
    try {
      await axios.post(
        `${baseUrl}/api/v1/secrets`,
        { inference_config: { api_key, provider } },
        { headers }
      );
    } catch (error) {
      throw new Error("Error saving provider key");
    }
  }
}
