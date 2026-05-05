# Removing assistant-ui Dependency

This document outlines the steps and changes required to remove the `@assistant-ui/*` packages from potpie-ui.

## Overview

The assistant-ui library provides the chat UI components and runtime. Removing it requires:
1. Creating replacement components for the chat UI
2. Updating the runtime to not depend on assistant-ui
3. Removing the packages from package.json
4. Testing the chat functionality

---

## Current assistant-ui Usage

### Packages to Remove (from package.json)

```json
"@assistant-ui/react": "^0.12.3",
"@assistant-ui/react-ai-sdk": "^1.3.3",
"@assistant-ui/react-data-stream": "^0.11.6",
"@assistant-ui/react-markdown": "^0.11.4",
```

### Files That Need Updates

| File | Changes Required |
|------|------------------|
| `app/(main)/chat/[chatId]/page.tsx` | Remove `AssistantRuntimeProvider`, replace `Thread` component |
| `app/(main)/chat/[chatId]/runtime.ts` | Complete rewrite - create new custom runtime |
| `app/(main)/chat/[chatId]/components/MessageComposer.tsx` | Remove `ComposerPrimitive`, create custom composer |
| `components/assistant-ui/thread.tsx` | DELETE - Replace with custom Thread component |
| `components/assistant-ui/thread-list.tsx` | DELETE - Create custom thread list or use alternative |
| `components/assistant-ui/markdown-text.tsx` | DELETE - Already has `StandaloneMarkdown` that doesn't depend on assistant-ui |
| `components/assistant-ui/reasoning.tsx` | DELETE - Create custom reasoning display |
| `components/assistant-ui/attachment.tsx` | DELETE or adapt for custom attachment UI |
| `components/assistant-ui/tool-fallback.tsx` | DELETE or adapt for tool call display |
| `components/assistant-ui/tooltip-icon-button.tsx` | KEEP - Doesn't depend on assistant-ui internally |

---

## Required New Components

### 1. Thread Component (new file: `components/chat/Thread.tsx`)

Replace `components/assistant-ui/thread.tsx`. Needs to:
- Display message list (user + assistant messages)
- Show reasoning/thinking in collapsible accordion
- Render markdown with syntax highlighting
- Render tool calls with expandable details
- Handle message editing
- Provide composer input area
- Scroll to bottom functionality

### 2. Composer Component

Can reuse existing `MessageComposer.tsx` with modifications:
- Remove `ComposerPrimitive` imports
- Create custom state management for text input
- Handle attachments differently
- Implement send/cancel functionality

### 3. Runtime (new file: `lib/runtime/chatRuntime.ts`)

Replace `app/(main)/chat/[chatId]/runtime.ts`:
- Remove all `useLocalRuntime` and assistant-ui type imports
- Create custom runtime using:
  - ChatService for streaming messages
  - Local state for messages array
  - Custom adapter pattern for chat API
- Implement message history loading
- Handle streaming input/output
- Manage composer state

### 4. Message Components

Create or modify:
- `components/chat/UserMessage.tsx` - Display user messages with attachments
- `components/chat/AssistantMessage.tsx` - Display assistant messages with reasoning
- `components/chat/ToolCallDisplay.tsx` - Expandable tool call details
- `components/chat/ReasoningDisplay.tsx` - Collapsible reasoning accordion

---

## Runtime Changes Details

### Current runtime.ts imports to remove:

```typescript
// REMOVE ALL OF THESE:
import {
  useLocalRuntime,
  type ChatModelAdapter,
  type ChatModelRunOptions,
  type ThreadHistoryAdapter,
  type ThreadMessage,
  type ThreadAssistantMessage,
  type ThreadUserMessage,
  type TextMessagePart,
  type ImageMessagePart,
  type ToolCallMessagePart,
  type CompleteAttachment,
  type AttachmentAdapter,
  type PendingAttachment,
} from "@assistant-ui/react";
```

### New runtime should:

1. **Keep existing functionality:**
   - `createChatAdapter` - ChatService.streamMessage integration
   - `createHistoryAdapter` - ChatService.loadMessages integration
   - Resume session handling
   - Streaming tool calls

