# Agent Thinking Flow: SpecService & PlanService

This document explains how the agent's thinking/reasoning content is streamed from the backend and separated for display in the frontend.

---

## Overview

Both `SpecService` and `PlanService` support streaming responses that include the agent's "thinking" process separately from the final output. This provides users transparency into how the AI arrives at its conclusions.

---

## 1. Backend Streaming Format

The backend sends thinking content as **dedicated events** within the stream. Two formats are supported:

### Server-Sent Events (SSE)

```
event: thinking
data: {"content": "Let me analyze the requirements..."}

event: thinking
data: {"content": "The user wants a React component with..."}

event: message
data: {"content": "Here's the specification..."}

event: tool_calls
data: {"tool_calls": [...]}

event: end
data: {}
```

### Newline-Delimited JSON (NDJSON)

```json
{"event": "thinking", "data": {"content": "Analyzing requirements..."}}
{"event": "thinking", "data": {"content": "Planning architecture..."}}
{"event": "message", "data": {"content": "Here's the spec..."}}
{"event": "end", "data": {}}
```

### Key Event Types

| Event Type | Description |
|------------|-------------|
| `thinking` | Agent's internal reasoning process |
| `message` | Main response content |
| `tool_calls` | Tool invocations and results |
| `chunk` | Combined thinking/response chunks (spec/plan streams) |
| `end` | Stream completion |
| `error` | Error messages |

---

## 2. Service Layer

### 2.1 SpecService.ts

Provides two main streaming methods:

#### `startSpecGenerationStream()` (Lines 288-391)

```typescript
static async startSpecGenerationStream(
  recipeId: string,
  options: {
    streamTokens?: boolean;
    consumeStream?: boolean;
    onEvent?: (eventType: string, data: Record<string, unknown>) => void;
    onError?: (error: string) => void;
    signal?: AbortSignal;
  }
): Promise<{ runId: string }>
```

**Endpoint:** `POST /api/v1/recipes/{recipeId}/spec/generate-stream`

**Key features:**
- Extracts `run_id` from `X-Run-Id` header for stream reconnection
- Auto-detects SSE vs NDJSON format
- Calls `onEvent` callback for each parsed event with `(eventType, data)`

#### `connectSpecStream()` (Lines 397-467)

```typescript
static connectSpecStream(
  recipeId: string,
  runId: string,
  options: {
    cursor?: string | null;
    onEvent?: (eventType: string, data: Record<string, unknown>) => void;
    onError?: (error: string) => void;
    signal?: AbortSignal;
  }
): void
```

**Endpoint:** `GET /api/v1/recipes/{recipe_id}/spec/stream?run_id=...&cursor=...`

Reconnects to an existing stream after page refresh.

---

### 2.2 PlanService.ts

Provides identical streaming methods for plan generation:

#### `startPlanGenerationStream()` (Lines 111-214)

```typescript
static async startPlanGenerationStream(
  recipeId: string,
  options: {
    streamTokens?: boolean;
    consumeStream?: boolean;
    onEvent?: (eventType: string, data: Record<string, unknown>) => void;
    onError?: (error: string) => void;
    signal?: AbortSignal;
  }
): Promise<{ runId: string }>
```

**Endpoint:** `POST /api/v1/recipes/{recipeId}/plan/generate-stream`

#### `connectPlanStream()` (Lines 261-331)

```typescript
static connectPlanStream(
  recipeId: string,
  runId: string,
  options: {
    cursor?: string | null;
    onEvent?: (eventType: string, data: Record<string, unknown>) => void;
    onError?: (error: string) => void;
    signal?: AbortSignal;
  }
): void
```

**Endpoint:** `GET /api/v1/recipes/{recipe_id}/plan/stream?run_id=...&cursor=...`

---

## 3. Stream Parsing Logic

Both services use identical parsing logic (SpecService: lines 341-388, PlanService: lines 164-211):

```typescript
const reader = response.body?.getReader();
const decoder = new TextDecoder();
let buffer = "";
let useSSE = isSSEResponse(contentType); // Check Content-Type header

while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  buffer += decoder.decode(value, { stream: true });

  // Auto-detect SSE format if not explicitly set
  if (!useSSE && buffer.includes("event:") && buffer.includes("data:")) {
    useSSE = true;
  }

  if (useSSE) {
    // Parse SSE: event: X\ndata: {...}\n\n
    const { events, remaining } = parseSSEBuffer(buffer);
    buffer = remaining;
    for (const { eventType, data } of events) {
      // Extract payload from nested data structure
      const payload =
        data?.data && typeof data.data === "object" && data.data !== null
          ? (data.data as Record<string, unknown>)
          : data ?? {};
      options.onEvent?.(eventType, payload);
      if (eventType === "end" || eventType === "error") return;
    }
  } else {
    // Parse NDJSON: {...}\n{...}\n
    const { objects, remaining } = extractJsonObjects(buffer);
    buffer = remaining;
    for (const jsonStr of objects) {
      const data = JSON.parse(jsonStr) as Record<string, unknown>;
      const eventType = (typeof data.event === "string" ? data.event : "message") as string;
      const payload = /* extract payload... */;
      options.onEvent?.(eventType, payload);
      if (eventType === "end" || eventType === "error") return;
    }
  }
}
```

