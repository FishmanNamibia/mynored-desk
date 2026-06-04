"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, ArrowLeft, Download } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function HandbookPage() {
  return (
    <div className="container mx-auto p-6 max-w-4xl">
      {/* Back Button */}
      <Link 
        href="/dashboard" 
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Dashboard
      </Link>

      {/* Page Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-lg bg-blue-50 flex items-center justify-center">
          <BookOpen className="w-6 h-6 text-blue-600" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-foreground">Employee Handbook</h1>
          <p className="text-sm text-muted-foreground">Your guide to working at NORED</p>
        </div>
      </div>

      {/* Handbook Content */}
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Welcome to NORED</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground leading-relaxed">
              This handbook provides essential information about working at NORED.
              It covers our policies, procedures, benefits, and expectations to help you succeed in your role.
            </p>
            <Button className="gap-2">
              <Download className="w-4 h-4" />
              Download Full Handbook (PDF)
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Quick Reference</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="p-4 bg-muted rounded-lg">
                <h4 className="font-semibold text-foreground mb-2">Working Hours</h4>
                <p className="text-sm text-muted-foreground">
                  Monday - Friday: 8:00 AM - 5:00 PM<br />
                  Lunch Break: 1:00 PM - 2:00 PM
                </p>
              </div>

              <div className="p-4 bg-muted rounded-lg">
                <h4 className="font-semibold text-foreground mb-2">Leave Policy</h4>
                <p className="text-sm text-muted-foreground">
                  Annual Leave: 24 days per year<br />
                  Sick Leave: As per policy
                </p>
              </div>

              <div className="p-4 bg-muted rounded-lg">
                <h4 className="font-semibold text-foreground mb-2">Code of Conduct</h4>
                <p className="text-sm text-muted-foreground">
                  Professional behavior, integrity, and respect are expected at all times.
                </p>
              </div>

              <div className="p-4 bg-muted rounded-lg">
                <h4 className="font-semibold text-foreground mb-2">Performance Reviews</h4>
                <p className="text-sm text-muted-foreground">
                  Annual performance evaluations and quarterly check-ins.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Key Sections</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="p-3 border rounded-lg hover:bg-muted transition-colors cursor-pointer">
                <h4 className="font-semibold text-foreground">1. Introduction to NORED</h4>
                <p className="text-sm text-muted-foreground">Our history, mission, and organizational structure</p>
              </div>
              <div className="p-3 border rounded-lg hover:bg-muted transition-colors cursor-pointer">
                <h4 className="font-semibold text-foreground">2. Employment Policies</h4>
                <p className="text-sm text-muted-foreground">Terms of employment, probation, and contracts</p>
              </div>
              <div className="p-3 border rounded-lg hover:bg-muted transition-colors cursor-pointer">
                <h4 className="font-semibold text-foreground">3. Benefits & Compensation</h4>
                <p className="text-sm text-muted-foreground">Salary, allowances, medical aid, and pension</p>
              </div>
              <div className="p-3 border rounded-lg hover:bg-muted transition-colors cursor-pointer">
                <h4 className="font-semibold text-foreground">4. Leave & Attendance</h4>
                <p className="text-sm text-muted-foreground">Annual leave, sick leave, and special leave provisions</p>
              </div>
              <div className="p-3 border rounded-lg hover:bg-muted transition-colors cursor-pointer">
                <h4 className="font-semibold text-foreground">5. Health & Safety</h4>
                <p className="text-sm text-muted-foreground">Workplace safety guidelines and emergency procedures</p>
              </div>
              <div className="p-3 border rounded-lg hover:bg-muted transition-colors cursor-pointer">
                <h4 className="font-semibold text-foreground">6. IT & Data Security</h4>
                <p className="text-sm text-muted-foreground">Acceptable use policies and data protection</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
