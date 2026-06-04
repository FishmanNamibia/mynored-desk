"use client";

import { useEffect } from "react";
import { GoldSpinner } from '@/components/ui/gold-spinner';

export default function PerformanceReportsPage() {
  useEffect(() => {
    // Redirect to the PMS application Reports section
    window.location.href = "http://localhost:3000/dashboard/reports";
  }, []);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <GoldSpinner size="md" message="Redirecting to Performance Reports..." />
    </div>
  );
}
