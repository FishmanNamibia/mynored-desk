"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { Clock } from "lucide-react";
import { colors } from "@/app/ui-standards";

export function HeaderDateTimeWidget() {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return (
    <div
      className="flex items-center gap-3"
      style={{
        height: "42px",
        borderRadius: "8px",
        padding: "8px 16px",
      }}
    >
      {/* Time Icon */}
      <Clock className="w-7 h-7" style={{ color: colors.gold }} fill="currentColor" />
      
      {/* Time Info */}
      <div className="flex flex-col gap-0.5">
        <div className="text-lg font-bold text-white leading-none">
          {format(currentTime, "HH:mm")}
        </div>
        <div className="text-xs leading-none" style={{ color: "rgba(255,255,255,0.7)" }}>
          {format(currentTime, "EEE, MMM d")}
        </div>
      </div>
    </div>
  );
}