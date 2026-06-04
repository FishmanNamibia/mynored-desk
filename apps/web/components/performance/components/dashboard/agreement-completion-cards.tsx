'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, CheckCircle2, Clock, AlertCircle, TrendingUp, FileText, Award, Target } from 'lucide-react'

interface CompletionStats {
  totalAgreements?: number
  completed?: number
  inProgress?: number
  notStarted?: number
  completionRate?: number
  totalUsers?: number
  usersWithAgreements?: number
  usersWithCompleteAgreements?: number
  usersInProgress?: number
  usersNotStarted?: number
  totalApproved?: number
}

interface AgreementCompletionCardsProps {
  stats: CompletionStats
  level: 'organization' | 'department' | 'division'
  levelName?: string
}

export function AgreementCompletionCards({ stats, level, levelName }: AgreementCompletionCardsProps) {
  const levelLabel = level === 'organization' ? 'Organization' : (levelName || level)
  
  const completionRate = stats.completionRate ?? 0
  const totalUsers = stats.totalUsers ?? 0
  const usersWithAgreements = stats.usersWithAgreements ?? 0
  const usersComplete = stats.usersWithCompleteAgreements ?? 0
  const usersInProgress = stats.usersInProgress ?? 0
  const usersNotStarted = stats.usersNotStarted ?? 0
  const totalAgreements = stats.totalAgreements ?? 0
  const totalApproved = stats.totalApproved ?? 0

  const primaryCards = [
    {
      title: 'Completion Rate',
      value: `${Math.round(completionRate)}%`,
      subtitle: `${usersComplete} of ${usersWithAgreements} completed`,
      icon: Target,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      title: 'Completed',
      value: usersComplete,
      subtitle: 'Users with approved agreements',
      icon: CheckCircle2,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    {
      title: 'In Progress',
      value: usersInProgress,
      subtitle: 'Users with pending agreements',
      icon: Clock,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
    },
    {
      title: 'Not Started',
      value: usersNotStarted,
      subtitle: 'Users without agreements',
      icon: AlertCircle,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
    },
  ]

  const secondaryCards = [
    {
      title: 'Total Users',
      value: totalUsers,
      subtitle: undefined,
      icon: Users,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
    },
    {
      title: 'Total Agreements',
      value: totalAgreements,
      subtitle: undefined,
      icon: FileText,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
    },
    {
      title: 'Approved',
      value: totalApproved,
      subtitle: undefined,
      icon: Award,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50',
    },
    {
      title: 'With Agreements',
      value: usersWithAgreements,
      subtitle: undefined,
      icon: TrendingUp,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
    },
  ]

  return (
    <div className="space-y-6">
      {/* Primary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {primaryCards.map((card) => {
          const Icon = card.icon
          return (
            <Card key={card.title}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  {card.title}
                </CardTitle>
                <div className={`p-2 rounded-lg ${card.bgColor}`}>
                  <Icon className={`h-5 w-5 ${card.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{card.value}</div>
                {card.subtitle && (
                  <p className="text-xs text-gray-500 mt-1">
                    {card.subtitle}
                  </p>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Secondary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {secondaryCards.map((card) => {
          const Icon = card.icon
          return (
            <Card key={card.title}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  {card.title}
                </CardTitle>
                <div className={`p-2 rounded-lg ${card.bgColor}`}>
                  <Icon className={`h-5 w-5 ${card.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{card.value}</div>
                {card.subtitle && (
                  <p className="text-xs text-gray-500 mt-1">
                    {card.subtitle}
                  </p>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
