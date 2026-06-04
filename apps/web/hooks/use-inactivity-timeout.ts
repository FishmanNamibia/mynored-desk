"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { useAuth } from "@/lib/auth-context";

const ACTIVITY_EVENTS = [
  "mousedown",
  "mousemove",
  "keydown",
  "scroll",
  "touchstart",
  "click",
  "pointerdown",
] as const;

const TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes
const WARNING_MS = 2 * 60 * 1000; // Show warning 2 minutes before logout
const STORAGE_KEY = "nsa_last_activity";

/**
 * Hook that signs users out after 15 minutes of inactivity.
 *
 * - Tracks mouse, keyboard, scroll, and touch events
 * - Synchronises across tabs via localStorage
 * - Shows a warning 2 minutes before logout
 * - Calls the MSAL-based logout from auth-context
 */
export function useInactivityTimeout() {
  const { logout, isAuthenticated } = useAuth();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warningTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showWarning, setShowWarning] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearAllTimers = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);
    timerRef.current = null;
    warningTimerRef.current = null;
    countdownRef.current = null;
  }, []);

  const performLogout = useCallback(async () => {
    clearAllTimers();
    setShowWarning(false);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch { /* ignore */ }
    await logout();
  }, [logout, clearAllTimers]);

  const resetTimer = useCallback(() => {
    clearAllTimers();
    setShowWarning(false);

    // Record last activity time (shared across tabs)
    try {
      localStorage.setItem(STORAGE_KEY, Date.now().toString());
    } catch { /* ignore */ }

    // Warning timer — fires 2 minutes before logout
    warningTimerRef.current = setTimeout(() => {
      setShowWarning(true);
      setSecondsLeft(WARNING_MS / 1000);
      countdownRef.current = setInterval(() => {
        setSecondsLeft((prev) => {
          if (prev <= 1) {
            if (countdownRef.current) clearInterval(countdownRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }, TIMEOUT_MS - WARNING_MS);

    // Logout timer
    timerRef.current = setTimeout(() => {
      performLogout();
    }, TIMEOUT_MS);
  }, [clearAllTimers, performLogout]);

  const dismissWarning = useCallback(() => {
    // User acknowledged the warning → reset the timer
    resetTimer();
  }, [resetTimer]);

  useEffect(() => {
    if (!isAuthenticated) return;

    const handleActivity = () => {
      resetTimer();
    };

    // Cross-tab sync: when another tab updates last activity, reset here too
    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        resetTimer();
      }
    };

    // Start initial timer
    resetTimer();

    for (const event of ACTIVITY_EVENTS) {
      document.addEventListener(event, handleActivity, { passive: true });
    }
    window.addEventListener("storage", handleStorage);

    return () => {
      clearAllTimers();
      for (const event of ACTIVITY_EVENTS) {
        document.removeEventListener(event, handleActivity);
      }
      window.removeEventListener("storage", handleStorage);
    };
  }, [isAuthenticated, resetTimer, clearAllTimers]);

  return { showWarning, secondsLeft, dismissWarning };
}
