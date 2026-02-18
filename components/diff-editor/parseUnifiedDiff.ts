/**
 * Parse unified diff content into original (left) and modified (right) file content
 * for use with Monaco DiffEditor.
 * If no diff markers are found, returns empty original/modified so the caller
 * can treat the content as plain text (e.g. single-editor path) and avoid stripping indentation.
 */
export function parseUnifiedDiff(diffContent: string): {
  original: string;
  modified: string;
} {
  const lines = diffContent.split("\n");
  const hasDiffMarker = lines.some(
    (line) =>
      line.startsWith("diff --git") ||
      line.startsWith("@@") ||
      line.startsWith("+++ ") ||
      line.startsWith("--- ")
  );
  if (!hasDiffMarker) {
    return { original: "", modified: "" };
  }

  const original: string[] = [];
  const modified: string[] = [];

  for (const line of lines) {
    // Skip diff metadata lines
    if (
      line.startsWith("diff --git") ||
      line.startsWith("index ") ||
      line.startsWith("--- ") ||
      line.startsWith("+++ ")
    ) {
      continue;
    }
    if (line.startsWith("@@")) {
      continue;
    }
    // Context line (in both)
    if (line.startsWith(" ")) {
      const content = line.slice(1);
      original.push(content);
      modified.push(content);
    } else if (line.startsWith("-") && !line.startsWith("---")) {
      original.push(line.slice(1));
    } else if (line.startsWith("+") && !line.startsWith("+++")) {
      modified.push(line.slice(1));
    }
  }

  return {
    original: original.join("\n"),
    modified: modified.join("\n"),
  };
}
