"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react";
import { useAuth } from "./auth-context";

export interface UserPreferences {
  version?: number; // Add version to track preference schema changes
  profileImage: string | null;
  displayName: string;
  email: string;
  accentColor: string;
  wallpaper: string;
  theme: "light" | "dark" | "system";
  sidebarCollapsed: boolean;
  showQuickLinks: boolean;
  showNewsWidget: boolean;
  dashboardLayout: "grid" | "list";
  notifications: {
    workflowApprovals: boolean;
    memosAnnouncements: boolean;
    taskAssignments: boolean;
    securityAlerts: boolean;
  };
}

const PREFERENCES_VERSION = 2; // Increment this to force reset old preferences

const defaultPreferences: UserPreferences = {
  version: PREFERENCES_VERSION,
  profileImage: null,
  displayName: "",
  email: "",
  accentColor: "red",
  wallpaper: "none",
  theme: "light",
  sidebarCollapsed: false, // Unchecked by default (sidebar expanded)
  showQuickLinks: true, // Checked by default
  showNewsWidget: true, // Checked by default
  dashboardLayout: "grid",
  notifications: {
    workflowApprovals: true,
    memosAnnouncements: true,
    taskAssignments: true,
    securityAlerts: true,
  },
};

interface UserPreferencesContextType {
  preferences: UserPreferences;
  updatePreferences: (updates: Partial<UserPreferences>) => void;
  resetPreferences: () => void;
  isLoaded: boolean;
}

const UserPreferencesContext = createContext<
  UserPreferencesContextType | undefined
>(undefined);

export function UserPreferencesProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();

  const resolvedDisplayName =
    user?.firstName && user?.lastName
      ? `${user.firstName} ${user.lastName}`
      : user?.username || user?.email || "";

  const resolvedEmail = user?.email || "";

  const [preferences, setPreferences] = useState<UserPreferences>({
    ...defaultPreferences,
    displayName: resolvedDisplayName,
    email: resolvedEmail,
  });
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("mynsa-desk-preferences");
    let loadedPreferences = { ...defaultPreferences };
    let shouldSave = false;
    
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        
        // Check version - if old version or no version, reset to defaults
        if (!parsed.version || parsed.version < PREFERENCES_VERSION) {
          console.log("Old preferences version detected, resetting to defaults");
          loadedPreferences = { ...defaultPreferences };
          shouldSave = true;
        } else {
          // Merge saved preferences with defaults, ensuring all default fields exist
          loadedPreferences = {
            ...defaultPreferences,
            ...parsed,
            version: PREFERENCES_VERSION,
            // Ensure nested objects are properly merged
            notifications: {
              ...defaultPreferences.notifications,
              ...(parsed.notifications || {})
            }
          };
        }
      } catch (e) {
        console.error("Failed to parse preferences:", e);
        // On error, use defaults
        loadedPreferences = { ...defaultPreferences };
        shouldSave = true;
      }
    } else {
      // No saved preferences - use defaults
      console.log("No saved preferences found, using defaults");
      shouldSave = true;
    }
    
    // Always use current user data
    loadedPreferences.displayName = resolvedDisplayName;
    loadedPreferences.email = resolvedEmail;
    
    // Save to localStorage if needed
    if (shouldSave) {
      localStorage.setItem("mynsa-desk-preferences", JSON.stringify(loadedPreferences));
    }
    
    setPreferences(loadedPreferences);
    
    // Apply accent color and wallpaper immediately on load
    applyAccentColor(loadedPreferences.accentColor);
    applyWallpaper(loadedPreferences.wallpaper);
    
    setIsLoaded(true);
  }, [resolvedDisplayName, resolvedEmail]);

  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem(
        "mynsa-desk-preferences",
        JSON.stringify(preferences),
      );
      applyAccentColor(preferences.accentColor);
      applyWallpaper(preferences.wallpaper);
    }
  }, [preferences, isLoaded]);

  const updatePreferences = (updates: Partial<UserPreferences>) => {
    setPreferences((prev) => ({ ...prev, ...updates }));
  };

  const resetPreferences = () => {
    setPreferences(defaultPreferences);
    localStorage.removeItem("mynsa-desk-preferences");
  };

  return (
    <UserPreferencesContext.Provider
      value={{ preferences, updatePreferences, resetPreferences, isLoaded }}
    >
      {children}
    </UserPreferencesContext.Provider>
  );
}

export function useUserPreferences() {
  const context = useContext(UserPreferencesContext);
  if (!context) {
    return {
      preferences: defaultPreferences,
      updatePreferences: () => {},
      resetPreferences: () => {},
      isLoaded: false,
    };
  }
  return context;
}

export const accentColors = {
  orange: { name: "Warm Orange", value: "oklch(0.72 0.15 65)", hex: "#f39c12" },
  blue: { name: "Ocean Blue", value: "oklch(0.55 0.15 240)", hex: "#3498db" },
  green: {
    name: "Forest Green",
    value: "oklch(0.55 0.15 145)",
    hex: "#27ae60",
  },
  purple: {
    name: "Royal Purple",
    value: "oklch(0.5 0.15 290)",
    hex: "#9b59b6",
  },
  red: { name: "NORED Red", value: "oklch(0.58 0.21 27)", hex: "#ef4444" },
  teal: { name: "Teal", value: "oklch(0.6 0.12 195)", hex: "#1abc9c" },
} as const;

export const wallpapers = {
  none: { name: "None", preview: null },
  gradient1: {
    name: "Sunset Gradient",
    preview: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
  },
  gradient2: {
    name: "Ocean Breeze",
    preview: "linear-gradient(135deg, #11998e 0%, #38ef7d 100%)",
  },
  gradient3: {
    name: "Warm Flame",
    preview: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
  },
  gradient4: {
    name: "Deep Space",
    preview: "linear-gradient(135deg, #1a3a6b 0%, #0c1929 100%)",
  },
} as const;

function applyAccentColor(colorKey: string) {
  const color = accentColors[colorKey as keyof typeof accentColors];
  if (color && typeof document !== "undefined") {
    document.documentElement.style.setProperty("--accent-orange", color.value);
  }
}

function applyWallpaper(wallpaperKey: string) {
  if (typeof document === "undefined") return;
  
  const wallpaper = wallpapers[wallpaperKey as keyof typeof wallpapers];
  if (wallpaper?.preview) {
    document.documentElement.style.setProperty("--wallpaper-bg", wallpaper.preview);
  } else {
    document.documentElement.style.removeProperty("--wallpaper-bg");
  }
}
