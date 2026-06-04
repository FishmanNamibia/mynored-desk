"use client";

import { useCallback, useEffect, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";
import {
  ChevronLeft,
  ChevronRight,
  Eye,
  Heart,
  Plus,
  Target,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { canManageContent } from "@/lib/permissions";

type WelcomeSlide = {
  id: string;
  title: string;
  icon: LucideIcon;
  gradient: string;
  bgClass: string;
  summary: string;
  details: string[];
};

const slides: WelcomeSlide[] = [
  {
    id: "vision",
    title: "Our Vision",
    icon: Eye,
    gradient: "from-rose-600 via-red-600 to-orange-500",
    bgClass: "from-rose-50 via-red-50 to-orange-50 dark:from-rose-950/30 dark:via-red-950/20 dark:to-orange-950/20",
    summary:
      "Build a connected internal workplace that helps NORED teams deliver reliable service faster and with better visibility.",
    details: [
      "Give every team one place to follow work from request to completion.",
      "Reduce operational friction across approvals, support, and internal communication.",
      "Keep the organisation aligned around service delivery and accountability.",
    ],
  },
  {
    id: "mission",
    title: "Our Mission",
    icon: Target,
    gradient: "from-red-700 via-rose-600 to-red-500",
    bgClass: "from-red-50 via-rose-50 to-white dark:from-red-950/30 dark:via-rose-950/20 dark:to-slate-950/10",
    summary:
      "Support daily execution with secure workflows, practical dashboards, and clear ownership across internal operations.",
    details: [
      "Enable fast sign-in, approvals, and requests without relying on external identity flows.",
      "Surface the most important notices, tasks, and operational signals in one dashboard.",
      "Create a dependable internal system that teams can use every day.",
    ],
  },
  {
    id: "values",
    title: "Core Values",
    icon: Heart,
    gradient: "from-red-600 via-rose-500 to-pink-500",
    bgClass: "from-rose-50 via-pink-50 to-red-50 dark:from-rose-950/30 dark:via-pink-950/20 dark:to-red-950/20",
    summary:
      "NORED Desk is shaped around practical values that matter in utility operations and internal service delivery.",
    details: [
      "Reliability: work should move predictably and stay visible.",
      "Accountability: ownership, approvals, and actions should be traceable.",
      "Service: internal systems should help teams solve problems quickly.",
      "Progress: tools should support Electricity For Development, not slow it down.",
    ],
  },
  {
    id: "desk",
    title: "NORED Desk",
    icon: Zap,
    gradient: "from-orange-500 via-red-500 to-rose-600",
    bgClass: "from-orange-50 via-red-50 to-rose-50 dark:from-orange-950/20 dark:via-red-950/20 dark:to-rose-950/30",
    summary:
      "Your internal workspace for notices, requests, meetings, dashboards, and operational follow-through.",
    details: [
      "Use the dashboard as your daily starting point for internal coordination.",
      "Track requests and actions without switching between disconnected tools.",
      "Keep information accessible to the right people with secure local authentication.",
    ],
  },
];

interface WelcomeNSASliderProps {
  onManageClick?: () => void;
}

export function WelcomeNSASlider({ onManageClick }: WelcomeNSASliderProps = {}) {
  const { user } = useAuth();
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true }, [
    Autoplay({ delay: 5000, stopOnInteraction: true, stopOnMouseEnter: true }),
  ]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [selectedSlide, setSelectedSlide] = useState<WelcomeSlide | null>(null);

  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);
  const scrollTo = useCallback((index: number) => emblaApi?.scrollTo(index), [emblaApi]);

  useEffect(() => {
    if (!emblaApi) {
      return;
    }

    const updateSelectedIndex = () => {
      setSelectedIndex(emblaApi.selectedScrollSnap());
    };

    updateSelectedIndex();
    emblaApi.on("select", updateSelectedIndex);

    return () => {
      emblaApi.off("select", updateSelectedIndex);
    };
  }, [emblaApi]);

  return (
    <div className="relative flex h-full flex-col">
      <div className="mb-2 border-b border-border/50 pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <h2 className="bg-gradient-to-r from-red-700 via-rose-600 to-orange-500 bg-clip-text text-lg font-bold leading-tight text-transparent">
              Welcome to NORED
            </h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Electricity For Development, supported by a single internal workspace
            </p>
          </div>
          {canManageContent((user as any)?.jobTitle) && onManageClick && (
            <Button
              onClick={onManageClick}
              variant="outline"
              size="sm"
              className="h-7 flex-shrink-0 gap-1 px-2 text-xs"
            >
              <Plus className="h-3 w-3" />
              Add New
            </Button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-hidden" ref={emblaRef}>
        <div className="flex h-full">
          {slides.map((slide) => {
            const Icon = slide.icon;

            return (
              <div key={slide.id} className="h-full min-w-0 flex-[0_0_100%]">
                <button
                  type="button"
                  onClick={() => setSelectedSlide(slide)}
                  className={`group relative flex h-full w-full flex-col rounded-2xl border border-border bg-gradient-to-br ${slide.bgClass} p-5 text-left shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg`}
                >
                  <div
                    className={`absolute -right-8 -top-8 h-32 w-32 rounded-full bg-gradient-to-br ${slide.gradient} opacity-20 blur-3xl transition-opacity group-hover:opacity-30`}
                  />
                  <div
                    className={`absolute -bottom-8 -left-8 h-28 w-28 rounded-full bg-gradient-to-tr ${slide.gradient} opacity-15 blur-3xl transition-opacity group-hover:opacity-25`}
                  />

                  <div className="relative z-10 mb-4 flex items-center gap-2">
                    <div className={`flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br ${slide.gradient} shadow-md`}>
                      <Icon className="h-4 w-4 text-white" />
                    </div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                      {slide.title}
                    </h3>
                  </div>

                  <div className="relative z-10 flex-1 space-y-4">
                    <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">
                      {slide.summary}
                    </p>

                    <div className="space-y-2">
                      {slide.details.slice(0, 3).map((detail) => (
                        <div
                          key={detail}
                          className="rounded-xl border border-white/60 bg-white/80 px-3 py-2 text-xs leading-relaxed text-slate-700 shadow-sm backdrop-blur-sm dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-300"
                        >
                          {detail}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="relative z-10 mt-3 text-xs font-semibold text-red-700 dark:text-red-300">
                    Click to view more
                  </div>
                </button>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between px-1">
        <button
          onClick={scrollPrev}
          className="flex h-7 w-7 items-center justify-center rounded-full border border-red-200 bg-red-50 text-red-700 transition-all hover:scale-105 hover:bg-red-100"
          aria-label="Previous slide"
          type="button"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        <div className="flex gap-1.5">
          {slides.map((_, index) => (
            <button
              key={index}
              onClick={() => scrollTo(index)}
              className={
                index === selectedIndex
                  ? "h-2 w-6 rounded-full bg-gradient-to-r from-red-600 to-orange-500"
                  : "h-2 w-2 rounded-full bg-red-200 transition-colors hover:bg-red-300"
              }
              aria-label={`Go to slide ${index + 1}`}
              type="button"
            />
          ))}
        </div>

        <button
          onClick={scrollNext}
          className="flex h-7 w-7 items-center justify-center rounded-full border border-red-200 bg-red-50 text-red-700 transition-all hover:scale-105 hover:bg-red-100"
          aria-label="Next slide"
          type="button"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {selectedSlide && (
        <Dialog open={!!selectedSlide} onOpenChange={() => setSelectedSlide(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <selectedSlide.icon className="h-5 w-5 text-red-600" />
                {selectedSlide.title}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                {selectedSlide.summary}
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                {selectedSlide.details.map((detail) => (
                  <div
                    key={detail}
                    className="rounded-xl border border-red-100 bg-red-50/70 p-4 text-sm leading-relaxed text-slate-700 dark:border-red-950/40 dark:bg-red-950/20 dark:text-slate-200"
                  >
                    {detail}
                  </div>
                ))}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
