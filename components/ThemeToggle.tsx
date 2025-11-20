"use client";

import { useStore } from "@/store";
import { Sun, Moon } from "lucide-react";
import { useEffect } from "react";

export function ThemeToggle() {
  const theme = useStore((s) => s.theme);
  const toggleTheme = useStore((s) => s.toggleTheme);

  // Initialize theme on mount
  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.setAttribute("data-theme", theme);
    }
  }, []);

  return (
    <button
      onClick={toggleTheme}
      className="w-10 h-10 rounded-md flex items-center justify-center transition-all duration-200"
      style={{
        background: "var(--bg-surface)",
        color: "var(--text-primary)",
        border: "1px solid var(--border)",
        boxShadow: "var(--shadow)",
      }}
      title={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
    >
      {theme === "light" ? <Moon size={18} /> : <Sun size={18} />}
    </button>
  );
}
