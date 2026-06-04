"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GraduationCap, ArrowLeft, Video, FileText, Users } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function TrainingPage() {
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
        <div className="w-12 h-12 rounded-lg bg-purple-50 flex items-center justify-center">
          <GraduationCap className="w-6 h-6 text-purple-600" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-foreground">Training Resources</h1>
          <p className="text-sm text-muted-foreground">Continuous Learning & Development</p>
        </div>
      </div>

      {/* Training Content */}
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Welcome to NSA Learning Hub</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground leading-relaxed">
              At NSA, we believe in continuous professional development. Our training resources are designed 
              to help you grow in your role and advance your career. Explore our learning materials, workshops, 
              and development programs.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Onboarding Training</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="p-4 border rounded-lg hover:bg-muted transition-colors cursor-pointer flex items-start gap-3">
                <Video className="w-5 h-5 text-purple-600 mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-semibold text-foreground">Introduction to NSA</h4>
                  <p className="text-sm text-muted-foreground mb-2">Overview of our organization, history, and mandate</p>
                  <Button size="sm" variant="outline">Start Course</Button>
                </div>
              </div>

              <div className="p-4 border rounded-lg hover:bg-muted transition-colors cursor-pointer flex items-start gap-3">
                <Video className="w-5 h-5 text-purple-600 mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-semibold text-foreground">Statistical Fundamentals</h4>
                  <p className="text-sm text-muted-foreground mb-2">Basic statistical concepts and methodologies</p>
                  <Button size="sm" variant="outline">Start Course</Button>
                </div>
              </div>

              <div className="p-4 border rounded-lg hover:bg-muted transition-colors cursor-pointer flex items-start gap-3">
                <Video className="w-5 h-5 text-purple-600 mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-semibold text-foreground">Systems & Tools Training</h4>
                  <p className="text-sm text-muted-foreground mb-2">Learn to use NSA's software and platforms</p>
                  <Button size="sm" variant="outline">Start Course</Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Professional Development</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="p-4 border rounded-lg hover:bg-muted transition-colors cursor-pointer">
                <FileText className="w-6 h-6 text-blue-600 mb-2" />
                <h4 className="font-semibold text-foreground mb-1">Data Analysis</h4>
                <p className="text-sm text-muted-foreground mb-2">Advanced statistical analysis techniques</p>
                <span className="text-xs text-muted-foreground">12 modules • 8 hours</span>
              </div>

              <div className="p-4 border rounded-lg hover:bg-muted transition-colors cursor-pointer">
                <FileText className="w-6 h-6 text-green-600 mb-2" />
                <h4 className="font-semibold text-foreground mb-1">Survey Methodology</h4>
                <p className="text-sm text-muted-foreground mb-2">Design and conduct effective surveys</p>
                <span className="text-xs text-muted-foreground">10 modules • 6 hours</span>
              </div>

              <div className="p-4 border rounded-lg hover:bg-muted transition-colors cursor-pointer">
                <FileText className="w-6 h-6 text-orange-600 mb-2" />
                <h4 className="font-semibold text-foreground mb-1">Data Visualization</h4>
                <p className="text-sm text-muted-foreground mb-2">Create compelling data presentations</p>
                <span className="text-xs text-muted-foreground">8 modules • 5 hours</span>
              </div>

              <div className="p-4 border rounded-lg hover:bg-muted transition-colors cursor-pointer">
                <FileText className="w-6 h-6 text-purple-600 mb-2" />
                <h4 className="font-semibold text-foreground mb-1">Leadership Skills</h4>
                <p className="text-sm text-muted-foreground mb-2">Develop management capabilities</p>
                <span className="text-xs text-muted-foreground">15 modules • 10 hours</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Workshops & Seminars</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <Users className="w-5 h-5 text-blue-600 mt-0.5" />
                    <div>
                      <h4 className="font-semibold text-foreground">Statistical Software Workshop</h4>
                      <p className="text-sm text-muted-foreground">Hands-on training with SPSS and R</p>
                      <p className="text-xs text-muted-foreground mt-1">📅 Next session: March 15, 2026</p>
                    </div>
                  </div>
                  <Button size="sm">Register</Button>
                </div>
              </div>

              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <Users className="w-5 h-5 text-green-600 mt-0.5" />
                    <div>
                      <h4 className="font-semibold text-foreground">Quality Assurance Seminar</h4>
                      <p className="text-sm text-muted-foreground">Best practices in statistical quality control</p>
                      <p className="text-xs text-muted-foreground mt-1">📅 Next session: March 22, 2026</p>
                    </div>
                  </div>
                  <Button size="sm">Register</Button>
                </div>
              </div>

              <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <Users className="w-5 h-5 text-purple-600 mt-0.5" />
                    <div>
                      <h4 className="font-semibold text-foreground">Communication Skills Workshop</h4>
                      <p className="text-sm text-muted-foreground">Effective presentation and report writing</p>
                      <p className="text-xs text-muted-foreground mt-1">📅 Next session: April 5, 2026</p>
                    </div>
                  </div>
                  <Button size="sm">Register</Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">External Training Opportunities</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm mb-4">
              NSA supports staff participation in external training programs and conferences. 
              Contact the HR department for information about:
            </p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="text-primary mt-1">•</span>
                <span>International statistical conferences and workshops</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-1">•</span>
                <span>Professional certification programs</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-1">•</span>
                <span>Academic courses and degree programs</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-1">•</span>
                <span>Exchange programs with other statistical agencies</span>
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
