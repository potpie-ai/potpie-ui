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
  rocket:
    '<path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/><path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/><path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/>',
  user:
    '<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
  users:
    '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
  "file-text":
    '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/>',
  "triangle-alert":
    '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/>',
  database:
    '<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5V19A9 3 0 0 0 21 19V5"/><path d="M3 12A9 3 0 0 0 21 12"/>',
  box:
    '<path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/>',
};

// Keyword → icon, scanned in order against the node's labels and entity-key
// prefix. First substring hit wins, so put the more specific cues first.
// Keywords mirror the entity labels and `entity_key` prefixes declared in the
// topology-minimal ontology (app/src/context-engine/domain/ontology.py).
const ICON_RULES: Array<[string[], string]> = [
  [["repository", "repo", "github", "codebase", "monorepo"], "github"],
  [["datastore", "data store", "data_store", "database", "postgres", "redis", "kafka", "bucket"], "database"],
  [["environment", "prod", "staging", "preview", "runtime"], "rocket"],
  [["cluster", "region", "kubernetes", "k8s", "platform"], "box"],
  [["microservice", "service", "worker", "cronjob", "gateway", "endpoint", "api"], "server"],
  [["team", "squad", "organization", "org:"], "users"],
  [["person", "owner", "user", "author", "contributor", "maintainer"], "user"],
  [["document", "doc", "readme", "spec", "note", "evidence"], "file-text"],
  [["observation", "signal", "insight"], "sparkles"],
  [["quality", "drift", "hygiene", "issue"], "triangle-alert"],
  [["file", "function", "class", "module", "code", "node"], "box"],
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
