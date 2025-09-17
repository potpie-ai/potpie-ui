"use client";

import React, { FC, useState, useEffect, useRef, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { LucideCopy, LucideCopyCheck, Maximize2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from "@/components/ui/dialog";

interface MermaidDiagramProps {
  chart: string;
}

// Intelligent preprocessing to fix common mermaid syntax issues
const preprocessMermaidChart = (chart: string): string => {
  try {
    let processedChart = chart;

    console.log('Original chart:', chart);

    // Extract all defined nodes and subgraphs more comprehensively
    const definedNodes = new Set<string>();
    const subgraphs = new Map<string, string[]>();
    const lines = processedChart.split('\n');
    let currentSubgraph: string | null = null;

    // First pass: identify all nodes and subgraphs
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmedLine = line.trim();

      if (!trimmedLine || trimmedLine.startsWith('%%')) continue;

      // Track subgraph boundaries
      const subgraphMatch = trimmedLine.match(/^subgraph\s+(\w+)(?:\[.*?\])?/);
      if (subgraphMatch) {
        currentSubgraph = subgraphMatch[1];
        subgraphs.set(currentSubgraph, []);
        continue;
      }

      if (trimmedLine === 'end') {
        currentSubgraph = null;
        continue;
      }

      // Find all node definitions (more comprehensive patterns)
      const nodePatterns = [
        /(\w+)\[.*?\]/g,  // Node with label: NodeName[Label]
        /(\w+)\(".*?"\)/g, // Node with round brackets: NodeName("Label")
        /(\w+)\{.*?\}/g,   // Node with curly brackets: NodeName{Label}
        /(\w+)\>.*?\]/g,   // Flag node: NodeName>Label]
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

    console.log('Defined nodes:', Array.from(definedNodes));
    console.log('Subgraphs:', Object.fromEntries(subgraphs));

    // Second pass: fix undefined references
    let fixedChart = processedChart;
    const fixedLines: string[] = [];

    let activeSubgraph: string | null = null;
    for (const line of lines) {
      let fixedLine = line;
      const trimmedLine = line.trim();

      // Track subgraph entry/exit for correct insertion scope
      const subgraphEnter = trimmedLine.match(/^subgraph\s+(\w+)(?:\[.*?\])?/);
      if (subgraphEnter) {
        activeSubgraph = subgraphEnter[1];
        fixedLines.push(fixedLine);
        continue;
      }
      if (trimmedLine === 'end') {
        activeSubgraph = null;
        fixedLines.push(fixedLine);
        continue;
      }

      // Skip non-connection lines
      if (!trimmedLine.includes('-->') && !trimmedLine.includes('--') || trimmedLine.startsWith('%%')) {
        fixedLines.push(fixedLine);
        continue;
      }

      // Handle specific problematic patterns

      // Fix: "SDKClient -- HTTP CRUD Calls --> API" where API is a subgraph
      if (trimmedLine.includes('-- HTTP CRUD Calls -->') && trimmedLine.includes('API')) {
        if (subgraphs.has('API')) {
          const nodesInAPI = subgraphs.get('API') || [];
          if (nodesInAPI.length > 0) {
            // Replace with first node in API subgraph
            fixedLine = fixedLine.replace(/--\s*HTTP\s+CRUD\s+Calls\s*-->\s*API/, `-- "HTTP CRUD Calls" --> ${nodesInAPI[0]}`);
            console.log(`Auto-fixed: Replaced API subgraph reference with ${nodesInAPI[0]} and quoted label`);
          }
        }
      }

      // Fix: Multi-word labels in connections should be quoted
      fixedLine = fixedLine.replace(/--\s*([A-Z][A-Za-z\s]+[A-Za-z])\s*-->/g, '-- "$1" -->');

      // Fix: "A0 -- uses -->|"verify_id_token"| firebase_py["firebase.py"]"
      // where firebase_py isn't defined
      const undefinedNodeMatch = fixedLine.match(/-->\|[^|]*\|\s*(\w+)\[/);
      if (undefinedNodeMatch) {
        const undefinedNode = undefinedNodeMatch[1];
        if (!definedNodes.has(undefinedNode)) {
          const indent = activeSubgraph ? '  ' : '';
          const nodeDefLine = `${indent}${undefinedNode}["${undefinedNode}"]`;
          fixedLines.push(nodeDefLine);
          definedNodes.add(undefinedNode);
          console.log(`Auto-fixed: Added missing node definition for '${undefinedNode}'`);
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
            fixedLine = fixedLine.replace(new RegExp(`\\b${toNode}\\b`, 'g'), replacement);
            console.log(`Auto-fixed: Replaced subgraph '${toNode}' with node '${replacement}'`);
          }
        }
      }

      fixedLines.push(fixedLine);
    }

    const result = fixedLines.join('\n');

    if (result !== chart) {
      console.log('Chart was auto-fixed');
      console.log('Fixed chart:', result);
    }

    return result;
  } catch (error) {
    console.error('Error in preprocessing:', error);
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
  const diagramId = useMemo(() => `mermaid-${Date.now()}-${Math.random().toString(36)}`, []);

  useEffect(() => {
    let isMounted = true;

    const renderDiagram = async () => {
      try {
        // Reset previous state
        setSvg("");
        setError(null);

        if (!chart || !chart.trim()) {
          if (isMounted) {
            setError('Empty chart content');
          }
          return;
        }

        // Dynamically import mermaid for code splitting
        const mermaid = (await import('mermaid')).default;

        // Use a simple, unique ID without special characters
        const simpleId = `diagram${Date.now()}${Math.floor(Math.random() * 1000)}`;

        // Initialize with minimal, safe configuration and better error handling
        mermaid.initialize({
          startOnLoad: false,
          securityLevel: 'loose',
          theme: 'default',
          flowchart: {
            useMaxWidth: true,
            htmlLabels: false
          },
          logLevel: 'fatal', // Minimize console output
          suppressErrorRendering: true // Suppress mermaid's built-in error display since we handle errors
        });

        // Clean the chart content and apply intelligent fixes
        let cleanChart = chart.trim();

        // Validate basic mermaid syntax before attempting render
        if (!cleanChart.match(/^(graph|flowchart|sequenceDiagram|classDiagram|stateDiagram|erDiagram|journey|gantt|pie|gitgraph|requirement|mindmap|timeline|quadrantChart)/)) {
          throw new Error('Invalid mermaid diagram type. Must start with graph, flowchart, etc.');
        }

        // Apply intelligent preprocessing to fix common syntax issues
        cleanChart = preprocessMermaidChart(cleanChart);

        // Use the modern render API with better error handling
        const renderResult = await mermaid.render(simpleId, cleanChart);

        if (!renderResult || !renderResult.svg) {
          throw new Error('Mermaid render returned empty result');
        }

        if (isMounted) {
          // Clean up any problematic elements in the SVG
          const cleanedSvg = renderResult.svg
            .replace(/<a[^>]*>/g, '<span>')
            .replace(/<\/a>/g, '</span>')
            .replace(/onclick="[^"]*"/g, '')
            .replace(/onmouseover="[^"]*"/g, '')
            .replace(/onmouseout="[^"]*"/g, '')
            .replace(/href="[^"]*"/g, '');

          // Sanitize SVG with DOMPurify configured for Mermaid diagrams
          const { default: DOMPurify } = await import('dompurify');
          const safeSvg = DOMPurify.sanitize(cleanedSvg, {
            USE_PROFILES: { svg: true, svgFilters: true },
            ADD_TAGS: [
              'foreignObject', 'switch', 'marker', 'pattern', 'mask', 'clipPath',
              'metadata', 'title', 'desc', 'defs', 'symbol', 'use'
            ],
            ADD_ATTR: [
              'style', 'transform', 'font-family', 'font-size', 'font-weight',
              'text-anchor', 'fill', 'stroke', 'stroke-width', 'stroke-dasharray',
              'd', 'cx', 'cy', 'r', 'rx', 'ry', 'x', 'y', 'x1', 'y1', 'x2', 'y2',
              'width', 'height', 'viewBox', 'preserveAspectRatio', 'opacity',
              'fill-opacity', 'stroke-opacity', 'marker-start', 'marker-mid', 'marker-end',
              'clip-path', 'mask', 'filter', 'dominant-baseline', 'alignment-baseline',
              'baseline-shift', 'text-decoration', 'letter-spacing', 'word-spacing',
              'direction', 'unicode-bidi'
            ],
            FORBID_TAGS: ['script', 'object', 'embed', 'link', 'meta', 'base'],
            FORBID_ATTR: ['onload', 'onerror', 'onmouseover', 'onclick', 'href', 'xlink:href']
          });

          // Verify we have a valid SVG
          if (!safeSvg.includes('<svg')) {
            throw new Error('Rendered result is not a valid SVG');
          }

          setSvg(safeSvg);
          setError(null);
        }

      } catch (err) {
        console.error('Mermaid render error:', err);
        console.error('Chart content that failed:', chart);
        console.error('Error type:', typeof err, err?.constructor?.name);

        if (isMounted) {
          let errorMessage = 'Failed to render mermaid diagram';
          let detailedError = '';

          if (err instanceof Error) {
            detailedError = err.message;

            // Handle specific Mermaid parsing errors more gracefully
            if (err.message.includes('Parse error') || err.message.includes('Syntax error')) {
              errorMessage = 'Invalid mermaid syntax - check node references and connections';
            } else if (err.message.includes('Cannot read properties of null') || err.message.includes('Cannot read properties of undefined')) {
              errorMessage = 'Mermaid parsing error - likely undefined node or edge reference';
            } else if (err.message.includes('Invalid mermaid diagram type')) {
              errorMessage = 'Diagram must start with: graph, flowchart, sequenceDiagram, etc.';
            } else if (err.message.includes('Rendered result is not a valid SVG')) {
              errorMessage = 'Mermaid failed to generate valid SVG output';
            } else if (err.message.includes('Mermaid render returned empty result')) {
              errorMessage = 'Mermaid returned empty result - check diagram syntax';
            } else {
              errorMessage = `Mermaid error: ${err.message}`;
            }
          } else {
            // Handle non-Error objects
            errorMessage = 'Unknown mermaid rendering error';
            detailedError = String(err);
          }

          console.warn('Setting error state:', errorMessage);
          setError(errorMessage);
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
      if (event.key === 'Escape' && isModalOpen) {
        setIsModalOpen(false);
      }
    };

    if (isModalOpen) {
      document.addEventListener('keydown', handleKeydown);
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleKeydown);
      document.body.style.overflow = '';
    };
  }, [isModalOpen]);

  const handleCopy = () => {
    navigator.clipboard.writeText(chart);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleModalOpen = async () => {
    setIsModalOpen(true);

    // Re-render diagram for modal with larger dimensions
    try {
      const mermaid = (await import('mermaid')).default;
      const simpleId = `modal-diagram${Date.now()}${Math.floor(Math.random() * 1000)}`;

      // Configure for larger modal rendering with explicit sizing
      await mermaid.initialize({
        startOnLoad: false,
        securityLevel: 'loose',
        theme: 'default',
        flowchart: {
          htmlLabels: false,
          useMaxWidth: false
        },
        logLevel: 'fatal',
        suppressErrorRendering: true
      });

      // Use the same cleaned chart logic with preprocessing
      let cleanChart = preprocessMermaidChart(chart.trim());

      const { svg: renderedSvg } = await mermaid.render(simpleId, cleanChart);

      let cleanedSvg = renderedSvg
        .replace(/<a[^>]*>/g, '<span>')
        .replace(/<\/a>/g, '</span>')
        .replace(/onclick="[^"]*"/g, '')
        .replace(/onmouseover="[^"]*"/g, '')
        .replace(/onmouseout="[^"]*"/g, '')
        .replace(/href="[^"]*"/g, '');

      // Sanitize SVG with DOMPurify configured for Mermaid diagrams
      const { default: DOMPurify } = await import('dompurify');
      const safeModalSvg = DOMPurify.sanitize(cleanedSvg, {
        USE_PROFILES: { svg: true, svgFilters: true },
        ADD_TAGS: [
          'foreignObject', 'switch', 'marker', 'pattern', 'mask', 'clipPath',
          'metadata', 'title', 'desc', 'defs', 'symbol', 'use'
        ],
        ADD_ATTR: [
          'style', 'transform', 'font-family', 'font-size', 'font-weight',
          'text-anchor', 'fill', 'stroke', 'stroke-width', 'stroke-dasharray',
          'd', 'cx', 'cy', 'r', 'rx', 'ry', 'x', 'y', 'x1', 'y1', 'x2', 'y2',
          'width', 'height', 'viewBox', 'preserveAspectRatio', 'opacity',
          'fill-opacity', 'stroke-opacity', 'marker-start', 'marker-mid', 'marker-end',
          'clip-path', 'mask', 'filter', 'dominant-baseline', 'alignment-baseline',
          'baseline-shift', 'text-decoration', 'letter-spacing', 'word-spacing',
          'direction', 'unicode-bidi'
        ],
        FORBID_TAGS: ['script', 'object', 'embed', 'link', 'meta', 'base'],
        FORBID_ATTR: ['onload', 'onerror', 'onmouseover', 'onclick', 'href', 'xlink:href']
      });

      // Modify SVG for better scaling in modal
      const scaledSvg = safeModalSvg.replace(
        /<svg([^>]*)>/,
        '<svg$1 style="width: 100%; height: auto; max-width: none; transform: scale(1.5); transform-origin: center;">'
      );

      setModalSvg(scaledSvg);
    } catch (err) {
      console.error('Error rendering modal diagram:', err);
      // Fall back to regular SVG
      setModalSvg(svg);
    }
  };

  if (error) {
    return (
      <div className="relative bg-yellow-50 border border-yellow-200 rounded-lg p-4 mt-4">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-semibold text-yellow-800">Mermaid Diagram - Fallback View</span>
          <button
            onClick={handleCopy}
            className="text-xs font-semibold px-2 py-1 h-6 rounded bg-secondary hover:bg-secondary/80 cursor-pointer flex items-center transition-colors"
          >
            Copy Source
          </button>
        </div>
        <div className="text-yellow-700 text-sm mb-3">
          <p className="font-medium mb-1">Unable to render diagram:</p>
          <p className="mb-2">{error}</p>
          <details className="cursor-pointer">
            <summary className="text-xs font-medium hover:text-yellow-800">View diagram source</summary>
            <pre className="text-xs text-yellow-600 bg-yellow-100 p-2 rounded overflow-x-auto mt-2 whitespace-pre-wrap">
              {chart}
            </pre>
          </details>
        </div>

        {/* Helpful suggestions */}
        <div className="text-xs text-yellow-600 bg-yellow-100 p-2 rounded">
          <p className="font-medium mb-1">Common fixes:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Check that all node names are defined before referencing them</li>
            <li>Verify arrows point to existing nodes (not subgraph names)</li>
            <li>Ensure diagram starts with: graph, flowchart, sequenceDiagram, etc.</li>
            <li>Check for typos in node names and connections</li>
          </ul>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative bg-gray-100 rounded-lg shadow-lg mt-4">
      <div className="flex justify-between items-center bg-gray-300 px-4 py-1 rounded-t-lg">
        <span className="text-sm font-semibold text-gray-800">Mermaid Diagram</span>
        <div className="flex gap-2">
          <button
            onClick={handleModalOpen}
            aria-label="Expand diagram to full screen"
            className="text-xs font-semibold px-2 py-1 h-6 rounded bg-secondary hover:bg-secondary/80 cursor-pointer flex items-center transition-colors text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <Maximize2 className="size-4"/>
          </button>
          <button
            onClick={handleCopy}
            className="text-xs font-semibold px-2 py-1 h-6 rounded bg-secondary hover:bg-secondary/80 cursor-pointer flex items-center transition-colors text-gray-800"
          >
            {copied ? (
              <>
                <LucideCopyCheck className="size-4"/> <span className="ml-1">Copied!</span>
              </>
            ) : (
              <>
                <LucideCopy className="size-4"/> <span className="ml-1">Copy</span>
              </>
            )}
          </button>
        </div>
      </div>
      <div
        className="p-4 bg-white rounded-b-lg overflow-x-auto mermaid-diagram"
        dangerouslySetInnerHTML={{ __html: svg }}
      />

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent
          className="max-w-[98vw] max-h-[98vh] w-[98vw] h-[98vh] p-0 overflow-hidden"
        >
          <div className="flex flex-col h-full min-h-[80vh] sm:min-h-[70vh]">
            <div className="flex justify-between items-center bg-gray-300 px-3 sm:px-4 py-2 flex-shrink-0 relative">
              <span className="text-xs sm:text-sm font-semibold text-gray-800 truncate">
                Mermaid Diagram - Full Screen
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopy}
                  className="text-xs font-semibold px-2 py-1 h-6 rounded bg-secondary hover:bg-secondary/80 cursor-pointer flex items-center transition-colors text-gray-800"
                >
                  {copied ? (
                    <div className="flex gap-1 sm:gap-2 items-center">
                      <LucideCopyCheck className="size-3 sm:size-4"/>
                      <span className="hidden sm:inline">Copied!</span>
                    </div>
                  ) : (
                    <div className="flex gap-1 sm:gap-2 items-center">
                      <LucideCopy className="size-3 sm:size-4"/>
                      <span className="hidden sm:inline">Copy</span>
                    </div>
                  )}
                </button>
              </div>
            </div>
            <div
              className="flex-1 p-6 bg-white overflow-auto min-h-0 flex justify-center items-center"
              style={{
                WebkitOverflowScrolling: 'touch' // Smooth scrolling on mobile
              }}
            >
              <div
                className="flex justify-center items-center"
                style={{
                  minWidth: '100%',
                  minHeight: '100%',
                  padding: '40px' // Extra padding to accommodate scaling
                }}
                dangerouslySetInnerHTML={{ __html: modalSvg || svg }}
              />
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};