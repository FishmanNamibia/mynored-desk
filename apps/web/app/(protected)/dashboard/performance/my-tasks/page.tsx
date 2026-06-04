'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ClipboardCheck, Zap, Briefcase, ShieldAlert, CheckSquare, Loader2, LayoutList, Users } from 'lucide-react'
import { GoldSpinner } from '@/components/ui/gold-spinner'
import ActionsPage from './actions/page'
import AdhocPage from './adhoc/page'
import RiskManagementPage from './risk-management/page'
import ProjectsPage from '@/app/(protected)/dashboard/performance/dashboard/projects/page'
import AuditTasksPage from './audit/page'
import Rating360Page from '@/app/(protected)/dashboard/performance/dashboard/360-degree/page'

interface TaskCategory {
  id: string
  name: string
  weight: number
}

// Map known category IDs to icons
function getCategoryIcon(categoryId: string) {
  switch (categoryId) {
    case 'perf': return <ClipboardCheck className="w-4 h-4" />
    case 'rating360': return <Users className="w-4 h-4" />
    case 'adhoc': return <Zap className="w-4 h-4" />
    case 'project': return <Briefcase className="w-4 h-4" />
    case 'risk': return <ShieldAlert className="w-4 h-4" />
    case 'audit': return <CheckSquare className="w-4 h-4" />
    default: return <LayoutList className="w-4 h-4" />
  }
}

// Map known category IDs to tab display names
function getCategoryTabName(category: TaskCategory): string {
  switch (category.id) {
    case 'perf': return 'Workplan Actions'
    case 'rating360': return '360° Rating'
    case 'adhoc': return 'Adhoc Tasks'
    case 'project': return 'Projects'
    case 'risk': return 'Risk Management'
    case 'audit': return 'Audit Tasks'
    default: return category.name
  }
}

// Always inject 360 Degree Rating tab right after the perf (Workplan Actions) tab
function injectRating360(cats: TaskCategory[]): TaskCategory[] {
  const result = [...cats]
  if (result.some((c) => c.id === 'rating360')) return result
  const perfIdx = result.findIndex((c) => c.id === 'perf')
  const insertAt = perfIdx >= 0 ? perfIdx + 1 : 0
  result.splice(insertAt, 0, { id: 'rating360', name: '360 Degree Rating', weight: 0 })
  return result
}

// Placeholder component for custom/dynamic categories that don't have a dedicated page
function GenericCategoryTab({ category }: { category: TaskCategory }) {
  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground leading-tight">{category.name}</h1>
          <p className="text-gray-500 mt-1">
            Weight allocation: {category.weight}% — Track and manage your {category.name.toLowerCase()}
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {getCategoryIcon(category.id)}
            {category.name}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <LayoutList className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-700 mb-2">No Items Yet</h3>
            <p className="text-gray-500 mb-4">
              Tasks for &quot;{category.name}&quot; will appear here once added.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default function MyTasksPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [categories, setCategories] = useState<TaskCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<string>('')

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await fetch('/dashboard/performance/api/user-task-weights', {
          credentials: 'include'
        })
        if (response.ok) {
          const data = await response.json()
          if (data.categories && Array.isArray(data.categories) && data.categories.length > 0) {
            // Ensure audit category always exists
            const cats = data.categories as TaskCategory[]
            const hasAudit = cats.some((c: TaskCategory) => c.id === 'audit' || c.name.toLowerCase().includes('audit'))
            if (!hasAudit) {
              cats.push({ id: 'audit', name: 'Audit Tasks', weight: 0 })
            }
            setCategories(injectRating360(cats))
            
            // Set initial tab based on URL parameter
            const tabParam = searchParams.get('tab')
            if (tabParam === 'projects') {
              setActiveTab('project')
            } else if (tabParam === 'rating360') {
              setActiveTab('rating360')
            } else {
              setActiveTab(cats[0]?.id || 'perf')
            }
          } else {
            // Fallback defaults if no categories saved
            const defaultCats = injectRating360([
              { id: 'perf', name: 'Performance Agreement Tasks', weight: 60 },
              { id: 'adhoc', name: 'Ad-Hoc', weight: 10 },
              { id: 'risk', name: 'Risk Tasks', weight: 10 },
              { id: 'project', name: 'Project Tasks', weight: 10 },
              { id: 'audit', name: 'Audit Tasks', weight: 10 }
            ])
            setCategories(defaultCats)
            
            // Set initial tab based on URL parameter
            const tabParam = searchParams.get('tab')
            if (tabParam === 'projects') {
              setActiveTab('project')
            } else if (tabParam === 'rating360') {
              setActiveTab('rating360')
            } else {
              setActiveTab(defaultCats[0]?.id || 'perf')
            }
          }
        }
      } catch (error) {
        console.warn('Failed to fetch task categories:', error)
        // Fallback defaults
        const defaultCats = injectRating360([
          { id: 'perf', name: 'Performance Agreement Tasks', weight: 60 },
          { id: 'adhoc', name: 'Ad-Hoc', weight: 10 },
          { id: 'risk', name: 'Risk Tasks', weight: 10 },
          { id: 'project', name: 'Project Tasks', weight: 10 },
          { id: 'audit', name: 'Audit Tasks', weight: 10 }
        ])
        setCategories(defaultCats)
        
        // Set initial tab based on URL parameter
        const tabParam = searchParams.get('tab')
        if (tabParam === 'projects') {
          setActiveTab('project')
        } else if (tabParam === 'rating360') {
          setActiveTab('rating360')
        } else {
          setActiveTab(defaultCats[0]?.id || 'perf')
        }
      } finally {
        setLoading(false)
      }
    }

    fetchCategories()
  }, [searchParams])

  // Render the content for a given category
  function renderCategoryContent(category: TaskCategory) {
    // Match by id first, then by name for categories saved before known IDs existed
    const id = category.id.toLowerCase()
    const name = category.name.toLowerCase()
    console.log('[MyTasks] Rendering category:', { id, name, category })
    if (id === 'perf') return <ActionsPage />
    if (id === 'rating360') return <Rating360Page />
    if (id === 'adhoc') return <AdhocPage />
    if (id === 'risk') return <RiskManagementPage />
    if (id === 'project') return <ProjectsPage />
    if (id === 'audit' || name.includes('audit')) {
      console.log('[MyTasks] Matched audit category, rendering AuditTasksPage')
      return <AuditTasksPage />
    }
    console.log('[MyTasks] No match, rendering GenericCategoryTab')
    return <GenericCategoryTab category={category} />
  }

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-75">
        <GoldSpinner size="md" message="Loading tasks..." />
      </div>
    )
  }

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-foreground leading-tight">My Tasks</h1>
        <p className="text-gray-500 mt-1">Manage your performance agreements, ad-hoc tasks, projects, and risks</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="flex w-full overflow-x-auto">
          {categories.map((category) => (
            <TabsTrigger key={category.id} value={category.id} className="flex items-center gap-2 flex-1 min-w-30">
              {getCategoryIcon(category.id)}
              {getCategoryTabName(category)}
            </TabsTrigger>
          ))}
        </TabsList>

        {categories.map((category) => (
          <TabsContent key={category.id} value={category.id} className="mt-0 -mx-8">
            {renderCategoryContent(category)}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  )
}
