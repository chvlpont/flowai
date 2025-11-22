"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { Plus, X, ArrowRight } from "lucide-react";
import toast from "react-hot-toast";

interface CreateBoardModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
}

export function CreateBoardModal({
  isOpen,
  onClose,
  userId,
}: CreateBoardModalProps) {
  const router = useRouter();
  const [boardName, setBoardName] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!boardName.trim()) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("boards")
        .insert({
          title: boardName.trim(),
          owner_id: userId,
        })
        .select()
        .single();

      if (error) {
        toast.error("Failed to create board");
        console.error(error);
      } else {
        toast.success("Board created successfully!");
        router.push(`/board/${data.id}`);
        handleClose();
      }
    } catch (error) {
      console.error("Create board error:", error);
      toast.error("Failed to create board");
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setBoardName("");
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm p-4">
      <div
        className="w-full max-w-md rounded-2xl shadow-2xl border animate-in fade-in-0 zoom-in-95 duration-200"
        style={{
          background: "var(--bg-surface)",
          borderColor: "var(--border)",
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 pb-4">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{
                background: "var(--accent-primary)",
              }}
            >
              <Plus className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2
                className="text-xl font-semibold"
                style={{ color: "var(--text-primary)" }}
              >
                Create Board
              </h2>
              <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                Start a new collaborative workspace
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-all hover:scale-105"
            style={{
              background: "var(--bg-muted)",
              color: "var(--text-secondary)",
            }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 pt-2 space-y-6">
          <div className="space-y-2">
            <label
              htmlFor="boardName"
              className="text-sm font-medium block"
              style={{ color: "var(--text-primary)" }}
            >
              Board Name
            </label>
            <input
              id="boardName"
              type="text"
              value={boardName}
              onChange={(e) => setBoardName(e.target.value)}
              placeholder="My Awesome Board"
              className="w-full px-4 py-3 rounded-xl border-2 transition-all focus:outline-none focus:border-blue-500"
              style={{
                background: "var(--bg-primary)",
                borderColor: "var(--border)",
                color: "var(--text-primary)",
              }}
              autoFocus
              required
              maxLength={50}
            />
            <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
              {boardName.length}/50 characters
            </p>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 px-4 py-3 rounded-xl font-medium transition-all hover:scale-[1.02]"
              style={{
                background: "var(--bg-muted)",
                color: "var(--text-primary)",
                border: "1px solid var(--border)",
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!boardName.trim() || isLoading}
              className="flex-1 px-4 py-3 rounded-xl font-medium transition-all hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100 flex items-center justify-center gap-2"
              style={{
                background:
                  boardName.trim() && !isLoading
                    ? "linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-primary) 100%)"
                    : "var(--bg-muted)",
                color:
                  boardName.trim() && !isLoading
                    ? "white"
                    : "var(--text-secondary)",
                boxShadow:
                  boardName.trim() && !isLoading
                    ? "0 4px 12px rgba(59, 130, 246, 0.3)"
                    : "none",
              }}
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  Create Board
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
