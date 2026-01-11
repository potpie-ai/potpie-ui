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
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

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
    Configuration: [],
  };

  if (!files || files.length === 0) return {};

  files.forEach((file) => {
    const path = file.path.toLowerCase();
    if (path.includes("prisma") || path.includes("db.ts")) {
      modules["Database"].push(file);
    } else if (
      path.includes("utils") ||
      path.includes("lib") ||
      path.includes("types") ||
      path.includes("hooks")
    ) {
      modules["Core Logic"].push(file);
    } else if (path.includes("api") || path.includes("middleware")) {
      modules["API & Middleware"].push(file);
    } else if (
      path.includes("components") ||
      path.includes("app/") ||
      path.includes("tailwind")
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

  const [planId, setPlanId] = useState<string | null>(planIdFromUrl);
  const [planStatus, setPlanStatus] = useState<PlanStatusResponse | null>(null);
  const [planItems, setPlanItems] = useState<PlanItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [visibleCount, setVisibleCount] = useState(0);
  const [repoName, setRepoName] = useState<string>("Repository");
  const [branchName, setBranchName] = useState<string>("Branch");

  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchRecipeDetails = async () => {
      if (!recipeId) return;
      try {
        const recipeDetails = await SpecService.getRecipeDetails(recipeId);
        setRepoName(recipeDetails.repo_name || "Unknown Repository");
        setBranchName(recipeDetails.branch_name || "main");
      } catch (error) {}
    };
    fetchRecipeDetails();
  }, [recipeId]);

  const { data: statusData, isLoading: isLoadingStatus } = useQuery({
    queryKey: ["plan-status", planId, recipeId, specIdFromUrl],
    queryFn: async () => {
      if (planId) return await PlanService.getPlanStatus(planId);
      if (specIdFromUrl) return await PlanService.getPlanStatusBySpecId(specIdFromUrl);
      if (recipeId) return await PlanService.getPlanStatusByRecipeId(recipeId);
      return null;
    },
    enabled: !!(planId || specIdFromUrl || recipeId),
    refetchInterval: (query) => {
      const data = query.state.data;
      return (data?.plan_gen_status === "IN_PROGRESS" || data?.plan_gen_status === "SUBMITTED") ? 2000 : false;
    },
  });

  useEffect(() => {
    if (statusData) {
      setPlanStatus(statusData);
      setIsLoading(false);
      if (statusData.plan_id && !planId) setPlanId(statusData.plan_id);
    }
  }, [statusData, planId]);

  useEffect(() => {
    if ((recipeId || specIdFromUrl) && !planId && !isLoadingStatus && !statusData) {
      PlanService.submitPlanGeneration({
        recipe_id: recipeId || undefined,
        spec_id: specIdFromUrl || undefined,
      }).then((response) => {
        setPlanId(response.plan_id);
        const params = new URLSearchParams(searchParams.toString());
        params.set("planId", response.plan_id);
        router.replace(`/task/${recipeId}/plan?${params.toString()}`);
      });
    }
  }, [recipeId, specIdFromUrl, planId, isLoadingStatus, statusData]);

  useEffect(() => {
    if (planStatus?.plan_gen_status === "COMPLETED" && planId && planItems.length === 0) {
      PlanService.getPlanItems(planId, 0, 50).then(res => setPlanItems(res.plan_items));
    }
  }, [planStatus?.plan_gen_status, planId]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[80vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary-color" />
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

                      <div className="px-5 py-4 border-b border-zinc-100 bg-zinc-50/50">
                        <div className="flex items-center gap-2 mb-2"><ListTodo className="w-3.5 h-3.5" /><span className="text-[10px] font-bold uppercase">Implementation</span></div>
                        <ul className="space-y-2">
                          {item.implementation_steps.map((step, i) => (
                            <li key={i} className="flex gap-2 text-xs text-left">
                              <div className="mt-1.5 w-1 h-1 rounded-full bg-zinc-300 shrink-0" />
                              <FormattedText text={step} />
                            </li>
                          ))}
                        </ul>
                      </div>

                      {item.architecture && (
                        <div className="px-5 py-4 bg-background">
                          <div className="flex items-center gap-2 mb-2"><GitMerge className="w-3.5 h-3.5" /><span className="text-[10px] font-bold uppercase">Architecture</span></div>
                          <div className="border border-zinc-100 rounded-lg p-4 bg-background overflow-x-auto">
                            <MermaidDiagram chart={item.architecture} />
                          </div>
                        </div>
                      )}
                      
                      {/* Files changeset */}
                      {Object.keys(modules).length > 0 && (
                        <div className="px-5 py-4 border-t border-zinc-100">
                           <div className="flex items-center gap-2 mb-3">
                              <FileCode className="w-3.5 h-3.5 text-primary-color" />
                              <span className="text-[10px] font-bold text-primary-color uppercase tracking-wider">Specs to Generate</span>
                            </div>
                            <div className="grid grid-cols-1 gap-3">
                              {Object.entries(modules).map(([modName, files]) => (
                                <div key={modName} className="bg-zinc-50 rounded-lg p-3 border border-zinc-100/80">
                                  <div className="flex items-center gap-2 mb-2">
                                    {React.createElement(getModuleIcon(modName), { className: "w-3 h-3" })}
                                    <span className="text-[10px] font-bold uppercase">{modName}</span>
                                  </div>
                                  <ul className="space-y-1">
                                    {files.map((f, i) => (
                                      <li key={i} className="flex justify-between text-[10px]">
                                        <span className="font-mono truncate">{f.path.split("/").pop()}</span>
                                        <span className="font-bold uppercase text-[9px]">{f.type}</span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              ))}
                            </div>
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