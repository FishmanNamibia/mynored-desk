'use client'

import { useEffect, useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ClipboardCheck, Zap, Briefcase, ShieldAlert, CheckSquare, Loader2, LayoutList, Users, GraduationCap } from 'lucide-react'
import { GoldSpinner } from '@/components/ui/gold-spinner'
import ActionsPage from './actions/page'
import AdhocPage from './adhoc/page'
import RiskManagementPage from './risk-management/page'
import ProjectsPage from '../projects/page'
import Rating360Page from '../360-degree/page'
import TrainingNeedsPage from './training-needs/page'

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
    case 'training-needs': return <GraduationCap className="w-4 h-4" />
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
    case 'training-needs': return 'Training Needs'
    case 'adhoc': return 'Adhoc Tasks'
    case 'project': return 'Projects'
    case 'risk': return 'Risk Management'
    default: return category.name
  }
}

// Short tab names for mobile screens
function getCategoryTabShortName(category: TaskCategory): string {
  switch (category.id) {
    case 'perf': return 'Workplan'
    case 'rating360': return '360°'
    case 'training-needs': return 'Training'
    case 'adhoc': return 'Adhoc'
    case 'project': return 'Projects'
    case 'risk': return 'Risk'
    case 'audit': return 'Audit'
    default: return category.name.split(' ')[0]
  }
}

// Map category IDs to tab value keys used by Tabs component
function getCategoryTabValue(category: TaskCategory): string {
  switch (category.id) {
    case 'perf': return 'actions'
    default: return category.id
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

// Always inject Training Needs tab after the 360 Degree Rating tab
function injectTrainingNeeds(cats: TaskCategory[]): TaskCategory[] {
  const result = [...cats]
  if (result.some((c) => c.id === 'training-needs')) return result
  const rating360Idx = result.findIndex((c) => c.id === 'rating360')
  const insertAt = rating360Idx >= 0 ? rating360Idx + 1 : 0
  result.splice(insertAt, 0, { id: 'training-needs', name: 'Training Needs', weight: 0 })
  return result
}

// Placeholder component for custom/dynamic categories that don't have a dedicated page
function GenericCategoryTab({ category }: { category: TaskCategory }) {
  return (
    <div className="p-3 sm:p-4 lg:p-6 space-y-3 sm:space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground leading-tight">{category.name}</h1>
          <p className="text-xs sm:text-sm text-gray-500 leading-tight">
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
  const [categories, setCategories] = useState<TaskCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [activeFilter, setActiveFilter] = useState<'all' | 'rejected' | 'altered' | 'accepted'>('all')

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await fetch('/dashboard/performance/api/user-task-weights', {
          credentials: 'include'
        })
        if (response.ok) {
          const data = await response.json()
          if (data.categories && Array.isArray(data.categories) && data.categories.length > 0) {
            setCategories(injectTrainingNeeds(injectRating360(data.categories)))
          } else {
            console.warn('[MyTasks] Failed to fetch categories, status:', response.status)
            setCategories(injectTrainingNeeds(injectRating360([
              { id: 'perf', name: 'Performance Agreement Tasks', weight: 60 },
              { id: 'adhoc', name: 'Ad-Hoc', weight: 10 },
              { id: 'risk', name: 'Risk Tasks', weight: 10 },
              { id: 'project', name: 'Project Tasks', weight: 10 },
              { id: 'audit', name: 'Audit Tasks', weight: 10 }
            ])))
          }
        } else {
          console.warn('[MyTasks] Failed to fetch categories, status:', response.status)
          setCategories(injectTrainingNeeds(injectRating360([
            { id: 'perf', name: 'Performance Agreement Tasks', weight: 60 },
            { id: 'adhoc', name: 'Ad-Hoc', weight: 10 },
            { id: 'risk', name: 'Risk Tasks', weight: 10 },
            { id: 'project', name: 'Project Tasks', weight: 10 },
            { id: 'audit', name: 'Audit Tasks', weight: 10 }
          ])))
        }
      } catch (error) {
        console.warn('[MyTasks] Failed to fetch task categories:', error)
        setCategories(injectTrainingNeeds(injectRating360([
          { id: 'perf', name: 'Performance Agreement Tasks', weight: 60 },
          { id: 'adhoc', name: 'Ad-Hoc', weight: 10 },
          { id: 'risk', name: 'Risk Tasks', weight: 10 },
          { id: 'project', name: 'Project Tasks', weight: 10 },
          { id: 'audit', name: 'Audit Tasks', weight: 10 }
        ])))
      } finally {
        setLoading(false)
      }
    }

    fetchCategories()
  }, [])

  // Render the content for a given category
  function renderCategoryContent(category: TaskCategory) {
    switch (category.id) {
      case 'perf':
        return <ActionsPage filter={activeFilter} onFilterChange={setActiveFilter} />
      case 'rating360':
        return <Rating360Page />
      case 'training-needs':
        return <TrainingNeedsPage />
      case 'adhoc':
        return <AdhocPage />
      case 'risk':
        return <RiskManagementPage />
      case 'project':
        return <ProjectsPage />
      default:
        return <GenericCategoryTab category={category} />
    }
  }

  if (loading) {
    return (
      <div className="p-3 sm:p-4 lg:p-6 flex items-center justify-center min-h-75">
        <GoldSpinner size="md" message="Loading tasks..." />
      </div>
    )
  }

  const defaultTab = getCategoryTabValue(categories[0] || { id: 'perf', name: '', weight: 0 })

  return (
    <div className="p-3 sm:p-4 lg:p-6 space-y-3 sm:space-y-4">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-foreground leading-tight">My Tasks</h1>
        <p className="text-xs sm:text-sm text-gray-500 leading-tight">Manage your performance agreements, ad-hoc tasks, projects, and risks</p>
      </div>

      <Tabs defaultValue={defaultTab} className="w-full">
        <TabsList className="flex w-full overflow-x-auto">
          {categories.map((category) => (
            <TabsTrigger key={category.id} value={getCategoryTabValue(category)} className="flex items-center gap-1.5 shrink-0 whitespace-nowrap px-2 sm:px-4 text-xs sm:text-sm">
              {getCategoryIcon(category.id)}
              <span className="sm:hidden">{getCategoryTabShortName(category)}</span>
              <span className="hidden sm:inline">{getCategoryTabName(category)}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        {categories.map((category) => (
          <TabsContent key={category.id} value={getCategoryTabValue(category)} className="mt-0 -mx-3 sm:-mx-4 lg:-mx-6">
            {renderCategoryContent(category)}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  )
}
