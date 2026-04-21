"use client";

import React, { FC, useState, useEffect, useRef } from "react";
import {
  LucideCopy,
  LucideCopyCheck,
  Maximize2,
  Minus,
  Plus,
  RotateCcw,
} from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import getHeaders from "@/app/utils/headers.util";

interface MermaidDiagramProps {
  chart: string;
}

// Intelligent preprocessing to fix common mermaid syntax issues
const MERMAID_DIAGRAM_TYPE =
  /^(graph|flowchart|sequenceDiagram|classDiagram|stateDiagram|erDiagram|journey|gantt|pie|gitgraph|requirement|mindmap|timeline|quadrantChart|architecture-beta|architecture)(?:\s|$)/;

/** Returns true if content looks like Mermaid diagram source (starts with a diagram type). */
export const looksLikeMermaid = (content: string): boolean => {
  const trimmed = (content || "").trim();
  if (!trimmed) return false;
  // Diff/code often starts with - or +
  if (/^\s*[-+]/.test(trimmed) || trimmed.startsWith("}")) return false;
  return MERMAID_DIAGRAM_TYPE.test(trimmed);
};

/** Sanitize architecture diagram labels: parser breaks on ., -, :, / inside [...] */
function sanitizeArchitectureLabels(chart: string): string {
  const lines = chart.split("\n");
  const firstLine = lines[0] || "";
  if (!/^architecture(-beta)?\s*$/.test(firstLine.trim())) return chart;
  return lines
    .map((line, i) => {
      if (i === 0) return line;
      return line.replace(/\[([^\]]*)\]/g, (_, label) => {
        const sanitized = label.replace(/[.:\-/]/g, " ").replace(/\s+/g, " ").trim();
        return `[${sanitized}]`;
      });
    })
    .join("\n");
}

