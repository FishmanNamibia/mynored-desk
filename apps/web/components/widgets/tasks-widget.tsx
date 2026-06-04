import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Award, TrendingUp, Users } from "lucide-react";
import Link from "next/link";

const news = [
  {
    id: 1,
    title: "Planned Maintenance Coordination Underway",
    category: "Operations",
    date: "Apr 24, 2026",
    excerpt: "NORED teams are aligning regional maintenance work to reduce outages and improve response times.",
    icon: Users,
  },
  {
    id: 2,
    title: "Network Reliability Upgrade Progress Update",
    category: "Infrastructure",
    date: "Apr 22, 2026",
    excerpt: "Substation and feeder upgrades continue as part of the reliability improvement programme.",
    icon: TrendingUp,
  },
  {
    id: 3,
    title: "Customer Service Recognition Week Announced",
    category: "People",
    date: "Apr 18, 2026",
    excerpt: "Regional teams will share service improvements and recognize standout support staff.",
    icon: Award,
  },
];

export function TasksWidget() {
  return (
    <Card className="widget-card">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Latest News</CardTitle>
        <CardDescription>Stay updated with what&apos;s happening across NORED</CardDescription>
      </CardHeader>
      <CardContent className="card-content space-y-3">
        {news.slice(0, 2).map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.id}
              href="#"
              className="group flex gap-3 rounded-lg p-3 transition-colors hover:bg-accent"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <Icon className="h-5 w-5 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="mb-1 flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs">
                    {item.category}
                  </Badge>
                  <span className="text-xs text-muted-foreground">{item.date}</span>
                </div>
                <h4 className="mb-1 text-sm font-semibold transition-colors group-hover:text-primary">
                  {item.title}
                </h4>
                <p className="line-clamp-2 text-xs text-muted-foreground">{item.excerpt}</p>
              </div>
            </Link>
          );
        })}

        <Link
          href="/dashboard/news"
          className="inline-flex items-center pt-2 text-sm font-medium text-primary hover:text-primary/80"
        >
          View all news -
        </Link>
      </CardContent>
    </Card>
  );
}
