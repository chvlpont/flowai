"use client";

import React from "react";
import { supabase } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import toast from "react-hot-toast";

const Hello = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleLogout = async () => {
    setLoading(true);
    const response = await fetch("/api/auth/signout", {
      method: "POST",
    });
    const data = await response.json();
    setLoading(false);
    if (!response.ok) {
      toast.error(data.error);
    } else {
      // Clear client session
      await supabase.auth.signOut();
      router.push("/"); // Redirect to home page
    }
  };

  return (
    <div>
      Hello
      <button
        onClick={handleLogout}
        disabled={loading}
        className="px-4 py-2 bg-red-500 text-white rounded shadow hover:bg-red-600 transition"
        style={{ position: "absolute", top: 16, right: 16 }}
      >
        {loading ? "Logging out..." : "Log Out"}
      </button>
    </div>
  );
};

export default Hello;