/** More aggressive: only allow letters, numbers, spaces in architecture labels (for retry after parse failure). */
function sanitizeArchitectureLabelsStrict(chart: string): string {
  const lines = chart.split("\n");
  const firstLine = lines[0] || "";
  if (!/^architecture(-beta)?\s*$/.test(firstLine.trim())) return chart;
  return lines
    .map((line, i) => {
      if (i === 0) return line;
      return line.replace(/\[([^\]]*)\]/g, (_, label) => {
        const sanitized = label.replace(/[^a-zA-Z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
        return `[${sanitized}]`;
      });
    })
    .join("\n");
}

const preprocessMermaidChart = (chart: string): string => {
  try {
    let processedChart = chart;

    // Preserve the first line (diagram type) to avoid breaking type detection
    const lines = processedChart.split("\n");
    const firstLine = lines[0] || "";

    // Architecture diagrams use different syntax (group/service/edges); skip flowchart preprocessing
    if (/^architecture(-beta)?\s*$/.test(firstLine.trim())) {
      return processedChart;
    }

    // Extract all defined nodes and subgraphs more comprehensively
    const definedNodes = new Set<string>();
    const subgraphs = new Map<string, string[]>();
    let currentSubgraph: string | null = null;

    // First pass: identify all nodes and subgraphs (skip first line which contains diagram type)
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      const trimmedLine = line.trim();

      if (!trimmedLine || trimmedLine.startsWith("%%")) continue;

      // Track subgraph boundaries
      const subgraphMatch = trimmedLine.match(/^subgraph\s+(\w+)(?:\[.*?\])?/);
      if (subgraphMatch) {
        currentSubgraph = subgraphMatch[1];
        subgraphs.set(currentSubgraph, []);
        continue;
      }

      if (trimmedLine === "end") {
        currentSubgraph = null;
        continue;
      }

      // Find all node definitions (more comprehensive patterns)
      const nodePatterns = [
        /(\w+)\[.*?\]/g, // Node with label: NodeName[Label]
        /(\w+)\(".*?"\)/g, // Node with round brackets: NodeName("Label")
        /(\w+)\{.*?\}/g, // Node with curly brackets: NodeName{Label}
        /(\w+)\>.*?\]/g, // Flag node: NodeName>Label]
        /(\w+)\((.*?)\)/g, // Round node: NodeName(Label)
      ];

      for (const pattern of nodePatterns) {
        let match;
        while ((match = pattern.exec(trimmedLine)) !== null) {
          const nodeName = match[1];
          definedNodes.add(nodeName);
          if (currentSubgraph) {
            subgraphs.get(currentSubgraph)?.push(nodeName);
          }
        }
      }

      // Also extract nodes from connections
      const connectionPatterns = [
        /(\w+)\s*(?:--.*?-->|-->|--.*?--)\s*(\w+)/g,
        /(\w+)\s*--.*?-->\s*(\w+)/g,
      ];

      for (const pattern of connectionPatterns) {
        let match;
        while ((match = pattern.exec(trimmedLine)) !== null) {
          definedNodes.add(match[1]);
          definedNodes.add(match[2]);
          if (currentSubgraph) {
            subgraphs.get(currentSubgraph)?.push(match[1]);
            subgraphs.get(currentSubgraph)?.push(match[2]);
          }
        }
      }
    }

    console.log("Defined nodes:", Array.from(definedNodes));
    console.log("Subgraphs:", Object.fromEntries(subgraphs));

    // Second pass: fix undefined references
    let fixedChart = processedChart;
    const fixedLines: string[] = [];

    let activeSubgraph: string | null = null;

    // Always include the first line (diagram type) unchanged
    if (firstLine) {
      fixedLines.push(firstLine);
    }

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      let fixedLine = line;
      const trimmedLine = line.trim();

      // Track subgraph entry/exit for correct insertion scope
      const subgraphEnter = trimmedLine.match(/^subgraph\s+(\w+)(?:\[.*?\])?/);
      if (subgraphEnter) {
        activeSubgraph = subgraphEnter[1];
        fixedLines.push(fixedLine);
        continue;
      }
      if (trimmedLine === "end") {
        activeSubgraph = null;
        fixedLines.push(fixedLine);
        continue;
      }

      // Skip non-connection lines
      if (
        (!trimmedLine.includes("-->") && !trimmedLine.includes("--")) ||
        trimmedLine.startsWith("%%")
      ) {
        fixedLines.push(fixedLine);
        continue;
      }

      // Handle specific problematic patterns

      // Fix: "SDKClient -- HTTP CRUD Calls --> API" where API is a subgraph
      if (
        trimmedLine.includes("-- HTTP CRUD Calls -->") &&
        trimmedLine.includes("API")
      ) {
        if (subgraphs.has("API")) {
          const nodesInAPI = subgraphs.get("API") || [];
          if (nodesInAPI.length > 0) {
            // Replace with first node in API subgraph
            fixedLine = fixedLine.replace(
              /--\s*HTTP\s+CRUD\s+Calls\s*-->\s*API/,
              `-- "HTTP CRUD Calls" --> ${nodesInAPI[0]}`,
            );
            console.log(
              `Auto-fixed: Replaced API subgraph reference with ${nodesInAPI[0]} and quoted label`,
            );
          }
        }
      }

      // Fix: Multi-word labels in connections should be quoted
      fixedLine = fixedLine.replace(
        /--\s*([A-Z][A-Za-z\s]+[A-Za-z])\s*-->/g,
        '-- "$1" -->',
      );

      // Fix: "A0 -- uses -->|"verify_id_token"| firebase_py["firebase.py"]"
      // where firebase_py isn't defined
      const undefinedNodeMatch = fixedLine.match(/-->\|[^|]*\|\s*(\w+)\[/);
      if (undefinedNodeMatch) {
        const undefinedNode = undefinedNodeMatch[1];
        if (!definedNodes.has(undefinedNode)) {
          const indent = activeSubgraph ? "  " : "";
          const nodeDefLine = `${indent}${undefinedNode}["${undefinedNode}"]`;
          fixedLines.push(nodeDefLine);
          definedNodes.add(undefinedNode);
          console.log(
            `Auto-fixed: Added missing node definition for '${undefinedNode}'`,
          );
        }
      }

      // General cleanup: Find isolated words that might be undefined nodes
      // But skip common mermaid keywords and already processed patterns
      const connectionPattern = /(\w+)\s*(?:--.*?-->|-->)\s*(\w+)/;
      const match = connectionPattern.exec(trimmedLine);

      if (match) {
        const [, fromNode, toNode] = match;

        // Check if target is a subgraph name instead of node
        if (subgraphs.has(toNode) && !definedNodes.has(toNode)) {
          const nodesInSubgraph = subgraphs.get(toNode) || [];
          if (nodesInSubgraph.length > 0) {
            const replacement = nodesInSubgraph[0];
            fixedLine = fixedLine.replace(
              new RegExp(`\\b${toNode}\\b`, "g"),
              replacement,
            );
            console.log(
              `Auto-fixed: Replaced subgraph '${toNode}' with node '${replacement}'`,
            );
          }
        }
      }

      fixedLines.push(fixedLine);
    }

    const result = fixedLines.join("\n");

    if (result !== chart) {
      console.log("Chart was auto-fixed");
      console.log("Fixed chart:", result);
    }

    return result;
  } catch (error) {
    console.error("Error in preprocessing:", error);
    return chart; // Return original if preprocessing fails
  }
};

const MERMAID_THEME_VARIABLES = {
  primaryColor: "#f3f4f6",
  primaryTextColor: "#111827",
  primaryBorderColor: "#9ca3af",
  lineColor: "#6b7280",
  secondaryColor: "#ffffff",
  tertiaryColor: "#f9fafb",
  background: "#ffffff",
  mainBkg: "#f3f4f6",
  secondBkg: "#e5e7eb",
  tertiaryBkg: "#f9fafb",
  altLineColor: "#9ca3af",
  sectionBkgColor: "#f3f4f6",
  altSectionBkgColor: "#ffffff",
  gridColor: "#f3f4f6",
  loopTextColor: "#111827",
  noteBkgColor: "#fef3c7",
  noteTextColor: "#92400e",
  activationBkgColor: "#dbeafe",
  activationBorderColor: "#3b82f6",
  sequenceNumberColor: "#1e40af",
  actorBkg: "#f3f4f6",
  actorBorder: "#9ca3af",
  actorTextColor: "#111827",
  actorLineColor: "#6b7280",
  signalColor: "#6b7280",
  signalTextColor: "#111827",
  labelBackgroundBkgColor: "#ffffff",
  labelTextColor: "#111827",
  labelBoxBorderColor: "#d1d5db",
  edgeLabelBackground: "#ffffff",
  clusterBkg: "#f9fafb",
  clusterBorder: "#d1d5db",
  defaultLinkColor: "#6b7280",
  titleColor: "#111827",
  fontFamily: "monospace",
  fontSize: "12px",
};

