import type { ToolCallMessagePartComponent } from "@assistant-ui/react";
import { ChevronDown, ChevronRight, ChevronsRight, ChevronsUpDown } from "lucide-react";
import { useState } from "react";

const getArgumentPreview = (argsText?: string): string => {
  if (!argsText) return "No arguments";

  try {
    const parsed = JSON.parse(argsText) as Record<string, unknown>;
    const candidates = [
      parsed.path,
      parsed.file,
      parsed.target,
      parsed.query,
      parsed.prompt,
      parsed.search_term,
      parsed.url,
      (parsed as { parameters?: { command?: unknown } }).parameters?.command,
      (parsed as { tool_call?: { parameters?: { command?: unknown } } }).tool_call
        ?.parameters?.command,
      parsed.command,
      parsed.explanation,
    ];

    for (const value of candidates) {
      if (typeof value === "string" && value.trim()) {
        return value.trim();
      }
    }
  } catch {
    const compact = argsText.replace(/\s+/g, " ").trim();
    if (compact) {
      return compact.length > 110 ? `${compact.slice(0, 107)}...` : compact;
    }
  }

  return "No arguments";
};

const getSummaryText = (result: unknown): string | null => {
  if (!result || typeof result !== "object") return null;
  const summary = (result as { details?: { summary?: unknown } }).details
    ?.summary;
  return typeof summary === "string" && summary.trim() ? summary : null;
};

const getCommandText = (result: unknown): string | null => {
  if (!result || typeof result !== "object") return null;
  const command = (result as { details?: { command?: unknown } }).details
    ?.command;
  return typeof command === "string" && command.trim() ? command : null;
};

const getToolResponseText = (result: unknown): string | null => {
  if (!result || typeof result !== "object") return null;
  const latestToolResponse = (result as { latest_tool_response?: unknown })
    .latest_tool_response;
  if (typeof latestToolResponse === "string" && latestToolResponse.trim()) {
    return latestToolResponse;
  }
  const response = (result as { response?: unknown }).response;
  if (typeof response === "string" && response.trim()) {
    return response;
  }
  return null;
};

const getResultText = (result: unknown): string | null => {
  if (result === undefined || result === null) return null;
  if (typeof result === "string") {
    const trimmed = result.trim();
    return trimmed ? trimmed : null;
  }
  try {
    return JSON.stringify(result, null, 2);
  } catch {
    return String(result);
  }
};

export const ToolFallback: ToolCallMessagePartComponent = ({
  toolName,
  argsText,
  result,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const argPreview = getArgumentPreview(argsText);
  const toolResponseText = getToolResponseText(result);
  const commandText = getCommandText(result);
  const summaryText = getSummaryText(result);
  const resultText = getResultText(result);
  const displayToolName = toolName?.trim() ? toolName : "Tool";
  const previewText = toolResponseText ?? commandText ?? argPreview;
  const streamText =
    !commandText && !summaryText && !resultText && argsText?.trim()
      ? argPreview !== "No arguments"
        ? argsText.trim()
        : null
      : null;

  return (
    <div className="aui-tool-fallback-root my-2 w-full">
      <button
        type="button"
        onClick={() => setIsExpanded((prev) => !prev)}
        className="aui-tool-fallback-trigger flex w-full items-center gap-2 rounded-md px-1 py-1 text-left hover:bg-muted/40"
        aria-expanded={isExpanded}
        aria-label={isExpanded ? "Hide tool call details" : "Show tool call details"}
      >
        <span className="aui-tool-fallback-title flex items-center gap-1.5 font-mono text-xs font-medium text-zinc-800 dark:text-zinc-200">
          <span>{displayToolName}</span>
        </span>
        <span className="aui-tool-fallback-arg truncate font-mono text-xs text-zinc-600 dark:text-zinc-300">
          {previewText}
        </span>
        {isExpanded ? (
          <ChevronDown className="size-3.5 opacity-70" />
        ) : (
          <ChevronRight className="size-3.5 opacity-70" />
        )}
      </button>

      {isExpanded && (
        <div className="aui-tool-fallback-content mt-2 max-h-[220px] overflow-y-auto rounded-md border px-3 py-2">
          {streamText && (
            <div className="aui-tool-fallback-stream mb-2 border-b border-dashed pb-2">
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Stream
              </p>
              <pre className="mt-1 whitespace-pre-wrap break-words font-mono text-xs text-zinc-800 dark:text-zinc-200">
                {streamText}
              </pre>
            </div>
          )}
          {commandText && (
            <div className="aui-tool-fallback-command mb-2 border-b border-dashed pb-2">
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Command
              </p>
              <pre className="mt-1 whitespace-pre-wrap break-words font-mono text-xs text-zinc-800 dark:text-zinc-200">
                {commandText}
              </pre>
            </div>
          )}
          {summaryText && (
            <div className="aui-tool-fallback-summary mb-2 border-b border-dashed pb-2">
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Summary
              </p>
              <pre className="mt-1 whitespace-pre-wrap break-words font-mono text-xs text-zinc-800 dark:text-zinc-200">
                {summaryText}
              </pre>
            </div>
          )}
          {resultText && (
            <div className="aui-tool-fallback-result">
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Result
              </p>
              <pre className="mt-1 whitespace-pre-wrap break-words font-mono text-xs text-zinc-800 dark:text-zinc-200">
                {resultText}
              </pre>
            </div>
          )}
          {!commandText && !summaryText && !resultText && !streamText && (
            <p className="text-xs text-muted-foreground">No result available.</p>
          )}
        </div>
      )}
    </div>
  );
};
