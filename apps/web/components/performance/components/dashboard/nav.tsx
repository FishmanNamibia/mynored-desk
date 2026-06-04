'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronRight, ChevronDown, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useState, useEffect, useMemo } from 'react'
import { colors, components, shadows } from '@/app/ui-standards'
import { modules as rbacModules } from '@/lib/rbac'

interface NavProps {
  user?: {
    name?: string
    email?: string
    role?: string
    profilePicture?: string | null
  }
  pmsRole?: string
  deadlineStats?: PersonalDeadlineStats | null
  isMobileOpen?: boolean
  onMobileClose?: () => void
}

interface PersonalDeadlineStats {
  performanceAgreements: { approaching: number; overdue: number }
  adhoc: { approaching: number; overdue: number }
  projects: { approaching: number; overdue: number }
  risk: { approaching: number; overdue: number }
  rating360: { approaching: number; overdue: number }
}

type SubMenuItem = {
  href: string
  label: string
  roles: string[]
}

type NavItem = {
  href?: string
  label: string
  roles: string[]
  submenu?: SubMenuItem[]
}

// PMS-specific nav items (shown when on /dashboard/performance/* routes)
const pmsNavItems: NavItem[] = [
  { href: '/dashboard/performance/dashboard/overview', label: 'Dashboard', roles: ['ADMIN', 'SG', 'DEPUTY_SG', 'EXECUTIVE', 'HUMAN_CAPITAL_EXECUTIVE', 'MANAGER', 'STAFF', 'ADMINISTRATIVE_ASSISTANT', 'VIEWER', 'OD_SPECIALIST', 'BOARD_MEMBER'] },
  {
    label: 'Performance Agreements',
    roles: ['ADMIN', 'SG', 'DEPUTY_SG', 'EXECUTIVE', 'HUMAN_CAPITAL_EXECUTIVE', 'MANAGER', 'STAFF', 'ADMINISTRATIVE_ASSISTANT', 'VIEWER', 'OD_SPECIALIST'],
    submenu: [
      { href: '/dashboard/performance/dashboard/my-tasks/performance', label: 'Individual', roles: ['ADMIN', 'SG', 'DEPUTY_SG', 'EXECUTIVE', 'HUMAN_CAPITAL_EXECUTIVE', 'MANAGER', 'STAFF', 'ADMINISTRATIVE_ASSISTANT', 'VIEWER', 'OD_SPECIALIST'] },
      { href: '/dashboard/performance/dashboard/approvals', label: 'Team', roles: ['ADMIN', 'SG', 'DEPUTY_SG', 'EXECUTIVE', 'HUMAN_CAPITAL_EXECUTIVE', 'MANAGER', 'STAFF', 'ADMINISTRATIVE_ASSISTANT', 'VIEWER', 'OD_SPECIALIST'] },
    ]
  },
  { href: '/dashboard/performance/dashboard/my-tasks', label: 'My Tasks', roles: ['ADMIN', 'SG', 'DEPUTY_SG', 'EXECUTIVE', 'HUMAN_CAPITAL_EXECUTIVE', 'MANAGER', 'STAFF', 'ADMINISTRATIVE_ASSISTANT', 'VIEWER', 'OD_SPECIALIST'] },
  { href: '/dashboard/performance/dashboard/goals', label: 'Task Management', roles: ['HUMAN_CAPITAL_EXECUTIVE', 'OD_SPECIALIST'] },
  // { 
  //   label: 'Reviews', 
  //   roles: ['ADMIN', 'SG', 'DEPUTY_SG', 'EXECUTIVE', 'HUMAN_CAPITAL_EXECUTIVE', 'MANAGER', 'STAFF', 'ADMINISTRATIVE_ASSISTANT', 'VIEWER', 'OD_SPECIALIST'],
  //   submenu: [
  //     { href: '/dashboard/performance/dashboard/performance-reviews', label: 'Individual Performance Review', roles: ['ADMIN', 'SG', 'DEPUTY_SG', 'EXECUTIVE', 'HUMAN_CAPITAL_EXECUTIVE', 'MANAGER', 'STAFF', 'ADMINISTRATIVE_ASSISTANT', 'VIEWER', 'OD_SPECIALIST'] },
  //     { href: '/dashboard/performance/dashboard/360-degree', label: '360 Degree Rating', roles: ['ADMIN', 'SG', 'DEPUTY_SG', 'EXECUTIVE', 'HUMAN_CAPITAL_EXECUTIVE', 'MANAGER', 'STAFF', 'ADMINISTRATIVE_ASSISTANT', 'VIEWER', 'OD_SPECIALIST'] },
  //   ]
  // },
  { 
    label: 'Reports', 
    roles: ['ADMIN', 'SG', 'DEPUTY_SG', 'EXECUTIVE', 'HUMAN_CAPITAL_EXECUTIVE', 'MANAGER', 'STAFF', 'ADMINISTRATIVE_ASSISTANT', 'VIEWER', 'BOARD_MEMBER', 'OD_SPECIALIST'],
    submenu: [
      { href: '/dashboard/performance/dashboard/reports', label: 'Performance Reports', roles: ['ADMIN', 'SG', 'DEPUTY_SG', 'EXECUTIVE', 'HUMAN_CAPITAL_EXECUTIVE', 'MANAGER', 'STAFF', 'ADMINISTRATIVE_ASSISTANT', 'VIEWER', 'BOARD_MEMBER', 'OD_SPECIALIST'] },
      { href: '/dashboard/performance/dashboard/reports/agreements', label: 'Download Agreements', roles: ['ADMIN', 'SG', 'DEPUTY_SG', 'EXECUTIVE', 'HUMAN_CAPITAL_EXECUTIVE', 'MANAGER', 'STAFF', 'ADMINISTRATIVE_ASSISTANT', 'VIEWER', 'BOARD_MEMBER', 'OD_SPECIALIST'] },
    ]
  },
  { href: '/dashboard/performance/dashboard/audit-logs', label: 'Audit Logs', roles: ['ADMIN'] },
  { href: '/dashboard/performance/dashboard/help-assistant-stats', label: 'Help Assistant Stats', roles: ['ADMIN'] },
  { href: '/dashboard/performance/dashboard/settings/performance-period', label: 'Performance Cycles', roles: ['ADMIN', 'SG', 'DEPUTY_SG', 'EXECUTIVE', 'HUMAN_CAPITAL_EXECUTIVE', 'MANAGER', 'STAFF', 'ADMINISTRATIVE_ASSISTANT', 'VIEWER', 'OD_SPECIALIST'] },
]

