"use client";

import { SharedMarkdown } from "@/components/chat/SharedMarkdown";
import {
  formatToolResultForDisplay,
  normalizeMarkdownForPreview,
} from "@/lib/utils";

/** Renders tool result as structured JSON, markdown, or plain text. */
export function ToolResultContent({ result }: { result: string }) {
  const { kind, content } = formatToolResultForDisplay(result);
  if (kind === "json" || kind === "plain") {
    return (
      <pre className="whitespace-pre-wrap break-words font-mono text-inherit m-0">
        {content}
      </pre>
    );
  }
  return (
    <SharedMarkdown content={normalizeMarkdownForPreview(content)} />
  );
}
