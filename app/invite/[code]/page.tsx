"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

export default function InvitePage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const { code } = use(params);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
  }, []);

  useEffect(() => {
    if (!user) return;

    const acceptInvite = async () => {
      // Get invite
      const { data: invite } = await supabase
        .from("board_invites")
        .select("*")
        .eq("invite_code", code)
        .single();

      if (!invite) {
        alert("Invalid invite link");
        return;
      }

      // Add user as collaborator
      await supabase.from("board_collaborators").insert({
        board_id: invite.board_id,
        user_id: user.id,
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
  }, [code, router, user]);

  return (
    <div className="flex items-center justify-center h-screen">
      <p>Joining board...</p>
    </div>
  );
}
