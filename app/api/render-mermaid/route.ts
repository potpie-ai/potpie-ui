import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

type MermaidRenderResponse = {
  svg: string;
  rendered_chart: string;
  was_corrected: boolean;
};

const MERMAID_DIAGRAM_TYPE =
  /^(graph|flowchart|sequenceDiagram|classDiagram|stateDiagram|erDiagram|journey|gantt|pie|gitgraph|requirement|mindmap|timeline|quadrantChart|architecture-beta|architecture)(?:\s|$)/;

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

const looksLikeMermaid = (content: string): boolean => {
  const trimmed = (content || "").trim();
  if (!trimmed) return false;
  if (/^\s*[-+]/.test(trimmed) || trimmed.startsWith("}")) return false;
  return MERMAID_DIAGRAM_TYPE.test(trimmed);
};

function sanitizeArchitectureLabels(chart: string): string {
  const lines = chart.split("\n");
  const firstLine = lines[0] || "";
  if (!/^architecture(-beta)?\s*$/.test(firstLine.trim())) return chart;
  return lines
    .map((line, i) => {
      if (i === 0) return line;
      return line.replace(/\[([^\]]*)\]/g, (_, label) => {
        const sanitized = label
          .replace(/[.:\-/]/g, " ")
          .replace(/\s+/g, " ")
          .trim();
        return `[${sanitized}]`;
      });
    })
    .join("\n");
}

function sanitizeArchitectureLabelsStrict(chart: string): string {
  const lines = chart.split("\n");
  const firstLine = lines[0] || "";
  if (!/^architecture(-beta)?\s*$/.test(firstLine.trim())) return chart;
  return lines
    .map((line, i) => {
      if (i === 0) return line;
      return line.replace(/\[([^\]]*)\]/g, (_, label) => {
        const sanitized = label
          .replace(/[^a-zA-Z0-9\s]/g, " ")
          .replace(/\s+/g, " ")
          .trim();
        return `[${sanitized}]`;
      });
    })
    .join("\n");
}

const normalizeFlowchartChart = (chart: string): string => {
  return chart
    .split("\n")
    .map((line) => {
      const trimmed = line.trim();
      if (/^[-_=]{4,}$/.test(trimmed)) {
        return `%% ${trimmed}`;
      }
      if (trimmed.startsWith("%%")) {
        return line;
      }
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
  next = next.replace(/^classDiagram\s+/, "classDiagram\n");
  next = next.replace(/\}\s*class\s+/g, "}\nclass ");

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

      return members.length
        ? `class ${className} {\n  ${members.join("\n  ")}\n}`
        : `class ${className} {\n}`;
    },
  );

  return next;
};

