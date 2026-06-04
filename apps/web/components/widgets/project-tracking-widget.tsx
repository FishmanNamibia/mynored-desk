"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Briefcase, 
  Users, 
  CheckCircle2, 
  Clock, 
  AlertTriangle,
  TrendingUp,
  ChevronRight,
  ChevronLeft,
  Loader2
} from "lucide-react";
import Link from "next/link";
import useEmblaCarousel from "embla-carousel-react";
import Autoplay from 'embla-carousel-autoplay';

interface ProjectStats {
  totalTasks: number;
  completedTasks: number;
  myTasks: number;
  avgProgress: number;
  risks: number;
  issues: number;
  documents: number;
}

interface Project {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  percentComplete: number;
  plannedEndDate: string | null;
  owner: {
    id: string;
    name: string;
  } | null;
  department: {
    id: string;
    name: string;
  } | null;
  teamSize: number;
  stats: ProjectStats;
  isOwner: boolean;
}

const statusColors: Record<string, string> = {
  PLANNING: "bg-blue-100 text-blue-800 border-blue-200",
  IN_PROGRESS: "bg-green-100 text-green-800 border-green-200",
  ON_HOLD: "bg-yellow-100 text-yellow-800 border-yellow-200",
  COMPLETED: "bg-gray-100 text-gray-800 border-gray-200",
  CANCELLED: "bg-red-100 text-red-800 border-red-200",
};

const priorityColors: Record<string, string> = {
  LOW: "bg-gray-100 text-gray-600",
  MEDIUM: "bg-blue-100 text-blue-600",
  HIGH: "bg-orange-100 text-orange-600",
  CRITICAL: "bg-red-100 text-red-600",
};

