import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { FileText, Calendar, User, Eye } from "lucide-react"

interface MemoListProps {
  searchQuery: string
  statusFilter: string
}

const memos = [
  {
    id: 1,
    title: "Security Clearance Renewal Process",
    description: "Updated procedures for annual security clearance renewals",
    author: "Sarah Chen",
    date: "Jan 14, 2026",
    status: "approved",
    views: 45,
  },
  {
    id: 2,
    title: "Q4 Budget Allocation",
    description: "Budget distribution across departments for Q4 2026",
    author: "Michael Rodriguez",
    date: "Jan 13, 2026",
    status: "pending",
    views: 23,
  },
  {
    id: 3,
    title: "Remote Work Policy Update",
    description: "New guidelines for hybrid work arrangements",
    author: "Emily Watson",
    date: "Jan 12, 2026",
    status: "approved",
    views: 89,
  },
  {
    id: 4,
    title: "IT Infrastructure Upgrade",
    description: "Proposed upgrades to network and server systems",
    author: "David Kim",
    date: "Jan 11, 2026",
    status: "draft",
    views: 12,
  },
  {
    id: 5,
    title: "Training Program Implementation",
    description: "New employee onboarding and continuous training initiatives",
    author: "Jennifer Lee",
    date: "Jan 10, 2026",
    status: "approved",
    views: 67,
  },
]

const statusColors = {
  draft: "secondary",
  pending: "default",
  approved: "outline",
  rejected: "destructive",
} as const

const statusLabels = {
  draft: "Draft",
  pending: "Pending Review",
  approved: "Approved",
  rejected: "Rejected",
}

export function MemoList({ searchQuery, statusFilter }: MemoListProps) {
  const filteredMemos = memos.filter((memo) => {
    const search = searchQuery?.toLowerCase() || "";
    const matchesSearch =
      memo.title?.toLowerCase().includes(search) ||
      memo.description?.toLowerCase().includes(search)
    const matchesStatus = statusFilter === "all" || memo.status === statusFilter
    return matchesSearch && matchesStatus
  })

  return (
    <div className="space-y-4">
      {filteredMemos.map((memo) => (
        <Card key={memo.id} className="bg-card border-border hover:border-primary/50 transition-colors cursor-pointer">
          <CardContent className="p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex gap-4 flex-1">
                <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-primary/10 shrink-0">
                  <FileText className="w-6 h-6 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-lg font-semibold text-card-foreground">{memo.title}</h3>
                    <Badge variant={statusColors[memo.status as keyof typeof statusColors]}>
                      {statusLabels[memo.status as keyof typeof statusLabels]}
                    </Badge>
                  </div>
                  <p className="text-muted-foreground mb-3">{memo.description}</p>
                  <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <User className="w-4 h-4" />
                      <span>{memo.author}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      <span>{memo.date}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Eye className="w-4 h-4" />
                      <span>{memo.views} views</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
      {filteredMemos.length === 0 && (
        <Card className="bg-card border-border">
          <CardContent className="p-12 text-center">
            <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-card-foreground mb-2">No memos found</h3>
            <p className="text-muted-foreground">Try adjusting your search or filter criteria</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
