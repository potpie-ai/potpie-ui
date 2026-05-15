export interface StreamFailureDiagnostics {
  source: string;
  runId?: string;
  conversationId?: string;
  traceId?: string;
  failingPhase?: string;
  errorType?: string;
  status?: string;
  message?: string;
  streamId?: string;
  stackTraceAvailable?: boolean;
}

const readString = (
  payload: Record<string, unknown>,
  ...keys: string[]
): string | undefined => {
  for (const key of keys) {
    const value = payload[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return undefined;
};

const readBoolean = (
  payload: Record<string, unknown>,
  ...keys: string[]
): boolean | undefined => {
  for (const key of keys) {
    const value = payload[key];
    if (typeof value === "boolean") return value;
    if (typeof value === "string") {
      if (value.toLowerCase() === "true") return true;
      if (value.toLowerCase() === "false") return false;
    }
  }
  return undefined;
};

export const normalizeStreamFailureDiagnostics = (
  source: string,
  payload: Record<string, unknown>,
  fallbackRunId?: string
): StreamFailureDiagnostics | null => {
  const status = readString(payload, "status");
  const event = readString(payload, "event", "type");
  const failingPhase = readString(payload, "failing_phase", "failingPhase");
  const errorType = readString(payload, "error_type", "errorType");
  const traceId = readString(payload, "trace_id", "traceId");
  const isFailure =
    event === "error" ||
    status === "error" ||
    status === "timeout" ||
    status === "expired" ||
    Boolean(failingPhase || errorType);

  if (!isFailure) return null;

  return {
    source,
    runId: readString(payload, "run_id", "runId") ?? fallbackRunId,
    conversationId: readString(payload, "conversation_id", "conversationId"),
    traceId,
    failingPhase,
    errorType,
    status,
    message: readString(payload, "message", "error"),
    streamId: readString(payload, "stream_id", "streamId", "eventId"),
    stackTraceAvailable: readBoolean(
      payload,
      "stack_trace_available",
      "stackTraceAvailable"
    ),
  };
};

export const logStreamFailure = (
  diagnostics: StreamFailureDiagnostics,
  error?: unknown
): void => {
  if (error instanceof Error && error.name === "AbortError") return;

  const clientStack = error instanceof Error ? error.stack : undefined;
  console.error("[stream-debug] Stream failure", {
    ...diagnostics,
    clientError: error instanceof Error ? error.message : String(error ?? ""),
    clientStack,
  });
};

export const runIdFromUrl = (url: string): string | undefined => {
  try {
    const parsed = new URL(url);
    return (
      parsed.searchParams.get("run_id")?.trim() ||
      parsed.searchParams.get("session_id")?.trim() ||
      undefined
    );
  } catch {
    return undefined;
  }
};
