"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Target, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function MissionPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-50 via-white to-blue-50">
      <div className="container mx-auto p-6 max-w-4xl">
        <Link 
          href="/dashboard" 
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-cyan-600 mb-8 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </Link>

        <div className="flex items-center gap-4 mb-12">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg">
            <Target className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-cyan-600 to-blue-600 bg-clip-text text-transparent">Mission</h1>
            <p className="text-sm text-muted-foreground mt-1">Namibia Statistics Agency</p>
          </div>
        </div>

        <Card className="border-0 shadow-2xl bg-white/80 backdrop-blur">
          <CardContent className="p-12">
            <div className="relative">
              <div className="absolute -top-4 -left-4 text-8xl text-cyan-200 font-serif">"</div>
              <div className="absolute -bottom-4 -right-4 text-8xl text-cyan-200 font-serif">"</div>
              <p className="text-2xl font-bold text-center text-foreground leading-relaxed relative z-10 py-8">
                Leveraging on partnerships and innovative technologies, to produce and disseminate relevant, quality, timely statistics and spatial data that are fit-for-purpose in accordance with international standards and best practice
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="mt-8 flex justify-center">
          <div className="w-20 h-1 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-full"></div>
        </div>
      </div>
    </div>
  );
}
