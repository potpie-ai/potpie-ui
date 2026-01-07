"use client";

import React, { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
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
} from "lucide-react";
import { MockTaskResponse, getMockTaskFromSession } from "@/lib/mock/taskMock";
import { useSelector } from "react-redux";
import { RootState } from "@/lib/state/store";
import TaskSplittingService from "@/services/TaskSplittingService";
import PlanService from "@/services/PlanService";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  TaskSplittingStatusResponse,
  TaskSplittingItemsResponse,
  TaskLayer,
} from "@/lib/types/spec";

/**
 * VERTICAL TASK EXECUTION ENGINE
 * * Updates:
 * - Start Button is always present (no fade-in).
 * - Start Button is disabled/loading while the Execution Graph is generating.
 * - Start Button becomes active ("Start Codegen") once Graph is ready.
 */

// --- 1. Vertical Slices Metadata ---
const SLICES = [
  {
    id: 1,
    title: "Persistence & Schema",
    description: "Database setup and Prisma schema definition.",
    summary:
      "Initialized the PostgreSQL container, generated the initial Prisma schema with the User model, and successfully applied the first migration.",
    verify:
      "Run `npx prisma studio` to browse the empty User table, or check the `migrations/` folder for the SQL artifact.",
  },
  {
    id: 2,
    title: "Auth Core Logic",
    description: "JWT utilities and password hashing.",
    summary:
      "Implemented secure password hashing (bcrypt) and token signing (JWT). Unit tests confirmed that tokens expire correctly and hashes are salted.",
    verify:
      "Check `coverage/lcov-report/index.html` for 100% test coverage on `utils/auth.ts`.",
  },
  {
    id: 3,
    title: "API Routes",
    description: "Next.js route handlers for login/register.",
    summary:
      "Created API endpoints for Login and Registration. Middleware is configured to intercept 401s on protected routes.",
    verify:
      "Use Postman or cURL to POST valid credentials to `/api/auth/login` and receive a Bearer token.",
  },
  {
    id: 4,
    title: "Frontend Forms",
    description: "React components and validation.",
    summary:
      "Built the Login form with Zod validation. Wired up the submit handler to the API and implemented global toast notifications.",
    verify:
      "Navigate to `/login` in the preview. Try submitting an empty form to see validation errors.",
  },
  {
    id: 5,
    title: "Email Verification",
    description: "Token generation and email provider mock.",
    summary:
      "Added `emailVerified` field to schema. Implemented token generation service and mocked the SendGrid transport.",
    verify:
      "Register a new user and check the console logs for the mocked 'Verify Email' link.",
  },
  {
    id: 6,
    title: "Password Recovery",
    description: "Reset flow and temporary tokens.",
    summary:
      "Implemented the `PasswordResetToken` model and the complete reset flow APIs.",
    verify:
      "Trigger a password reset and verify that the old token is invalidated after use.",
  },
  {
    id: 7,
    title: "User Profile",
    description: "Protected dashboard routes.",
    summary:
      "Created the protected `/dashboard` layout and the Profile API to fetch user details from the session.",
    verify:
      "Log in and visit `/dashboard`. Ensure your username is displayed correctly in the header.",
  },
  {
    id: 8,
    title: "RBAC & Admin",
    description: "Role-based access control.",
    summary:
      "Added `role` enum to User. Secured `/admin` routes so they strictly require the ADMIN role.",
    verify:
      "Try accessing `/admin` as a standard user (should 403). Update your role in DB and retry (should 200).",
  },
];

