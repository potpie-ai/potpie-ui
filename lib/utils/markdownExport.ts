import { SpecificationOutput, PhasedPlan, PlanPhase, PhasedPlanItem } from "@/lib/types/spec";

/**
 * Utility for exporting specifications and plans to Markdown format
 */

/**
 * Escape special markdown characters in text
 */
function escapeMarkdown(text: string): string {
  if (!text) return "";
  return text
    .replace(/\\/g, "\\\\")
    .replace(/\|/g, "\\|")
    .replace(/\n/g, "<br>");
}

/**
 * Format a value for display in markdown
 */
function formatValue(value: any): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (typeof value === "object") {
    // Handle arrays
    if (Array.isArray(value)) {
      if (value.length === 0) return "";
      return value.map((item) => `- ${formatValue(item)}`).join("\n");
    }
    // Handle objects
    return Object.entries(value)
      .map(([key, val]) => `- **${key}**: ${formatValue(val)}`)
      .join("\n");
  }
  return String(value);
}

/**
 * Generate a table row
 */
function tableRow(cells: string[]): string {
  return "| " + cells.map(escapeMarkdown).join(" | ") + " |";
}

/**
 * Generate a table separator
 */
function tableSeparator(columnCount: number): string {
  return "|" + " --- |".repeat(columnCount);
}

/**
 * Export specification to Markdown format
 */
