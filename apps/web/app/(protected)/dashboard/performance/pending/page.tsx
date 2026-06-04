"use client";

import { useEffect } from "react";
import { Loader2 } from "lucide-react";

export default function PendingPerformancePage() {
  useEffect(() => {
    // Redirect to the PMS application My Tasks section  
    window.location.href = "http://localhost:3000/dashboard/my-tasks";
  }, []);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
        <p className="text-gray-600">Redirecting to Pending Tasks...</p>
      </div>
    </div>
  );
}
