// Node iconography for the pot ontology graph.
//
// Reagraph replaces the coloured sphere with the icon sprite when a node has
// `icon` set, so we bake the node's ontology-category colour into the SVG
// stroke. That keeps the colour-coding (and the legend) meaningful while adding
// a shape that communicates the node type at a glance.
//
// Glyphs are lucide-react path data (ISC licensed) inlined so the icon can be
// rendered to a `data:` URI without pulling React into the WebGL canvas module.

// Inner SVG markup per icon key. The wrapping <svg> supplies fill/stroke, so
// children only carry geometry.
const ICON_GLYPHS: Record<string, string> = {
  github:
    '<path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4"/><path d="M9 18c-4.51 2-5-2-7-2"/>',
  server:
    '<rect width="20" height="8" x="2" y="2" rx="2" ry="2"/><rect width="20" height="8" x="2" y="14" rx="2" ry="2"/><line x1="6" x2="6.01" y1="6" y2="6"/><line x1="6" x2="6.01" y1="18" y2="18"/>',
  sparkles:
    '<path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/><path d="M5 3v4"/><path d="M19 17v4"/><path d="M3 5h4"/><path d="M17 19h4"/>',
  bug:
    '<path d="m8 2 1.88 1.88"/><path d="M14.12 3.88 16 2"/><path d="M9 7.13v-1a3.003 3.003 0 1 1 6 0v1"/><path d="M12 20c-3.3 0-6-2.7-6-6v-3a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v3c0 3.3-2.7 6-6 6"/><path d="M12 20v-9"/><path d="M6.53 9C4.6 8.8 3 7.1 3 5"/><path d="M6 13H2"/><path d="M3 21c0-2.1 1.7-3.9 3.8-4"/><path d="M20.97 5c0 2.1-1.6 3.8-3.5 4"/><path d="M22 13h-4"/><path d="M17.2 17c2.1.1 3.8 1.9 3.8 4"/>',
  rocket:
    '<path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/><path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/><path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/>',
  user:
    '<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
  users:
    '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
  "file-text":
    '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/>',
  "git-pull-request":
    '<circle cx="18" cy="18" r="3"/><circle cx="6" cy="6" r="3"/><path d="M13 6h3a2 2 0 0 1 2 2v7"/><line x1="6" x2="6" y1="9" y2="21"/>',
  settings:
    '<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/>',
  "book-open":
    '<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>',
  terminal:
    '<polyline points="4 17 10 11 4 5"/><line x1="12" x2="20" y1="19" y2="19"/>',
  "triangle-alert":
    '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/>',
  workflow:
    '<rect width="8" height="8" x="3" y="3" rx="2"/><path d="M7 11v4a2 2 0 0 0 2 2h4"/><rect width="8" height="8" x="13" y="13" rx="2"/>',
  database:
    '<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5V19A9 3 0 0 0 21 19V5"/><path d="M3 12A9 3 0 0 0 21 12"/>',
  box:
    '<path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/>',
};

// Keyword → icon, scanned in order against the node's labels and entity-key
// prefix. First substring hit wins, so put the more specific cues first.
const ICON_RULES: Array<[string[], string]> = [
  [["pull request", "pullrequest", "pull_request", "pr:", "commit", "changeset"], "git-pull-request"],
  [["repository", "repo", "github", "codebase"], "github"],
  [["microservice", "service", "endpoint", "api"], "server"],
  [["capability", "feature"], "sparkles"],
  [["deployment", "deploy", "release", "rollout"], "rocket"],
  [["bug", "defect", "incident", "investigation", "debug", "diagnostic"], "bug"],
  [["team", "squad", "organization", "org:"], "users"],
  [["person", "owner", "user", "author", "contributor", "agent", "maintainer"], "user"],
  [["runbook", "playbook"], "book-open"],
  [["workflow", "pipeline"], "workflow"],
  [["script"], "terminal"],
  [["config", "preference", "setting", "environment"], "settings"],
  [["database", "datastore", "data store", "data_store", "table"], "database"],
  [["document", "doc", "readme", "spec", "knowledge", "evidence", "conversation", "episode", "note"], "file-text"],
  [["alert", "quality", "drift", "constraint", "sla", "reliability"], "triangle-alert"],
  [["component", "module", "interface", "system", "package", "library"], "box"],
];

const DEFAULT_ICON = "box";

/** Pick the icon key best matching a node's labels / entity-key prefix. */
export function iconKeyForNode(labels: string[], entityKey: string): string {
  const prefix = entityKey.includes(":")
    ? entityKey.slice(0, entityKey.indexOf(":"))
    : "";
  const haystack = `${labels.join(" ")} ${prefix}`.toLowerCase();
  for (const [keywords, icon] of ICON_RULES) {
    if (keywords.some((k) => haystack.includes(k))) return icon;
  }
  return DEFAULT_ICON;
}

// Reagraph loads `node.icon` through three.js TextureLoader, which rasterises a
// data: URI. Memoised per (icon, colour) since the same combos recur a lot.
const uriCache = new Map<string, string>();

/** A `data:image/svg+xml` URI for `iconKey`, stroked in `color`. */
export function nodeIconDataUri(iconKey: string, color: string): string {
  const cacheKey = `${iconKey}|${color}`;
  const cached = uriCache.get(cacheKey);
  if (cached) return cached;
  const glyph = ICON_GLYPHS[iconKey] ?? ICON_GLYPHS[DEFAULT_ICON];
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" ` +
    `viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" ` +
    `stroke-linecap="round" stroke-linejoin="round">${glyph}</svg>`;
  const uri = `data:image/svg+xml,${encodeURIComponent(svg)}`;
  uriCache.set(cacheKey, uri);
  return uri;
}