export function exportSpecToMarkdown(spec: SpecificationOutput): string {
  if (!spec) return "";

  const lines: string[] = [];

  // Title and TL;DR
  const title = spec.tl_dr || "Specification";
  lines.push(`# ${title}`);
  lines.push("");

  if (spec.tl_dr) {
    lines.push("> **Executive Summary**: " + spec.tl_dr);
    lines.push("");
  }

  // Table of Contents
  lines.push("## Table of Contents");
  lines.push("");
  if (spec.context) lines.push("- [Context](#context)");
  if (spec.success_metrics?.length) lines.push("- [Success Metrics](#success-metrics)");
  if (spec.functional_requirements?.length) lines.push("- [Functional Requirements](#functional-requirements)");
  if (spec.non_functional_requirements?.length) lines.push("- [Non-Functional Requirements](#non-functional-requirements)");
  if (spec.architectural_decisions?.length) lines.push("- [Architectural Decisions](#architectural-decisions)");
  if (spec.data_models?.length) lines.push("- [Data Models](#data-models)");
  if (spec.interfaces?.length) lines.push("- [Interfaces](#interfaces)");
  if (spec.external_dependencies_summary?.length) lines.push("- [External Dependencies](#external-dependencies)");
  lines.push("");

  // Context Section
  if (spec.context) {
    lines.push("## Context");
    lines.push("");

    const ctx = spec.context;
    if (ctx.original_request) {
      lines.push("### Original Request");
      lines.push("");
      lines.push(String(ctx.original_request));
      lines.push("");
    }

    if (ctx.janus_analysis) {
      lines.push("### Gap Analysis");
      lines.push("");
      lines.push(String(ctx.janus_analysis));
      lines.push("");
    }

    if (ctx.qa_answers) {
      lines.push("### Key Answers");
      lines.push("");
      lines.push(String(ctx.qa_answers));
      lines.push("");
    }

    if (ctx.research_findings) {
      lines.push("### Research Findings");
      lines.push("");
      lines.push(String(ctx.research_findings));
      lines.push("");
    }
  }

  // Success Metrics
  if (spec.success_metrics?.length) {
    lines.push("## Success Metrics");
    lines.push("");
    spec.success_metrics.forEach((metric) => {
      lines.push(`- [ ] ${String(metric)}`);
    });
    lines.push("");
  }

  // Functional Requirements
  if (spec.functional_requirements?.length) {
    lines.push("## Functional Requirements");
    lines.push("");

    spec.functional_requirements.forEach((fr: any, index: number) => {
      const id = fr?.id || `FR-${String(index + 1).padStart(3, "0")}`;
      const title = fr?.title || "Requirement";

      lines.push(`### ${id}: ${title}`);
      lines.push("");

      if (fr.priority) {
        lines.push(`**Priority**: ${fr.priority}`);
        lines.push("");
      }

      if (fr.description) {
        lines.push(String(fr.description));
        lines.push("");
      }

      // Acceptance Criteria
      if (fr.acceptance_criteria?.length) {
        lines.push("#### Acceptance Criteria");
        lines.push("");
        fr.acceptance_criteria.forEach((criterion: any) => {
          const text = typeof criterion === "string" ? criterion : criterion?.text || JSON.stringify(criterion);
          lines.push(`1. ${text}`);
        });
        lines.push("");
      }

      // Guardrails
      if (fr.guardrails?.length) {
        lines.push("#### Guardrails");
        lines.push("");
        lines.push(tableRow(["Type", "Statement", "Rationale"]));
        lines.push(tableSeparator(3));
        fr.guardrails.forEach((g: any) => {
          if (typeof g === "string") {
            lines.push(tableRow(["", g, ""]));
          } else {
            lines.push(tableRow([
              g?.type || "",
              g?.statement || g?.text || "",
              g?.rationale || ""
            ]));
          }
        });
        lines.push("");
      }

      // File Impact
      if (fr.file_impact?.length || fr.file_impact_summary) {
        lines.push("#### File Impact");
        lines.push("");
        lines.push(tableRow(["Path", "Action", "Purpose"]));
        lines.push(tableSeparator(3));

        if (fr.file_impact?.length) {
          fr.file_impact.forEach((f: any) => {
            if (typeof f === "string") {
              lines.push(tableRow([f, "", ""]));
            } else {
              lines.push(tableRow([
                f?.path || f?.file_path || "",
                f?.action || f?.type || "",
                f?.purpose || ""
              ]));
            }
          });
        } else if (fr.file_impact_summary) {
          lines.push(tableRow([String(fr.file_impact_summary), "", ""]));
        }
        lines.push("");
      }

      // Dependencies
      if (fr.dependencies?.length) {
        lines.push("#### Dependencies");
        lines.push("");
        fr.dependencies.forEach((dep: any) => {
          const text = typeof dep === "string" ? dep : dep?.id || dep?.name || JSON.stringify(dep);
          lines.push(`- ${text}`);
        });
        lines.push("");
      }

      // External Dependencies
      if (fr.external_dependencies?.length) {
        lines.push("#### External Dependencies");
        lines.push("");
        fr.external_dependencies.forEach((ext: any) => {
          const text = typeof ext === "string" ? ext : ext?.name || JSON.stringify(ext);
          lines.push(`- ${text}`);
        });
        lines.push("");
      }

      // Implementation Recommendations
      if (fr.implementation_recommendations?.length) {
        lines.push("#### Implementation Recommendations");
        lines.push("");
        fr.implementation_recommendations.forEach((rec: any) => {
          const text = typeof rec === "string" ? rec : rec?.text || JSON.stringify(rec);
          lines.push(`- ${text}`);
        });
        lines.push("");
      }
    });
  }

  // Non-Functional Requirements
  if (spec.non_functional_requirements?.length) {
    lines.push("## Non-Functional Requirements");
    lines.push("");

    spec.non_functional_requirements.forEach((nfr: any, index: number) => {
      const id = nfr?.id || `NFR-${String(index + 1).padStart(3, "0")}`;
      const title = nfr?.title || nfr?.category || "Requirement";

      lines.push(`### ${id}: ${title}`);
      lines.push("");

      if (nfr.description) {
        lines.push(String(nfr.description));
        lines.push("");
      }

      if (nfr.requirement) {
        lines.push(String(nfr.requirement));
        lines.push("");
      }
    });
  }

  // Architectural Decisions
  if (spec.architectural_decisions?.length) {
    lines.push("## Architectural Decisions");
    lines.push("");

    spec.architectural_decisions.forEach((ad: any, index: number) => {
      const id = ad?.id || `AD-${String(index + 1).padStart(3, "0")}`;
      const title = ad?.title || "Decision";

      lines.push(`### ${id}: ${title}`);
      lines.push("");

      if (ad.context) {
        lines.push("**Context**: " + ad.context);
        lines.push("");
      }

      if (ad.decision) {
        lines.push("**Decision**: " + ad.decision);
        lines.push("");
      }

      if (ad.consequences) {
        lines.push("**Consequences**: " + ad.consequences);
        lines.push("");
      }

      // Alternatives table
      if (ad.alternatives?.length) {
        lines.push("#### Alternatives Considered");
        lines.push("");
        lines.push(tableRow(["Option", "Pros", "Cons"]));
        lines.push(tableSeparator(3));
        ad.alternatives.forEach((alt: any) => {
          if (typeof alt === "string") {
            lines.push(tableRow([alt, "", ""]));
          } else {
            lines.push(tableRow([
              alt?.option || alt?.name || "",
              alt?.pros || "",
              alt?.cons || ""
            ]));
          }
        });
        lines.push("");
      }
    });
  }

  // Data Models
  if (spec.data_models?.length) {
    lines.push("## Data Models");
    lines.push("");

    spec.data_models.forEach((model: any, index: number) => {
      const name = model?.name || model?.entity || `Model ${index + 1}`;

      lines.push(`### ${name}`);
      lines.push("");

      if (model.description) {
        lines.push(String(model.description));
        lines.push("");
      }

      // Fields table
      if (model.fields?.length) {
        lines.push(tableRow(["Field", "Type", "Description", "Constraints"]));
        lines.push(tableSeparator(4));
        model.fields.forEach((field: any) => {
          if (typeof field === "string") {
            lines.push(tableRow([field, "", "", ""]));
          } else {
            lines.push(tableRow([
              field?.name || field?.field || "",
              field?.type || "",
              field?.description || "",
              field?.constraints || ""
            ]));
          }
        });
        lines.push("");
      }

      // Relationships
      if (model.relationships?.length) {
        lines.push("#### Relationships");
        lines.push("");
        lines.push(tableRow(["Entity", "Type", "Description"]));
        lines.push(tableSeparator(3));
        model.relationships.forEach((rel: any) => {
          if (typeof rel === "string") {
            lines.push(tableRow([rel, "", ""]));
          } else {
            lines.push(tableRow([
              rel?.entity || rel?.target || "",
              rel?.type || "",
              rel?.description || ""
            ]));
          }
        });
        lines.push("");
      }
    });
  }

  // Interfaces
  if (spec.interfaces?.length) {
    lines.push("## Interfaces");
    lines.push("");

    spec.interfaces.forEach((iface: any, index: number) => {
      const name = iface?.name || iface?.title || `Interface ${index + 1}`;

      lines.push(`### ${name}`);
      lines.push("");

      if (iface.description) {
        lines.push(String(iface.description));
        lines.push("");
      }

      if (iface.type) {
        lines.push(`**Type**: ${iface.type}`);
        lines.push("");
      }

      // Request/Response
      if (iface.request) {
        lines.push("#### Request");
        lines.push("");
        lines.push("```json");
        lines.push(JSON.stringify(iface.request, null, 2));
        lines.push("```");
        lines.push("");
      }

      if (iface.response) {
        lines.push("#### Response");
        lines.push("");
        lines.push("```json");
        lines.push(JSON.stringify(iface.response, null, 2));
        lines.push("```");
        lines.push("");
      }
    });
  }

  // External Dependencies Summary
  if (spec.external_dependencies_summary?.length) {
    lines.push("## External Dependencies");
    lines.push("");

    spec.external_dependencies_summary.forEach((dep: any, index: number) => {
      const name = dep?.name || dep?.service || `Dependency ${index + 1}`;

      lines.push(`### ${name}`);
      lines.push("");

      if (dep.description) {
        lines.push(String(dep.description));
        lines.push("");
      }

      if (dep.purpose) {
        lines.push(`**Purpose**: ${dep.purpose}`);
        lines.push("");
      }
    });
  }

  return lines.join("\n");
}

