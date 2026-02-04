"use client";

import React, { useState, useEffect, useRef } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { MermaidDiagram } from "@/components/chat/MermaidDiagram";
import {
  Check,
  Loader2,
  ChevronDown,
  FileCode,
  ShieldCheck,
  Database,
  BrainCircuit,
  Play,
  GitMerge,
  Target,
  Server,
  Layout,
  Settings,
  Code2,
  AlignLeft,
  ListTodo,
  AlertCircle,
  Github,
  GitBranch,
  Rocket,
  LucideIcon,
  FileText,
  Lightbulb,
  ArrowRightLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import PlanService from "@/services/PlanService";
import SpecService from "@/services/SpecService";
import TaskSplittingService from "@/services/TaskSplittingService";
import { PlanStatusResponse, PlanItem } from "@/lib/types/spec";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import codegenMockData from "@/lib/mock/codegenMock.json";

// Demo mode delay in milliseconds (35 seconds)
const DEMO_MODE_DELAY = 35000;

/**
 * VERTICAL SLICE PLANNER (Auto-Generation Mode)
 */

const FULL_PLAN = [
  {
    id: 1,
    title: "Persistence Layer & Schema",
    detailed_objective:
      "Establish the foundational data layer by defining the User schema in Prisma and setting up the PostgreSQL connection. This slice ensures that the database is reachable and the schema is correctly applied before any application logic is written.",
    implementation_steps: [
      "Define `User` model in `schema.prisma` with `id` as `uuid` to ensure collision-free IDs.",
      "Configure `db.ts` to instantiate a global `PrismaClient` singleton to prevent connection exhaustion in serverless envs.",
      "Add `DATABASE_URL` to `.env` and validate it using a robust env parser.",
      "Execute `prisma migrate dev` to synchronize the local Postgres container with the new schema.",
    ],
    description: "Initialize User entity and migration strategy.",
    verification_criteria:
      "PostgreSQL container starts; Schema migration applied.",
    files: [
      { path: "prisma/schema.prisma", type: "Create" },
      { path: "src/lib/db.ts", type: "Create" },
      { path: "package.json", type: "Modify" },
      { path: ".env", type: "Modify" },
    ],
    context_handoff: {
      db_strategy: "Prisma + PostgreSQL",
      user_id_format: "UUID v4",
      constraints: "Email unique",
    },
    reasoning: [
      "Selected Prisma for type-safe schema definitions.",
      "UUID v4 chosen over auto-increment for better security.",
      "Schema migration is the critical path dependency.",
    ],
    architecture: `flowchart TB
    subgraph DB["PostgreSQL Database"]
        User[("User Table<br/>id: UUID PK<br/>email: VARCHAR UNIQUE<br/>password: VARCHAR<br/>createdAt: TIMESTAMP<br/>updatedAt: TIMESTAMP")]
    end
    subgraph App["Application Layer"]
        Prisma["PrismaClient<br/>Singleton Pattern<br/>Connection Pool: 10<br/>Timeout: 5s"]
    end
    subgraph Config["Configuration"]
        Env[".env<br/>DATABASE_URL<br/>Validated on startup"]
    end
    Prisma -->|"TCP/5432"| User
    Env -->|"configures"| Prisma`,
  },
  {
    id: 2,
    title: "Auth Core Logic (JWT)",
    detailed_objective:
      "Implement the pure business logic for authentication, decoupled from the HTTP transport layer.",
    implementation_steps: [
      "Install `bcryptjs` for hashing and `jsonwebtoken` for token management.",
      "Create `hashPassword` and `verifyPassword` utilities.",
    ],
    description: "Implement token signing and password hashing utilities.",
    verification_criteria: "Unit tests pass for hashing; JWT issuance returns valid signature.",
    files: [{ path: "src/utils/auth.ts", type: "Create" }],
    context_handoff: { auth_algo: "HS256" },
    reasoning: ["Using HS256 for lower compute overhead."],
    architecture: `flowchart LR
    subgraph Password["Password Utils"]
        HP["hashPassword()"]
    end`,
  },
];

interface FileItem {
  path: string;
  type: string;
}

const groupFilesByModule = (files: FileItem[] | undefined) => {
  const modules: Record<string, FileItem[]> = {
    Database: [],
    "Core Logic": [],
    "API & Middleware": [],
    Frontend: [],
    Documentation: [],
    Configuration: [],
  };

  if (!files || !Array.isArray(files) || files.length === 0) return {};

  files.forEach((file) => {
    if (!file || !file.path) return;
    const path = file.path.toLowerCase();
    
    if (path.includes("prisma") || path.includes("db.ts") || path.includes("migrations")) {
      modules["Database"].push(file);
    } else if (path.includes("readme") || path.includes(".md") || path.includes("agents/")) {
      modules["Documentation"].push(file);
    } else if (
      path.includes("utils") ||
      path.includes("/lib/") ||
      path.includes("types") ||
      path.includes("hooks") ||
      path.includes("services") ||
      path.includes("providers")
    ) {
      modules["Core Logic"].push(file);
    } else if (path.includes("api") || path.includes("middleware") || path.includes("trpc")) {
      modules["API & Middleware"].push(file);
    } else if (
      path.includes("components") ||
      path.includes("app/") ||
      path.includes("apps/web") ||
      path.includes("tailwind") ||
      path.includes("pages")
    ) {
      modules["Frontend"].push(file);
    } else {
      modules["Configuration"].push(file);
    }
  });

  return Object.fromEntries(
    Object.entries(modules).filter(([_, v]) => v.length > 0)
  );
};

const getModuleIcon = (name: string) => {
  switch (name) {
    case "Database": return Database;
    case "Core Logic": return BrainCircuit;
    case "API & Middleware": return Server;
    case "Frontend": return Layout;
    case "Documentation": return FileCode;
    case "Configuration": return Settings;
    default: return Code2;
  }
};

const HeaderBadge = ({ children, icon: Icon }: { children: React.ReactNode; icon?: LucideIcon }) => (
  <div className="flex items-center gap-1.5 px-2 py-0.5 border border-zinc-200 rounded text-xs font-medium text-primary-color">
    {Icon && <Icon className="w-3.5 h-3.5" />}
    {children}
  </div>
);

const FormattedText = ({ text }: { text: string }) => {
  if (!text) return null;
  const parts = text.split("`");
  return (
    <>
      {parts.map((part, index) => {
        if (index % 2 === 1) {
          return (
            <code key={index} className="font-mono text-[10px] font-medium text-primary-color bg-zinc-100 px-1 py-0.5 rounded border border-zinc-200 mx-0.5">
              {part}
            </code>
          );
        }
        return <span key={index}>{part}</span>;
      })}
    </>
  );
};

const StatusIcon = ({ status }: { status: string }) => {
  if (status === "generated")
    return (
      <div className="w-5 h-5 bg-primary-color rounded-full flex items-center justify-center text-accent-color">
        <Check className="w-3 h-3" />
      </div>
    );
  return <div className="w-5 h-5 border border-zinc-200 rounded-full bg-zinc-50" />;
};

const PlanPage = () => {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const recipeId = params?.taskId as string;
  const planIdFromUrl = searchParams.get("planId");
  const specIdFromUrl = searchParams.get("specId");
  const isDemoMode = searchParams.get("showcase") === "1";

  const [planId, setPlanId] = useState<string | null>(planIdFromUrl);
  const [planStatus, setPlanStatus] = useState<PlanStatusResponse | null>(null);
  const [planItems, setPlanItems] = useState<PlanItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [visibleCount, setVisibleCount] = useState(0);
  const [repoName, setRepoName] = useState<string>("Repository");
  const [branchName, setBranchName] = useState<string>("Branch");
  const [demoDelayComplete, setDemoDelayComplete] = useState(!isDemoMode);

  const bottomRef = useRef<HTMLDivElement>(null);
  const mockDataInitializedRef = useRef(false);

  // Demo mode delay effect
  useEffect(() => {
    if (!isDemoMode) return;
    
    console.log("[Plan Page] Demo mode active - starting 35 second delay");
    const timer = setTimeout(() => {
      console.log("[Plan Page] Demo mode delay complete");
      setDemoDelayComplete(true);
    }, DEMO_MODE_DELAY);

    return () => clearTimeout(timer);
  }, [isDemoMode]);

  // Load mock data from codegenMock.json in demo mode
  useEffect(() => {
    if (!isDemoMode || !demoDelayComplete) return;
    if (mockDataInitializedRef.current) return;
    
    console.log("[Plan Page] Demo mode - loading mock data from codegenMock.json");
    
    // Set demo repo and branch
    setRepoName("cal.com");
    setBranchName("main");

    // Set plan ID
    if (!planId) {
      setPlanId("demo-plan-id");
    }

    // Set plan status from mock data
    const mockPlanStatus: PlanStatusResponse = {
      plan_id: codegenMockData.plan_status.plan_id,
      spec_id: codegenMockData.plan_status.spec_id,
      recipe_id: recipeId || codegenMockData.plan_status.recipe_id,
      plan_gen_status: codegenMockData.plan_status.plan_gen_status as "COMPLETED" | "IN_PROGRESS" | "FAILED" | "SUBMITTED",
      current_step: codegenMockData.plan_status.current_step,
      progress_percent: codegenMockData.plan_status.progress_percent,
      total_items: codegenMockData.plan_status.total_items,
      items_completed: codegenMockData.plan_status.items_completed,
      status_message: codegenMockData.plan_status.status_message,
      error_message: codegenMockData.plan_status.error_message,
    };
    setPlanStatus(mockPlanStatus);

    // Set plan items from mock data
    const mockPlanItems: PlanItem[] = codegenMockData.plan_items.map((item) => ({
      id: item.id,
      item_number: item.item_number,
      order: item.order,
      title: item.title,
      detailed_objective: item.detailed_objective,
      implementation_steps: item.implementation_steps,
      description: item.description,
      verification_criteria: item.verification_criteria,
      files: item.files.map((f) => ({
        path: f.path,
        type: f.type as "create" | "modify" | "delete",
      })),
      context_handoff: item.context_handoff,
      reasoning: item.reasoning,
      architecture: item.architecture,
    }));
    setPlanItems(mockPlanItems);
    setIsLoading(false);

    mockDataInitializedRef.current = true;
  }, [isDemoMode, demoDelayComplete, recipeId, planId]);

  // Initialize with mock data (non-demo mode fallback)
  useEffect(() => {
    if (isDemoMode) return; // Skip if in demo mode
    if (mockDataInitializedRef.current) return;
    
    // Set mock repo and branch
    setRepoName("my-awesome-project");
    setBranchName("main");

    // Set mock plan ID
    if (!planId) {
      setPlanId("mock-plan-id-12345");
    }

    // Set mock plan status
    const mockPlanStatus: PlanStatusResponse = {
      plan_id: "mock-plan-id-12345",
      spec_id: "mock-spec-id-12345",
      recipe_id: recipeId || "mock-recipe-id",
      plan_gen_status: "COMPLETED",
      current_step: 5,
      progress_percent: 100,
      total_items: 5,
      items_completed: 5,
      status_message: "Plan generation completed successfully",
      error_message: null,
    };
    setPlanStatus(mockPlanStatus);

    // Set mock plan items
    const mockPlanItems: PlanItem[] = [
      {
        id: "item-1",
        item_number: 1,
        order: 0,
        title: "Set up Authentication Schema & Database",
        detailed_objective: "Create the foundational database schema for user authentication, including user table with proper fields for email, password hash, and timestamps. Configure Prisma as the ORM and establish PostgreSQL connection with appropriate pooling settings.",
        implementation_steps: [
          "Create `prisma/schema.prisma` with User model including id (UUID), email (unique), passwordHash, createdAt, and updatedAt",
          "Configure `DATABASE_URL` environment variable in `.env` file",
          "Create `src/lib/db.ts` with PrismaClient singleton pattern to prevent connection exhaustion",
          "Run `prisma generate` to generate TypeScript types",
          "Execute `prisma migrate dev --name init-user-schema` to create initial migration",
          "Test database connection with a simple query"
        ],
        description: "Initialize database schema for user authentication with Prisma ORM",
        verification_criteria: "Database connection established; User table created successfully; Prisma Client can query database without errors",
        files: [
          { path: "prisma/schema.prisma", type: "create" },
          { path: "src/lib/db.ts", type: "create" },
          { path: ".env", type: "modify" },
          { path: "package.json", type: "modify" }
        ],
        context_handoff: {
          db_provider: "PostgreSQL",
          orm: "Prisma",
          user_id_type: "UUID v4",
          email_constraint: "UNIQUE"
        },
        reasoning: "Starting with the database layer ensures we have a solid foundation before implementing business logic. UUID is chosen over auto-increment for better security and distributed system compatibility.",
        architecture: `flowchart TB
    subgraph DB["PostgreSQL Database"]
        User[("User Table<br/>id: UUID PK<br/>email: VARCHAR UNIQUE<br/>passwordHash: VARCHAR<br/>createdAt: TIMESTAMP<br/>updatedAt: TIMESTAMP")]
    end
    subgraph App["Application Layer"]
        Prisma["PrismaClient<br/>Singleton Pattern<br/>Connection Pool: 10"]
    end
    Prisma -->|"TCP/5432"| User`
      },
      {
        id: "item-2",
        item_number: 2,
        order: 1,
        title: "Implement Password Hashing & JWT Utilities",
        detailed_objective: "Build core authentication utilities for secure password hashing using bcrypt and JWT token generation/verification. These utilities will be used across the application for user authentication flows.",
        implementation_steps: [
          "Install dependencies: `bcryptjs` and `jsonwebtoken`",
          "Create `src/utils/password.ts` with hashPassword() and verifyPassword() functions",
          "Set bcrypt salt rounds to 12 for optimal security/performance balance",
          "Create `src/utils/jwt.ts` with generateToken() and verifyToken() functions",
          "Configure JWT_SECRET and JWT_EXPIRES_IN environment variables",
          "Add token payload type definitions with userId and email",
          "Write unit tests for password hashing and JWT operations"
        ],
        description: "Core authentication utilities for password security and token management",
        verification_criteria: "Password hashing produces different hashes for same input; Verification correctly validates passwords; JWT tokens can be generated and verified; Tokens expire correctly",
        files: [
          { path: "src/utils/password.ts", type: "create" },
          { path: "src/utils/jwt.ts", type: "create" },
          { path: "src/types/auth.ts", type: "create" },
          { path: ".env", type: "modify" },
          { path: "src/utils/__tests__/password.test.ts", type: "create" },
          { path: "src/utils/__tests__/jwt.test.ts", type: "create" }
        ],
        context_handoff: {
          hash_algorithm: "bcrypt",
          salt_rounds: 12,
          jwt_algorithm: "HS256",
          token_expiry: "7d"
        },
        reasoning: "bcrypt is industry standard for password hashing with built-in salting. HS256 JWT provides good balance of security and performance for this use case.",
        architecture: `flowchart LR
    subgraph Utils["Authentication Utilities"]
        Hash["hashPassword()<br/>bcrypt + salt"]
        Verify["verifyPassword()<br/>compare hash"]
        Gen["generateToken()<br/>JWT sign"]
        Check["verifyToken()<br/>JWT verify"]
    end
    Hash --> Verify
    Gen --> Check`
      },
      {
        id: "item-3",
        item_number: 3,
        order: 2,
        title: "Build Authentication Service Layer",
        detailed_objective: "Create a service layer that handles all authentication business logic including user registration, login, and token refresh. This service will orchestrate database operations and utility functions.",
        implementation_steps: [
          "Create `src/services/auth.service.ts` with AuthService class",
          "Implement registerUser() method: validate email, check existing user, hash password, create user record",
          "Implement loginUser() method: find user, verify password, generate JWT token",
          "Implement refreshToken() method: verify old token, generate new token",
          "Implement getUserById() method for token validation",
          "Add email validation using regex or validation library",
          "Implement rate limiting considerations in service layer",
          "Add comprehensive error handling with custom error types"
        ],
        description: "Service layer for user registration, login, and token management",
        verification_criteria: "New users can register with valid email; Login succeeds with correct credentials; Login fails with incorrect credentials; Tokens can be refreshed; Duplicate emails are rejected",
        files: [
          { path: "src/services/auth.service.ts", type: "create" },
          { path: "src/types/errors.ts", type: "create" },
          { path: "src/services/__tests__/auth.service.test.ts", type: "create" }
        ],
        context_handoff: {
          validation: "email format + length",
          error_handling: "Custom error classes",
          rate_limiting: "Ready for middleware"
        },
        reasoning: "Service layer separates business logic from HTTP concerns, making code more testable and reusable. Custom errors provide better error handling downstream.",
        architecture: `flowchart TD
    API[API Routes] --> Service[AuthService]
    Service --> DB[(Database)]
    Service --> HashUtil[Password Utils]
    Service --> JWTUtil[JWT Utils]
    Service --> Validator[Email Validator]`
      },
      {
        id: "item-4",
        item_number: 4,
        order: 3,
        title: "Create API Routes & Middleware",
        detailed_objective: "Implement REST API endpoints for authentication operations and create middleware for protecting routes that require authentication. Set up proper request validation and error handling.",
        implementation_steps: [
          "Create `src/app/api/auth/register/route.ts` for POST /api/auth/register",
          "Create `src/app/api/auth/login/route.ts` for POST /api/auth/login",
          "Create `src/app/api/auth/refresh/route.ts` for POST /api/auth/refresh",
          "Implement request body validation using zod",
          "Create `src/middleware/auth.middleware.ts` for JWT verification",
          "Add rate limiting middleware using express-rate-limit or custom implementation",
          "Implement standardized error response format",
          "Add CORS configuration for API routes"
        ],
        description: "REST API endpoints and authentication middleware",
        verification_criteria: "POST /api/auth/register accepts valid user data; POST /api/auth/login returns JWT token; Protected routes reject requests without valid token; Rate limiting prevents brute force attacks",
        files: [
          { path: "src/app/api/auth/register/route.ts", type: "create" },
          { path: "src/app/api/auth/login/route.ts", type: "create" },
          { path: "src/app/api/auth/refresh/route.ts", type: "create" },
          { path: "src/middleware/auth.middleware.ts", type: "create" },
          { path: "src/middleware/rate-limit.middleware.ts", type: "create" },
          { path: "src/lib/validation.ts", type: "create" }
        ],
        context_handoff: {
          validation_library: "zod",
          rate_limit: "100 requests/15min",
          cors: "Configured for frontend origin"
        },
        reasoning: "Next.js API routes provide serverless-ready endpoints. Zod ensures type-safe validation. Rate limiting is critical for preventing abuse.",
        architecture: `flowchart TB
    Client[Client Request] --> CORS[CORS Middleware]
    CORS --> Rate[Rate Limiter]
    Rate --> Val[Request Validator]
    Val --> Auth[Auth Middleware]
    Auth --> Route[API Route Handler]
    Route --> Service[Auth Service]`
      },
      {
        id: "item-5",
        item_number: 5,
        order: 4,
        title: "Build Frontend Authentication UI",
        detailed_objective: "Create React components for login and registration forms with proper form validation, error handling, and loading states. Integrate with authentication API endpoints and manage auth state globally.",
        implementation_steps: [
          "Create `src/components/auth/LoginForm.tsx` with email and password fields",
          "Create `src/components/auth/RegisterForm.tsx` with email, password, and confirm password",
          "Implement form validation using react-hook-form and zod",
          "Create `src/contexts/AuthContext.tsx` for global auth state management",
          "Implement useAuth hook for easy auth access in components",
          "Add loading states and error message display",
          "Create protected route wrapper component",
          "Implement automatic token refresh logic",
          "Add password strength indicator in registration form",
          "Style forms with Tailwind CSS for responsive design"
        ],
        description: "Frontend authentication forms and state management",
        verification_criteria: "Forms validate input before submission; Loading states show during API calls; Error messages display for failed requests; Users stay logged in after page refresh; Protected routes redirect to login when not authenticated",
        files: [
          { path: "src/components/auth/LoginForm.tsx", type: "create" },
          { path: "src/components/auth/RegisterForm.tsx", type: "create" },
          { path: "src/contexts/AuthContext.tsx", type: "create" },
          { path: "src/hooks/useAuth.ts", type: "create" },
          { path: "src/components/ProtectedRoute.tsx", type: "create" },
          { path: "src/app/(auth)/login/page.tsx", type: "create" },
          { path: "src/app/(auth)/register/page.tsx", type: "create" }
        ],
        context_handoff: {
          form_library: "react-hook-form",
          state_management: "React Context API",
          validation: "zod schemas",
          styling: "Tailwind CSS"
        },
        reasoning: "react-hook-form provides excellent performance and developer experience. Context API is sufficient for auth state without adding Redux complexity.",
        architecture: `flowchart TB
    UI[Auth Forms] --> Hook[useAuth Hook]
    Hook --> Context[AuthContext]
    Context --> API[API Client]
    API --> Backend[Backend API]
    Context --> Storage[localStorage<br/>JWT Token]`
      }
    ];
    setPlanItems(mockPlanItems);
    setIsLoading(false);

    mockDataInitializedRef.current = true;
  }, [isDemoMode, recipeId, planId]);

  // DISABLED FOR MOCK DATA VIEWING
  // useEffect(() => {
  //   const fetchRecipeDetails = async () => {
  //     if (!recipeId) return;
  //     try {
  //       const recipeDetails = await SpecService.getRecipeDetails(recipeId);
  //       setRepoName(recipeDetails.repo_name || "Unknown Repository");
  //       setBranchName(recipeDetails.branch_name || "main");
  //     } catch (error) {}
  //   };
  //   fetchRecipeDetails();
  // }, [recipeId]);

  // DISABLED FOR MOCK DATA VIEWING
  const { data: statusData, isLoading: isLoadingStatus } = useQuery({
    queryKey: ["plan-status", planId, recipeId, specIdFromUrl],
    queryFn: async () => {
      return null; // Skip API call - using mock data
    },
    enabled: false, // Disabled for mock data
    refetchInterval: false,
  });

  // DISABLED FOR MOCK DATA VIEWING
  // useEffect(() => {
  //   if (statusData) {
  //     setPlanStatus(statusData);
  //     setIsLoading(false);
  //     if (statusData.plan_id && !planId) setPlanId(statusData.plan_id);
  //   }
  // }, [statusData, planId]);

  // useEffect(() => {
  //   if ((recipeId || specIdFromUrl) && !planId && !isLoadingStatus && !statusData) {
  //     PlanService.submitPlanGeneration({
  //       recipe_id: recipeId || undefined,
  //       spec_id: specIdFromUrl || undefined,
  //     }).then((response) => {
  //       setPlanId(response.plan_id);
  //       const params = new URLSearchParams(searchParams.toString());
  //       params.set("planId", response.plan_id);
  //       router.replace(`/task/${recipeId}/plan?${params.toString()}`);
  //     });
  //   }
  // }, [recipeId, specIdFromUrl, planId, isLoadingStatus, statusData]);

  // useEffect(() => {
  //   if (planStatus?.plan_gen_status === "COMPLETED" && planId && planItems.length === 0) {
  //     PlanService.getPlanItems(planId, 0, 50).then(res => setPlanItems(res.plan_items));
  //   }
  // }, [planStatus?.plan_gen_status, planId]);

  if (isLoading || (isDemoMode && !demoDelayComplete)) {
    return (
      <div className="flex items-center justify-center min-h-[80vh]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary-color mx-auto mb-3" />
          <p className="text-sm text-primary-color">
            {isDemoMode && !demoDelayComplete 
              ? "Generating detailed implementation plan..." 
              : "Loading..."}
          </p>
        </div>
      </div>
    );
  }

  const isGenerating = planStatus?.plan_gen_status === "IN_PROGRESS" || planStatus?.plan_gen_status === "SUBMITTED";
  const isCompleted = planStatus?.plan_gen_status === "COMPLETED";
  const isFailed = planStatus?.plan_gen_status === "FAILED";

  return (
    <div className="min-h-screen bg-background text-primary-color font-sans antialiased">
      <main className="max-w-2xl mx-auto px-6 py-12 pb-32">
        <div className="flex justify-between items-start mb-10">
          <div>
            <h1 className="text-2xl font-bold text-primary-color mb-2">Task Overview</h1>
            <p className="text-sm text-primary-color leading-relaxed">Execution plan generated step-by-step.</p>
          </div>
          <div className="flex items-center gap-2">
            <HeaderBadge icon={Github}>{repoName}</HeaderBadge>
            <HeaderBadge icon={GitBranch}>{branchName}</HeaderBadge>
          </div>
        </div>

        <div className="space-y-6 relative">
          <div className="absolute left-[26px] top-4 bottom-4 w-[1px] bg-zinc-100 -z-10" />

          {isGenerating && (
            <div className="pl-16 py-8">
              <div className="border border-zinc-200 rounded-xl p-8 bg-zinc-50">
                <Loader2 className="w-5 h-5 animate-spin mb-2" />
                <p className="text-sm font-medium">{planStatus?.status_message || "Generating..."}</p>
              </div>
            </div>
          )}

          {isFailed && (
            <div className="pl-16 py-8">
              <div className="border border-red-200 rounded-xl p-8 bg-red-50">
                <div className="flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-red-900 mb-1">
                      Plan generation failed
                    </p>
                    {planStatus?.status_message && (
                      <p className="text-xs text-red-700">{planStatus.status_message}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {isCompleted && planItems.length > 0 && (
            <Accordion type="single" collapsible className="space-y-6">
              {planItems.map((item) => {
                const modules = groupFilesByModule(item.files);
                // FIX: Use unique string based on item.order to prevent global expand
                const itemValue = `plan-step-${item.order}`;

                return (
                  <AccordionItem
                    key={itemValue}
                    value={itemValue}
                    className="group bg-background border border-zinc-200 rounded-xl overflow-hidden transition-all data-[state=open]:ring-1 data-[state=open]:ring-zinc-900"
                  >
                    <AccordionTrigger className="p-4 flex gap-4 items-start hover:no-underline [&>svg]:hidden w-full">
                      <div className="pt-0.5 shrink-0"><StatusIcon status="generated" /></div>
                      <div className="flex-1 min-w-0 text-left">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] font-black uppercase">Slice {item.order + 1}</span>
                          <ChevronDown className="w-4 h-4 transition-transform group-data-[state=open]:rotate-180" />
                        </div>
                        <h3 className="text-sm font-bold truncate">{item.title}</h3>
                      </div>
                    </AccordionTrigger>

                    <AccordionContent className="border-t border-zinc-100 bg-zinc-50/50 pt-0">
                      <div className="px-5 py-4 border-b border-zinc-100 bg-background">
                        <div className="flex items-center gap-2 mb-2"><AlignLeft className="w-3.5 h-3.5" /><span className="text-[10px] font-bold uppercase">Objective</span></div>
                        <p className="text-xs">{item.detailed_objective}</p>
                      </div>

                      {item.description && (
                        <div className="px-5 py-4 border-b border-zinc-100 bg-zinc-50/50">
                          <div className="flex items-center gap-2 mb-2"><FileText className="w-3.5 h-3.5" /><span className="text-[10px] font-bold uppercase">Description</span></div>
                          <p className="text-xs">{item.description}</p>
                        </div>
                      )}

                      <div className="px-5 py-4 border-b border-zinc-100 bg-background">
                        <div className="flex items-center gap-2 mb-2"><ListTodo className="w-3.5 h-3.5" /><span className="text-[10px] font-bold uppercase">Implementation Steps</span></div>
                        <ul className="space-y-2">
                          {item.implementation_steps && item.implementation_steps.length > 0 ? (
                            item.implementation_steps.map((step, i) => (
                              <li key={i} className="flex gap-2 text-xs text-left">
                                <div className="mt-1.5 w-1 h-1 rounded-full bg-zinc-300 shrink-0" />
                                <FormattedText text={step} />
                              </li>
                            ))
                          ) : (
                            <li className="text-xs text-zinc-400 italic">No implementation steps defined</li>
                          )}
                        </ul>
                      </div>

                      {item.verification_criteria && (
                        <div className="px-5 py-4 border-b border-zinc-100 bg-zinc-50/50">
                          <div className="flex items-center gap-2 mb-2"><ShieldCheck className="w-3.5 h-3.5" /><span className="text-[10px] font-bold uppercase">Verification Criteria</span></div>
                          <p className="text-xs">{item.verification_criteria}</p>
                        </div>
                      )}

                      {item.context_handoff && (
                        <div className="px-5 py-4 border-b border-zinc-100 bg-background">
                          <div className="flex items-center gap-2 mb-2"><ArrowRightLeft className="w-3.5 h-3.5" /><span className="text-[10px] font-bold uppercase">Context Handoff</span></div>
                          {item.context_handoff.summary ? (
                            <p className="text-xs">{item.context_handoff.summary}</p>
                          ) : (
                            <div className="text-xs">
                              {Object.entries(item.context_handoff).map(([key, value], i) => (
                                <div key={i} className="mb-2 last:mb-0">
                                  <span className="font-bold text-zinc-600">{key}:</span>{" "}
                                  <span>{typeof value === 'string' ? value : JSON.stringify(value)}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {item.reasoning && (
                        <div className="px-5 py-4 border-b border-zinc-100 bg-zinc-50/50">
                          <div className="flex items-center gap-2 mb-2"><Lightbulb className="w-3.5 h-3.5" /><span className="text-[10px] font-bold uppercase">Reasoning</span></div>
                          {Array.isArray(item.reasoning) ? (
                            <ul className="space-y-2">
                              {item.reasoning.length > 0 ? (
                                item.reasoning.map((reason, i) => (
                                  <li key={i} className="flex gap-2 text-xs text-left">
                                    <div className="mt-1.5 w-1 h-1 rounded-full bg-amber-400 shrink-0" />
                                    <FormattedText text={reason} />
                                  </li>
                                ))
                              ) : (
                                <li className="text-xs text-zinc-400 italic">No reasoning provided</li>
                              )}
                            </ul>
                          ) : (
                            <p className="text-xs">{item.reasoning}</p>
                          )}
                        </div>
                      )}

                      {item.architecture && (
                        <div className="px-5 py-4 bg-background">
                          <div className="flex items-center gap-2 mb-2"><GitMerge className="w-3.5 h-3.5" /><span className="text-[10px] font-bold uppercase">Architecture</span></div>
                          <div className="border border-zinc-100 rounded-lg p-4 bg-background overflow-x-auto">
                            <MermaidDiagram chart={item.architecture} />
                          </div>
                        </div>
                      )}
                      
                      {/* Files changeset */}
                      {(Object.keys(modules).length > 0 || (item.files && item.files.length > 0)) && (
                        <div className="px-5 py-4 border-t border-zinc-100">
                           <div className="flex items-center gap-2 mb-3">
                              <FileCode className="w-3.5 h-3.5 text-primary-color" />
                              <span className="text-[10px] font-bold text-primary-color uppercase tracking-wider">Specs to Generate</span>
                              <span className="text-[9px] text-zinc-400">({item.files?.length || 0} files)</span>
                            </div>
                            {Object.keys(modules).length > 0 ? (
                              <div className="grid grid-cols-1 gap-3">
                                {Object.entries(modules).map(([modName, files]) => (
                                  <div key={modName} className="bg-zinc-50 rounded-lg p-3 border border-zinc-100/80">
                                    <div className="flex items-center gap-2 mb-2">
                                      {React.createElement(getModuleIcon(modName), { className: "w-3 h-3" })}
                                      <span className="text-[10px] font-bold uppercase">{modName}</span>
                                      <span className="text-[9px] text-zinc-400">({files.length})</span>
                                    </div>
                                    <ul className="space-y-1.5">
                                      {files.map((f, i) => (
                                        <li key={i} className="flex justify-between items-center text-[10px] gap-2">
                                          <span className="font-mono truncate text-zinc-600" title={f.path}>{f.path}</span>
                                          <span className={`font-bold uppercase text-[9px] px-1.5 py-0.5 rounded ${
                                            f.type?.toLowerCase() === 'create' ? 'bg-emerald-50 text-emerald-600' :
                                            f.type?.toLowerCase() === 'modify' ? 'bg-amber-50 text-amber-600' :
                                            f.type?.toLowerCase() === 'delete' ? 'bg-red-50 text-red-600' :
                                            'bg-zinc-100 text-zinc-600'
                                          }`}>{f.type}</span>
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="bg-zinc-50 rounded-lg p-3 border border-zinc-100/80">
                                <ul className="space-y-1.5">
                                  {item.files?.map((f: FileItem, i: number) => (
                                    <li key={i} className="flex justify-between items-center text-[10px] gap-2">
                                      <span className="font-mono truncate text-zinc-600" title={f.path}>{f.path}</span>
                                      <span className={`font-bold uppercase text-[9px] px-1.5 py-0.5 rounded ${
                                        f.type?.toLowerCase() === 'create' ? 'bg-emerald-50 text-emerald-600' :
                                        f.type?.toLowerCase() === 'modify' ? 'bg-amber-50 text-amber-600' :
                                        f.type?.toLowerCase() === 'delete' ? 'bg-red-50 text-red-600' :
                                        'bg-zinc-100 text-zinc-600'
                                      }`}>{f.type}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                        </div>
                      )}
                    </AccordionContent> 
                  </AccordionItem>
                );
              })}
            </Accordion>
          )}

          {/* Static Fallback (for demo/loading) */}
          {visibleCount > 0 && (
            <Accordion type="single" collapsible className="space-y-6">
              {FULL_PLAN.slice(0, visibleCount).map((slice, idx) => {
                const itemValue = `static-slice-${slice.id}`;
                return (
                  <AccordionItem key={itemValue} value={itemValue} className="group border border-zinc-200 rounded-xl overflow-hidden">
                    <AccordionTrigger className="p-4 flex gap-4">
                       <StatusIcon status="generated" />
                       <div className="text-left">
                         <span className="text-[10px] font-black uppercase">Slice {slice.id}</span>
                         <h3 className="text-sm font-bold">{slice.title}</h3>
                       </div>
                    </AccordionTrigger>
                    <AccordionContent className="p-5 bg-zinc-50/50">
                      <p className="text-xs">{slice.description}</p>
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          )}

          <div ref={bottomRef} />
        </div>

        {isCompleted && planItems.length > 0 && (
          <div className="mt-12 flex justify-end">
            <Button
              onClick={async () => {
                const firstItem = planItems[0];
                
                // In demo mode, skip API call and navigate directly
                if (isDemoMode) {
                  console.log("[Plan Page] Demo mode - skipping task splitting API call");
                  router.push(`/task/${recipeId}/code?planId=${planId}&itemNumber=${firstItem.item_number}&showcase=1`);
                  return;
                }
                
                try {
                  await TaskSplittingService.submitTaskSplitting({ plan_item_id: firstItem.id });
                } catch (error) {
                  console.error("Failed to start implementation, but redirecting anyway");
                } finally {
                  // Always redirect regardless of API call success/failure
                  router.push(`/task/${recipeId}/code?planId=${planId}&itemNumber=${firstItem.item_number}`);
                }
              }}
              className="bg-accent-color hover:bg-[#006B66] text-primary-color px-6 py-2 rounded-lg font-medium text-sm flex items-center gap-2"
            >
              <Rocket className="w-4 h-4" /> Start Implementation
            </Button>
          </div>
        )}
      </main>
    </div>
  );
};

export default PlanPage;