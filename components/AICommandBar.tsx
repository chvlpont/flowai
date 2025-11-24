"use client";

import { useStore } from "@/store";
import { useEffect, useState } from "react";
import { Sparkles, X, Loader2 } from "lucide-react";

interface AICommandBarProps {
  boardId: string;
  onCreateNotes: (notes: { content: string; color: string }[]) => void;
}

export function AICommandBar({ boardId, onCreateNotes }: AICommandBarProps) {
  const isOpen = useStore((s) => s.isAiCommandOpen);
  const setIsOpen = useStore((s) => s.setAiCommandOpen);
  const input = useStore((s) => s.aiCommandInput);
  const setInput = useStore((s) => s.setAiCommandInput);
  const notes = useStore((s) => s.notes);
  const selectedItemId = useStore((s) => s.selectedItemId);
  const selectedItemIds = useStore((s) => s.selectedItemIds);

  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
        setResponse(null);
        setError(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, setIsOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    setIsLoading(true);
    setError(null);
    setResponse(null);

    try {
      // Gather selected notes or all notes
      const allSelectedIds =
        selectedItemIds.length > 0
          ? selectedItemIds
          : selectedItemId
          ? [selectedItemId]
          : [];

      const selectedNotes = notes.filter((note) =>
        allSelectedIds.includes(note.id)
      );

      // Call AI API
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: input,
          boardData: selectedNotes.length === 0 ? notes : undefined,
          selectedNotes: selectedNotes.length > 0 ? selectedNotes : undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to get AI response");
      }

      if (data.action === "create_notes") {
        // Create notes on board
        onCreateNotes(data.notes);
        setIsOpen(false);
        setInput("");
      } else {
        // Show text response
        setResponse(data.content);
      }
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    setResponse(null);
    setError(null);
    setInput("");
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 flex items-start justify-center pt-32 px-4"
      style={{
        background: "rgba(0, 0, 0, 0.5)",
        backdropFilter: "blur(4px)",
        zIndex: 9999,
      }}
      onClick={handleClose}
    >
      <div
        className="w-full max-w-2xl rounded-lg shadow-2xl max-h-[80vh] overflow-y-auto"
        style={{
          background: "var(--bg-surface)",
          border: "1px solid var(--border)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center gap-3 px-4 py-3 border-b"
          style={{ borderColor: "var(--border)" }}
        >
          <Sparkles
            className="w-5 h-5"
            style={{ color: "var(--accent-primary)" }}
          />
          <span
            className="font-semibold text-lg"
            style={{ color: "var(--text-primary)" }}
          >
            AI Assistant
          </span>
          <button
            onClick={handleClose}
            className="ml-auto p-1 rounded hover:bg-opacity-10"
            style={{
              color: "var(--text-secondary)",
              transition: "background 0.2s",
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.background = "var(--hover-bg)")
            }
            onMouseLeave={(e) => (e.currentTarget.style.background = "")}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Input Form */}
        <form onSubmit={handleSubmit} className="p-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask AI anything... (e.g., 'Create 5 ideas for a mobile app')"
              className="flex-1 px-4 py-3 rounded-lg border outline-none text-base"
              style={{
                background: "var(--bg-primary)",
                border: "1px solid var(--border)",
                color: "var(--text-primary)",
              }}
              autoFocus
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="px-6 py-3 rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: "var(--accent-primary)",
                color: "white",
              }}
            >
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Ask"}
            </button>
          </div>

          {/* Context indicator */}
          {(selectedItemIds.length > 0 || selectedItemId) && (
            <div
              className="mt-3 text-sm px-3 py-2 rounded"
              style={{
                background: "var(--accent-primary-bg)",
                color: "var(--accent-primary)",
              }}
            >
              Using{" "}
              {selectedItemIds.length > 0
                ? `${selectedItemIds.length} selected items`
                : "1 selected item"}{" "}
              as context
              {selectedItemIds.length > 20 && " (limited to 20)"}
            </div>
          )}
        </form>

        {/* Response */}
        {response && (
          <div
            className="px-4 pb-4 pt-2 border-t"
            style={{ borderColor: "var(--border)" }}
          >
            <div
              className="p-4 rounded-lg"
              style={{
                background: "var(--bg-primary)",
                color: "var(--text-primary)",
              }}
            >
              <div className="whitespace-pre-wrap">{response}</div>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div
            className="px-4 pb-4 pt-2 border-t"
            style={{ borderColor: "var(--border)" }}
          >
            <div
              className="p-4 rounded-lg"
              style={{
                background: "var(--accent-red-bg)",
                color: "var(--accent-red)",
              }}
            >
              {error}
            </div>
          </div>
        )}

        {/* Quick Examples */}
        {!response && !error && !isLoading && (
          <div
            className="px-4 pb-4 pt-2 border-t"
            style={{ borderColor: "var(--border)" }}
          >
            <div
              className="text-xs mb-2"
              style={{ color: "var(--text-secondary)" }}
            >
              Try these:
            </div>
            <div className="flex flex-wrap gap-2">
              {[
                "Create 5 ideas for a SaaS product",
                "Summarize this board",
                "Expand on the selected note",
                "Generate project tasks",
              ].map((example) => (
                <button
                  key={example}
                  onClick={() => setInput(example)}
                  className="text-xs px-3 py-1.5 rounded-full border transition-all"
                  style={{
                    border: "1px solid var(--border)",
                    color: "var(--text-secondary)",
                    background: "transparent",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = "var(--hover-bg)")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = "transparent")
                  }
                >
                  {example}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
