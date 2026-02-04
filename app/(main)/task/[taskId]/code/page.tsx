"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Play,
  Check,
  Layout,
  ChevronRight,
  Terminal,
  Loader2,
  Code2,
  ShieldCheck,
  GitBranch,
  Maximize2,
  CheckCircle2,
  Circle,
  Pause,
  Lock,
  ArrowRight,
  TerminalSquare,
  Sidebar,
  X,
  FileDiff,
  TestTube,
  ScrollText,
  ChevronDown,
  FileText,
  Copy,
  Clock,
  ExternalLink,
  Hourglass,
  List,
  ArrowLeft,
  Github,
  Sparkles,
} from "lucide-react";
import { useSelector } from "react-redux";
import { RootState } from "@/lib/state/store";
import TaskSplittingService from "@/services/TaskSplittingService";
import PlanService from "@/services/PlanService";
import { toast } from "sonner";
import {
  TaskSplittingStatusResponse,
  TaskSplittingItemsResponse,
  TaskLayer,
  PlanItem,
} from "@/lib/types/spec";

// Demo mode delay in milliseconds (35 seconds)
const DEMO_MODE_DELAY = 1000;

/**
 * VERTICAL TASK EXECUTION ENGINE
 * Uses mock data for plan items with test_diff and codegen_diff support
 * - Displays tasks ordered by plan_item
 * - Shows test_diff first to user
 * - Streams codegen_diff when user presses Code Gen button
 */

// Mock Data Types
interface MockTask {
  title: string;
  file: string;
  test_code: string;
  test_diff: string;
  codegen_diff: string;
  test_results: any[];
  tests_total: number;
  tests_passed: number;
  order: number;
}

interface MockPlanItemPhase {
  title: string;
  order: number;
  tasks: MockTask[];
}

interface MockPlanData {
  [key: string]: MockPlanItemPhase[];
}

// Import mock data from JSON file
import MOCK_PLAN_DATA_JSON from "@/lib/mock/planMock.json";
const MOCK_PLAN_DATA: MockPlanData = MOCK_PLAN_DATA_JSON as MockPlanData;

