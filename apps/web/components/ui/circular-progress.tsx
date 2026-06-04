import React, { useEffect, useState } from "react";

interface CircularProgressProps {
  value: number;
  label: string;
  color: string;
  displayValue: string;
  delay?: number;
  size?: "sm" | "md" | "lg";
}

export function CircularProgress({ value, label, color, displayValue, delay = 0, size = "md" }: CircularProgressProps) {
  // Responsive sizes configuration
  const sizeConfig = {
    sm: { svgSize: 80, radius: 32, strokeWidth: 6, fontSize: "18px", labelSize: "10px" },
    md: { svgSize: 100, radius: 40, strokeWidth: 8, fontSize: "22px", labelSize: "11px" },
    lg: { svgSize: 140, radius: 60, strokeWidth: 10, fontSize: "32px", labelSize: "14px" },
  };
  
  const config = sizeConfig[size];
  const circumference = 2 * Math.PI * config.radius;
  const [animatedValue, setAnimatedValue] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimatedValue(value);
    }, delay);

    return () => clearTimeout(timer);
  }, [value, delay]);

  const strokeDashoffset = circumference - (animatedValue / 100) * circumference;
  const center = config.svgSize / 2;

  return (
    <div 
      className="flex flex-col items-center cursor-pointer"
      style={{
        transition: "transform 0.15s ease-in-out",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "scale(1.03)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "scale(1)";
      }}
    >
      {/* SVG Circle Progress Ring - Compact */}
      <div 
        className="relative w-[55px] h-[55px] sm:w-[65px] sm:h-[65px] lg:w-[80px] lg:h-[80px] xl:w-[95px] xl:h-[95px]"
      >
        <svg
          viewBox={`0 0 ${config.svgSize} ${config.svgSize}`}
          className="w-full h-full transform -rotate-90"
        >
          {/* Background ring */}
          <circle
            cx={center}
            cy={center}
            r={config.radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={config.strokeWidth}
            className="text-gray-300 opacity-50 lg:text-gray-400 lg:opacity-40"
          />
          {/* Progress ring */}
          <circle
            cx={center}
            cy={center}
            r={config.radius}
            fill="none"
            stroke={color}
            strokeWidth={config.strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            style={{
              transition: "stroke-dashoffset 1.2s cubic-bezier(0.4, 0, 0.2, 1)",
            }}
          />
        </svg>
        
        {/* Progress Value Display - Compact */}
        <div
          className="absolute inset-0 flex items-center justify-center text-sm sm:text-base lg:text-lg xl:text-xl font-bold text-black lg:text-gray-600"
        >
          {displayValue}
        </div>
      </div>
      
      {/* Label - Compact */}
      <div
        className="mt-1 sm:mt-1.5 lg:mt-2 text-center font-semibold uppercase tracking-wide text-[8px] sm:text-[9px] lg:text-[10px] xl:text-xs text-black lg:text-gray-600"
        style={{
          letterSpacing: "0.3px",
        }}
      >
        {label}
      </div>
    </div>
  );
}