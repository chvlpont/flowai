"use client";

import { Connection } from "@/types";
import { useStore } from "@/store";

export function ConnectionLine({ connection }: { connection: Connection }) {
  const notes = useStore((s) => s.notes);

  const fromNote = notes.find((n) => n.id === connection.from_object_id);
  const toNote = notes.find((n) => n.id === connection.to_object_id);

  if (!fromNote || !toNote) return null;

  // Calculate center points of notes
  const x1 = fromNote.x + fromNote.width / 2;
  const y1 = fromNote.y + fromNote.height / 2;
  const x2 = toNote.x + toNote.width / 2;
  const y2 = toNote.y + toNote.height / 2;

  return (
    <svg className="absolute inset-0 pointer-events-none" style={{ zIndex: 0 }}>
      <defs>
        <marker
          id={`arrowhead-${connection.id}`}
          markerWidth="10"
          markerHeight="10"
          refX="9"
          refY="3"
          orient="auto"
        >
          <polygon points="0 0, 10 3, 0 6" fill={connection.color} />
        </marker>
      </defs>
      <line
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke={connection.color}
        strokeWidth={connection.stroke_width}
        markerEnd={`url(#arrowhead-${connection.id})`}
      />
    </svg>
  );
}
