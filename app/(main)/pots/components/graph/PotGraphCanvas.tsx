"use client";

// Reagraph (WebGL) canvas for the pot ontology graph. Isolated into its own
// module so it can be dynamically imported with `ssr: false` — Reagraph renders
// through three.js / WebGL and cannot be server-rendered in the Next.js app
// router.

import React, { useMemo, useRef } from "react";
import {
  GraphCanvas,
  type GraphCanvasRef,
  type GraphEdge,
  type GraphNode,
  type LabelVisibilityType,
  type Theme,
  Icon,
  Sphere,
  lightTheme,
  useSelection,
} from "reagraph";

export type PotGraphCanvasProps = {
  nodes: GraphNode[];
  edges: GraphEdge[];
  /** Currently inspected node (drives selection highlight). */
  selectedId: string | null;
  /** Single click selects a node (opens the inspector). */
  onSelect: (entityKey: string | null) => void;
  /** Double click expands a node's neighborhood. */
  onExpand: (entityKey: string) => void;
  /** "auto" shows labels on hover/zoom; "all" shows every label. */
  labelType?: LabelVisibilityType;
};

// Light theme tuned to the shadcn surface the canvas sits on. Per-node colour
// comes from `node.fill` (ontology category); the theme only controls chrome.
const potTheme: Theme = {
  ...lightTheme,
  canvas: { background: "#f8fafc", fog: "#f8fafc" },
  node: {
    ...lightTheme.node,
    fill: "#94a3b8",
    activeFill: "#0ea5e9",
    opacity: 1,
    selectedOpacity: 1,
    inactiveOpacity: 0.25,
    label: {
      color: "#334155",
      stroke: "#f8fafc",
      activeColor: "#0f172a",
    },
  },
  edge: {
    ...lightTheme.edge,
    fill: "#64748b",
    activeFill: "#0ea5e9",
    opacity: 1,
    selectedOpacity: 1,
    inactiveOpacity: 0.25,
    label: {
      color: "#475569",
      stroke: "#f8fafc",
      activeColor: "#0f172a",
      fontSize: 5,
    },
  },
  ring: { ...lightTheme.ring, fill: "#64748b", activeFill: "#0ea5e9" },
  arrow: { ...lightTheme.arrow, fill: "#64748b", activeFill: "#0ea5e9" },
};

export default function PotGraphCanvas({
  nodes,
  edges,
  selectedId,
  onSelect,
  onExpand,
  labelType = "auto",
}: PotGraphCanvasProps) {
  const ref = useRef<GraphCanvasRef | null>(null);

  const externalSelections = useMemo(
    () => (selectedId ? [selectedId] : []),
    [selectedId],
  );

  const {
    selections,
    actives,
    onNodeClick: onSelectionNodeClick,
    onCanvasClick: onSelectionCanvasClick,
    onNodePointerOver,
    onNodePointerOut,
  } = useSelection({
    ref,
    nodes,
    edges,
    selections: externalSelections,
    type: "single",
    pathHoverType: "all",
    focusOnSelect: false,
  });

  return (
    <GraphCanvas
      ref={ref}
      theme={potTheme}
      nodes={nodes}
      edges={edges}
      selections={selections}
      actives={actives}
      layoutType="forceDirected2d"
      sizingType="centrality"
      minNodeSize={4}
      maxNodeSize={14}
      labelType={labelType}
      edgeArrowPosition="end"
      edgeLabelPosition="natural"
      edgeInterpolation="curved"
      draggable
      animated
      // Keep the category-coloured sphere and composite the type icon on top
      // of it (white glyph, sized to sit inside the circle with a colour rim
      // showing). Reagraph's default icon renderer replaces the sphere; its
      // built-in SphereWithIcon draws the icon larger than the sphere, so we
      // compose our own.
      renderNode={(p) => {
        const icon = p.node.icon;
        return icon ? (
          <>
            <Sphere {...p} />
            <Icon {...p} image={icon} size={p.size * 1.15} />
          </>
        ) : (
          <Sphere {...p} />
        );
      }}
      onNodeClick={(node) => {
        onSelectionNodeClick?.(node);
        onSelect(node.id);
      }}
      onNodeDoubleClick={(node) => onExpand(node.id)}
      onNodePointerOver={onNodePointerOver}
      onNodePointerOut={onNodePointerOut}
      onCanvasClick={(event) => {
        onSelectionCanvasClick?.(event);
        onSelect(null);
      }}
    />
  );
}