const DOMPURIFY_ADD_TAGS = [
  "foreignObject",
  "switch",
  "marker",
  "pattern",
  "mask",
  "clipPath",
  "metadata",
  "title",
  "desc",
  "defs",
  "symbol",
  "use",
];

const DOMPURIFY_ADD_ATTR = [
  "style",
  "transform",
  "font-family",
  "font-size",
  "font-weight",
  "text-anchor",
  "fill",
  "stroke",
  "stroke-width",
  "stroke-dasharray",
  "d",
  "cx",
  "cy",
  "r",
  "rx",
  "ry",
  "x",
  "y",
  "x1",
  "y1",
  "x2",
  "y2",
  "width",
  "height",
  "viewBox",
  "preserveAspectRatio",
  "opacity",
  "fill-opacity",
  "stroke-opacity",
  "marker-start",
  "marker-mid",
  "marker-end",
  "clip-path",
  "mask",
  "filter",
  "dominant-baseline",
  "alignment-baseline",
  "baseline-shift",
  "text-decoration",
  "letter-spacing",
  "word-spacing",
  "direction",
  "unicode-bidi",
];

const getMermaidConfig = (useMaxWidth: boolean) => ({
  startOnLoad: false,
  securityLevel: "loose" as const,
  theme: "base" as const,
  themeVariables: MERMAID_THEME_VARIABLES,
  flowchart: {
    useMaxWidth,
    htmlLabels: false,
    padding: 0,
    look: "neo" as const,
  },
  logLevel: "fatal" as const,
  suppressErrorRendering: true,
});

const addRenderDirectives = (chart: string): string => {
  if (!chart.match(/^(flowchart|graph)\s+/)) {
    return chart;
  }

  if (!chart.includes("%%{init:")) {
    return chart.replace(
      /^(flowchart|graph)\s+/,
      "%%{init: {'layout': 'dagre', 'look': 'neo'}}%%\n$1 ",
    );
  }

  return chart.replace(
    /%%{init:\s*({.*?})}%%/,
    "%%{init: {$1, 'layout': 'dagre', 'look': 'neo'}}%%",
  );
};

const normalizeFlowchartChart = (chart: string): string => {
  const lines = chart.split("\n");

  return lines
    .map((line) => {
      const trimmed = line.trim();

      // Markdown-like separators commonly appear in LLM output and break Mermaid parsing.
      if (/^[-_=]{4,}$/.test(trimmed)) {
        return `%% ${trimmed}`;
      }

      // Keep comments untouched.
      if (trimmed.startsWith("%%")) {
        return line;
      }

      // Mermaid often fails with literal "\n" inside bracket labels in flowcharts.
      return line.replace(/\[([^\]]*)\]/g, (_match, label: string) => {
        const normalized = label
          .replace(/\\n/g, "<br/>")
          .replace(/\r?\n/g, " ")
          .trim();
        return `[${normalized}]`;
      });
    })
    .join("\n");
};

const normalizeClassDiagramChart = (chart: string): string => {
  if (!chart.match(/^classDiagram(?:\s|$)/)) {
    return chart;
  }

  let next = chart.trim();

  // Ensure canonical classDiagram header layout.
  next = next.replace(/^classDiagram\s+/, "classDiagram\n");

  // Split chained class definitions that are often emitted in one line.
  next = next.replace(/\}\s*class\s+/g, "}\nclass ");

  // Reflow class bodies: "+a: int +b: str" -> one member per line.
  next = next.replace(
    /class\s+([A-Za-z_]\w*)\s*\{([^}]*)\}/g,
    (_m, className: string, body: string) => {
      const trimmedBody = String(body || "").trim();
      if (!trimmedBody) {
        return `class ${className} {\n}`;
      }

      const members = trimmedBody
        .replace(/\s+/g, " ")
        .split(/\s+(?=[+#~\-])/)
        .map((entry) => entry.trim())
        .filter(Boolean);

      if (!members.length) {
        return `class ${className} {\n}`;
      }

      return `class ${className} {\n  ${members.join("\n  ")}\n}`;
    },
  );

  return next;
};

const normalizeFlowchartForFallback = (chart: string): string => {
  if (!chart.match(/^(flowchart|graph)\s+/)) {
    return chart;
  }

  const normalized = normalizeFlowchartChart(chart);
  return normalized
    .split("\n")
    .map((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("%%")) return line;

      let next = line;

      // Convert HTML breaks to plain spaces for parser stability.
      next = next.replace(/<br\s*\/?>/gi, " ");

      // Sanitize node labels in brackets to avoid parser blowups from odd symbols.
      next = next.replace(/\[([^\]]*)\]/g, (_match, label: string) => {
        const safe = label
          .replace(/[*`{}[\]<>]/g, " ")
          .replace(/\s+/g, " ")
          .trim();
        return `[${safe}]`;
      });

      // Sanitize edge labels but keep meaning.
      next = next.replace(/\|([^|]*)\|/g, (_match, label: string) => {
        const safe = label
          .replace(/[*`{}[\]<>]/g, " ")
          .replace(/\s+/g, " ")
          .trim();
        return `|${safe}|`;
      });

      return next;
    })
    .join("\n");
};

const removeFlowchartEdgeLabels = (chart: string): string => {
  if (!chart.match(/^(flowchart|graph)\s+/)) {
    return chart;
  }
  // Last-resort parser fallback: drop edge labels if they are the root cause.
  return chart
    .replace(/-->\s*\|[^|]*\|\s*/g, "--> ")
    .replace(/--\s*\|[^|]*\|\s*-->/g, "--> ");
};

