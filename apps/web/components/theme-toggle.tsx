"use client";

import { Moon, Sun } from "lucide-react";
import { useUserPreferences } from "@/lib/user-preferences";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function ThemeToggle() {
  const { preferences, updatePreferences } = useUserPreferences();

  const icons = {
    light: Sun,
    dark: Moon,
  };

  const CurrentIcon = icons[preferences.theme] || Sun;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="text-white/70 hover:text-white transition-colors cursor-pointer p-2"
          aria-label="Toggle theme"
        >
          <CurrentIcon className="w-4 sm:w-5 h-4 sm:h-5" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuLabel className="text-xs font-semibold text-muted-foreground">
          Appearance
        </DropdownMenuLabel>
        <DropdownMenuItem
          onClick={() => updatePreferences({ theme: "light" })}
          className={cn(
            "flex items-center gap-3 cursor-pointer",
            preferences.theme === "light" && "bg-accent"
          )}
        >
          <Sun className="h-4 w-4 text-red-500" />
          <span className="flex-1">Light</span>
          {preferences.theme === "light" && (
            <span className="text-primary font-bold">✓</span>
          )}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => updatePreferences({ theme: "dark" })}
          className={cn(
            "flex items-center gap-3 cursor-pointer",
            preferences.theme === "dark" && "bg-accent"
          )}
        >
          <Moon className="h-4 w-4 text-rose-600" />
          <span className="flex-1">Dark</span>
          {preferences.theme === "dark" && (
            <span className="text-primary font-bold">✓</span>
          )}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
