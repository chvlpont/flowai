"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();
  const [title, setTitle] = useState("");

  const createBoard = async () => {
    const { data } = await supabase
      .from("boards")
      .insert({ title, owner_id: "temp-user-id" })
      .select()
      .single();

    if (data) router.push(`/board/${data.id}`);
  };

  return (
    <div className="flex items-center justify-center h-screen">
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Create Board</h1>
        <input
          type="text"
          placeholder="Board name"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="px-4 py-2 border rounded w-full"
        />
        <button
          onClick={createBoard}
          className="w-full px-4 py-2 bg-blue-500 text-white rounded"
        >
          Create Board
        </button>
      </div>
    </div>
  );
}
