"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Calendar } from "lucide-react";
import { useEffect, useState } from "react";
import { format } from "date-fns";
import { colors } from "@/app/ui-standards";

export function DateTimeWidget() {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const hours = currentTime.getHours();
  const isPM = hours >= 12;
  const period = isPM ? "PM" : "AM";

  return (
    <Card 
      className="card-shadow-hover h-full"
      style={{
        padding: "clamp(12px, 2vw, 20px)",
      }}
    >
      <CardContent className="p-0 h-full flex flex-col justify-between">
        <div>
          {/* Local Time Label */}
          <p 
            className="font-medium mb-1 sm:mb-1.5 text-[10px] sm:text-xs"
            style={{ color: "#9CA3AF" }}
          >
            Local Time
          </p>
          
          {/* Time Display - Compact */}
          <div className="flex items-baseline gap-1">
            <p 
              className="font-extrabold tracking-tight text-2xl sm:text-3xl lg:text-4xl"
              style={{ 
                lineHeight: 1, 
                letterSpacing: "-0.5px",
                color: "#1F2937" 
              }}
            >
              {format(currentTime, "HH:mm")}
            </p>
            <span 
              className="font-medium text-xs sm:text-sm"
              style={{ color: "#6B7280" }}
            >
              {period}
            </span>
          </div>
        </div>
        
        {/* Date Section - Compact */}
        <div className="mt-2 sm:mt-3">
          <div 
            className="w-full mb-2 sm:mb-3"
            style={{ 
              height: "1px", 
              backgroundColor: "#F3F4F6",
              marginTop: "clamp(8px, 1.5vw, 12px)" 
            }}
          />
          <div className="flex items-center gap-1.5 sm:gap-2">
            <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" style={{ color: colors.gold }} />
            <p 
              className="font-medium text-[10px] sm:text-xs lg:text-sm"
              style={{ color: "#4B5563" }}
            >
              {format(currentTime, "EEE, dd MMM yyyy")}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
