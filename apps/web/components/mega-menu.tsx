"use client";

import type React from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { modules, type Module, type UserRole } from "@/lib/rbac";
import { useAuth } from "@/lib/auth-context";

interface MegaMenuProps {
  isOpen: boolean;
  onClose: () => void;
  isMobile?: boolean;
}

export function MegaMenu({ isOpen, onClose, isMobile = false }: MegaMenuProps) {
  const router = useRouter();
  const { user } = useAuth();

  const effectiveRole: UserRole = ((user?.roles && user.roles[0]) ||
    (user as any)?.role ||
    "employee") as UserRole;

  // RBAC filtering temporarily disabled - will be implemented later
  // const accessibleModules = modules.filter((module) =>
  //   module.requiredRoles.includes(effectiveRole),
  // );
  const accessibleModules = modules;

  const categories = [
    {
      name: "CORE",
      color: "text-primary",
      modules: accessibleModules.filter((m) =>
        ["memos", "tasks"].includes(m.id),
      ),
    },
    {
      name: "HUMAN CAPITAL",
      color: "text-red-700",
      modules: accessibleModules.filter((m) => ["performance", "hr"].includes(m.id)),
    },
    {
      name: "ADMIN & IT",
      color: "text-rose-700",
      modules: accessibleModules.filter((m) => ["admin", "it"].includes(m.id)),
    },
    {
      name: "ENGINEERING SERVICES",
      color: "text-red-700",
      modules: accessibleModules.filter((m) => ["engineering-services"].includes(m.id)),
    },
    {
      name: "DOCUMENTS",
      color: "text-red-600",
      modules: accessibleModules.filter((m) => ["documents"].includes(m.id)),
    },
    {
      name: "REPORTS & SETTINGS",
      color: "text-rose-600",
      modules: accessibleModules.filter((m) =>
        ["reports", "settings"].includes(m.id),
      ),
    },
  ].filter((category) => category.modules.length > 0);

  // All modules are now live and accessible
  const isModuleEnabled = (_module: Module) => true;

  const handleModuleClick = (module: Module) => {
    if (!isModuleEnabled(module)) return;
    router.push(module.href);
    onClose();
  };

  const handleSubItemClick = (href: string, moduleId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isModuleEnabled({ id: moduleId } as Module)) return;
    router.push(href);
    onClose();
  };

  if (!isOpen) return null;

  // Mobile version - simplified list layout
  if (isMobile) {
    return (
      <div className="space-y-1">
        {categories.map((category) => (
          <div key={category.name} className="space-y-1">
            <div className="text-xs font-semibold uppercase tracking-wider text-white/60 px-2 py-1">
              {category.name}
            </div>
            {category.modules.map((module) => (
              <button
                key={module.id}
                onClick={() => handleModuleClick(module)}
                disabled={!isModuleEnabled(module)}
                className={cn(
                  "w-full text-left px-2 py-2 text-sm rounded transition-colors",
                  isModuleEnabled(module)
                    ? "text-white/80 hover:text-white hover:bg-white/5 cursor-pointer"
                    : "text-white/30 cursor-not-allowed"
                )}
              >
                {module.name}{!isModuleEnabled(module) && " (Coming Soon)"}
              </button>
            ))}
          </div>
        ))}
      </div>
    );
  }

  // Desktop version - full grid layout
  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40" onClick={onClose} />

      <div className="fixed left-0 right-0 top-16 bg-popover border-b border-border shadow-xl z-50 animate-in fade-in slide-in-from-top-2 duration-150 max-h-[calc(100vh-4rem)] overflow-y-auto mega-menu-scrollable" onMouseLeave={onClose}>
        <div className="w-full px-4 sm:px-6 py-6 sm:py-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6 sm:gap-8 max-w-[1600px] mx-auto">
            {categories.map((category) => (
              <div key={category.name} className="space-y-3">
                <h3
                  className={cn(
                    "text-xs font-bold uppercase tracking-wider pb-2 border-b-2 border-current",
                    category.color,
                  )}
                >
                  {category.name}
                </h3>

                <div className="space-y-1">
                  {category.modules.map((module) => {
                    // RBAC filtering temporarily disabled
                    // const accessibleSubItems = module.subItems?.filter((item) =>
                    //   item.requiredRoles.includes(effectiveRole),
                    // );
                    const accessibleSubItems = module.subItems;

                    return (
                      <div key={module.id}>
                        {/* Main module link — hide title for hr (show sub-items only, grayed out) */}
                        {module.id !== 'hr' && (
                          <button
                            onClick={() => handleModuleClick(module)}
                            disabled={!isModuleEnabled(module)}
                            className={cn(
                              "w-full text-left py-1.5 text-sm font-semibold transition-colors",
                              isModuleEnabled(module)
                                ? "text-foreground hover:text-primary cursor-pointer"
                                : "text-muted-foreground/50 cursor-not-allowed"
                            )}
                          >
                            {module.name}{!isModuleEnabled(module) && " (Coming Soon)"}
                          </button>
                        )}

                        {accessibleSubItems &&
                          accessibleSubItems.length > 0 &&
                          module.id !== "performance" && (
                            <div className="space-y-0.5 mb-3">
                              {accessibleSubItems.slice(0, 6).map((subItem) => (
                                <button
                                  key={subItem.href}
                                  onClick={(e) =>
                                    handleSubItemClick(subItem.href, module.id, e)
                                  }
                                  disabled={!isModuleEnabled(module)}
                                  className={cn(
                                    "w-full text-left py-0.5 text-sm transition-colors",
                                    isModuleEnabled(module)
                                      ? "text-muted-foreground hover:text-primary cursor-pointer"
                                      : "text-muted-foreground/40 cursor-not-allowed"
                                  )}
                                >
                                  {subItem.name}
                                </button>
                              ))}
                              {accessibleSubItems.length > 6 && isModuleEnabled(module) && (
                                <button
                                  onClick={() => handleModuleClick(module)}
                                  className="w-full text-left py-0.5 text-xs text-primary font-medium hover:underline"
                                >
                                  View all ({accessibleSubItems.length})...
                                </button>
                              )}
                            </div>
                          )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