const stripFlowchartComments = (chart: string): string => {
  if (!chart.match(/^(flowchart|graph)\s+/)) {
    return chart;
  }
  return chart
    .split("\n")
    .filter((line) => !line.trim().startsWith("%%"))
    .join("\n");
};

const autoFixMermaidChart = (chart: string, useStrictArchitectureFix = false): string => {
  let nextChart = chart.trim();
  if (nextChart.match(/^architecture(-beta)?\s/)) {
    nextChart = useStrictArchitectureFix
      ? sanitizeArchitectureLabelsStrict(nextChart)
      : sanitizeArchitectureLabels(nextChart);
  }
  if (nextChart.match(/^(flowchart|graph)\s+/)) {
    nextChart = normalizeFlowchartChart(nextChart);
  }
  if (nextChart.match(/^classDiagram(?:\s|$)/)) {
    nextChart = normalizeClassDiagramChart(nextChart);
  }
  return preprocessMermaidChart(nextChart);
};

const sanitizeRenderedSvg = async (svg: string): Promise<string> => {
  const cleanedSvg = svg
    .replace(/<a[^>]*>/g, "<span>")
    .replace(/<\/a>/g, "</span>")
    .replace(/onclick="[^"]*"/g, "")
    .replace(/onmouseover="[^"]*"/g, "")
    .replace(/onmouseout="[^"]*"/g, "")
    .replace(/href="[^"]*"/g, "")
    .replace(/stroke-width="[^"]*"/g, 'stroke-width="1"');

  const { default: DOMPurify } = await import("dompurify");
  const safeSvg = DOMPurify.sanitize(cleanedSvg, {
    USE_PROFILES: { svg: true, svgFilters: true },
    ADD_TAGS: DOMPURIFY_ADD_TAGS,
    ADD_ATTR: DOMPURIFY_ADD_ATTR,
    FORBID_TAGS: ["script", "object", "embed", "link", "meta", "base"],
    FORBID_ATTR: [
      "onload",
      "onerror",
      "onmouseover",
      "onclick",
      "href",
      "xlink:href",
    ],
  });

  if (!safeSvg.includes("<svg")) {
    throw new Error("Rendered result is not a valid SVG");
  }

  return safeSvg;
};

type MermaidRenderSuccess = {
  svg: string;
  renderedChart: string;
  wasCorrected: boolean;
};

const renderValidatedMermaid = async (chart: string): Promise<MermaidRenderSuccess> => {
  const trimmedChart = chart.trim();

  if (!trimmedChart) {
    throw new Error("Empty chart content");
  }

  if (!looksLikeMermaid(trimmedChart)) {
    throw new Error(
      "Content is not a Mermaid diagram (use graph, flowchart, sequenceDiagram, etc.).",
    );
  }

  const mermaid = (await import("mermaid")).default;
  mermaid.initialize(getMermaidConfig(true));

  const softFixedChart = autoFixMermaidChart(trimmedChart, false);
  const strictArchitectureChart = trimmedChart.match(/^architecture(-beta)?\s/)
    ? autoFixMermaidChart(trimmedChart, true)
    : null;
  const fallbackFlowchartChart = trimmedChart.match(/^(flowchart|graph)\s+/)
    ? normalizeFlowchartForFallback(trimmedChart)
    : null;
  const fallbackFlowchartNoEdgeLabel =
    fallbackFlowchartChart && fallbackFlowchartChart.match(/^(flowchart|graph)\s+/)
      ? removeFlowchartEdgeLabels(fallbackFlowchartChart)
      : null;
  const fallbackFlowchartNoComments =
    fallbackFlowchartNoEdgeLabel &&
    fallbackFlowchartNoEdgeLabel.match(/^(flowchart|graph)\s+/)
      ? stripFlowchartComments(fallbackFlowchartNoEdgeLabel)
      : null;

  const candidates = [
    { chart: trimmedChart, wasCorrected: false },
    ...(softFixedChart !== trimmedChart
      ? [{ chart: softFixedChart, wasCorrected: true }]
      : []),
    ...(strictArchitectureChart &&
    strictArchitectureChart !== trimmedChart &&
    strictArchitectureChart !== softFixedChart
      ? [{ chart: strictArchitectureChart, wasCorrected: true }]
      : []),
    ...(fallbackFlowchartChart &&
    fallbackFlowchartChart !== trimmedChart &&
    fallbackFlowchartChart !== softFixedChart &&
    fallbackFlowchartChart !== strictArchitectureChart
      ? [{ chart: fallbackFlowchartChart, wasCorrected: true }]
      : []),
    ...(fallbackFlowchartNoEdgeLabel &&
    fallbackFlowchartNoEdgeLabel !== trimmedChart &&
    fallbackFlowchartNoEdgeLabel !== softFixedChart &&
    fallbackFlowchartNoEdgeLabel !== strictArchitectureChart &&
    fallbackFlowchartNoEdgeLabel !== fallbackFlowchartChart
      ? [{ chart: fallbackFlowchartNoEdgeLabel, wasCorrected: true }]
      : []),
    ...(fallbackFlowchartNoComments &&
    fallbackFlowchartNoComments !== trimmedChart &&
    fallbackFlowchartNoComments !== softFixedChart &&
    fallbackFlowchartNoComments !== strictArchitectureChart &&
    fallbackFlowchartNoComments !== fallbackFlowchartChart &&
    fallbackFlowchartNoComments !== fallbackFlowchartNoEdgeLabel
      ? [{ chart: fallbackFlowchartNoComments, wasCorrected: true }]
      : []),
  ];

  let lastError: Error | null = null;

  for (let i = 0; i < candidates.length; i++) {
    const candidate = candidates[i];
    try {
      const renderId = `diagram-${Date.now()}-${i}`;
      const renderResult = await mermaid.render(
        renderId,
        addRenderDirectives(candidate.chart),
      );

      if (!renderResult?.svg) {
        throw new Error("Mermaid render returned empty result");
      }

      return {
        svg: await sanitizeRenderedSvg(renderResult.svg),
        renderedChart: candidate.chart,
        wasCorrected: candidate.wasCorrected,
      };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
    }
  }

  throw lastError ?? new Error("Failed to render diagram.");
};

