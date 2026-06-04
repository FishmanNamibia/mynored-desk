"use client";

import { useCallback, useEffect, useState } from "react";
import { BookOpen, ChevronLeft, ChevronRight, ExternalLink, GraduationCap } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const courses = [
  {
    title: "SAP Utilities Learning Journey",
    subtitle: "SAP & Utilities",
    description:
      "Official SAP training covering SAP S/4HANA Utilities processes such as meter-to-cash, billing, customer engagement, and asset management.",
    url: "https://learning.sap.com/courses/discovering-business-processes-in-sap-s-4hana-utilities",
    domain: "learning.sap.com",
    provider: "SAP Learning",
    headerBg: "from-[#0b355b] to-[#0ea5e9]",
    thumbnail: (
      <div className="flex h-full select-none flex-col items-center justify-center gap-1">
        <div className="rounded-lg bg-white/15 px-4 py-2">
          <span className="text-2xl font-black tracking-[0.18em] text-white">SAP</span>
        </div>
        <span className="text-[10px] font-medium uppercase tracking-wide text-white/80">
          Utilities &amp; EAM
        </span>
      </div>
    ),
  },
  {
    title: "Siemens SITRAIN Energy Distribution",
    subtitle: "Electrical Distribution",
    description:
      "Official Siemens training focused on low-voltage energy distribution, protection settings, circuit breakers, and switchgear applications.",
    url: "https://www.sitrain-learning.siemens.com/en/rw16843/Energy-Distribution",
    domain: "sitrain-learning.siemens.com",
    provider: "Siemens SITRAIN",
    headerBg: "from-[#0f766e] to-[#14b8a6]",
    thumbnail: (
      <div className="flex h-full select-none flex-col items-center justify-center gap-1">
        <div className="rounded-lg bg-white/20 px-4 py-2">
          <span className="text-2xl font-black tracking-[0.18em] text-white">SIEMENS</span>
        </div>
        <span className="text-[10px] font-medium uppercase tracking-wide text-white/80">
          SITRAIN
        </span>
      </div>
    ),
  },
  {
    title: "Schneider Electric Low Voltage Distribution Design",
    subtitle: "Electrical Engineering",
    description:
      "Online Schneider Electric University course that introduces low-voltage distribution design and the main criteria for safe electrical installations.",
    url: "https://university.se.com/catalog/view/course/id/791/title/Introduction%20to%20Low%20Voltage%20Distribution%20Design",
    domain: "university.se.com",
    provider: "Schneider Electric University",
    headerBg: "from-[#166534] to-[#22c55e]",
    thumbnail: (
      <div className="flex h-full select-none flex-col items-center justify-center gap-1">
        <div className="rounded-lg bg-white/15 px-4 py-2">
          <span className="text-xl font-black tracking-[0.1em] text-white">SE</span>
        </div>
        <span className="text-[10px] font-medium uppercase tracking-wide text-white/80">
          LV Design
        </span>
      </div>
    ),
  },
  {
    title: "ABB University Electrification Training",
    subtitle: "Energy Sector Skills",
    description:
      "ABB University offers training for engineers, maintenance, operations, and technical teams across electrification products, systems, and industrial applications.",
    url: "https://new.abb.com/service/abb-university",
    domain: "new.abb.com",
    provider: "ABB University",
    headerBg: "from-[#b91c1c] to-[#ef4444]",
    thumbnail: (
      <div className="flex h-full select-none flex-col items-center justify-center gap-1">
        <div className="rounded-lg bg-white/15 px-4 py-2">
          <span className="text-2xl font-black tracking-[0.18em] text-white">ABB</span>
        </div>
        <span className="text-[10px] font-medium uppercase tracking-wide text-white/80">
          Electrification
        </span>
      </div>
    ),
  },
];

