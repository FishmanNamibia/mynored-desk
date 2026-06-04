'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useSession } from '@/lib/pms-auth-adapter'
import { TargetDetailView } from '@/components/performance/components/dashboard/target-detail-view'
import { Card, CardContent } from '@/components/ui/card'
import { GoldSpinner } from '@/components/ui/gold-spinner'

export default function TargetDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { data: session, status } = useSession()
  const [target, setTarget] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchTarget = async () => {
      if (!params?.id) return
      
      try {
        const response = await fetch(`/dashboard/performance/api/targets/${params.id}`)
        if (response.ok) {
          const data = await response.json()
          setTarget(data)
        } else {
          router.push('/dashboard/performance/dashboard/targets')
        }
      } catch (error) {
        console.error('Failed to fetch target:', error)
        router.push('/dashboard/performance/dashboard/targets')
      } finally {
        setLoading(false)
      }
    }

    if (status !== 'loading') {
      fetchTarget()
    }
  }, [params?.id, status, router])

  if (loading || status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card>
          <CardContent className="p-3 sm:p-4 lg:p-6">
            <GoldSpinner size="md" />
            <p className="text-center mt-4">Loading target details...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!target) {
    return null
  }

  if (!session?.user) return null

  return <TargetDetailView target={target} currentUser={session.user} />
}
