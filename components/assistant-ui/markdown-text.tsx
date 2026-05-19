"use client";

import { MarkdownTextPrimitive } from "@assistant-ui/react-markdown";
import type { TextMessagePartComponent } from "@assistant-ui/react";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighterLib } from "react-syntax-highlighter";
import { oneLight } from "react-syntax-highlighter/dist/esm/styles/prism";
import { MermaidDiagram } from "@/components/chat/MermaidDiagram";
import { useState, type FC, type ReactNode, memo } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { LucideCopyCheck, ExternalLinkIcon } from "lucide-react";
import type { SyntaxHighlighterProps, CodeHeaderProps } from "@assistant-ui/react-markdown";
import ReactMarkdown from "react-markdown";

const CODE_FONT_FAMILY =
  'var(--font-roboto-mono), ui-monospace, SFMono-Regular, "SF Mono", Menlo, "Liberation Mono", Consolas, monospace';

// Code header component with copy button
const CodeHeader: FC<CodeHeaderProps> = ({ language, code }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex items-center justify-between rounded-t-xl border border-[#E8E8E8] border-b-0 bg-[#F5F5F5] px-3 py-2">
      <span className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
        {language || "plaintext"}
      </span>
      <Button
        variant="outline"
        size="sm"
        onClick={handleCopy}
        className="h-7 gap-1.5 rounded-md border-[#E4E4E7] bg-white px-2.5 text-[11px] font-medium text-zinc-700 hover:bg-zinc-50"
      >
        {copied ? (
          <div className="flex items-center gap-1.5">
            <LucideCopyCheck className="size-3.5" /> Copied
          </div>
        ) : (
          <div className="flex items-center gap-1.5">
            <Image
              src="/images/copy-02.svg"
              alt="Copy"
              width={14}
              height={14}
              className="shrink-0"
            />
            Copy
          </div>
        )}
      </Button>
    </div>
  );
};

// Syntax highlighter component
const SyntaxHighlighter: FC<SyntaxHighlighterProps> = ({ language, code }) => {
  return (
    <SyntaxHighlighterLib
      language={language?.toLowerCase() || "text"}
      style={oneLight}
      customStyle={{
        backgroundColor: "#FCFCFD",
        border: "1px solid #E8E8E8",
        borderTop: "1px solid #E8E8E8",
        borderBottomLeftRadius: "0.75rem",
        borderBottomRightRadius: "0.75rem",
        fontFamily: CODE_FONT_FAMILY,
        fontFeatureSettings: "normal",
        fontSize: "0.78rem",
        fontVariationSettings: "normal",
        fontWeight: "400",
        lineHeight: "1.5",
        margin: 0,
        padding: "0.9rem",
      }}
      codeTagProps={{
        style: {
          fontFamily: CODE_FONT_FAMILY,
          fontWeight: 400,
        },
      }}
    >
      {code}
    </SyntaxHighlighterLib>
  );
};

// Mermaid component for mermaid code blocks
const MermaidSyntaxHighlighter: FC<SyntaxHighlighterProps> = ({ code }) => {
  return <MermaidDiagram chart={code} />;
};

// Empty header for mermaid (we don't need the copy header for diagrams)
const MermaidCodeHeader: FC<CodeHeaderProps> = () => null;

// Link component
const LinkComponent: FC<{
  href?: string;
  children?: ReactNode;
}> = ({ href, children }) => (
  <a
    className="underline inline-flex transition-all text-blue-600 hover:text-blue-800"
    href={href}
    target="_blank"
    rel="noopener noreferrer"
  >
    {children}
    <ExternalLinkIcon className="h-4 w-4 ml-1" />
  </a>
);

// Inline code component
const InlineCode: FC<{ children?: ReactNode }> = ({ children }) => (
  <code className="bg-gray-300/60 rounded px-1 text-sm font-medium text-slate-900">
    {children}
  </code>
);

