"use client";

import { useStore } from "@/store";
import { MousePointer2, StickyNote, Type, ArrowRight, Pencil } from "lucide-react";

export function Toolbar() {
  const selectedTool = useStore((s) => s.selectedTool);
  const setSelectedTool = useStore((s) => s.setSelectedTool);

  const tools = [
    { id: "select" as const, icon: MousePointer2, label: "Select" },
    { id: "note" as const, icon: StickyNote, label: "Note" },
    { id: "text" as const, icon: Type, label: "Text" },
    { id: "arrow" as const, icon: ArrowRight, label: "Arrow" },
    { id: "pen" as const, icon: Pencil, label: "Pen" },
  ];

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

        return (
          <button
            key={tool.id}
            onClick={() => setSelectedTool(tool.id)}
            className="w-12 h-12 rounded-md flex items-center justify-center transition-all duration-200"
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
          </button>
        );
      })}
    </div>
  );
}
