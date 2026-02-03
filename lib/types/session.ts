export interface SessionInfo {
  sessionId: string;
  status: 'active' | 'completed' | 'expired';
  cursor?: string;
  conversationId: string;
  startedAt: number;
  lastActivity: number;
}

export interface TaskStatus {
  isActive: boolean;
  sessionId?: string;
  estimatedCompletion?: number;
  conversationId: string;
}

export interface StreamResumeOptions {
  sessionId: string;
  cursor?: string;
  conversationId: string;
}