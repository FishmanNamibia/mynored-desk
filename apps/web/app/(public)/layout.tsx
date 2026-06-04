import type React from "react";
import { ThemeProvider } from "@/components/theme-provider";

/**
 * Public Routes Layout
 *
 * Login and other public pages.
 */

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ThemeProvider>{children}</ThemeProvider>;
}