/**
 * Detect which module the user is currently viewing based on the pathname.
 * Returns { moduleName, moduleDescription, navItems } or null if on the dashboard home.
 */
function useCurrentModule(pathname: string, pmsRole?: string) {
  return useMemo(() => {
    // Performance Management module — use PMS-specific nav items
    if (pathname.startsWith('/dashboard/performance')) {
      const role = pmsRole || 'ADMIN'
      const filtered = pmsNavItems
        .filter(item => item.roles.includes(role))
        .map(item => {
          if (item.submenu) {
            const filteredSub = item.submenu.filter(s => s.roles.includes(role))
            if (filteredSub.length === 0) return null
            return { ...item, submenu: filteredSub }
          }
          return item
        })
        .filter(Boolean) as NavItem[]

      return {
        moduleName: 'Performance Management',
        moduleDescription: 'System',
        navItems: filtered,
        isPerformance: true,
      }
    }

    // Other modules — derive nav items from rbac.ts
    const currentModule = rbacModules.find(
      (m) => pathname.startsWith(m.href) && m.href !== '/dashboard',
    )

    if (!currentModule || !currentModule.subItems || currentModule.subItems.length === 0) {
      return null
    }

    const items: NavItem[] = currentModule.subItems.map(sub => ({
      href: sub.href,
      label: sub.name,
      roles: [],
    }))

    return {
      moduleName: currentModule.name,
      moduleDescription: currentModule.description,
      navItems: items,
      isPerformance: false,
    }
  }, [pathname, pmsRole])
}