const clampZoom = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, Number(value.toFixed(2))));

const requestMermaidRepair = async (
  diagramCode: string,
  errorMessage: string,
  attempt: number,
): Promise<string | null> => {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
  const endpoint = baseUrl
    ? `${baseUrl}/api/v1/repair-mermaid/`
    : "/api/v1/repair-mermaid/";

  let headers: HeadersInit = {
    "Content-Type": "application/json",
  };
  try {
    const authHeaders = await getHeaders({
      "Content-Type": "application/json",
    });
    headers = authHeaders as unknown as HeadersInit;
  } catch {
    // Fall back to content-type only; caller handles response failures.
  }

  const response = await fetch(endpoint, {
    method: "POST",
    headers,
    body: JSON.stringify({
      diagram_code: diagramCode,
      error_message: errorMessage,
      attempt,
    }),
  });

  if (!response.ok) {
    throw new Error(`Mermaid repair request failed with status ${response.status}`);
  }

  const data = (await response.json()) as { corrected_code?: string };
  const corrected = data.corrected_code?.trim();
  return corrected || null;
};

const requestServerRenderedMermaid = async (
  chart: string,
): Promise<MermaidRenderSuccess | null> => {
  const response = await fetch("/api/render-mermaid", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ chart }),
  });

  if (!response.ok) {
    throw new Error(
      `Server Mermaid render failed with status ${response.status}`,
    );
  }

  const data = (await response.json()) as {
    svg?: string;
    rendered_chart?: string;
    was_corrected?: boolean;
  };

  if (!data.svg || !data.rendered_chart) {
    return null;
  }

  return {
    svg: await sanitizeRenderedSvg(data.svg),
    renderedChart: data.rendered_chart,
    wasCorrected: Boolean(data.was_corrected),
  };
};

interface DiagramViewerProps {
  svg: string;
  height?: string;
  onCopy?: () => void;
  copied?: boolean;
  onOpenFullscreen?: () => void;
  showFullscreenButton?: boolean;
  minZoom?: number;
  maxZoom?: number;
}

const DiagramIconButton: FC<{
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}> = ({ label, onClick, children }) => (
  <button
    type="button"
    onClick={(e) => {
      e.stopPropagation();
      onClick();
    }}
    aria-label={label}
    className="inline-flex size-7 items-center justify-center rounded-full text-gray-700 transition hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
  >
    {children}
  </button>
);

