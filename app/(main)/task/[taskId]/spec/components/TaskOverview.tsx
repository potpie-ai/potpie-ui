"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { MermaidDiagram } from "@/components/chat/MermaidDiagram";
import {
  Check,
  Loader2,
  ChevronDown,
  FileCode,
  ShieldCheck,
  Database,
  BrainCircuit,
  GitMerge,
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

interface TaskOverviewProps {
  specId: string;
  recipeId: string;
  planId?: string | null;
}

export const TaskOverview: React.FC<TaskOverviewProps> = ({
  specId,
  recipeId,
  planId: initialPlanId,
}) => {
  const router = useRouter();
  const [planId, setPlanId] = useState<string | null>(initialPlanId || null);
  const [repoName, setRepoName] = useState<string>("Repository");
  const [branchName, setBranchName] = useState<string>("Branch");

  useEffect(() => {
    const fetchRecipeDetails = async () => {
      if (!recipeId) return;
      try {
        const recipeDetails = await SpecService.getRecipeDetails(recipeId);
        setRepoName(recipeDetails.repo_name || "Unknown Repository");
        setBranchName(recipeDetails.branch_name || "main");
      } catch (error) {
        console.error("Error fetching recipe details:", error);
      }
    };
    fetchRecipeDetails();
  }, [recipeId]);

  const { data: statusData, isLoading: isLoadingStatus } = useQuery({
    queryKey: ["plan-status", planId, recipeId, specId],
    queryFn: async () => {
      if (planId) return await PlanService.getPlanStatus(planId);
      if (specId) return await PlanService.getPlanStatusBySpecId(specId);
      if (recipeId) return await PlanService.getPlanStatusByRecipeId(recipeId);
      return null;
    },
    enabled: !!(planId || specId || recipeId),
    refetchInterval: (query) => {
      const data = query.state.data;
      return (data?.plan_gen_status === "IN_PROGRESS" || data?.plan_gen_status === "SUBMITTED") ? 2000 : false;
    },
  });

  // Sync planId from props
  useEffect(() => {
    if (initialPlanId && initialPlanId !== planId) {
      setPlanId(initialPlanId);
    }
  }, [initialPlanId, planId]);

  useEffect(() => {
    if (statusData) {
      if (statusData.plan_id && !planId) {
        setPlanId(statusData.plan_id);
      }
    }
  }, [statusData, planId]);

  // Use React Query for plan items to enable automatic refetching
  const { data: planItemsData, isLoading: isLoadingPlanItems } = useQuery({
    queryKey: ["plan-items", planId],
    queryFn: async () => {
      if (!planId) return null;
      const response = await PlanService.getPlanItems(planId, 0, 50);
      return response.plan_items;
    },
    enabled: !!(planId && statusData?.plan_gen_status === "COMPLETED"),
    refetchInterval: false, // Don't auto-refetch, but allow manual invalidation
  });

  const planItems = planItemsData || [];

  const isGenerating = statusData?.plan_gen_status === "IN_PROGRESS" || statusData?.plan_gen_status === "SUBMITTED";
  const isCompleted = statusData?.plan_gen_status === "COMPLETED";
  const isFailed = statusData?.plan_gen_status === "FAILED";

  const handleStartImplementation = async () => {
    if (!planItems.length || !planId) return;
    
    const firstItem = planItems[0];
    try {
      await TaskSplittingService.submitTaskSplitting({ plan_item_id: firstItem.id });
    } catch (error) {
      console.error("Failed to start implementation, but redirecting anyway");
    } finally {
      router.push(`/task/${recipeId}/code?planId=${planId}&itemNumber=${firstItem.item_number}`);
    }
  };

  if (isLoadingStatus || isLoadingPlanItems) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-primary-color" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-[#D3E5E5] shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-primary-color mb-1">Task Overview</h1>
            <p className="text-sm text-muted-foreground">Execution plan generated step-by-step.</p>
          </div>
          <div className="flex items-center gap-2">
            <HeaderBadge icon={Github}>{repoName}</HeaderBadge>
            <HeaderBadge icon={GitBranch}>{branchName}</HeaderBadge>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="space-y-6 relative max-w-4xl">
          <div className="absolute left-[26px] top-4 bottom-4 w-[1px] bg-zinc-100 -z-10" />

          {isGenerating && (
            <div className="pl-16 py-8">
              <div className="border border-zinc-200 rounded-xl p-8 bg-zinc-50">
                <Loader2 className="w-5 h-5 animate-spin mb-2" />
                <p className="text-sm font-medium">{statusData?.status_message || "Generating..."}</p>
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
                    {statusData?.status_message && (
                      <p className="text-xs text-red-700">{statusData.status_message}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {isCompleted && planItems.length > 0 && (
            <>
              <Accordion type="single" collapsible className="space-y-6">
                {planItems.map((item) => {
                  const modules = groupFilesByModule(item.files);
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

              {/* Start Implementation Button */}
              <div className="mt-8 flex justify-end">
                <Button
                  onClick={handleStartImplementation}
                  className="bg-accent-color hover:bg-[#006B66] text-primary-color px-6 py-2 rounded-lg font-medium text-sm flex items-center gap-2"
                >
                  <Rocket className="w-4 h-4" /> Start Implementation
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
