"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import { AuthLoading } from "@/components/auth-loading";

export interface User {
  id: string;
  username?: string;
  email: string;
  firstName?: string;
  lastName?: string;
  displayName?: string;
  jobTitle?: string;
  department?: string;
  division?: string;
  companyName?: string;
  lastLoginAt?: string;
  roles?: string[];
  permissions?: string[];
  profilePictureUrl?: string;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  initiateLogin: (credentials: LoginCredentials) => Promise<void>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const PUBLIC_PATHS = new Set([
  "/",
  "/auth/entra",
  "/diagnostics",
  "/test-msal",
  "/test-direct-msal",
]);

function getApiUrl(): string {
  const configuredUrl =
    (typeof window === "undefined"
      ? process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_URL
      : process.env.NEXT_PUBLIC_API_URL) || "http://localhost:34567";
  const normalizedUrl = /^https?:\/\//i.test(configuredUrl)
    ? configuredUrl
    : `http://${configuredUrl}`;

  if (typeof window !== "undefined") {
    // Route browser auth traffic through the web app so local development
    // stays same-origin and avoids cross-port fetch failures.
    return "";
  }

  return normalizedUrl.replace(/\/$/, "");
}

async function parseErrorMessage(response: Response): Promise<string> {
  try {
    const body = await response.json();
    if (typeof body?.message === "string") {
      return body.message;
    }
  } catch {
    // Ignore JSON parse failures and fall back to a generic message.
  }

  return `Request failed with status ${response.status}`;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  const checkSession = useCallback(async (): Promise<User | null> => {
    const apiUrl = getApiUrl();

    try {
      const response = await fetch(`${apiUrl}/api/auth/me`, {
        credentials: "include",
        cache: "no-store",
      });

      if (response.ok) {
        const data = await response.json();
        return data.user || null;
      }

      if (response.status === 401) {
        const refreshResponse = await fetch(`${apiUrl}/api/auth/refresh-session`, {
          method: "POST",
          credentials: "include",
        });

        if (!refreshResponse.ok) {
          return null;
        }

        const retryResponse = await fetch(`${apiUrl}/api/auth/me`, {
          credentials: "include",
          cache: "no-store",
        });

        if (!retryResponse.ok) {
          return null;
        }

        const data = await retryResponse.json();
        return data.user || null;
      }

      return null;
    } catch (error) {
      console.error("[Auth] Session check failed:", error);
      return null;
    }
  }, []);

  const refreshSession = useCallback(async () => {
    const sessionUser = await checkSession();
    setUser(sessionUser);
  }, [checkSession]);

  useEffect(() => {
    let cancelled = false;

    const loadSession = async () => {
      const sessionUser = await checkSession();
      if (cancelled) {
        return;
      }

      setUser(sessionUser);
      setLoading(false);
    };

    loadSession();

    return () => {
      cancelled = true;
    };
  }, [checkSession]);

  useEffect(() => {
    if (!loading && !user && pathname.startsWith("/dashboard")) {
      router.replace("/?sessionExpired=1");
    }
  }, [loading, pathname, router, user]);

  const initiateLogin = useCallback(
    async (credentials: LoginCredentials) => {
      const username = credentials.username.trim();
      const password = credentials.password;

      if (!username || !password) {
        throw new Error("Enter your username or email and password.");
      }

      const apiUrl = getApiUrl();
      const response = await fetch(`${apiUrl}/api/auth/login`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username,
          password,
        }),
      });

      if (!response.ok) {
        throw new Error(await parseErrorMessage(response));
      }

      const sessionUser = await checkSession();
      setUser(sessionUser);
      router.replace("/dashboard");
    },
    [checkSession, router],
  );

  const logout = useCallback(async () => {
    const apiUrl = getApiUrl();

    try {
      await fetch(`${apiUrl}/api/auth/logout`, {
        method: "POST",
        credentials: "include",
      });
    } catch (error) {
      console.warn("[Auth] Logout request failed:", error);
    } finally {
      setUser(null);
      router.replace("/");
    }
  }, [router]);

  const value: AuthContextType = {
    user,
    loading,
    isAuthenticated: !!user,
    initiateLogin,
    logout,
    refreshSession,
  };

  if (loading && !PUBLIC_PATHS.has(pathname)) {
    return (
      <AuthLoading
        title="Preparing NORED Desk"
        description="Restoring your secure session."
      />
    );
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
