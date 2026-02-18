"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  Github,
  GitBranch,
  Check,
  Loader2,
  ChevronDown,
  X,
  FileCode,
  Zap,
  Layers,
  FileText,
  Package,
  Link2,
  Info,
  Send,
  Bot,
  SendHorizonal,
  RefreshCcw,
  RotateCcw,
  RotateCw,
  Wrench,
} from "lucide-react";
import SpecService from "@/services/SpecService";
import PlanService from "@/services/PlanService";
import { toast } from "@/components/ui/sonner";
import { useNavigationProgress } from "@/contexts/NavigationProgressContext";
import {
  SpecPlanStatusResponse,
  SpecStatusResponse,
  SpecOutput,
  SpecificationOutput,
} from "@/lib/types/spec";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "@/lib/state/store";
import { setRepoAndBranchForTask } from "@/lib/state/Reducers/RepoAndBranch";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { SharedMarkdown } from "@/components/chat/SharedMarkdown";
import { normalizeMarkdownForPreview } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipPortal,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import Image from "next/image";

interface FileItem {
  path: string;
  type: string;
}

interface PlanItem {
  id: string;
  title: string;
  details?: string;
  files: FileItem[];
  /** Library/package names (npm, pip, etc.) — only from explicit API field e.g. libraries */
  dependencies?: string[];
  /** Requirement IDs this item depends on (e.g. FR-001) — from API "dependencies" in functional_requirements */
  requirementDependencies?: string[];
  /** External services/APIs — from API external_dependencies */
  externalConnections?: string[];
  context?: string;
  [key: string]: any;
}

interface Plan {
  add: PlanItem[];
  modify: PlanItem[];
  fix: PlanItem[];
  [key: string]: PlanItem[];
}

/** Normalize one item from workflows API (add/modify/fix) to PlanItem shape. Libraries from libraries/packages/dependencies; requirement IDs from requirement_dependencies. */
function normalizePlanItem(item: any, idx: number, prefix: string): PlanItem {
  const id = item?.id ?? item?.item_id ?? `${prefix}-${idx}`;
  const title = item?.title ?? item?.name ?? item?.description ?? `Item ${idx + 1}`;
  const details = item?.details ?? item?.detailed_objective ?? item?.description ?? item?.context ?? "";
  const files = Array.isArray(item?.files) ? item.files : Array.isArray(item?.target_files) ? item.target_files : [];
  const rawLibs = Array.isArray(item?.libraries) ? item.libraries : Array.isArray(item?.packages) ? item.packages : Array.isArray(item?.dependencies) ? item.dependencies : [];
  const rawReqDeps = Array.isArray(item?.requirement_dependencies) ? item.requirement_dependencies : [];
  const rawConns = Array.isArray(item?.externalConnections) ? item.externalConnections : Array.isArray(item?.external_connections) ? item.external_connections : Array.isArray(item?.external_dependencies) ? item.external_dependencies : [];
  const dependencies = rawLibs.map((d: any) => typeof d === "string" ? d : (d && typeof d === "object" && "name" in d ? String(d.name) : String(d)));
  const requirementDependencies = rawReqDeps
    .map((d: any) => typeof d === "string" ? d : (d?.id ?? d?.name ?? String(d)))
    .filter((depId: string) => depId && String(depId).trim() !== "" && String(depId) !== String(id));
  const externalConnections = rawConns.map((c: any) => typeof c === "string" ? c : (c && typeof c === "object" && "name" in c ? String(c.name) : String(c)));
  const context = item?.context ?? "";
  return {
    id: String(id),
    title: String(title),
    details: typeof details === "string" ? details : typeof details === "object" ? JSON.stringify(details) : "",
    files: files.map((f: any) => ({ path: f?.path ?? f?.file_path ?? String(f), type: f?.type ?? "modify" })),
    dependencies,
    requirementDependencies: requirementDependencies.length > 0 ? requirementDependencies : undefined,
    externalConnections,
    context: typeof context === "string" ? context : "",
  };
}

/** Convert SpecificationOutput (functional_requirements) into Plan. API: dependencies = requirement IDs; external_dependencies = external services; file_impact = files; libraries/packages = lib names. */
function specOutputToPlan(raw: SpecificationOutput): Plan {
  const addItems: PlanItem[] = [];
  const fr = raw.functional_requirements;
  if (Array.isArray(fr) && fr.length) {
    fr.forEach((item: any, i: number) => {
      const id = item?.id ?? item?.title ?? `fr-${i}`;
      const title = item?.title ?? item?.id ?? `Requirement ${i + 1}`;
      const desc = item?.description ?? item?.details ?? "";
      const fileImpact = item?.file_impact ?? item?.file_impact_summary ?? item?.files;
      const files = Array.isArray(fileImpact)
        ? fileImpact.map((f: any) => ({ path: f?.path ?? f?.file_path ?? String(f), type: (f?.type ?? "modify") === "create" ? "Create" : "modify" }))
        : typeof fileImpact === "string" ? [{ path: fileImpact, type: "modify" as string }] : [];
      // API "dependencies" = IDs of *other* requirements this one depends on (exclude self)
      const rawDeps = Array.isArray(item?.dependencies) ? item.dependencies : [];
      const selfId = item?.id ?? item?.title ?? `fr-${i}`;
      const requirementDeps = rawDeps
        .map((d: any) => typeof d === "string" ? d : (d?.id ?? d?.name ?? String(d)))
        .filter((depId: string) => depId && String(depId).trim() !== "" && String(depId) !== String(selfId));
      // Library/package names only from explicit fields
      const rawLibs = Array.isArray(item?.libraries) ? item.libraries : Array.isArray(item?.packages) ? item.packages : [];
      const libraries = rawLibs.map((d: any) => typeof d === "string" ? d : (d?.name != null ? String(d.name) : String(d)));
      const rawExt = Array.isArray(item?.external_dependencies) ? item.external_dependencies : [];
      const extStrings = rawExt.map((e: any) => typeof e === "string" ? e : (e?.name != null ? String(e.name) : String(e)));
      addItems.push({
        id: String(id),
        title: String(title),
        details: typeof desc === "string" ? desc : JSON.stringify(desc ?? ""),
        files,
        dependencies: libraries,
        requirementDependencies: requirementDeps,
        externalConnections: extStrings,
        context: item?.acceptance_criteria ? (Array.isArray(item.acceptance_criteria) ? item.acceptance_criteria.join("\n") : String(item.acceptance_criteria)) : "",
      });
    });
  }
  if (addItems.length === 0 && (raw.tl_dr || raw.success_metrics?.length)) {
    addItems.push({
      id: "spec-summary",
      title: "Specification summary",
      details: [raw.tl_dr, raw.success_metrics ? raw.success_metrics.join("\n") : ""].filter(Boolean).join("\n\n"),
      files: [],
      dependencies: [],
      externalConnections: [],
      context: "",
    });
  }
  return {
    add: addItems,
    modify: [],
    fix: [],
  };
}

