export const SUPPORTED_DOCUMENT_TYPES = {
  // Documents
  'application/pdf': { ext: '.pdf', type: 'pdf', icon: '📄', label: 'PDF' },
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': {
    ext: '.docx', type: 'document', icon: '📝', label: 'Word Document'
  },

  // Spreadsheets
  'text/csv': { ext: '.csv', type: 'spreadsheet', icon: '📊', label: 'CSV' },
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': {
    ext: '.xlsx', type: 'spreadsheet', icon: '📊', label: 'Excel Spreadsheet'
  },

  // Code files
  'text/x-python': { ext: '.py', type: 'code', icon: '💻', label: 'Python' },
  'text/javascript': { ext: '.js', type: 'code', icon: '💻', label: 'JavaScript' },
  'text/typescript': { ext: '.ts', type: 'code', icon: '💻', label: 'TypeScript' },
  'text/x-java': { ext: '.java', type: 'code', icon: '💻', label: 'Java' },
  'text/x-go': { ext: '.go', type: 'code', icon: '💻', label: 'Go' },
  'text/x-rust': { ext: '.rs', type: 'code', icon: '💻', label: 'Rust' },
  'application/json': { ext: '.json', type: 'code', icon: '💻', label: 'JSON' },
  'text/yaml': { ext: '.yaml', type: 'code', icon: '💻', label: 'YAML' },

  // Text files
  'text/markdown': { ext: '.md', type: 'document', icon: '📝', label: 'Markdown' },
  'text/plain': { ext: '.txt', type: 'document', icon: '📝', label: 'Text File' },
} as const;

export const SUPPORTED_IMAGE_TYPES = {
  'image/jpeg': { ext: '.jpg', type: 'image', icon: '🖼️', label: 'JPEG' },
  'image/png': { ext: '.png', type: 'image', icon: '🖼️', label: 'PNG' },
  'image/webp': { ext: '.webp', type: 'image', icon: '🖼️', label: 'WebP' },
  'image/gif': { ext: '.gif', type: 'image', icon: '🖼️', label: 'GIF' },
} as const;

export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export function isDocumentType(mimeType: string): boolean {
  return mimeType in SUPPORTED_DOCUMENT_TYPES;
}

export function isImageType(mimeType: string): boolean {
  return mimeType in SUPPORTED_IMAGE_TYPES;
}

export function getFileTypeInfo(mimeType: string) {
  if (mimeType in SUPPORTED_DOCUMENT_TYPES) {
    return SUPPORTED_DOCUMENT_TYPES[mimeType as keyof typeof SUPPORTED_DOCUMENT_TYPES];
  }
  if (mimeType in SUPPORTED_IMAGE_TYPES) {
    return SUPPORTED_IMAGE_TYPES[mimeType as keyof typeof SUPPORTED_IMAGE_TYPES];
  }
  return null;
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function estimateTokens(file: File): number {
  const mimeType = file.type;
  const sizeBytes = file.size;

  // Server-side heuristics
  if (mimeType.includes('pdf')) {
    return Math.floor(sizeBytes / 5);
  } else if (mimeType.includes('word') || mimeType.includes('document')) {
    return Math.floor(sizeBytes / 5);
  } else if (mimeType.includes('csv') || mimeType.includes('spreadsheet')) {
    return Math.floor(sizeBytes / 6);
  } else {
    return Math.floor(sizeBytes / 4); // Text/code
  }
}

export function getSupportedFileExtensions(): string {
  const docExts = Object.values(SUPPORTED_DOCUMENT_TYPES).map(t => t.ext);
  const imgExts = Object.values(SUPPORTED_IMAGE_TYPES).map(t => t.ext);
  return [...docExts, ...imgExts].join(',');
}
