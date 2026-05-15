// Client for the per-event activity / per-pot status streams.
//
// The server emits newline-delimited JSON (NDJSON) so we can parse line-by-line
// without an SSE library. Mirrors the chat stream parser's "buffer chunks,
// extract complete lines" loop. Each line becomes one parsed JSON object.

import getHeaders from "@/app/utils/headers.util";

const baseUrl = () => process.env.NEXT_PUBLIC_BASE_URL ?? "";

export type StreamEvent = {
  stream_id: string;
  type: "activity" | "status" | "end";
  // Activity-specific
  kind?: string;
  sequence?: number;
  // Monotonic per-batch cursor (the durable execution-log seq). Mirrors
  // ``stream_id`` for the agent execution stream.
  seq?: number;
  // Set for coalesced model parts (text / thinking). The client grows the
  // part in place by ``part_id`` instead of appending each flush.
  part_id?: string | null;
  // ``false`` while a coalesced part is still streaming.
  done?: boolean;
  title?: string | null;
  body?: string | null;
  payload?: Record<string, unknown> | null;
  run_id?: string;
  // Status-specific
  status?: string;
  stage?: string | null;
  message?: string | null;
  metadata?: Record<string, unknown> | null;
  // Generic
  event_id?: string;
  pot_id?: string;
  created_at?: string;
  error?: string;
};

export type StreamHandler = (event: StreamEvent) => void;

export type StreamOptions = {
  cursor?: string | null;
  signal?: AbortSignal;
  // Optional structured error handler. When omitted, errors surface via the
  // returned promise rejection.
  onError?: (error: Error) => void;
  // Called once the connection is established (response OK, body ready),
  // before the first line is read. Lets consumers detect (re)connections —
  // a reconnect implies a gap where deltas may have been missed, which the
  // live-sync layer reconciles against.
  onOpen?: () => void;
};

export class EventStreamService {
  /**
   * Subscribe to per-event activity. Resolves when the server emits ``end``
   * or when ``signal`` is aborted. ``onEvent`` is called for every parsed
   * line — both replay and tail.
   */
  static async streamEventActivity(
    eventId: string,
    onEvent: StreamHandler,
    options: StreamOptions = {},
  ): Promise<void> {
    const url = new URL(
      `${baseUrl()}/api/v1/context/events/${encodeURIComponent(eventId)}/stream`,
    );
    if (options.cursor) url.searchParams.set("cursor", options.cursor);
    return EventStreamService._streamNdjson(
      url.toString(),
      onEvent,
      options,
    );
  }

  /**
   * Subscribe to per-pot status. Same line protocol; no natural end so the
   * stream only closes on abort / idle timeout / server error.
   */
  static async streamPotStatus(
    potId: string,
    onEvent: StreamHandler,
    options: StreamOptions = {},
  ): Promise<void> {
    const url = new URL(
      `${baseUrl()}/api/v1/context/pots/${encodeURIComponent(potId)}/events/stream`,
    );
    if (options.cursor) url.searchParams.set("cursor", options.cursor);
    return EventStreamService._streamNdjson(
      url.toString(),
      onEvent,
      options,
    );
  }

  private static async _streamNdjson(
    url: string,
    onEvent: StreamHandler,
    options: StreamOptions,
  ): Promise<void> {
    const headers = await getHeaders();
    let response: Response;
    try {
      response = await fetch(url, {
        method: "GET",
        headers: headers as HeadersInit,
        signal: options.signal,
        // Streaming endpoints sit behind the API auth — keep cookies for
        // session-backed auth setups.
        credentials: "include",
      });
    } catch (e) {
      if (options.signal?.aborted) return;
      const err = e instanceof Error ? e : new Error(String(e));
      options.onError?.(err);
      throw err;
    }

    if (!response.ok || !response.body) {
      const err = new Error(
        `stream request failed: ${response.status} ${response.statusText}`,
      );
      options.onError?.(err);
      throw err;
    }

    // Connection is live from here — signal it before draining the body so
    // a reconnecting consumer can trigger a state reconciliation.
    options.onOpen?.();

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    const flushLine = (line: string) => {
      const trimmed = line.trim();
      if (!trimmed) return;
      try {
        const event = JSON.parse(trimmed) as StreamEvent;
        onEvent(event);
      } catch (e) {
        // A single malformed line shouldn't kill the stream — log and skip.
        // eslint-disable-next-line no-console
        console.warn("Failed to parse stream line:", trimmed, e);
      }
    };

    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        if (options.signal?.aborted) {
          await reader.cancel();
          break;
        }
        buffer += decoder.decode(value, { stream: true });
        // NDJSON: split on newline. The last piece may be a partial line —
        // hold it in the buffer for the next chunk.
        let newlineIdx;
        while ((newlineIdx = buffer.indexOf("\n")) !== -1) {
          const line = buffer.slice(0, newlineIdx);
          buffer = buffer.slice(newlineIdx + 1);
          flushLine(line);
        }
      }
      // Flush trailing line, if any.
      if (buffer.trim()) flushLine(buffer);
    } catch (e) {
      if (options.signal?.aborted) return;
      const err = e instanceof Error ? e : new Error(String(e));
      options.onError?.(err);
      throw err;
    }
  }
}

export default EventStreamService;
