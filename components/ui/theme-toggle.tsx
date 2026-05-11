"use client";

import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { useTheme } from "@/components/providers/theme-provider";

interface ThemeToggleProps {
  variant?: "pill" | "icon";
  className?: string;
}

export function ThemeToggle({ variant = "icon", className }: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = mounted && theme === "dark";
  const label = isDark ? "Açık temaya geç" : "Koyu temaya geç";

  if (variant === "pill") {
    return (
      <button
        type="button"
        onClick={toggleTheme}
        aria-label={label}
        title={label}
        className={`pd-theme-toggle pd-theme-toggle-pill ${className ?? ""}`}
      >
        <span className="pd-theme-toggle-thumb" data-active={isDark ? "dark" : "light"}>
          {isDark ? <Moon size={12} /> : <Sun size={12} />}
        </span>
        <span className="pd-theme-toggle-label">{isDark ? "Koyu" : "Açık"}</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={label}
      title={label}
      className={`pd-theme-toggle pd-theme-toggle-icon ${className ?? ""}`}
    >
      {isDark ? <Sun size={14} /> : <Moon size={14} />}
    </button>
  );
}
