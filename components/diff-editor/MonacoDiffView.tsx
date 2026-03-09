"use client";

import React, { useMemo } from "react";
import dynamic from "next/dynamic";
import { parseUnifiedDiff } from "./parseUnifiedDiff";

const MonacoDiffEditor = dynamic(
  () => import("@monaco-editor/react").then((mod) => mod.DiffEditor),
  { ssr: false, loading: () => <div className="flex items-center justify-center h-64 text-zinc-500 text-sm">Loading diff...</div> }
);

const MonacoEditor = dynamic(
  () => import("@monaco-editor/react").then((mod) => mod.Editor),
  { ssr: false, loading: () => <div className="flex items-center justify-center h-64 text-zinc-500 text-sm">Loading...</div> }
);

/** Map file extension to Monaco language id */
function getLanguageId(path: string): string {
  const ext = path.split(".").pop()?.toLowerCase() ?? "";
  const map: Record<string, string> = {
    ts: "typescript",
    tsx: "typescript",
    js: "javascript",
    jsx: "javascript",
    json: "json",
    py: "python",
    css: "css",
    scss: "scss",
    html: "html",
    md: "markdown",
    yaml: "yaml",
    yml: "yaml",
    sh: "shell",
    bash: "shell",
    txt: "plaintext",
  };
  return map[ext] ?? "plaintext";
}

export type MonacoDiffViewProps = {
  change: { path: string; lang: string; content: string };
  height?: string | number;
  className?: string;
};

function MonacoDiffViewInner({
  change,
  height = "100%",
  className = "",
}: MonacoDiffViewProps) {
  const { isPlainFile, original, modified, plainContent } = useMemo(() => {
    const raw = change.content ?? "";
    const parsed = parseUnifiedDiff(raw);
    const noDiffLines = raw.trim() && !parsed.original && !parsed.modified;
    return {
      isPlainFile: noDiffLines,
      original: parsed.original,
      modified: parsed.modified,
      plainContent: noDiffLines ? raw : "",
    };
  }, [change.content]);

  const languageId = useMemo(
    () => change.lang || getLanguageId(change.path),
    [change.path, change.lang]
  );

  const editorHeight = typeof height === "number" ? `${height}px` : height;

  // Stable key so DiffEditor only remounts when path or content identity changes,
  // reducing flicker and avoiding disposal races when parent re-renders.
  const diffEditorKey = useMemo(() => {
    const c = change.content ?? "";
    return `${change.path}-${c.length}-${c.slice(0, 40)}`;
  }, [change.path, change.content]);

  if (!change.content?.trim()) {
    return (
      <div className="flex items-center justify-center h-64 text-zinc-500 text-sm">
        No diff content
      </div>
    );
  }

  // Plain file content (not a unified diff): use single Editor so content always shows
  if (isPlainFile && plainContent) {
    const plainEditorKey = `${change.path}-${plainContent.length}`;
    return (
      <div
        className={`min-h-[200px] ${className}`.trim()}
        style={{ height: editorHeight }}
      >
        <MonacoEditor
          key={plainEditorKey}
          height={editorHeight}
          value={plainContent}
          language={languageId}
          theme="light"
          options={{
            readOnly: true,
            scrollBeyondLastLine: false,
            minimap: { enabled: false },
            fontSize: 12,
            lineNumbers: "on",
            folding: false,
            wordWrap: "on",
          }}
        />
      </div>
    );
  }

  return (
    <div
      className={`h-full min-h-[200px] ${className}`.trim()}
      style={{ height: editorHeight }}
    >
      <MonacoDiffEditor
        key={diffEditorKey}
        height={editorHeight}
        original={original}
        modified={modified}
        language={languageId}
        theme="light"
        keepCurrentOriginalModel
        keepCurrentModifiedModel
        options={{
          readOnly: true,
          renderSideBySide: false,
          diffWordWrap: "on",
          scrollBeyondLastLine: false,
          minimap: { enabled: false },
          fontSize: 12,
          lineNumbers: "on",
          folding: false,
          renderOverviewRuler: false,
        }}
      />
    </div>
  );
}

export const MonacoDiffView = React.memo(MonacoDiffViewInner, (prev, next) => {
  return (
    prev.change.path === next.change.path &&
    prev.change.lang === next.change.lang &&
    prev.change.content === next.change.content &&
    prev.height === next.height &&
    prev.className === next.className
  );
});