const normalizeFlowchartForFallback = (chart: string): string => {
  if (!chart.match(/^(flowchart|graph)\s+/)) {
    return chart;
  }

  return normalizeFlowchartChart(chart)
    .split("\n")
    .map((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("%%")) return line;

      let next = line.replace(/<br\s*\/?>/gi, " ");
      next = next.replace(/\[([^\]]*)\]/g, (_match, label: string) => {
        const safe = label
          .replace(/[*`{}[\]<>]/g, " ")
          .replace(/\s+/g, " ")
          .trim();
        return `[${safe}]`;
      });
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

const autoFixMermaidChart = (
  chart: string,
  useStrictArchitectureFix = false,
): string => {
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
  return nextChart;
};

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

const getMermaidConfig = () => ({
  startOnLoad: false,
  securityLevel: "loose" as const,
  theme: "base" as const,
  themeVariables: MERMAID_THEME_VARIABLES,
  flowchart: {
    useMaxWidth: false,
    htmlLabels: false,
    padding: 0,
    look: "neo" as const,
  },
  logLevel: "fatal" as const,
  suppressErrorRendering: true,
});

const buildRenderCandidates = (chart: string) => {
  const trimmedChart = chart.trim();
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

  return [
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
};

const setupServerDom = async () => {
  // Avoid bundling jsdom into the route during Next build analysis.
  // A plain dynamic import with a string literal can still get statically traced.
  const { JSDOM } = await new Function('return import("jsdom")')();
  const dom = new JSDOM(
    "<!doctype html><html><body><div id='mermaid-root'></div></body></html>",
    { pretendToBeVisual: true },
  );

  const { window } = dom;
  const assignGlobal = (key: string, value: unknown) => {
    Object.defineProperty(globalThis, key, {
      value,
      configurable: true,
      writable: true,
    });
  };

  assignGlobal("window", window);
  assignGlobal("document", window.document);
  assignGlobal("Element", window.Element);
  assignGlobal("HTMLElement", window.HTMLElement);
  assignGlobal("SVGElement", window.SVGElement);
  assignGlobal("Node", window.Node);
  assignGlobal("navigator", window.navigator);
  assignGlobal("location", window.location);
  assignGlobal("getComputedStyle", window.getComputedStyle.bind(window));
  assignGlobal("DOMParser", window.DOMParser);
  assignGlobal("XMLSerializer", window.XMLSerializer);
  assignGlobal("MutationObserver", window.MutationObserver);
  assignGlobal(
    "requestAnimationFrame",
    window.requestAnimationFrame.bind(window),
  );
  assignGlobal(
    "cancelAnimationFrame",
    window.cancelAnimationFrame.bind(window),
  );
  assignGlobal("matchMedia", () => ({
    matches: false,
    media: "",
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }));

  const svgProto = window.SVGElement?.prototype as
    | (SVGElement & {
        getBBox?: () => {
          x: number;
          y: number;
          width: number;
          height: number;
        };
        getComputedTextLength?: () => number;
      })
    | undefined;

  if (svgProto && !svgProto.getBBox) {
    svgProto.getBBox = function () {
      const widthAttr = Number(this.getAttribute("width")) || 0;
      const heightAttr = Number(this.getAttribute("height")) || 0;
      const viewBox = this.getAttribute("viewBox");
      const text = (this.textContent || "").trim();

      if (viewBox) {
        const [, , width, height] = viewBox
          .split(/[\s,]+/)
          .map((value) => Number(value) || 0);
        if (width && height) {
          return { x: 0, y: 0, width, height };
        }
      }

      if (text) {
        return {
          x: 0,
          y: 0,
          width: Math.max(8, text.length * 8),
          height: 16,
        };
      }

      return {
        x: 0,
        y: 0,
        width: widthAttr || 120,
        height: heightAttr || 40,
      };
    };
  }

  if (svgProto && !svgProto.getComputedTextLength) {
    svgProto.getComputedTextLength = function () {
      const text = (this.textContent || "").trim();
      return Math.max(8, text.length * 8);
    };
  }

  return dom;
};

const renderMermaidServerSide = async (
  chart: string,
): Promise<MermaidRenderResponse> => {
  const trimmedChart = chart.trim();
  if (!trimmedChart) {
    throw new Error("Empty chart content");
  }
  if (!looksLikeMermaid(trimmedChart)) {
    throw new Error(
      "Content is not a Mermaid diagram (use graph, flowchart, sequenceDiagram, etc.).",
    );
  }

  const dom = await setupServerDom();
  const mermaid = (await import("mermaid")).default;
  mermaid.initialize(getMermaidConfig());

  let lastError: Error | null = null;
  const candidates = buildRenderCandidates(trimmedChart);

  for (let i = 0; i < candidates.length; i++) {
    const candidate = candidates[i];
    try {
      const renderId = `server-mermaid-${Date.now()}-${i}`;
      const renderResult = await mermaid.render(
        renderId,
        addRenderDirectives(candidate.chart),
      );

      if (!renderResult?.svg) {
        throw new Error("Mermaid render returned empty result");
      }

      const svg = renderResult.svg;
      dom.window.close();
      return {
        svg,
        rendered_chart: candidate.chart,
        was_corrected: candidate.wasCorrected,
      };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
    }
  }

  dom.window.close();
  throw lastError ?? new Error("Failed to render diagram.");
};

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { chart?: string };
    const chart = body.chart?.trim();

    if (!chart) {
      return NextResponse.json(
        { error: "chart is required" },
        { status: 400 },
      );
    }

    const result = await renderMermaidServerSide(chart);
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to render Mermaid";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