export function DashboardNav({ user, pmsRole, deadlineStats: propDeadlineStats, isMobileOpen, onMobileClose }: NavProps) {
  const pathname = usePathname()
  const [expandedMenus, setExpandedMenus] = useState<string[]>([])
  const [deadlineStats, setDeadlineStats] = useState<PersonalDeadlineStats | null>(propDeadlineStats || null)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  const currentModule = useCurrentModule(pathname, pmsRole)

  useEffect(() => {
    if (propDeadlineStats) {
      setDeadlineStats(propDeadlineStats)
    }
  }, [propDeadlineStats])

  const toggleMenu = (label: string) => {
    setExpandedMenus(prev => 
      prev.includes(label) 
        ? prev.filter(item => item !== label)
        : [...prev, label]
    )
  }

  // Don't render sidebar on dashboard home or if no module detected
  if (!currentModule) {
    return null
  }

  const { moduleName, moduleDescription, navItems: filteredNavItems, isPerformance } = currentModule

  return (
    <>
      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-[60] lg:hidden"
          onClick={onMobileClose}
          style={{ top: '64px' }}
        />
      )}

      <aside 
        className={cn(
          "w-64 flex flex-col shrink-0 bg-card border-r border-border transition-transform duration-300 ease-in-out",
          "lg:relative lg:translate-x-0 lg:z-auto lg:top-0 lg:bottom-auto lg:left-auto",
          "fixed top-16 bottom-0 left-0 z-[70]",
          "h-[calc(100vh-4rem)] max-h-[calc(100vh-4rem)]",
          isMobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* Module Header */}
        <div 
          className="h-14 flex items-center px-4 justify-between"
          style={components.sidebarHeading}
        >
          <div className="flex-1 min-w-0">
            <div 
              className="font-semibold text-sm truncate"
              style={{ color: 'white' }}
            >
              {moduleName}
            </div>
            <div 
              className="text-xs truncate"
              style={{ color: 'rgba(255, 255, 255, 0.8)' }}
            >
              {moduleDescription}
            </div>
          </div>
          {/* Close button for mobile */}
          <button
            onClick={onMobileClose}
            className="lg:hidden p-1 hover:bg-white/10 rounded transition-colors"
            aria-label="Close sidebar"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto min-h-0">
          {filteredNavItems.map((item) => {
            const isExpanded = expandedMenus.includes(item.label)
            const hasSubmenu = !!item.submenu

            if (hasSubmenu) {
              return (
                <div key={item.label} className="space-y-1">
                  <button
                    onClick={() => toggleMenu(item.label)}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-all text-gray-600 hover:bg-gray-100"
                  >
                    <span>{item.label}</span>
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4" />
                    ) : (
                      <ChevronRight className="w-4 h-4" />
                    )}
                  </button>

                  {isExpanded && (
                    <div className="ml-4 pl-3 border-l border-border space-y-1">
                      {item.submenu!.map((subItem) => {
                        const isActive = pathname === subItem.href

                        return (
                          <Link key={subItem.href} href={subItem.href} onClick={onMobileClose}>
                            <div
                              className={cn(
                                'flex items-center justify-between px-3 py-1.5 rounded-lg text-sm transition-all',
                                !isActive && 'text-gray-600 hover:bg-gray-100'
                              )}
                              style={isActive ? components.sidebarActiveItem : {}}
                            >
                              <span>{subItem.label}</span>
                              {isActive && <ChevronRight className="w-4 h-4" />}
                            </div>
                          </Link>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            }

            // Regular menu item (no submenu)
            if (!item.href) return null
            const isActive = pathname === item.href

            return (
              <Link key={item.href} href={item.href} onClick={onMobileClose}>
                <div
                  className={cn(
                    'flex items-center justify-between px-3 py-2 rounded-lg transition-all text-sm group',
                    !isActive && 'text-gray-600 hover:bg-gray-100'
                  )}
                  style={isActive ? components.sidebarActiveItem : {}}
                >
                  <span>{item.label}</span>
                  {isActive && <ChevronRight className="w-4 h-4" />}
                </div>
              </Link>
            )
          })}
        </nav>

        {/* Personal Deadline Stats — only shown on performance pages */}
        {isPerformance && (
          <div className="px-2 py-2 space-y-1.5 border-t border-border shrink-0">
            <p className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: colors.gold }}>My Deadlines</p>
            <div className="space-y-1">
              <div 
                className="p-2 rounded-md cursor-pointer transition-colors bg-blue-50/60 border border-blue-100 hover:bg-blue-50"
                onClick={() => { setSelectedCategory('performance'); setIsDialogOpen(true) }}
              >
                <p className="text-[9px] text-muted-foreground mb-0.5">Performance Agr.</p>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-orange-600">{deadlineStats?.performanceAgreements.approaching || 0} approaching</span>
                  <span className="text-xs font-bold text-red-600">{deadlineStats?.performanceAgreements.overdue || 0} late</span>
                </div>
              </div>
              <div 
                className="p-2 rounded-md cursor-pointer transition-colors bg-green-50/60 border border-green-100 hover:bg-green-50"
                onClick={() => { setSelectedCategory('adhoc'); setIsDialogOpen(true) }}
              >
                <p className="text-[9px] text-muted-foreground mb-0.5">Ad-hoc Tasks</p>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-orange-600">{deadlineStats?.adhoc.approaching || 0} approaching</span>
                  <span className="text-xs font-bold text-red-600">{deadlineStats?.adhoc.overdue || 0} late</span>
                </div>
              </div>
              <div 
                className="p-2 rounded-md cursor-pointer transition-colors bg-purple-50/60 border border-purple-100 hover:bg-purple-50"
                onClick={() => { setSelectedCategory('projects'); setIsDialogOpen(true) }}
              >
                <p className="text-[9px] text-muted-foreground mb-0.5">Projects</p>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-orange-600">{deadlineStats?.projects.approaching || 0} approaching</span>
                  <span className="text-xs font-bold text-red-600">{deadlineStats?.projects.overdue || 0} late</span>
                </div>
              </div>
              <div 
                className="p-2 rounded-md cursor-pointer transition-colors bg-orange-50/60 border border-orange-100 hover:bg-orange-50"
                onClick={() => { setSelectedCategory('risk'); setIsDialogOpen(true) }}
              >
                <p className="text-[9px] text-muted-foreground mb-0.5">Risk Management</p>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-orange-600">{deadlineStats?.risk.approaching || 0} approaching</span>
                  <span className="text-xs font-bold text-red-600">{deadlineStats?.risk.overdue || 0} late</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Deadline Details Dialog — only on performance pages */}
        {isPerformance && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {selectedCategory === 'performance' && 'Performance Agreements'}
                  {selectedCategory === 'adhoc' && 'Ad-hoc Tasks'}
                  {selectedCategory === 'projects' && 'Projects'}
                  {selectedCategory === 'risk' && 'Risk Management'}
                </DialogTitle>
                <DialogDescription>
                  View all tasks approaching their deadline or overdue
                </DialogDescription>
              </DialogHeader>
              <DeadlineDetailsContent category={selectedCategory} userId={user?.email || ''} />
            </DialogContent>
          </Dialog>
        )}
      </aside>
    </>
  )
}

// Component to fetch and display detailed task information
function DeadlineDetailsContent({ category, userId }: { category: string | null; userId: string }) {
  const [tasks, setTasks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!category) return

    const fetchTasks = async () => {
      setLoading(true)
      try {
        const response = await fetch(`/dashboard/performance/api/user/deadline-details?category=${category}`)
        if (response.ok) {
          const data = await response.json()
          setTasks(data.tasks || [])
        }
      } catch (error) {
        console.error('Error fetching task details:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchTasks()
  }, [category])

  if (loading) {
    return <div className="text-center py-8 text-gray-500">Loading tasks...</div>
  }

  if (tasks.length === 0) {
    return <div className="text-center py-8 text-gray-500">No tasks found</div>
  }

  const now = new Date()
  const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

  const approachingTasks = tasks.filter(task => {
    const dueDate = new Date(task.dueDate)
    return dueDate > now && dueDate <= sevenDaysFromNow
  })

  const overdueTasks = tasks.filter(task => {
    const dueDate = new Date(task.dueDate)
    return dueDate < now
  })

  return (
    <div className="space-y-6">
      {/* Overdue Tasks */}
      {overdueTasks.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-red-600 mb-3 flex items-center gap-2">
            <span className="w-2 h-2 bg-red-600 rounded-full"></span>
            Overdue ({overdueTasks.length})
          </h3>
          <div className="space-y-2">
            {overdueTasks.map((task, index) => (
              <div key={index} className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <h4 className="font-medium text-sm text-gray-900">{task.title}</h4>
                {task.description && (
                  <p className="text-xs text-gray-600 mt-1">{task.description}</p>
                )}
                <div className="flex items-center justify-between mt-2">
                  <span className="text-xs text-gray-500">
                    Due: {new Date(task.dueDate).toLocaleDateString()}
                  </span>
                  <span className="text-xs font-semibold text-red-600">
                    {Math.floor((now.getTime() - new Date(task.dueDate).getTime()) / (1000 * 60 * 60 * 24))} days overdue
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Approaching Tasks */}
      {approachingTasks.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-orange-600 mb-3 flex items-center gap-2">
            <span className="w-2 h-2 bg-orange-600 rounded-full"></span>
            Approaching Deadline ({approachingTasks.length})
          </h3>
          <div className="space-y-2">
            {approachingTasks.map((task, index) => (
              <div key={index} className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                <h4 className="font-medium text-sm text-gray-900">{task.title}</h4>
                {task.description && (
                  <p className="text-xs text-gray-600 mt-1">{task.description}</p>
                )}
                <div className="flex items-center justify-between mt-2">
                  <span className="text-xs text-gray-500">
                    Due: {new Date(task.dueDate).toLocaleDateString()}
                  </span>
                  <span className="text-xs font-semibold text-orange-600">
                    {Math.floor((new Date(task.dueDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))} days left
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
