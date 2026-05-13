import type {
  AdminSummary,
  AdminVoteRow,
  ComparisonDetail,
  ComparisonSummary,
  VotePayload,
  VoteResponse,
} from "./types";

const baseUrl = () => process.env.NEXT_PUBLIC_BASE_URL || "";

const endpoint = (path: string) => {
  const base = baseUrl();
  return base ? `${base}${path}` : path;
};

export async function fetchComparisons(): Promise<ComparisonSummary[]> {
  const res = await fetch(endpoint("/api/v1/feedback/comparisons"), {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });
  if (!res.ok) {
    throw new Error(`Failed to load comparisons (${res.status})`);
  }
  return (await res.json()) as ComparisonSummary[];
}

export async function fetchComparisonDetail(
  comparisonId: string,
): Promise<ComparisonDetail> {
  const res = await fetch(
    endpoint(`/api/v1/feedback/comparisons/${encodeURIComponent(comparisonId)}`),
    { method: "GET", headers: { "Content-Type": "application/json" } },
  );
  if (!res.ok) {
    throw new Error(`Failed to load comparison (${res.status})`);
  }
  return (await res.json()) as ComparisonDetail;
}

export async function submitVote(payload: VotePayload): Promise<VoteResponse> {
  const res = await fetch(endpoint("/api/v1/feedback/votes"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Vote submission failed (${res.status}): ${body}`);
  }
  return (await res.json()) as VoteResponse;
}

export async function fetchMyVotes(email: string): Promise<VoteResponse[]> {
  const res = await fetch(
    endpoint(`/api/v1/feedback/votes?voter_email=${encodeURIComponent(email)}`),
    { method: "GET", headers: { "Content-Type": "application/json" } },
  );
  if (!res.ok) {
    throw new Error(`Failed to load votes (${res.status})`);
  }
  return (await res.json()) as VoteResponse[];
}

// ---- Admin (password-gated) ----------------------------------------------

class AdminAuthError extends Error {
  constructor() {
    super("Wrong password");
    this.name = "AdminAuthError";
  }
}

export { AdminAuthError };

async function adminFetch(path: string, password: string): Promise<Response> {
  const res = await fetch(endpoint(path), {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      "X-Admin-Password": password,
    },
  });
  if (res.status === 401) {
    throw new AdminAuthError();
  }
  if (!res.ok) {
    throw new Error(`Request failed (${res.status})`);
  }
  return res;
}

export async function fetchAdminSummary(password: string): Promise<AdminSummary> {
  const res = await adminFetch("/api/v1/feedback/admin/summary", password);
  return (await res.json()) as AdminSummary;
}

export async function fetchAdminVotes(
  password: string,
  limit = 500,
): Promise<AdminVoteRow[]> {
  const res = await adminFetch(
    `/api/v1/feedback/admin/votes?limit=${encodeURIComponent(limit)}`,
    password,
  );
  return (await res.json()) as AdminVoteRow[];
}