/**
 * Export a single plan item to markdown
 */
function exportPlanItemToMarkdown(item: PhasedPlanItem, index: number): string {
  const lines: string[] = [];

  lines.push(`#### Task ${index + 1}: ${item.title}`);
  lines.push("");

  const description = item.detailed_description || item.description;
  if (description) {
    lines.push(String(description));
    lines.push("");
  }

  if (item.estimated_effort) {
    lines.push(`**Estimated Effort**: ${item.estimated_effort}`);
    lines.push("");
  }

  // File Changes
  if (item.file_changes?.length) {
    lines.push("**File Changes**:");
    lines.push("");
    lines.push(tableRow(["Path", "Action", "Purpose", "Verification"]));
    lines.push(tableSeparator(4));
    item.file_changes.forEach((fc) => {
      lines.push(tableRow([
        fc.path,
        fc.action,
        fc.purpose || "",
        fc.verification_method || ""
      ]));
    });
    lines.push("");
  }

  // Verification Criteria
  if (item.verification_criteria?.length) {
    lines.push("**Verification Criteria**:");
    lines.push("");
    item.verification_criteria.forEach((criterion) => {
      lines.push(`- [ ] ${String(criterion)}`);
    });
    lines.push("");
  }

  // Dependencies
  if (item.dependencies?.length) {
    lines.push("**Dependencies**:");
    lines.push("");
    item.dependencies.forEach((dep) => {
      lines.push(`- ${String(dep)}`);
    });
    lines.push("");
  }

  return lines.join("\n");
}

