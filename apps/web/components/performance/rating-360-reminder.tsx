'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useSession } from '@/lib/pms-auth-adapter'
import { useRouter } from 'next/navigation'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Bell, Users, ArrowRight, Clock, CheckCircle2, Star } from 'lucide-react'

const INTERVAL_MS = 10 * 60 * 1000 // 10 minutes
const SNOOZE_KEY = 'rating360_snoozed_until'
const INITIAL_DELAY_MS = 4000 // 4 s after login

interface Assignment {
  id: string
  name: string
  jobTitle?: string
  department?: string
  raterType: string
  hasRated: boolean
}

const RATER_TYPE_LABELS: Record<string, { label: string; color: string }> = {
  supervisor:    { label: 'Direct Supervisor',              color: 'text-blue-700 bg-blue-50' },
  dept_random:   { label: 'Random Colleague (Same Dept)',   color: 'text-amber-700 bg-amber-50' },
  org_random:    { label: 'Random Employee (Org-wide)',     color: 'text-purple-700 bg-purple-50' },
  subordinate:   { label: 'Direct Report',                 color: 'text-green-700 bg-green-50' },
}

export function Rating360Reminder() {
  const { data: session } = useSession()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [pending, setPending] = useState<Assignment[]>([])
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const initialTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const checkAndShow = useCallback(async () => {
    // Respect snooze window
    const snoozedUntil = sessionStorage.getItem(SNOOZE_KEY)
    if (snoozedUntil && Date.now() < Number(snoozedUntil)) return

    try {
      const res = await fetch('/dashboard/performance/api/360-rating/my-assignments')
      if (!res.ok) return
      const assignments: Assignment[] = await res.json()
      const unrated = assignments.filter((a) => !a.hasRated)
      if (unrated.length > 0) {
        setPending(unrated)
        setOpen(true)
      }
    } catch {
      // silently ignore — network errors shouldn't break anything
    }
  }, [])

  useEffect(() => {
    if (!session?.user?.id) return

    // Show a few seconds after login
    initialTimerRef.current = setTimeout(checkAndShow, INITIAL_DELAY_MS)

    // Then every 10 minutes
    intervalRef.current = setInterval(checkAndShow, INTERVAL_MS)

    return () => {
      if (initialTimerRef.current) clearTimeout(initialTimerRef.current)
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [session?.user?.id, checkAndShow])

  const handleSnooze = () => {
    sessionStorage.setItem(SNOOZE_KEY, String(Date.now() + INTERVAL_MS))
    setOpen(false)
  }

  const handleGoRate = () => {
    sessionStorage.setItem(SNOOZE_KEY, String(Date.now() + INTERVAL_MS))
    setOpen(false)
    router.push('/dashboard/performance/my-tasks?tab=rating360')
  }

  if (!session?.user || pending.length === 0) return null

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleSnooze() }}>
      <DialogContent className="max-w-lg w-full" onPointerDownOutside={(e) => e.preventDefault()}>
        {/* Header */}
        <DialogHeader className="pb-2">
          <div className="flex items-center gap-3 mb-1">
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-amber-100 shrink-0">
              <Bell className="w-5 h-5 text-amber-600 animate-[wiggle_1s_ease-in-out_3]" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-gray-900">
                360° Rating Reminder
              </DialogTitle>
              <DialogDescription className="text-sm text-gray-500 mt-0.5">
                You have pending peer ratings that need your attention
              </DialogDescription>
            </div>
            <Badge className="ml-auto bg-red-100 text-red-700 border-red-200 font-bold text-base px-3 shrink-0">
              {pending.length} pending
            </Badge>
          </div>
        </DialogHeader>

        {/* Body */}
        <div className="space-y-4">
          {/* Info banner */}
          <div className="rounded-lg bg-blue-50 border border-blue-200 p-3 text-sm text-blue-900 flex gap-2">
            <Star className="w-4 h-4 mt-0.5 text-blue-500 shrink-0" />
            <span>
              As part of NSA&apos;s Behavioural Competency evaluation, you are required to rate the following
              colleagues across <strong>6 competencies</strong> (1 = Poor · 5 = Exceptional).
            </span>
          </div>

          {/* Pending list */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1">
              <Users className="w-3.5 h-3.5" /> People you still need to rate
            </p>
            <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
              {pending.map((a) => {
                const typeInfo = RATER_TYPE_LABELS[a.raterType] ?? { label: a.raterType, color: 'text-gray-700 bg-gray-50' }
                return (
                  <div
                    key={a.id + a.raterType}
                    className="flex items-center justify-between gap-3 p-2.5 rounded-lg border border-gray-100 bg-white hover:bg-gray-50 transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-sm text-gray-900 truncate">{a.name}</p>
                      {a.jobTitle && (
                        <p className="text-xs text-gray-500 truncate">{a.jobTitle}</p>
                      )}
                      <span className={`inline-block mt-1 text-xs font-medium px-2 py-0.5 rounded-full ${typeInfo.color}`}>
                        {typeInfo.label}
                      </span>
                    </div>
                    <CheckCircle2 className="w-4 h-4 text-gray-300 shrink-0" />
                  </div>
                )
              })}
            </div>
          </div>

          {/* How to find */}
          <div className="rounded-lg bg-gray-50 border border-gray-200 p-3 text-xs text-gray-700 space-y-1">
            <p className="font-semibold text-gray-800 mb-1">📍 How to complete your ratings:</p>
            <ol className="list-decimal list-inside space-y-0.5 pl-1">
              <li>Click <strong>&quot;Rate Others Now&quot;</strong> below — you&apos;ll be taken directly there.</li>
              <li>Or navigate to <strong>My Tasks</strong> → <strong>360° Rating</strong> tab → <strong>Rate Others</strong>.</li>
              <li>Select a person, rate all 6 competencies (1–5 stars), then submit.</li>
            </ol>
          </div>
        </div>

        {/* Footer */}
        <DialogFooter className="flex-col sm:flex-row gap-2 mt-2">
          <div className="flex items-center gap-1 text-xs text-gray-400 mr-auto">
            <Clock className="w-3 h-3" />
            <span>You&apos;ll be reminded again in 10 minutes</span>
          </div>
          <Button variant="outline" size="sm" onClick={handleSnooze} className="text-gray-600">
            Remind me later
          </Button>
          <Button size="sm" onClick={handleGoRate} className="bg-blue-700 hover:bg-blue-800 gap-1.5">
            Rate Others Now
            <ArrowRight className="w-4 h-4" />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
