import axios from "axios";
import getHeaders from "@/app/utils/headers.util";

export interface AttachmentUploadResponse {
  id: string;
  attachment_type: string;
  file_name: string;
  mime_type: string;
  file_size: number;
  message?: string;
}

export default class MediaService {
  /**
   * Upload a file via the backend media API (POST /api/v1/media/upload).
   * Backend accepts any file type; images are processed, others stored as document.
   */
  static async uploadFile(file: File): Promise<AttachmentUploadResponse> {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
    if (!baseUrl) {
      throw new Error("NEXT_PUBLIC_BASE_URL is not set");
    }

    const headers = await getHeaders();
    const formData = new FormData();
    formData.append("file", file);

    const response = await axios.post<AttachmentUploadResponse>(
      `${baseUrl}/api/v1/media/upload`,
      formData,
      {
        headers: headers as Record<string, string>,
        // Do not set Content-Type; axios sets multipart/form-data with boundary for FormData
      }
    );

    return response.data;
  }
}
