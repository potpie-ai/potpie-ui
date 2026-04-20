"use client";

import { MarkdownTextPrimitive } from "@assistant-ui/react-markdown";
import type { TextMessagePartComponent } from "@assistant-ui/react";
import dynamic from "next/dynamic";
import remarkGfm from "remark-gfm";
import { useState, type FC, type ReactNode, memo } from "react";
import { LucideCopy, LucideCopyCheck, ExternalLinkIcon } from "lucide-react";
import type {
  SyntaxHighlighterProps,
  CodeHeaderProps,
} from "@assistant-ui/react-markdown";
import ReactMarkdown from "react-markdown";

const MermaidDiagram = dynamic(
  () =>
    import("@/components/chat/MermaidDiagram").then((mod) => mod.MermaidDiagram),
  { ssr: false },
);

const DynamicSyntaxHighlighter = dynamic(
  async () => {
    const [{ Prism }, { oneDark }] = await Promise.all([
      import("react-syntax-highlighter"),
      import("react-syntax-highlighter/dist/esm/styles/prism"),
    ]);

    const SyntaxComponent = ({
      language,
      code,
    }: {
      language?: string;
      code: string;
    }) => (
      <Prism
        language={language?.toLowerCase() || "text"}
        style={oneDark}
        PreTag="div"
        customStyle={{
          background: "transparent",
          fontFamily:
            'ui-monospace, SFMono-Regular, "SF Mono", Menlo, "Liberation Mono", Consolas, monospace',
          fontSize: "0.8125rem",
          lineHeight: "1.6",
          margin: 0,
          padding: "0.875rem 1rem",
          borderTopLeftRadius: 0,
          borderTopRightRadius: 0,
          borderBottomLeftRadius: "0.5rem",
          borderBottomRightRadius: "0.5rem",
        }}
        codeTagProps={{
          style: {
            fontFamily: "inherit",
            fontSize: "inherit",
            background: "transparent",
          },
        }}
      >
        {code}
      </Prism>
    );

    return SyntaxComponent;
  },
  { ssr: false },
);

// Premium code block header: language badge, copy on hover
const CodeHeader: FC<CodeHeaderProps> = ({ language, code }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code || "");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex items-center justify-between bg-[#1e2533] border-b border-white/5 px-4 py-1.5 rounded-t-lg">
      <span className="text-[11px] font-medium tracking-wide uppercase text-zinc-400">
        {language || "text"}
      </span>
      <button
        type="button"
        onClick={handleCopy}
        className="inline-flex items-center gap-1.5 text-[11px] font-medium text-zinc-400 hover:text-white transition-colors px-2 py-1 rounded hover:bg-white/10"
      >
        {copied ? (
          <>
            <LucideCopyCheck className="size-3" />
            Copied
          </>
        ) : (
          <>
            <LucideCopy className="size-3" />
            Copy
          </>
        )}
      </button>
    </div>
  );
};

const CodeBlockShell: FC<{ children: ReactNode }> = ({ children }) => (
  <div className="my-4 rounded-lg overflow-hidden bg-[#282c34] shadow-sm ring-1 ring-black/5">
    {children}
  </div>
);

const SyntaxHighlighter: FC<SyntaxHighlighterProps> = ({ language, code }) => {
  const Comp = DynamicSyntaxHighlighter as unknown as FC<{
    language?: string;
    code: string;
  }>;
  return <Comp language={language} code={code} />;
};

const MermaidSyntaxHighlighter: FC<SyntaxHighlighterProps> = ({ code }) => {
  return <MermaidDiagram chart={code} />;
};

const MermaidCodeHeader: FC<CodeHeaderProps> = () => null;

const LinkComponent: FC<{
  href?: string;
  children?: ReactNode;
}> = ({ href, children }) => (
  <a
    className="group inline-flex items-baseline gap-0.5 text-blue-600 hover:text-blue-700 underline decoration-blue-600/30 hover:decoration-blue-700/60 underline-offset-[3px] transition-colors"
    href={href}
    target="_blank"
    rel="noopener noreferrer"
  >
    {children}
    <ExternalLinkIcon className="h-3 w-3 opacity-0 group-hover:opacity-70 translate-y-px transition-opacity" />
  </a>
);

const InlineCode: FC<{ children?: ReactNode }> = ({ children }) => (
  <code className="font-mono text-[0.85em] bg-zinc-100 text-zinc-800 rounded px-1.5 py-0.5 ring-1 ring-inset ring-zinc-200/80 break-words">
    {children}
  </code>
);