---

## 4. Utility Functions (lib/utils.ts)

### `parseSSEBuffer()` (Lines 61-88)

Parses SSE format into structured events:

```typescript
export function parseSSEBuffer(buffer: string): {
  events: { eventType: string; data: Record<string, unknown> }[];
  remaining: string;
}
```

**Example:**
```
Input:  "event: thinking\ndata: {\"content\": \"Hello\"}\n\nevent: message"
Output: {
  events: [{ eventType: "thinking", data: { content: "Hello" } }],
  remaining: "event: message"
}
```

### `extractJsonObjects()` (Lines 12-58)

Extracts complete JSON objects from a buffer:

```typescript
export function extractJsonObjects(buffer: string): {
  objects: string[];   // Complete JSON objects found
  remaining: string;   // Incomplete data to keep in buffer
}
```

Features:
- Handles nested objects via brace depth counting
- Ignores braces inside strings
- Handles escape sequences

### `isSSEResponse()` (Lines 90-92)

```typescript
export function isSSEResponse(contentType: string | null): boolean {
  return contentType?.includes("text/event-stream") ?? false;
}
```

---

## 5. Frontend: Separating and Displaying Thinking

### 5.1 Spec Page (app/(main)/task/[taskId]/spec/page.tsx)

The spec page uses a timeline-based approach to display interleaved thinking/response chunks:

```typescript
/** Interleaved stream: chunks (thinking/response) and tool calls in arrival order. */
const [streamItems, setStreamItems] = useState<StreamTimelineItem[]>([]);

// From onEvent callback
if (eventType === "chunk") {
  // Accumulate thinking or response content
  if (data.type === "thinking") {
    setAccumulatedThinking(prev => prev + (data.content || ""));
  } else {
    setAccumulatedContent(prev => prev + (data.content || ""));
  }
  // Add to timeline for display
  setStreamItems(prev => [...prev, { type: "chunk", data }]);
}

if (eventType === "tool_call_start") {
  setStreamItems(prev => [...prev, { type: "tool_call_start", data }]);
}

if (eventType === "tool_call_end") {
  setStreamItems(prev => [...prev, { type: "tool_call_end", data }]);
}
```

### 5.2 Plan Page (app/(main)/task/[taskId]/plan/page.tsx)

Identical pattern to spec page:

```typescript
const [streamItems, setStreamItems] = useState<StreamTimelineItem[]>([]);

PlanService.startPlanGenerationStream(recipeId, {
  onEvent: (eventType, data) => {
    if (eventType === "chunk") {
      if (data.type === "thinking") {
        setAccumulatedThinking(prev => prev + (data.content || ""));
      } else {
        setAccumulatedContent(prev => prev + (data.content || ""));
      }
      setStreamItems(prev => [...prev, { type: "chunk", data }]);
    }
    // ... handle other events
  }
});
```

### 5.3 StreamTimeline Component

The `StreamTimeline` component renders the interleaved stream:

```typescript
interface StreamTimelineItem {
  type: "chunk" | "tool_call_start" | "tool_call_end";
  data: Record<string, unknown>;
}

// Render chunks differently based on type
{streamItems.map((item, index) => {
  if (item.type === "chunk") {
    const isThinking = item.data.type === "thinking";
    return (
      <div key={index} className={isThinking ? "thinking-style" : "response-style"}>
        {item.data.content}
      </div>
    );
  }
  // ... render tool calls
})}
```

---

## 6. Data Flow Example

### Complete flow from backend to UI:

```
1. Backend sends:
   event: chunk
   data: {"type": "thinking", "content": "Let me analyze the requirements..."}

2. parseSSEBuffer() parses:
   { eventType: "chunk", data: { type: "thinking", content: "..." } }

3. onEvent callback receives:
   eventType: "chunk"
   data: { type: "thinking", content: "Let me analyze..." }

4. UI component accumulates:
   if (data.type === "thinking") {
     accumulatedThinking += "Let me analyze the requirements..."
   }

5. StreamTimeline renders:
   <div className="thinking">Let me analyze the requirements...</div>

6. User sees:
   [Thinking section with muted styling]
   "Let me analyze the requirements..."
```

---

## 7. Key Differences: Spec vs Chat Streams

| Aspect | Spec/Plan Streams | Chat Streams |
|--------|-------------------|--------------|
| Event type | `chunk` with `type: "thinking"` | `thinking` event |
| Structure | `{type, content}` object | Direct content string |
| Display | StreamTimeline component | Reasoning accordion |
| Accumulation | Separate thinking/response state | Single thinking state |

---

## 8. Summary

The thinking separation in SpecService and PlanService works by:

1. **Backend** sends thinking content as `chunk` events with `type: "thinking"`
2. **Service layer** parses SSE/NDJSON and calls `onEvent("chunk", data)`
3. **UI components** check `data.type` to route thinking vs response content
4. **Separate accumulation** of thinking and response content
5. **StreamTimeline** renders chunks with different styling based on type

This architecture allows the agent's reasoning process to be transparently displayed to users in a timeline format, interleaved with tool calls and responses.
