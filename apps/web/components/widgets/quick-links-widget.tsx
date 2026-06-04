import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ExternalLink, Database, FileText, Mail, Users, BookOpen, Calendar, Shield } from "lucide-react"
import Link from "next/link"

const quickLinks = [
  {
    id: 1,
    title: "NORED Website",
    description: "Public-facing website",
    url: "https://nsa.org.na",
    icon: ExternalLink,
    color: "text-red-700 bg-red-50",
  },
  {
    id: 2,
    title: "Data Portal",
    description: "National statistics data",
    url: "https://nsa.org.na/data-portals",
    icon: Database,
    color: "text-emerald-600 bg-emerald-50",
  },
  {
    id: 3,
    title: "Webmail",
    description: "Access your email",
    url: "https://mail.nsa.org.na",
    icon: Mail,
    color: "text-rose-700 bg-rose-50",
  },
  {
    id: 4,
    title: "Staff Directory",
    description: "Contact colleagues",
    url: "/dashboard/directory",
    icon: Users,
    color: "text-pink-700 bg-pink-50",
  },
  {
    id: 5,
    title: "Knowledge Base",
    description: "Policies & procedures",
    url: "/dashboard/knowledge",
    icon: BookOpen,
    color: "text-rose-700 bg-rose-100",
  },
  {
    id: 6,
    title: "Booking System",
    description: "Rooms & resources",
    url: "/dashboard/admin/rooms",
    icon: Calendar,
    color: "text-red-600 bg-red-100",
  },
  {
    id: 7,
    title: "IT Policies",
    description: "Security guidelines",
    url: "/dashboard/it/policies",
    icon: Shield,
    color: "text-red-600 bg-red-50",
  },
  {
    id: 8,
    title: "Publications",
    description: "Reports & releases",
    url: "https://nsa.org.na/publications",
    icon: FileText,
    color: "text-rose-600 bg-rose-50",
  },
]

export function QuickLinksWidget() {
  return (
    <Card className="widget-card">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold">Quick Links</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="grid grid-cols-2 gap-2">
          {quickLinks.map((link) => {
            const Icon = link.icon
            const isExternal = link.url.startsWith("http")

            return (
              <Link
                key={link.id}
                href={link.url}
                target={isExternal ? "_blank" : undefined}
                rel={isExternal ? "noopener noreferrer" : undefined}
                className="flex items-center gap-2 p-2.5 rounded-lg border border-border hover:border-primary/50 hover:bg-primary/5 transition-all group"
              >
                <div className={`w-8 h-8 rounded-lg ${link.color} dark:brightness-110 dark:saturate-150 flex items-center justify-center shrink-0`}>
                  <Icon className="w-4 h-4" />
                </div>
                <span className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors leading-tight">
                  {link.title}
                </span>
              </Link>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
