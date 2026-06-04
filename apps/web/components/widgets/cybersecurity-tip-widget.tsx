"use client";

import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GoldSpinner } from "@/components/ui/gold-spinner";
import {
  CreditCard,
  Eye,
  Globe,
  HardDrive,
  Home,
  KeyRound,
  Lock,
  Mail,
  Server,
  Shield,
  ShieldCheck,
  Smartphone,
  Usb,
  Wifi,
} from "lucide-react";
import {
  CYBER_SECURITY_TIPS,
  type CyberSecurityTip,
} from "@/lib/cyber-security-tips";

const getDailyCyberSecurityImage = () => {
  const dayOfYear = Math.floor(
    (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000,
  );

  const cyberSecurityIcons = [
    Lock,
    KeyRound,
    Smartphone,
    Server,
    Mail,
    Wifi,
    HardDrive,
    Eye,
    Globe,
    Usb,
    Home,
    CreditCard,
    ShieldCheck,
    Shield,
  ];

  const iconIndex = dayOfYear % cyberSecurityIcons.length;
  return cyberSecurityIcons[iconIndex];
};

const getCategoryColor = (category: string) => {
  const colors: Record<string, string> = {
    Authentication: "from-[#b91c1c] to-[#8f151b]",
    "System Security": "from-[#991b1b] to-[#7f1d1d]",
    "Email Security": "from-[#c2410c] to-[#9a3412]",
    "Network Security": "from-[#be123c] to-[#881337]",
    "Data Protection": "from-[#dc2626] to-[#991b1b]",
    "Social Engineering": "from-[#ea580c] to-[#c2410c]",
    "Web Security": "from-[#b91c1c] to-[#9f1239]",
    Privacy: "from-[#e11d48] to-[#9f1239]",
    "Physical Security": "from-[#d97706] to-[#b45309]",
    "Remote Work": "from-[#ef4444] to-[#b91c1c]",
    "Financial Security": "from-[#9a3412] to-[#7c2d12]",
    "Mobile Security": "from-[#f43f5e] to-[#be123c]",
    Encryption: "from-[#7f1d1d] to-[#450a0a]",
  };
  return colors[category] || "from-gray-500 to-gray-600";
};

export function CyberSecurityTipWidget({ compact = false }: { compact?: boolean }) {
  const [currentTip, setCurrentTip] = useState<CyberSecurityTip | null>(null);
  const [dailyIcon, setDailyIcon] = useState<React.ElementType | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const dayOfYear = Math.floor(
      (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000,
    );
    const tipIndex = dayOfYear % CYBER_SECURITY_TIPS.length;

    setCurrentTip(CYBER_SECURITY_TIPS[tipIndex]);
    setDailyIcon(getDailyCyberSecurityImage());
    setLoading(false);
  }, []);

  if (compact) {
    return (
      <div className="relative max-w-xs rounded-md border border-white/20 bg-white/10 p-3 backdrop-blur-sm">
        <div className="mb-1.5 flex items-center gap-2">
          <div className="rounded-md bg-red-500/80 p-1.5">
            {loading || !dailyIcon ? (
              <Shield className="h-3.5 w-3.5 text-white" />
            ) : (
              React.createElement(dailyIcon, { className: "h-3.5 w-3.5 text-white" })
            )}
          </div>
          <span className="flex-1 text-xs font-semibold text-white">Cyber Security Tip</span>
          {currentTip && (
            <span
              className={`rounded-full bg-gradient-to-r px-1.5 py-0.5 text-[10px] font-medium text-white ${getCategoryColor(currentTip.category)}`}
            >
              {currentTip.category}
            </span>
          )}
        </div>
        {loading || !currentTip ? (
          <div className="h-3 w-3/4 animate-pulse rounded bg-white/20" />
        ) : (
          <>
            <p className="mb-0.5 line-clamp-1 text-xs font-medium leading-tight text-white/90">
              {currentTip.title}
            </p>
            <p className="line-clamp-2 text-[11px] leading-relaxed text-white/70">
              {currentTip.tip}
            </p>
            <div className="mt-1.5 flex items-center gap-1 text-[10px] text-white/50">
              <Shield className="h-2.5 w-2.5" />
              <span>Stay secure, stay vigilant</span>
              <span className="ml-auto text-[9px] italic text-white/35">
                Source: NORED Cyber Security Guidance
              </span>
            </div>
          </>
        )}
      </div>
    );
  }

  if (loading) {
    return (
      <Card className="widget-card flex h-full flex-col">
        <CardHeader className="pb-3">
          <div className="flex flex-col items-center">
            <CardTitle className="text-center text-base font-semibold">
              Cyber Security Tip Of The Day
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="card-content flex flex-1 items-center justify-center pt-0">
          <GoldSpinner size="sm" />
        </CardContent>
      </Card>
    );
  }

  if (!currentTip) return null;

  return (
    <Card className="widget-card flex h-full flex-col">
      <CardHeader className="pb-3">
        <div className="flex flex-col items-center">
          <CardTitle className="text-center text-base font-semibold">
            Cyber Security Tip Of The Day
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="card-content flex-1 pt-0">
        <div className="flex h-full flex-col space-y-3">
          <div className="text-center">
            <div className="mb-1 flex justify-center">
              {dailyIcon && (
                <div
                  className={`flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-r shadow-lg ${getCategoryColor(currentTip.category)}`}
                >
                  {React.createElement(dailyIcon, { className: "h-6 w-6 text-white" })}
                </div>
              )}
            </div>
            <div
              className={`inline-block rounded-full bg-gradient-to-r px-2 py-0.5 text-xs font-medium text-white ${getCategoryColor(currentTip.category)}`}
            >
              {currentTip.category}
            </div>
          </div>

          <div className="flex-1 space-y-2 text-center">
            <h3 className="text-sm font-semibold text-foreground">{currentTip.title}</h3>
            <p className="text-xs leading-relaxed text-muted-foreground">{currentTip.tip}</p>
          </div>

          <div className="mt-auto border-t border-border/50 pt-1">
            <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
              <Shield className="h-3 w-3" />
              <span>Stay secure, stay vigilant</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
