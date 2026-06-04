"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ChevronLeft, ChevronRight, Users, X } from "lucide-react";
import { GoldSpinner } from "@/components/ui/gold-spinner";

interface Colleague {
  id: string;
  name: string;
  department: string;
  jobTitle: string;
  profileImage?: string;
  initials: string;
}

export function NsaNewsWidget() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [displayedColleagues, setDisplayedColleagues] = useState<Colleague[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedColleague, setSelectedColleague] = useState<Colleague | null>(null);

  useEffect(() => {
    const fetchColleagues = async () => {
      try {
        const res = await fetch("/dashboard/performance/api/colleagues?limit=200", {
          credentials: "include",
        });
        if (!res.ok) throw new Error("API unavailable");

        const data: Array<{
          id: string;
          name: string;
          jobTitle: string;
          department: string;
          profilePicture?: string | null;
          initials: string;
        }> = await res.json();

        if (!Array.isArray(data) || data.length === 0) return;

        setDisplayedColleagues(
          data.map((user) => ({
            id: user.id,
            name: user.name,
            department: user.department,
            jobTitle: user.jobTitle,
            profileImage: user.profilePicture ?? undefined,
            initials: user.initials,
          })),
        );
      } catch {
        // Keep the widget empty if the colleagues endpoint is unavailable.
      } finally {
        setLoading(false);
      }
    };

    fetchColleagues();
  }, []);

  useEffect(() => {
    if (displayedColleagues.length === 0) return;

    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % displayedColleagues.length);
    }, 5000);

    return () => clearInterval(timer);
  }, [displayedColleagues.length]);

  const getInitialsBgColor = (initials: string) =>
    initials.charCodeAt(0) % 2 === 0 ? "bg-[#8f151b]" : "bg-[#d62828]";

  if (loading) {
    return (
      <Card className="widget-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg font-semibold">
            <Users className="h-5 w-5" />
            Know Your Colleagues
          </CardTitle>
          <CardDescription>Discover team members across NORED</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <GoldSpinner size="sm" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (displayedColleagues.length === 0) {
    return (
      <Card className="widget-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg font-semibold">
            <Users className="h-5 w-5" />
            Know Your Colleagues
          </CardTitle>
          <CardDescription>Discover team members across NORED</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
            <Users className="h-8 w-8 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">No colleagues found</p>
            <p className="text-xs text-muted-foreground/60">
              Team members will appear here once they sign in
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const currentColleague = displayedColleagues[currentIndex];

  return (
    <>
      <Card className="widget-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg font-semibold">
            <Users className="h-5 w-5" />
            Know Your Colleagues
          </CardTitle>
          <CardDescription>Discover team members across NORED</CardDescription>
        </CardHeader>
        <CardContent className="card-content">
          <div className="space-y-3 text-center">
            <div
              className="group relative mx-auto h-20 w-20 cursor-pointer"
              onClick={() => setSelectedColleague(currentColleague)}
              title="Click to view details"
            >
              {currentColleague.profileImage ? (
                <img
                  src={currentColleague.profileImage}
                  alt={currentColleague.name}
                  className="h-20 w-20 rounded-full border-2 border-white object-cover shadow-md transition-all group-hover:ring-2 group-hover:ring-primary"
                />
              ) : (
                <div
                  className={`flex h-20 w-20 items-center justify-center rounded-full border-2 border-white text-2xl font-bold text-white shadow-md transition-all group-hover:ring-2 group-hover:ring-primary ${getInitialsBgColor(currentColleague.initials)}`}
                >
                  {currentColleague.initials}
                </div>
              )}
              <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/20 opacity-0 transition-opacity group-hover:opacity-100">
                <span className="text-[10px] font-semibold text-white">View</span>
              </div>
            </div>

            <div className="space-y-1">
              <h3 className="text-base font-semibold text-foreground">{currentColleague.name}</h3>
              <div className="space-y-0.5">
                <p className="text-xs font-medium text-primary">{currentColleague.jobTitle}</p>
                <p className="text-xs text-muted-foreground">{currentColleague.department}</p>
              </div>
            </div>

            <div className="flex items-center justify-center gap-6 pt-1">
              <button
                onClick={() =>
                  setCurrentIndex(
                    (prev) => (prev - 1 + displayedColleagues.length) % displayedColleagues.length,
                  )
                }
                className="flex h-7 w-7 items-center justify-center rounded-full bg-muted transition-colors hover:bg-muted-foreground/20"
                aria-label="Previous colleague"
              >
                <ChevronLeft className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
              <button
                onClick={() => setCurrentIndex((prev) => (prev + 1) % displayedColleagues.length)}
                className="flex h-7 w-7 items-center justify-center rounded-full bg-muted transition-colors hover:bg-muted-foreground/20"
                aria-label="Next colleague"
              >
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog
        open={!!selectedColleague}
        onOpenChange={(open) => {
          if (!open) setSelectedColleague(null);
        }}
      >
        <DialogContent className="w-[340px] max-w-xs overflow-hidden rounded-2xl p-0 shadow-2xl">
          {selectedColleague &&
            (() => {
              const colleague = selectedColleague;
              const bg = getInitialsBgColor(colleague.initials);
              const accent = bg === "bg-[#8f151b]" ? "#8f151b" : "#d62828";

              return (
                <div className="bg-white">
                  <div className="h-1.5 w-full" style={{ background: accent }} />

                  <button
                    onClick={() => setSelectedColleague(null)}
                    className="absolute right-3 top-3 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-gray-100 transition-colors hover:bg-gray-200"
                  >
                    <X className="h-3.5 w-3.5 text-gray-500" />
                  </button>

                  <div className="flex items-center gap-4 px-5 py-5">
                    <div className="shrink-0">
                      {colleague.profileImage ? (
                        <img
                          src={colleague.profileImage}
                          alt={colleague.name}
                          className="h-20 w-20 rounded-full border-4 border-white object-cover shadow-lg"
                          style={{ outline: `3px solid ${accent}` }}
                        />
                      ) : (
                        <div
                          className={`flex h-20 w-20 items-center justify-center rounded-full border-4 border-white text-2xl font-bold text-white shadow-lg ${bg}`}
                          style={{ outline: `3px solid ${accent}` }}
                        >
                          {colleague.initials}
                        </div>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <h2 className="mb-0.5 truncate text-base font-bold leading-tight text-gray-900">
                        {colleague.name}
                      </h2>
                      <p className="mb-1 text-xs font-semibold" style={{ color: accent }}>
                        {colleague.jobTitle}
                      </p>
                      <span
                        className="inline-block rounded-full px-2.5 py-0.5 text-[11px] font-medium text-white"
                        style={{ background: `${accent}cc` }}
                      >
                        {colleague.department}
                      </span>
                    </div>
                  </div>

                  <div className="mx-5 grid grid-cols-2 gap-3 border-t border-gray-100 pb-4 pt-3">
                    <div className="rounded-xl bg-gray-50 p-3 text-center">
                      <p className="mb-1 text-[9px] font-semibold uppercase tracking-widest text-gray-400">
                        Department
                      </p>
                      <p className="text-xs font-semibold leading-tight text-gray-800">
                        {colleague.department}
                      </p>
                    </div>
                    <div className="rounded-xl bg-gray-50 p-3 text-center">
                      <p className="mb-1 text-[9px] font-semibold uppercase tracking-widest text-gray-400">
                        Job Title
                      </p>
                      <p className="text-xs font-semibold leading-tight text-gray-800">
                        {colleague.jobTitle}
                      </p>
                    </div>
                  </div>

                  <div className="px-5 pb-4 text-center">
                    <p className="text-[10px] text-gray-300">NORED - Electricity For Development</p>
                  </div>
                </div>
              );
            })()}
        </DialogContent>
      </Dialog>
    </>
  );
}
