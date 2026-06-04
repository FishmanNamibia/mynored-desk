"use client";

import { useEffect } from "react";
import { GoldSpinner } from '@/components/ui/gold-spinner';

export default function Performance360Page() {
  useEffect(() => {
    // Redirect to the PMS application 360 Feedback section
    window.location.href = "http://localhost:3000/dashboard/rating-360";
  }, []);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <GoldSpinner size="md" message="Redirecting to 360 Feedback..." />
    </div>
  );
}
