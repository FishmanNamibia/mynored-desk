"use client";

import { useEffect, useState } from "react";
import { TasksWidget } from "@/components/widgets/tasks-widget";
import { EventsWidget } from "@/components/widgets/events-widget";
import { MeetingsWidget } from "@/components/widgets/meetings-widget";
import { ColleaguesBirthdaysWidget } from "@/components/widgets/colleagues-birthdays-widget";
import { ProjectTrackingWidget } from "@/components/widgets/project-tracking-widget";
import { BannerQuoteWidget } from "@/components/widgets/banner-quote-widget";
import { CyberSecurityTipWidget } from "@/components/widgets/cybersecurity-tip-widget";
import { CyberSecurityDailyModal } from "@/components/widgets/cyber-security-daily-modal";
import { ChatbotWidget } from "@/components/widgets/chatbot-widget";
import { TrainingCoursesWidget } from "@/components/widgets/training-courses-widget";
import { NoticesCarouselWidget } from "@/components/widgets/notices-carousel-widget";
import { WelcomeNSASlider } from "@/components/widgets/welcome-nsa-slider";
import { FinancialYearBadge } from "@/components/financial-year-badge";
import { LeadershipManagementModal } from "@/components/leadership-management-modal";
import { useUserPreferences, wallpapers } from "@/lib/user-preferences";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent } from "@/components/ui/card";
import { KpiCard, KpiGrid, type KpiType } from "@/components/ui/kpi-card";
import { KpiModal } from "@/components/ui/kpi-modal";
import { gradients, components } from "@/app/ui-standards";
import { GoldSpinner } from '@/components/ui/gold-spinner';
import { Button } from "@/components/ui/button";
import { Plus, ChevronLeft, ChevronRight, X, Calendar } from "lucide-react";
import { canManageContent } from "@/lib/permissions";

interface DashboardKpis {
  // Performance Management KPIs
  totalActions: number;
  notStarted: number;
  inProgress: number;
  completed: number;
  overdue: number;
  
  // Legacy KPIs (keeping for compatibility)
  tasks: number;
  approvals: number;
  memos: number;
  meetings: number;
  reviews: number;
  requests: number;
  activePeriod: {
    name: string;
    startDate: string;
    endDate: string;
    daysLeft: number;
  } | null;
}

