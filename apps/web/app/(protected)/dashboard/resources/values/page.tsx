"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Heart, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function ValuesPage() {
  return (
    <div className="container mx-auto p-6 max-w-3xl">
      <Link 
        href="/dashboard" 
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Dashboard
      </Link>

      <div className="flex items-center gap-3 mb-8">
        <div className="w-12 h-12 rounded-lg bg-purple-50 flex items-center justify-center">
          <Heart className="w-6 h-6 text-purple-600" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-foreground">Our Values</h1>
          <p className="text-sm text-muted-foreground">Namibia Statistics Agency</p>
        </div>
      </div>

      <Card>
        <CardContent className="p-8">
          <div className="grid gap-4">
            <div className="flex items-start gap-3 p-4 bg-muted/50 rounded-lg">
              <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-purple-600 font-bold">•</span>
              </div>
              <div>
                <h3 className="font-semibold text-foreground text-lg">Integrity</h3>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 bg-muted/50 rounded-lg">
              <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-purple-600 font-bold">•</span>
              </div>
              <div>
                <h3 className="font-semibold text-foreground text-lg">Excellent Performance</h3>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 bg-muted/50 rounded-lg">
              <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-purple-600 font-bold">•</span>
              </div>
              <div>
                <h3 className="font-semibold text-foreground text-lg">Professionalism</h3>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 bg-muted/50 rounded-lg">
              <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-purple-600 font-bold">•</span>
              </div>
              <div>
                <h3 className="font-semibold text-foreground text-lg">Accountability</h3>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 bg-muted/50 rounded-lg">
              <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-purple-600 font-bold">•</span>
              </div>
              <div>
                <h3 className="font-semibold text-foreground text-lg">Partnership</h3>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 bg-muted/50 rounded-lg">
              <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-purple-600 font-bold">•</span>
              </div>
              <div>
                <h3 className="font-semibold text-foreground text-lg">Customer-focused</h3>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
