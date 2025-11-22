"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { Board, Profile } from "@/types";
import BoardCard from "@/components/BoardCard";
import { Plus, UserPlus, LogOut, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import { User } from "@supabase/supabase-js";

export default function BoardsPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [myBoards, setMyBoards] = useState<Board[]>([]);
  const [sharedBoards, setSharedBoards] = useState<Board[]>([]);
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/");
        return;
      }

      setUser(user);

      // Fetch profile
      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (profileData) {
        setProfile(profileData);
      }

      // Fetch user's boards
      const { data: boardsData, error: boardsError } = await supabase
        .from("boards")
        .select("*")
        .eq("owner_id", user.id)
        .order("created_at", { ascending: false });

      if (boardsError) {
        console.error("Error fetching boards:", boardsError);
      } else {
        setMyBoards(boardsData || []);
      }

      // Fetch shared boards
      const { data: collaborationsData, error: collabError } = await supabase
        .from("board_collaborators")
        .select("board_id, boards(*)")
        .eq("user_id", user.id)
        .neq("boards.owner_id", user.id);

      if (collabError) {
        console.error("Error fetching collaborations:", collabError);
      } else {
        const shared = collaborationsData
          ?.map((c: any) => c.boards)
          .filter(Boolean) as Board[];
        setSharedBoards(shared || []);
      }
    } catch (error) {
      console.error("Error:", error);
      toast.error("Failed to load boards");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      const response = await fetch("/api/auth/signout", {
        method: "POST",
      });
      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error);
      } else {
        await supabase.auth.signOut();
        router.push("/");
      }
    } catch (error) {
      console.error("Logout error:", error);
      toast.error("Failed to log out");
    } finally {
      setLoggingOut(false);
    }
  };

  const handleCreateBoard = async () => {
    const boardName = prompt("Enter a name for your new board:");
    if (!boardName || !boardName.trim()) return;

    try {
      const { data, error } = await supabase
        .from("boards")
        .insert({
          title: boardName.trim(),
          owner_id: user?.id,
        })
        .select()
        .single();

      if (error) {
        toast.error("Failed to create board");
        console.error(error);
      } else {
        toast.success("Board created successfully!");
        router.push(`/board/${data.id}`);
      }
    } catch (error) {
      console.error("Create board error:", error);
      toast.error("Failed to create board");
    }
  };

  const handleJoinBoard = () => {
    const inviteCode = prompt("Enter the invite code:");
    if (!inviteCode || !inviteCode.trim()) return;

    router.push(`/invite/${inviteCode.trim()}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto" />
          <p className="text-text-secondary">Loading your boards...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border bg-surface/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold bg-primary bg-clip-text text-transparent">
            Flowai
          </h1>
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="flex items-center gap-2 px-4 py-2 text-sm text-text-secondary hover:text-accent-red hover:bg-accent-red/10 rounded-lg transition-all disabled:opacity-50"
          >
            <LogOut className="w-4 h-4" />
            {loggingOut ? "Logging out..." : "Log Out"}
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto px-6 py-8 space-y-8 w-full">
        {/* Greeting */}
        <div className="space-y-2">
          <h2 className="text-3xl font-bold text-text-primary">
            Hello, {profile?.display_name || profile?.username || "User"} 👋
          </h2>
          <p className="text-text-secondary">Here are your boards:</p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-3">
          <button
            onClick={handleCreateBoard}
            className="flex items-center gap-2 px-6 py-3 bg-primary hover:from-primary-hover hover:to-accent-purple text-white font-semibold rounded-lg transition-all shadow-lg hover:shadow-xl"
          >
            <Plus className="w-5 h-5" />
            Create Board
          </button>
          <button
            onClick={handleJoinBoard}
            className="flex items-center gap-2 px-6 py-3 bg-surface border border-border hover:border-primary text-text-primary font-semibold rounded-lg transition-all hover:shadow-lg"
          >
            <UserPlus className="w-5 h-5" />
            Join Board
          </button>
        </div>

        {/* My Boards Section */}
        <section className="space-y-4">
          <h3 className="text-xl font-semibold text-text-primary">My Boards</h3>
          <div className="bg-surface border border-border rounded-2xl p-6 min-h-[200px]">
            {myBoards.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full py-12 text-center">
                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                  <Plus className="w-8 h-8 text-text-secondary" />
                </div>
                <p className="text-text-secondary text-lg">
                  No boards yet. Create your first board to get started!
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {myBoards.map((board) => (
                  <BoardCard key={board.id} board={board} />
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Shared With You Section */}
        {sharedBoards.length > 0 && (
          <section className="space-y-4">
            <h3 className="text-xl font-semibold text-text-primary">
              Shared With You
            </h3>
            <div className="bg-surface border border-border rounded-2xl p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {sharedBoards.map((board) => (
                  <BoardCard key={board.id} board={board} isShared />
                ))}
              </div>
            </div>
          </section>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-border mt-auto">
        <div className="max-w-7xl mx-auto px-6 py-6 text-center">
          <p className="text-sm text-text-secondary">© 2025 FlowAI</p>
        </div>
      </footer>
    </div>
  );
}
