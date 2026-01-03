/**
 * Shared type definitions for project data across the spec generation flow
 */

export interface ProjectMetadata {
  id: string;
  repo_name: string;
  branch_name: string;
  idea: string;
  status: string;
  created_at: string;
  questions?: Array<{
    id: string;
    question: string;
    section: string;
  }>;
}

export interface ProjectAnswer {
  question_id: string;
  text_answer?: string;
  mcq_answer?: string;
  is_user_modified?: boolean;
  is_skipped?: boolean;
}

export interface ProjectWithAnswers {
  project: ProjectMetadata;
  answers: Record<string, ProjectAnswer>;
}


