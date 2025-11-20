"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function InvitePage({ params }: { params: { code: string } }) {
  const router = useRouter();

  useEffect(() => {
    const acceptInvite = async () => {
      // Get invite
      const { data: invite } = await supabase
        .from("board_invites")
        .select("*")
        .eq("invite_code", params.code)
        .single();

      if (!invite) {
        alert("Invalid invite link");
        return;
      }

      // Add user as collaborator
      await supabase.from("board_collaborators").insert({
        board_id: invite.board_id,
        user_id: "temp-user-id",
        role: "editor",
      });

      // Increment uses
      await supabase
        .from("board_invites")
        .update({ current_uses: invite.current_uses + 1 })
        .eq("id", invite.id);

      // Redirect to board
      router.push(`/board/${invite.board_id}`);
    };

    acceptInvite();
  }, [params.code, router]);

  return (
    <div className="flex items-center justify-center h-screen">
      <p>Joining board...</p>
    </div>
  );
}
