"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { ChevronRight, X } from "lucide-react";
import { modules, type UserRole } from "@/lib/rbac";
import { useAuth } from "@/lib/auth-context";
import { components } from "@/app/ui-standards";
import { useMobileSidebar } from "@/components/mobile-sidebar-wrapper";


export function DashboardSidebar() {
  const pathname = usePathname();
  const { user } = useAuth();
  const { isOpen, close } = useMobileSidebar();

  // RBAC filtering temporarily disabled - will be implemented later
  // const effectiveRole: UserRole = ((user?.roles && user.roles[0]) ||
  //   (user as any)?.role ||
  //   "employee") as UserRole;

  // Performance dashboard has its own sidebar (DashboardNav), so hide this one
  if (pathname.startsWith("/dashboard/performance/dashboard")) {
    return null;
  }

  const currentModule = modules.find(
    (module) =>
      pathname.startsWith(module.href) && module.href !== "/dashboard",
  );

  if (
    !currentModule ||
    !currentModule.subItems ||
    currentModule.subItems.length === 0
  ) {
    return null;
  }

  // Only selected live modules have clickable sidebar navigation.
  const isModuleEnabled = ["performance", "engineering-services"].includes(
    currentModule.id,
  );

  // Show all sub-items (RBAC filtering disabled)
  const accessibleSubItems = currentModule.subItems;

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-[60] lg:hidden"
          onClick={close}
          style={{ top: '64px' }}
        />
      )}

      {/* Sidebar */}
      <aside 
        className={cn(
          "w-64 h-full flex flex-col shrink-0 bg-card border-r border-border transition-transform duration-300 ease-in-out",
          "lg:relative lg:translate-x-0 lg:z-auto lg:top-0 lg:bottom-auto lg:left-auto",
          "fixed top-16 bottom-0 left-0 z-[70]",
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
      {/* Module Header */}
      <div 
        className="h-14 flex items-center px-4 justify-between"
        style={components.sidebarHeading}
      >
        <div className="flex-1 min-w-0">
          <div 
            className="font-semibold text-sm truncate"
            style={{ color: "white" }}
          >
            {currentModule.name}
          </div>
          <div 
            className="text-xs truncate"
            style={{ color: "rgba(255, 255, 255, 0.8)" }}
          >
            {currentModule.description}
          </div>
        </div>
        {/* Close button for mobile */}
        <button
          onClick={close}
          className="lg:hidden p-1 hover:bg-white/10 rounded transition-colors"
          aria-label="Close sidebar"
        >
          <X className="w-5 h-5 text-white" />
        </button>
      </div>

      {/* Navigation Items */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {accessibleSubItems.map((subItem) => {
          const isActive = pathname === subItem.href;

          // Muted (non-clickable) for all modules except Performance Management
          if (!isModuleEnabled) {
            return (
              <div
                key={subItem.href}
                className="flex items-center justify-between px-3 py-2.5 rounded-lg text-sm text-gray-400 cursor-not-allowed"
              >
                <span>{subItem.name}</span>
              </div>
            );
          }

          return (
            <Link key={subItem.href} href={subItem.href} onClick={() => close()}>
              <div
                className={cn(
                  "flex items-center justify-between px-3 py-2.5 rounded-lg transition-all text-sm group",
                  !isActive && "text-gray-600 hover:bg-gray-100"
                )}
                style={isActive ? components.sidebarActiveItem : {}}
              >
                <span>{subItem.name}</span>
                {isActive && <ChevronRight className="w-4 h-4" />}
              </div>
            </Link>
          );
        })}
      </nav>
    </aside>
    </>
  );
}
