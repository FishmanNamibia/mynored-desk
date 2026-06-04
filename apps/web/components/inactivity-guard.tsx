"use client";

import { useInactivityTimeout } from "@/hooks/use-inactivity-timeout";
import { AlertTriangle } from "lucide-react";

/**
 * Renders nothing most of the time. When the user has been idle for ~13 minutes
 * it shows a fixed warning banner at the top of the viewport. At 15 minutes of
 * inactivity the user is signed out and redirected to the login page.
 */
export function InactivityGuard() {
  const { showWarning, secondsLeft, dismissWarning } = useInactivityTimeout();

  if (!showWarning) return null;

  const mins = Math.floor(secondsLeft / 60);
  const secs = secondsLeft % 60;

  return (
    <div className="fixed top-0 inset-x-0 z-[9999] bg-red-600 text-white px-4 py-3 shadow-lg animate-in slide-in-from-top duration-300">
      <div className="flex items-center justify-center gap-3 max-w-3xl mx-auto text-sm font-medium">
        <AlertTriangle className="w-5 h-5 shrink-0" />
        <span>
          Your session will expire in{" "}
          <strong>
            {mins}:{secs.toString().padStart(2, "0")}
          </strong>{" "}
          due to inactivity.
        </span>
        <button
          onClick={dismissWarning}
          className="ml-2 px-3 py-1 rounded bg-white text-red-700 font-semibold text-xs hover:bg-red-50 transition-colors"
        >
          Stay signed in
        </button>
      </div>
    </div>
  );
}
