"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  Search,
  ChevronDown,
  Grid3x3,
  Settings,
  LogOut,
  User,
  Menu,
  X,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MegaMenu } from "@/components/mega-menu";
import { useAuth } from "@/lib/auth-context";
import { useUserPreferences } from "@/lib/user-preferences";
import { colors, gradients, shadows, typography, components } from "@/app/ui-standards";
import { AuthLoading } from "@/components/auth-loading";
import { HeaderWeatherWidget } from "@/components/widgets/header-weather-widget";
import { HeaderDateTimeWidget } from "@/components/widgets/header-datetime-widget";
import { ThemeToggle } from "@/components/theme-toggle";
import { MainHeaderNotificationBell } from "@/components/notifications/main-header-notification-bell";
import { GlobalSearch } from "@/components/global-search";
// import { SidebarTrigger } from "@/components/ui/sidebar";

export function DashboardHeader() {
  const pathname = usePathname();
  const [megaMenuOpen, setMegaMenuOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const { user, logout } = useAuth();
  const { preferences } = useUserPreferences();

  // Header weather pill has been removed in favor of the
  // full dashboard weather card.

  // Prefer display name from backend session, then split first/last name,
  // then fall back to username/preferences.
  const resolvedDisplayName =
    (user as any)?.displayName ||
    (user?.firstName && user?.lastName
      ? `${user.firstName} ${user.lastName}`
      : user?.username || preferences.displayName || "");

  const userEmail = user?.email || preferences.email;
  const jobTitle =
    (user as any)?.jobTitle || (user as any)?.position || "Staff Member";

  const userInitials = String(resolvedDisplayName)
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();

  // No header-level location/weather; this is now shown
  // in the main dashboard weather widget instead.

  return (
    <header 
      className="sticky top-0 z-50"
      style={{
        ...components.header,
      }}
    >
      <div className="h-16 flex items-center justify-between px-3 sm:px-4 w-full">
        {/* Mobile menu button */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden text-white hover:text-white/80 transition-colors p-2"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Left: Logo + primary nav */}
        <div className="flex items-center gap-4 lg:gap-10 shrink-0">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 sm:gap-3 hover:opacity-90 transition-opacity"
          >
            <Image
              src="/nored-logo.svg"
              alt="NORED"
              width={160}
              height={54}
              className="h-8 sm:h-10 w-auto"
              priority
            />
            <div className="hidden sm:flex flex-col">
              <span className="text-white text-lg sm:text-xl leading-tight">
                NORED <span style={{ color: colors.gold }}>Desk</span>
              </span>
              <span 
                className="text-white/60 uppercase"
                style={{ 
                  fontSize: "9px", 
                  letterSpacing: "1.5px",
                  marginTop: "2px"
                }}
              >
                Electricity For Development
              </span>
            </div>
          </Link>

          <nav className="hidden lg:flex items-center gap-4">
            <Link 
              href="/dashboard"
              className={cn(
                "px-5 py-2 text-sm font-semibold rounded-full transition-all",
                pathname === "/dashboard"
                  ? "text-gray-900"
                  : "text-white/80 hover:text-white hover:bg-white/10",
              )}
              style={pathname === "/dashboard" ? { backgroundColor: colors.gold } : {}}
            >
              NORED Desk
            </Link>

            <div className="relative">
              <button
                className={cn(
                  "px-3 py-1.5 text-sm font-medium flex items-center gap-1.5 transition-colors rounded-full",
                  megaMenuOpen
                    ? "text-white bg-white/10"
                    : "text-white/80 hover:text-white hover:bg-white/10",
                )}
                onClick={() => setMegaMenuOpen(!megaMenuOpen)}
                onMouseEnter={() => setMegaMenuOpen(true)}
                onMouseLeave={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  if (e.clientY > rect.bottom) {
                    return;
                  }
                  setMegaMenuOpen(false);
                }}
              >
                Modules
                <ChevronDown
                  className={cn(
                    "w-3.5 h-3.5 transition-transform",
                    megaMenuOpen && "rotate-180",
                  )}
                />
              </button>

              <div onMouseEnter={() => setMegaMenuOpen(true)}>
                <MegaMenu
                  isOpen={megaMenuOpen}
                  onClose={() => setMegaMenuOpen(false)}
                />
              </div>
            </div>
          </nav>
        </div>

        {/* Center: Search + Weather */}
        <div className="flex items-center gap-2 sm:gap-4 lg:gap-6 flex-1 justify-center max-w-2xl mx-auto">
          <GlobalSearch 
            className="flex-1 max-w-lg"
            placeholder="Search..."
          />
          
          {/* Time & Weather Widgets - Hidden on smaller screens */}
          <div className="hidden lg:flex lg:items-center lg:gap-4">
            <HeaderDateTimeWidget />
            <div className="w-px h-6 bg-border"></div>
            <HeaderWeatherWidget />
          </div>
        </div>

        {/* Right: User actions */}
        <div className="flex items-center gap-2 sm:gap-4 shrink-0">
          <MainHeaderNotificationBell />

          <div className="hidden sm:block">
            <ThemeToggle />
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 sm:gap-3 hover:opacity-90 transition-opacity cursor-pointer">
                <div className="hidden sm:flex flex-col items-end">
                  <span className="text-sm font-semibold text-white">
                    {resolvedDisplayName}
                  </span>
                  <span 
                    className="text-xs uppercase tracking-wide"
                    style={{ color: colors.gold }}
                  >
                    {jobTitle}
                  </span>
                </div>
                <div 
                  className="w-8 sm:w-10 h-8 sm:h-10 rounded-lg flex items-center justify-center text-sm sm:text-base font-bold overflow-hidden relative"
                  style={components.avatar}
                >
                  {(user as any)?.profilePictureUrl ? (
                    <Image
                      src={(user as any)?.profilePictureUrl}
                      alt={resolvedDisplayName}
                      fill
                      className="object-cover rounded-lg"
                      sizes="40px"
                      unoptimized
                    />
                  ) : (
                    userInitials
                  )}
                </div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium">{resolvedDisplayName}</p>
                  <p className="text-xs text-muted-foreground">{userEmail}</p>
                  <p className="text-xs text-muted-foreground">{jobTitle}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link
                  href="/dashboard/settings"
                  className="flex items-center cursor-pointer"
                >
                  <User className="w-4 h-4 mr-2" />
                  Profile Settings
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={async () => {
                  setIsLoggingOut(true);
                  await logout();
                }}
                className="text-destructive cursor-pointer"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div 
          className="lg:hidden absolute top-16 left-0 right-0 border-t border-white/10 z-40"
          style={{
            background: gradients.navyHeader,
          }}
        >
          <div className="px-3 py-4 space-y-3">
            {/* Mobile Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
              <Input
                placeholder="Search resources, documents..."
                className="pl-10 pr-4 h-10 border border-white/10 text-white placeholder:text-white/40 focus-visible:ring-0 focus:border-white/20 text-sm"
                style={{
                  backgroundColor: "rgba(0,0,0,0.25)",
                  borderRadius: "12px",
                }}
              />
            </div>

            {/* Mobile Navigation */}
            <div className="space-y-3">
              <Link 
                href="/dashboard"
                className={cn(
                  "block px-2 py-1.5 text-sm font-semibold rounded-xl transition-all",
                  pathname === "/dashboard"
                    ? "text-gray-900"
                    : "text-white/80 hover:text-white hover:bg-white/10",
                )}
                style={pathname === "/dashboard" ? { backgroundColor: colors.gold } : {}}
                onClick={() => setMobileMenuOpen(false)}
              >
                NORED Desk
              </Link>
              
              <button
                className="w-full text-left px-2 py-1.5 text-sm font-medium text-white/80 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
                onClick={() => {
                  setMegaMenuOpen(!megaMenuOpen);
                }}
              >
                <div className="flex items-center justify-between">
                  Modules
                  <ChevronDown
                    className={cn(
                      "w-4 h-4 transition-transform",
                      megaMenuOpen && "rotate-180",
                    )}
                  />
                </div>
              </button>

              {/* Mobile Mega Menu */}
              {megaMenuOpen && (
                <div className="pl-4 space-y-2">
                  <MegaMenu
                    isOpen={megaMenuOpen}
                    onClose={() => {
                      setMegaMenuOpen(false);
                      setMobileMenuOpen(false);
                    }}
                    isMobile={true}
                  />
                </div>
              )}
            </div>

            {/* Mobile User Actions */}
            <div className="pt-3 border-t border-white/10 space-y-2">
              <Link
                href="/dashboard/settings"
                className="flex items-center gap-2 px-3 py-2 text-sm text-white/80 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                <Settings className="w-4 h-4" />
                Settings
              </Link>
              
              <button
                onClick={async () => {
                  setMobileMenuOpen(false);
                  setIsLoggingOut(true);
                  await logout();
                }}
                className="flex items-center gap-2 px-3 py-2 text-sm text-red-300 hover:text-red-200 hover:bg-red-500/10 rounded-xl transition-colors w-full text-left"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}

      {isLoggingOut && (
        <div className="fixed inset-0 z-60">
            <AuthLoading
              title="Signing you out"
              description="We are securely closing your NORED Desk session."
            />
        </div>
      )}
    </header>
  );
}
