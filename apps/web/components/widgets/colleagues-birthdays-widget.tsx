"use client";

import { useState, useEffect, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  Users, Cake, ChevronLeft, ChevronRight, X, RefreshCw,
} from "lucide-react";
import { GoldSpinner } from "@/components/ui/gold-spinner";

/* ── Types ─────────────────────────────────────────────────────────────── */

interface Colleague {
  id: string;
  name: string;
  department: string;
  jobTitle: string;
  profileImage?: string;
  initials: string;
}

interface Birthday {
  id: string;
  name: string;
  date: string;
  department?: string;
}

/* ── Helpers ───────────────────────────────────────────────────────────── */

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function formatDate(raw: string): string {
  try {
    return new Date(raw).toLocaleDateString("en-ZA", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return raw;
  }
}

function getInitialsBgColor(initials: string) {
  return initials.charCodeAt(0) % 2 === 0 ? "bg-[#4a0f19]" : "bg-[#ef4444]";
}

/* ── Component ─────────────────────────────────────────────────────────── */

export function ColleaguesBirthdaysWidget() {
  // Colleagues state
  const [colleagues, setColleagues] = useState<Colleague[]>([]);
  const [colleagueIdx, setColleagueIdx] = useState(0);
  const [colleaguesLoading, setColleaguesLoading] = useState(true);
  const [selectedColleague, setSelectedColleague] = useState<Colleague | null>(null);

  // Birthdays state
  const [birthdays, setBirthdays] = useState<Birthday[]>([]);
  const [birthdaysLoading, setBirthdaysLoading] = useState(true);

  /* ── Fetch colleagues ───────────────────────────────────────────────── */
  useEffect(() => {
    const fetchColleagues = async () => {
      try {
        const res = await fetch(
          "/dashboard/performance/api/colleagues?limit=200",
          { credentials: "include" },
        );
        if (!res.ok) throw new Error("API unavailable");
        const data: Array<{
          id: string;
          name: string;
          jobTitle: string;
          department: string;
          profilePicture?: string | null;
          initials: string;
        }> = await res.json();

        if (Array.isArray(data) && data.length > 0) {
          setColleagues(
            data.map((u) => ({
              id: u.id,
              name: u.name,
              department: u.department,
              jobTitle: u.jobTitle,
              profileImage: u.profilePicture ?? undefined,
              initials: u.initials,
            })),
          );
        }
      } catch {
        /* silently keep empty */
      } finally {
        setColleaguesLoading(false);
      }
    };
    fetchColleagues();
  }, []);

  // Auto-advance carousel every 5s
  useEffect(() => {
    if (colleagues.length === 0) return;
    const t = setInterval(
      () => setColleagueIdx((p) => (p + 1) % colleagues.length),
      5000,
    );
    return () => clearInterval(t);
  }, [colleagues.length]);

  /* ── Fetch birthdays from SharePoint (current month only) ─────────────── */
  const currentMonth = new Date().getMonth() + 1; // 1-12
  const currentMonthName = MONTH_NAMES[currentMonth - 1];

  useEffect(() => {
    setBirthdays([]);
    setBirthdaysLoading(false);
  }, []);

  /* ── Current colleague ──────────────────────────────────────────────── */
  const currentColleague = colleagues[colleagueIdx];

  return (
    <>
      <Card className="widget-card h-full flex flex-col overflow-hidden">
        {/* ── Split header ── */}
        <div className="grid grid-cols-2 border-b border-border flex-shrink-0">
          <div className="px-3 py-2.5 border-r border-border">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5" style={{ color: "#ef4444" }} />
                Know Your Colleagues
              </h3>
              <p className="text-[10px] text-muted-foreground">
                Discover team members across NORED
              </p>
            </div>
          <div className="px-3 py-2.5 flex items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                <Cake className="w-3.5 h-3.5 text-rose-500" />
                {currentMonthName} Birthdays
              </h3>
              <p className="text-[10px] text-muted-foreground">
                Celebrating this month
              </p>
            </div>
            {birthdays.length > 0 && (
              <span className="text-[9px] bg-rose-500 text-white rounded-full px-1.5 py-0.5 font-bold min-w-[18px] text-center">
                {birthdays.length > 9 ? "9+" : birthdays.length}
              </span>
            )}
          </div>
        </div>

        {/* ── Split body ── */}
        <div className="grid grid-cols-2 flex-1 min-h-0 overflow-hidden">
          {/* ── Colleagues panel (left) ── */}
          <div className="border-r border-border flex flex-col items-center justify-center p-3">
            {colleaguesLoading ? (
              <GoldSpinner size="sm" />
            ) : colleagues.length === 0 ? (
              <div className="flex flex-col items-center gap-2 text-center py-4">
                <div className="w-9 h-9 rounded-full bg-gray-50 flex items-center justify-center">
                  <Users className="w-4 h-4 text-gray-300" />
                </div>
                <p className="text-xs text-muted-foreground">
                  No colleagues found
                </p>
              </div>
            ) : currentColleague ? (
              <div className="text-center space-y-2 w-full">
                {/* Avatar */}
                <div
                  className="relative mx-auto w-16 h-16 cursor-pointer group"
                  onClick={() => setSelectedColleague(currentColleague)}
                  title="Click to view details"
                >
                  {currentColleague.profileImage ? (
                    <img
                      src={currentColleague.profileImage}
                      alt={currentColleague.name}
                      className="w-16 h-16 rounded-full object-cover border-2 border-white shadow-md group-hover:ring-2 group-hover:ring-primary transition-all"
                    />
                  ) : (
                    <div
                      className={`w-16 h-16 rounded-full flex items-center justify-center text-white text-xl font-bold border-2 border-white shadow-md group-hover:ring-2 group-hover:ring-primary transition-all ${getInitialsBgColor(currentColleague.initials)}`}
                    >
                      {currentColleague.initials}
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="space-y-0.5">
                  <h3 className="font-semibold text-sm text-foreground leading-tight">
                    {currentColleague.name}
                  </h3>
                  <p className="text-[11px] font-medium text-primary leading-tight">
                    {currentColleague.jobTitle}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {currentColleague.department}
                  </p>
                </div>

                {/* Nav arrows */}
                <div className="flex items-center justify-center gap-4 pt-1">
                  <button
                    onClick={() =>
                      setColleagueIdx(
                        (p) => (p - 1 + colleagues.length) % colleagues.length,
                      )
                    }
                    className="w-6 h-6 rounded-full bg-muted hover:bg-muted-foreground/20 flex items-center justify-center transition-colors"
                    aria-label="Previous colleague"
                  >
                    <ChevronLeft className="w-3 h-3 text-muted-foreground" />
                  </button>
                  <button
                    onClick={() =>
                      setColleagueIdx((p) => (p + 1) % colleagues.length)
                    }
                    className="w-6 h-6 rounded-full bg-muted hover:bg-muted-foreground/20 flex items-center justify-center transition-colors"
                    aria-label="Next colleague"
                  >
                    <ChevronRight className="w-3 h-3 text-muted-foreground" />
                  </button>
                </div>
              </div>
            ) : null}
          </div>

          {/* ── Birthdays panel (right) ── */}
          <div className="overflow-y-auto">
            {birthdaysLoading ? (
              <div className="flex items-center justify-center h-full">
                <GoldSpinner size="sm" />
              </div>
            ) : birthdays.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-2 py-6 text-center">
                <div className="w-9 h-9 rounded-full bg-rose-50 flex items-center justify-center">
                  <Cake className="w-4 h-4 text-rose-300" />
                </div>
                <p className="px-3 text-xs text-muted-foreground">
                  Birthday feeds are unavailable with local sign-in.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {birthdays.map((bday) => (
                  <div
                    key={bday.id}
                    className="flex gap-2.5 px-3 py-2.5 hover:bg-accent/50 transition-colors"
                  >
                    <div className="w-7 h-7 rounded-full bg-rose-50 dark:bg-rose-950/30 flex items-center justify-center shrink-0 mt-0.5">
                      <Cake className="w-3.5 h-3.5 text-rose-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-xs font-semibold text-foreground truncate">
                        {bday.name}
                      </h4>
                      <p className="text-[10px] text-muted-foreground">
                        {bday.date}
                      </p>
                      {bday.department && (
                        <p className="text-[10px] text-muted-foreground/70 truncate">
                          {bday.department}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* ── Colleague detail popup ── */}
      <Dialog
        open={!!selectedColleague}
        onOpenChange={(open) => {
          if (!open) setSelectedColleague(null);
        }}
      >
        <DialogContent className="max-w-xs w-[340px] p-0 overflow-hidden rounded-2xl shadow-2xl">
          {selectedColleague &&
            (() => {
              const c = selectedColleague;
              const bg = getInitialsBgColor(c.initials);
              const accent = bg === "bg-[#4a0f19]" ? "#4a0f19" : "#ef4444";
              return (
                <div className="bg-white">
                  <div
                    className="h-1.5 w-full"
                    style={{ background: accent }}
                  />
                  <button
                    onClick={() => setSelectedColleague(null)}
                    className="absolute top-3 right-3 z-10 w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
                  >
                    <X className="w-3.5 h-3.5 text-gray-500" />
                  </button>
                  <div className="flex items-center gap-4 px-5 py-5">
                    <div className="flex-shrink-0">
                      {c.profileImage ? (
                        <img
                          src={c.profileImage}
                          alt={c.name}
                          className="w-20 h-20 rounded-full object-cover border-4 border-white shadow-lg"
                          style={{ outline: `3px solid ${accent}` }}
                        />
                      ) : (
                        <div
                          className={`w-20 h-20 rounded-full flex items-center justify-center text-white text-2xl font-bold shadow-lg border-4 border-white ${bg}`}
                          style={{ outline: `3px solid ${accent}` }}
                        >
                          {c.initials}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h2 className="text-base font-bold text-gray-900 leading-tight mb-0.5 truncate">
                        {c.name}
                      </h2>
                      <p
                        className="text-xs font-semibold mb-1"
                        style={{ color: accent }}
                      >
                        {c.jobTitle}
                      </p>
                      <span
                        className="inline-block text-[11px] text-white rounded-full px-2.5 py-0.5 font-medium"
                        style={{ background: accent + "cc" }}
                      >
                        {c.department}
                      </span>
                    </div>
                  </div>
                  <div className="border-t border-gray-100 mx-5 pt-3 pb-4 grid grid-cols-2 gap-3">
                    <div className="bg-gray-50 rounded-xl p-3 text-center">
                      <p className="text-[9px] text-gray-400 uppercase tracking-widest font-semibold mb-1">
                        Department
                      </p>
                      <p className="text-xs font-semibold text-gray-800 leading-tight">
                        {c.department}
                      </p>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-3 text-center">
                      <p className="text-[9px] text-gray-400 uppercase tracking-widest font-semibold mb-1">
                        Job Title
                      </p>
                      <p className="text-xs font-semibold text-gray-800 leading-tight">
                        {c.jobTitle}
                      </p>
                    </div>
                  </div>
                  <div className="px-5 pb-4 text-center">
                    <p className="text-[10px] text-gray-300">
                      NORED — Electricity For Development
                    </p>
                  </div>
                </div>
              );
            })()}
        </DialogContent>
      </Dialog>
    </>
  );
}
