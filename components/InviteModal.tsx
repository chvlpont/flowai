"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase/client";

export function InviteModal({ boardId }: { boardId: string }) {
  const [inviteLink, setInviteLink] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  const generateInvite = async () => {
    const inviteCode = Math.random().toString(36).substring(2, 15);

    const { data } = await supabase
      .from("board_invites")
      .insert({
        board_id: boardId,
        invite_code: inviteCode,
        created_by: "temp-user-id",
        max_uses: 100,
      })
      .select()
      .single();

    if (data) {
      const link = `${window.location.origin}/invite/${inviteCode}`;
      setInviteLink(link);
    }
  };

  return (
    <>
      <button
        onClick={() => {
          setIsOpen(true);
          generateInvite();
        }}
        className="px-4 py-2 bg-green-500 text-white rounded shadow"
      >
        📤 Share
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full">
            <h2 className="text-xl font-bold mb-4">Share Board</h2>

            <div className="flex gap-2">
              <input
                type="text"
                value={inviteLink}
                readOnly
                className="flex-1 px-3 py-2 border rounded"
              />
              <button
                onClick={() => navigator.clipboard.writeText(inviteLink)}
                className="px-4 py-2 bg-blue-500 text-white rounded"
              >
                Copy
              </button>
            </div>

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
