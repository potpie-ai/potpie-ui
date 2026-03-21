# Streaming Architecture: How "Thinking" Flows from Backend to UI

## Overview

This document explains how the Potpie UI handles streaming responses from the backend, specifically focusing on how "thinking" content (the AI's reasoning process) is separated from the main message content and displayed in the UI.

## Backend Streaming Format

The backend sends streaming responses as **Server-Sent Events (SSE)** or **newline-delimited JSON (NDJSON)** over HTTP. Each chunk contains structured data with different event types.

### Event Types from Backend

```typescript
// Typical stream event structure
{
  "event": "message" | "thinking" | "tool_calls" | "citations" | "end" | "error",
  "data": {
    // Event-specific payload
  }
}
```

### Key Event Types

| Event Type | Description | UI Handling |
|------------|-------------|-------------|
| `message` | Main AI response text | Displayed in chat bubble |
| `thinking` | AI's reasoning/thought process | Collapsed/expandable section |
| `tool_calls` | Tool invocations and results | Shown as tool call cards |
| `citations` | Source references | Rendered as citation links |
| `end` | Stream completion | Close stream, enable input |
| `error` | Error message | Show error toast |

## Service Layer: Parsing the Stream

### SpecService.ts (Primary Example)

The `SpecService` handles spec generation streaming via two main methods:

#### 1. `startSpecGenerationStream()` - Lines 288-391

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

**Key responsibilities:**
- Opens HTTP stream to `/api/v1/recipes/{recipeId}/spec/generate-stream`
- Extracts `run_id` from `X-Run-Id` header for reconnection
- Parses SSE or JSON stream format
- Calls `onEvent` callback for each parsed event

**Stream parsing logic (lines 341-388):**

```typescript
const reader = response.body?.getReader();
const decoder = new TextDecoder();
let buffer = "";
let useSSE = isSSEResponse(contentType);

while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  buffer += decoder.decode(value, { stream: true });

  // Auto-detect SSE format
  if (!useSSE && buffer.includes("event:") && buffer.includes("data:")) {
    useSSE = true;
  }

  if (useSSE) {
    // Parse SSE: event: X\ndata: {...}\n\n
    const { events, remaining } = parseSSEBuffer(buffer);
    buffer = remaining;
    for (const { eventType, data } of events) {
      options.onEvent?.(eventType, payload);
    }
  } else {
    // Parse NDJSON: {...}\n{...}\n
    const { objects, remaining } = extractJsonObjects(buffer);
    buffer = remaining;
    for (const jsonStr of objects) {
      const data = JSON.parse(jsonStr);
      const eventType = data.event || "message";
      options.onEvent?.(eventType, payload);
    }
  }
}
```

#### 2. `connectSpecStream()` - Lines 397-467

Reconnects to an existing stream (e.g., after page refresh):

```typescript
static connectSpecStream(
  recipeId: string,
  runId: string,
  options: {
    cursor?: string | null;  // Resume from specific point
    onEvent?: (eventType: string, data: Record<string, unknown>) => void;
    // ...
  }
): void
```

Endpoint: `GET /api/v1/recipes/{recipe_id}/spec/stream?run_id=...&cursor=...`

## ChatService.ts (Reference Implementation)

ChatService has the most mature thinking support:

### Message Interface with Thinking - Lines 21-31

```typescript
export interface LoadedMessage {
  id: string;
  text: string;
  sender: "user" | "agent";
  citations: string[];
  has_attachments: boolean;
  attachments: unknown[];
  tool_calls: ToolCall[] | null;
  thinking: string | null;  // <-- Thinking content stored here
}
```

### Stream Processing with Thinking - Lines 585-644

```typescript
const processJsonSegment = (jsonStr: string) => {
  const data = JSON.parse(jsonStr);

  if (data.message !== undefined) {
    currentMessage += data.message;
    onMessageUpdate(currentMessage, currentToolCalls, currentCitations, currentThinking);
  }

  if (data.tool_calls !== undefined) {
    currentToolCalls.push(...data.tool_calls);
    onMessageUpdate(currentMessage, currentToolCalls, currentCitations, currentThinking);
  }

  if (data.citations !== undefined) {
    currentCitations = data.citations;
    onMessageUpdate(currentMessage, currentToolCalls, currentCitations, currentThinking);
  }

  if (data.thinking !== undefined) {
    currentThinking = data.thinking ?? null;  // <-- Capture thinking
    onMessageUpdate(currentMessage, currentToolCalls, currentCitations, currentThinking);
  }
};
```

## Utility Functions for Stream Parsing

### `lib/utils.ts`

#### `extractJsonObjects()` - Lines 12-58

Extracts complete JSON objects from a buffer, handling partial chunks:

```typescript
export function extractJsonObjects(input: string): {
  objects: string[];      // Complete JSON objects found
  remaining: string;      // Incomplete data to keep in buffer
}
```

**Algorithm:**
1. Track brace depth (`{` increases, `}` decreases)
2. Handle strings (ignore braces inside quotes)
3. Handle escape sequences
4. When depth returns to 0, extract complete object

#### `parseSSEBuffer()` - Lines 61-88

Parses SSE format (`event:` and `data:` lines):

```typescript
export function parseSSEBuffer(buffer: string): {
  events: { eventType: string; data: Record<string, unknown> }[];
  remaining: string;
}
```

**Example SSE parsing:**
```
Input:  "event: thinking\ndata: {\"content\": \"Analyzing...\"}\n\nevent: mes"
Output: events=[{eventType: "thinking", data: {content: "Analyzing..."}}]
        remaining="event: mes"
```

#### `isSSEResponse()` - Lines 90-92

Detects SSE content type from response headers:

```typescript
export function isSSEResponse(contentType: string | null): boolean {
  return contentType != null && contentType.toLowerCase().includes("text/event-stream");
}
```

## UI Layer: Displaying Thinking

### Typical Component Pattern

```typescript
// Component state
const [message, setMessage] = useState("");
const [thinking, setThinking] = useState<string | null>(null);
const [toolCalls, setToolCalls] = useState<ToolCall[]>([]);

// Event handler from service
const handleStreamEvent = (eventType: string, data: Record<string, unknown>) => {
  switch (eventType) {
    case "message":
      setMessage(prev => prev + (data.content || ""));
      break;
    case "thinking":
      setThinking(data.content as string);
      break;
    case "tool_calls":
      setToolCalls(prev => [...prev, ...(data.tool_calls as ToolCall[])]);
      break;
    case "end":
      // Stream complete
      break;
  }
};

// Render
return (
  <div>
    {thinking && (
      <ThinkingCard
        content={thinking}
        defaultExpanded={false}  // Collapsed by default
      />
    )}
    <MessageBubble content={message} />
    <ToolCallList calls={toolCalls} />
  </div>
);
```

## Data Flow Summary

```
┌─────────────────┐     HTTP Stream      ┌──────────────────┐
│   Backend       │ ───────────────────► │   SpecService    │
│   (SSE/NDJSON)  │   event: thinking    │   / ChatService  │
│                 │   data: {...}        │                  │
└─────────────────┘                      └────────┬─────────┘
                                                  │
                                                  │ onEvent callback
                                                  │ (eventType, data)
                                                  ▼
                                          ┌──────────────────┐
                                          │   UI Component   │
                                          │                  │
                                          │  ┌────────────┐  │
                                          │  │  Thinking  │  │ ◄── Collapsible
                                          │  │   Card     │  │     section
                                          │  └────────────┘  │
                                          │  ┌────────────┐  │
                                          │  │  Message   │  │ ◄── Main content
                                          │  │  Bubble    │  │
                                          │  └────────────┘  │
                                          └──────────────────┘
```

## Reconnection and Cursor Support

For long-running operations, the UI supports reconnection:

1. **Initial connection:** Get `runId` from `X-Run-Id` header
2. **Store state:** Save `runId` and current `cursor` (event ID)
3. **On disconnect:** Call `connectSpecStream(recipeId, runId, { cursor })`
4. **Resume:** Backend sends events from cursor position

```typescript
// Cursor tracking
let currentCursor: string | null = null;

const handleEvent = (eventType: string, data: Record<string, unknown>) => {
  if (data.eventId) {
    currentCursor = data.eventId as string;
  }
  // ... handle event
};

// On page refresh, reconnect with cursor
SpecService.connectSpecStream(recipeId, savedRunId, {
  cursor: savedCursor,
  onEvent: handleEvent,
});
```

## Key Files

| File | Purpose |
|------|---------|
| `services/SpecService.ts` | Spec generation streaming (lines 288-467) |
| `services/ChatService.ts` | Chat streaming with thinking support (lines 585-644) |
| `services/PlanService.ts` | Plan generation streaming |
| `lib/utils.ts` | Stream parsing utilities (lines 12-92) |
| `lib/types/spec.ts` | TypeScript interfaces for spec events |

## Best Practices

1. **Always use buffer-based parsing** - Network chunks may split JSON objects
2. **Support both SSE and NDJSON** - Backend may use either format
3. **Store runId for reconnection** - Users may refresh during long operations
4. **Separate thinking from message** - Thinking is auxiliary content
5. **Handle abort signals** - Allow users to cancel long-running operations