// --- 2. Mock DAG Data with Rich Details ---
const MOCK_DAGS = {
  1: [
    {
      id: "l1",
      title: "Configuration Phase",
      status: "pending",
      tasks: [
        {
          id: "t1-1",
          title: "Init Prisma & Env",
          file: "schema.prisma",
          status: "pending",
          tests: { total: 2, passed: 0 },
          changes: [
            {
              path: "prisma/schema.prisma",
              lang: "prisma",
              content: `+ generator client {
+   provider = "prisma-client-js"
+ }
+
+ datasource db {
+   provider = "postgresql"
+   url      = env("DATABASE_URL")
+ }`,
            },
            {
              path: ".env",
              lang: "bash",
              content: `+ DATABASE_URL="postgresql://user:pass@localhost:5432/mydb?schema=public"
+ NODE_ENV="development"`,
            },
          ],
          testCode: `import fs from 'fs';

describe('Prisma Configuration', () => {
  test('should have valid schema file', async () => {
    const schema = await fs.readFile('prisma/schema.prisma', 'utf8');
    expect(schema).toContain('provider = "postgresql"');
  });

  test('should have database url in env', () => {
    expect(process.env.DATABASE_URL).toBeDefined();
    expect(process.env.DATABASE_URL).toContain('postgresql://');
  });
});`,
          testResults: [
            { name: "should have valid schema file", status: "pending" },
            { name: "should have database url in env", status: "pending" },
          ],
          logs: [
            "Initializing prisma...",
            "Generating schema.prisma...",
            "Validating provider configuration...",
            "Parsing .env file...",
          ],
        },
      ],
    },
    {
      id: "l2",
      title: "Implementation Phase",
      status: "pending",
      tasks: [
        {
          id: "t1-2",
          title: "User Model Definition",
          file: "models/User.ts",
          status: "pending",
          tests: { total: 2, passed: 0 },
          changes: [
            {
              path: "prisma/schema.prisma",
              lang: "prisma",
              content: `  datasource db {
    provider = "postgresql"
    url      = env("DATABASE_URL")
  }

+ model User {
+   id        String   @id @default(uuid())
+   email     String   @unique
+   password  String
+   name      String?
+   createdAt DateTime @default(now())
+   updatedAt DateTime @updatedAt
+ }`,
            },
          ],
          testCode: `import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

describe('User Model', () => {
  test('should support UUID generation', async () => {
    // Mocking the prisma generate call
    const dmmf = await prisma.getDmmf();
    const userModel = dmmf.datamodel.models.find(m => m.name === 'User');
    const idField = userModel.fields.find(f => f.name === 'id');
    expect(idField.default.name).toBe('uuid');
  });

  test('should enforce unique email', async () => {
    const dmmf = await prisma.getDmmf();
    const userModel = dmmf.datamodel.models.find(m => m.name === 'User');
    const emailField = userModel.fields.find(f => f.name === 'email');
    expect(emailField.isUnique).toBe(true);
  });
});`,
          testResults: [
            { name: "should support UUID generation", status: "pending" },
            { name: "should enforce unique email", status: "pending" },
          ],
          logs: [
            "Parsing model definition...",
            "Adding UUID constraint...",
            "Adding unique index on email...",
            "Validating relation consistency...",
          ],
        },
        {
          id: "t1-3",
          title: "Migration Generation",
          file: "migrations/init.sql",
          status: "pending",
          tests: { total: 1, passed: 0 },
          changes: [
            {
              path: "migrations/20240315_init/migration.sql",
              lang: "sql",
              content: `+ -- CreateTable
+ CREATE TABLE "User" (
+     "id" TEXT NOT NULL,
+     "email" TEXT NOT NULL,
+     "password" TEXT NOT NULL,
+     "name" TEXT,
+     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
+     "updatedAt" TIMESTAMP(3) NOT NULL,
+
+     CONSTRAINT "User_pkey" PRIMARY KEY ("id")
+ );
+
+ -- CreateIndex
+ CREATE UNIQUE INDEX "User_email_key" ON "User"("email");`,
            },
          ],
          testCode: `import fs from 'fs';
import path from 'path';

describe('Migration Integrity', () => {
  test('should generate non-empty SQL file', () => {
    const migrationDir = path.join(__dirname, 'migrations');
    const files = fs.readdirSync(migrationDir);
    const sqlFile = files.find(f => f.endsWith('.sql'));

    const content = fs.readFileSync(path.join(migrationDir, sqlFile), 'utf8');
    expect(content.length).toBeGreaterThan(0);
    expect(content).toContain('CREATE TABLE "User"');
  });
});`,
          testResults: [
            { name: "should generate non-empty SQL file", status: "pending" },
          ],
          logs: [
            "Comparing schema to DB shadow...",
            "Generating SQL...",
            "Checking for destructive changes...",
            "Migration artifact created.",
          ],
        },
      ],
    },
    {
      id: "l3",
      title: "Verification Phase",
      status: "pending",
      tasks: [
        {
          id: "t1-4",
          title: "DB Connection Test",
          file: "scripts/test-db.ts",
          status: "pending",
          tests: { total: 1, passed: 0 },
          // No changes array here - simulates "No Codegen"
          testCode: `import { exec } from 'child_process';

describe('End-to-End Connectivity', () => {
  test('should execute connection script without error', (done) => {
    exec('ts-node scripts/test-db.ts', (error, stdout, stderr) => {
      expect(error).toBeNull();
      expect(stdout).toContain('Successfully connected');
      done();
    });
  });
});`,
          testResults: [
            {
              name: "should execute connection script without error",
              status: "pending",
            },
          ],
          logs: [
            "Loading predefined test suite...",
            "Transpiling TypeScript...",
            "Connecting to localhost:5432...",
            "Authenticating user...",
            "Connection successful.",
          ],
        },
      ],
    },
  ],
  default: [
    {
      id: "l1",
      title: "Scaffolding",
      status: "pending",
      tasks: [
        {
          id: "def-1",
          title: "Setup Module",
          file: "index.ts",
          status: "pending",
          tests: { total: 2, passed: 0 },
          logs: ["Initializing module..."],
          changes: [
            {
              path: "index.ts",
              content: "+ export const init = () => {};",
              lang: "typescript",
            },
          ],
          testCode: "test('exists', () => expect(init).toBeDefined())",
          testResults: [{ name: "Module exports init", status: "pending" }],
        },
      ],
    },
  ],
};

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
    <div className="flex items-center gap-1.5 px-2 py-0.5 bg-zinc-50 text-zinc-400 rounded text-[9px] font-bold border border-zinc-100">
      <Circle className="w-3 h-3" />
      <span>WAITING</span>
    </div>
  );
};

