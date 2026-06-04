"use client";

import { useEffect } from "react";
import { useUserPreferences } from "@/lib/user-preferences";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { preferences, isLoaded } = useUserPreferences();

  useEffect(() => {
    if (!isLoaded) return;

    const applyTheme = (theme: "light" | "dark" | "system") => {
      const root = document.documentElement;
      
      if (theme === "system") {
        const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light";
        root.classList.toggle("dark", systemTheme === "dark");
      } else {
        root.classList.toggle("dark", theme === "dark");
      }
    };

    applyTheme(preferences.theme);

    // Listen for system theme changes if using system theme
    if (preferences.theme === "system") {
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
      const handleChange = (e: MediaQueryListEvent) => {
        document.documentElement.classList.toggle("dark", e.matches);
      };
      
      mediaQuery.addEventListener("change", handleChange);
      return () => mediaQuery.removeEventListener("change", handleChange);
    }
  }, [preferences.theme, isLoaded]);

  return <>{children}</>;
}