/** Normalize spec from GET /api/v1/recipes/{id}/spec response (potpie-workflows). Always returns plan in second-image format (Create/Update/Fix tabs). */
function normalizeSpecFromProgress(progress: any): { plan: Plan | null; rawSpec: SpecificationOutput | null } {
  if (!progress || typeof progress !== "object") return { plan: null, rawSpec: null };
  let raw = progress.spec_output ?? progress.specification ?? progress.output ?? progress.spec;
  if (!raw || typeof raw !== "object") return { plan: null, rawSpec: null };
  if (raw.output && typeof raw.output === "object") raw = raw.output;
  if (raw.spec && typeof raw.spec === "object") raw = raw.spec;

  const addRaw = Array.isArray(raw.add) ? raw.add : Array.isArray((raw as any).Add) ? (raw as any).Add : [];
  const modifyRaw = Array.isArray(raw.modify) ? raw.modify : Array.isArray((raw as any).Modify) ? (raw as any).Modify : [];
  const fixRaw = Array.isArray(raw.fix) ? raw.fix : Array.isArray((raw as any).Fix) ? (raw as any).Fix : [];

  if (addRaw.length || modifyRaw.length || fixRaw.length) {
    const plan: Plan = {
      add: addRaw.map((item: any, i: number) => normalizePlanItem(item, i, "add")),
      modify: modifyRaw.map((item: any, i: number) => normalizePlanItem(item, i, "modify")),
      fix: fixRaw.map((item: any, i: number) => normalizePlanItem(item, i, "fix")),
    };
    return { plan, rawSpec: null };
  }

  const spec = raw as SpecificationOutput;
  const planFromSpec = specOutputToPlan(spec);
  if (planFromSpec.add.length || planFromSpec.modify.length || planFromSpec.fix.length) {
    return { plan: planFromSpec, rawSpec: null };
  }
  return { plan: null, rawSpec: spec };
}

