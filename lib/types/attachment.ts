// Attachment types
export type AttachmentType = 'pdf' | 'document' | 'spreadsheet' | 'code' | 'image';

export interface ValidationResponse {
  can_upload: boolean;
  estimated_tokens: number;
  current_context_usage: number;
  model: string;
  model_context_limit: number;
  remaining_tokens: number;
  projected_total: number;
  // Present if can_upload = false
  exceeds_limit?: boolean;
  excess_tokens?: number;
  excess_percentage?: number;
  // Present if can_upload = true
  usage_after_upload?: number;
}

export interface AttachmentUploadResponse {
  id: string;
  attachment_type: AttachmentType;
  file_name: string;
  mime_type: string;
  file_size: number;
}

export interface AttachmentMetadata {
  // Documents
  original_size?: number;
  extracted_text_length?: number;
  token_count?: number;
  extraction_method?: string;
  text_storage?: string;
  // PDF specific
  page_count?: number;
  // DOCX specific
  paragraph_count?: number;
  table_count?: number;
  // CSV/XLSX specific
  row_count?: number;
  column_count?: number;
  columns?: string[];
  sheet_count?: number;
  sheet_names?: string[];
  // Images
  width?: number;
  height?: number;
}

export interface AttachmentInfo {
  id: string;
  attachment_type: AttachmentType;
  file_name: string;
  mime_type: string;
  file_size: number;
  storage_provider: string;
  created_at: string;
  file_metadata: AttachmentMetadata;
}

export interface ContextUsageResponse {
  conversation_id: string;
  model: string;
  context_limit: number;
  current_usage: {
    conversation_history: number;
    text_attachments: number;
    image_attachments: number;
    code_context: number;
    total: number;
  };
  remaining: number;
  usage_percentage: number;
  warning_level: 'none' | 'approaching' | 'critical';
}

// Client-side document attachment state
export interface DocumentAttachment extends AttachmentUploadResponse {
  file: File; // Keep reference to original file
  token_count?: number;
  metadata?: AttachmentMetadata;
}
