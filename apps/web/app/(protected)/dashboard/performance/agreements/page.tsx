"use client";

import { redirect } from "next/navigation";

export default function PerformanceAgreementsPage() {
  // Redirect to the integrated PMS performance agreements tracking
  redirect('/dashboard/performance/dashboard/performance-agreements-tracking');
}
