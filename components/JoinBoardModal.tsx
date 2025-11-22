"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UserPlus, X, ArrowRight } from "lucide-react";

interface JoinBoardModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function JoinBoardModal({ isOpen, onClose }: JoinBoardModalProps) {
  const router = useRouter();
  const [inviteCode, setInviteCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteCode.trim()) return;

    setIsLoading(true);
    try {
      // Navigate to invite page
      router.push(`/invite/${inviteCode.trim()}`);
    } catch (error) {
      console.error("Join board error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setInviteCode("");
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
              <UserPlus className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2
                className="text-xl font-semibold"
                style={{ color: "var(--text-primary)" }}
              >
                Join Board
              </h2>
              <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                Enter an invite code to collaborate
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
              htmlFor="inviteCode"
              className="text-sm font-medium block"
              style={{ color: "var(--text-primary)" }}
            >
              Invite Code
            </label>
            <input
              id="inviteCode"
              type="text"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value)}
              placeholder="Enter invite code..."
              className="w-full px-4 py-3 rounded-xl border-2 transition-all focus:outline-none focus:border-blue-500"
              style={{
                background: "var(--bg-primary)",
                borderColor: "var(--border)",
                color: "var(--text-primary)",
              }}
              autoFocus
              required
            />
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
              disabled={!inviteCode.trim() || isLoading}
              className="flex-1 px-4 py-3 rounded-xl font-medium transition-all hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100 flex items-center justify-center gap-2"
              style={{
                background:
                  inviteCode.trim() && !isLoading
                    ? "linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-primary) 100%)"
                    : "var(--bg-muted)",
                color:
                  inviteCode.trim() && !isLoading
                    ? "white"
                    : "var(--text-secondary)",
                boxShadow:
                  inviteCode.trim() && !isLoading
                    ? "0 4px 12px rgba(59, 130, 246, 0.3)"
                    : "none",
              }}
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Joining...
                </>
              ) : (
                <>
                  Join Board
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