const DiagramViewer: FC<DiagramViewerProps> = ({
  svg,
  height = "min(460px, 55vh)",
  onCopy,
  copied,
  onOpenFullscreen,
  showFullscreenButton,
  minZoom = 0.25,
  maxZoom = 4,
}) => {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef<{
    x: number;
    y: number;
    panX: number;
    panY: number;
  } | null>(null);
  const zoomRef = useRef(zoom);
  const panRef = useRef(pan);
  const viewportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    zoomRef.current = zoom;
  }, [zoom]);
  useEffect(() => {
    panRef.current = pan;
  }, [pan]);

  const clamp = (v: number) => clampZoom(v, minZoom, maxZoom);

  // Normalize Mermaid's SVG so rendering is based on actual diagram content
  // instead of Mermaid's inline sizing defaults.
  useEffect(() => {
    const el = viewportRef.current;
    const svgEl = el?.querySelector("svg") as SVGSVGElement | null;
    if (!el || !svgEl) return;

    // Some server-rendered Mermaid SVGs produce zero-sized foreignObjects,
    // which makes labels invisible even though the nodes rendered.
    svgEl.querySelectorAll("foreignObject").forEach((node) => {
      const foreignObject = node as SVGForeignObjectElement;
      const width = Number(foreignObject.getAttribute("width") || 0);
      const height = Number(foreignObject.getAttribute("height") || 0);
      if (width > 0 && height > 0) return;

      const text = (foreignObject.textContent || "").trim();
      if (!text) return;

      const lines = text.split(/\n+/).map((line) => line.trim()).filter(Boolean);
      const maxLineLength = Math.max(...lines.map((line) => line.length), text.length);
      const estimatedWidth = Math.max(80, maxLineLength * 8 + 24);
      const estimatedHeight = Math.max(20, lines.length * 18 + 8);

      foreignObject.setAttribute("width", String(estimatedWidth));
      foreignObject.setAttribute("height", String(estimatedHeight));
    });

    const contentGroup = (svgEl.querySelector("g.root") ||
      svgEl.querySelector("g")) as SVGGraphicsElement | null;

    let width = 0;
    let height = 0;
    try {
      const bbox = contentGroup?.getBBox() || svgEl.getBBox();
      if (bbox.width > 0 && bbox.height > 0) {
        const pad = 24;
        const x = Math.floor(bbox.x - pad);
        const y = Math.floor(bbox.y - pad);
        width = Math.ceil(bbox.width + pad * 2);
        height = Math.ceil(bbox.height + pad * 2);
        svgEl.setAttribute("viewBox", `${x} ${y} ${width} ${height}`);
      }
    } catch {
      // Fall back to intrinsic sizing below.
    }

    if (!width || !height) {
      const vb = svgEl.viewBox?.baseVal;
      width = vb?.width || Number(svgEl.getAttribute("width")) || 0;
      height = vb?.height || Number(svgEl.getAttribute("height")) || 0;
      if (width > 0 && height > 0 && (!vb || !vb.width || !vb.height)) {
        svgEl.setAttribute("viewBox", `0 0 ${width} ${height}`);
      }
    }

    if (width > 0 && height > 0) {
      svgEl.setAttribute("width", String(width));
      svgEl.setAttribute("height", String(height));
    }

    svgEl.setAttribute("preserveAspectRatio", "xMinYMin meet");
    svgEl.style.maxWidth = "none";
    svgEl.style.width = width > 0 ? `${width}px` : "auto";
    svgEl.style.height = height > 0 ? `${height}px` : "auto";
  }, [svg]);

  const measureNatural = React.useCallback(() => {
    const el = viewportRef.current;
    const svgEl = el?.querySelector("svg") as SVGSVGElement | null;
    if (!el || !svgEl) return null;

    let bboxX = 0;
    let bboxY = 0;
    let bboxW = 0;
    let bboxH = 0;
    try {
      const bbox = svgEl.getBBox();
      bboxX = bbox.x;
      bboxY = bbox.y;
      bboxW = bbox.width;
      bboxH = bbox.height;
    } catch {
      // getBBox can throw if not rendered yet
    }

    const vb = svgEl.viewBox?.baseVal;
    const rect = svgEl.getBoundingClientRect();

    if (!bboxW || !bboxH) {
      bboxW = vb?.width || rect.width || 1;
      bboxH = vb?.height || rect.height || 1;
      bboxX = vb?.x || 0;
      bboxY = vb?.y || 0;
    }

    return { bboxX, bboxY, bboxW, bboxH, el };
  }, []);

  const centerAtZoom = React.useCallback(
    (z: number) => {
      const m = measureNatural();
      if (!m) return;
      const scaledW = m.bboxW * z;
      const scaledH = m.bboxH * z;
      const pad = 16;
      setZoom(z);
      setPan({
        x: (m.el.clientWidth - scaledW) / 2 - m.bboxX * z,
        y:
          scaledH <= m.el.clientHeight
            ? (m.el.clientHeight - scaledH) / 2 - m.bboxY * z
            : pad - m.bboxY * z,
      });
    },
    [measureNatural],
  );

  // "Fit to view": fit actual content bounds (bbox), not entire SVG canvas.
  const fitToView = React.useCallback(() => {
    const m = measureNatural();
    if (!m) return;
    const pad = 32;
    const availW = Math.max(100, m.el.clientWidth - pad);
    const availH = Math.max(100, m.el.clientHeight - pad);
    const scale = clamp(Math.min(availW / m.bboxW, availH / m.bboxH));
    centerAtZoom(scale);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [measureNatural, centerAtZoom, minZoom, maxZoom]);

  // On load: fill most of the viewport width using content bounds so diagrams
  // never appear tiny in a giant empty canvas.
  const resetInitialView = React.useCallback(() => {
    const m = measureNatural();
    if (!m) return;
    const pad = 32;
    const availW = Math.max(100, m.el.clientWidth - pad);
    const targetWidth = availW * 0.92;
    const initial = clamp(targetWidth / m.bboxW);
    centerAtZoom(initial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [measureNatural, centerAtZoom, minZoom, maxZoom]);

  useEffect(() => {
    if (!svg) return;
    let raf1 = 0;
    let raf2 = 0;
    raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => resetInitialView());
    });
    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
    };
  }, [svg, resetInitialView]);

  useEffect(() => {
    const el = viewportRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    let firstCallback = true;
    const ro = new ResizeObserver(() => {
      // Skip the very first immediate callback (initial observe).
      if (firstCallback) {
        firstCallback = false;
        return;
      }
      fitToView();
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [fitToView]);

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const cx = e.clientX - rect.left;
      const cy = e.clientY - rect.top;
      const factor = e.deltaY < 0 ? 1.1 : 0.9;
      const prevZoom = zoomRef.current;
      const nextZoom = clamp(prevZoom * factor);
      if (nextZoom === prevZoom) return;
      const scale = nextZoom / prevZoom;
      const prev = panRef.current;
      setZoom(nextZoom);
      setPan({
        x: cx - (cx - prev.x) * scale,
        y: cy - (cy - prev.y) * scale,
      });
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel as EventListener);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!isPanning) return;
    const onMove = (e: MouseEvent) => {
      const s = panStartRef.current;
      if (!s) return;
      setPan({
        x: s.panX + (e.clientX - s.x),
        y: s.panY + (e.clientY - s.y),
      });
    };
    const onUp = () => setIsPanning(false);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [isPanning]);

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    panStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      panX: pan.x,
      panY: pan.y,
    };
    setIsPanning(true);
  };

  const zoomFromCenter = (factor: number) => {
    const el = viewportRef.current;
    const cx = el ? el.clientWidth / 2 : 0;
    const cy = el ? el.clientHeight / 2 : 0;
    const prevZoom = zoomRef.current;
    const nextZoom = clamp(prevZoom * factor);
    if (nextZoom === prevZoom) return;
    const scale = nextZoom / prevZoom;
    const prev = panRef.current;
    setZoom(nextZoom);
    setPan({
      x: cx - (cx - prev.x) * scale,
      y: cy - (cy - prev.y) * scale,
    });
  };

  const resetToActualSize = () => centerAtZoom(1);

  return (
    <div
      className="diagram-viewer relative w-full overflow-hidden rounded-xl border border-gray-200 bg-[linear-gradient(#fcfcfd,#f5f6f8)]"
      style={{ height }}
    >
      <div
        ref={viewportRef}
        className="absolute inset-0 select-none"
        onMouseDown={handleMouseDown}
        style={{ cursor: isPanning ? "grabbing" : "grab" }}
      >
        <div
          className="mermaid-diagram-stage"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: "0 0",
            willChange: "transform",
          }}
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      </div>

      <div className="pointer-events-auto absolute bottom-3 right-3 z-10 flex items-center gap-0.5 rounded-full border border-gray-200 bg-white/95 px-1 py-1 shadow-md backdrop-blur">
        <DiagramIconButton
          label="Zoom out"
          onClick={() => zoomFromCenter(0.9)}
        >
          <Minus className="size-3.5" />
        </DiagramIconButton>
        <button
          type="button"
          onClick={resetToActualSize}
          className="min-w-[52px] rounded-full px-2 h-7 text-[11px] font-medium text-gray-700 hover:bg-gray-100 transition"
          aria-label="Reset to actual size"
          title="Reset to 100%"
        >
          {Math.round(zoom * 100)}%
        </button>
        <DiagramIconButton label="Zoom in" onClick={() => zoomFromCenter(1.1)}>
          <Plus className="size-3.5" />
        </DiagramIconButton>
        <div className="mx-1 h-4 w-px bg-gray-200" />
        <button
          type="button"
          onClick={fitToView}
          className="inline-flex items-center gap-1 rounded-full px-2 h-7 text-[11px] font-medium text-gray-700 hover:bg-gray-100 transition"
          aria-label="Fit to view"
          title="Fit to view"
        >
          <RotateCcw className="size-3" />
          Fit
        </button>
        {onCopy ? (
          <DiagramIconButton label="Copy source" onClick={onCopy}>
            {copied ? (
              <LucideCopyCheck className="size-3.5" />
            ) : (
              <LucideCopy className="size-3.5" />
            )}
          </DiagramIconButton>
        ) : null}
        {showFullscreenButton && onOpenFullscreen ? (
          <DiagramIconButton
            label="Open fullscreen"
            onClick={onOpenFullscreen}
          >
            <Maximize2 className="size-3.5" />
          </DiagramIconButton>
        ) : null}
      </div>

      <div className="pointer-events-none absolute bottom-3 left-3 z-10 hidden sm:block">
        <span className="rounded-full bg-white/80 px-2 py-1 text-[10px] font-medium text-gray-500 border border-gray-200 backdrop-blur">
          Drag to pan · ⌘/Ctrl + scroll to zoom
        </span>
      </div>
    </div>
  );
};

