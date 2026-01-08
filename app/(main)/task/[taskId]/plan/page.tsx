"use client";

import React, { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { MermaidDiagram } from "@/components/chat/MermaidDiagram";
import {
  Check,
  Loader2,
  ChevronDown,
  FileCode,
  ShieldCheck,
  Database,
  Sparkles,
  Layers,
  BrainCircuit,
  Plus,
  Play,
  GitMerge,
  ClipboardList,
  Target,
  Server,
  Layout,
  Settings,
  Code2,
  AlignLeft,
  ListTodo,
  ArrowLeft,
  Clock,
  AlertCircle,
  Package,
  Copy,
  ExternalLink,
  Github,
  GitBranch,
  Zap,
  Rocket,
  LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import PlanService from "@/services/PlanService";
import SpecService from "@/services/SpecService";
import TaskSplittingService from "@/services/TaskSplittingService";
import { PlanStatusResponse, PlanItem } from "@/lib/types/spec";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

/**
 * VERTICAL SLICE PLANNER (Auto-Generation Mode)
 * * Concept:
 * - Focuses on the "Architectural Planning" phase.
 * - Streams the plan generation automatically.
 * - Embeds specific Mermaid diagrams within each slice card.
 * - Detailed Strategic Overview with Module-based breakdowns inside cards.
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
      "Implement the pure business logic for authentication, decoupled from the HTTP transport layer. This involves creating the JWT signing/verification utilities and the password hashing mechanism using bcrypt.",
    implementation_steps: [
      "Install `bcryptjs` for hashing and `jsonwebtoken` for token management.",
      "Create `hashPassword` and `verifyPassword` utilities in `src/utils/auth.ts` with salt rounds set to 10.",
      "Implement `signToken` and `verifyToken` functions using the HS256 algorithm.",
      "Define TypeScript interfaces for the JWT payload to ensure type safety across the app.",
    ],
    description: "Implement token signing and password hashing utilities.",
    verification_criteria:
      "Unit tests pass for hashing; JWT issuance returns valid signature.",
    files: [
      { path: "src/utils/auth.ts", type: "Create" },
      { path: "src/types/next-auth.d.ts", type: "Create" },
      { path: "src/lib/env.ts", type: "Modify" },
      { path: "jest.config.js", type: "Modify" },
    ],
    context_handoff: {
      auth_algo: "HS256",
      token_expiry: "1h",
      secret_min_len: "32 chars",
    },
    reasoning: [
      "Using HS256 for lower compute overhead compared to RS256.",
      "Separating 'Logic' from 'API' allows testing authentication in isolation.",
      "Reading 'db_strategy' from Slice 1 to ensure User types match.",
    ],
    architecture: `flowchart LR
    subgraph Password["Password Utils"]
        HP["hashPassword()<br/>Salt: 10 rounds<br/>Output: hash"]
        VP["verifyPassword()<br/>Constant-time<br/>Output: boolean"]
    end
    
    subgraph Token["JWT Utils"]
        ST["signToken()<br/>Algo: HS256<br/>Expiry: 1h"]
        VT["verifyToken()<br/>Validates sig<br/>Checks expiry"]
    end
    
    subgraph Payload["JWT Payload"]
        JP["sub: UUID<br/>email: string<br/>iat: number<br/>exp: number"]
    end
    
    Plain[Plaintext] --> HP
    HP --> Hash[Hash]
    Hash --> VP
    VP --> Valid{Valid?}
    
    User[User Data] --> ST
    ST --> JWT[JWT Token]
    JWT --> VT
    VT --> JP`,
  },
  {
    id: 3,
    title: "API Routes & Integration",
    detailed_objective:
      "Expose the core logic via Next.js API Routes. This slice bridges the database (Slice 1) and the logic (Slice 2) to create functioning endpoints for Login and Registration.",
    implementation_steps: [
      "Create Next.js Route Handlers for `POST /api/auth/login` and `register`.",
      "Integrate Slice 2's `hashPassword` for registration flow and `verifyPassword` for login flow.",
      "Implement `middleware.ts` to intercept requests to protected routes and validate JWTs.",
      "Configure appropriate HTTP 401/403 status codes for authentication failures.",
    ],
    description: "Expose login endpoints and connect to persistence.",
    verification_criteria:
      "POST /api/login returns 200 with valid credentials.",
    files: [
      { path: "src/app/api/auth/login/route.ts", type: "Create" },
      { path: "src/app/api/auth/register/route.ts", type: "Create" },
      { path: "src/middleware.ts", type: "Modify" },
    ],
    context_handoff: {
      endpoints: ["/api/login", "/api/register"],
      middleware: "Protected routes enabled",
    },
    reasoning: [
      "Connecting Slice 2 (Logic) with Slice 1 (DB).",
      "Middleware will now enforce the 'auth_algo' defined in Slice 2.",
    ],
    architecture: `flowchart TB
    Client[HTTP Client] --> MW
    
    subgraph MW["middleware.ts"]
        Extract["1. Extract JWT"]
        Verify["2. Verify Token"]
        Attach["3. Attach User"]
        Extract --> Verify --> Attach
    end
    
    MW --> Routes
    
    subgraph Routes["API Routes"]
        Login["/api/auth/login<br/>POST<br/>Body: email, password<br/>Response: 200 + JWT"]
        Register["/api/auth/register<br/>POST<br/>Body: email, password, name<br/>Response: 201 Created"]
    end
    
    Routes --> DB[("PrismaClient<br/>PostgreSQL")]
    
    MW -->|"Invalid"| E401[401 Unauthorized]
    Login -->|"Bad Credentials"| E401
    Register -->|"Email Exists"| E409[409 Conflict]`,
  },
  {
    id: 4,
    title: "Frontend Login Form",
    detailed_objective:
      "Develop the user interface for the authentication flow. This includes building a responsive Login form with client-side validation (Zod) that mirrors the server-side constraints.",
    implementation_steps: [
      "Define Zod schemas for login validation (email format, password length).",
      "Build `LoginForm` component using React Hook Form for state management.",
      "Wire up form submission to call Slice 3's API endpoints using `fetch`.",
      "Implement global toast notifications to provide feedback on success or error.",
    ],
    description: "Interactive form with validation and error handling.",
    verification_criteria:
      "Form renders; Submit triggers API call; Error states display.",
    files: [
      { path: "src/components/LoginForm.tsx", type: "Create" },
      { path: "src/app/login/page.tsx", type: "Create" },
      { path: "src/components/ui/Button.tsx", type: "Modify" },
      { path: "tailwind.config.ts", type: "Modify" },
    ],
    context_handoff: {
      ui_components: ["LoginForm", "Button"],
      client_routes: ["/login", "/dashboard"],
    },
    reasoning: [
      "Final integration layer.",
      "Form validation must match constraints defined in Slice 1 (Schema).",
    ],
    architecture: `flowchart TB
    Hook["useForm()<br/>+ zodResolver"]
    Email["Email Input<br/>type: email"]
    Pass["Password Input<br/>type: password"]
    Button["Submit Button<br/>Loading/Disabled states"]
    
    Hook --> Email
    Hook --> Pass
    Email --> Button
    Pass --> Button
    
    Button --> Validate{Zod Validation}
    Validate -->|"Valid"| API["/api/auth/login"]
    Validate -->|"Invalid"| Error["Show Field Errors"]
    
    API -->|"Success"| Store["Store JWT Token"]
    API -->|"Error"| Toast["Toast Notification"]
    Store --> Redirect["/dashboard"]`,
  },
  {
    id: 5,
    title: "Email Verification System",
    detailed_objective:
      "Establish trust by verifying user email ownership. This slice introduces an email provider (SendGrid mock) and a token generation mechanism. Users cannot access protected routes until their email is verified.",
    implementation_steps: [
      "Update `User` schema to include `emailVerified` (DateTime) and `verificationToken` (String).",
      "Create `src/lib/mail.ts` to mock SendGrid API calls (logging to console for dev).",
      "Add `POST /api/auth/verify` endpoint to validate tokens sent via email.",
      "Inject verification check into `middleware.ts` to block unverified users.",
    ],
    description: "Integrate email provider and token verification loop.",
    verification_criteria:
      "Mock email logged to console; Clicking link updates DB state.",
    files: [
      { path: "prisma/schema.prisma", type: "Modify" },
      { path: "src/lib/mail.ts", type: "Create" },
      { path: "src/app/api/auth/verify/route.ts", type: "Create" },
      { path: "src/middleware.ts", type: "Modify" },
    ],
    context_handoff: {
      email_provider: "SendGrid (Mock)",
      token_strategy: "Random Bytes (Crypto)",
      blocking_rules: "Unverified users blocked",
    },
    reasoning: [
      "Modifying schema from Slice 1 requires a new migration.",
      "Mocking email transport prevents external dependencies during initial dev.",
      "Middleware update builds on Slice 3's protection logic.",
    ],
    architecture: `sequenceDiagram
    participant U as User
    participant R as /register API
    participant DB as Database
    participant M as mail.ts
    participant V as /api/verify
    
    Note over U,V: Registration Flow
    U->>R: Submit registration
    R->>DB: Create User (unverified)
    R->>R: Generate 32-byte token
    R->>DB: Store verification token
    R->>M: sendVerificationEmail()
    M-->>U: Email with verify link
    
    Note over U,V: Verification Flow
    U->>V: Click email link
    V->>DB: Lookup token
    alt Token Valid
        V->>DB: Set emailVerified = NOW()
        V-->>U: Redirect to /login
    else Token Invalid/Expired
        V-->>U: Show error page
    end`,
  },
  {
    id: 6,
    title: "Password Recovery Flow",
    detailed_objective:
      "Implement a secure mechanism for users to reset lost passwords. This requires a new temporary token type with strict expiration policies to prevent replay attacks.",
    implementation_steps: [
      "Create `PasswordResetToken` model in schema with 15-minute TTL.",
      "Build `Forgot Password` UI and API to generate and email reset links.",
      "Build `Reset Password` UI to accept new password and validate token.",
      "Invalidate token immediately after successful password update.",
    ],
    description: "Forgot password and reset password workflows.",
    verification_criteria:
      "Reset link generated; Expired tokens rejected; Password updates successfully.",
    files: [
      { path: "src/app/forgot-password/page.tsx", type: "Create" },
      { path: "src/app/reset-password/[token]/page.tsx", type: "Create" },
      { path: "src/app/api/auth/reset/route.ts", type: "Create" },
      { path: "prisma/schema.prisma", type: "Modify" },
    ],
    context_handoff: {
      token_ttl: "15 minutes",
      new_routes: ["/forgot-password", "/reset-password"],
    },
    reasoning: [
      "Requires short-lived tokens distinct from the email verification tokens in Slice 5.",
      "UI components reuse the Button and Form patterns established in Slice 4.",
    ],
    architecture: `flowchart TB
    Token[("id: UUID PK<br/>token: VARCHAR 64 UNIQUE<br/>userId: UUID FK<br/>expiresAt: NOW + 15min<br/>usedAt: NULL or TIMESTAMP")]
    
    FP["/forgot-password"] -->|"1. Submit email"| API1["POST /api/auth/reset/request"]
    API1 -->|"2. Generate token"| Token
    API1 -->|"3. Send email"| Email["User Email Inbox"]
    
    Email -->|"4. Click link"| RP["/reset-password/token"]
    RP -->|"5. Validate"| Check{Token Valid?}
    
    Check -->|"Valid + Not Expired + Not Used"| Form["Show Reset Form"]
    Check -->|"Invalid"| Error["Error: Invalid/Expired"]
    
    Form -->|"6. Submit new password"| API2["POST /api/auth/reset/confirm"]
    API2 -->|"7. Hash password"| Hash["bcrypt hash"]
    API2 -->|"8. Mark token used"| Token
    Hash --> Success["Redirect to /login"]`,
  },
  {
    id: 7,
    title: "User Profile & Session",
    detailed_objective:
      "Create a protected dashboard where users can manage their identity. This slice validates that the session persistence (JWT) allows for data fetching on behalf of the logged-in user.",
    implementation_steps: [
      "Create `GET /api/me` endpoint to return sanitized user details (excluding hash).",
      "Build `/dashboard/profile` page with Avatar upload placeholder.",
      "Implement `useAuth` hook to manage client-side session state from the JWT.",
      "Add 'Update Profile' form allowing name changes.",
    ],
    description: "Protected dashboard and user settings management.",
    verification_criteria:
      "/api/me returns 401 if token missing; Returns JSON if valid.",
    files: [
      { path: "src/app/dashboard/profile/page.tsx", type: "Create" },
      { path: "src/hooks/useAuth.ts", type: "Create" },
      { path: "src/app/api/me/route.ts", type: "Create" },
      { path: "src/components/ProfileForm.tsx", type: "Create" },
    ],
    context_handoff: {
      session_strategy: "Client-side JWT decoding",
      profile_fields: ["name", "avatarUrl"],
    },
    reasoning: [
      "Validates the end-to-end flow: DB (Slice 1) -> API (Slice 3) -> UI (Slice 4).",
      "Demonstrates read/write capabilities on the User entity.",
    ],
    architecture: `flowchart TB
    State["State<br/>user: User | null<br/>isLoading: boolean<br/>isAuthenticated: boolean"]
    Actions["Actions<br/>login - Store JWT<br/>logout - Clear & redirect<br/>refreshUser - Call /api/me"]
    
    Avatar["Avatar<br/>Upload Zone"]
    Info["Profile Info<br/>Name: editable<br/>Email: readonly<br/>Created: date"]
    Update["Update Button"]
    
    Req["GET /api/me<br/>Authorization: Bearer JWT"]
    Res200["200: User JSON<br/>id, email, name<br/>emailVerified, createdAt"]
    
    State --> Actions
    Avatar --> Info
    Info --> Update
    
    Actions -->|"fetches"| Req
    Req --> Res200
    Res200 -->|"populates"| Avatar`,
  },
  {
    id: 8,
    title: "RBAC & Admin Panel",
    detailed_objective:
      "Introduce Role-Based Access Control (RBAC). We will add an 'ADMIN' role and create a restricted area of the application that only Admins can access, proving the extensibility of our middleware.",
    implementation_steps: [
      "Add `role` enum to User model (values: USER, ADMIN).",
      "Update `middleware.ts` to check `req.user.role` for `/admin/*` routes.",
      "Create `/admin/users` table to list all registered users.",
      "Add 'Ban User' button accessible only to admins.",
    ],
    description: "Role-based access control and admin dashboard.",
    verification_criteria: "Regular user gets 403 on /admin; Admin gets 200.",
    files: [
      { path: "src/app/admin/page.tsx", type: "Create" },
      { path: "src/components/UserTable.tsx", type: "Create" },
      { path: "prisma/schema.prisma", type: "Modify" },
      { path: "src/middleware.ts", type: "Modify" },
    ],
    context_handoff: {
      roles: ["USER", "ADMIN"],
      admin_routes: ["/admin/users", "/admin/settings"],
    },
    reasoning: [
      "Finalizes the auth system by adding authorization layers on top of authentication.",
      "Touches all previous layers: DB (Enum), Logic (Role check), API (Guard), UI (Admin Layout).",
    ],
    architecture: `flowchart TB
    Admin["ADMIN<br/>All access<br/>User management<br/>Ban users"]
    UserRole["USER<br/>Dashboard<br/>Profile<br/>Settings"]
    
    Req[Request] --> JWT{JWT Valid?}
    JWT -->|"No"| E401["401 Unauthorized"]
    JWT -->|"Yes"| Role{Role Check}
    Role -->|"Forbidden"| E403["403 Forbidden"]
    Role -->|"OK"| Route["200 Success"]
    
    D["/dashboard - USER, ADMIN"]
    P["/profile - USER, ADMIN"]
    A1["/admin/* - ADMIN only"]
    A2["/admin/users - ADMIN only"]
    
    Search["Search users..."]
    Table["Email | Role | Status | Actions"]
    Ban["Ban User Button"]
    
    Admin -->|"inherits"| UserRole
    Route --> D
    D --> Search
    Search --> Table
    Table --> Ban
    Ban -->|"PATCH"| BanAPI["/api/admin/users/:id/ban"]
    BanAPI --> SetBan["Set isBanned = true"]
    SetBan --> Invalidate["Invalidate sessions"]`,
  },
];

// --- Helper to Group Files by Module ---
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
    Configuration: [],
  };

  if (!files || files.length === 0) {
    return {};
  }

  files.forEach((file) => {
    if (file.path.includes("prisma") || file.path.includes("db.ts")) {
      modules["Database"].push(file);
    } else if (
      file.path.includes("utils") ||
      file.path.includes("lib") ||
      file.path.includes("types") ||
      file.path.includes("hooks")
    ) {
      modules["Core Logic"].push(file);
    } else if (file.path.includes("api") || file.path.includes("middleware")) {
      modules["API & Middleware"].push(file);
    } else if (
      file.path.includes("components") ||
      file.path.includes("app/") ||
      file.path.includes("tailwind")
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
    case "Database":
      return Database;
    case "Core Logic":
      return BrainCircuit;
    case "API & Middleware":
      return Server;
    case "Frontend":
      return Layout;
    case "Configuration":
      return Settings;
    default:
      return Code2;
  }
};

const Badge = ({
  children,
  variant = "default",
  icon: Icon,
}: {
  children: React.ReactNode;
  variant?: "default" | "success" | "blue";
  icon?: LucideIcon;
}) => {
  const styles: Record<string, string> = {
    default: "bg-zinc-100 text-primary-color border-zinc-200",
    success: "bg-emerald-50 text-primary-color border-emerald-100",
    blue: "bg-blue-50 text-primary-color border-blue-100",
  };

  return (
    <div
      className={`flex items-center gap-1.5 px-2 py-0.5 border rounded text-[10px] font-bold uppercase tracking-wide ${styles[variant] || styles.default}`}
    >
      {Icon && <Icon className="w-3 h-3" />}
      {children}
    </div>
  );
};

const HeaderBadge = ({
  children,
  icon: Icon,
}: {
  children: React.ReactNode;
  icon?: LucideIcon;
}) => (
  <div className="flex items-center gap-1.5 px-2 py-0.5 border border-zinc-200 rounded text-xs font-medium text-primary-color">
    {Icon && <Icon className="w-3.5 h-3.5" />}
    {children}
  </div>
);

// --- Helper Component for Inline Code Styling ---
const FormattedText = ({ text }: { text: string }) => {
  if (!text) return null;
  const parts = text.split("`");
  return (
    <>
      {parts.map((part, index) => {
        if (index % 2 === 1) {
          // Odd indices are code blocks
          return (
            <code
              key={index}
              className="font-mono text-[10px] font-medium text-primary-color bg-zinc-100 px-1 py-0.5 rounded border border-zinc-200 mx-0.5"
            >
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
  if (status === "generating")
    return (
      <div className="w-5 h-5 border-2 border-primary-color border-t-transparent rounded-full animate-spin" />
    );
  return (
    <div className="w-5 h-5 border border-zinc-200 rounded-full bg-zinc-50" />
  );
};

const PlanPage = () => {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  // Note: taskId in URL is actually recipeId now
  const recipeId = params?.taskId as string;
  const planIdFromUrl = searchParams.get("planId");
  const specIdFromUrl = searchParams.get("specId");

  const [planId, setPlanId] = useState<string | null>(planIdFromUrl);
  const [planStatus, setPlanStatus] = useState<PlanStatusResponse | null>(null);
  const [planItems, setPlanItems] = useState<PlanItem[]>([]);
  const [isLoadingItems, setIsLoadingItems] = useState(false);
  const [nextStart, setNextStart] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(1);
  const [visibleCount, setVisibleCount] = useState(0);

  const bottomRef = useRef<HTMLDivElement>(null);
  const sliceRefs = useRef<Record<number, HTMLDivElement | null>>({});

  // Fetch plan status
  const { data: statusData, isLoading: isLoadingStatus } = useQuery({
    queryKey: ["plan-status", planId, recipeId, specIdFromUrl],
    queryFn: async () => {
      if (planId) {
        return await PlanService.getPlanStatus(planId);
      } else if (specIdFromUrl) {
        return await PlanService.getPlanStatusBySpecId(specIdFromUrl);
      } else if (recipeId) {
        return await PlanService.getPlanStatusByRecipeId(recipeId);
      }
      return null;
    },
    enabled: !!(planId || specIdFromUrl || recipeId),
    refetchInterval: (query) => {
      // Poll every 2 seconds if plan is in progress
      const data = query.state.data;
      if (
        data?.plan_gen_status === "IN_PROGRESS" ||
        data?.plan_gen_status === "SUBMITTED"
      ) {
        return 2000;
      }
      return false;
    },
  });

  // Update plan status when query data changes
  useEffect(() => {
    if (statusData) {
      setPlanStatus(statusData);
      setIsLoading(false);
      // If we got a plan_id from the status, store it
      if (statusData.plan_id && !planId) {
        setPlanId(statusData.plan_id);
      }
    }
  }, [statusData, planId]);

  // Auto-submit plan generation if we have recipeId/specId but no planId
  useEffect(() => {
    if (
      (recipeId || specIdFromUrl) &&
      !planId &&
      !isLoadingStatus &&
      !statusData
    ) {
      // Submit plan generation
      PlanService.submitPlanGeneration({
        recipe_id: recipeId || undefined,
        spec_id: specIdFromUrl || undefined,
      })
        .then((response) => {
          setPlanId(response.plan_id);
          // Update URL with planId
          const params = new URLSearchParams(searchParams.toString());
          params.set("planId", response.plan_id);
          router.replace(`/task/${recipeId}/plan?${params.toString()}`);
          toast.success("Plan generation started");
        })
        .catch((error: any) => {
          console.error("Error submitting plan generation:", error);
          toast.error(error.message || "Failed to start plan generation");
          setError(error.message || "Failed to start plan generation");
          setIsLoading(false);
        });
    }
  }, [recipeId, specIdFromUrl, planId, isLoadingStatus, statusData]);

  // Fetch plan items when plan is completed
  const fetchPlanItems = async (start: number = 0) => {
    if (!planId) return;

    try {
      setIsLoadingItems(true);
      const response = await PlanService.getPlanItems(planId, start, 20);
      if (start === 0) {
        setPlanItems(response.plan_items);
      } else {
        setPlanItems((prev) => [...prev, ...response.plan_items]);
      }
      setNextStart(response.next_start);
    } catch (error: any) {
      toast.error(error.message || "Failed to fetch plan items");
    } finally {
      setIsLoadingItems(false);
    }
  };

  useEffect(() => {
    if (
      planStatus?.plan_gen_status === "COMPLETED" &&
      planId &&
      planItems.length === 0
    ) {
      fetchPlanItems(0);
    }
  }, [planStatus?.plan_gen_status, planId]);
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[80vh]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary-color" />
          <p className="text-primary-color">Loading detailed plan...</p>
        </div>
      </div>
    );
  }

  // Check if recipeId is missing from URL
  if (!recipeId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] px-4">
        <div className="text-center">
          <h2 className="text-2xl font-semibold mb-2 text-primary-color">Task not found</h2>
          <p className="text-primary-color mb-6">
            The recipe ID was not found in the URL. Please start a new task.
          </p>
          <Button onClick={() => router.push("/idea")} className="bg-accent-color text-primary-color hover:bg-[#006B66] hover:text-accent-color">Create New Task</Button>
        </div>
      </div>
    );
  }

  const isGenerating =
    planStatus?.plan_gen_status === "IN_PROGRESS" ||
    planStatus?.plan_gen_status === "SUBMITTED";
  const isCompleted = planStatus?.plan_gen_status === "COMPLETED";
  const isFailed = planStatus?.plan_gen_status === "FAILED";

  return (
    <div className="min-h-screen bg-background text-primary-color font-sans selection:bg-zinc-100 antialiased">
      <main className="max-w-2xl mx-auto px-6 py-12 pb-32">
        {/* Intro */}
        <div className="flex justify-between items-start mb-10">
          <div>
            <h1 className="text-2xl font-bold text-primary-color mb-2">
              Task Overview
            </h1>
            <p className="text-sm text-primary-color leading-relaxed">
              Generating execution plan step-by-step. Each slice defines a
              complete vertical unit of work.
            </p>
          </div>
          {/* Repo info will be loaded from API or localStorage */}
          <div className="flex items-center gap-2">
            <HeaderBadge icon={Github}>Repository</HeaderBadge>
            <HeaderBadge icon={GitBranch}>Branch</HeaderBadge>
          </div>
        </div>

        {/* --- The Vertical Stream --- */}
        <div className="space-y-6 relative">
          {/* Connector Line (Background) */}
          <div className="absolute left-[26px] top-4 bottom-4 w-[1px] bg-zinc-100 -z-10" />

          {/* Plan Generation Status */}
          {isGenerating && (
            <div className="pl-16 py-8">
              <div className="border border-zinc-200 rounded-xl p-8 bg-zinc-50">
                <div className="flex items-center gap-3">
                  <Loader2 className="w-5 h-5 animate-spin text-primary-color" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-primary-color">
                      {planStatus?.status_message || "Generating plan..."}
                    </p>
                    {planStatus && (
                      <div className="mt-2">
                        {planStatus.progress_percent !== null &&
                          planStatus.progress_percent !== undefined && (
                            <div className="w-full bg-zinc-200 rounded-full h-2 mb-2">
                              <div
                                className="bg-zinc-600 h-2 rounded-full transition-all duration-300"
                                style={{
                                  width: `${planStatus.progress_percent}%`,
                                }}
                              />
                            </div>
                          )}
                        <p className="text-xs text-primary-color mt-1">
                          Step {planStatus.current_step + 1}/3
                          {planStatus.progress_percent !== null &&
                            planStatus.progress_percent !== undefined &&
                            ` • ${planStatus.progress_percent}%`}
                          {planStatus.total_items !== null &&
                            planStatus.total_items !== undefined &&
                            planStatus.items_completed !== null &&
                            planStatus.items_completed !== undefined &&
                            ` • ${planStatus.items_completed}/${planStatus.total_items} items`}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {isFailed && (
            <div className="pl-16 py-8">
              <div className="border border-red-200 rounded-xl p-8 bg-red-50">
                <div className="flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 text-red-600" />
                  <div>
                    <p className="text-sm font-medium text-red-900">
                      Plan generation failed
                    </p>
                    {planStatus?.error_message && (
                      <p className="text-xs text-red-700 mt-1">
                        {planStatus.error_message}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Plan Items */}
          {isCompleted &&
            planItems.length > 0 &&
            planItems.map((item, index) => {
              const isExpanded = expandedId === item.item_number;
              const modules = groupFilesByModule(item.files);

              return (
                <div
                  key={item.item_number}
                  ref={(el) => {
                    sliceRefs.current[item.item_number] = el;
                  }}
                  className="group animate-in fade-in slide-in-from-bottom-4 duration-500 relative"
                >
                  <div
                    className={`
                    relative bg-background border rounded-xl overflow-hidden transition-all
                    ${isExpanded ? "ring-1 ring-zinc-900 border-zinc-900 shadow-sm" : "border-zinc-200 hover:border-zinc-300"}
                  `}
                  >
                    {/* Summary Header */}
                    <div 
                      onClick={() => {
                        const newExpandedId = isExpanded
                          ? null
                          : item.item_number;
                        setExpandedId(newExpandedId);
                        if (newExpandedId !== null) {
                          setTimeout(() => {
                            const element = sliceRefs.current[item.item_number];
                            if (element) {
                              const yOffset = -24;
                              const y =
                                element.getBoundingClientRect().top +
                                window.scrollY +
                                yOffset;
                              window.scrollTo({ top: y, behavior: "smooth" });
                            }
                          }, 100);
                        }
                      }}
                      className="p-4 flex gap-4 items-start cursor-pointer"
                    >
                      <div className="pt-0.5 shrink-0">
                        <StatusIcon status="generated" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] font-black text-primary-color uppercase tracking-widest">
                            Slice {String(item.item_number).padStart(2, "0")}
                          </span>
                          <ChevronDown
                            className={`w-4 h-4 text-primary-color transition-transform ${isExpanded ? "rotate-180" : ""}`}
                          />
                        </div>
                        <h3 className="text-sm font-bold text-primary-color truncate">
                          {item.title}
                        </h3>
                        <p className="text-[11px] text-primary-color mt-1 line-clamp-1">
                          {item.description}
                        </p>
                      </div>
                    </div>

                    {/* Expanded Detail View */}
                    {isExpanded && (
                      <div className="border-t border-zinc-100 bg-zinc-50/50">
                        {/* 0. Detailed Objective */}
                        <div className="px-5 py-4 border-b border-zinc-100 bg-background">
                          <div className="flex items-center gap-2 mb-2">
                            <AlignLeft className="w-3.5 h-3.5 text-primary-color" />
                            <span className="text-[10px] font-bold text-primary-color uppercase tracking-wider">
                              Objective
                            </span>
                          </div>
                          <p className="text-xs text-primary-color leading-relaxed">
                            {item.detailed_objective}
                          </p>
                        </div>

                        {/* 1. Success Criteria */}
                        <div className="px-5 py-4 border-b border-zinc-100">
                          <div className="flex items-center gap-2 mb-2">
                            <ShieldCheck className="w-3.5 h-3.5 text-primary-color" />
                            <span className="text-[10px] font-bold text-primary-color uppercase tracking-wider">
                              Success Criteria
                            </span>
                          </div>
                          <p className="text-xs font-medium text-primary-color bg-background border border-zinc-200 rounded p-2.5 leading-relaxed">
                            {item.verification_criteria}
                          </p>
                        </div>

                        {/* 2. Implementation Details */}
                        <div className="px-5 py-4 border-b border-zinc-100 bg-zinc-50/50">
                          <div className="flex items-center gap-2 mb-3">
                            <ListTodo className="w-3.5 h-3.5 text-primary-color" />
                            <span className="text-[10px] font-bold text-primary-color uppercase tracking-wider">
                              Implementation Details
                            </span>
                          </div>
                          <ul className="space-y-2">
                            {item.implementation_steps.map((step, i) => (
                              <li
                                key={i}
                                className="flex gap-2 text-xs text-primary-color leading-relaxed"
                              >
                                <div className="mt-1.5 w-1 h-1 rounded-full bg-zinc-300 shrink-0" />
                                <span>
                                  <FormattedText text={step} />
                                </span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        {/* 3. Architecture Diagram */}
                        {item.architecture && (
                          <div className="px-5 py-4 border-b border-zinc-100 bg-background">
                            <div className="flex items-center gap-2 mb-3">
                              <GitMerge className="w-3.5 h-3.5 text-primary-color" />
                              <span className="text-[10px] font-bold text-primary-color uppercase tracking-wider">
                                Slice Architecture
                              </span>
                            </div>
                            <div className="border border-zinc-100 rounded-lg p-4 bg-background overflow-x-auto">
                              <MermaidDiagram chart={item.architecture} />
                            </div>
                          </div>
                        )}

                        {/* 4. AI Reasoning */}
                        {item.reasoning && (
                          <div className="px-5 py-4 border-b border-zinc-100 bg-zinc-50">
                            <div className="flex items-center gap-2 mb-2">
                              <BrainCircuit className="w-3.5 h-3.5 text-primary-color" />
                              <span className="text-[10px] font-bold text-primary-color uppercase tracking-wider">
                                AI Reasoning
                              </span>
                            </div>
                            <ul className="space-y-1.5">
                              {Array.isArray(item.reasoning) ? (
                                item.reasoning.map((reason, i) => (
                                  <li
                                    key={i}
                                    className="text-[11px] text-primary-color flex gap-2 leading-relaxed"
                                  >
                                    <span className="text-primary-color select-none">
                                      •
                                    </span>
                                    {reason}
                                  </li>
                                ))
                              ) : (
                                <li className="text-[11px] text-primary-color leading-relaxed">
                                  {item.reasoning}
                                </li>
                              )}
                            </ul>
                          </div>
                        )}

                        {/* 5. Files Changeset (Grouped by Module) */}
                        {item.files && item.files.length > 0 && (
                          <div className="px-5 py-4 border-b border-zinc-100">
                            <div className="flex items-center gap-2 mb-3">
                              <FileCode className="w-3.5 h-3.5 text-primary-color" />
                              <span className="text-[10px] font-bold text-primary-color uppercase tracking-wider">
                                Specs to Generate
                              </span>
                            </div>
                            <div className="grid grid-cols-1 gap-3">
                              {Object.entries(modules).map(
                                ([modName, files]) => {
                                  const ModIcon = getModuleIcon(modName);
                                  return (
                                    <div
                                      key={modName}
                                      className="bg-zinc-50 rounded-lg p-3 border border-zinc-100/80"
                                    >
                                      <div className="flex items-center gap-2 mb-2">
                                        <ModIcon className="w-3 h-3 text-primary-color" />
                                        <span className="text-[10px] font-bold text-primary-color uppercase tracking-wider">
                                          {modName}
                                        </span>
                                      </div>
                                      <ul className="space-y-1.5">
                                        {files.map((f, i) => (
                                          <li
                                            key={i}
                                            className="flex items-center justify-between text-[10px]"
                                          >
                                            <span
                                              className="font-mono text-primary-color truncate max-w-[200px]"
                                              title={f.path}
                                            >
                                              {f.path.split("/").pop()}
                                            </span>
                                            <span
                                              className={`text-[9px] font-bold px-1 rounded ${
                                                f.type === "create" ||
                                                f.type === "Create"
                                                  ? "text-emerald-600 bg-emerald-50"
                                                  : f.type === "modify" ||
                                                      f.type === "Modify"
                                                    ? "text-amber-600 bg-amber-50"
                                                    : "text-red-600 bg-red-50"
                                              }`}
                                            >
                                              {f.type}
                                            </span>
                                          </li>
                                        ))}
                                      </ul>
                                    </div>
                                  );
                                }
                              )}
                            </div>
                          </div>
                        )}

                        {/* 6. Context Handoff */}
                        {item.context_handoff &&
                          typeof item.context_handoff === "object" && (
                            <div className="px-5 py-4 border-b border-zinc-100">
                              <div className="flex items-center gap-2 mb-2">
                                <Database className="w-3.5 h-3.5 text-primary-color" />
                                <span className="text-[10px] font-bold text-primary-color uppercase tracking-wider">
                                  Planned Context Handoff
                                </span>
                              </div>
                              <div className="grid grid-cols-1 gap-1">
                                {Object.entries(item.context_handoff).map(
                                  ([key, val], i) => (
                                    <div
                                      key={i}
                                      className="flex items-start gap-2 text-[10px]"
                                    >
                                      <span className="font-mono text-primary-color shrink-0 mt-[1px]">
                                        {key}:
                                      </span>
                                      <span className="font-semibold text-primary-color break-all">
                                        {Array.isArray(val)
                                          ? val.join(", ")
                                          : String(val)}
                                      </span>
                                    </div>
                                  )
                                )}
                              </div>
                            </div>
                          )}

                        {/* 7. Start Implementation Button */}
                        <div className="px-5 py-4 bg-zinc-50/50">
                          <Button
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push(
                                `/task/${recipeId}/code?planId=${planId}&itemNumber=${item.item_number}`
                              );
                            }}
                            className="w-full bg-accent-color hover:bg-[#006B66] hover:text-accent-color text-primary-color px-4 py-2 rounded-lg font-medium text-sm transition-colors flex items-center justify-center gap-2"
                          >
                            <Rocket className="w-4 h-4" />
                            Start Implementation for Slice{" "}
                            {String(item.item_number).padStart(2, "0")}
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

          {/* Empty State / Start Prompt */}
          {!isGenerating && !isCompleted && planItems.length === 0 && (
            <div className="pl-16 py-8 opacity-50">
              <div className="border border-dashed border-zinc-300 rounded-xl p-8 flex flex-col items-center justify-center gap-4 text-center">
                <div className="w-12 h-12 bg-zinc-100 rounded-full flex items-center justify-center">
                  <Play className="w-5 h-5 text-primary-color ml-1" />
                </div>
                <div className="max-w-xs">
                  <p className="text-sm font-bold text-primary-color">
                    Ready to Generate
                  </p>
                  <p className="text-xs text-primary-color mt-1">
                    Press start to begin the vertical decomposition process.
                  </p>
                </div>
              </div>
            </div>
          )}

          {FULL_PLAN.slice(0, visibleCount).map((slice, idx) => {
            const isLatest = idx === visibleCount - 1;
            const isExpanded = expandedId === slice.id;
            const status = "generated";
            const modules = groupFilesByModule(slice.files);

            return (
              <div
                key={slice.id}
                ref={(el) => {
                  sliceRefs.current[slice.id] = el;
                }}
                className="group animate-in fade-in slide-in-from-bottom-4 duration-500"
              >
                <div
                  className={`
                    relative bg-background border rounded-xl overflow-hidden transition-all
                    ${isExpanded ? "ring-1 ring-zinc-900 border-zinc-900 shadow-sm" : "border-zinc-200 hover:border-zinc-300"}
                  `}
                >
                  {/* Summary Header */}
                  <div 
                    onClick={() => {
                      const newExpandedId = isExpanded ? null : slice.id;
                      setExpandedId(newExpandedId);
                      if (newExpandedId !== null) {
                        setTimeout(() => {
                          const element = sliceRefs.current[slice.id];
                          if (element) {
                            const yOffset = -24;
                            const y =
                              element.getBoundingClientRect().top +
                              window.scrollY +
                              yOffset;
                            window.scrollTo({ top: y, behavior: "smooth" });
                          }
                        }, 100);
                      }
                    }}
                    className="p-4 flex gap-4 items-start cursor-pointer"
                  >
                    <div className="pt-0.5 shrink-0">
                      <StatusIcon status={status} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-black text-primary-color uppercase tracking-widest">
                          Slice 0{slice.id}
                        </span>
                        <ChevronDown
                          className={`w-4 h-4 text-primary-color transition-transform ${isExpanded ? "rotate-180" : ""}`}
                        />
                      </div>
                      <h3 className="text-sm font-bold text-primary-color truncate">
                        {slice.title}
                      </h3>
                      <p className="text-[11px] text-primary-color mt-1 line-clamp-1">
                        {slice.description}
                      </p>
                    </div>
                  </div>

                  {/* Expanded Detail View */}
                  {isExpanded && (
                    <div className="border-t border-zinc-100 bg-zinc-50/50">
                      {/* 0. Detailed Objective */}
                      <div className="px-5 py-4 border-b border-zinc-100 bg-background">
                        <div className="flex items-center gap-2 mb-2">
                          <AlignLeft className="w-3.5 h-3.5 text-primary-color" />
                          <span className="text-[10px] font-bold text-primary-color uppercase tracking-wider">
                            Objective
                          </span>
                        </div>
                        <p className="text-xs text-primary-color leading-relaxed">
                          {slice.detailed_objective}
                        </p>
                      </div>

                      {/* 1. Success Criteria (Moved Up per request) */}
                      <div className="px-5 py-4 border-b border-zinc-100">
                        <div className="flex items-center gap-2 mb-2">
                          <ShieldCheck className="w-3.5 h-3.5 text-primary-color" />
                          <span className="text-[10px] font-bold text-primary-color uppercase tracking-wider">
                            Success Criteria
                          </span>
                        </div>
                        <p className="text-xs font-medium text-primary-color bg-background border border-zinc-200 rounded p-2.5 leading-relaxed">
                          {slice.verification_criteria}
                        </p>
                      </div>

                      {/* 2. Implementation Details (New) */}
                      <div className="px-5 py-4 border-b border-zinc-100 bg-zinc-50/50">
                        <div className="flex items-center gap-2 mb-3">
                          <ListTodo className="w-3.5 h-3.5 text-primary-color" />
                          <span className="text-[10px] font-bold text-primary-color uppercase tracking-wider">
                            Implementation Details
                          </span>
                        </div>
                        <ul className="space-y-2">
                          {slice.implementation_steps.map((step, i) => (
                            <li
                              key={i}
                              className="flex gap-2 text-xs text-primary-color leading-relaxed"
                            >
                              <div className="mt-1.5 w-1 h-1 rounded-full bg-zinc-300 shrink-0" />
                              <span>
                                <FormattedText text={step} />
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* 3. Architecture Diagram */}
                      <div className="px-5 py-4 border-b border-zinc-100 bg-background">
                        <div className="flex items-center gap-2 mb-3">
                          <GitMerge className="w-3.5 h-3.5 text-primary-color" />
                          <span className="text-[10px] font-bold text-primary-color uppercase tracking-wider">
                            Slice Architecture
                          </span>
                        </div>
                        <div className="border border-zinc-100 rounded-lg p-4 bg-background overflow-x-auto">
                          <MermaidDiagram chart={slice.architecture} />
                        </div>
                      </div>

                      {/* 4. AI Reasoning */}
                      <div className="px-5 py-4 border-b border-zinc-100 bg-zinc-50">
                        <div className="flex items-center gap-2 mb-2">
                          <BrainCircuit className="w-3.5 h-3.5 text-primary-color" />
                          <span className="text-[10px] font-bold text-primary-color uppercase tracking-wider">
                            AI Reasoning
                          </span>
                        </div>
                        <ul className="space-y-1.5">
                          {slice.reasoning.map((item, i) => (
                            <li
                              key={i}
                              className="text-[11px] text-primary-color flex gap-2 leading-relaxed"
                            >
                              <span className="text-primary-color select-none">
                                •
                              </span>
                              {item}
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* 5. Files Changeset (Grouped by Module) */}
                      <div className="px-5 py-4 border-b border-zinc-100">
                        <div className="flex items-center gap-2 mb-3">
                          <FileCode className="w-3.5 h-3.5 text-primary-color" />
                          <span className="text-[10px] font-bold text-primary-color uppercase tracking-wider">
                            Specs to Generate
                          </span>
                        </div>
                        <div className="grid grid-cols-1 gap-3">
                          {Object.entries(modules).map(([modName, files]) => {
                            const ModIcon = getModuleIcon(modName);
                            return (
                              <div
                                key={modName}
                                className="bg-zinc-50 rounded-lg p-3 border border-zinc-100/80"
                              >
                                <div className="flex items-center gap-2 mb-2">
                                  <ModIcon className="w-3 h-3 text-primary-color" />
                                  <span className="text-[10px] font-bold text-primary-color uppercase tracking-wider">
                                    {modName}
                                  </span>
                                </div>
                                <ul className="space-y-1.5">
                                  {files.map((f, i) => (
                                    <li
                                      key={i}
                                      className="flex items-center justify-between text-[10px]"
                                    >
                                      <span
                                        className="font-mono text-primary-color truncate max-w-[200px]"
                                        title={f.path}
                                      >
                                        {f.path.split("/").pop()}
                                      </span>
                                      <span
                                        className={`text-[9px] font-bold px-1 rounded ${
                                          f.type === "Create"
                                            ? "text-emerald-600 bg-emerald-50"
                                            : "text-amber-600 bg-amber-50"
                                        }`}
                                      >
                                        {f.type}
                                      </span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* 6. Context Handoff */}
                      <div className="px-5 py-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Database className="w-3.5 h-3.5 text-primary-color" />
                          <span className="text-[10px] font-bold text-primary-color uppercase tracking-wider">
                            Planned Context Handoff
                          </span>
                        </div>
                        <div className="grid grid-cols-1 gap-1">
                          {Object.entries(slice.context_handoff).map(
                            ([key, val], i) => (
                              <div
                                key={i}
                                className="flex items-start gap-2 text-[10px]"
                              >
                                <span className="font-mono text-primary-color shrink-0 mt-[1px]">
                                  {key}:
                                </span>
                                <span className="font-semibold text-primary-color break-all">
                                  {Array.isArray(val) ? val.join(", ") : val}
                                </span>
                              </div>
                            )
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {/* Loading State */}
          {isGenerating && (
            <div className="animate-in fade-in zoom-in duration-300 flex items-start gap-4 p-1">
              <div className="w-5 h-5 border-2 border-zinc-300 border-t-zinc-900 rounded-full animate-spin shrink-0 bg-background" />
              <div className="space-y-2 w-full">
                <div className="h-4 w-1/3 bg-zinc-100 rounded animate-pulse" />
                <div className="h-20 w-full bg-zinc-50 rounded-xl border border-zinc-100 animate-pulse" />
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Start Coding Button */}
        {isCompleted && planItems.length > 0 && (
          <div className="mt-12 flex justify-end animate-in fade-in slide-in-from-bottom-4 duration-500">
            <Button
              onClick={async () => {
                const firstItem = planItems[0];
                try {
                  await TaskSplittingService.submitTaskSplitting({
                    plan_item_id: firstItem.id,
                  });
                  router.push(
                    `/task/${recipeId}/code?planId=${planId}&itemNumber=${firstItem.item_number}`
                  );
                } catch (error) {
                  toast.error("Failed to start implementation");
                  console.error("Error starting implementation:", error);
                }
              }}
              className="bg-accent-color hover:bg-[#006B66] hover:text-accent-color text-primary-color px-6 py-2 rounded-lg font-medium text-sm transition-colors flex items-center gap-2"
            >
              <Rocket className="w-4 h-4" />
              Start Implementation
            </Button>
          </div>
        )}
      </main>
    </div>
  );
};

export default PlanPage;