export function ProjectTrackingWidget() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [emblaRef, emblaApi] = useEmblaCarousel(
    { loop: true, align: 'center' },
    [Autoplay({ delay: 4000, stopOnInteraction: true })]
  );
  const [prevBtnEnabled, setPrevBtnEnabled] = useState(false);
  const [nextBtnEnabled, setNextBtnEnabled] = useState(false);

  const scrollPrev = useCallback(() => emblaApi && emblaApi.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi && emblaApi.scrollNext(), [emblaApi]);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setPrevBtnEnabled(emblaApi.canScrollPrev());
    setNextBtnEnabled(emblaApi.canScrollNext());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    emblaApi.on("select", onSelect);
    return () => {
      emblaApi.off("select", onSelect);
    };
  }, [emblaApi, onSelect]);

  useEffect(() => {
    fetch("/api/dashboard-projects")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch projects");
        return res.json();
      })
      .then((data) => {
        setProjects(data.projects || []);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error fetching projects:", err);
        setError("Failed to load projects");
        setLoading(false);
      });
  }, []);

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "No deadline";
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = date.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return `${Math.abs(diffDays)}d overdue`;
    if (diffDays === 0) return "Due today";
    if (diffDays === 1) return "Due tomorrow";
    if (diffDays <= 7) return `${diffDays}d left`;
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const getStatusLabel = (status: string) => {
    return status.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (l) => l.toUpperCase());
  };

  return (
    <Card className="h-full flex flex-col widget-card border border-border shadow-sm hover:shadow-md transition-shadow">
      <CardHeader className="pb-3 border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100">
              <Briefcase className="h-4 w-4 text-blue-600" />
            </div>
            <CardTitle className="text-base font-semibold">Surveys & Project Tracking</CardTitle>
          </div>
          <Link href="/dashboard/performance/my-tasks?tab=projects">
            <Button variant="ghost" size="sm" className="h-8 text-xs">
              View All
              <ChevronRight className="h-3 w-3 ml-1" />
            </Button>
          </Link>
        </div>
      </CardHeader>

      <CardContent className="flex-1 p-4 card-content">
        {loading && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center space-y-2">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto" />
              <p className="text-sm text-muted-foreground">Loading projects...</p>
            </div>
          </div>
        )}

        {error && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center space-y-2">
              <AlertTriangle className="h-8 w-8 text-orange-500 mx-auto" />
              <p className="text-sm text-muted-foreground">{error}</p>
            </div>
          </div>
        )}

        {!loading && !error && projects.length === 0 && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center space-y-2">
              <Briefcase className="h-12 w-12 text-gray-300 mx-auto" />
              <p className="text-sm text-muted-foreground">No active projects</p>
              <Link href="/dashboard/performance/my-tasks?tab=projects">
                <Button variant="outline" size="sm" className="mt-2">
                  Explore Projects
                </Button>
              </Link>
            </div>
          </div>
        )}

        {!loading && !error && projects.length > 0 && (
          <div className="relative">
            {/* Navigation Buttons */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={scrollPrev}
                  disabled={!prevBtnEnabled}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={scrollNext}
                  disabled={!nextBtnEnabled}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
              <span className="text-xs text-muted-foreground">
                {projects.length} project{projects.length !== 1 ? 's' : ''}
              </span>
            </div>

            {/* Carousel */}
            <div className="overflow-hidden" ref={emblaRef}>
              <div className="flex">
                {projects.map((project) => (
                  <div key={project.id} className="flex-none w-full px-1">
                    <Link 
                      href={`/dashboard/performance/my-tasks?tab=projects&project=${project.id}`}
                      className="block h-full"
                    >
                      <div className="group p-3 rounded-lg border border-border bg-white hover:bg-gray-50 hover:border-blue-200 transition-all cursor-pointer h-full">
                        {/* Header */}
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-semibold text-gray-900 truncate group-hover:text-blue-600 transition-colors">
                              {project.title}
                            </h4>
                            {project.description && (
                              <p className="text-xs text-gray-500 line-clamp-1 mt-0.5">
                                {project.description}
                              </p>
                            )}
                          </div>
                          {project.isOwner && (
                            <Badge variant="outline" className="text-xs px-1.5 py-0 bg-blue-50 text-blue-700 border-blue-200 shrink-0">
                              Owner
                            </Badge>
                          )}
                        </div>

                        {/* Status and Priority */}
                        <div className="flex items-center gap-2 mb-2">
                          <Badge 
                            variant="outline" 
                            className={`text-xs px-2 py-0 ${statusColors[project.status] || statusColors.PLANNING}`}
                          >
                            {getStatusLabel(project.status)}
                          </Badge>
                          <Badge 
                            variant="outline" 
                            className={`text-xs px-2 py-0 ${priorityColors[project.priority] || priorityColors.MEDIUM}`}
                          >
                            {project.priority}
                          </Badge>
                        </div>

                        {/* Progress Bar */}
                        <div className="mb-2">
                          <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                            <span className="font-medium">Progress</span>
                            <span className="font-semibold">{project.stats.avgProgress}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
                            <div 
                              className="bg-gradient-to-r from-blue-500 to-blue-600 h-1.5 rounded-full transition-all duration-300"
                              style={{ width: `${project.stats.avgProgress}%` }}
                            />
                          </div>
                        </div>

                        {/* Stats Grid */}
                        <div className="grid grid-cols-3 gap-2 text-xs">
                          <div className="flex items-center gap-1 text-gray-600">
                            <CheckCircle2 className="h-3 w-3 text-green-600" />
                            <span className="font-medium">{project.stats.completedTasks}/{project.stats.totalTasks}</span>
                            <span className="text-gray-400">tasks</span>
                          </div>
                          <div className="flex items-center gap-1 text-gray-600">
                            <Users className="h-3 w-3 text-blue-600" />
                            <span className="font-medium">{project.teamSize}</span>
                            <span className="text-gray-400">team</span>
                          </div>
                          <div className="flex items-center gap-1 text-gray-600">
                            <Clock className="h-3 w-3 text-orange-600" />
                            <span className="font-medium truncate">{formatDate(project.plannedEndDate)}</span>
                          </div>
                        </div>

                        {/* Alerts */}
                        {(project.stats.risks > 0 || project.stats.issues > 0) && (
                          <div className="flex items-center gap-2 mt-2 pt-2 border-t border-gray-100">
                            {project.stats.risks > 0 && (
                              <div className="flex items-center gap-1 text-xs text-orange-600">
                                <AlertTriangle className="h-3 w-3" />
                                <span className="font-medium">{project.stats.risks} risk{project.stats.risks > 1 ? 's' : ''}</span>
                              </div>
                            )}
                            {project.stats.issues > 0 && (
                              <div className="flex items-center gap-1 text-xs text-red-600">
                                <AlertTriangle className="h-3 w-3" />
                                <span className="font-medium">{project.stats.issues} issue{project.stats.issues > 1 ? 's' : ''}</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
