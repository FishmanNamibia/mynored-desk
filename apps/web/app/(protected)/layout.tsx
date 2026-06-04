import type React from "react";
import { DashboardHeader } from "@/components/dashboard-header";
import { UserPreferencesProvider } from "@/lib/user-preferences";
import { ThemeProvider } from "@/components/theme-provider";
import { UnifiedSidebarWrapper } from "@/components/unified-sidebar-wrapper";
import { InactivityGuard } from "@/components/inactivity-guard";
import { Rating360Reminder } from "@/components/performance/rating-360-reminder";

/**
 * Protected Routes Layout
 *
 * This layout wraps all protected routes inside (protected).
 * Middleware ensures cookie exists before reaching here.
 * The UnifiedSidebarWrapper provides a context-aware sidebar
 * that adapts its navigation items based on the current module.
 * InactivityGuard signs users out after 15 minutes of inactivity.
 */

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <UserPreferencesProvider>
      <ThemeProvider>
        <InactivityGuard />
        <div className="min-h-screen flex flex-col bg-background">
          <DashboardHeader />
          <UnifiedSidebarWrapper>{children}</UnifiedSidebarWrapper>
          <Rating360Reminder />
        </div>
      </ThemeProvider>
    </UserPreferencesProvider>
  );
}
