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
import {
  PlanStatusResponse,
  PlanItem,
  PlanPhase,
  PhasedPlanItem,
  FileReference,
} from "@/lib/types/spec";
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

  const [planId, setPlanId] = useState<string | null>(planIdFromUrl);
  const [planStatus, setPlanStatus] = useState<PlanStatusResponse | null>(null);
  const [planItems, setPlanItems] = useState<PlanItem[]>([]);
  const [phases, setPhases] = useState<PlanPhase[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [visibleCount, setVisibleCount] = useState(0);
  const [repoName, setRepoName] = useState<string>("Repository");
  const [branchName, setBranchName] = useState<string>("Branch");

  const bottomRef = useRef<HTMLDivElement>(null);
  const hasInitializedRef = useRef(false);


  // Fetch recipe details for repo and branch information
  useEffect(() => {
    const fetchRecipeDetails = async () => {
      if (!recipeId) return;
      if (hasInitializedRef.current) return;
      
      try {
        console.log("[Plan Page] Fetching recipe details for:", recipeId);
        const recipeDetails = await SpecService.getRecipeDetails(recipeId);
        setRepoName(recipeDetails.repo_name || "Unknown Repository");
        setBranchName(recipeDetails.branch_name || "main");
        hasInitializedRef.current = true;
      } catch (error) {
        console.error("[Plan Page] Failed to fetch recipe details:", error);
        // Set defaults on error
        setRepoName("Repository");
        setBranchName("main");
        hasInitializedRef.current = true;
      }
    };
    
    fetchRecipeDetails();
  }, [recipeId]);

  // Poll for plan status
  const { data: statusData, isLoading: isLoadingStatus } = useQuery({
    queryKey: ["plan-status", recipeId],
    queryFn: async () => {
      console.log("[Plan Page] Fetching plan status for recipe:", recipeId);
      
      if (!recipeId) {
        throw new Error("Recipe ID is required for plan status");
      }
      
      const result = await PlanService.getPlanStatusByRecipeId(recipeId);
      console.log("[Plan Page] Plan status fetched:", {
        generation_status: result.generation_status,
        has_plan: !!result.plan,
        error: result.error_message,
      });
      return result;
    },
    enabled: !!recipeId,
    refetchInterval: (query) => {
      const data = query.state.data;
      if (!data) {
        console.log("[Plan Page] No data yet, will retry...");
        return 5000;
      }

      const status = data.generation_status;
      console.log("[Plan Page] Polling check - status:", status);

      // Continue polling if status is not completed or failed
      const shouldPoll = status === "processing" || status === "pending" || status === "not_started";

      if (shouldPoll) {
        console.log("[Plan Page] ✓ Continuing to poll (status:", status, ")");
        return 5000; // Poll every 5 seconds
      }

      console.log("[Plan Page] ✗ Stopping poll (status:", status, ")");
      return false; // Stop polling
    },
  });

  // Update plan status when data changes and extract plan items from nested structure
  useEffect(() => {
    if (statusData) {
      console.log("[Plan Page] Plan status received:", statusData);
      setPlanStatus(statusData);
      setIsLoading(false);

      // Store phases and extract plan items from nested phase structure
      if (statusData.generation_status === "completed" && statusData.plan) {
        console.log("[Plan Page] Extracting plan items from", statusData.plan.phases.length, "phases");

        // Store phases for display
        setPhases(statusData.plan.phases);

        // Also create flattened items for backward compatibility
        const flattenedItems: PlanItem[] = [];
        let itemNumber = 1;

        statusData.plan.phases.forEach((phase) => {
          phase.plan_items.forEach((item) => {
            // Convert new API format to legacy format for display
            flattenedItems.push({
              id: item.plan_item_id,
              item_number: itemNumber++,
              order: item.order,
              title: item.title,
              detailed_objective: item.description,
              implementation_steps: [], // Not in new format
              description: item.description,
              verification_criteria: "", // Not in new format
              files: [], // Not in new format
              context_handoff: {},
              reasoning: "", // Not in new format
              architecture: "", // Not in new format
            });
          });
        });

        console.log("[Plan Page] Extracted", flattenedItems.length, "plan items");
        setPlanItems(flattenedItems);
      }
    }
  }, [statusData]);

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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[80vh]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary-color mx-auto mb-3" />
          <p className="text-sm text-primary-color">Loading...</p>
        </div>
      </div>
    );
  }

  const isGenerating = planStatus?.generation_status === "processing" || 
                        planStatus?.generation_status === "pending" || 
                        planStatus?.generation_status === "not_started";
  const isCompleted = planStatus?.generation_status === "completed";
  const isFailed = planStatus?.generation_status === "failed";
  
  // Log current state for debugging
  console.log("[Plan Page] Current state:", {
    generation_status: planStatus?.generation_status,
    isGenerating,
    isCompleted,
    isFailed,
    planItems: planItems.length,
  });

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
                <p className="text-sm font-medium">Generating plan... ({planStatus?.generation_status})</p>
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
                    {planStatus?.error_message && (
                      <p className="text-xs text-red-700">{planStatus.error_message}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {isCompleted && phases.length > 0 && (
            <div className="space-y-8">
              {phases.map((phase, phaseIndex) => (
                <div key={phase.phase_id} className="border border-zinc-200 rounded-xl overflow-hidden bg-background">
                  {/* Phase Header */}
                  <div className="p-4 bg-zinc-50 border-b border-zinc-200">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-black uppercase text-zinc-500">Phase {phaseIndex + 1}</span>
                      {phase.is_final && (
                        <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-green-100 text-green-700">Final</span>
                      )}
                    </div>
                    <h2 className="text-sm font-bold text-primary-color">{phase.name}</h2>
                    <p className="text-xs text-zinc-600 mt-1">{phase.description}</p>
                  </div>

                  {/* Phase Items */}
                  <Accordion type="single" collapsible className="divide-y divide-zinc-100">
                    {phase.plan_items.map((item, itemIndex) => {
                      const itemValue = `phase-${phase.phase_id}-item-${item.plan_item_id}`;

                      return (
                        <AccordionItem
                          key={itemValue}
                          value={itemValue}
                          className="group border-0 transition-all"
                        >
                          <AccordionTrigger className="px-5 py-4 flex gap-4 items-start hover:no-underline [&>svg]:hidden w-full hover:bg-zinc-50/50">
                            <div className="pt-0.5 shrink-0"><StatusIcon status="generated" /></div>
                            <div className="flex-1 min-w-0 text-left">
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-[10px] font-black uppercase text-zinc-500">Step {item.order}</span>
                                <ChevronDown className="w-4 h-4 transition-transform group-data-[state=open]:rotate-180 text-zinc-400" />
                              </div>
                              <h3 className="text-sm font-bold truncate text-primary-color">{item.title}</h3>
                              {item.estimated_effort && (
                                <span className="inline-block mt-1 text-[9px] font-medium px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-600">
                                  Effort: {item.estimated_effort}
                                </span>
                              )}
                            </div>
                          </AccordionTrigger>

                          <AccordionContent className="border-t border-zinc-100 bg-zinc-50/30 pt-0">
                            {/* Description */}
                            <div className="px-5 py-4 border-b border-zinc-100 bg-background">
                              <div className="flex items-center gap-2 mb-2">
                                <AlignLeft className="w-3.5 h-3.5 text-zinc-500" />
                                <span className="text-[10px] font-bold uppercase text-zinc-600">Description</span>
                              </div>
                              <p className="text-xs text-zinc-700 leading-relaxed">{item.description}</p>
                            </div>

                            {/* Detailed Description - if available */}
                            {(item as any).detailed_description && (
                              <div className="px-5 py-4 border-b border-zinc-100 bg-zinc-50/50">
                                <div className="flex items-center gap-2 mb-2">
                                  <FileText className="w-3.5 h-3.5 text-zinc-500" />
                                  <span className="text-[10px] font-bold uppercase text-zinc-600">Detailed Description</span>
                                </div>
                                <div className="text-xs text-zinc-700 leading-relaxed whitespace-pre-wrap">
                                  {(item as any).detailed_description}
                                </div>
                              </div>
                            )}

                            {/* Dependencies */}
                            {item.dependencies && item.dependencies.length > 0 && (
                              <div className="px-5 py-3 border-b border-zinc-100 bg-background">
                                <div className="flex items-center gap-2 mb-2">
                                  <GitMerge className="w-3.5 h-3.5 text-zinc-500" />
                                  <span className="text-[10px] font-bold uppercase text-zinc-600">Dependencies</span>
                                </div>
                                <div className="flex flex-wrap gap-1.5">
                                  {item.dependencies.map((dep, i) => (
                                    <span key={i} className="text-[9px] font-medium px-2 py-0.5 rounded bg-zinc-100 text-zinc-600">
                                      {dep}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* File Changes */}
                            {(item as any).file_changes && (item as any).file_changes.length > 0 && (
                              <div className="px-5 py-4 border-b border-zinc-100 bg-zinc-50/50">
                                <div className="flex items-center gap-2 mb-3">
                                  <FileCode className="w-3.5 h-3.5 text-zinc-500" />
                                  <span className="text-[10px] font-bold uppercase text-zinc-600">File Changes</span>
                                  <span className="text-[9px] text-zinc-400">({(item as any).file_changes.length} files)</span>
                                </div>
                                <div className="bg-zinc-50 rounded-lg p-3 border border-zinc-100">
                                  <ul className="space-y-1.5">
                                    {(item as any).file_changes.map((f: any, i: number) => (
                                      <li key={i} className="flex justify-between items-center text-[10px] gap-2">
                                        <span className="font-mono truncate text-zinc-600" title={f.path}>{f.path}</span>
                                        <span className={`font-bold uppercase text-[9px] px-1.5 py-0.5 rounded ${
                                          f.action?.toLowerCase() === 'create' ? 'bg-emerald-50 text-emerald-600' :
                                          f.action?.toLowerCase() === 'modify' ? 'bg-amber-50 text-amber-600' :
                                          f.action?.toLowerCase() === 'delete' ? 'bg-red-50 text-red-600' :
                                          'bg-zinc-100 text-zinc-600'
                                        }`}>{f.action}</span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              </div>
                            )}

                            {/* Verification Criteria */}
                            {(item as any).verification_criteria && (item as any).verification_criteria.length > 0 && (
                              <div className="px-5 py-4 bg-background">
                                <div className="flex items-center gap-2 mb-2">
                                  <ShieldCheck className="w-3.5 h-3.5 text-zinc-500" />
                                  <span className="text-[10px] font-bold uppercase text-zinc-600">Verification Criteria</span>
                                </div>
                                <ul className="space-y-1.5">
                                  {(item as any).verification_criteria.map((criteria: string, i: number) => (
                                    <li key={i} className="flex gap-2 text-xs text-left">
                                      <div className="mt-1.5 w-1 h-1 rounded-full bg-green-400 shrink-0" />
                                      <span className="text-zinc-700">{criteria}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </AccordionContent>
                        </AccordionItem>
                      );
                    })}
                  </Accordion>
                </div>
              ))}
            </div>
          )}

          {/* Static Fallback (for demo/loading) */}
          {visibleCount > 0 && (
            <Accordion type="single" collapsible className="space-y-6" defaultValue="static-slice-1">
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