export default function DashboardPage() {
  const { preferences, isLoaded } = useUserPreferences();
  const { user } = useAuth();
  const [kpis, setKpis] = useState<DashboardKpis | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedKpi, setSelectedKpi] = useState<{ type: KpiType; value: number; href?: string } | null>(null);
  const [leadershipModalOpen, setLeadershipModalOpen] = useState(false);
  const [leadershipKey, setLeadershipKey] = useState(0);

  useEffect(() => {
    if (!user?.id) return;
    fetch('/api/dashboard-kpis', { credentials: 'include' })
      .then(res => res.ok ? res.json() : null)
      .then(data => { if (data) setKpis(data) })
      .catch(() => {});
  }, [user?.id]);

  if (!isLoaded) {
    return (
      <div className="min-h-full flex items-center justify-center">
        <div className="text-center">
          <GoldSpinner size="lg" message="Loading NORED Desk..." />
        </div>
      </div>
    );
  }

  const wallpaperStyle: React.CSSProperties =
    preferences.wallpaper !== "none" &&
    wallpapers[preferences.wallpaper as keyof typeof wallpapers]?.preview
      ? {
          background:
            wallpapers[preferences.wallpaper as keyof typeof wallpapers]
              .preview as string,
        }
      : {};

  const resolvedDisplayName =
    (user as any)?.displayName ||
    (user?.firstName && user?.lastName
      ? `${user.firstName} ${user.lastName}`
      : user?.username || preferences.displayName || "");

  const firstName = resolvedDisplayName.split(" ")[0];

  const handleKpiClick = (type: KpiType, value: number, href?: string) => {
    setSelectedKpi({ type, value, href });
    setModalOpen(true);
  };

  return (
    <div className="min-h-full" style={wallpaperStyle}>
      {/* Daily Cyber Security Tip — blocks screen until user clicks Noted */}
      <CyberSecurityDailyModal userId={user?.id} />
      {/* Floating chatbot — IT Support & Suggestion Box */}
      <ChatbotWidget />
      <div className="p-3 sm:p-4 lg:p-6 space-y-4 sm:space-y-5 lg:space-y-6">
        {/* Enhanced Welcome Header Card */}
        <div 
          className="relative overflow-hidden rounded-md p-6 sm:p-8"
          style={components.greetingBanner}
        >
          {/* Ambient gold glow - top right */}
          <div 
            className="absolute top-0 right-0 w-80 h-80 opacity-20"
            style={{
              background: gradients.goldGlow,
              filter: "blur(40px)"
            }}
          />
          {/* Ambient navy glow - bottom left */}
          <div 
            className="absolute -bottom-10 -left-10 w-48 h-48 opacity-15"
            style={{
              background: gradients.goldGlowSubtle,
              filter: "blur(30px)"
            }}
          />
          
          <div className="relative z-10 flex flex-col gap-6">
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
              <div className="flex-1">
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white leading-tight mb-2">
                  Good {getGreeting()}, {firstName}!
                </h1>
                <p className="text-sm sm:text-base text-white/70 leading-relaxed mb-3">
                  Here&apos;s what&apos;s happening on your desk today.
                </p>
                
                {/* Performance Period Banner - Glassmorphic Card */}
                <div className="inline-flex relative rounded-lg border border-white/20 bg-white/10 backdrop-blur-md shadow-md overflow-hidden w-fit">
                  {/* Subtle gradient overlay */}
                  <div className="absolute inset-0 bg-gradient-to-r from-white/5 to-transparent pointer-events-none" />
                  
                  <div className="relative z-10 px-2.5 py-1.5 flex items-center gap-2">
                    {/* Calendar Icon */}
                    <div className="flex-shrink-0">
                      <div className="w-6 h-6 rounded-md bg-white/15 backdrop-blur-sm flex items-center justify-center border border-white/20">
                        <Calendar className="w-3.5 h-3.5 text-white" />
                      </div>
                    </div>
                    
                    {/* Content */}
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-semibold text-white whitespace-nowrap">
                        FY 2025/2026 Performance Period
                      </span>
                      <span className="text-white/60 text-xs">•</span>
                      <span className="text-xs font-medium text-white/90 whitespace-nowrap">
                        {kpis?.activePeriod?.daysLeft || 42} days left
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex flex-row items-start gap-3">
                <CyberSecurityTipWidget compact />
                <BannerQuoteWidget />
              </div>
            </div>
          </div>
        </div>

        {/* Performance KPI Cards Grid */}
        <KpiGrid columns={6}>
          <KpiCard 
            type="totalActions" 
            value={kpis?.totalActions ?? 0} 
            href="/dashboard/performance/my-tasks"
            enableModal
            onClick={() => handleKpiClick("totalActions", kpis?.totalActions ?? 0, "/dashboard/performance/my-tasks")}
          />
          <KpiCard 
            type="notStarted" 
            value={kpis?.notStarted ?? 0} 
            href="/dashboard/performance/my-tasks?status=not-started"
            enableModal
            onClick={() => handleKpiClick("notStarted", kpis?.notStarted ?? 0, "/dashboard/performance/my-tasks?status=not-started")}
          />
          <KpiCard 
            type="inProgress" 
            value={kpis?.inProgress ?? 0} 
            href="/dashboard/performance/my-tasks?status=in-progress"
            enableModal
            onClick={() => handleKpiClick("inProgress", kpis?.inProgress ?? 0, "/dashboard/performance/my-tasks?status=in-progress")}
          />
          <KpiCard 
            type="completed" 
            value={kpis?.completed ?? 0} 
            href="/dashboard/performance/my-tasks?status=completed"
            enableModal
            onClick={() => handleKpiClick("completed", kpis?.completed ?? 0, "/dashboard/performance/my-tasks?status=completed")}
          />
          <KpiCard 
            type="overdue" 
            value={kpis?.overdue ?? 0} 
            href="/dashboard/performance/my-tasks?status=overdue"
            enableModal
            onClick={() => handleKpiClick("overdue", kpis?.overdue ?? 0, "/dashboard/performance/my-tasks?status=overdue")}
          />
          <KpiCard 
            type="completionRate" 
            value={(() => {
              const total = kpis?.totalActions ?? 0;
              const completed = kpis?.completed ?? 0;
              return total > 0 ? `${Math.round((completed / total) * 100)}%` : '0%';
            })()} 
            href="/dashboard/performance/my-tasks?status=completed"
            enableModal
            onClick={() => {
              const total = kpis?.totalActions ?? 0;
              const completed = kpis?.completed ?? 0;
              const rate = total > 0 ? Math.round((completed / total) * 100) : 0;
              handleKpiClick("completionRate", rate, "/dashboard/performance/my-tasks?status=completed");
            }}
          />
        </KpiGrid>

        {/* Performance Overview, Notices, Meetings, and Project Tracking Row - Enhanced */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
          {/* Welcome to NSA - Modern Slider */}
          <div className="order-1 h-[400px]">
            <Card 
              className="h-full widget-card transition-all duration-300 hover:shadow-xl border border-border"
            >
              <CardContent className="p-4 h-full">
                <WelcomeNSASlider 
                  key={leadershipKey}
                  onManageClick={() => window.location.href = '/dashboard/settings/widgets'}
                />
              </CardContent>
            </Card>
          </div>

          {/* Notices Carousel Widget */}
          <div className="order-2 h-[400px]">
            <NoticesCarouselWidget />
          </div>
          
          {/* Today's Meetings Widget */}
          <div className="order-3 h-[400px]">
            <MeetingsWidget />
          </div>

          {/* Project Tracking Widget */}
          <div className="order-4 h-[400px]">
            <ProjectTrackingWidget />
          </div>
        </div>

        {/* Main Content Grid */}
        <style>{`
          /* Fade-in animation for pagination */
          @keyframes fadeIn {
            from {
              opacity: 0;
              transform: translateY(10px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
          
          .animate-fadeIn {
            animation: fadeIn 0.3s ease-in-out;
          }

          /* Uniform Widget Container Styles */
          .widget-container {
            height: 400px; /* Fixed height for all widgets */
            display: flex;
            flex-direction: column;
          }
          
          .widget-container .widget-card {
            height: 100%;
            display: flex;
            flex-direction: column;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          }
          
          .widget-container .widget-card:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12) !important;
          }
          
          /* Make card content scrollable if needed */
          .widget-container .widget-card .card-content {
            flex: 1;
            overflow-y: auto;
          }
          
          /* Responsive grid adjustments */
          @media (max-width: 767px) {
            .widget-container {
              height: 350px; /* Slightly smaller on mobile */
            }
          }
          
          @media (min-width: 1280px) {
            .widget-container {
              height: 450px; /* Taller on large screens */
            }
          }
        `}</style>
        {/* Uniform Grid for Main Widgets */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4 mb-6 mt-8">
          <div className="widget-container">
            <TrainingCoursesWidget />
          </div>
          <div className="widget-container">
            <TasksWidget />
          </div>
          <div className="widget-container">
            <EventsWidget />
          </div>
          <div className="widget-container">
            {preferences.showNewsWidget && <ColleaguesBirthdaysWidget />}
          </div>
        </div>

      </div>

      {/* KPI Modal */}
      <KpiModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        kpiType={selectedKpi?.type ?? null}
        value={selectedKpi?.value ?? 0}
        href={selectedKpi?.href}
      />

      {/* Leadership Management Modal */}
      <LeadershipManagementModal
        open={leadershipModalOpen}
        onOpenChange={setLeadershipModalOpen}
        onUpdate={() => setLeadershipKey(prev => prev + 1)}
      />
    </div>
  );
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Morning";
  if (hour < 17) return "Afternoon";
  return "Evening";
}