// Shared markdown element renderers for premium readability
const H1: FC<{ children?: ReactNode }> = ({ children }) => (
  <h1 className="mt-6 mb-3 text-[1.35rem] font-semibold tracking-tight text-zinc-900 border-b border-zinc-200 pb-1.5">
    {children}
  </h1>
);
const H2: FC<{ children?: ReactNode }> = ({ children }) => (
  <h2 className="mt-5 mb-2.5 text-[1.15rem] font-semibold tracking-tight text-zinc-900">
    {children}
  </h2>
);
const H3: FC<{ children?: ReactNode }> = ({ children }) => (
  <h3 className="mt-4 mb-2 text-base font-semibold text-zinc-900">
    {children}
  </h3>
);
const H4: FC<{ children?: ReactNode }> = ({ children }) => (
  <h4 className="mt-3 mb-1.5 text-sm font-semibold text-zinc-900">
    {children}
  </h4>
);
const UL: FC<{ children?: ReactNode }> = ({ children }) => (
  <ul className="my-2 ml-5 list-disc marker:text-zinc-400 space-y-1">
    {children}
  </ul>
);
const OL: FC<{ children?: ReactNode }> = ({ children }) => (
  <ol className="my-2 ml-5 list-decimal marker:text-zinc-400 space-y-1">
    {children}
  </ol>
);
const LI: FC<{ children?: ReactNode }> = ({ children }) => (
  <li className="leading-relaxed text-zinc-800">{children}</li>
);
const Blockquote: FC<{ children?: ReactNode }> = ({ children }) => (
  <blockquote className="my-3 border-l-2 border-zinc-300 bg-zinc-50/60 pl-4 pr-3 py-1 text-zinc-700 italic">
    {children}
  </blockquote>
);
const HR: FC = () => <hr className="my-5 border-zinc-200" />;
const Table: FC<{ children?: ReactNode }> = ({ children }) => (
  <div className="my-4 overflow-x-auto rounded-lg border border-zinc-200">
    <table className="w-full border-collapse text-sm">{children}</table>
  </div>
);
const THead: FC<{ children?: ReactNode }> = ({ children }) => (
  <thead className="bg-zinc-50 text-zinc-700">{children}</thead>
);
const TR: FC<{ children?: ReactNode }> = ({ children }) => (
  <tr className="border-b border-zinc-200 last:border-0 even:bg-zinc-50/50">
    {children}
  </tr>
);
const TH: FC<{ children?: ReactNode }> = ({ children }) => (
  <th className="px-3 py-2 text-left font-semibold text-zinc-800 whitespace-nowrap">
    {children}
  </th>
);
const TD: FC<{ children?: ReactNode }> = ({ children }) => (
  <td className="px-3 py-2 align-top text-zinc-800">{children}</td>
);
const P: FC<{ children?: ReactNode }> = ({ children }) => (
  <p className="my-2 leading-relaxed text-zinc-800">{children}</p>
);
const StrongText: FC<{ children?: ReactNode }> = ({ children }) => (
  <strong className="font-semibold text-zinc-900">{children}</strong>
);
const EmText: FC<{ children?: ReactNode }> = ({ children }) => (
  <em className="italic text-zinc-800">{children}</em>
);

const MARKDOWN_ROOT_CLASS =
  "markdown-content break-words text-[0.95rem] text-zinc-800 leading-relaxed [&>*:first-child]:!mt-0 [&>*:last-child]:!mb-0";

const sharedComponents = {
  h1: H1,
  h2: H2,
  h3: H3,
  h4: H4,
  h5: H4,
  h6: H4,
  p: P,
  ul: UL,
  ol: OL,
  li: LI,
  blockquote: Blockquote,
  hr: HR,
  table: Table,
  thead: THead,
  tbody: ({ children }: { children?: ReactNode }) => <tbody>{children}</tbody>,
  tr: TR,
  th: TH,
  td: TD,
  strong: StrongText,
  em: EmText,
};

// MarkdownText component for assistant-ui message rendering (reads from message context)
const MarkdownTextPrimitiveWrapper: TextMessagePartComponent = () => {
  return (
    <MarkdownTextPrimitive
      remarkPlugins={[remarkGfm]}
      className={MARKDOWN_ROOT_CLASS}
      components={{
        ...sharedComponents,
        a: LinkComponent as any,
        code: InlineCode as any,
        SyntaxHighlighter: SyntaxHighlighter,
        CodeHeader: CodeHeader,
        pre: ({ children }: { children?: ReactNode }) => (
          <CodeBlockShell>{children}</CodeBlockShell>
        ),
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
interface StandaloneMarkdownProps {
  text: string;
  className?: string;
}

const StandaloneMarkdownImpl: FC<StandaloneMarkdownProps> = ({
  text,
  className,
}) => {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      className={className || MARKDOWN_ROOT_CLASS}
      components={{
        ...sharedComponents,
        a: ({ href, children }) => (
          <LinkComponent href={href}>{children}</LinkComponent>
        ),
        pre: ({ children }) => {
          const child = Array.isArray(children) ? children[0] : children;
          if (child && typeof child === "object" && "props" in child) {
            const { className, children: codeContent } = (child as any).props;
            if (className && className.includes("language-mermaid")) {
              return (
                <MermaidDiagram
                  chart={String(codeContent).replace(/\n$/, "")}
                />
              );
            }
          }
          return <>{children}</>;
        },
        code: ({ node, inline, className, children, ...props }: any) => {
          const code = String(children).replace(/\n$/, "");

          const isInline =
            inline === true ||
            (node &&
              node.position &&
              node.position.start.line === node.position.end.line &&
              !className);

          if (isInline) {
            return <InlineCode>{children}</InlineCode>;
          }

          const match = /language-(\w+)/.exec(className || "");
          const language = match ? match[1] : "";

          if (language === "mermaid") {
            return <MermaidDiagram chart={code} />;
          }

          const Comp = DynamicSyntaxHighlighter as unknown as FC<{
            language?: string;
            code: string;
          }>;
          return (
            <CodeBlockShell>
              <CodeHeader language={language} code={code} />
              <Comp language={language} code={code} />
            </CodeBlockShell>
          );
        },
      }}
    >
      {text}
    </ReactMarkdown>
  );
};

export const StandaloneMarkdown = memo(StandaloneMarkdownImpl);
