"use client";

import { Connection } from "@/types";
import { useStore } from "@/store";

export function ConnectionLine({
  connection,
  onContextMenu,
}: {
  connection: Connection;
  onContextMenu?: (e: React.MouseEvent, id: string) => void;
}) {
  const notes = useStore((s) => s.notes);
  const selectedItemId = useStore((s) => s.selectedItemId);
  const setSelectedItemId = useStore((s) => s.setSelectedItemId);

  const fromNote = notes.find((n) => n.id === connection.from_object_id);
  const toNote = notes.find((n) => n.id === connection.to_object_id);

  if (!fromNote || !toNote) return null;

  const isSelected = selectedItemId === connection.id;

  // Calculate edge points instead of center points for better visual connection
  const fromCenterX = fromNote.x + fromNote.width / 2;
  const fromCenterY = fromNote.y + fromNote.height / 2;
  const toCenterX = toNote.x + toNote.width / 2;
  const toCenterY = toNote.y + toNote.height / 2;

  // Calculate connection points on the edges of the notes
  const dx = toCenterX - fromCenterX;
  const dy = toCenterY - fromCenterY;
  const angle = Math.atan2(dy, dx);

  // Calculate start point on edge of fromNote (proper rectangular edge intersection)
  const fromHalfWidth = fromNote.width / 2;
  const fromHalfHeight = fromNote.height / 2;
  let x1, y1;

  // Determine which edge of the rectangle the line intersects
  if (Math.abs(dx) / fromHalfWidth > Math.abs(dy) / fromHalfHeight) {
    // Intersects left or right edge
    x1 = fromCenterX + (dx > 0 ? fromHalfWidth : -fromHalfWidth);
    y1 = fromCenterY + (dy * fromHalfWidth) / Math.abs(dx);
  } else {
    // Intersects top or bottom edge
    x1 = fromCenterX + (dx * fromHalfHeight) / Math.abs(dy);
    y1 = fromCenterY + (dy > 0 ? fromHalfHeight : -fromHalfHeight);
  }

  // Calculate end point on edge of toNote (proper rectangular edge intersection)
  const toHalfWidth = toNote.width / 2;
  const toHalfHeight = toNote.height / 2;
  let x2, y2;

  // Determine which edge of the rectangle the line intersects
  if (Math.abs(dx) / toHalfWidth > Math.abs(dy) / toHalfHeight) {
    // Intersects left or right edge
    x2 = toCenterX + (dx > 0 ? -toHalfWidth : toHalfWidth);
    y2 = toCenterY - (dy * toHalfWidth) / Math.abs(dx);
  } else {
    // Intersects top or bottom edge
    x2 = toCenterX - (dx * toHalfHeight) / Math.abs(dy);
    y2 = toCenterY + (dy > 0 ? -toHalfHeight : toHalfHeight);
  }

  // Create curved path (Miro-style)
  const distance = Math.sqrt(dx * dx + dy * dy);
  const curvature = Math.min(distance * 0.2, 50); // Adaptive curvature

  const midX = (x1 + x2) / 2;
  const midY = (y1 + y2) / 2;

  // Control points for smooth curve
  const perpAngle = angle + Math.PI / 2;
  const cp1x = midX + Math.cos(perpAngle) * curvature * 0.3;
  const cp1y = midY + Math.sin(perpAngle) * curvature * 0.3;
  const cp2x = midX - Math.cos(perpAngle) * curvature * 0.3;
  const cp2y = midY - Math.sin(perpAngle) * curvature * 0.3;

  // Calculate bounding box for the SVG
  const allX = [x1, x2, cp1x, cp2x];
  const allY = [y1, y2, cp1y, cp2y];
  const minX = Math.min(...allX) - 30;
  const minY = Math.min(...allY) - 30;
  const maxX = Math.max(...allX) + 30;
  const maxY = Math.max(...allY) + 30;
  const width = maxX - minX;
  const height = maxY - minY;

  // Create smooth curved path
  const pathData = `M ${x1 - minX} ${y1 - minY} C ${cp1x - minX} ${
    cp1y - minY
  }, ${cp2x - minX} ${cp2y - minY}, ${x2 - minX} ${y2 - minY}`;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedItemId(connection.id);
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onContextMenu) {
      onContextMenu(e, connection.id);
    }
  };

  return (
    <svg
      className="absolute pointer-events-none"
      style={{
        left: minX,
        top: minY,
        width: width,
        height: height,
        zIndex: 15, // Higher than notes (10) but lower than selected notes (20)
        overflow: "visible",
      }}
    >
      <defs>
        <marker
          id={`arrowhead-${connection.id}`}
          markerWidth="10"
          markerHeight="8"
          refX="9"
          refY="4"
          orient="auto"
          markerUnits="strokeWidth"
        >
          {/* Miro-style sleek arrowhead */}
          <path
            d="M 0 0 L 10 4 L 0 8 L 2 4 Z"
            fill={isSelected ? "var(--accent-primary)" : connection.color}
            stroke="none"
          />
        </marker>

        {/* Subtle drop shadow for depth */}
        <filter
          id={`shadow-${connection.id}`}
          x="-50%"
          y="-50%"
          width="200%"
          height="200%"
        >
          <feDropShadow dx="1" dy="1" stdDeviation="1" floodOpacity="0.1" />
        </filter>
      </defs>

      {/* Invisible wider path for easier clicking */}
      <path
        d={pathData}
        stroke="transparent"
        strokeWidth="12"
        fill="none"
        style={{ pointerEvents: "auto", cursor: "pointer" }}
        onClick={handleClick}
        onContextMenu={handleContextMenu}
      />

      {/* Selection highlight */}
      {isSelected && (
        <path
          d={pathData}
          stroke="var(--accent-primary)"
          strokeWidth={(connection.stroke_width || 2) + 3}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ pointerEvents: "none", opacity: 0.3 }}
        />
      )}

      {/* Main curved line */}
      <path
        d={pathData}
        stroke={isSelected ? "var(--accent-primary)" : connection.color}
        strokeWidth={connection.stroke_width || 2}
        fill="none"
        markerEnd={`url(#arrowhead-${connection.id})`}
        strokeLinecap="round"
        strokeLinejoin="round"
        filter={`url(#shadow-${connection.id})`}
        style={{
          filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.1))",
          pointerEvents: "none",
        }}
      />
    </svg>
  );
}