2. **Replace with custom state:**
   - Use React `useState` for messages array
   - Use React `useRef` for streaming state
   - Custom event emitter or callbacks for updates

3. **Maintain these interfaces:**
   - Tool call handling (streaming, result, error)
   - Attachment upload
   - Message conversion (backend → frontend format)
   - Thinking/reasoning extraction

---

## Pages to Update

### 1. chat/[chatId]/page.tsx

**Current (needs change):**
```tsx
import { AssistantRuntimeProvider } from "@assistant-ui/react";
import { Thread } from "@/components/assistant-ui/thread";

// ...

<AssistantRuntimeProvider runtime={runtime}>
  <Thread
    projectId={projectId}
    conversationId={currentConversationId}
    writeDisabled={false}
  />
</AssistantRuntimeProvider>
```

**New:**
```tsx
import { CustomThread } from "@/components/chat/Thread";

// Don't need provider wrapper anymore
<CustomThread
  projectId={projectId}
  conversationId={currentConversationId}
  writeDisabled={false}
  // Pass runtime directly or create internally
/>
```

### 2. chat/[chatId]/components/MessageComposer.tsx

**Current imports to remove:**
```typescript
import {
  ComposerPrimitive,
  ThreadPrimitive,
  useComposerRuntime,
  useThreadRuntime,
} from "@assistant-ui/react";
```

**Replace with:**
- Custom input handling with React state
- Custom attachment handling
- Direct ChatService calls for sending

---

## Dependency Graph

```
package.json
    ↓
@assistant-ui/react
    ↓
components/assistant-ui/
    ├── thread.tsx          → app/(main)/chat/[chatId]/page.tsx
    ├── thread-list.tsx      → used in sidebar?
    ├── markdown-text.tsx    → thread.tsx, tool-fallback.tsx
    ├── reasoning.tsx       → thread.tsx
    ├── attachment.tsx      → thread.tsx, MessageComposer.tsx
    └── tool-fallback.tsx   → thread.tsx
    ↓
app/(main)/chat/[chatId]/runtime.ts  ← Heavy usage (types + useLocalRuntime)
    ↓
app/(main)/chat/[chatId]/page.tsx
```

---

## Migration Strategy

### Phase 1: Create New Components
1. Create `components/chat/Thread.tsx` - New custom thread
2. Create `components/chat/UserMessage.tsx`
3. Create `components/chat/AssistantMessage.tsx`
4. Create `components/chat/ReasoningDisplay.tsx`
5. Create `components/chat/ToolCallDisplay.tsx`

### Phase 2: Update Runtime
1. Create new runtime without assistant-ui imports
2. Test with existing ChatService integration
3. Verify streaming works

### Phase 3: Update Pages
1. Replace Thread in chat page
2. Update MessageComposer
3. Test end-to-end

### Phase 4: Cleanup
1. Remove unused assistant-ui components
2. Remove packages from package.json
3. Run build to verify no imports remain

---

## Already Available Alternatives

### Standalone Markdown
`components/assistant-ui/markdown-text.tsx` already exports `StandaloneMarkdown` which uses `react-markdown` directly. This can be kept even after removing assistant-ui dependency - just copy to a new location.

### UI Components
All components in `components/ui/` are already independent and can remain.

---

## Testing Checklist

- [ ] Send a new message → appears in thread
- [ ] Receive streaming response → shows progressively
- [ ] Tool calls appear with expand/collapse
- [ ] Reasoning displays in accordion
- [ ] Edit user message and resend
- [ ] Copy assistant message
- [ ] Reload thread (history loads)
- [ ] Attach file to message
- [ ] Resume interrupted session
- [ ] Stop streaming message
- [ ] Code blocks render with syntax highlighting

---

## Notes

- The existing `StandaloneMarkdown` component in `markdown-text.tsx` doesn't actually depend on `@assistant-ui/react-markdown` for the standalone export - it uses `react-markdown` directly. This can be copied to a new location.
- The tool call handling logic in runtime.ts is complex but independent - can be reused with custom state management.
- Attachment handling with MediaService.uploadFile is already in the adapter - can be kept.