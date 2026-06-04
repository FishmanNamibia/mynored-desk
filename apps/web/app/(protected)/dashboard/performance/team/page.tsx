"use client";

import { redirect } from "next/navigation";

export default function TeamPerformancePage() {
  // Redirect to the integrated PMS performance management dashboard
  redirect('/dashboard/performance/dashboard/performance-management');
}