// Simple Syntax Highlighter
const SimpleCodeBlock = ({ code }) => {
  if (!code)
    return (
      <span className="text-zinc-400 italic font-mono text-[10px]">
        Waiting for generation...
      </span>
    );

  const KEYWORDS = new Set([
    "import",
    "from",
    "const",
    "let",
    "var",
    "async",
    "await",
    "function",
    "return",
    "if",
    "else",
    "try",
    "catch",
    "describe",
    "test",
    "it",
    "expect",
    "new",
    "export",
    "default",
    "class",
    "interface",
    "type",
  ]);

  const lines = code.split("\n");

  return (
    <div className="font-mono text-[10px] leading-relaxed">
      {lines.map((line, i) => {
        if (line.trim().startsWith("//")) {
          return (
            <div key={i} className="text-zinc-500 whitespace-pre">
              {line}
            </div>
          );
        }
        const parts = line.split(/(\s+|[(){}[\].,;:'"`])/);

        return (
          <div key={i} className="whitespace-pre">
            {parts.map((part, j) => {
              if (KEYWORDS.has(part))
                return (
                  <span key={j} className="text-purple-500 font-semibold">
                    {part}
                  </span>
                );
              if (part.match(/^['"`].*['"`]$/))
                return (
                  <span key={j} className="text-emerald-600">
                    {part}
                  </span>
                );
              if (part.match(/^['"`]/))
                return (
                  <span key={j} className="text-emerald-600">
                    {part}
                  </span>
                );
              if (
                /^\w+$/.test(part) &&
                j < parts.length - 1 &&
                parts[j + 1].trim() === "("
              ) {
                return (
                  <span key={j} className="text-black">
                    {part}
                  </span>
                );
              }
              if (/^\d+$/.test(part))
                return (
                  <span key={j} className="text-orange-500">
                    {part}
                  </span>
                );

              return (
                <span key={j} className="text-zinc-600">
                  {part}
                </span>
              );
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
    'PENDING': 'pending',
    'IN_PROGRESS': 'running',
    'COMPLETED': 'completed',
    'FAILED': 'failed',
  };
  return statusMap[apiStatus] || apiStatus.toLowerCase();
};

// New TaskCard component handling inline expansion
const TaskCard = ({ task, isExpanded, onToggle }) => {
  const hasChanges = task.changes && task.changes.length > 0;
  // Default to 'logs' if no changes (Verification task), otherwise 'diff'
  const [activeTab, setActiveTab] = React.useState(
    hasChanges ? "diff" : "logs",
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
              className={`p-1.5 rounded-md ${uiStatus === "completed" ? "bg-emerald-50 text-emerald-600" : "bg-zinc-100 text-zinc-500"}`}
            >
              <Code2 className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-zinc-900">
                {task.title}
              </div>
              <div className="text-[10px] font-mono text-zinc-400">
                {task.file}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <StatusBadge status={uiStatus} tests={task.tests} />
            <ChevronDown
              className={`w-4 h-4 text-zinc-300 transition-transform duration-300 ${isExpanded ? "rotate-180" : ""}`}
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
                className={`flex items-center gap-2 px-3 py-2.5 text-[10px] font-bold border-b-2 transition-colors ${activeTab === "diff" ? "border-zinc-900 text-zinc-900" : "border-transparent text-zinc-400 hover:text-zinc-600"}`}
              >
                <FileDiff className="w-3 h-3" />
                Code Changes{" "}
                <span className="text-zinc-400 font-normal">
                  ({task.changes?.length || 0})
                </span>
              </button>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setActiveTab("tests");
              }}
              className={`flex items-center gap-2 px-3 py-2.5 text-[10px] font-bold border-b-2 transition-colors ${activeTab === "tests" ? "border-zinc-900 text-zinc-900" : "border-transparent text-zinc-400 hover:text-zinc-600"}`}
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
              className={`flex items-center gap-2 px-3 py-2.5 text-[10px] font-bold border-b-2 transition-colors ${activeTab === "logs" ? "border-zinc-900 text-zinc-900" : "border-transparent text-zinc-400 hover:text-zinc-600"}`}
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
                <div className="h-32 flex flex-col items-center justify-center text-zinc-400 border-2 border-dashed border-zinc-200 rounded-xl bg-zinc-50/50">
                  <Hourglass className="w-6 h-6 mb-3 opacity-50 animate-pulse text-black" />
                  <p className="text-xs font-bold text-zinc-500">
                    Waiting to generate code...
                  </p>
                  <p className="text-[10px] text-zinc-400 mt-1">
                    Files will appear here when execution starts.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {task.changes.map((change, idx) => (
                    <div
                      key={idx}
                      className="bg-background rounded-lg border border-zinc-200 overflow-hidden shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-300"
                      style={{ animationDelay: `${idx * 100}ms` }}
                    >
                      <div className="px-3 py-2 bg-zinc-50/80 border-b border-zinc-100 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <FileText className="w-3 h-3 text-zinc-400" />
                          <span className="text-[10px] font-mono font-medium text-zinc-700">
                            {change.path}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] font-bold text-zinc-400 uppercase">
                            {change.lang}
                          </span>
                          <Copy className="w-3 h-3 text-zinc-300 cursor-pointer hover:text-zinc-500" />
                        </div>
                      </div>
                      {change.content ? (
                        <pre className="p-3 overflow-x-auto text-[10px] font-mono leading-relaxed bg-background">
                          {change.content.split("\n").map((line, i) => (
                            <div
                              key={i}
                              className={`${line.startsWith("+") ? "bg-emerald-50 text-emerald-900 w-full block -mx-3 px-3" : "text-zinc-500"}`}
                            >
                              <span className="inline-block w-6 text-zinc-300 select-none text-right mr-3 border-r border-zinc-100 pr-2">
                                {i + 1}
                              </span>
                              {line}
                            </div>
                          ))}
                        </pre>
                      ) : (
                        <div className="p-4 text-center text-[10px] font-mono text-zinc-400 italic bg-background flex flex-col items-center gap-2">
                          <Loader2 className="w-4 h-4 animate-spin text-black" />
                          <span className="text-black">Generating diff...</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ))}

            {activeTab === "tests" && (
              <div className="grid grid-cols-1 gap-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                {/* 1. Test Definition */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-3.5 h-3.5 text-zinc-400" />
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                      Test Suite Definition
                    </span>
                  </div>
                  <div className="bg-background rounded-lg border border-zinc-200 overflow-hidden relative group">
                    <div className="p-4 overflow-x-auto">
                      <SimpleCodeBlock code={task.testCode} />
                    </div>
                  </div>
                </div>

                {/* 2. Live Results */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Play className="w-3.5 h-3.5 text-zinc-400" />
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                      Live Execution Results
                    </span>
                  </div>
                  <div className="bg-background border border-zinc-200 rounded-lg divide-y divide-zinc-50">
                    {task.testResults &&
                      task.testResults.map((test, i) => (
                        <div
                          key={i}
                          className="flex items-center justify-between p-3"
                        >
                          <div className="flex items-center gap-3">
                            {uiStatus === "completed" ? (
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                            ) : (
                              <Circle className="w-3.5 h-3.5 text-zinc-300" />
                            )}
                            <span
                              className={`text-[11px] font-medium ${uiStatus === "completed" ? "text-zinc-900" : "text-zinc-500"}`}
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
                                : "bg-zinc-100 text-zinc-400"
                            }`}
                          >
                            {uiStatus === "completed" ? (test.status === "PASSED" ? "PASSED" : "FAILED") : "PENDING"}
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === "logs" && (
              <div className="bg-zinc-900 rounded-lg p-3 font-mono text-[10px] text-zinc-300 space-y-1.5 min-h-[150px] max-h-[300px] overflow-y-auto animate-in fade-in slide-in-from-bottom-2 duration-300">
                {task.logs.length > 0 ? (
                  task.logs.map((log, i) => (
                    <div key={i} className="flex gap-2">
                      <span className="text-zinc-600 select-none">{">"}</span>
                      <span>{log}</span>
                    </div>
                  ))
                ) : (
                  <div className="text-zinc-600 italic">
                    Waiting for logs...
                  </div>
                )}

                {uiStatus === "running" && (
                  <div className="animate-pulse text-black">_</div>
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
  
  const repoBranchByTask = useSelector(
    (state: RootState) => state.RepoAndBranch.byTaskId
  );
  const storedRepoContext = recipeId
    ? repoBranchByTask?.[recipeId]
    : undefined;

  const [mockTask, setMockTask] = useState<MockTaskResponse | null>(null);
  const [activeSliceId, setActiveSliceId] = useState(itemNumberFromUrl ? parseInt(itemNumberFromUrl) : 1);
  const [completedSlices, setCompletedSlices] = useState<number[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  // Task Splitting API State
  const [planId, setPlanId] = useState<string | null>(planIdFromUrl);
  const [planItems, setPlanItems] = useState<any[]>([]);
  const [taskSplittingId, setTaskSplittingId] = useState<string | null>(null);
  const [taskSplittingStatus, setTaskSplittingStatus] = useState<TaskSplittingStatusResponse | null>(null);
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

  const terminalRef = useRef<HTMLDivElement>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);

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

    // Check if we already have a stored task_splitting_id for this plan item
    const storedTaskSplittingId = localStorage.getItem(`task_splitting_${planId}_${activeSliceId}`);
    if (storedTaskSplittingId) {
      setTaskSplittingId(storedTaskSplittingId);
      return;
    }

    // Submit task splitting request
    const submitTaskSplitting = async () => {
      try {
        console.log("[Code Page] Submitting task splitting for planId:", planId, "itemNumber:", activeSliceId);
        const response = await TaskSplittingService.submitTaskSplitting({
          plan_id: planId,
          item_number: activeSliceId,
        });
        console.log("[Code Page] Task splitting submitted:", response);
        setTaskSplittingId(response.task_splitting_id);
        localStorage.setItem(`task_splitting_${planId}_${activeSliceId}`, response.task_splitting_id);
        toast.success("Task splitting started");
      } catch (error: any) {
        console.error("[Code Page] Error submitting task splitting:", error);
        toast.error(error.message || "Failed to start task splitting");
      }
    };

    submitTaskSplitting();
  }, [planId, activeSliceId, taskSplittingId]);

  // Fetch plan items for sidebar display
  useEffect(() => {
    if (!planId || planItems.length > 0) return;

    const fetchPlanItems = async () => {
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
      }
    };

    fetchPlanItems();
  }, [planId, planItems.length]);

  useEffect(() => {
    if (!storedRepoContext) return;
    setMockTask((prev) => {
      const repoName =
        storedRepoContext.repoName || prev?.repo || "Unknown Repository";
      const branchName =
        storedRepoContext.branchName || prev?.branch || "main";

      if (prev) {
        if (prev.repo === repoName && prev.branch === branchName) {
          return prev;
        }
        return {
          ...prev,
          repo: repoName,
          branch: branchName,
        };
      }

      if (!recipeId) {
        return prev;
      }

      return {
        task_id: recipeId,
        prompt: "",
        repo: repoName,
        branch: branchName,
        questions: [],
      };
    });
  }, [storedRepoContext, recipeId]);

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
        const storedTaskSplittingId = localStorage.getItem(`task_splitting_${planId}_${activeSliceId}`);
        if (storedTaskSplittingId && storedTaskSplittingId !== taskSplittingId) {
          setTaskSplittingId(storedTaskSplittingId);
        }
      }
      setCurrentDag(allLayers);
      setIsGraphLoading(false); // Already loaded
      setGraphLoadIndex(allLayers.length);
    }
  }, [activeSliceId, planId]);

  // 2. Poll for task splitting status (5.2 API) - runs when we have taskSplittingId
  useEffect(() => {
    if (!taskSplittingId) return;

    let mounted = true;
    let pollInterval: NodeJS.Timeout;

    const fetchStatusAndLayers = async () => {
      try {
        console.log("[Code Page] Polling task splitting status for:", taskSplittingId);
        const status = await TaskSplittingService.getTaskSplittingStatus(taskSplittingId);

        if (!mounted) return;

        console.log("[Code Page] Task splitting status:", status);
        setTaskSplittingStatus(status);

        // Fetch layers if task splitting is completed or if we need to show progress
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
        console.error("[Code Page] Error polling task splitting status:", error);
      }
    };

    // Fetch layers with pagination (5.3 API)
    const fetchLayersWithPagination = async () => {
      try {
        console.log("[Code Page] Fetching layers with pagination");
        let allLayersData: TaskLayer[] = [];
        let start = 0;
        let hasMore = true;

        while (hasMore) {
          const response = await TaskSplittingService.getTaskSplittingItems(taskSplittingId, start, 10);
          console.log("[Code Page] Fetched layers:", response.layers.length, "next_layer_order:", response.next_layer_order);
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

    // Initial fetch
    fetchStatusAndLayers();

    // Set up polling
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
  }, [isGraphLoading, graphLoadIndex, activeSliceId, allLayers, taskSplittingStatus]);

  // 4. Poll for codegen updates (when running)
  useEffect(() => {
    if (!taskSplittingId || !isRunning) return;

    let mounted = true;

    const pollCodegenStatus = async () => {
      try {
        const status = await TaskSplittingService.getTaskSplittingStatus(taskSplittingId);

        if (!mounted) return;

        setTaskSplittingStatus(status);

        // If codegen is in progress or completed, fetch updated layers
        if (status.codegen_status === "IN_PROGRESS" || status.codegen_status === "COMPLETED") {
          // Fetch all layers to get updated task statuses
          let allLayersData: TaskLayer[] = [];
          let start = 0;
          let hasMore = true;

          while (hasMore) {
            const response = await TaskSplittingService.getTaskSplittingItems(taskSplittingId, start, 10);
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

          // Check if all tasks are completed
          const allCompleted = allLayersData.every(
            (layer) => {
              const layerStatus = mapApiStatusToUI(layer.status);
              return layerStatus === "completed" || layer.tasks.every((task) => {
                const taskStatus = mapApiStatusToUI(task.status);
                return taskStatus === "completed";
              });
            }
          );

          if (allCompleted && !completedSlices.includes(activeSliceId)) {
            setCompletedSlices((prev) => [...prev, activeSliceId]);
            setGlobalLogs((prev) => [
              ...prev,
              `SUCCESS: Vertical Slice ${String(activeSliceId).padStart(2, '0')} verified.`,
            ]);

            // Auto-advance to next slice if available
            const nextSlice = planItems.find((item) => item.item_number > activeSliceId);
            if (nextSlice) {
              setTimeout(() => {
                setActiveSliceId(nextSlice.item_number);
              }, 1000);
            } else {
              setIsRunning(false);
            }
          }
        }

        if (status.codegen_status === "COMPLETED" || status.codegen_status === "FAILED") {
          setIsRunning(false);
        }
      } catch (error) {
        console.error("Error polling codegen status:", error);
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
  const activeSliceMeta = planItems.find((item) => item.item_number === activeSliceId) || 
    SLICES.find((s) => s.id === activeSliceId);

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

  // Show loading if we don't have planId or recipeId
  if (!planId && !recipeId) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p>Loading task data...</p>
        </div>
      </div>
    );
  }

  // Show loading if task splitting is being submitted
  if (planId && !taskSplittingId && !taskSplittingStatus) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p>Starting task splitting...</p>
          <p className="text-sm text-zinc-500 mt-2">Preparing execution plan for Slice {String(activeSliceId).padStart(2, '0')}</p>
        </div>
      </div>
    );
  }

  // Show loading if task splitting is in progress and no layers yet
  if (taskSplittingStatus?.status === "IN_PROGRESS" && allLayers.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p>Generating task execution plan...</p>
          <p className="text-sm text-zinc-500 mt-2">Step {taskSplittingStatus.current_step + 1}/2</p>
        </div>
      </div>
    );
  }

  // Show loading if task splitting is submitted and waiting
  if (taskSplittingStatus?.status === "SUBMITTED" && allLayers.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p>Task splitting submitted, waiting to start...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-background text-zinc-900 font-sans flex flex-col md:flex-row overflow-hidden relative">
      {/* --- SIDEBAR: Timeline --- */}
      <aside className="w-80 bg-zinc-50/50 border-r border-zinc-200 flex flex-col z-20 shrink-0">
        <div className="h-16 flex items-center px-6 border-b border-zinc-100 bg-zinc-50/80 backdrop-blur-sm sticky top-0">
          <h2 className="text-base font-bold text-zinc-900">Slices</h2>
        </div>

        <div ref={sidebarRef} className="flex-1 overflow-y-auto p-6 relative">
          {/* Continuous Vertical Line */}
          <div
            className="absolute left-[35px] top-6 w-[1px] bg-zinc-200 z-0"
            style={{ height: `${Math.min(planItems.length || SLICES.length, 8) * 70 - 70}px` }}
          />

          <div className="space-y-8 relative z-10">
            {(planItems.length > 0 ? planItems : SLICES).map((slice: any, idx: number) => {
              const sliceId = slice.item_number || slice.id;
              const isCompleted = completedSlices.includes(sliceId);
              const isLocked =
                idx > 0 && !completedSlices.includes((planItems.length > 0 ? planItems : SLICES)[idx - 1]?.item_number || (planItems.length > 0 ? planItems : SLICES)[idx - 1]?.id);
              const isActive = activeSliceId === sliceId;

              return (
                <div
                  key={slice.id}
                  data-active={isActive}
                  className={`group flex gap-4 ${isLocked ? " pointer-events-none" : "cursor-pointer"}`}
                  onClick={() => !isLocked && handleManualSliceChange(sliceId)}
                >
                  {/* Timeline Node */}
                  <div
                    className={`
                    w-7 h-7 rounded-full border-2 flex items-center justify-center shrink-0 transition-all duration-300 bg-background relative z-10
                    ${
                      isCompleted
                        ? "border-emerald-500 text-emerald-500"
                        : isActive
                          ? "border-zinc-900 text-zinc-900 scale-110 shadow-sm"
                          : "border-zinc-200 text-zinc-500"
                    }
                  `}
                  >
                    {isCompleted ? (
                      <Check className="w-3.5 h-3.5" />
                    ) : (
                      <span className="text-[10px] font-bold">{sliceId}</span>
                    )}
                  </div>

                  {/* Text Content */}
                  <div
                    className={`flex-1 pt-0.5 transition-all duration-300 ${isActive ? "translate-x-1" : ""}`}
                  >
                    <h3
                      className={`text-xs font-bold leading-tight ${isActive ? "text-zinc-900" : "text-zinc-500 group-hover:text-zinc-700"}`}
                    >
                      {slice.title}
                    </h3>
                    <p className="text-[10px] text-zinc-400 leading-relaxed mt-1 line-clamp-2">
                      {slice.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </aside>

      {/* --- MAIN CONTENT: Right Part --- */}
      <main className="flex-1 flex flex-col h-full min-w-0 bg-background">
        {/* Header */}
        <header className="h-16 flex items-center justify-between px-8 border-b border-zinc-100">
          <div>
            <h1 className="text-lg font-bold text-zinc-900 tracking-tight">
              {activeSliceMeta?.title || planItems.find((item) => item.item_number === activeSliceId)?.title || `Slice ${activeSliceId}`}
            </h1>
            <div className="flex items-center gap-2">
              <p className="text-[10px] text-zinc-400 font-medium uppercase tracking-widest">
                Execution Graph
              </p>
              {isGraphLoading && (
                <Loader2 className="w-3 h-3 animate-spin text-zinc-400" />
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
                      ? "bg-zinc-100 border-zinc-200 text-zinc-700"
                      : "bg-background border-zinc-200 text-zinc-500 hover:text-zinc-700"
                  }
                `}
            >
              <TerminalSquare className="w-3.5 h-3.5" />
              {showGlobalLogs ? "Hide Logs" : "Show Logs"}
            </button>

            {isSliceComplete ? (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-50 text-zinc-500 rounded-md border border-zinc-100 text-xs font-bold">
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
                       ? "bg-zinc-100 text-zinc-400 cursor-not-allowed"
                       : isRunning
                         ? "bg-background border border-zinc-200 text-zinc-900 hover:bg-zinc-50"
                         : "bg-zinc-900 text-white hover:bg-zinc-800 shadow-sm"
                   }
                 `}
              >
                {isGraphLoading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading
                    Plan...
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
                  <div className="w-2 h-2 bg-zinc-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                  <div className="w-2 h-2 bg-zinc-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                  <div className="w-2 h-2 bg-zinc-400 rounded-full animate-bounce"></div>
                </div>
                <p className="text-xs text-zinc-400 font-mono">
                  Discovering dependencies...
                </p>
              </div>
            )}

            {currentDag.length > 0 && (
              <div className="max-w-2xl mx-auto space-y-8 pb-12">
                {currentDag.map((level, idx) => {
                  // Map API status to UI status
                  const levelStatus = mapApiStatusToUI(level.status);
                  const isActive = levelStatus === "running" || level.status === "IN_PROGRESS";
                  const isDone = levelStatus === "completed" || level.status === "COMPLETED";

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
                              ${isActive ? "border-black text-black shadow-md" : isDone ? "border-emerald-500 text-emerald-600" : "border-zinc-200 text-zinc-300"}
                            `}
                        >
                          {isDone ? (
                            <Check className="w-5 h-5" />
                          ) : isActive ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                          ) : (
                            <GitBranch className="w-5 h-5" />
                          )}
                        </div>

                        {/* Level Content */}
                        <div className="flex-1 pt-1">
                          <div className="flex items-center justify-between mb-3">
                            <h3
                              className={`text-sm font-bold ${isActive ? "text-zinc-900" : "text-zinc-500"}`}
                            >
                              {level.title}
                            </h3>
                            <span className="text-[9px] uppercase font-bold text-zinc-400">
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
                                    expandedTaskId === task.id ? null : task.id,
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
                          <h4 className="text-[10px] font-bold text-zinc-900 uppercase tracking-wider mb-2">
                            What was done
                          </h4>
                          <p className="text-sm text-zinc-600 leading-relaxed">
                            {activeSliceMeta?.summary || activeSliceMeta?.detailed_objective || "Slice completed successfully"}
                          </p>
                        </div>
                        <div className="bg-zinc-50 rounded-lg p-4 border border-zinc-100">
                          <h4 className="text-[10px] font-bold text-zinc-900 uppercase tracking-wider mb-2 flex items-center gap-2">
                            <ExternalLink className="w-3.5 h-3.5" />
                            How to Verify
                          </h4>
                          <p className="text-xs font-mono text-zinc-500">
                            {activeSliceMeta?.verify || activeSliceMeta?.verification_criteria || "All tests passed"}
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
                  <TerminalSquare className="w-3.5 h-3.5 text-zinc-400" />
                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
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
                  <div className="text-zinc-400 italic text-center mt-10">
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
                    <span className="text-zinc-300 select-none">{">"}</span>
                    <span
                      className={`break-words leading-relaxed ${
                        log.includes("SUCCESS")
                          ? "text-emerald-600 font-bold"
                          : log.includes("Starting")
                            ? "text-blue-600"
                            : "text-zinc-600"
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
