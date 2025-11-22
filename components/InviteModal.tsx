"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase/client";
import toast from "react-hot-toast";

export function InviteModal({ boardId }: { boardId: string }) {
  const [inviteLink, setInviteLink] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
  }, []);

  const generateInvite = async () => {
    // Generate longer invite code
    const inviteCode =
      Math.random().toString(36).substring(2, 20) +
      Math.random().toString(36).substring(2, 20);

    const { data } = await supabase
      .from("board_invites")
      .insert({
        board_id: boardId,
        invite_code: inviteCode,
        created_by: user?.id || "temp-user-id",
        max_uses: 100,
      })
      .select()
      .single();

    if (data) {
      setInviteLink(inviteCode);
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink);
      toast.success("Invite code copied to clipboard!");
      setIsOpen(false); // Close modal after copying
    } catch (err) {
      toast.error("Failed to copy code");
    }
  };

  return (
    <>
      <button
        onClick={() => {
          setIsOpen(true);
          generateInvite();
        }}
        className="w-10 h-10 rounded shadow flex items-center justify-center transition-all hover:scale-[1.05]"
        style={{
          background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
          color: "white",
          border: "none",
          boxShadow: "0 2px 8px rgba(16, 185, 129, 0.3)",
        }}
        title="Share Board"
      >
        <span className="text-lg">📤</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full">
            <h2 className="text-xl font-bold mb-4">Share Board</h2>

            <p className="mb-4 text-gray-600">
              Invite code generated! Click below to copy it.
            </p>

            <button
              onClick={copyToClipboard}
              className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Copy Invite Code
            </button>

            <button
              onClick={() => setIsOpen(false)}
              className="mt-4 w-full px-4 py-2 bg-gray-200 rounded"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
}
