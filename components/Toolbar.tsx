"use client";

import { useStore } from "@/store";
import {
  MousePointer2,
  StickyNote,
  Type,
  ArrowRight,
  Pencil,
  ChevronDown,
} from "lucide-react";
import { useState } from "react";

export function Toolbar() {
  const selectedTool = useStore((s) => s.selectedTool);
  const setSelectedTool = useStore((s) => s.setSelectedTool);
  const strokeColor = useStore((s) => s.strokeColor);
  const setStrokeColor = useStore((s) => s.setStrokeColor);
  const strokeWidth = useStore((s) => s.strokeWidth);
  const setStrokeWidth = useStore((s) => s.setStrokeWidth);

  const tools = [
    { id: "select" as const, icon: MousePointer2, label: "Pointer" },
    { id: "note" as const, icon: StickyNote, label: "Note" },
    { id: "text" as const, icon: Type, label: "Text" },
    { id: "pen" as const, icon: Pencil, label: "Pen", expandable: true },
    { id: "arrow" as const, icon: ArrowRight, label: "Arrow" },
  ];

  const colors = [
    "#000000", // Black
    "#3b82f6", // Blue
    "#ef4444", // Red
    "#10b981", // Green
    "#f59e0b", // Orange
    "#8b5cf6", // Purple
    "#06b6d4", // Cyan
    "#f97316", // Deep Orange
    "#84cc16", // Lime
    "#ec4899", // Pink
    "#6b7280", // Gray
    "#fbbf24", // Yellow
  ];

  const thicknesses = [1, 2, 3, 4, 6, 8];

  return (
    <div
      className="fixed left-4 top-1/2 -translate-y-1/2 z-50 rounded-lg shadow-lg p-2 flex flex-col gap-2"
      style={{
        background: "var(--bg-surface)",
        border: "1px solid var(--border)",
      }}
    >
      {tools.map((tool) => {
        const Icon = tool.icon;
        const isActive = selectedTool === tool.id;
        const isPenTool = tool.id === "pen";

        return (
          <div key={tool.id} className="relative">
            <button
              onClick={() => setSelectedTool(tool.id)}
              className="w-12 h-12 rounded-md flex items-center justify-center transition-all duration-200 relative"
              style={
                isActive
                  ? {
                      background: "var(--accent-primary)",
                      color: "white",
                      boxShadow: "var(--hover-shadow)",
                    }
                  : {
                      background: "var(--bg-muted)",
                      color: "var(--text-primary)",
                    }
              }
              title={tool.label}
            >
              <Icon size={20} />
              {isPenTool && isActive && (
                <ChevronDown size={12} className="absolute bottom-1 right-1" />
              )}
            </button>

            {/* Pen tool expansion */}
            {isPenTool && isActive && (
              <div
                className="absolute left-14 top-0 rounded-lg shadow-lg p-3 min-w-[160px]"
                style={{
                  background: "var(--bg-surface)",
                  border: "1px solid var(--border)",
                }}
              >
                {/* Colors */}
                <div className="mb-3">
                  <div className="grid grid-cols-4 gap-1">
                    {colors.map((color) => (
                      <button
                        key={color}
                        className={`w-6 h-6 rounded-full border-2 transition-all hover:scale-110 ${
                          strokeColor === color
                            ? "border-gray-300 scale-110 shadow-md"
                            : "border-gray-200"
                        }`}
                        style={{ backgroundColor: color }}
                        onClick={() => setStrokeColor(color)}
                        title={`Color: ${color}`}
                      />
                    ))}
                  </div>
                </div>

                {/* Thickness */}
                <div>
                  <div className="grid grid-cols-3 gap-1">
                    {thicknesses.map((thickness) => (
                      <button
                        key={thickness}
                        className={`w-7 h-7 rounded flex items-center justify-center transition-all ${
                          strokeWidth === thickness
                            ? "bg-blue-100 border border-blue-300"
                            : "bg-gray-50 border border-gray-200 hover:bg-gray-100"
                        }`}
                        onClick={() => setStrokeWidth(thickness)}
                        title={`Thickness: ${thickness}px`}
                      >
                        <div
                          className="rounded-full"
                          style={{
                            width: `${Math.min(
                              Math.max(thickness * 1.5, 3),
                              12
                            )}px`,
                            height: `${Math.min(
                              Math.max(thickness * 1.5, 3),
                              12
                            )}px`,
                            backgroundColor:
                              strokeWidth === thickness ? "#2563eb" : "#6b7280",
                          }}
                        />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