// --- Sub-components ---
const StatusBadge = ({ status, tests }: { status: string; tests: any }) => {
  if (status === "completed") {
    return (
      <div className="flex items-center gap-1.5 px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded text-[9px] font-bold border border-emerald-100">
        <CheckCircle2 className="w-3 h-3" />
        <span>PASS</span>
      </div>
    );
  }
  if (status === "running") {
    return (
      <div className="flex items-center gap-1.5 px-2 py-0.5 bg-black text-white rounded text-[9px] font-bold border border-black">
        <Loader2 className="w-3 h-3 animate-spin" />
        <span>RUNNING</span>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-1.5 px-2 py-0.5 bg-zinc-50 text-primary-color rounded text-[9px] font-bold border border-zinc-100">
      <Circle className="w-3 h-3" />
      <span>WAITING</span>
    </div>
  );
};

// Diff-aware Syntax Highlighter for codegen output
const DiffCodeBlock = ({ code }: { code: string }) => {
  if (!code)
    return (
      <span className="text-zinc-500 italic font-mono text-[10px]">
        Waiting for generation...
      </span>
    );

  const lines = code.split("\n");

  // Prisma keywords
  const PRISMA_KEYWORDS = new Set([
    "model", "enum", "generator", "datasource", "type"
  ]);
  
  // Prisma types
  const PRISMA_TYPES = new Set([
    "String", "Int", "BigInt", "Float", "Decimal", "Boolean", "DateTime", 
    "Json", "Bytes", "Unsupported"
  ]);
  
  // SQL keywords for migrations
  const SQL_KEYWORDS = new Set([
    "CREATE", "TABLE", "ALTER", "DROP", "ADD", "COLUMN", "INDEX", "CONSTRAINT",
    "PRIMARY", "KEY", "FOREIGN", "REFERENCES", "ON", "DELETE", "UPDATE", "CASCADE",
    "SET", "NULL", "NOT", "UNIQUE", "DEFAULT", "CHECK", "INSERT", "INTO", "VALUES",
    "SELECT", "FROM", "WHERE", "AND", "OR", "JOIN", "LEFT", "RIGHT", "INNER", "OUTER",
    "IF", "EXISTS", "BEGIN", "END", "COMMIT", "ROLLBACK", "TRANSACTION", "EXTENSION",
    "SERIAL", "BIGSERIAL", "VARCHAR", "TEXT", "INTEGER", "BIGINT", "BOOLEAN", "TIMESTAMP",
    "TIMESTAMPTZ", "UUID", "JSONB", "ARRAY", "ENUM", "TYPE", "AS", "USING", "WITH", "ZONE"
  ]);

  return (
    <div className="font-mono text-[10px] leading-relaxed">
      {lines.map((line: string, i: number) => {
        const trimmedLine = line.trimStart();
        
        // Handle diff-style headers (GENERATED:, CREATED:, CLASS IMPLEMENTED:, etc.)
        if (trimmedLine.match(/^(GENERATED|CREATED|MODIFIED|CLASS IMPLEMENTED|INTERFACE|TYPES|MIGRATION|ROUTER|CONTAINER|FACTORY|COMPONENT|SERVICE|REPOSITORY|E2E TESTS|UNIT TESTS|TRANSLATIONS|PAGE|DTOs|RATE LIMITER|SYSTEM PROMPT|SCHEMA|PRISMA|DATABASE|SEED|QUERY):/i)) {
          return (
            <div key={i} className="text-cyan-400 font-bold whitespace-pre bg-zinc-800 -mx-4 px-4 py-0.5">
              {line}
            </div>
          );
        }
        
        // Handle bullet points (-- items) - but not SQL comments
        if (trimmedLine.startsWith("-- ") && !trimmedLine.match(/^--\s+\w+/)) {
          return (
            <div key={i} className="text-zinc-400 whitespace-pre pl-2">
              <span className="text-zinc-500">--</span>
              <span className="text-zinc-300">{line.slice(line.indexOf("--") + 2)}</span>
            </div>
          );
        }
        
        // Handle SQL comments (-- comment style)
        if (trimmedLine.startsWith("--")) {
          return (
            <div key={i} className="text-zinc-500 italic whitespace-pre">
              {line}
            </div>
          );
        }
        
        // Handle comments (// and #)
        if (trimmedLine.startsWith("//") || trimmedLine.startsWith("#")) {
          return (
            <div key={i} className="text-zinc-500 italic whitespace-pre">
              {line}
            </div>
          );
        }
        
        // Handle Prisma model/enum/generator/datasource declarations
        if (trimmedLine.match(/^(model|enum|generator|datasource)\s+\w+/)) {
          const match = trimmedLine.match(/^(model|enum|generator|datasource)\s+(\w+)/);
          if (match) {
            const keyword = match[1];
            const name = match[2];
            const rest = line.slice(line.indexOf(name) + name.length);
            const beforeKeyword = line.slice(0, line.indexOf(keyword));
            return (
              <div key={i} className="whitespace-pre">
                <span className="text-zinc-300">{beforeKeyword}</span>
                <span className="text-pink-400 font-semibold">{keyword}</span>
                <span className="text-zinc-300"> </span>
                <span className="text-amber-400 font-semibold">{name}</span>
                <span className="text-zinc-300">{rest}</span>
              </div>
            );
          }
        }
        
        // Handle Prisma decorators (@id, @default, @relation, etc.)
        if (trimmedLine.includes("@")) {
          const tokens = line.split(/(@\w+(?:\([^)]*\))?)/g);
          return (
            <div key={i} className="whitespace-pre">
              {tokens.map((token, j) => {
                if (token.startsWith("@")) {
                  return <span key={j} className="text-amber-400 font-medium">{token}</span>;
                }
                // Check for Prisma types in the token
                const typeMatch = token.match(/\b(String|Int|BigInt|Float|Decimal|Boolean|DateTime|Json|Bytes)\b/g);
                if (typeMatch) {
                  const parts = token.split(/\b(String|Int|BigInt|Float|Decimal|Boolean|DateTime|Json|Bytes)\b/);
                  return (
                    <span key={j}>
                      {parts.map((part, k) => 
                        PRISMA_TYPES.has(part) 
                          ? <span key={k} className="text-teal-400 font-medium">{part}</span>
                          : <span key={k} className="text-zinc-300">{part}</span>
                      )}
                    </span>
                  );
                }
                return <span key={j} className="text-zinc-300">{token}</span>;
              })}
            </div>
          );
        }
        
        // Handle SQL statements (CREATE TABLE, ALTER TABLE, etc.)
        if (trimmedLine.match(/^(CREATE|ALTER|DROP|INSERT|UPDATE|DELETE|SELECT|BEGIN|COMMIT|ROLLBACK)\b/i)) {
          const tokens = line.split(/\b/);
          return (
            <div key={i} className="whitespace-pre">
              {tokens.map((token, j) => {
                if (SQL_KEYWORDS.has(token.toUpperCase())) {
                  return <span key={j} className="text-purple-400 font-semibold">{token}</span>;
                }
                if (token.match(/^['"].*['"]$/)) {
                  return <span key={j} className="text-emerald-400">{token}</span>;
                }
                if (/^\d+$/.test(token)) {
                  return <span key={j} className="text-orange-400">{token}</span>;
                }
                return <span key={j} className="text-zinc-300">{token}</span>;
              })}
            </div>
          );
        }
        
        // Handle SQL data type lines (column definitions)
        if (trimmedLine.match(/^\s*\w+\s+(VARCHAR|TEXT|INTEGER|BIGINT|SERIAL|BIGSERIAL|BOOLEAN|TIMESTAMP|TIMESTAMPTZ|UUID|JSONB|NUMERIC|DECIMAL|REAL|DOUBLE|BYTEA|CHAR|DATE|TIME|INTERVAL)/i)) {
          const tokens = line.split(/\b/);
          return (
            <div key={i} className="whitespace-pre">
              {tokens.map((token, j) => {
                if (SQL_KEYWORDS.has(token.toUpperCase())) {
                  return <span key={j} className="text-purple-400 font-semibold">{token}</span>;
                }
                return <span key={j} className="text-zinc-300">{token}</span>;
              })}
            </div>
          );
        }
        
        // Handle export/import lines
        if (trimmedLine.startsWith("export") || trimmedLine.startsWith("import")) {
          return (
            <div key={i} className="whitespace-pre">
              <span className="text-purple-400 font-semibold">{trimmedLine.split(" ")[0]}</span>
              <span className="text-zinc-300">{line.slice(line.indexOf(" "))}</span>
            </div>
          );
        }
        
        // Handle type/interface/class declarations
        if (trimmedLine.match(/^(export\s+)?(type|interface|class|enum|function|const|let|var)\s/)) {
          const match = trimmedLine.match(/^(export\s+)?(type|interface|class|enum|function|const|let|var)\s+(\w+)/);
          if (match) {
            const keyword = match[2];
            const name = match[3];
            const rest = line.slice(line.indexOf(name) + name.length);
            const beforeKeyword = line.slice(0, line.indexOf(keyword));
            return (
              <div key={i} className="whitespace-pre">
                <span className="text-zinc-300">{beforeKeyword}</span>
                <span className="text-purple-400 font-semibold">{keyword}</span>
                <span className="text-zinc-300"> </span>
                <span className="text-sky-400 font-semibold">{name}</span>
                <span className="text-zinc-300">{rest}</span>
              </div>
            );
          }
        }
        
        // Handle Prisma field definitions (fieldName Type @decorators)
        if (trimmedLine.match(/^\w+\s+(String|Int|BigInt|Float|Decimal|Boolean|DateTime|Json|Bytes|\w+\[\]|\w+\?)/)) {
          const tokens = line.split(/\b/);
          return (
            <div key={i} className="whitespace-pre">
              {tokens.map((token, j) => {
                if (PRISMA_TYPES.has(token)) {
                  return <span key={j} className="text-teal-400 font-medium">{token}</span>;
                }
                if (token.startsWith("@")) {
                  return <span key={j} className="text-amber-400 font-medium">{token}</span>;
                }
                return <span key={j} className="text-zinc-300">{token}</span>;
              })}
            </div>
          );
        }
        
        // Handle property definitions (key: value)
        if (trimmedLine.match(/^\w+\s*[?]?:\s/)) {
          const colonIndex = line.indexOf(":");
          const key = line.slice(0, colonIndex);
          const value = line.slice(colonIndex);
          return (
            <div key={i} className="whitespace-pre">
              <span className="text-cyan-400">{key}</span>
              <span className="text-zinc-300">{value}</span>
            </div>
          );
        }
        
        // Handle generic SQL keywords in any line
        if (trimmedLine.match(/\b(PRIMARY|FOREIGN|KEY|REFERENCES|CONSTRAINT|UNIQUE|INDEX|NOT NULL|DEFAULT|CHECK)\b/i)) {
          const tokens = line.split(/\b/);
          return (
            <div key={i} className="whitespace-pre">
              {tokens.map((token, j) => {
                if (SQL_KEYWORDS.has(token.toUpperCase())) {
                  return <span key={j} className="text-purple-400 font-semibold">{token}</span>;
                }
                return <span key={j} className="text-zinc-300">{token}</span>;
              })}
            </div>
          );
        }
        
        // Default - regular line
        return (
          <div key={i} className="text-zinc-300 whitespace-pre">
            {line}
          </div>
        );
      })}
    </div>
  );
};

// Simple Syntax Highlighter for general code (used in test code display)
const SimpleCodeBlock = ({ code }: { code: string }) => {
  if (!code)
    return (
      <span className="text-primary-color italic font-mono text-[10px]">
        Waiting for generation...
      </span>
    );

  const KEYWORDS = new Set([
    "import", "from", "const", "let", "var", "async", "await", "function",
    "return", "if", "else", "try", "catch", "describe", "test", "it",
    "expect", "new", "export", "default", "class", "interface", "type",
    "throw", "for", "while", "of", "in", "true", "false", "null", "undefined"
  ]);

  const lines = code.split("\n");

  return (
    <div className="font-mono text-[10px] leading-relaxed">
      {lines.map((line: string, i: number) => {
        if (line.trim().startsWith("//")) {
          return (
            <div key={i} className="text-zinc-400 italic whitespace-pre">
              {line}
            </div>
          );
        }
        
        // Simple token-based highlighting
        const tokens = line.split(/(\s+|[(){}[\].,;:'"<>=!&|?]+)/);
        
        return (
          <div key={i} className="whitespace-pre">
            {tokens.map((token: string, j: number) => {
              if (KEYWORDS.has(token)) {
                return <span key={j} className="text-purple-600 font-semibold">{token}</span>;
              }
              if (token.match(/^['"].*['"]$/)) {
                return <span key={j} className="text-emerald-600">{token}</span>;
              }
              if (/^\d+$/.test(token)) {
                return <span key={j} className="text-orange-500">{token}</span>;
              }
              return <span key={j} className="text-zinc-700">{token}</span>;
            })}
          </div>
        );
      })}
    </div>
  );
};

// Helper function to map API status to UI status
const mapApiStatusToUI = (apiStatus: string): string => {
  const statusMap: Record<string, string> = {
    PENDING: "pending",
    IN_PROGRESS: "running",
    COMPLETED: "completed",
    FAILED: "failed",
  };
  return statusMap[apiStatus] || apiStatus.toLowerCase();
};

// New MockTaskCard component handling inline expansion with codegen_diff
const MockTaskCard = React.forwardRef<HTMLDivElement, {
  task: MockTask;
  isExpanded: boolean;
  onToggle: () => void;
  taskIndex: number;
  phaseIndex: number;
  isGeneratingCode?: boolean;
  onCodeGenComplete?: () => void;
}>(({
  task,
  isExpanded,
  onToggle,
  taskIndex,
  phaseIndex,
  isGeneratingCode: externalIsGenerating,
  onCodeGenComplete,
}, ref) => {
  const [isGeneratingCode, setIsGeneratingCode] = React.useState(false);
  const [streamedCode, setStreamedCode] = React.useState("");
  const [codeGenComplete, setCodeGenComplete] = React.useState(false);
  
  // Refs for streaming - these persist across re-renders without causing effect re-runs
  const streamingStartedRef = React.useRef(false);
  const intervalRef = React.useRef<NodeJS.Timeout | null>(null);
  const currentIndexRef = React.useRef(0);
  const onCodeGenCompleteRef = React.useRef(onCodeGenComplete);

  // Keep the callback ref updated
  React.useEffect(() => {
    onCodeGenCompleteRef.current = onCodeGenComplete;
  }, [onCodeGenComplete]);

  const hasCodegenDiff = task.codegen_diff && task.codegen_diff.length > 0;
  
  // Use external isGeneratingCode if provided, otherwise use internal state
  const actualIsGeneratingCode = externalIsGenerating !== undefined ? externalIsGenerating : isGeneratingCode;

  // Start streaming when externalIsGenerating becomes true
  React.useEffect(() => {
    // Only start if external trigger is on, we haven't started yet, not complete, and have content
    if (externalIsGenerating && !streamingStartedRef.current && !codeGenComplete && hasCodegenDiff) {
      streamingStartedRef.current = true;
      setIsGeneratingCode(true);
      setStreamedCode("");
      currentIndexRef.current = 0;

      const codeToStream = task.codegen_diff;
      const charsPerTick = 3;
      const tickInterval = 60;

      // Clear any existing interval first
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }

      intervalRef.current = setInterval(() => {
        if (currentIndexRef.current < codeToStream.length) {
          const nextChunk = codeToStream.slice(
            currentIndexRef.current,
            currentIndexRef.current + charsPerTick
          );
          setStreamedCode((prev) => prev + nextChunk);
          currentIndexRef.current += charsPerTick;
        } else {
          // Streaming complete
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
          setIsGeneratingCode(false);
          setCodeGenComplete(true);
          streamingStartedRef.current = false;
          if (onCodeGenCompleteRef.current) {
            onCodeGenCompleteRef.current();
          }
        }
      }, tickInterval);
    }
    
    // Only reset the started flag when external trigger turns off AND we're not currently streaming
    if (!externalIsGenerating && !intervalRef.current) {
      streamingStartedRef.current = false;
    }
  }, [externalIsGenerating, codeGenComplete, hasCodegenDiff, task.codegen_diff]);

  // Cleanup only on unmount - NOT on re-renders
  React.useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, []);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard!");
  };

  return (
    <div
      ref={ref}
      className={`
      bg-background border rounded-xl transition-all duration-300 overflow-hidden
      ${isExpanded ? "ring-1 ring-zinc-900 border-zinc-900 shadow-md" : "border-zinc-200 hover:border-zinc-300"}
    `}
    >
      {/* Header (Clickable for toggle) */}
      <div
        onClick={onToggle}
        className="p-4 cursor-pointer flex flex-col gap-3 relative"
      >
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`p-1.5 rounded-md ${codeGenComplete ? "bg-emerald-50 text-emerald-600" : "bg-zinc-100 text-primary-color"}`}
            >
              <Code2 className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-primary-color">
                {task.title}
              </div>
              <div className="text-[10px] font-mono text-primary-color">
                {task.file}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div
              className={`flex items-center gap-1.5 px-2 py-0.5 rounded text-[9px] font-bold border ${
                codeGenComplete
                  ? "bg-emerald-100 text-emerald-700 border-emerald-100"
                  : actualIsGeneratingCode
                    ? "bg-blue-100 text-blue-700 border-blue-100"
                    : "bg-zinc-50 text-primary-color border-zinc-100"
              }`}
            >
              {codeGenComplete ? (
                <>
                  <CheckCircle2 className="w-3 h-3" />
                  <span>COMPLETE</span>
                </>
              ) : actualIsGeneratingCode ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin" />
                  <span>GENERATING</span>
                </>
              ) : (
                <>
                  <Circle className="w-3 h-3" />
                  <span>
                    {task.tests_passed}/{task.tests_total} TESTS
                  </span>
                </>
              )}
            </div>
            <ChevronDown
              className={`w-4 h-4 text-primary-color transition-transform duration-300 ${isExpanded ? "rotate-180" : ""}`}
            />
          </div>
        </div>

        {/* Progress bar when generating */}
        {actualIsGeneratingCode && (
          <div className="w-full h-1 bg-zinc-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 transition-all duration-300 ease-out"
              style={{
                width: `${(streamedCode.length / (task.codegen_diff?.length || 1)) * 100}%`,
              }}
            />
          </div>
        )}
      </div>

      {/* Expanded Content Area */}
      {isExpanded && (
        <div className="border-t border-zinc-100 bg-zinc-50/50 animate-in slide-in-from-top-2 duration-200">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-zinc-100 bg-background">
            <div className="flex items-center gap-2">
              <FileDiff className="w-3.5 h-3.5 text-primary-color" />
              <span className="text-[10px] font-bold text-primary-color uppercase tracking-wider">
                Generated Code
              </span>
              {isGeneratingCode && (
                <span className="text-[9px] text-blue-600 animate-pulse">
                  Streaming...
                </span>
              )}
              {codeGenComplete && (
                <span className="bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full text-[9px]">
                  ✓
                </span>
              )}
            </div>
            {(streamedCode || codeGenComplete) && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  copyToClipboard(task.codegen_diff);
                }}
                className="flex items-center gap-1 px-2 py-1 text-[9px] font-bold text-primary-color hover:bg-zinc-100 rounded transition-colors"
              >
                <Copy className="w-3 h-3" />
                Copy
              </button>
            )}
          </div>

          {/* Code Gen Content */}
          <div className="p-4 min-h-[200px]">
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
              {!streamedCode && !isGeneratingCode && !codeGenComplete ? (
                <div className="h-40 flex flex-col items-center justify-center text-primary-color border-2 border-dashed border-zinc-200 rounded-xl bg-zinc-50/50">
                  <Sparkles className="w-8 h-8 mb-3 opacity-50 text-primary-color" />
                  {hasCodegenDiff ? (
                    <>
                      <p className="text-xs font-bold text-primary-color">
                        Ready to generate code
                      </p>
                      <p className="text-[10px] text-primary-color mt-1">
                        Click &quot;Generate Code&quot; button to start
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="text-xs font-bold text-primary-color">
                        No code generation available
                      </p>
                      <p className="text-[10px] text-primary-color mt-1">
                        This task doesn&apos;t have codegen diff defined
                      </p>
                    </>
                  )}
                </div>
              ) : (
                <div className="bg-zinc-900 rounded-lg border border-zinc-700 overflow-hidden">
                  <div className="px-3 py-2 bg-zinc-800 border-b border-zinc-700 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileText className="w-3 h-3 text-zinc-400" />
                      <span className="text-[10px] font-mono font-medium text-zinc-300">
                        {task.file}
                      </span>
                    </div>
                    {codeGenComplete && (
                      <span className="text-[9px] font-bold text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        Complete
                      </span>
                    )}
                  </div>
                  <div className="p-4 overflow-x-auto max-h-[300px] overflow-y-auto">
                    <DiffCodeBlock code={streamedCode || ""} />
                    {isGeneratingCode && (
                      <span className="inline-block w-2 h-4 bg-emerald-400 animate-pulse ml-1" />
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

MockTaskCard.displayName = "MockTaskCard";

// Legacy TaskCard component for API data (kept for backward compatibility)
const TaskCard = ({
  task,
  isExpanded,
  onToggle,
}: {
  task: import("@/lib/types/spec").TaskItem;
  isExpanded: boolean;
  onToggle: () => void;
}) => {
  const hasChanges = task.changes && task.changes.length > 0;
  // Default to 'logs' if no changes (Verification task), otherwise 'diff'
  const [activeTab, setActiveTab] = React.useState(
    hasChanges ? "diff" : "logs"
  );
  // Map API status to UI status
  const uiStatus = mapApiStatusToUI(task.status);
  const isPending = uiStatus === "pending";

  return (
    <div
      className={`
      bg-background border rounded-xl transition-all duration-300 overflow-hidden
      ${isExpanded ? "ring-1 ring-zinc-900 border-zinc-900 shadow-md" : "border-zinc-200 hover:border-zinc-300"}
      ${uiStatus === "running" && !isExpanded ? "shadow-lg shadow-blue-50 border-blue-200" : ""}
    `}
    >
      {/* Header (Clickable for toggle) */}
      <div
        onClick={onToggle}
        className="p-4 cursor-pointer flex flex-col gap-3 relative"
      >
        {uiStatus === "running" && !isExpanded && (
          <div className="absolute inset-0 bg-black/10 pointer-events-none" />
        )}

        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`p-1.5 rounded-md ${uiStatus === "completed" ? "bg-emerald-50 text-emerald-600" : "bg-zinc-100 text-primary-color"}`}
            >
              <Code2 className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-primary-color">
                {task.title}
              </div>
              <div className="text-[10px] font-mono text-primary-color">
                {task.file}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <StatusBadge status={uiStatus} tests={task.tests} />
            <ChevronDown
              className={`w-4 h-4 text-primary-color transition-transform duration-300 ${isExpanded ? "rotate-180" : ""}`}
            />
          </div>
        </div>

        {/* Mini Progress Bar */}
        {uiStatus === "running" && !isExpanded && (
          <div className="w-full h-1 bg-zinc-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-black transition-all duration-300 ease-out"
              style={{
                width: `${(task.tests.passed / (task.tests.total || 1)) * 100}%`,
              }}
            />
          </div>
        )}
      </div>

      {/* Expanded Content Area */}
      {isExpanded && (
        <div className="border-t border-zinc-100 bg-zinc-50/50 animate-in slide-in-from-top-2 duration-200">
          {/* Tabs */}
          <div className="flex items-center gap-1 px-4 border-b border-zinc-100 bg-background">
            {hasChanges && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveTab("diff");
                }}
                className={`flex items-center gap-2 px-3 py-2.5 text-[10px] font-bold border-b-2 transition-colors ${activeTab === "diff" ? "border-primary-color text-primary-color" : "border-transparent text-primary-color hover:text-primary-color"}`}
              >
                <FileDiff className="w-3 h-3" />
                Code Changes{" "}
                <span className="text-primary-color font-normal">
                  ({task.changes?.length || 0})
                </span>
              </button>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setActiveTab("tests");
              }}
              className={`flex items-center gap-2 px-3 py-2.5 text-[10px] font-bold border-b-2 transition-colors ${activeTab === "tests" ? "border-primary-color text-primary-color" : "border-transparent text-primary-color hover:text-primary-color"}`}
            >
              <TestTube className="w-3 h-3" />
              Verification
              {uiStatus === "completed" && (
                <span className="bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full text-[9px]">
                  {task.tests.passed}/{task.tests.total}
                </span>
              )}
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setActiveTab("logs");
              }}
              className={`flex items-center gap-2 px-3 py-2.5 text-[10px] font-bold border-b-2 transition-colors ${activeTab === "logs" ? "border-primary-color text-primary-color" : "border-transparent text-primary-color hover:text-primary-color"}`}
            >
              <ScrollText className="w-3 h-3" />
              Logs
            </button>
          </div>

          {/* Tab Views */}
          <div className="p-4 min-h-[160px]">
            {activeTab === "diff" &&
              hasChanges &&
              (isPending ? (
                <div className="h-32 flex flex-col items-center justify-center text-primary-color border-2 border-dashed border-zinc-200 rounded-xl bg-zinc-50/50">
                  <Hourglass className="w-6 h-6 mb-3 opacity-50 animate-pulse text-primary-color" />
                  <p className="text-xs font-bold text-primary-color">
                    Waiting to generate code...
                  </p>
                  <p className="text-[10px] text-primary-color mt-1">
                    Files will appear here when execution starts.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {task.changes?.map(
                    (
                      change: { path: string; lang: string; content: string },
                      idx: number
                    ) => (
                      <div
                        key={idx}
                        className="bg-background rounded-lg border border-zinc-200 overflow-hidden shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-300"
                        style={{ animationDelay: `${idx * 100}ms` }}
                      >
                        <div className="px-3 py-2 bg-zinc-50/80 border-b border-zinc-100 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <FileText className="w-3 h-3 text-primary-color" />
                            <span className="text-[10px] font-mono font-medium text-primary-color">
                              {change.path}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[9px] font-bold text-primary-color uppercase">
                              {change.lang}
                            </span>
                            <Copy className="w-3 h-3 text-primary-color cursor-pointer hover:text-primary-color" />
                          </div>
                        </div>
                        {change.content ? (
                          <pre className="p-3 overflow-x-auto text-[10px] font-mono leading-relaxed bg-background">
                            {change.content
                              .split("\n")
                              .map((line: string, i: number) => (
                                <div
                                  key={i}
                                  className={`${line.startsWith("+") ? "bg-emerald-50 text-emerald-900 w-full block -mx-3 px-3" : "text-primary-color"}`}
                                >
                                  <span className="inline-block w-6 text-primary-color select-none text-right mr-3 border-r border-zinc-100 pr-2">
                                    {i + 1}
                                  </span>
                                  {line}
                                </div>
                              ))}
                          </pre>
                        ) : (
                          <div className="p-4 text-center text-[10px] font-mono text-primary-color italic bg-background flex flex-col items-center gap-2">
                            <Loader2 className="w-4 h-4 animate-spin text-primary-color" />
                            <span className="text-primary-color">
                              Generating diff...
                            </span>
                          </div>
                        )}
                      </div>
                    )
                  )}
                </div>
              ))}

            {activeTab === "tests" && (
              <div className="grid grid-cols-1 gap-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                {/* 1. Test Definition */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-3.5 h-3.5 text-primary-color" />
                    <span className="text-[10px] font-bold text-primary-color uppercase tracking-wider">
                      Test Suite Definition
                    </span>
                  </div>
                  <div className="bg-background rounded-lg border border-zinc-200 overflow-hidden relative group">
                    <div className="p-4 overflow-x-auto">
                      <SimpleCodeBlock code={task.testCode || ""} />
                    </div>
                  </div>
                </div>

                {/* 2. Live Results */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Play className="w-3.5 h-3.5 text-primary-color" />
                    <span className="text-[10px] font-bold text-primary-color uppercase tracking-wider">
                      Live Execution Results
                    </span>
                  </div>
                  <div className="bg-background border border-zinc-200 rounded-lg divide-y divide-zinc-50">
                    {task.testResults && task.testResults.length > 0 ? (
                      task.testResults.map(
                        (
                          test: import("@/lib/types/spec").TaskTestResult,
                          i: number
                        ) => (
                          <div
                            key={i}
                            className="flex items-center justify-between p-3"
                          >
                            <div className="flex items-center gap-3">
                              {uiStatus === "completed" ? (
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                              ) : (
                                <Circle className="w-3.5 h-3.5 text-primary-color" />
                              )}
                              <span
                                className={`text-[11px] font-medium ${uiStatus === "completed" ? "text-primary-color" : "text-primary-color"}`}
                              >
                                {test.name}
                              </span>
                            </div>
                            <span
                              className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                                uiStatus === "completed"
                                  ? test.status === "PASSED"
                                    ? "bg-emerald-100 text-emerald-700"
                                    : "bg-red-100 text-red-700"
                                  : "bg-zinc-100 text-primary-color"
                              }`}
                            >
                              {uiStatus === "completed"
                                ? test.status === "PASSED"
                                  ? "PASSED"
                                  : "FAILED"
                                : "PENDING"}
                            </span>
                          </div>
                        )
                      )
                    ) : (
                      <div className="p-3 text-[11px] text-primary-color italic">
                        No test results available yet
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeTab === "logs" && (
              <div className="bg-zinc-900 rounded-lg p-3 font-mono text-[10px] text-zinc-300 space-y-1.5 min-h-[150px] max-h-[300px] overflow-y-auto animate-in fade-in slide-in-from-bottom-2 duration-300">
                {task.logs && task.logs.length > 0 ? (
                  task.logs.map((log: string, i: number) => (
                    <div key={i} className="flex gap-2">
                      <span className="text-primary-color select-none">
                        {">"}
                      </span>
                      <span>{log}</span>
                    </div>
                  ))
                ) : (
                  <div className="text-primary-color italic">
                    Waiting for logs...
                  </div>
                )}

                {uiStatus === "running" && (
                  <div className="animate-pulse text-primary-color">_</div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default function VerticalTaskExecution() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  // Note: taskId in URL is actually recipeId now
  const recipeId = params?.taskId as string;
  const planIdFromUrl = searchParams.get("planId");
  const itemNumberFromUrl = searchParams.get("itemNumber");
  const taskSplittingIdFromUrl = searchParams.get("taskSplittingId");
  const isDemoMode = searchParams.get("showcase") === "1";

  // Demo mode delay state
  const [demoDelayComplete, setDemoDelayComplete] = useState(!isDemoMode);

  // Use mock data mode - set to true to use mock data (or enable in demo mode)
  const [useMockData, setUseMockData] = useState(true);
  const [activePlanItemKey, setActivePlanItemKey] = useState("plan_item_0");
  const [expandedMockTaskKey, setExpandedMockTaskKey] = useState<string | null>(
    null
  );

  const [activeSliceId, setActiveSliceId] = useState(
    itemNumberFromUrl ? parseInt(itemNumberFromUrl) : 1
  );
  const [completedSlices, setCompletedSlices] = useState<number[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  // Task Splitting API State
  const [planId, setPlanId] = useState<string | null>(planIdFromUrl);
  const [planItems, setPlanItems] = useState<PlanItem[]>([]);
  const [isLoadingPlanItems, setIsLoadingPlanItems] = useState(false);
  const [taskSplittingId, setTaskSplittingId] = useState<string | null>(
    taskSplittingIdFromUrl || null
  );
  const [taskSplittingStatus, setTaskSplittingStatus] =
    useState<TaskSplittingStatusResponse | null>(null);
  const [allLayers, setAllLayers] = useState<TaskLayer[]>([]);
  const [nextLayerOrder, setNextLayerOrder] = useState<number | null>(0);
  const [isLoadingLayers, setIsLoadingLayers] = useState(false);

  // Graph Loading & Data State
  const [currentDag, setCurrentDag] = useState<TaskLayer[]>([]); // Array of layers from API
  const [isGraphLoading, setIsGraphLoading] = useState(true); // Start as loading
  const [graphLoadIndex, setGraphLoadIndex] = useState(0); // Tracks how many levels are shown

  const [globalLogs, setGlobalLogs] = useState<string[]>([]);
  const [showGlobalLogs, setShowGlobalLogs] = useState(false);
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);
  
  // Code generation state for mock tasks
  const [generatingTaskIndex, setGeneratingTaskIndex] = useState<number | null>(null);
  const [completedCodeGenTasks, setCompletedCodeGenTasks] = useState<Set<number>>(new Set());
  const [isAutoGenerating, setIsAutoGenerating] = useState(false);
  const [completedPhases, setCompletedPhases] = useState<Set<string>>(new Set());

  const terminalRef = useRef<HTMLDivElement>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const taskCardRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  // Demo mode delay effect
  useEffect(() => {
    if (!isDemoMode) return;
    
    console.log("[Code Page] Demo mode active - starting 35 second delay");
    const timer = setTimeout(() => {
      console.log("[Code Page] Demo mode delay complete");
      setDemoDelayComplete(true);
    }, DEMO_MODE_DELAY);

    return () => clearTimeout(timer);
  }, [isDemoMode]);

  // Get mock plan items for sidebar
  const mockPlanItemKeys = Object.keys(MOCK_PLAN_DATA).sort((a, b) => {
    const orderA = MOCK_PLAN_DATA[a]?.[0]?.order || 0;
    const orderB = MOCK_PLAN_DATA[b]?.[0]?.order || 0;
    return orderA - orderB;
  });

  const activeMockPhase = MOCK_PLAN_DATA[activePlanItemKey]?.[0];

  // Helper function to scroll to a task card
  const scrollToTaskCard = useCallback((taskKey: string) => {
    const taskCard = taskCardRefs.current.get(taskKey);
    if (taskCard) {
      taskCard.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, []);

  // Function to start code generation animation
  const startCodeGeneration = useCallback(() => {
    if (!activeMockPhase || isAutoGenerating) return;
    
    setIsAutoGenerating(true);
    setCompletedCodeGenTasks(new Set());
    
    // Find first task with codegen_diff
    const tasksWithCodegenDiff = activeMockPhase.tasks
      .map((task, idx) => ({ task, idx }))
      .filter(({ task }) => task.codegen_diff && task.codegen_diff.length > 0);
    
    if (tasksWithCodegenDiff.length === 0) {
      setIsAutoGenerating(false);
      return;
    }
    
    const firstTaskIndex = tasksWithCodegenDiff[0].idx;
    const taskKey = `${activePlanItemKey}_task_${firstTaskIndex}`;
    
    // Expand the first task and start generating
    setExpandedMockTaskKey(taskKey);
    setGeneratingTaskIndex(firstTaskIndex);
    
    // Scroll to the task card after a short delay to allow expansion
    setTimeout(() => scrollToTaskCard(taskKey), 100);
  }, [activeMockPhase, activePlanItemKey, isAutoGenerating, scrollToTaskCard]);

  // Handle code generation completion for a task
  const handleCodeGenComplete = useCallback((taskIdx: number) => {
    setCompletedCodeGenTasks(prev => {
      const updated = new Set([...prev, taskIdx]);
      return updated;
    });
    setGeneratingTaskIndex(null);
    
    // Find next task with codegen_diff
    setTimeout(() => {
      if (!activeMockPhase) return;
      
      const tasksWithCodegenDiff = activeMockPhase.tasks
        .map((t, idx) => ({ task: t, idx }))
        .filter(({ task }) => task.codegen_diff && task.codegen_diff.length > 0);
      
      // Get updated completed tasks including the current one
      const currentCompleted = new Set([...completedCodeGenTasks, taskIdx]);
      
      const nextTask = tasksWithCodegenDiff.find(
        ({ idx }) => !currentCompleted.has(idx)
      );
      
      if (nextTask) {
        // Move to next task
        const nextTaskKey = `${activePlanItemKey}_task_${nextTask.idx}`;
        setExpandedMockTaskKey(nextTaskKey);
        setGeneratingTaskIndex(nextTask.idx);
        
        // Scroll to the next task card
        setTimeout(() => scrollToTaskCard(nextTaskKey), 100);
      } else {
        // All tasks in this phase are complete, mark phase as done
        setCompletedPhases(prev => new Set([...prev, activePlanItemKey]));
        
        // Find next phase with tasks that have codegen_diff
        const currentPhaseIndex = mockPlanItemKeys.indexOf(activePlanItemKey);
        let nextPhaseKey: string | null = null;
        
        for (let i = currentPhaseIndex + 1; i < mockPlanItemKeys.length; i++) {
          const phaseKey = mockPlanItemKeys[i];
          const phase = MOCK_PLAN_DATA[phaseKey]?.[0];
          const hasTasksWithCodegenDiff = phase?.tasks.some(
            task => task.codegen_diff && task.codegen_diff.length > 0
          );
          if (hasTasksWithCodegenDiff) {
            nextPhaseKey = phaseKey;
            break;
          }
        }
        
        if (nextPhaseKey) {
          // Move to next phase
          setTimeout(() => {
            setActivePlanItemKey(nextPhaseKey!);
            setCompletedCodeGenTasks(new Set());
            setExpandedMockTaskKey(null);
            
            // Auto-start generation on next phase after a delay
            setTimeout(() => {
              const nextPhase = MOCK_PLAN_DATA[nextPhaseKey!]?.[0];
              const firstTask = nextPhase?.tasks
                .map((t, idx) => ({ task: t, idx }))
                .find(({ task }) => task.codegen_diff && task.codegen_diff.length > 0);
              
              if (firstTask) {
                const taskKey = `${nextPhaseKey}_task_${firstTask.idx}`;
                setExpandedMockTaskKey(taskKey);
                setGeneratingTaskIndex(firstTask.idx);
                setTimeout(() => scrollToTaskCard(taskKey), 100);
              }
            }, 500);
          }, 800);
        } else {
          // All phases complete - keep last task accordion open
          setIsAutoGenerating(false);
          // Keep the last completed task expanded
          const lastTaskKey = `${activePlanItemKey}_task_${taskIdx}`;
          setExpandedMockTaskKey(lastTaskKey);
          toast.success("Code generation complete for all phases!");
        }
      }
    }, 500);
  }, [activeMockPhase, activePlanItemKey, completedCodeGenTasks, mockPlanItemKeys, scrollToTaskCard]);

  // Get plan_id from URL or try to get latest plan for recipe
  useEffect(() => {
    if (!planId && recipeId) {
      // Try to get latest plan for this recipe
      PlanService.getPlanStatusByRecipeId(recipeId)
        .then((status) => {
          if (status.plan_id) {
            setPlanId(status.plan_id);
            const params = new URLSearchParams(searchParams.toString());
            params.set("planId", status.plan_id);
            // Default to item 1 if no itemNumber specified
            if (!params.get("itemNumber")) {
              params.set("itemNumber", "1");
            }
            router.replace(`/task/${recipeId}/code?${params.toString()}`);
          }
        })
        .catch((error) => {
          console.error("Error fetching plan status:", error);
        });
    }
  }, [planId, recipeId]);

  // Submit task splitting when we have planId and itemNumber but no taskSplittingId
  useEffect(() => {
    if (!planId || !activeSliceId || taskSplittingId) return;
    // Wait for plan items to be loaded before submitting
    if (planItems.length === 0 || isLoadingPlanItems) return;

    // Priority 1: Check URL parameter
    if (taskSplittingIdFromUrl) {
      setTaskSplittingId(taskSplittingIdFromUrl);
      localStorage.setItem(
        `task_splitting_${planId}_${activeSliceId}`,
        taskSplittingIdFromUrl
      );
      return;
    }

    // Priority 2: Check localStorage
    const storedTaskSplittingId = localStorage.getItem(
      `task_splitting_${planId}_${activeSliceId}`
    );
    if (storedTaskSplittingId) {
      setTaskSplittingId(storedTaskSplittingId);
      return;
    }

    // Priority 3: Submit new task splitting request
    const submitTaskSplitting = async () => {
      try {
        // Find the plan item by item_number to get its id (plan_item_id)
        const planItem = planItems.find(
          (item) => item.item_number === activeSliceId
        );
        if (!planItem) {
          console.error(
            "[Code Page] Plan item not found for item_number:",
            activeSliceId
          );
          console.error(
            "[Code Page] Available plan items:",
            planItems.map((item) => item.item_number)
          );
          // Don't show error toast - just wait for plan items to load or user to select valid item
          return;
        }

        console.log(
          "[Code Page] Submitting task splitting for plan_item_id:",
          planItem.id
        );
        const response = await TaskSplittingService.submitTaskSplitting({
          plan_item_id: planItem.id,
        });
        console.log("[Code Page] Task splitting submitted:", response);
        setTaskSplittingId(response.task_splitting_id);
        localStorage.setItem(
          `task_splitting_${planId}_${activeSliceId}`,
          response.task_splitting_id
        );

        // Update URL with taskSplittingId
        const params = new URLSearchParams(searchParams.toString());
        params.set("taskSplittingId", response.task_splitting_id);
        router.replace(`/task/${recipeId}/code?${params.toString()}`);

        toast.success("Task splitting started");
      } catch (error: any) {
        console.error("[Code Page] Error submitting task splitting:", error);
        toast.error(error.message || "Failed to start task splitting");
      }
    };

    submitTaskSplitting();
  }, [
    planId,
    activeSliceId,
    taskSplittingId,
    taskSplittingIdFromUrl,
    searchParams,
    recipeId,
    router,
    planItems,
    isLoadingPlanItems,
  ]);

  // Fetch plan items for sidebar display
  useEffect(() => {
    if (!planId || planItems.length > 0) return;

    const fetchPlanItems = async () => {
      setIsLoadingPlanItems(true);
      try {
        console.log("[Code Page] Fetching plan items for planId:", planId);
        let allItems: any[] = [];
        let start = 0;
        let hasMore = true;

        while (hasMore) {
          const response = await PlanService.getPlanItems(planId, start, 20);
          allItems = [...allItems, ...response.plan_items];
          if (response.next_start === null) {
            hasMore = false;
          } else {
            start = response.next_start;
          }
        }

        console.log("[Code Page] Fetched plan items:", allItems.length);
        setPlanItems(allItems);
      } catch (error) {
        console.error("[Code Page] Error fetching plan items:", error);
      } finally {
        setIsLoadingPlanItems(false);
      }
    };

    fetchPlanItems();
  }, [planId, planItems.length]);

  // 1. Reset State when Slice Changes
  useEffect(() => {
    // Only reset if we haven't completed this slice
    if (!completedSlices.includes(activeSliceId)) {
      setCurrentDag([]);
      setAllLayers([]);
      setGlobalLogs([]);
      setGraphLoadIndex(0);
      setIsRunning(false);
      setIsGraphLoading(true); // Start the step-by-step graph loading
      setTaskSplittingId(null); // Reset task splitting ID to trigger new submission
      setTaskSplittingStatus(null); // Reset status
    } else {
      // If revisiting completed slice, show full graph immediately
      // Try to get stored task_splitting_id for this slice
      if (planId) {
        const storedTaskSplittingId = localStorage.getItem(
          `task_splitting_${planId}_${activeSliceId}`
        );
        if (
          storedTaskSplittingId &&
          storedTaskSplittingId !== taskSplittingId
        ) {
          setTaskSplittingId(storedTaskSplittingId);
        }
      }
      setCurrentDag(allLayers);
      setIsGraphLoading(false); // Already loaded
      setGraphLoadIndex(allLayers.length);
    }
  }, [activeSliceId, planId]);

  // 2. Poll for task splitting status and fetch layers
  useEffect(() => {
    if (!taskSplittingId) return;

    let mounted = true;
    let pollInterval: NodeJS.Timeout;

    // Fetch layers with pagination
    const fetchLayersWithPagination = async () => {
      try {
        console.log("[Code Page] Fetching layers with pagination");
        let allLayersData: TaskLayer[] = [];
        let start = 0;
        let hasMore = true;

        while (hasMore) {
          const response = await TaskSplittingService.getTaskSplittingItems(
            taskSplittingId,
            start,
            10
          );
          console.log(
            "[Code Page] Fetched layers:",
            response.layers.length,
            "next_layer_order:",
            response.next_layer_order
          );
          allLayersData = [...allLayersData, ...response.layers];

          if (response.next_layer_order === null) {
            hasMore = false;
          } else {
            start = response.next_layer_order;
          }
        }

        if (!mounted) return;

        setAllLayers(allLayersData);
        setNextLayerOrder(null);

        // Update current DAG for display
        if (allLayersData.length > 0) {
          setCurrentDag(allLayersData);
          setGraphLoadIndex(allLayersData.length);
        }
      } catch (error) {
        console.error("[Code Page] Error fetching layers:", error);
      }
    };

    const fetchStatusAndLayers = async () => {
      try {
        console.log(
          "[Code Page] Polling task splitting status for:",
          taskSplittingId
        );
        const status =
          await TaskSplittingService.getTaskSplittingStatus(taskSplittingId);

        if (!mounted) return;

        console.log("[Code Page] Task splitting status:", status);
        setTaskSplittingStatus(status);

        // Always fetch layers if available (even during IN_PROGRESS)
        if (status.status === "COMPLETED" || status.status === "IN_PROGRESS") {
          await fetchLayersWithPagination();
        }

        // Stop polling if task splitting is done
        if (status.status === "COMPLETED" || status.status === "FAILED") {
          if (pollInterval) clearInterval(pollInterval);

          if (status.status === "COMPLETED") {
            setIsGraphLoading(false);
          }
        }
      } catch (error) {
        console.error(
          "[Code Page] Error polling task splitting status:",
          error
        );
      }
    };

    // Initial fetch
    fetchStatusAndLayers();

    // Set up polling every 2 seconds
    pollInterval = setInterval(fetchStatusAndLayers, 2000);

    return () => {
      mounted = false;
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [taskSplittingId]);

  // 3. Step-by-Step Graph Discovery (Loading Phase) - progressive reveal
  useEffect(() => {
    if (!isGraphLoading) return;

    // Wait for task splitting to complete and layers to be fetched
    if (taskSplittingStatus?.status !== "COMPLETED" || allLayers.length === 0) {
      return;
    }

    // Load layers progressively
    if (graphLoadIndex < allLayers.length) {
      const timer = setTimeout(() => {
        const nextLayer = allLayers[graphLoadIndex];
        setCurrentDag((prev) => [...prev, nextLayer]);
        setGraphLoadIndex((prev) => prev + 1);
      }, 600); // 600ms delay between levels appearing

      return () => clearTimeout(timer);
    } else {
      // Done loading graph
      setIsGraphLoading(false);
    }
  }, [
    isGraphLoading,
    graphLoadIndex,
    activeSliceId,
    allLayers,
    taskSplittingStatus,
  ]);

  // 4. Poll for codegen updates (when running)
  useEffect(() => {
    if (!taskSplittingId || !isRunning) return;

    let mounted = true;

    const pollCodegenStatus = async () => {
      try {
        const status =
          await TaskSplittingService.getTaskSplittingStatus(taskSplittingId);

        if (!mounted) return;

        setTaskSplittingStatus(status);

        // If codegen is in progress or completed, fetch updated layers
        if (
          status.codegen_status === "IN_PROGRESS" ||
          status.codegen_status === "COMPLETED"
        ) {
          // Fetch all layers to get updated task statuses
          let allLayersData: TaskLayer[] = [];
          let start = 0;
          let hasMore = true;

          try {
            while (hasMore) {
              const response = await TaskSplittingService.getTaskSplittingItems(
                taskSplittingId,
                start,
                10
              );
              allLayersData = [...allLayersData, ...response.layers];
              if (response.next_layer_order === null) {
                hasMore = false;
              } else {
                start = response.next_layer_order;
              }
            }

            if (!mounted) return;

            setAllLayers(allLayersData);
            setCurrentDag(allLayersData);
          } catch (layerError) {
            console.error("[Code Page] Error fetching layers:", layerError);
          }

          // Check if all tasks are completed
          const allCompleted = allLayersData.every((layer) => {
            const layerStatus = mapApiStatusToUI(layer.status);
            return (
              layerStatus === "completed" ||
              layer.tasks.every((task) => {
                const taskStatus = mapApiStatusToUI(task.status);
                return taskStatus === "completed";
              })
            );
          });

          if (allCompleted && !completedSlices.includes(activeSliceId)) {
            setCompletedSlices((prev) => [...prev, activeSliceId]);
            setGlobalLogs((prev) => [
              ...prev,
              `SUCCESS: Vertical Slice ${String(activeSliceId).padStart(2, "0")} verified.`,
            ]);

            // Auto-advance to next slice if available
            const nextSlice = planItems.find(
              (item) => item.item_number > activeSliceId
            );
            if (nextSlice) {
              setTimeout(() => {
                setActiveSliceId(nextSlice.item_number);
              }, 1000);
            } else {
              setIsRunning(false);
            }
          }
        }

        if (
          status.codegen_status === "COMPLETED" ||
          status.codegen_status === "FAILED"
        ) {
          setIsRunning(false);
        }
      } catch (error) {
        console.error("[Code Page] Error polling codegen status:", error);
      }
    };

    const pollInterval = setInterval(pollCodegenStatus, 2000);

    return () => {
      mounted = false;
      clearInterval(pollInterval);
    };
  }, [taskSplittingId, isRunning, activeSliceId, completedSlices, planItems]);

  // Auto-scroll logic
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [globalLogs, showGlobalLogs]);

  // Auto-scroll sidebar
  useEffect(() => {
    if (sidebarRef.current) {
      const activeEl = sidebarRef.current.querySelector('[data-active="true"]');
      if (activeEl) {
        activeEl.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
    }
  }, [activeSliceId]);

  const isSliceComplete = completedSlices.includes(activeSliceId);
  const activeSliceMeta = planItems.find(
    (item) => item.item_number === activeSliceId
  );

  // Manual navigation
  const handleManualSliceChange = (id: number) => {
    setActiveSliceId(id);
    // Update URL with itemNumber
    const params = new URLSearchParams(searchParams.toString());
    params.set("itemNumber", id.toString());
    if (planId) {
      params.set("planId", planId);
    }
    router.replace(`/task/${recipeId}/code?${params.toString()}`);
  };

  // Show loading for demo mode delay
  if (isDemoMode && !demoDelayComplete) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary-color" />
          <p className="text-primary-color">Generating code implementation...</p>
        </div>
      </div>
    );
  }

  // Show loading if we don't have planId or recipeId
  if (!planId && !recipeId) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary-color" />
          <p className="text-primary-color">Loading task data...</p>
        </div>
      </div>
    );
  }

  // Show loading if task splitting is being submitted
  // if (planId && !taskSplittingId && !taskSplittingStatus) {
  //   return (
  //     <div className="flex items-center justify-center min-h-screen">
  //       <div className="text-center">
  //         <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary-color" />
  //         <p className="text-primary-color">Starting task splitting...</p>
  //         <p className="text-sm text-primary-color mt-2">Preparing execution plan for Slice {String(activeSliceId).padStart(2, '0')}</p>
  //       </div>
  //     </div>
  //   );
  // }

  // Show loading if task splitting is in progress and no layers yet
  if (taskSplittingStatus?.status === "IN_PROGRESS" && allLayers.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary-color" />
          <p className="text-primary-color">
            Generating task execution plan...
          </p>
          <p className="text-sm text-primary-color mt-2">
            Step {taskSplittingStatus.current_step + 1}/2
          </p>
        </div>
      </div>
    );
  }

  // Show loading if task splitting is submitted and waiting
  if (taskSplittingStatus?.status === "SUBMITTED" && allLayers.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary-color" />
          <p className="text-primary-color">
            Task splitting submitted, waiting to start...
          </p>
        </div>
      </div>
    );
  }

  // Render Mock Data View
  if (useMockData) {
    return (
      <div className="h-screen bg-[#FAF8F7] text-primary-color font-sans flex flex-col md:flex-row overflow-hidden relative">
        {/* --- SIDEBAR: Plan Items Timeline --- */}
        <aside className="w-80 bg-[#FAF8F7] border-r border-zinc-200 flex flex-col z-20 shrink-0">
          <div className="h-16 flex items-center justify-between px-6 border-b border-zinc-100 bg-zinc-50/80 backdrop-blur-sm sticky top-0">
            <h2 className="text-base font-bold text-primary-color">
              Plan Phases
            </h2>
          </div>

          <div ref={sidebarRef} className="flex-1 overflow-y-auto p-6 relative">
            {/* Continuous Vertical Line */}
            <div className="absolute left-[35px] top-6 bottom-6 w-[1px] bg-zinc-200 z-0" />

            <div className="space-y-8 relative z-10">
              {mockPlanItemKeys.map((planItemKey, idx) => {
                const phase = MOCK_PLAN_DATA[planItemKey]?.[0];
                if (!phase) return null;

                const isActive = activePlanItemKey === planItemKey;
                const taskCount = phase.tasks.length;

                return (
                  <div
                    key={planItemKey}
                    data-active={isActive}
                    className={`group flex gap-4 ${isAutoGenerating && !isActive ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                    onClick={() => !isAutoGenerating && setActivePlanItemKey(planItemKey)}
                  >
                    {/* Timeline Node */}
                    <div
                      className={`
                        w-7 h-7 rounded-full border-2 flex items-center justify-center shrink-0 transition-all duration-300 bg-background relative z-10
                        ${
                          completedPhases.has(planItemKey)
                            ? "border-emerald-500 text-emerald-500 bg-emerald-50"
                            : isActive
                              ? "border-primary-color text-primary-color scale-110 shadow-sm"
                              : "border-zinc-200 text-primary-color"
                        }
                      `}
                    >
                      {completedPhases.has(planItemKey) ? (
                        <Check className="w-3.5 h-3.5" />
                      ) : (
                        <span className="text-[10px] font-bold">
                          {phase.order + 1}
                        </span>
                      )}
                    </div>

                    {/* Text Content */}
                    <div
                      className={`flex-1 pt-0.5 transition-all duration-300 ${isActive ? "translate-x-1" : ""}`}
                    >
                      <h3
                        className={`text-xs font-bold leading-tight ${isActive ? "text-primary-color" : "text-primary-color group-hover:text-primary-color"}`}
                      >
                        {phase.title}
                      </h3>
                      <p className="text-[10px] text-primary-color leading-relaxed mt-1">
                        {taskCount} task{taskCount !== 1 ? "s" : ""}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </aside>

        {/* --- MAIN CONTENT: Tasks --- */}
        <main className="flex-1 flex flex-col h-full min-w-0 bg-background">
          {/* Header */}
          <header className="h-16 flex items-center justify-between px-8 border-b border-zinc-100">
            <div>
              <h1 className="text-lg font-bold text-primary-color tracking-tight">
                {activeMockPhase?.title || "Select a Phase"}
              </h1>
              <p className="text-[10px] text-primary-color font-medium uppercase tracking-widest">
                {activeMockPhase?.tasks.length || 0} Tasks in this phase
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={startCodeGeneration}
                disabled={!activeMockPhase || isAutoGenerating || 
                  activeMockPhase.tasks.every((task, idx) => 
                    !task.codegen_diff || task.codegen_diff.length === 0 || completedCodeGenTasks.has(idx)
                  )}
                className={`
                  flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold transition-all border
                  ${
                    isAutoGenerating || !activeMockPhase ||
                    activeMockPhase.tasks.every((task, idx) => 
                      !task.codegen_diff || task.codegen_diff.length === 0 || completedCodeGenTasks.has(idx)
                    )
                      ? "bg-zinc-100 border-zinc-200 text-primary-color cursor-not-allowed opacity-50"
                      : "bg-accent-color text-primary-color hover:bg-[#006B66] hover:text-accent-color"
                  }
                `}
              >
                {isAutoGenerating ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Generating...
                  </>
                ) : completedPhases.has(activePlanItemKey) ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    Complete
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    Generate Code
                  </>
                )}
              </button>
              <button
                onClick={() => setShowGlobalLogs(!showGlobalLogs)}
                className={`
                  flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold transition-all border
                  ${
                    showGlobalLogs
                      ? "bg-zinc-100 border-zinc-200 text-primary-color"
                      : "bg-background border-zinc-200 text-primary-color hover:bg-[#006B66] hover:text-accent-color"
                  }
                `}
              >
                <TerminalSquare className="w-3.5 h-3.5" />
                {showGlobalLogs ? "Hide Logs" : "Show Logs"}
              </button>
            </div>
          </header>

          {/* Content Area */}
          <div className="flex-1 flex overflow-hidden">
            {/* Tasks List */}
            <div className="flex-1 overflow-y-auto p-8 bg-zinc-50/30">
              {activeMockPhase ? (
                <div className="max-w-2xl mx-auto space-y-4 pb-12">
                  {activeMockPhase.tasks.map((task, taskIdx) => {
                    const taskKey = `${activePlanItemKey}_task_${taskIdx}`;
                    return (
                      <MockTaskCard
                        key={taskKey}
                        ref={(el) => {
                          if (el) {
                            taskCardRefs.current.set(taskKey, el);
                          } else {
                            taskCardRefs.current.delete(taskKey);
                          }
                        }}
                        task={task}
                        isExpanded={expandedMockTaskKey === taskKey}
                        onToggle={() => {
                          // Allow toggling accordions even during code generation
                          setExpandedMockTaskKey(
                            expandedMockTaskKey === taskKey ? null : taskKey
                          );
                        }}
                        taskIndex={taskIdx}
                        phaseIndex={activeMockPhase.order}
                        isGeneratingCode={generatingTaskIndex === taskIdx}
                        onCodeGenComplete={() => handleCodeGenComplete(taskIdx)}
                      />
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full opacity-50">
                  <List className="w-12 h-12 mb-4 text-primary-color" />
                  <p className="text-sm text-primary-color font-medium">
                    Select a phase to view tasks
                  </p>
                </div>
              )}
            </div>

            {/* Terminal */}
            {showGlobalLogs && (
              <div className="w-80 border-l border-zinc-200 bg-background flex flex-col shrink-0 animate-in slide-in-from-right duration-300">
                <div className="h-10 border-b border-zinc-100 flex items-center justify-between px-4 bg-zinc-50/50">
                  <div className="flex items-center gap-2">
                    <TerminalSquare className="w-3.5 h-3.5 text-primary-color" />
                    <span className="text-[10px] font-bold text-primary-color uppercase tracking-wider">
                      Activity Log
                    </span>
                  </div>
                </div>

                <div
                  ref={terminalRef}
                  className="flex-1 p-4 overflow-y-auto font-mono text-[10px] space-y-2 bg-background"
                >
                  <div className="text-primary-color">
                    <span className="text-zinc-400 select-none">{">"}</span>{" "}
                    Mock data mode active
                  </div>
                  <div className="text-primary-color">
                    <span className="text-zinc-400 select-none">{">"}</span>{" "}
                    Viewing: {activeMockPhase?.title || "No phase selected"}
                  </div>
                  <div className="text-emerald-600">
                    <span className="text-zinc-400 select-none">{">"}</span>{" "}
                    Tasks loaded: {activeMockPhase?.tasks.length || 0}
                  </div>
                  {isAutoGenerating && (
                    <div className="text-blue-600 animate-pulse">
                      <span className="text-zinc-400 select-none">{">"}</span>{" "}
                      Generating code... Task {generatingTaskIndex !== null ? generatingTaskIndex + 1 : 0}/{activeMockPhase?.tasks.filter(t => t.codegen_diff && t.codegen_diff.length > 0).length || 0}
                    </div>
                  )}
                  {completedCodeGenTasks.size > 0 && (
                    <div className="text-emerald-600">
                      <span className="text-zinc-400 select-none">{">"}</span>{" "}
                      Completed: {completedCodeGenTasks.size} task{completedCodeGenTasks.size !== 1 ? "s" : ""}
                    </div>
                  )}
                  {completedPhases.size > 0 && (
                    <div className="text-emerald-600 font-bold">
                      <span className="text-zinc-400 select-none">{">"}</span>{" "}
                      Phases complete: {completedPhases.size}/{mockPlanItemKeys.length}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    );
  }

  // Original API-based view
  return (
    <div className="h-screen bg-[#FAF8F7] text-primary-color font-sans flex flex-col md:flex-row overflow-hidden relative">
      {/* --- SIDEBAR: Timeline --- */}
      <aside className="w-80 bg-[#FAF8F7] border-r border-zinc-200 flex flex-col z-20 shrink-0">
        <div className="h-16 flex items-center px-6 border-b border-zinc-100 bg-zinc-50/80 backdrop-blur-sm sticky top-0">
          <h2 className="text-base font-bold text-primary-color">Slices</h2>
        </div>

        <div ref={sidebarRef} className="flex-1 overflow-y-auto p-6 relative">
          {/* Continuous Vertical Line */}
          <div className="absolute left-[35px] top-6 bottom-6 w-[1px] bg-zinc-200 z-0" />

          <div className="space-y-8 relative z-10">
            {planItems.length > 0 ? (
              planItems.map((slice: PlanItem, idx: number) => {
                const sliceId = slice.item_number;
                const isCompleted = completedSlices.includes(sliceId);
                const isLocked =
                  idx > 0 &&
                  !completedSlices.includes(planItems[idx - 1]?.item_number);
                const isActive = activeSliceId === sliceId;

                return (
                  <div
                    key={slice.id}
                    data-active={isActive}
                    className={`group flex gap-4 ${isLocked ? " pointer-events-none" : "cursor-pointer"}`}
                    onClick={() =>
                      !isLocked && handleManualSliceChange(sliceId)
                    }
                  >
                    {/* Timeline Node */}
                    <div
                      className={`
                      w-7 h-7 rounded-full border-2 flex items-center justify-center shrink-0 transition-all duration-300 bg-background relative z-10
                      ${
                        isCompleted
                          ? "border-emerald-500 text-emerald-500"
                          : isActive
                            ? "border-primary-color text-primary-color scale-110 shadow-sm"
                            : "border-zinc-200 text-primary-color"
                      }
                    `}
                    >
                      {isCompleted ? (
                        <Check className="w-3.5 h-3.5" />
                      ) : (
                        <span className="text-[10px] font-bold">
                          {slice.item_number}
                        </span>
                      )}
                    </div>

                    {/* Text Content */}
                    <div
                      className={`flex-1 pt-0.5 transition-all duration-300 ${isActive ? "translate-x-1" : ""}`}
                    >
                      <h3
                        className={`text-xs font-bold leading-tight ${isActive ? "text-primary-color" : "text-primary-color group-hover:text-primary-color"}`}
                      >
                        {slice.title}
                      </h3>
                      <p className="text-[10px] text-primary-color leading-relaxed mt-1 line-clamp-2">
                        {slice.description}
                      </p>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-8 text-primary-color text-sm">
                {isLoadingPlanItems
                  ? "Loading plan items..."
                  : "No plan items available"}
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* --- MAIN CONTENT: Right Part --- */}
      <main className="flex-1 flex flex-col h-full min-w-0 bg-background">
        {/* Header */}
        <header className="h-16 flex items-center justify-between px-8 border-b border-zinc-100">
          <div>
            <h1 className="text-lg font-bold text-primary-color tracking-tight">
              {activeSliceMeta?.title || `Slice ${activeSliceId}`}
            </h1>
            <div className="flex items-center gap-2">
              <p className="text-[10px] text-primary-color font-medium uppercase tracking-widest">
                Execution Graph
              </p>
              {isGraphLoading && (
                <Loader2 className="w-3 h-3 animate-spin text-primary-color" />
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowGlobalLogs(!showGlobalLogs)}
              className={`
                  flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold transition-all border
                  ${
                    showGlobalLogs
                      ? "bg-zinc-100 border-zinc-200 text-primary-color"
                      : "bg-background border-zinc-200 text-primary-color hover:bg-[#006B66] hover:text-accent-color"
                  }
                `}
            >
              <TerminalSquare className="w-3.5 h-3.5" />
              {showGlobalLogs ? "Hide Logs" : "Show Logs"}
            </button>

            {isSliceComplete ? (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-50 text-primary-color rounded-md border border-zinc-100 text-xs font-bold">
                <ShieldCheck className="w-3.5 h-3.5" />
                Verified
              </div>
            ) : (
              <button
                onClick={() => setIsRunning(!isRunning)}
                disabled={isGraphLoading}
                className={`
                   flex items-center gap-2 px-5 py-2 rounded-lg text-xs font-bold transition-all
                   ${
                     isGraphLoading
                       ? "bg-zinc-100 text-primary-color cursor-not-allowed"
                       : isRunning
                         ? "bg-background border border-zinc-200 text-primary-color hover:bg-[#006B66] hover:text-accent-color"
                         : "bg-accent-color text-primary-color hover:bg-[#006B66] hover:text-accent-color shadow-sm"
                   }
                 `}
              >
                {isGraphLoading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-primary-color" />{" "}
                    Loading Plan...
                  </>
                ) : isRunning ? (
                  <>
                    <Pause className="w-3.5 h-3.5 fill-current" /> Pause
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 fill-current" /> Start Codegen
                  </>
                )}
              </button>
            )}
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 flex overflow-hidden">
          {/* DAG Visualization (Fills available space) */}
          <div className="flex-1 overflow-y-auto p-8 bg-zinc-50/30">
            {/* If loading graph, show simple indicator */}
            {currentDag.length === 0 && isGraphLoading && (
              <div className="flex flex-col items-center justify-center h-full opacity-50 space-y-4">
                <div className="flex gap-2">
                  <div className="w-2 h-2 bg-primary-color rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                  <div className="w-2 h-2 bg-primary-color rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                  <div className="w-2 h-2 bg-primary-color rounded-full animate-bounce"></div>
                </div>
                <p className="text-xs text-primary-color font-mono">
                  Discovering dependencies...
                </p>
              </div>
            )}

            {currentDag.length > 0 && (
              <div className="max-w-2xl mx-auto space-y-8 pb-12">
                {currentDag.map((level, idx) => {
                  // Map API status to UI status
                  const levelStatus = mapApiStatusToUI(level.status);
                  const isActive =
                    levelStatus === "running" || level.status === "IN_PROGRESS";
                  const isDone =
                    levelStatus === "completed" || level.status === "COMPLETED";

                  return (
                    <div
                      key={idx}
                      className="relative animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out"
                    >
                      {/* Level Connector */}
                      {idx !== currentDag.length - 1 && (
                        <div className="absolute left-[19px] top-10 bottom-[-32px] w-[2px] bg-zinc-100" />
                      )}

                      <div className="flex items-start gap-6">
                        {/* Level Icon */}
                        <div
                          className={`
                              w-10 h-10 rounded-xl flex items-center justify-center border-2 shrink-0 z-10 bg-background transition-colors duration-300
                              ${isActive ? "border-primary-color text-primary-color shadow-md" : isDone ? "border-emerald-500 text-emerald-600" : "border-zinc-200 text-primary-color"}
                            `}
                        >
                          {isDone ? (
                            <Check className="w-5 h-5" />
                          ) : isActive ? (
                            <Loader2 className="w-5 h-5 animate-spin text-primary-color" />
                          ) : (
                            <GitBranch className="w-5 h-5" />
                          )}
                        </div>

                        {/* Level Content */}
                        <div className="flex-1 pt-1">
                          <div className="flex items-center justify-between mb-3">
                            <h3
                              className={`text-sm font-bold ${isActive ? "text-primary-color" : "text-primary-color"}`}
                            >
                              {level.title}
                            </h3>
                            <span className="text-[9px] uppercase font-bold text-primary-color">
                              {isDone
                                ? "Completed"
                                : isActive
                                  ? "Processing..."
                                  : "Pending"}
                            </span>
                          </div>

                          {/* Tasks Grid */}
                          <div className="grid grid-cols-1 gap-3">
                            {level.tasks.map((task) => (
                              <TaskCard
                                key={task.id}
                                task={task}
                                isExpanded={expandedTaskId === task.id}
                                onToggle={() =>
                                  setExpandedTaskId(
                                    expandedTaskId === task.id ? null : task.id
                                  )
                                }
                              />
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Completion Banner */}
                {isSliceComplete && activeSliceMeta && (
                  <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 pl-16">
                    <div className="bg-background rounded-xl border border-emerald-100 shadow-sm overflow-hidden">
                      <div className="bg-emerald-50/50 px-6 py-4 border-b border-emerald-100 flex items-center gap-3">
                        <div className="bg-emerald-100 p-2 rounded-full">
                          <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-emerald-900">
                            Slice Verified
                          </h3>
                          <p className="text-xs text-emerald-700">
                            Ready for integration
                          </p>
                        </div>
                      </div>
                      <div className="p-6 space-y-4">
                        <div>
                          <h4 className="text-[10px] font-bold text-primary-color uppercase tracking-wider mb-2">
                            What was done
                          </h4>
                          <p className="text-sm text-primary-color leading-relaxed">
                            {activeSliceMeta?.detailed_objective ||
                              "Slice completed successfully"}
                          </p>
                        </div>
                        <div className="bg-zinc-50 rounded-lg p-4 border border-zinc-100">
                          <h4 className="text-[10px] font-bold text-primary-color uppercase tracking-wider mb-2 flex items-center gap-2">
                            <ExternalLink className="w-3.5 h-3.5" />
                            How to Verify
                          </h4>
                          <p className="text-xs font-mono text-primary-color">
                            {activeSliceMeta?.verification_criteria ||
                              "All tests passed"}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Terminal */}
          {showGlobalLogs && (
            <div className="w-80 border-l border-zinc-200 bg-background flex flex-col shrink-0 animate-in slide-in-from-right duration-300">
              <div className="h-10 border-b border-zinc-100 flex items-center justify-between px-4 bg-zinc-50/50">
                <div className="flex items-center gap-2">
                  <TerminalSquare className="w-3.5 h-3.5 text-primary-color" />
                  <span className="text-[10px] font-bold text-primary-color uppercase tracking-wider">
                    Live Logs
                  </span>
                </div>
                <div
                  className={`w-2 h-2 rounded-full ${isRunning ? "bg-emerald-500 animate-pulse" : "bg-zinc-300"}`}
                />
              </div>

              <div
                ref={terminalRef}
                className="flex-1 p-4 overflow-y-auto font-mono text-[10px] space-y-2 bg-background"
              >
                {globalLogs.length === 0 && (
                  <div className="text-primary-color italic text-center mt-10">
                    Ready to execute.
                    <br />
                    Logs will appear here.
                  </div>
                )}
                {globalLogs.map((log, i) => (
                  <div
                    key={i}
                    className="flex gap-2 animate-in slide-in-from-left-1 duration-200"
                  >
                    <span className="text-primary-color select-none">
                      {">"}
                    </span>
                    <span
                      className={`break-words leading-relaxed ${
                        log.includes("SUCCESS")
                          ? "text-emerald-600 font-bold"
                          : log.includes("Starting")
                            ? "text-blue-600"
                            : "text-primary-color"
                      }`}
                    >
                      {log}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
