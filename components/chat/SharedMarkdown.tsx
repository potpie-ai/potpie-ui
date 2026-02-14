"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { FC } from "react";
import { ExternalLinkIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import MyCodeBlock from "@/components/codeBlock";
import { MermaidDiagram } from "@/components/chat/MermaidDiagram";

interface SharedMarkdownProps {
  content: string;
  className?: string;
}

export const SharedMarkdown: FC<SharedMarkdownProps> = ({
  content,
  className
}) => {
  return (
    <div className="min-w-0 max-w-full overflow-hidden">
      <ReactMarkdown
        className={cn("markdown-content break-words break-before-avoid [&_p]:!leading-tight [&_p]:!my-0.5 [&_li]:!my-0.5 animate-blink min-w-0 max-w-full", className)}
        components={{
          p: ({ children }) => <p className="text-slate-900 break-words overflow-hidden" style={{ overflowWrap: "anywhere" }}>{children}</p>,
          pre: ({ children }) => {
            // Check if this is a mermaid code block
            const child = Array.isArray(children) ? children[0] : children;
            if (child && typeof child === 'object' && 'props' in child) {
              const { className, children: codeContent } = child.props;
              if (className && className.includes('language-mermaid')) {
                return (
                  <MermaidDiagram chart={String(codeContent).replace(/\n$/, "")} />
                );
              }
            }
            return <pre className="overflow-x-auto max-w-full whitespace-pre-wrap break-words">{children}</pre>;
          },
          code: ({ node, inline, className, children, ...props }: any) => {
            // Handle inline code (single backtick) - check both the explicit inline prop and node type
            const isInline = inline === true || (node && node.position && 
              node.position.start.line === node.position.end.line && 
              !className);
            
            if (isInline) {
              return (
                <code className="bg-slate-100 rounded px-1 text-sm font-medium text-slate-900 break-all">
                  {children}
                </code>
              );
            }

            // Extract language from className (format: "language-javascript")
            const match = /language-(\w+)/.exec(className || '');
            const language = match ? match[1] : '';

            // Mermaid diagrams
            if (language === 'mermaid') {
              return (
                <MermaidDiagram chart={String(children).replace(/\n$/, "")} />
              );
            }

            // Code blocks with language specified
            if (language) {
              return (
                <MyCodeBlock
                  code={String(children).replace(/\n$/, "")}
                  language={language}
                />
              );
            }

            // Code blocks without language - still render as code block
            // Use 'text' as default language instead of treating as inline
            return (
              <MyCodeBlock
                code={String(children).replace(/\n$/, "")}
                language="text"
              />
            );
          },
          a: ({ href, children }) => (
            <a
              className="underline inline transition-all text-blue-600 hover:text-blue-800 break-all"
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              style={{ overflowWrap: "anywhere" }}
            >
              {children}
              <ExternalLinkIcon className="h-4 w-4 ml-1 inline-block" />
            </a>
          ),
          table: ({ children }) => (
            <div className="overflow-x-auto max-w-full">
              <table>{children}</table>
            </div>
          ),
        }}
        remarkPlugins={[remarkGfm]}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};