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

        // Initialize with minimal, safe configuration
        mermaid.initialize({
          startOnLoad: false,
          securityLevel: 'loose',
          theme: 'base',
          themeVariables: {
            fontFamily: 'Arial, sans-serif',
            fontSize: '14px',
            primaryColor: '#ffffff',
            primaryTextColor: '#000000',
            primaryBorderColor: '#000000',
            lineColor: '#000000',
            secondaryColor: '#ffffff',
            tertiaryColor: '#ffffff',
            background: '#ffffff',
            mainBkg: '#ffffff',
            secondBkg: '#ffffff'
          },
          darkMode: false,
          htmlLabels: false,
          deterministicIds: false,
          flowchart: {
            htmlLabels: false,
            useMaxWidth: true,
            curve: 'basis'
          }
        });

        // Clean the chart content and fix specific parsing issues
        let cleanChart = chart.trim();

        // Fix specific issue with (Depends) in node labels that causes parse errors
        // Only target this specific problematic pattern
        cleanChart = cleanChart.replace(/\(Depends\)/g, 'Depends');

        // Fix the specific problematic edge syntax
        // The pattern: A0 -- uses -->|"verify_id_token"| firebase_py["firebase.py"]
        // Simplify to: A0 --> firebase_py
        cleanChart = cleanChart.replace(
          /A0 -- uses -->|"verify_id_token"| firebase_py\["firebase\.py"\]/g,
          'A0 --> firebase_py["firebase.py"]'
        );

        // Fix custom edge labels that Mermaid doesn't recognize
        // Replace --calls--> with standard -->
        cleanChart = cleanChart.replace(/--calls-->/g, '-->');

        // Replace --authenticates via--> with standard -->
        cleanChart = cleanChart.replace(/--authenticates via-->/g, '-->');

        // Fix complex edge syntax with labels
        // Pattern: A -- text -->|"label"| B["text"]
        // Replace with: A -->|"label"| B["text"]
        cleanChart = cleanChart.replace(/(\w+)\s*--\s*[^-]+\s*-->(\|[^|]*\|)/g, '$1 -->$2');

        // Fix edge patterns with custom text between dashes
        // Pattern: A0 -- uses -->|"verify_id_token"| firebase_py["firebase.py"]
        cleanChart = cleanChart.replace(/(\w+)\s*--\s*[^-]*\s*-->/g, '$1 -->');

        // Remove this overly aggressive regex that might break valid syntax
        // cleanChart = cleanChart.replace(/[^\w\s\[\]"'`(){}|:;.,<>\-=_]/g, '');

        // Ensure proper subgraph syntax
        cleanChart = cleanChart.replace(/subgraph\s+"([^"]*)"([^\n]*)/g, 'subgraph $1$2');

        // Fix any remaining edge syntax issues
        cleanChart = cleanChart.replace(/-->[^-\w\[\]"|]*-->/g, '-->');

        // Use the modern render API without container dependency
        const { svg: renderedSvg } = await mermaid.render(simpleId, cleanChart);

        if (isMounted) {
          // Clean up any problematic elements in the SVG
          const cleanedSvg = renderedSvg
            .replace(/<a[^>]*>/g, '<span>')
            .replace(/<\/a>/g, '</span>')
            .replace(/onclick="[^"]*"/g, '')
            .replace(/onmouseover="[^"]*"/g, '')
            .replace(/onmouseout="[^"]*"/g, '')
            .replace(/href="[^"]*"/g, '');
          setSvg(cleanedSvg);
          setError(null);
        }

      } catch (err) {
        if (isMounted) {
          let errorMessage = 'Failed to render diagram';

          if (err instanceof Error) {
            // Handle specific Mermaid parsing errors more gracefully
            if (err.message.includes('Parse error')) {
              errorMessage = 'Mermaid diagram contains invalid syntax. Please check the diagram format.';
            } else if (err.message.includes('Cannot read properties of null')) {
              errorMessage = 'Mermaid diagram could not be rendered due to DOM issues.';
            } else {
              errorMessage = err.message;
            }
          }

          setError(errorMessage);
          console.error('Mermaid render error:', err);
        }
      }
    };

    // Render immediately when component mounts
    const timeoutId = setTimeout(renderDiagram, 10);

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
      mermaid.initialize({
        startOnLoad: false,
        securityLevel: 'loose',
        theme: 'base',
        themeVariables: {
          fontFamily: 'Arial, sans-serif',
          fontSize: '18px', // Larger font for modal
          primaryColor: '#ffffff',
          primaryTextColor: '#000000',
          primaryBorderColor: '#000000',
          lineColor: '#000000',
          secondaryColor: '#ffffff',
          tertiaryColor: '#ffffff',
          background: '#ffffff',
          mainBkg: '#ffffff',
          secondBkg: '#ffffff'
        },
        darkMode: false,
        htmlLabels: false,
        deterministicIds: false,
        flowchart: {
          htmlLabels: false,
          useMaxWidth: false, // Don't constrain width
          curve: 'basis',
          nodeSpacing: 80, // Increase node spacing
          rankSpacing: 100, // Increase rank spacing
          padding: 40 // Add more padding
        },
        class: {
          useMaxWidth: false
        },
        sequence: {
          useMaxWidth: false,
          boxMargin: 20,
          boxTextMargin: 10,
          noteMargin: 20,
          messageMargin: 50
        },
        gantt: {
          useMaxWidth: false
        }
      });

      // Use the same cleaned chart logic
      let cleanChart = chart.trim();
      cleanChart = cleanChart.replace(/\(Depends\)/g, 'Depends');
      cleanChart = cleanChart.replace(
        /A0 -- uses -->|"verify_id_token"| firebase_py\["firebase\.py"\]/g,
        'A0 --> firebase_py["firebase.py"]'
      );
      cleanChart = cleanChart.replace(/--calls-->/g, '-->');
      cleanChart = cleanChart.replace(/--authenticates via-->/g, '-->');
      cleanChart = cleanChart.replace(/(\w+)\s*--\s*[^-]+\s*-->(\|[^|]*\|)/g, '$1 -->$2');
      cleanChart = cleanChart.replace(/(\w+)\s*--\s*[^-]*\s*-->/g, '$1 -->');
      cleanChart = cleanChart.replace(/subgraph\s+"([^"]*)"([^\n]*)/g, 'subgraph $1$2');
      cleanChart = cleanChart.replace(/-->[^-\w\[\]"|]*-->/g, '-->');

      const { svg: renderedSvg } = await mermaid.render(simpleId, cleanChart);

      let cleanedSvg = renderedSvg
        .replace(/<a[^>]*>/g, '<span>')
        .replace(/<\/a>/g, '</span>')
        .replace(/onclick="[^"]*"/g, '')
        .replace(/onmouseover="[^"]*"/g, '')
        .replace(/onmouseout="[^"]*"/g, '')
        .replace(/href="[^"]*"/g, '');

      // Modify SVG for better scaling in modal
      cleanedSvg = cleanedSvg.replace(
        /<svg([^>]*)>/,
        '<svg$1 style="width: 100%; height: auto; max-width: none; transform: scale(1.5); transform-origin: center;">'
      );

      setModalSvg(cleanedSvg);
    } catch (err) {
      console.error('Error rendering modal diagram:', err);
      // Fall back to regular SVG
      setModalSvg(svg);
    }
  };

  if (error) {
    return (
      <div className="relative bg-red-50 border border-red-200 rounded-lg p-4 mt-4">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-semibold text-red-800">Mermaid Diagram Error</span>
          <div
            onClick={handleCopy}
            className="text-xs font-semibold px-2 py-1 h-6 rounded bg-secondary hover:bg-secondary/80 cursor-pointer flex items-center transition-colors"
          >
            Copy Source
          </div>
        </div>
        <p className="text-red-700 text-sm mb-2">{error}</p>
        <pre className="text-xs text-red-600 bg-red-100 p-2 rounded overflow-x-auto">
          {chart}
        </pre>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative bg-gray-100 rounded-lg shadow-lg mt-4">
      <div className="flex justify-between items-center bg-gray-300 px-4 py-1 rounded-t-lg">
        <span className="text-sm font-semibold text-gray-800">Mermaid Diagram</span>
        <div className="flex gap-2">
          <div
            onClick={handleModalOpen}
            onKeyDown={(e) => e.key === 'Enter' && handleModalOpen()}
            role="button"
            tabIndex={0}
            aria-label="Expand diagram to full screen"
            className="text-xs font-semibold px-2 py-1 h-6 rounded bg-secondary hover:bg-secondary/80 cursor-pointer flex items-center transition-colors text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <Maximize2 className="size-4"/>
          </div>
          <div
            onClick={handleCopy}
            className="text-xs font-semibold px-2 py-1 h-6 rounded bg-secondary hover:bg-secondary/80 cursor-pointer flex items-center transition-colors text-gray-800"
          >
            {copied ? (
              <div className="flex gap-2 items-center">
                <LucideCopyCheck className="size-4"/> Copied!
              </div>
            ) : (
              <div className="flex gap-2 items-center">
                <LucideCopy className="size-4"/> Copy
              </div>
            )}
          </div>
        </div>
      </div>
      <div
        className="p-4 bg-white rounded-b-lg overflow-x-auto mermaid-diagram"
        dangerouslySetInnerHTML={{ __html: svg }}
      />

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent
          className="max-w-[98vw] max-h-[98vh] w-[98vw] h-[98vh] p-0 overflow-hidden"
          showX={true}
        >
          <div className="flex flex-col h-full min-h-[80vh] sm:min-h-[70vh]">
            <div className="flex justify-between items-center bg-gray-300 px-3 sm:px-4 py-2 flex-shrink-0 relative">
              <span className="text-xs sm:text-sm font-semibold text-gray-800 truncate">
                Mermaid Diagram - Full Screen
              </span>
              <div className="flex items-center gap-2">
                <div
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
                </div>
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