export const MermaidDiagram: FC<MermaidDiagramProps> = ({ chart }) => {
  const [svg, setSvg] = useState("");
  const [resolvedChart, setResolvedChart] = useState(chart.trim());
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [wasCorrected, setWasCorrected] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let isMounted = true;

    const renderDiagram = async () => {
      try {
        setSvg("");
        setError(null);
        setResolvedChart(chart.trim());
        setWasCorrected(false);

        const result = await renderValidatedMermaid(chart);
        if (!isMounted) return;

        setSvg(result.svg);
        setResolvedChart(result.renderedChart);
        setWasCorrected(result.wasCorrected);
      } catch (err) {
        if (!isMounted) return;
        let lastErrorMessage =
          err instanceof Error ? err.message : "Failed to render diagram.";

        let latestChart = chart.trim();
        for (let attempt = 1; attempt <= 3; attempt++) {
          try {
            const repairedChart = await requestMermaidRepair(
              latestChart,
              lastErrorMessage,
              attempt,
            );
            if (!repairedChart || repairedChart === latestChart) {
              break;
            }

            latestChart = repairedChart;
            const repairedResult = await renderValidatedMermaid(repairedChart);
            if (!isMounted) return;

            setSvg(repairedResult.svg);
            setResolvedChart(repairedResult.renderedChart);
            setWasCorrected(true);
            setError(null);
            return;
          } catch (repairError) {
            lastErrorMessage =
              repairError instanceof Error
                ? repairError.message
                : "Failed to repair diagram.";
          }
        }

        try {
          const serverRendered = await requestServerRenderedMermaid(latestChart);
          if (!isMounted || !serverRendered) return;

          setSvg(serverRendered.svg);
          setResolvedChart(serverRendered.renderedChart);
          setWasCorrected(
            serverRendered.wasCorrected || latestChart.trim() !== chart.trim(),
          );
          setError(null);
          return;
        } catch (serverRenderError) {
          lastErrorMessage =
            serverRenderError instanceof Error
              ? serverRenderError.message
              : "Failed to render Mermaid on the server.";
        }

        setResolvedChart(chart.trim());
        setWasCorrected(false);

        if (
          lastErrorMessage.includes("Parsing failed") ||
          lastErrorMessage.includes("Parse error") ||
          lastErrorMessage.includes("Syntax error") ||
          lastErrorMessage.includes("unexpected character")
        ) {
          setError(
            "This diagram could not be repaired automatically. Copy the Mermaid source below.",
          );
        } else if (
          lastErrorMessage.includes("Cannot read properties of null") ||
          lastErrorMessage.includes("Cannot read properties of undefined")
        ) {
          setError(
            "Mermaid parsing error — likely an undefined node or edge reference. Copy the Mermaid source below.",
          );
        } else if (lastErrorMessage.includes("Invalid mermaid diagram type")) {
          setError(
            "Diagram must start with: graph, flowchart, sequenceDiagram, architecture-beta, etc.",
          );
        } else {
          setError(lastErrorMessage || "Failed to render diagram.");
        }
      }
    };

    const timeoutId = setTimeout(renderDiagram, 100);

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
    };
  }, [chart]);

  useEffect(() => {
    const handleKeydown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && isModalOpen) {
        setIsModalOpen(false);
      }
    };

    if (isModalOpen) {
      document.addEventListener("keydown", handleKeydown);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleKeydown);
      document.body.style.overflow = "";
    };
  }, [isModalOpen]);

  const copyText = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy to clipboard:", err);
      const textArea = document.createElement("textarea");
      textArea.value = text;
      textArea.style.position = "fixed";
      textArea.style.opacity = "0";
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand("copy");
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } finally {
        document.body.removeChild(textArea);
      }
    }
  };

  const handleCopySource = () => {
    void copyText(wasCorrected ? resolvedChart : chart);
  };

  const handleCopyOriginal = () => {
    void copyText(chart);
  };

  if (error) {
    return (
      <div className="relative bg-zinc-50 border border-zinc-200 rounded-lg mt-4 overflow-hidden">
        <div className="flex justify-between items-center px-4 py-2 bg-zinc-100 border-b border-zinc-200">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
            </svg>
            <span className="text-sm font-medium text-zinc-700">Diagram Source</span>
            <span className="text-xs text-zinc-400">(preview unavailable)</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleCopyOriginal();
              }}
              className="text-xs font-medium px-2 py-1 h-6 rounded bg-white hover:bg-zinc-50 border border-zinc-300 cursor-pointer flex items-center gap-1 transition-colors text-zinc-600"
            >
              {copied ? <LucideCopyCheck className="w-3 h-3" /> : <LucideCopy className="w-3 h-3" />}
              {copied ? "Copied" : "Copy source"}
            </button>
          </div>
        </div>
        <pre className="text-xs text-zinc-700 bg-zinc-50 p-4 overflow-x-auto max-h-64 overflow-y-auto whitespace-pre-wrap font-mono leading-relaxed">
          {chart}
        </pre>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative mt-4">
      {wasCorrected ? (
        <div className="mb-2 flex items-center justify-end px-1">
          <button
            type="button"
            onClick={handleCopySource}
            className="text-xs text-zinc-500 underline underline-offset-2 hover:text-zinc-900"
          >
            Copy fixed code
          </button>
        </div>
      ) : null}

      <DiagramViewer
        svg={svg}
        onCopy={handleCopySource}
        copied={copied}
        showFullscreenButton
        onOpenFullscreen={() => setIsModalOpen(true)}
      />

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] w-[95vw] h-[95vh] p-0 overflow-hidden">
          <div className="flex h-full w-full flex-col bg-white">
            <DiagramViewer
              svg={svg}
              height="100%"
              onCopy={handleCopySource}
              copied={copied}
              maxZoom={6}
              minZoom={0.1}
            />
          </div>
        </DialogContent>
      </Dialog>

      <style jsx global>{`
        .diagram-viewer .mermaid-diagram-stage {
          display: inline-block;
        }
        .diagram-viewer .mermaid-diagram-stage svg {
          display: block;
          max-width: none !important;
          height: auto !important;
          filter: none !important;
        }
        .diagram-viewer {
          background-image:
            linear-gradient(to right, rgba(148, 163, 184, 0.08) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(148, 163, 184, 0.08) 1px, transparent 1px),
            linear-gradient(#fcfcfd, #f5f6f8);
          background-size: 24px 24px, 24px 24px, 100% 100%;
        }
        .diagram-viewer .mermaid-diagram-stage svg * {
          opacity: 1 !important;
        }
        .diagram-viewer .mermaid-diagram-stage svg text {
          font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI",
            Roboto, "Helvetica Neue", Arial, sans-serif !important;
          font-size: 14px !important;
        }
        .diagram-viewer .mermaid-diagram-stage svg .edgePath path,
        .diagram-viewer .mermaid-diagram-stage svg .edgePath .path,
        .diagram-viewer .mermaid-diagram-stage svg .linePath {
          stroke-width: 1.5px !important;
          fill: none !important;
        }
        .diagram-viewer .mermaid-diagram-stage svg rect,
        .diagram-viewer .mermaid-diagram-stage svg polygon,
        .diagram-viewer .mermaid-diagram-stage svg circle,
        .diagram-viewer .mermaid-diagram-stage svg ellipse,
        .diagram-viewer .mermaid-diagram-stage svg path {
          stroke: #94a3b8 !important;
        }
      `}</style>
    </div>
  );
};
