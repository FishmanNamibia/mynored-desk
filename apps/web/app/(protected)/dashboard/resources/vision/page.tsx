"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Eye, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function VisionPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      <div className="container mx-auto p-6 max-w-4xl">
        <Link 
          href="/dashboard" 
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-indigo-600 mb-8 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </Link>

        <div className="flex items-center gap-4 mb-12">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg">
            <Eye className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">Vision</h1>
            <p className="text-sm text-muted-foreground mt-1">Namibia Statistics Agency</p>
          </div>
        </div>

        <Card className="border-0 shadow-2xl bg-white/80 backdrop-blur">
          <CardContent className="p-12">
            <div className="relative">
              <div className="absolute -top-4 -left-4 text-8xl text-indigo-200 font-serif">"</div>
              <div className="absolute -bottom-4 -right-4 text-8xl text-indigo-200 font-serif">"</div>
              <p className="text-3xl font-bold text-center text-foreground leading-relaxed relative z-10 py-8">
                To be a high performance institution in quality statistics delivery
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="mt-8 flex justify-center">
          <div className="w-20 h-1 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full"></div>
        </div>
      </div>
    </div>
  );
}
