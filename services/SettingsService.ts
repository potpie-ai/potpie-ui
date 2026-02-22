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
    chat_config: { provider: string; model: string; api_key: string } | null;
    inference_config: { provider: string; model: string; api_key: string } | null;
    integration_keys: Array<{ service: string; api_key: string }>;
  } | null> {
    const headers = await getHeaders();
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
    try {
      const response = await axios.get(
        `${baseUrl}/api/v1/secrets/all`,
        { headers }
      );
      return response.data;
    } catch (error: any) {
      // 404 means no secrets have been saved yet — treat as empty
      if (error?.response?.status === 404) return null;
      throw new Error("Error fetching secrets");
    }
  }

  // Default models used when saving a provider key for the first time.
  // The backend requires model in "provider/model_name" format.
  private static readonly DEFAULT_MODELS: Record<string, string> = {
    openai: "openai/gpt-4o",
    anthropic: "anthropic/claude-3-5-sonnet-20241022",
    openrouter: "openrouter/gpt-4o",
  };

  static async saveProviderKey(provider: string, api_key: string): Promise<void> {
    const headers = await getHeaders();
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
    const model = SettingsService.DEFAULT_MODELS[provider] ?? `${provider}/default`;
    try {
      await axios.post(
        `${baseUrl}/api/v1/secrets`,
        {
          inference_config: { api_key, model },
          chat_config: { api_key, model },
        },
        { headers }
      );
    } catch (error) {
      throw new Error("Error saving provider key");
    }
  }
}
