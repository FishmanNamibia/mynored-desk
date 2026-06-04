"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const viewLinks = [
  {
    label: "Overview",
    href: "/dashboard/engineering-services/new-connection-management",
  },
  {
    label: "Capture",
    href: "/dashboard/engineering-services/new-connection-management/capture",
  },
  {
    label: "Operations",
    href: "/dashboard/engineering-services/new-connection-management/operations",
  },
  {
    label: "Connections",
    href: "/dashboard/engineering-services/new-connection-management/register",
  },
  {
    label: "Status lookup",
    href: "/dashboard/engineering-services/new-connection-management/status-lookup",
  },
  {
    label: "Analytics",
    href: "/dashboard/engineering-services/new-connection-management/analytics",
  },
  {
    label: "Reports",
    href: "/dashboard/engineering-services/new-connection-management/reports",
  },
];

interface NewConnectionShellProps {
  description: string;
  children: ReactNode;
}

export function NewConnectionShell({
  description,
  children,
}: NewConnectionShellProps) {
  const pathname = usePathname();

  return (
    <div className="w-full space-y-6 px-6 py-8">
      <div className="space-y-4">
        <div className="space-y-3">
          <Badge className="w-fit bg-red-50 text-red-700 hover:bg-red-50">
            Engineering Services
          </Badge>
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">
              New Connection Management
            </h1>
            <p className="mt-2 max-w-4xl text-sm text-muted-foreground">{description}</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {viewLinks.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href.endsWith("/register") && pathname.startsWith(`${item.href}/`));

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "rounded-full border px-4 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "border-red-600 bg-red-600 text-white"
                    : "border-red-200 bg-white text-red-700 hover:bg-red-50",
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      </div>

      {children}
    </div>
  );
}
