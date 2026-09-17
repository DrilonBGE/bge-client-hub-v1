import { useCallback, useEffect, useState } from "react";

export type ThemeMode = "light" | "dark";

const KEY = "bge-theme";

function apply(mode: ThemeMode) {
  const root = document.documentElement;
  root.classList.toggle("dark", mode === "dark");
  root.style.colorScheme = mode;
}

/** Light/dark preference, remembered in the browser. Defaults to dark. */
export function useTheme() {
  const [mode, setMode] = useState<ThemeMode>("dark");

  useEffect(() => {
    const stored = window.localStorage.getItem(KEY);
    const next: ThemeMode = stored === "light" || stored === "dark" ? stored : "dark";
    setMode(next);
    apply(next);
  }, []);

  const set = useCallback((next: ThemeMode) => {
    setMode(next);
    apply(next);
    window.localStorage.setItem(KEY, next);
  }, []);

  const toggle = useCallback(() => set(mode === "dark" ? "light" : "dark"), [mode, set]);

  return { mode, set, toggle };
}
