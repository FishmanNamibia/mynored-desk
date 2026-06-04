import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Clock, CheckCircle, XCircle } from "lucide-react"
import { colors } from "@/app/ui-standards"

const approvals = [
  {
    id: 1,
    title: "Leave Request - Alex Turner",
    type: "Time Off",
    date: "Jan 22-25, 2026",
    urgent: true,
  },
  {
    id: 2,
    title: "Budget Approval - Marketing",
    type: "Finance",
    date: "Q1 2026",
    urgent: false,
  },
  {
    id: 3,
    title: "Equipment Request - IT Dept",
    type: "Procurement",
    date: "5 new laptops",
    urgent: true,
  },
]

export function ApprovalsWidget() {
  // Sort approvals: urgent first
  const sortedApprovals = [...approvals].sort((a, b) => {
    if (a.urgent && !b.urgent) return -1;
    if (!a.urgent && b.urgent) return 1;
    return 0;
  });

  return (
    <Card className="widget-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-card-foreground flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Pending Approvals
          </CardTitle>
          <a href="/dashboard/approvals" className="text-sm text-primary hover:underline">
            View all
          </a>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {sortedApprovals.map((approval) => (
            <div 
              key={approval.id} 
              className={`relative p-4 rounded-xl border transition-all cursor-pointer ${
                approval.urgent 
                  ? "bg-linear-to-r from-red-50 to-orange-50 dark:from-red-950/30 dark:to-orange-950/20 border-red-200 dark:border-red-800 shadow-md" 
                  : "bg-card border-border hover:border-border/80 hover:shadow-md"
              }`}
              style={{ 
                boxShadow: approval.urgent 
                  ? "0 2px 8px rgba(239, 68, 68, 0.12)" 
                  : "0 1px 3px rgba(0, 0, 0, 0.04)" 
              }}
            >
              {/* Urgent indicator bar */}
              {approval.urgent && (
                <div 
                  className="absolute left-0 top-0 bottom-0 w-1 rounded-l-xl"
                  style={{ 
                    background: "linear-gradient(to bottom, #ef4444 0%, #f97316 100%)"
                  }}
                />
              )}
              
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-0.5">
                    <h4 className={`font-semibold ${approval.urgent ? "text-red-900 dark:text-red-400" : "text-foreground"}`}>
                      {approval.title}
                    </h4>
                    {approval.urgent && (
                      <span className="relative flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-red-500 text-white text-xs font-bold uppercase shadow-sm">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
                        </span>
                        Urgent
                      </span>
                    )}
                  </div>
                  <p className={`text-sm ${approval.urgent ? "text-red-700 dark:text-red-400" : "text-muted-foreground"}`}>
                    {approval.type} • {approval.date}
                  </p>
                </div>
                <div 
                  className={`flex items-center justify-center w-10 h-10 rounded-lg shrink-0 ${approval.urgent ? "bg-red-100 dark:bg-red-900/30 border-2 border-red-300 dark:border-red-700" : "bg-muted border-none"}`}
                >
                  <Clock 
                    className={`w-5 h-5 ${approval.urgent ? "text-red-600 dark:text-red-400" : "text-foreground"}`}
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button 
                  size="sm" 
                  className="flex-1 text-white" 
                  style={{ 
                    backgroundColor: approval.urgent ? colors.error : colors.navy,
                    fontWeight: approval.urgent ? "700" : "500"
                  }}
                >
                  <CheckCircle className="w-4 h-4 mr-1" />
                  Approve
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className={`flex-1 ${
                    approval.urgent 
                      ? "border-red-300 text-red-700 hover:bg-red-100" 
                      : "border-gray-200 text-gray-600 hover:bg-gray-50"
                  } bg-white`}
                >
                  <XCircle className="w-4 h-4 mr-1" />
                  Reject
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
