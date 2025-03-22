import getHeaders from "@/app/utils/headers.util";
import axios from "axios";

export interface Model {
  description: string;
  id: string;
  is_chat_model: boolean;
  is_inference_model: boolean;
  name: string;
  provider: string;
}

export interface ModelListResponse {
  models: Model[];
}

export default class ModelService {
  static async listModels(): Promise<ModelListResponse> {
    const headers = await getHeaders();
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;

    try {
      const response = await axios.get(
        `${baseUrl}/api/v1/list-available-models/`,
        {
          headers,
        }
      );
      return response.data;
    } catch (error) {
      throw new Error("Error fetching models list");
    }
  }

  static async setCurrentModel(model_id: string): Promise<any> {
    const headers = await getHeaders();
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;

    try {
      const response = await axios.post(
        `${baseUrl}/api/v1/set-global-ai-provider/`,
        { chat_model: model_id },
        {
          headers,
        }
      );
      return response.data;
    } catch (error) {
      throw new Error("Error updating chat model");
    }
  }

  static async getCurrentModel(): Promise<any> {
    const headers = await getHeaders();
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;

    try {
      const response = await axios.get(
        `${baseUrl}/api/v1/get-global-ai-provider/`,
        {
          headers,
        }
      );
      return response.data;
    } catch (error) {
      throw new Error("Error fetching current model");
    }
  }
}
