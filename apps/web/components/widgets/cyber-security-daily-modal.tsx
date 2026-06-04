"use client";

import React, { useEffect, useState } from "react";
import {
  CheckCircle2,
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
  CYBER_TIP_STORAGE_KEY,
  type CyberSecurityTip,
} from "@/lib/cyber-security-tips";

const categoryMeta: Record<string, { gradient: string; light: string; text: string }> = {
  Authentication: { gradient: "from-[#b91c1c] to-[#8f151b]", light: "bg-red-50", text: "text-red-700" },
  "System Security": { gradient: "from-[#991b1b] to-[#7f1d1d]", light: "bg-red-50", text: "text-red-700" },
  "Email Security": { gradient: "from-[#c2410c] to-[#9a3412]", light: "bg-orange-50", text: "text-orange-700" },
  "Network Security": { gradient: "from-[#be123c] to-[#881337]", light: "bg-rose-50", text: "text-rose-700" },
  "Data Protection": { gradient: "from-[#dc2626] to-[#991b1b]", light: "bg-red-50", text: "text-red-700" },
  "Social Engineering": { gradient: "from-[#ea580c] to-[#c2410c]", light: "bg-orange-50", text: "text-orange-700" },
  "Web Security": { gradient: "from-[#b91c1c] to-[#9f1239]", light: "bg-rose-50", text: "text-rose-700" },
  Privacy: { gradient: "from-[#e11d48] to-[#9f1239]", light: "bg-rose-50", text: "text-rose-700" },
  "Physical Security": { gradient: "from-[#d97706] to-[#b45309]", light: "bg-amber-50", text: "text-amber-700" },
  "Remote Work": { gradient: "from-[#ef4444] to-[#b91c1c]", light: "bg-red-50", text: "text-red-700" },
  "Financial Security": { gradient: "from-[#9a3412] to-[#7c2d12]", light: "bg-orange-50", text: "text-orange-700" },
  "Mobile Security": { gradient: "from-[#f43f5e] to-[#be123c]", light: "bg-rose-50", text: "text-rose-700" },
  Encryption: { gradient: "from-[#7f1d1d] to-[#450a0a]", light: "bg-red-50", text: "text-red-800" },
};

const dailyIcons = [
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

interface Props {
  userId?: string;
}

export function CyberSecurityDailyModal({ userId }: Props) {
  const [visible, setVisible] = useState(false);
  const [tip, setTip] = useState<CyberSecurityTip | null>(null);
  const [dailyIcon, setDailyIcon] = useState<React.ElementType>(Shield);
  const [noted, setNoted] = useState(false);

  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    const key = userId ? `${CYBER_TIP_STORAGE_KEY}_${userId}` : CYBER_TIP_STORAGE_KEY;
    const dismissed = localStorage.getItem(key);

    if (dismissed === today) {
      return;
    }

    const dayOfYear = Math.floor(
      (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000,
    );
    const tipIndex = dayOfYear % CYBER_SECURITY_TIPS.length;
    const iconIndex = dayOfYear % dailyIcons.length;

    setTip(CYBER_SECURITY_TIPS[tipIndex]);
    setDailyIcon(dailyIcons[iconIndex]);
    setVisible(true);
  }, [userId]);

  const handleNoted = () => {
    setNoted(true);
    const today = new Date().toISOString().slice(0, 10);
    const key = userId ? `${CYBER_TIP_STORAGE_KEY}_${userId}` : CYBER_TIP_STORAGE_KEY;
    localStorage.setItem(key, today);
    setTimeout(() => setVisible(false), 400);
  };

  if (!visible || !tip) return null;

  const meta = categoryMeta[tip.category] ?? {
    gradient: "from-gray-600 to-gray-800",
    light: "bg-gray-50",
    text: "text-gray-700",
  };

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{ background: "rgba(10, 22, 40, 0.92)", backdropFilter: "blur(8px)" }}
    >
      <div
        className={`relative w-full max-w-lg overflow-hidden rounded-2xl shadow-2xl transition-all duration-400 ${
          noted ? "scale-95 opacity-0" : "scale-100 opacity-100"
        }`}
        style={{ background: "#fff" }}
      >
        <div className={`relative overflow-hidden bg-gradient-to-br ${meta.gradient} px-7 pb-10 pt-8`}>
          <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-3xl" />
          <div className="absolute -bottom-10 -left-10 h-32 w-32 rounded-full bg-white/10 blur-3xl" />

          <div className="relative z-10 mb-6 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/20">
                <Shield className="h-4 w-4 text-white" />
              </div>
              <span className="text-xs font-semibold uppercase tracking-widest text-white/90">
                NORED Cyber Security
              </span>
            </div>
            <span className="rounded-full bg-white/20 px-2.5 py-1 text-xs font-semibold text-white">
              {tip.category}
            </span>
          </div>

          <div className="relative z-10 mb-4 flex justify-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl border border-white/30 bg-white/20 shadow-xl backdrop-blur-sm">
              {React.createElement(dailyIcon, { className: "h-10 w-10 text-white" })}
            </div>
          </div>

          <h2 className="relative z-10 text-center text-xl font-bold leading-tight text-white">
            {tip.title}
          </h2>
          <p className="relative z-10 mt-1 text-center text-xs font-medium uppercase tracking-wide text-white/70">
            Cyber Security Tip Of The Day
          </p>
        </div>

        <div className="px-7 py-6">
          <p className="text-center text-sm leading-relaxed text-gray-700">{tip.tip}</p>

          <div className="mt-4 flex items-center justify-center gap-1.5 text-xs text-gray-400">
            <Shield className="h-3 w-3" />
            <span>Stay secure, stay vigilant</span>
            <span className="mx-1 text-gray-300">·</span>
            <span className="italic">Source: NORED Cyber Security Guidance</span>
          </div>
        </div>

        <div className="mx-7 h-px bg-gray-100" />

        <div className="flex flex-col items-center gap-3 px-7 py-5">
          <p className="text-center text-xs text-gray-400">
            Please acknowledge today&apos;s security tip before accessing your desk.
          </p>
          <button
            onClick={handleNoted}
            className={`flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r ${meta.gradient} py-3 text-sm font-bold tracking-wide text-white shadow-lg transition-all duration-200 hover:opacity-90 hover:shadow-xl active:scale-95`}
          >
            <CheckCircle2 className="h-4 w-4" />
            Noted - Take me to my desk
          </button>
          <p className="text-[10px] text-gray-400">
            This tip will not appear again today. A new tip awaits you tomorrow.
          </p>
        </div>
      </div>
    </div>
  );
}
