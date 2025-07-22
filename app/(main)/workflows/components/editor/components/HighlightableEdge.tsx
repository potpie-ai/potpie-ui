import { memo } from "react";
import { EdgeProps, getBezierPath } from "reactflow";

// Memoized custom edge component for better performance
export const HighlightableEdge = memo(
  ({
    id,
    source,
    target,
    selected,
    markerEnd,
    style,
    data,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
  }: EdgeProps) => {
    const [edgePath] = getBezierPath({
      sourceX,
      sourceY,
      sourcePosition,
      targetX,
      targetY,
      targetPosition,
      curvature: 0.5, // Increased curvature for more rounded edges
    });

    const isViewOnly = data?.viewOnly;

    return (
      <g className={`react-flow__edge ${selected ? "selected" : ""}`}>
        {/* Invisible thick path for easier selection - only in edit mode */}
        {!isViewOnly && (
          <path
            d={edgePath}
            stroke="transparent"
            strokeWidth={20}
            fill="none"
            style={{ cursor: "pointer" }}
            className="react-flow__edge-interaction"
          />
        )}
        {/* Visible edge */}
        <path
          id={id}
          d={edgePath}
          style={{
            ...(style || {}),
            stroke: selected ? "#f59e42" : style?.stroke || "#2563eb",
            strokeWidth: selected ? 4 : style?.strokeWidth || 2,
            fill: "none",
            cursor: isViewOnly ? "default" : "pointer",
          }}
          className="react-flow__edge-path"
          markerEnd={markerEnd}
        />
      </g>
    );
  }
);

HighlightableEdge.displayName = "HighlightableEdge";