export function TrainingCoursesWidget() {
  const [current, setCurrent] = useState(0);
  const [animating, setAnimating] = useState(false);
  const [direction, setDirection] = useState<"left" | "right">("left");

  const goTo = useCallback(
    (next: number, dir: "left" | "right" = "left") => {
      if (animating) return;
      setDirection(dir);
      setAnimating(true);
      setTimeout(() => {
        setCurrent(next);
        setAnimating(false);
      }, 320);
    },
    [animating],
  );

  const prev = () => goTo((current - 1 + courses.length) % courses.length, "right");
  const next = useCallback(() => goTo((current + 1) % courses.length, "left"), [current, goTo]);

  useEffect(() => {
    const timer = setTimeout(next, 4000);
    return () => clearTimeout(timer);
  }, [current, next]);

  const course = courses[current];

  return (
    <Card className="widget-card flex h-full flex-col overflow-hidden">
      <CardHeader className="shrink-0 pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-sm font-bold">
              <GraduationCap className="h-4 w-4 text-red-600" />
              Energy &amp; Technical Training
            </CardTitle>
            <p className="text-[11px] text-muted-foreground">
              Electrical, distribution, SAP, and energy-sector learning
            </p>
          </div>
          <div className="flex items-center gap-1">
            {courses.map((_, i) => (
              <button
                key={i}
                onClick={() => goTo(i, i > current ? "left" : "right")}
                className={`rounded-full transition-all duration-300 ${
                  i === current ? "h-2 w-4 bg-red-500" : "h-2 w-2 bg-gray-200 hover:bg-gray-300"
                }`}
              />
            ))}
          </div>
        </div>
      </CardHeader>

      <CardContent className="relative flex flex-1 flex-col overflow-hidden pt-0">
        <div className="relative flex-1 overflow-hidden">
          <div
            key={current}
            className={`absolute inset-0 transition-all duration-300 ease-in-out ${
              animating
                ? direction === "left"
                  ? "-translate-x-full opacity-0"
                  : "translate-x-full opacity-0"
                : "translate-x-0 opacity-100"
            }`}
          >
            <a href={course.url} target="_blank" rel="noopener noreferrer" className="group block">
              <div className={`relative h-36 overflow-hidden rounded-lg bg-gradient-to-r ${course.headerBg}`}>
                {course.thumbnail}
                <div className="absolute inset-0 rounded-lg bg-black/10 transition-colors group-hover:bg-black/0" />
                <ExternalLink className="absolute right-2 top-2 h-3.5 w-3.5 text-white/60 transition-colors group-hover:text-white" />
              </div>
            </a>

            <div className="mt-3 flex flex-col gap-1.5">
              <div className="flex items-center gap-1.5">
                <span className="rounded bg-red-50 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-red-600">
                  {course.subtitle}
                </span>
                <span className="text-[9px] text-muted-foreground/60">
                  {current + 1} / {courses.length}
                </span>
              </div>
              <a
                href={course.url}
                target="_blank"
                rel="noopener noreferrer"
                className="line-clamp-2 text-xs font-bold leading-tight text-foreground transition-colors hover:text-red-600"
              >
                {course.title}
              </a>
              <p className="line-clamp-3 text-[10px] leading-relaxed text-muted-foreground">
                {course.description}
              </p>
              <div className="mt-0.5 flex items-center gap-1">
                <BookOpen className="h-2.5 w-2.5 shrink-0 text-red-400" />
                <span className="truncate text-[9px] font-medium text-red-500">{course.provider}</span>
                <span className="text-[9px] text-muted-foreground/40">·</span>
                <span className="truncate text-[9px] text-muted-foreground/60">{course.domain}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-3 flex shrink-0 items-center justify-between">
          <button
            onClick={prev}
            className="flex items-center gap-1 rounded px-2 py-1 text-[10px] text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <ChevronLeft className="h-3 w-3" /> Prev
          </button>
          <a
            href={course.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-0.5 text-[10px] font-semibold text-red-600 hover:underline"
          >
            Open Course <ExternalLink className="h-2.5 w-2.5" />
          </a>
          <button
            onClick={next}
            className="flex items-center gap-1 rounded px-2 py-1 text-[10px] text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            Next <ChevronRight className="h-3 w-3" />
          </button>
        </div>
      </CardContent>
    </Card>
  );
}
