"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";

export type ThemeMode = "light" | "dark";

interface ThemeContextValue {
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

const STORAGE_KEY = "od-theme";

function readInitialTheme(): ThemeMode {
  // Public site açık temaya sabitlendi (panel kapalı). <html data-theme="light">
  // attribute'u öncelikli okunur; aksi her durumda varsayılan light.
  if (typeof document === "undefined") return "light";
  const attr = document.documentElement.getAttribute("data-theme");
  if (attr === "dark" || attr === "light") return attr;
  return "light";
}

function applyTheme(theme: ThemeMode) {
  if (typeof document === "undefined") return;
  document.documentElement.setAttribute("data-theme", theme);
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {}
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeMode>("light");

  useEffect(() => {
    // On mount: pick up stored / system preference and apply to <html>
    const initial = readInitialTheme();
    setThemeState(initial);
    applyTheme(initial);
    // NOT: Daha önce unmount'ta `data-theme=light` zorlanıyordu; bu kullanıcı
    // tercihini eziyor ve panelden public siteye geçişte temayı bozuyordu.
    // Artık tema seçimi tüm site genelinde korunur (varsayılan: dark).
  }, []);

  const setTheme = useCallback((next: ThemeMode) => {
    setThemeState(next);
    applyTheme(next);
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => {
      const next = prev === "dark" ? "light" : "dark";
      applyTheme(next);
      return next;
    });
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    // Safe fallback for components rendered outside provider
    return {
      theme: "light",
      setTheme: () => {},
      toggleTheme: () => {}
    };
  }
  return ctx;
}
