"use client";

import { Board } from "@/types";
import { Clock, Users } from "lucide-react";
import { useRouter } from "next/navigation";

interface BoardCardProps {
  board: Board;
  isShared?: boolean;
}

export default function BoardCard({ board, isShared = false }: BoardCardProps) {
  const router = useRouter();

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    const diffInDays = Math.floor(diffInHours / 24);

    if (diffInHours < 1) return "Just now";
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInDays < 7) return `${diffInDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <button
      onClick={() => router.push(`/board/${board.id}`)}
      className="group relative w-full bg-surface border border-border rounded-xl overflow-hidden hover:shadow-lg hover:border-primary/50 transition-all duration-300 text-left"
    >
      {/* Thumbnail */}
      <div className="h-40 bg-gradient-to-br from-primary/20 via-accent-purple/20 to-accent-cyan/20 relative overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-6xl font-bold text-text-primary/10">
            {board.title.charAt(0).toUpperCase()}
          </div>
        </div>

        {/* Overlay on hover */}
        <div className="absolute inset-0 bg-primary/0 group-hover:bg-primary/10 transition-colors duration-300" />
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        {/* Title */}
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-text-primary text-lg line-clamp-1 group-hover:text-primary transition-colors">
            {board.title}
          </h3>
          {isShared && (
            <div className="flex-shrink-0 bg-accent-purple/10 text-accent-purple text-xs px-2 py-1 rounded-full flex items-center gap-1">
              <Users className="w-3 h-3" />
              <span>Shared</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-2 text-xs text-text-secondary">
          <Clock className="w-3.5 h-3.5" />
          <span>Created {formatDate(board.created_at)}</span>
        </div>
      </div>
    </button>
  );
}