// MarkdownText component for assistant-ui message rendering (reads from message context)
const MarkdownTextPrimitiveWrapper: TextMessagePartComponent = () => {
  return (
    <MarkdownTextPrimitive
      remarkPlugins={[remarkGfm]}
      className="markdown-content break-words break-before-avoid [&_p]:!leading-relaxed [&_p]:!my-2 [&_li]:!my-1"
      components={{
        p: ({ children }: { children?: ReactNode }) => (
          <p className="text-slate-900">{children}</p>
        ),
        a: LinkComponent as any,
        code: InlineCode as any,
        SyntaxHighlighter: SyntaxHighlighter,
        CodeHeader: CodeHeader,
      }}
      componentsByLanguage={{
        mermaid: {
          SyntaxHighlighter: MermaidSyntaxHighlighter,
          CodeHeader: MermaidCodeHeader,
        },
      }}
      smooth
    />
  );
};

export const MarkdownText = memo(MarkdownTextPrimitiveWrapper);

// Standalone markdown component for use outside message context (e.g., tool call details)
// Uses react-markdown directly with similar styling
interface StandaloneMarkdownProps {
  text: string;
  className?: string;
}

const StandaloneMarkdownImpl: FC<StandaloneMarkdownProps> = ({ text, className }) => {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      className={className || "markdown-content break-words break-before-avoid [&_p]:!leading-relaxed [&_p]:!my-2 [&_li]:!my-1"}
      components={{
        p: ({ children }) => <p className="text-slate-900">{children}</p>,
        a: ({ href, children }) => (
          <a
            className="underline inline-flex transition-all text-blue-600 hover:text-blue-800"
            href={href}
            target="_blank"
            rel="noopener noreferrer"
          >
            {children}
            <ExternalLinkIcon className="h-4 w-4 ml-1" />
          </a>
        ),
        pre: ({ children }) => {
          // Check if this is a mermaid code block
          const child = Array.isArray(children) ? children[0] : children;
          if (child && typeof child === "object" && "props" in child) {
            const { className, children: codeContent } = (child as any).props;
            if (className && className.includes("language-mermaid")) {
              return (
                <MermaidDiagram chart={String(codeContent).replace(/\n$/, "")} />
              );
            }
          }
          return <pre>{children}</pre>;
        },
        code: ({ node, inline, className, children, ...props }: any) => {
          const code = String(children).replace(/\n$/, "");
          
          // Handle inline code
          const isInline =
            inline === true ||
            (node &&
              node.position &&
              node.position.start.line === node.position.end.line &&
              !className);

          if (isInline) {
            return (
              <code className="bg-green-200 rounded px-1 text-sm font-medium text-slate-900">
                {children}
              </code>
            );
          }

          // Extract language
          const match = /language-(\w+)/.exec(className || "");
          const language = match ? match[1] : "";

          // Mermaid
          if (language === "mermaid") {
            return <MermaidDiagram chart={code} />;
          }

          // Code blocks with syntax highlighting
          return (
            <div className="relative mt-4 overflow-hidden rounded-xl shadow-sm">
              <CodeHeader language={language} code={code} />
              <SyntaxHighlighterLib
                language={language?.toLowerCase() || "text"}
                style={oneLight}
                customStyle={{
                  backgroundColor: "#FCFCFD",
                  border: "1px solid #E8E8E8",
                  borderTop: "1px solid #E8E8E8",
                  borderBottomLeftRadius: "0.75rem",
                  borderBottomRightRadius: "0.75rem",
                  fontFamily: CODE_FONT_FAMILY,
                  fontFeatureSettings: "normal",
                  fontSize: "0.78rem",
                  fontVariationSettings: "normal",
                  fontWeight: "400",
                  lineHeight: "1.5",
                  margin: 0,
                  padding: "0.9rem",
                }}
                codeTagProps={{
                  style: {
                    fontFamily: CODE_FONT_FAMILY,
                    fontWeight: 400,
                  },
                }}
              >
                {code}
              </SyntaxHighlighterLib>
            </div>
          );
        },
      }}
    >
      {text}
    </ReactMarkdown>
  );
};

export const StandaloneMarkdown = memo(StandaloneMarkdownImpl);