/** Renders one functional requirement per API: id, title, description, acceptance_criteria, priority, dependencies (requirement IDs), guardrails, implementation_recommendations, external_dependencies. No file_impact/target files. */
function FunctionalRequirementCard({ fr }: { fr: any }) {
  const id = fr?.id ?? "";
  const title = fr?.title ?? "Requirement";
  const description = fr?.description ?? "";
  const acceptanceCriteria = Array.isArray(fr?.acceptance_criteria) ? fr.acceptance_criteria : [];
  const priority = fr?.priority;
  // API: dependencies = IDs of *other* requirements this one depends on (exclude this requirement's own id)
  const rawDeps = Array.isArray(fr?.dependencies) ? fr.dependencies : [];
  const requirementDeps = rawDeps
    .map((d: any) => typeof d === "string" ? d : (d?.id ?? d?.name ?? String(d)))
    .filter((depId: string) => depId && String(depId).trim() !== "" && String(depId) !== String(id));
  const guardrails = Array.isArray(fr?.guardrails) ? fr.guardrails : [];
  const implRecs = Array.isArray(fr?.implementation_recommendations) ? fr.implementation_recommendations : [];
  const externalDeps = Array.isArray(fr?.external_dependencies) ? fr.external_dependencies : [];
  const extStrings = externalDeps.map((e: any) => typeof e === "string" ? e : (e?.name != null ? String(e.name) : String(e)));
  const appendix = fr?.appendix != null && typeof fr.appendix === "object" ? fr.appendix : null;
  return (
    <div className="rounded-lg border border-[#D3E5E5] bg-zinc-50/50 p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <span className="text-xs font-mono text-primary-color">{id}</span>
        {priority && <span className="text-xs font-medium text-zinc-600 capitalize">{priority}</span>}
      </div>
      <h4 className="text-sm font-semibold text-foreground">{title}</h4>
      {description && <SharedMarkdown content={description} className="text-sm text-muted-foreground [&_p]:my-0" />}
      {acceptanceCriteria.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-primary-color uppercase tracking-wide mb-1">Acceptance criteria</p>
          <ul className="list-disc pl-4 space-y-0.5 text-sm text-muted-foreground">
            {acceptanceCriteria.map((c: any, i: number) => (
              <li key={i}>{typeof c === "string" ? c : (c?.text ?? JSON.stringify(c))}</li>
            ))}
          </ul>
        </div>
      )}
      {requirementDeps.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-primary-color uppercase tracking-wide mb-1">Depends on</p>
          <div className="flex flex-wrap gap-1.5">
            {requirementDeps.map((reqId: string, i: number) => (
              <span key={i} className="px-2 py-0.5 bg-zinc-100 border border-[#D3E5E5] rounded text-xs font-mono text-primary-color">
                {reqId}
              </span>
            ))}
          </div>
        </div>
      )}
      {guardrails.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-primary-color uppercase tracking-wide mb-1">Guardrails</p>
          <ul className="list-disc pl-4 space-y-0.5 text-sm text-muted-foreground">
            {guardrails.map((g: any, i: number) => (
              <li key={i}>{typeof g === "string" ? g : (g?.text ?? JSON.stringify(g))}</li>
            ))}
          </ul>
        </div>
      )}
      {implRecs.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-primary-color uppercase tracking-wide mb-1">Implementation recommendations</p>
          <ul className="list-disc pl-4 space-y-0.5 text-sm text-muted-foreground">
            {implRecs.map((r: any, i: number) => (
              <li key={i}>{typeof r === "string" ? r : (r?.text ?? JSON.stringify(r))}</li>
            ))}
          </ul>
        </div>
      )}
      {extStrings.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-primary-color uppercase tracking-wide mb-1">External dependencies</p>
          <div className="flex flex-wrap gap-1.5">
            {extStrings.map((ext: string, i: number) => (
              <span key={i} className="px-2 py-0.5 bg-blue-50 border border-blue-200 rounded text-xs text-blue-600">
                {ext}
              </span>
            ))}
          </div>
        </div>
      )}
      {appendix && Object.keys(appendix).length > 0 && (
        <div>
          <p className="text-xs font-semibold text-primary-color uppercase tracking-wide mb-1">Appendix</p>
          <pre className="text-xs text-muted-foreground bg-white border border-[#D3E5E5] rounded p-3 overflow-x-auto">
            {JSON.stringify(appendix, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}

const SPEC_KNOWN_KEYS = [
  "tl_dr", "functional_requirements", "non_functional_requirements", "architectural_decisions",
  "success_metrics", "data_models", "context", "add", "modify", "fix", "interfaces", "external_dependencies_summary",
];

/** Renders specification.context with API sub-fields: original_request, janus_analysis, qa_answers, research_findings */
function SpecContextBlock({ context }: { context: Record<string, any> }) {
  const items: { label: string; value: string }[] = [];
  if (context.original_request) items.push({ label: "Original request", value: String(context.original_request) });
  if (context.janus_analysis) items.push({ label: "Janus analysis", value: String(context.janus_analysis) });
  if (context.qa_answers) items.push({ label: "Q&A answers", value: String(context.qa_answers) });
  if (context.research_findings) items.push({ label: "Research findings", value: String(context.research_findings) });
  const rest = Object.entries(context).filter(([k]) => !["original_request", "janus_analysis", "qa_answers", "research_findings"].includes(k));
  rest.forEach(([k, v]) => {
    if (v != null && v !== "") items.push({ label: k.replace(/_/g, " "), value: typeof v === "string" ? v : JSON.stringify(v, null, 2) });
  });
  if (items.length === 0) return null;
  return (
    <div className="space-y-3">
      {items.map(({ label, value }, i) => (
        <div key={i}>
          <p className="text-xs font-semibold text-primary-color uppercase tracking-wide mb-1">{label}</p>
          <SharedMarkdown content={value} className="text-sm text-muted-foreground [&_p]:my-0 rounded-md border border-[#D3E5E5] bg-zinc-50/50 p-3" />
        </div>
      ))}
    </div>
  );
}

/** Fallback view when API returns SpecificationOutput (GET /api/v1/recipes/{id}/spec). Section order and labels match API. */
function SpecFallbackView({ spec }: { spec: SpecificationOutput }) {
  const sections: { title: string; content: any; structured?: boolean; context?: boolean }[] = [];
  if (spec.tl_dr) sections.push({ title: "Executive summary", content: spec.tl_dr });
  if (spec.context && typeof spec.context === "object" && Object.keys(spec.context).length) {
    sections.push({ title: "Context", content: spec.context, context: true });
  }
  if (spec.success_metrics?.length) sections.push({ title: "Success metrics", content: spec.success_metrics });
  if (spec.functional_requirements?.length) sections.push({ title: "Functional requirements", content: spec.functional_requirements, structured: true });
  if (spec.non_functional_requirements?.length) sections.push({ title: "Non-functional requirements", content: spec.non_functional_requirements });
  if (spec.architectural_decisions?.length) sections.push({ title: "Architectural decisions", content: spec.architectural_decisions });
  if (spec.data_models?.length) sections.push({ title: "Data models", content: spec.data_models });
  if (spec.interfaces?.length) sections.push({ title: "Interfaces", content: spec.interfaces });
  if (spec.external_dependencies_summary?.length) sections.push({ title: "External dependencies summary", content: spec.external_dependencies_summary });
  const rest = Object.entries(spec).filter(([k]) => !SPEC_KNOWN_KEYS.includes(k) && typeof spec[k] !== "undefined" && spec[k] !== null);
  rest.forEach(([key, value]) => {
    if (Array.isArray(value) && value.length) sections.push({ title: key.replace(/_/g, " "), content: value });
    else if (typeof value === "string" && value) sections.push({ title: key.replace(/_/g, " "), content: value });
  });

  if (sections.length === 0) return <p className="text-sm text-zinc-500">Specification generated. No structured sections to display.</p>;

  return (
    <div className="space-y-6">
      {sections.map(({ title, content, structured, context: isContext }, i) => (
        <div key={i} className="space-y-2">
          <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">{title}</h3>
          {isContext && typeof content === "object" && content !== null ? (
            <SpecContextBlock context={content} />
          ) : structured && Array.isArray(content) && content.every((x: any) => x && typeof x === "object") ? (
            <div className="space-y-3">
              {content.map((item: any, j: number) => <FunctionalRequirementCard key={j} fr={item} />)}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground leading-relaxed rounded-md border border-[#D3E5E5] bg-zinc-50/50 p-4">
              {Array.isArray(content) ? (
                <ul className="list-disc pl-4 space-y-1">
                  {content.map((item: any, j: number) => (
                    <li key={j}>
                      {typeof item === "string" ? <SharedMarkdown content={item} className="[&_p]:my-0" /> : <SharedMarkdown content={JSON.stringify(item)} className="[&_p]:my-0" />}
                    </li>
                  ))}
                </ul>
              ) : (
                <SharedMarkdown content={String(content)} className="[&_p]:my-0 [&_p]:text-muted-foreground" />
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

const Badge = ({ children, icon: Icon }: { children: React.ReactNode; icon?: React.ComponentType<{ className?: string }> }) => (
  <div className="flex items-center gap-1.5 px-2 py-0.5 border border-[#D3E5E5] rounded text-xs font-medium text-primary-color">
    {Icon && <Icon className="w-3.5 h-3.5" />}
    {children}
  </div>
);

const PlanTabs = ({ plan }: { plan: Plan }) => {
  const categories: { id: keyof Plan; label: string; items: Plan["add"] }[] = [
    { id: "add", label: "Create", items: plan.add },
    { id: "modify", label: "Update", items: plan.modify },
    { id: "fix", label: "Fix", items: plan.fix },
  ];

  return (
    <div className="space-y-10">
      {categories.map((cat) => {
        if (cat.items.length === 0) return null;
        const defaultOpenValues = cat.items.map((item) => item.id);
        return (
          <div key={cat.id} className="space-y-4">
            <h3 className="text-sm font-semibold text-primary-color border-b border-[#D3E5E5] pb-2">
              {cat.label} ({cat.items.length})
            </h3>
            <Accordion
              type="multiple"
              defaultValue={defaultOpenValues}
              className="space-y-4"
            >
              {cat.items.map((item) => (
          <AccordionItem
            key={item.id}
            value={item.id}
            className="bg-background border border-[#D3E5E5] transition-all rounded-lg overflow-hidden data-[state=open]:border-[#D3E5E5] data-[state=open]:shadow-sm border-[#D3E5E5] hover:border-[#D3E5E5]"
          >
            <AccordionTrigger className="p-4 flex justify-between items-start cursor-pointer select-none hover:no-underline [&>svg]:hidden [&[data-state=open] svg:last-child]:rotate-180">
              <div className="flex gap-3 flex-1 min-w-0">
                <FileCode className="w-4 h-4 mt-1 flex-shrink-0 text-primary-color" />
                <div className="flex flex-col gap-2 flex-1 min-w-0">
                <div className="flex items-center gap-3 flex-wrap">
                    <h4 className="text-sm font-semibold text-foreground font-sans leading-snug">
                      {item.title}
                    </h4>

                  </div>
                  <div className="text-sm text-muted-foreground leading-relaxed font-sans text-left [&_p]:my-2 [&_p]:leading-relaxed [&_p]:text-left [&_p]:text-muted-foreground">
                    <SharedMarkdown content={item.details ?? ""} className="text-muted-foreground [&_p]:text-muted-foreground [&_*]:text-left" />
                  </div>
                </div>
              </div>
              <div className="flex-shrink-0 mt-1 ml-2">
                <ChevronDown className="w-4 h-4 text-primary-color transition-transform duration-200" />
              </div>
            </AccordionTrigger>

            <AccordionContent className="px-5 pb-6 pt-5 space-y-6 border-t border-[#D3E5E5] font-sans">
              {/* Depends on (requirement IDs), Libraries, External dependencies — no Target Files per API */}
              {((item.requirementDependencies?.length ?? 0) > 0 || (item.dependencies?.length ?? 0) > 0 || (item.externalConnections?.length ?? 0) > 0) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                  {/* Depends on (requirement IDs from API "dependencies") */}
                  {(item.requirementDependencies?.length ?? 0) > 0 && (
                    <div className="space-y-3">
                      <p className="text-xs font-semibold text-primary-color uppercase tracking-wide flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5" />
                        Depends on
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {item.requirementDependencies?.map((reqId, i) => (
                          <span
                            key={i}
                            className="px-3 py-1.5 bg-zinc-50 border border-[#D3E5E5] rounded-md text-xs font-mono text-primary-color"
                          >
                            {typeof reqId === "string" ? reqId : String(reqId)}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {/* Libraries (packages / npm / pip — only when API sends libraries/packages) */}
                  {(item.dependencies?.length ?? 0) > 0 && (
                    <div className="space-y-3">
                      <p className="text-xs font-semibold text-primary-color uppercase tracking-wide flex items-center gap-1.5">
                        <Package className="w-3.5 h-3.5" />
                        Libraries
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {item.dependencies?.map((dep, i) => (
                          <span
                            key={i}
                            className="px-3 py-1.5 bg-zinc-50 border border-[#D3E5E5] rounded-md text-xs font-mono text-primary-color"
                          >
                            {typeof dep === "string" ? dep : (dep && typeof dep === "object" && "name" in dep ? String((dep as { name?: string }).name) : String(dep))}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {/* External dependencies (third-party services, libraries, APIs — from API external_dependencies) */}
                  {(item.externalConnections?.length ?? 0) > 0 && (
                    <div className="space-y-3">
                      <p className="text-xs font-semibold text-primary-color uppercase tracking-wide flex items-center gap-1.5">
                        <Link2 className="w-3.5 h-3.5" />
                        External dependencies
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {item.externalConnections?.map((conn, i) => (
                          <span
                            key={i}
                            className="px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-md text-xs font-medium text-blue-600"
                          >
                            {typeof conn === "string" ? conn : (conn && typeof conn === "object" && "name" in conn ? String((conn as { name?: string }).name) : String(conn))}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Context */}
              {item.context && (
                <div className="space-y-3">
                  <p className="text-xs font-semibold mt-4 text-primary-color uppercase tracking-wide flex items-center gap-1.5">
                    <Info className="w-3.5 h-3.5" />
                    Context
                  </p>
                  <div className="bg-zinc-50 border border-[#D3E5E5] rounded-md p-4">
                    <div className="text-sm text-muted-foreground leading-relaxed">
                      <SharedMarkdown content={item.context} className="text-muted-foreground [&_p]:text-muted-foreground [&_*]:text-left [&_p]:mb-2 [&_p:last-child]:mb-0" />
                    </div>
                  </div>
                </div>
              )}
            </AccordionContent>
          </AccordionItem>
              ))}
            </Accordion>
          </div>
        );
      })}
    </div>
  );
};

const SpecPage = () => {
  const params = useParams();
  const router = useRouter();
  const { startNavigation } = useNavigationProgress();
  const dispatch = useDispatch<AppDispatch>();
  // Note: taskId in URL is actually recipeId now
  const recipeId = params?.taskId as string;
  const repoBranchByTask = useSelector(
    (state: RootState) => state.RepoAndBranch.byTaskId
  );
  const storedRepoContext = recipeId
    ? repoBranchByTask?.[recipeId]
    : undefined;
  
  // Reset initialization ref when recipeId changes
  useEffect(() => {
    hasInitializedRef.current = false;
  }, [recipeId]);

  const [recipeData, setRecipeData] = useState<{
    recipe_id: string;
    project_id: string;
    user_prompt: string;
  } | null>(null);

  const [projectData, setProjectData] = useState<{
    repo: string;
    branch: string;
    questions: Array<{ id: string; question: string }>;
  } | null>(null);

  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [specProgress, setSpecProgress] = useState<SpecPlanStatusResponse | SpecStatusResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPlanExpanded, setIsPlanExpanded] = useState(true);
  const [isCancelled, setIsCancelled] = useState(false);
  const [isRegeneratingSpec, setIsRegeneratingSpec] = useState(false);
  const [regenerateSpecKey, setRegenerateSpecKey] = useState(0);
  /** Live streaming progress when using spec generate-stream (step + message). */
  const [streamProgress, setStreamProgress] = useState<{ step: string; message: string } | null>(null);
  /** Accumulated streaming text (chunk events) from workflows backend. */
  const [streamChunks, setStreamChunks] = useState("");
  /** Recent stream events (tool_call_start/end, subagent_start/end) for left-pane activity. */
  const [streamEvents, setStreamEvents] = useState<{ id: string; type: string; label: string }[]>([]);
  /** Output segments: one per tool_call_end (content streamed since previous tool end). */
  const [streamSegments, setStreamSegments] = useState<{ id: string; label: string; content: string }[]>([]);
  const streamAbortRef = useRef<AbortController | null>(null);
  const streamEventIdRef = useRef(0);
  const streamChunksRef = useRef("");
  const streamOutputEndRef = useRef<HTMLDivElement>(null);
  const streamChunkBoxRef = useRef<HTMLDivElement>(null);
  const searchParams = useSearchParams();
  const runIdFromUrl = searchParams.get("run_id");

  // Chat UI state (first message = new chat input; wired to spec chat API)
  type ChatMessage = { role: "user" | "assistant"; content: string };
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const planContentRef = useRef<HTMLDivElement | null>(null);
  const hasInitializedRef = useRef(false);
  const hasSpecPollStartedRef = useRef(false);
  const hasChatInitializedRef = useRef(false);
  const hasAppliedRunIdFromApiRef = useRef(false);
  const hasRestoredThinkingRef = useRef<string | null>(null);
  const THINKING_STORAGE_KEY = "potpie_thinking_spec";

  // If backend includes run_id in GET spec response, attach to stream by adding run_id to URL (once)
  useEffect(() => {
    if (!recipeId || runIdFromUrl || hasAppliedRunIdFromApiRef.current || !specProgress) return;
    // Only SpecStatusResponse has run_id; check if it exists
    const runIdFromApi = "run_id" in specProgress ? specProgress.run_id : undefined;
    if (typeof runIdFromApi === "string" && runIdFromApi.trim()) {
      hasAppliedRunIdFromApiRef.current = true;
      router.replace(`/task/${recipeId}/spec?run_id=${encodeURIComponent(runIdFromApi.trim())}`, { scroll: false });
    }
  }, [recipeId, runIdFromUrl, specProgress, router]);

  // Interleave: for each tool show start + end together (Running → Completed), then its output box (backend sends call_id on both start/end to pair them)
  type StreamBlock =
    | { key: string; kind: "event"; event: (typeof streamEvents)[0] }
    | { key: string; kind: "segment"; segment: (typeof streamSegments)[0] };
  const mergedStreamBlocks = useMemo((): StreamBlock[] => {
    const blocks: StreamBlock[] = [];
    for (const ev of streamEvents) {
      blocks.push({ key: ev.id, kind: "event", event: ev });
      if (ev.type === "tool_end") {
        const seg = streamSegments.find((s) => s.id === `seg-${ev.id}`);
        if (seg) blocks.push({ key: seg.id, kind: "segment", segment: seg });
      }
    }
    return blocks;
  }, [streamEvents, streamSegments]);

  // Auto-scroll tool output to bottom when new events/segments/chunks arrive
  useEffect(() => {
    if (mergedStreamBlocks.length > 0 || streamChunks) {
      streamOutputEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [mergedStreamBlocks.length, streamChunks]);

  // Auto-scroll inside the live chunk box when content grows
  useEffect(() => {
    if (streamChunks && streamChunkBoxRef.current) {
      streamChunkBoxRef.current.scrollTo({ top: streamChunkBoxRef.current.scrollHeight, behavior: "smooth" });
    }
  }, [streamChunks]);

  // Initialize chat with user prompt (from new chat page) and assistant response
  useEffect(() => {
    if (!recipeData?.user_prompt || hasChatInitializedRef.current) return;
    hasChatInitializedRef.current = true;
    setChatMessages([
      { role: "user", content: recipeData.user_prompt },
      {
        role: "assistant",
        content:
          "Turning your idea into a structured specification. Your goals and requirements will appear in the panel on the right—once they&apos;re ready, we can refine them together.",
      },
    ]);
  }, [recipeData?.user_prompt]);

  // Send spec chat message via Spec Editor Agent (POST /{recipe_id}/edit?edit_type=spec)
  const handleSendChatMessage = async () => {
    const text = chatInput.trim();
    if (!text || !recipeId || chatLoading) return;
    setChatMessages((prev) => [...prev, { role: "user", content: text }]);
    setChatInput("");
    setChatLoading(true);
    try {
      const res = await SpecService.specChat(recipeId, { message: text });
      const assistantContent = res.explanation || res.message || "Done.";
      setChatMessages((prev) => [...prev, { role: "assistant", content: assistantContent }]);
      // Update right pane when spec_output changed
      if (res.spec_output) {
        setSpecProgress((prev: any) => ({
          ...(prev || {}),
          recipe_id: recipeId,
          generation_status: "completed",
          specification: res.spec_output,
          spec_output: res.spec_output,
        }));
      }
    } catch (err: any) {
      const msg = err?.message ?? "Spec chat failed.";
      setChatMessages((prev) => [...prev, { role: "assistant", content: `Error: ${msg}` }]);
      toast.error(msg);
    } finally {
      setChatLoading(false);
    }
  };

  // Update projectData when storedRepoContext changes (from Redux)
  useEffect(() => {
    if (!storedRepoContext) return;
    setProjectData((prev) => {
      const repoName =
        storedRepoContext.repoName || prev?.repo || "Unknown Repository";
      const branchName =
        storedRepoContext.branchName || prev?.branch || "main";

      if (prev && prev.repo === repoName && prev.branch === branchName) {
        return prev;
      }

      return {
        repo: repoName,
        branch: branchName,
        questions: prev?.questions || [],
      };
    });
  }, [storedRepoContext]);

  // Fetch recipe details; prefer Redux (from newchat/repo) and localStorage for repo/branch/user_prompt when API omits them
  useEffect(() => {
    const fetchRecipeDetails = async () => {
      if (!recipeId) return;

      if (hasInitializedRef.current) return;

      let fromStorage: { repo_name?: string; branch_name?: string; user_prompt?: string; project_id?: string } | null = null;
      if (typeof window !== "undefined") {
        try {
          const raw = localStorage.getItem(`recipe_${recipeId}`);
          if (raw) fromStorage = JSON.parse(raw);
        } catch {
          fromStorage = null;
        }
      }

      try {
        console.log("[Spec Page] Fetching recipe details for:", recipeId);
        const recipeDetails = await SpecService.getRecipeDetails(recipeId);
        console.log("[Spec Page] Recipe details received:", recipeDetails);

        // User prompt: API first, then newchat localStorage (text area value from newchat page)
        const userPrompt =
          (recipeDetails.user_prompt && recipeDetails.user_prompt.trim()) ||
          fromStorage?.user_prompt ||
          "Implementation plan generation";

        setRecipeData({
          recipe_id: recipeDetails.recipe_id,
          project_id: recipeDetails.project_id,
          user_prompt: userPrompt,
        });

        // Repo/branch: API first, then localStorage (set by newchat), so we don't show "Unknown" when API omits them
        const repoName =
          recipeDetails.repo_name?.trim() ||
          fromStorage?.repo_name?.trim() ||
          "Unknown Repository";
        const branchName =
          recipeDetails.branch_name?.trim() || fromStorage?.branch_name?.trim() || "main";

        setProjectData({
          repo: repoName,
          branch: branchName,
          questions: recipeDetails.questions_and_answers.map((qa) => ({
            id: qa.question_id,
            question: qa.question,
          })),
        });

        const answersMap: Record<string, string> = {};
        recipeDetails.questions_and_answers.forEach((qa) => {
          if (qa.answer) {
            answersMap[qa.question_id] = qa.answer;
          }
        });
        setAnswers(answersMap);

        dispatch(
          setRepoAndBranchForTask({
            taskId: recipeId,
            repoName: repoName,
            branchName: branchName,
            projectId: recipeDetails.project_id || undefined,
          })
        );

        hasInitializedRef.current = true;
      } catch (err: any) {
        console.error("[Spec Page] Failed to fetch recipe details:", err);
        // On error, use localStorage if available so repo/branch/prompt can still show
        setRecipeData({
          recipe_id: recipeId,
          project_id: fromStorage?.project_id ?? "",
          user_prompt: fromStorage?.user_prompt || "Implementation plan generation",
        });
        setProjectData({
          repo: fromStorage?.repo_name?.trim() || "Unknown Repository",
          branch: fromStorage?.branch_name?.trim() || "main",
          questions: [],
        });
        hasInitializedRef.current = true;
      }
    };

    fetchRecipeDetails();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recipeId]);

  // When we have run_id in URL, show spec page immediately (streaming UI); don't wait for initial poll
  useEffect(() => {
    if (recipeId && runIdFromUrl) setIsLoading(false);
  }, [recipeId, runIdFromUrl]);

  // When navigated from repo with run_id, connect to SSE stream (potpie-workflows events)
  // First check if spec is already completed before attempting stream connection
  useEffect(() => {
    if (!recipeId || !runIdFromUrl) return;

    let cancelled = false;

    const tryConnectStream = async () => {
      // First check spec status - if already completed/failed, skip streaming
      try {
        const currentStatus = await SpecService.getSpecProgressByRecipeId(recipeId);
        if (cancelled) return;
        
        const genStatus = "generation_status" in currentStatus ? currentStatus.generation_status : null;
        if (genStatus === "completed" || genStatus === "failed") {
          // Spec is already done, no need to stream - just update state and clear run_id from URL
          setSpecProgress(currentStatus);
          router.replace(`/task/${recipeId}/spec`, { scroll: false });
          return;
        }
      } catch {
        // If status check fails, still try to connect to stream
      }

      if (cancelled) return;

      streamAbortRef.current?.abort();
      streamAbortRef.current = new AbortController();
      setStreamProgress({ step: "Connecting…", message: "Opening live stream" });
      setStreamChunks("");
      setStreamSegments([]);
      setStreamEvents([]);
      streamChunksRef.current = "";

      SpecService.connectSpecStream(recipeId, runIdFromUrl, {
        signal: streamAbortRef.current.signal,
        onEvent: (eventType, data) => {
          const payload = (data?.data as Record<string, unknown>) ?? data;
          // queued: task queued
          if (eventType === "queued") {
            setStreamProgress({ step: "Queued", message: (payload?.message as string) ?? "Task queued for processing" });
          }
          // start: pipeline started
          if (eventType === "start") {
            setStreamProgress({ step: "Starting", message: (payload?.message as string) ?? "Starting spec generation" });
          }
          // progress: step + message from backend
          if (eventType === "progress" && payload) {
            setStreamProgress({
              step: (payload.step as string) ?? "Processing",
              message: (payload.message as string) ?? "",
            });
          }
          // chunk: streaming text (thinking/tokens)
          if (eventType === "chunk" && payload?.content) {
            const content = String(payload.content);
            setStreamChunks((prev) => {
              const next = prev + content;
              streamChunksRef.current = next;
              return next;
            });
          }
          // tool_call_start / tool_call_end: show in activity list; on tool_call_end push current chunks as a segment
          if (eventType === "tool_call_start" && payload?.tool) {
            const id = `tool-start-${++streamEventIdRef.current}`;
            setStreamEvents((prev) => [...prev.slice(-29), { id, type: "tool_start", label: `Running ${String(payload.tool)}` }]);
          }
          if (eventType === "tool_call_end" && payload?.tool) {
            const id = `tool-end-${++streamEventIdRef.current}`;
            const duration = payload.duration_ms != null ? ` (${payload.duration_ms}ms)` : "";
            const label = String(payload.tool);
            const contentToPush = streamChunksRef.current;
            // Always push a segment (same id as event) so mergedStreamBlocks can pair by id; use empty string when no content
            setStreamSegments((prev) => [...prev, { id: `seg-${id}`, label, content: contentToPush || "" }]);
            setStreamChunks("");
            streamChunksRef.current = "";
            setStreamEvents((prev) => [...prev.slice(-29), { id, type: "tool_end", label: `Completed ${label}${duration}` }]);
          }
          if (eventType === "subagent_start" && payload?.agent) {
            const id = `subagent-start-${++streamEventIdRef.current}`;
            setStreamEvents((prev) => [...prev.slice(-29), { id, type: "subagent_start", label: `Agent: ${String(payload.agent)}` }]);
          }
          if (eventType === "subagent_end" && payload?.agent) {
            const id = `subagent-end-${++streamEventIdRef.current}`;
            const duration = payload.duration_ms != null ? ` (${payload.duration_ms}ms)` : "";
            setStreamEvents((prev) => [...prev.slice(-29), { id, type: "subagent_end", label: `Done ${String(payload.agent)}${duration}` }]);
          }
          // end: stream finished successfully — keep tool calls and preview on left, just stop progress
          if (eventType === "end") {
            setStreamProgress(null);
            setRegenerateSpecKey((k) => k + 1);
            SpecService.getSpecProgressByRecipeId(recipeId).then(setSpecProgress).catch(() => {});
            router.replace(`/task/${recipeId}/spec`, { scroll: false });
          }
          // error: clear stream state and refetch
          if (eventType === "error") {
            setStreamProgress(null);
            setStreamChunks("");
            setStreamSegments([]);
            setStreamEvents([]);
            streamChunksRef.current = "";
            setRegenerateSpecKey((k) => k + 1);
            SpecService.getSpecProgressByRecipeId(recipeId).then(setSpecProgress).catch(() => {});
            router.replace(`/task/${recipeId}/spec`, { scroll: false });
          }
        },
        onError: async (msg) => {
          // On stream error, check if spec is already completed - if so, don't show error toast
          try {
            const fallbackStatus = await SpecService.getSpecProgressByRecipeId(recipeId);
            const genStatus = "generation_status" in fallbackStatus ? fallbackStatus.generation_status : null;
            setSpecProgress(fallbackStatus);
            if (genStatus === "completed" || genStatus === "failed") {
              // Spec finished, stream just wasn't available - no error to show
              setStreamProgress(null);
              router.replace(`/task/${recipeId}/spec`, { scroll: false });
              return;
            }
          } catch {
            // Status check failed, show error
          }
          setStreamProgress(null);
          setStreamChunks("");
          setStreamSegments([]);
          setStreamEvents([]);
          streamChunksRef.current = "";
          setError(msg);
          toast.error("Live stream failed. Showing progress by polling.");
          router.replace(`/task/${recipeId}/spec`, { scroll: false });
        },
      });
    };

    tryConnectStream();

    return () => {
      cancelled = true;
      streamAbortRef.current?.abort();
    };
  }, [recipeId, runIdFromUrl]);

  // Poll for spec progress (re-runs when regenerateSpecKey changes so we can restart after regenerate)
  useEffect(() => {
    if (!recipeId) return;
    if (runIdFromUrl) return; // When streaming, skip poll until stream ends
    if (hasSpecPollStartedRef.current) return;
    hasSpecPollStartedRef.current = true;

    let mounted = true;
    let interval: NodeJS.Timeout;

    const pollSpecProgress = async () => {
      try {
        console.log("[Spec Page] Starting to poll spec progress for recipeId:", recipeId);
        const progress = await SpecService.getSpecProgressByRecipeId(recipeId);
        console.log("[Spec Page] Received progress response:", progress);

        if (!mounted) return;

        setSpecProgress(progress);
        setError(null);
        setIsLoading(false);

        // New API: generation_status is "pending" | "processing" | "completed" | "failed" | "not_started"
        const status = 'generation_status' in progress
          ? (progress.generation_status === 'completed' ? 'COMPLETED' : progress.generation_status === 'failed' ? 'FAILED' : progress.generation_status === 'processing' || progress.generation_status === 'pending' ? 'IN_PROGRESS' : 'PENDING')
          : (progress as any).spec_generation_step_status;

        if (status === 'COMPLETED' || status === 'FAILED') {
          if (interval) clearInterval(interval);
          if (status === 'COMPLETED') {
            setIsPlanExpanded(false);
          }
        } else {
          if (interval) clearInterval(interval);
          let attempts = 0;
          const POLL_INTERVAL_MS = 5000;
          const MAX_ATTEMPTS = 120; // 10 minutes at 5s
          interval = setInterval(async () => {
            if (!mounted || attempts >= MAX_ATTEMPTS) {
              if (interval) clearInterval(interval);
              return;
            }
            try {
              attempts += 1;
              const updated = await SpecService.getSpecProgressByRecipeId(recipeId);
              if (!mounted) return;
              setSpecProgress(updated);
              const updatedStatus = 'generation_status' in updated
                ? (updated.generation_status === 'completed' ? 'COMPLETED' : updated.generation_status === 'failed' ? 'FAILED' : 'IN_PROGRESS')
                : (updated as any).spec_generation_step_status;
              if (updatedStatus === 'COMPLETED' || updatedStatus === 'FAILED') {
                clearInterval(interval);
                if (updatedStatus === 'COMPLETED') setIsPlanExpanded(false);
              }
            } catch (error) {
              console.error("[Spec Page] Error polling spec progress:", error);
            }
          }, POLL_INTERVAL_MS);
        }
      } catch (err: any) {
        if (!mounted) return;
        console.error("Error fetching spec progress:", err);
        setError(err.message || "Failed to load spec progress");
        setIsLoading(false);
      }
    };
    
    pollSpecProgress();

    return () => {
      mounted = false;
      hasSpecPollStartedRef.current = false; // Reset so effect can run again on re-mount or after regenerate
      if (interval) clearInterval(interval);
    };
  }, [recipeId, regenerateSpecKey, runIdFromUrl]);

  // Calculate status (support new API: generation_status, and legacy formats)
  const status = (specProgress 
    ? ('generation_status' in specProgress
        ? ((specProgress as any).generation_status === 'completed' ? 'COMPLETED' : (specProgress as any).generation_status === 'failed' ? 'FAILED' : (specProgress as any).generation_status === 'processing' || (specProgress as any).generation_status === 'pending' ? 'IN_PROGRESS' : 'PENDING')
        : ('spec_gen_status' in specProgress ? specProgress.spec_gen_status : ('spec_generation_step_status' in specProgress ? specProgress.spec_generation_step_status : null)))
    : null) as 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' | 'PENDING' | null;
  const isGenerating = status === 'IN_PROGRESS' || status === 'PENDING';
  const errorMessageFromApi = specProgress && typeof (specProgress as any).error_message === 'string' ? (specProgress as any).error_message : null;

  // Normalize spec from potpie-workflows GET /api/v1/recipes/{id}/spec
  const { plan: normalizedPlan, rawSpec: rawSpecification } = normalizeSpecFromProgress(specProgress ?? undefined);
  const hasSpecContent = normalizedPlan !== null || rawSpecification !== null;

  // Persist thinking (stream segments/events) when spec is completed so it survives refresh
  useEffect(() => {
    if (!recipeId || status !== "COMPLETED" || !hasSpecContent) return;
    if (streamSegments.length > 0 || streamEvents.length > 0) {
      try {
        sessionStorage.setItem(
          `${THINKING_STORAGE_KEY}_${recipeId}`,
          JSON.stringify({ segments: streamSegments, events: streamEvents })
        );
      } catch {
        // ignore storage errors
      }
    }
  }, [recipeId, status, hasSpecContent, streamSegments, streamEvents]);

  // Restore thinking from sessionStorage on load when spec is completed but we have no stream state (e.g. after refresh)
  useEffect(() => {
    if (!recipeId || status !== "COMPLETED" || !hasSpecContent || runIdFromUrl) return;
    if (streamSegments.length > 0 || streamEvents.length > 0) return;
    if (hasRestoredThinkingRef.current === recipeId) return;
    hasRestoredThinkingRef.current = recipeId;
    try {
      const raw = sessionStorage.getItem(`${THINKING_STORAGE_KEY}_${recipeId}`);
      if (!raw) return;
      const data = JSON.parse(raw) as { segments?: { id: string; label: string; content: string }[]; events?: { id: string; type: string; label: string }[] };
      const segments = Array.isArray(data.segments) ? data.segments : [];
      const events = Array.isArray(data.events) ? data.events : [];
      if (segments.length > 0 || events.length > 0) {
        setStreamSegments(segments);
        setStreamEvents(events);
      }
    } catch {
      // ignore
    }
  }, [recipeId, status, hasSpecContent, runIdFromUrl, streamSegments.length, streamEvents.length]);

  // Reset restore ref when recipe changes so we can restore for the new recipe
  useEffect(() => {
    if (!recipeId) return;
    return () => {
      hasRestoredThinkingRef.current = null;
    };
  }, [recipeId]);

  // Auto-scroll to bottom when plan is generated
  useEffect(() => {
    if (status === 'COMPLETED' && planContentRef.current) {
      setTimeout(() => {
        planContentRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }, 100);
    }
  }, [status]);

  // Show spec failure as toast (instead of inline banner)
  const failedToastShownRef = useRef(false);
  useEffect(() => {
    if (status !== "FAILED" && !error) {
      failedToastShownRef.current = false;
      return;
    }
    if (failedToastShownRef.current) return;
    failedToastShownRef.current = true;
    const message =
      status === "FAILED"
        ? (errorMessageFromApi || "The spec generation process encountered an error. Please try again.")
        : error || "Something went wrong.";
    const title = status === "FAILED" ? "Spec Generation Failed" : "Error";
    toast.error(message, {
      title,
      duration: 8000,
      action: { label: "Retry", onClick: () => window.location.reload() },
    });
  }, [status, error, errorMessageFromApi]);

  // When we have run_id we go straight to spec page and show streaming; no loading screen
  if (recipeId && isLoading && !specProgress && !runIdFromUrl) {
    return (
      <div className="flex items-center justify-center min-h-[80vh]">
        <Loader2 className="w-6 h-6 animate-spin text-primary-color" />
        <p className="ml-3 text-primary-color">Loading spec generation...</p>
      </div>
    );
  }

  if (!recipeId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] px-4">
        <div className="text-center">
          <h2 className="text-2xl font-semibold mb-2">Recipe not found</h2>
          <p className="text-primary-color mb-6">
            The recipe ID was not found. Please start a new project.
          </p>
          <button
            onClick={() => router.push("/newchat")}
            className="px-4 py-2 bg-primary-color text-accent-color rounded hover:opacity-90"
          >
            Create New Project
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-background text-primary-color font-sans selection:bg-zinc-100 antialiased">
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* Left: Chat area — fixed height so only messages scroll; input always visible */}
        <div className="w-1/2 max-w-[50%] flex flex-col min-w-0 min-h-0 overflow-hidden border-r border-[#D3E5E5] bg-[#FAF8F7] chat-panel-contained">
          {/* Chat header */}
          <div className="flex justify-between items-center px-6 py-4 shrink-0">
            <h1 className="text-lg font-bold text-primary-color truncate capitalize">
              {recipeData?.user_prompt?.slice(0, 50) || "Chat Name"}
              {(recipeData?.user_prompt?.length ?? 0) > 50 ? "…" : ""}
            </h1>
            {projectData && (
              <div className="flex items-center gap-2 shrink-0">
                <Badge icon={Github}>{projectData.repo}</Badge>
                <Badge icon={GitBranch}>{projectData.branch}</Badge>
              </div>
            )}
          </div>

          {/* Messages — only this section scrolls */}
          <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-6 py-4 space-y-4">
            {chatMessages.map((msg, i) => (
              <React.Fragment key={i}>
                {/* User message */}
                {msg.role === "user" && (
                  <div className="flex justify-end">
                    <div className="max-w-[85%] text-sm rounded-t-xl rounded-bl-xl px-4 py-3 bg-white border border-gray-200 text-gray-900">
                      {msg.content}
                    </div>
                  </div>
                )}
                {/* After first user message: assistant intro, then thinking/stream (no bordered box) */}
                {msg.role === "user" && i === 0 && (
                  <>
                    <div className="flex justify-start">
                      <div className="w-10 h-10 rounded-lg shrink-0 mr-3 mt-0.5 flex items-center justify-center bg-[#102C2C] self-start">
                        <Image src="/images/logo.svg" width={24} height={24} alt="Potpie Logo" className="w-6 h-6" />
                      </div>
                      <div className="max-w-[85%] text-sm px-4 py-3 text-gray-900">
                        Turning your idea into a structured specification. Your goals and requirements will appear in the panel on the right—once they&apos;re ready, we can refine them together.
                      </div>
                    </div>
                    {/* Agent output: full chat width; Tool calls and Output as separate blocks */}
                    {(streamProgress || isGenerating || mergedStreamBlocks.length > 0 || streamChunks || streamSegments.length > 0) && (
                      <div className="flex justify-start w-full overflow-hidden" style={{ contain: "inline-size" }}>
                        <div className="w-10 h-10 rounded-lg shrink-0 mr-3 mt-0.5 flex items-center justify-center bg-[#102C2C] self-start opacity-0" aria-hidden />
                        <div className="min-w-0 flex-1 overflow-hidden" style={{ width: "calc(100% - 52px)" }}>
                          {(streamProgress || isGenerating) && !streamChunks && (
                            <p className="text-xs text-zinc-500 flex items-center gap-2 mb-2">
                              <span className="inline-block w-4 h-4 rounded-full border-2 border-[#102C2C] border-t-transparent animate-spin" />
                              {streamProgress ? `${streamProgress.step}: ${streamProgress.message}` : "Generating specification…"}
                            </p>
                          )}
                          {mergedStreamBlocks.length > 0 && (
                            <div className="mb-3">
                              <details className="group/tools rounded-lg bg-[#F5F5F4] min-w-0 overflow-hidden">
                                <summary className="flex items-center justify-between gap-3 px-3 py-2 cursor-pointer select-none [&::-webkit-details-marker]:hidden">
                                  <span className="text-xs font-medium text-zinc-800">
                                    Tool calls ({mergedStreamBlocks.filter((b) => b.kind === "segment").length})
                                  </span>
                                  <ChevronDown className="w-4 h-4 shrink-0 text-zinc-500 transition-transform duration-200 group-open/tools:rotate-180" aria-hidden />
                                </summary>
                                <div className="space-y-3 min-w-0 overflow-hidden pt-1 pb-0">
                                {mergedStreamBlocks.map((block) =>
                                  block.kind === "event" ? (
                                    (block.event.type === "tool_start" || block.event.type === "tool_end") ? (
                                      <span key={block.key} className="hidden" aria-hidden />
                                    ) : (
                                      <p key={block.key} className="text-xs text-zinc-600 font-mono break-words">
                                        {block.event.type === "subagent_start" ? "▶ " : "✓ "}{block.event.label}
                                      </p>
                                    )
                                  ) : (
                                    <details
                                      key={block.key}
                                      className="group rounded-lg bg-[#F5F5F4] min-w-0 overflow-hidden"
                                    >
                                      <summary className="flex items-center justify-between gap-3 px-3 py-2 cursor-pointer select-none [&::-webkit-details-marker]:hidden">
                                        <div className="flex items-center gap-2 min-w-0">
                                          <Check className="w-4 h-4 shrink-0 text-emerald-600" aria-hidden />
                                          <span className="text-xs font-medium text-zinc-800 truncate">
                                            {block.segment.label}
                                          </span>
                                        </div>
                                        <ChevronDown
                                          className="w-4 h-4 shrink-0 text-zinc-500 transition-transform duration-200 group-open:rotate-180"
                                          aria-hidden
                                        />
                                      </summary>
                                      <div
                                        ref={(el) => { if (el) el.scrollTop = el.scrollHeight; }}
                                        className="bg-[#FAF8F7] p-3 overflow-y-auto overflow-x-hidden min-w-0 text-xs text-zinc-700 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                                        style={{ msOverflowStyle: "none" }}
                                      >
                                        <SharedMarkdown content={normalizeMarkdownForPreview(block.segment.content)} />
                                      </div>
                                    </details>
                                  )
                                )}
                                </div>
                              </details>
                            </div>
                          )}
                          {(streamChunks || streamSegments.length > 0 || (streamProgress || isGenerating)) && (
                            <div className="space-y-2 min-w-0 overflow-hidden">
                              {streamChunks ? (
                                <div
                                  ref={streamChunkBoxRef}
                                  className="rounded-lg bg-[#FAF8F7] p-3 overflow-y-auto overflow-x-hidden min-w-0"
                                >
                                  <SharedMarkdown content={normalizeMarkdownForPreview(streamChunks)} />
                                </div>
                              ) : null}
                            </div>
                          )}
                          {(mergedStreamBlocks.length > 0 || streamChunks || streamSegments.length > 0 || (streamProgress || isGenerating)) && (
                            <div ref={streamOutputEndRef} aria-hidden />
                          )}
                        </div>
                      </div>
                    )}
                  </>
                )}
                {/* Assistant message (skip i===1 — shown above as thinking/stream) */}
                {msg.role === "assistant" && i !== 1 && (
                  <div className="flex justify-start">
                    <div className="w-10 h-10 rounded-lg shrink-0 mr-3 mt-0.5 flex items-center justify-center bg-[#102C2C]">
                      <Image src="/images/logo.svg" width={24} height={24} alt="Potpie Logo" className="w-6 h-6" />
                    </div>
                    <div className="max-w-[85%] text-sm px-4 py-3 text-gray-900">
                      {msg.content.length > 400
                        ? `${msg.content.slice(0, 400).trim()}… View the full specification in the panel on the right.`
                        : msg.content}
                    </div>
                  </div>
                )}
              </React.Fragment>
            ))}
            <div ref={chatEndRef} />
          </div>

          {/* Chat input — multi-line textarea with send button inside at bottom-right */}
          <div className="p-4 shrink-0 ">
            <div className="relative">
              <textarea
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSendChatMessage();
                  }
                }}
                placeholder="Describe any change that you want...."
                rows={3}
                className="w-full min-h-[88px] px-4 py-3 pr-14 pb-12 rounded-xl border border-gray-200 bg-[#FFFDFC] text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#102C2C]/20 focus:border-[#102C2C] resize-none"
              />
              <button
                type="button"
                onClick={handleSendChatMessage}
                disabled={chatLoading}
                className="absolute right-2 bottom-4 h-10 w-10 rounded-full bg-[#102C2C] text-[#B6E343] flex items-center justify-center hover:opacity-90 transition-opacity disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {chatLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <SendHorizonal className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Right: Specification panel - show 50% when streaming or when spec is ready (never full-page left) */}
        <div
          className="overflow-hidden flex-none flex flex-col max-w-[50%]"
          style={{
            width: (specProgress != null || runIdFromUrl || streamProgress || isGenerating || !!streamChunks) ? "50%" : "0",
            minWidth: 0,
            transition: "width 0.35s ease-out",
          }}
        >
          <aside className="h-full w-full min-w-[280px] flex flex-col border-l border-[#D3E5E5]">
            <div className="p-6 border-b border-[#D3E5E5]">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2 min-w-0 flex-1 justify-between">
                  <div className="flex items-center gap-2">
                  <h2 className="text-[18px] font-bold leading-tight tracking-tight shrink-0" style={{ color: "#022019" }}>
                    Specification
                  </h2>
                  <TooltipProvider delayDuration={200}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          className="p-1 rounded-full hover:bg-[#CCD3CF]/30 transition-colors shrink-0"
                          aria-label="Specification info"
                        >
                          <Info className="w-4 h-4" style={{ color: "#022019" }} />
                        </button>
                      </TooltipTrigger>
                      <TooltipPortal>
                        <TooltipContent
                          side="bottom"
                          align="start"
                          sideOffset={8}
                          className="max-w-[280px] bg-white text-gray-900 border border-gray-200 shadow-lg rounded-lg px-4 py-3 text-sm font-normal"
                        >
                          Plan Spec is granular specification of the user prompt and the question. These represent the specific goals of the workflow.
                        </TooltipContent>
                      </TooltipPortal>
                    </Tooltip>
                  </TooltipProvider>
                  </div>
                  <button
                    type="button"
                    onClick={async () => {
                      if (!recipeId || isRegeneratingSpec) return;
                      setIsRegeneratingSpec(true);
                      try {
                        // Call regenerate first to reset recipe state
                        await SpecService.regenerateSpec(recipeId);
                        // Then try to start streaming to get run_id for live updates
                        let runId = "";
                        try {
                          const result = await SpecService.startSpecGenerationStream(recipeId, {
                            consumeStream: false,
                          });
                          runId = result.runId;
                        } catch {
                          // Streaming endpoint failed - backend may not support it after regenerate
                          // Fall back to polling
                        }
                        toast.success("Spec regeneration started");
                        if (!runId) {
                          // No run_id - fall back to polling
                          setSpecProgress(null);
                          setError(null);
                          setRegenerateSpecKey((k) => k + 1);
                        } else {
                          // Navigate with run_id for streaming
                          router.push(`/task/${recipeId}/spec?run_id=${encodeURIComponent(runId)}`);
                        }
                      } catch (err: any) {
                        console.error("Error regenerating spec:", err);
                        toast.error(err?.message ?? "Failed to regenerate spec");
                      } finally {
                        setIsRegeneratingSpec(false);
                      }
                    }}
                    disabled={isRegeneratingSpec}
                    className="p-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 transition-colors shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
                    aria-label="Regenerate spec"
                  >
                    {isRegeneratingSpec ? (
                      <Loader2 className="w-4 h-4 animate-spin" style={{ color: "#022019" }} />
                    ) : (
                      <RotateCw className="w-4 h-4" style={{ color: "#022019" }} />
                    )}
                  </button>
                </div>
                {status === "COMPLETED" && !isCancelled && hasSpecContent && (
                  <button
                    onClick={() => {
                      startNavigation();
                      router.push(`/task/${recipeId}/plan`);
                    }}
                    className="shrink-0 px-6 py-2 rounded-lg font-medium text-sm flex items-center gap-2 bg-[#022019] text-white hover:opacity-90"
                  >
                    GENERATE PLAN
                  </button>
                )}
              </div>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-6">
            {status === "COMPLETED" && !isCancelled && hasSpecContent ? (
              <div ref={planContentRef}>
                {normalizedPlan ? (
                  <PlanTabs plan={normalizedPlan} />
                ) : rawSpecification ? (
                  <SpecFallbackView spec={rawSpecification} />
                ) : null}
              </div>
            ) : (streamProgress || isGenerating || (streamChunks && status !== "COMPLETED")) ? (
              <div className="h-full flex flex-col items-center justify-center text-center">
                <div className="animate-spin-slow mb-4">
                  <Image
                    src="/images/logo.svg"
                    width={48}
                    height={48}
                    alt="Loading"
                    className="w-12 h-12"
                  />
                </div>
                <p className="text-sm font-medium text-[#102C2C]">Cooking ingredients for spec</p>
                <p className="text-xs text-zinc-500 mt-1">
                  {streamProgress ? `${streamProgress.step}: ${streamProgress.message}` : "Preparing specification…"}
                </p>
              </div>
            ) : (
              <p className="text-sm text-zinc-500">Specification will appear here when ready.</p>
            )}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
};

export default SpecPage;
