"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { DashboardNav } from "@/components/performance/components/dashboard/nav";
import { Menu } from "lucide-react";

/**
 * Enhanced role mapping using AD job title and department information.
 * Maps the main app user to a PMS role string.
 */
function mapToPmsRole(user: any): string {
  const jobTitle = (user?.jobTitle || "").toLowerCase();
  const department = (user?.department || "").toLowerCase();

  if (
    jobTitle.includes("admin") ||
    jobTitle.includes("administrator") ||
    jobTitle.includes("system")
  )
    return "ADMIN";
  if (jobTitle.includes("secretary") && jobTitle.includes("general"))
    return "SG";
  if (
    jobTitle.includes("deputy") &&
    (jobTitle.includes("secretary") || jobTitle.includes("sg"))
  )
    return "DEPUTY_SG";
  if (jobTitle.includes("executive")) {
    if (
      department.includes("human capital") ||
      department.includes("human resources") ||
      department.includes("hr")
    )
      return "HUMAN_CAPITAL_EXECUTIVE";
    return "EXECUTIVE";
  }

  const userRoles = user?.roles || [];
  const executiveRole = userRoles.find((role: string) => {
    const r = role.toLowerCase();
    return (
      r.includes("executive") &&
      (r.includes("human capital") || r.includes("human resources"))
    );
  });
  if (executiveRole) return "HUMAN_CAPITAL_EXECUTIVE";

  if (
    jobTitle.includes("od specialist") ||
    (jobTitle.includes("organization") && jobTitle.includes("development"))
  )
    return "OD_SPECIALIST";
  if (
    jobTitle.includes("manager") ||
    jobTitle.includes("mgr") ||
    jobTitle.includes("head")
  )
    return "MANAGER";
  if (jobTitle.includes("assistant") || jobTitle.includes("admin"))
    return "ADMINISTRATIVE_ASSISTANT";

  if (userRoles.length > 0) {
    const role = userRoles[0].toLowerCase();
    if (role.includes("admin")) return "ADMIN";
    if (
      role.includes("sg") ||
      role.includes("secretary") ||
      role.includes("general")
    )
      return "SG";
    if (role.includes("deputy")) return "DEPUTY_SG";
    if (role.includes("executive") || role.includes("exec")) return "EXECUTIVE";
    if (role.includes("manager") || role.includes("mgr")) return "MANAGER";
    if (role.includes("assistant")) return "ADMINISTRATIVE_ASSISTANT";
    if (role.includes("viewer") || role.includes("view")) return "VIEWER";
  }

  return "STAFF";
}

export function UnifiedSidebarWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = useAuth();
  const pathname = usePathname();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [deadlineStats, setDeadlineStats] = useState<any>(null);

  const isPerformancePage = pathname.startsWith("/dashboard/performance");
  const pmsRole = user ? mapToPmsRole(user) : undefined;

  // Fetch deadline stats when on performance pages
  useEffect(() => {
    if (!user?.id || !isPerformancePage) return;

    const fetchStats = async () => {
      try {
        const res = await fetch(
          "/dashboard/performance/api/performance-agreements/list-deadlines",
          { credentials: "include" }
        );
        if (res.ok) {
          const data = await res.json();
          setDeadlineStats(data);
        }
      } catch (e) {
        console.error("[sidebar] Error fetching deadline stats:", e);
      }
    };

    fetchStats();
  }, [user?.id, isPerformancePage]);

  // Close mobile sidebar on route change
  useEffect(() => {
    setIsMobileOpen(false);
  }, [pathname]);

  const navUser = user
    ? {
        name: (user as any)?.displayName || user.email,
        email: user.email,
        role: pmsRole,
        profilePicture: null,
      }
    : undefined;

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden relative">
      <DashboardNav
        user={navUser}
        pmsRole={pmsRole}
        deadlineStats={deadlineStats}
        isMobileOpen={isMobileOpen}
        onMobileClose={() => setIsMobileOpen(false)}
      />
      <main className="flex-1 overflow-y-auto bg-background">
        {/* Mobile sidebar toggle bar — visible only on small screens for module pages */}
        {isPerformancePage && (
          <div className="lg:hidden sticky top-0 z-40 flex items-center gap-3 px-4 py-2.5 bg-white border-b border-gray-200 shadow-sm">
            <button
              onClick={() => setIsMobileOpen((prev) => !prev)}
              className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-gray-100 transition-colors"
              aria-label="Toggle navigation menu"
            >
              <Menu className="w-5 h-5 text-gray-700" />
            </button>
            <span className="text-sm font-semibold text-gray-700">Performance Management</span>
          </div>
        )}
        {children}
      </main>
    </div>
  );
}
