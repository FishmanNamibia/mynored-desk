"use client";

import { Menu } from "lucide-react";
import { useMobileSidebar } from "@/components/mobile-sidebar-wrapper";

export function SidebarToggleButton() {
  const { toggle } = useMobileSidebar();

  return (
    <button
      onClick={toggle}
      className="lg:hidden fixed bottom-6 right-6 z-50 bg-gradient-to-r from-red-600 to-rose-700 text-white p-4 rounded-full shadow-lg hover:shadow-xl transition-all hover:scale-105"
      aria-label="Toggle sidebar"
    >
      <Menu className="w-6 h-6" />
    </button>
  );
}