/**
 * Export a phase to markdown
 */
function exportPhaseToMarkdown(phase: PlanPhase, index: number): string {
  const lines: string[] = [];

  lines.push(`## Phase ${index + 1}: ${phase.name}`);
  lines.push("");

  if (phase.description) {
    lines.push(String(phase.description));
    lines.push("");
  }

  if (phase.summary) {
    lines.push("> " + phase.summary);
    lines.push("");
  }

  // Tasks
  if (phase.plan_items?.length) {
    lines.push("### Tasks");
    lines.push("");

    phase.plan_items.forEach((item, itemIndex) => {
      lines.push(exportPlanItemToMarkdown(item, itemIndex));
    });
  }

  // Diagrams
  if (phase.diagrams?.length) {
    lines.push("### Diagrams");
    lines.push("");

    phase.diagrams.forEach((diagram) => {
      if (diagram.title) {
        lines.push(`#### ${diagram.title}`);
        lines.push("");
      }

      if (diagram.description) {
        lines.push(String(diagram.description));
        lines.push("");
      }

      if (diagram.mermaid_code) {
        lines.push("```mermaid");
        lines.push(diagram.mermaid_code);
        lines.push("```");
        lines.push("");
      }
    });
  }

  // Phase dependencies
  if (phase.dependencies?.length) {
    lines.push("### Dependencies");
    lines.push("");
    lines.push("This phase depends on:");
    lines.push("");
    phase.dependencies.forEach((dep) => {
      lines.push(`- ${String(dep)}`);
    });
    lines.push("");
  }

  return lines.join("\n");
}

/**
 * Export plan to Markdown format
 */
export function exportPlanToMarkdown(plan: PhasedPlan): string {
  if (!plan) return "";

  const lines: string[] = [];

  // Title
  lines.push("# Implementation Plan");
  lines.push("");

  // Summary
  if (plan.summary) {
    lines.push("> " + plan.summary);
    lines.push("");
  }

  // Estimated effort
  if (plan.estimated_total_effort) {
    lines.push(`**Estimated Total Effort**: ${plan.estimated_total_effort}`);
    lines.push("");
  }

  // Table of Contents
  if (plan.phases?.length) {
    lines.push("## Table of Contents");
    lines.push("");
    plan.phases.forEach((phase, index) => {
      const anchor = phase.name.toLowerCase().replace(/\s+/g, "-");
      lines.push(`- [Phase ${index + 1}: ${phase.name}](#phase-${index + 1}-${anchor})`);
    });
    lines.push("");
  }

  // Phases
  if (plan.phases?.length) {
    plan.phases.forEach((phase, index) => {
      lines.push(exportPhaseToMarkdown(phase, index));
    });
  }

  // Completion status
  if (plan.is_complete) {
    lines.push("---");
    lines.push("");
    lines.push("**Plan generation complete**");
    lines.push("");
  }

  return lines.join("\n");
}

/**
 * Download content as a file
 */
export function downloadFile(content: string, filename: string, mimeType: string = "text/markdown"): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  try {
    a.click();
  } finally {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}

/**
 * Export and download specification as Markdown
 */
export function downloadSpecAsMarkdown(spec: SpecificationOutput, recipeId?: string): void {
  const markdown = exportSpecToMarkdown(spec);
  const filename = `spec-${recipeId || "export"}-${new Date().toISOString().split("T")[0]}.md`;
  downloadFile(markdown, filename);
}

/**
 * Export and download plan as Markdown
 */
export function downloadPlanAsMarkdown(plan: PhasedPlan, recipeId?: string): void {
  const markdown = exportPlanToMarkdown(plan);
  const filename = `plan-${recipeId || "export"}-${new Date().toISOString().split("T")[0]}.md`;
  downloadFile(markdown, filename);
}
