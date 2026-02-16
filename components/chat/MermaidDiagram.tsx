"use client";

import React, { FC, useState, useEffect, useRef, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { LucideCopy, LucideCopyCheck, Maximize2 } from "lucide-react";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";

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

export const MermaidDiagram: FC<MermaidDiagramProps> = ({ chart }) => {
  const [svg, setSvg] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalSvg, setModalSvg] = useState<string>("");
  const containerRef = useRef<HTMLDivElement>(null);
  const diagramId = useMemo(
    () => `mermaid-${Date.now()}-${Math.random().toString(36)}`,
    [],
  );

  useEffect(() => {
    let isMounted = true;

    const renderDiagram = async () => {
      try {
        // Reset previous state
        setSvg("");
        setError(null);

        if (!chart || !chart.trim()) {
          if (isMounted) {
            setError("Empty chart content");
          }
          return;
        }

        const trimmedChart = chart.trim();
        // Early guard: don't attempt render for non-Mermaid content (e.g. diff, code)
        if (!looksLikeMermaid(trimmedChart)) {
          if (isMounted) {
            setError("Content is not a Mermaid diagram (use graph, flowchart, sequenceDiagram, etc.).");
          }
          return;
        }

        // Dynamically import mermaid for code splitting
        const mermaid = (await import("mermaid")).default;

        // Use a simple, unique ID without special characters
        const simpleId = `diagram${Date.now()}${Math.floor(Math.random() * 1000)}`;

        // Initialize with minimal, safe configuration and better error handling
        mermaid.initialize({
          startOnLoad: false,
          securityLevel: "loose",
          theme: "base",
          themeVariables: {
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
          },
          flowchart: {
            useMaxWidth: true,
            htmlLabels: false,
            padding: 0,
            look: "neo",
          } as any,
          logLevel: "fatal", // Minimize console output
          suppressErrorRendering: true, // Suppress mermaid's built-in error display since we handle errors
        });

        // Clean the chart content and apply intelligent fixes
        let cleanChart = chart.trim();

        // Architecture diagrams: sanitize labels (parser breaks on ., -, :, / inside [...])
        if (cleanChart.match(/^architecture(-beta)?\s/)) {
          cleanChart = sanitizeArchitectureLabels(cleanChart);
        }

        // Inject neo look and dagre layout for flowcharts and graphs
        if (cleanChart.match(/^(flowchart|graph)\s+/)) {
          // Check if already has layout directive
          if (!cleanChart.includes("%%{init:")) {
            // Insert initialization directive at the beginning
            cleanChart = cleanChart.replace(
              /^(flowchart|graph)\s+/,
              "%%{init: {'layout': 'dagre', 'look': 'neo'}}%%\n$1 ",
            );
          } else {
            // Modify existing init to include layout and look
            cleanChart = cleanChart.replace(
              /%%{init:\s*({.*?})}%%/,
              "%%{init: {$1, 'layout': 'dagre', 'look': 'neo'}}%%",
            );
          }
        }

        // Apply intelligent preprocessing to fix common syntax issues
        cleanChart = preprocessMermaidChart(cleanChart);

        const isArchitecture = cleanChart.match(/^architecture(-beta)?\s/);
        let lastError: Error | null = null;

        for (let attempt = 0; attempt < 2; attempt++) {
          const chartToRender = attempt === 1 && isArchitecture
            ? sanitizeArchitectureLabelsStrict(chart.trim())
            : cleanChart;
          if (attempt === 1 && chartToRender === cleanChart) break;

          const renderId = attempt === 1 ? `${simpleId}-retry` : simpleId;
          try {
            const renderResult = await mermaid.render(renderId, chartToRender);

            if (!renderResult || !renderResult.svg) {
              throw new Error("Mermaid render returned empty result");
            }

            if (isMounted) {
              // Clean up any problematic elements in the SVG but preserve colors
              const cleanedSvg = renderResult.svg
            .replace(/<a[^>]*>/g, "<span>")
            .replace(/<\/a>/g, "</span>")
            .replace(/onclick="[^"]*"/g, "")
            .replace(/onmouseover="[^"]*"/g, "")
            .replace(/onmouseout="[^"]*"/g, "")
            .replace(/href="[^"]*"/g, "")
            .replace(/stroke-width="[^"]*"/g, 'stroke-width="1"');

          // Sanitize SVG with DOMPurify configured for Mermaid diagrams
          const { default: DOMPurify } = await import("dompurify");
          const safeSvg = DOMPurify.sanitize(cleanedSvg, {
            USE_PROFILES: { svg: true, svgFilters: true },
            ADD_TAGS: [
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
            ],
            ADD_ATTR: [
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
            ],
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

          // Verify we have a valid SVG
          if (!safeSvg.includes("<svg")) {
            throw new Error("Rendered result is not a valid SVG");
          }

          setSvg(safeSvg);
          setError(null);
            }
            return;
          } catch (err) {
            lastError = err instanceof Error ? err : new Error(String(err));
            if (attempt === 0 && isArchitecture) continue;
            break;
          }
        }

        if (lastError && isMounted) {
          const err = lastError;
          if (process.env.NODE_ENV === "development") {
            console.warn("Mermaid render error:", err.message);
            console.warn("Chart preview (first 120 chars):", chart.trim().slice(0, 120));
          }

          let errorMessage: string;
          if (
            err.message.includes("Parsing failed") ||
            err.message.includes("Parse error") ||
            err.message.includes("Syntax error") ||
            err.message.includes("unexpected character")
          ) {
            errorMessage = "This diagram couldn't be rendered. Copy the source below or try removing special characters (e.g. periods, hyphens) from labels.";
          } else if (
            err.message.includes("Cannot read properties of null") ||
            err.message.includes("Cannot read properties of undefined")
          ) {
            errorMessage = "Mermaid parsing error — likely undefined node or edge reference. Copy the source below.";
          } else if (err.message.includes("Invalid mermaid diagram type")) {
            errorMessage = "Diagram must start with: graph, flowchart, sequenceDiagram, architecture-beta, etc.";
          } else if (err.message.includes("Rendered result is not a valid SVG")) {
            errorMessage = "Mermaid failed to generate valid SVG. Copy the source below.";
          } else if (err.message.includes("Mermaid render returned empty result")) {
            errorMessage = "Mermaid returned empty result. Copy the source below and check syntax.";
          } else {
            errorMessage = "This diagram couldn't be rendered. Copy the source below.";
          }

          setError(errorMessage);
        }
      } catch (outerErr) {
        if (isMounted) {
          setError("Failed to render diagram.");
        }
      }
    };

    // Render immediately when component mounts
    const timeoutId = setTimeout(renderDiagram, 100);

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
    };
  }, [chart]);

  // Keyboard shortcuts effect
  useEffect(() => {
    const handleKeydown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && isModalOpen) {
        setIsModalOpen(false);
      }
    };

    if (isModalOpen) {
      document.addEventListener("keydown", handleKeydown);
      // Prevent body scroll when modal is open
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleKeydown);
      document.body.style.overflow = "";
    };
  }, [isModalOpen]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(chart);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy to clipboard:", err);
      // Fallback for older browsers or when clipboard API is not available
      const textArea = document.createElement("textarea");
      textArea.value = chart;
      textArea.style.position = "fixed";
      textArea.style.opacity = "0";
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand("copy");
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (fallbackErr) {
        console.error("Fallback copy failed:", fallbackErr);
      } finally {
        document.body.removeChild(textArea);
      }
    }
  };

  const handleModalOpen = async () => {
    setIsModalOpen(true);

    // Re-render diagram for modal with larger dimensions
    try {
      const mermaid = (await import("mermaid")).default;
      const simpleId = `modal-diagram${Date.now()}${Math.floor(Math.random() * 1000)}`;

      // Configure for larger modal rendering with explicit sizing
      await mermaid.initialize({
        startOnLoad: false,
        securityLevel: "loose",
        theme: "base",
        themeVariables: {
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
        },
        flowchart: {
          htmlLabels: false,
          useMaxWidth: false,
          padding: 0,
          look: "neo",
        } as any,
        logLevel: "fatal",
        suppressErrorRendering: true,
      });

      // Use the same cleaned chart logic with preprocessing
      let cleanChart = preprocessMermaidChart(chart.trim());
      if (cleanChart.match(/^architecture(-beta)?\s/)) {
        cleanChart = sanitizeArchitectureLabels(cleanChart);
      }

      // Validate before rendering in modal
      if (!looksLikeMermaid(cleanChart)) {
        throw new Error("Content is not a Mermaid diagram.");
      }

      // Inject neo look and dagre layout for flowcharts and graphs
      if (cleanChart.match(/^(flowchart|graph)\s+/)) {
        // Check if already has layout directive
        if (!cleanChart.includes("%%{init:")) {
          // Insert initialization directive at the beginning
          cleanChart = cleanChart.replace(
            /^(flowchart|graph)\s+/,
            "%%{init: {'layout': 'dagre', 'look': 'neo'}}%%\n$1 ",
          );
        } else {
          // Modify existing init to include layout and look
          cleanChart = cleanChart.replace(
            /%%{init:\s*({.*?})}%%/,
            "%%{init: {$1, 'layout': 'dagre', 'look': 'neo'}}%%",
          );
        }
      }

      const { svg: renderedSvg } = await mermaid.render(simpleId, cleanChart);

      let cleanedSvg = renderedSvg
        .replace(/<a[^>]*>/g, "<span>")
        .replace(/<\/a>/g, "</span>")
        .replace(/onclick="[^"]*"/g, "")
        .replace(/onmouseover="[^"]*"/g, "")
        .replace(/onmouseout="[^"]*"/g, "")
        .replace(/href="[^"]*"/g, "")
        .replace(/stroke-width="[^"]*"/g, 'stroke-width="1"');

      // Sanitize SVG with DOMPurify configured for Mermaid diagrams
      const { default: DOMPurify } = await import("dompurify");
      const safeModalSvg = DOMPurify.sanitize(cleanedSvg, {
        USE_PROFILES: { svg: true, svgFilters: true },
        ADD_TAGS: [
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
        ],
        ADD_ATTR: [
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
        ],
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

      // Modify SVG for better scaling in modal
      const scaledSvg = safeModalSvg.replace(
        /<svg([^>]*)>/,
        '<svg$1 style="width: 100%; height: auto; max-width: none; transform: scale(1.5); transform-origin: center;">',
      );

      setModalSvg(scaledSvg);
    } catch (err) {
      console.error("Error rendering modal diagram:", err);
      // Fall back to regular SVG
      setModalSvg(svg);
    }
  };

  if (error) {
    return (
      <div className="relative bg-zinc-50 border border-zinc-200 rounded-lg mt-4 overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-center px-4 py-2 bg-zinc-100 border-b border-zinc-200">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
            </svg>
            <span className="text-sm font-medium text-zinc-700">Diagram Source</span>
            <span className="text-xs text-zinc-400">(preview unavailable)</span>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleCopy();
            }}
            className="text-xs font-medium px-2 py-1 h-6 rounded bg-white hover:bg-zinc-50 border border-zinc-300 cursor-pointer flex items-center gap-1 transition-colors text-zinc-600"
          >
            {copied ? <LucideCopyCheck className="w-3 h-3" /> : <LucideCopy className="w-3 h-3" />}
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
        {/* Source code */}
        <pre className="text-xs text-zinc-700 bg-zinc-50 p-4 overflow-x-auto max-h-64 overflow-y-auto whitespace-pre-wrap font-mono leading-relaxed">
          {chart}
        </pre>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="relative bg-white rounded-none shadow-none mt-4"
    >
      <div className="relative">
        <div
          className="p-4 bg-white rounded-none overflow-x-auto mermaid-diagram"
          dangerouslySetInnerHTML={{ __html: svg }}
        />
        <div className="absolute top-2 right-2 flex gap-1 z-10">
          <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
            <DialogTrigger asChild>
              <button
                onClick={(e) => e.stopPropagation()}
                aria-label="Expand diagram to full screen"
                className="text-xs font-medium px-2 py-1 h-6 rounded bg-white/90 hover:bg-white border border-gray-200 shadow-sm cursor-pointer flex items-center transition-colors text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <Maximize2 className="size-3" />
              </button>
            </DialogTrigger>
            <DialogContent className="max-w-[95vw] max-h-[95vh] w-[95vw] h-[95vh] p-0 overflow-hidden">
              <div className="flex flex-col h-full min-h-[80vh] sm:min-h-[70vh]">
                <div className="absolute top-2 right-2 flex gap-1 z-10">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCopy();
                    }}
                    className="text-xs font-medium px-2 py-1 h-6 rounded bg-white/90 hover:bg-white border border-gray-200 shadow-sm cursor-pointer flex items-center transition-colors text-gray-800"
                  >
                    {copied ? (
                      <LucideCopyCheck className="size-3" />
                    ) : (
                      <LucideCopy className="size-3" />
                    )}
                  </button>
                </div>
                <div
                  className="flex-1 p-6 bg-white overflow-auto min-h-0 flex justify-center items-center"
                  style={{
                    WebkitOverflowScrolling: "touch",
                  }}
                >
                  <div
                    className="flex justify-center items-center"
                    style={{
                      minWidth: "100%",
                      minHeight: "100%",
                      padding: "40px",
                    }}
                    dangerouslySetInnerHTML={{ __html: modalSvg || svg }}
                  />
                </div>
              </div>
            </DialogContent>
          </Dialog>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleCopy();
            }}
            className="text-xs font-medium px-2 py-1 h-6 rounded bg-white/90 hover:bg-white border border-gray-200 shadow-sm cursor-pointer flex items-center transition-colors text-gray-800"
          >
            {copied ? (
              <LucideCopyCheck className="size-3" />
            ) : (
              <LucideCopy className="size-3" />
            )}
          </button>
        </div>
      </div>
      <style jsx>{`
        .mermaid-diagram svg {
          filter: none !important;
        }
        .mermaid-diagram svg * {
          stroke-width: 1px !important;
          stroke-dasharray: none !important;
          opacity: 1 !important;
        }
        .mermaid-diagram svg text {
          font-family: monospace !important;
          font-size: 12px !important;
        }
        .mermaid-diagram svg .edgePath path,
        .mermaid-diagram svg .edgePath .path {
          stroke-width: 1px !important;
          fill: none !important;
        }
        .mermaid-diagram svg .linePath {
          stroke-width: 1px !important;
        }
      `}</style>
    </div>
  );
};
