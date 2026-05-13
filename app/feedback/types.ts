export type ChosenPosition = "a" | "b" | "tie" | "neither";

export type ComparisonSummary = {
  id: string;
  question: string;
  response_count: number;
};

export type ComparisonDetail = {
  id: string;
  question: string;
  ballot_id: string;
  response_a: string;
  response_b: string;
};

export type VoteResponse = {
  id: string;
  comparison_id: string;
  chosen_position: ChosenPosition;
  confidence: number | null;
  submitted_at: string;
};

export type VoterIdentity = {
  name: string;
  email: string;
  role?: string;
};

export type VotePayload = {
  comparison_id: string;
  chosen_position: ChosenPosition;
  ballot_id: string;
  voter_name: string;
  voter_email: string;
  voter_role?: string;
  confidence?: number;
  reason_tags?: string[];
  comment?: string;
  time_on_page_ms?: number;
  session_id: string;
};

export const REASON_TAGS = [
  "Citations",
  "Completeness",
  "Groundedness",
  "Clarity",
  "Accuracy",
  "Conciseness",
] as const;

export type ReasonTag = (typeof REASON_TAGS)[number];

export type ModelCounts = {
  potpie: number;
  copilot: number;
  tie: number;
  neither: number;
  total: number;
};

export type ComparisonStats = {
  comparison_id: string;
  question: string;
  counts: ModelCounts;
  avg_confidence: number | null;
};

export type AdminSummary = {
  total_votes: number;
  unique_voters: number;
  by_model: ModelCounts;
  by_comparison: ComparisonStats[];
};

export type AdminVoteRow = {
  id: string;
  comparison_id: string;
  chosen_model: string;
  chosen_position: ChosenPosition;
  presentation_seed: number;
  voter_name: string;
  voter_email: string;
  voter_role: string | null;
  confidence: number | null;
  reason_tags: string[] | null;
  comment: string | null;
  time_on_page_ms: number | null;
  session_id: string;
  client_user_agent: string | null;
  submitted_at: string;
};
