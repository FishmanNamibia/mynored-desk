'use client'

import { useEffect, useState } from 'react'
import { useSession } from '@/lib/pms-auth-adapter'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Slider } from '@/components/ui/slider'
import { Settings, Save, AlertCircle, CheckCircle2, Info, Lock } from 'lucide-react'

export default function WeightThresholdsPage() {
  const { data: session } = useSession()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [canManage, setCanManage] = useState(false)
  const [checkingAccess, setCheckingAccess] = useState(true)
  const [isLocked, setIsLocked] = useState(false)
  const [approvedCount, setApprovedCount] = useState(0)
  
  const [weights, setWeights] = useState({
    adhoc: 10,
    projects: 10,
    riskManagement: 10,
    rating360: 10
  })
  
  const [originalWeights, setOriginalWeights] = useState(weights)
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info', text: string } | null>(null)

  // Calculate performance agreement weight
  const performanceAgreementWeight = 100 - (weights.adhoc + weights.projects + weights.riskManagement + weights.rating360)
  const totalReserved = weights.adhoc + weights.projects + weights.riskManagement + weights.rating360

  useEffect(() => {
    checkAccess()
    fetchWeights()
  }, [])

  const checkAccess = async () => {
    try {
      if (!session?.user?.id) return

      const isAdmin = session.user.role === 'ADMIN'
      
      if (isAdmin) {
        setCanManage(true)
        setCheckingAccess(false)
        return
      }

      if (session.user.role === 'EXECUTIVE' && session.user.departmentId) {
        const deptRes = await fetch(`/dashboard/performance/api/departments/${session.user.departmentId}`)
        if (deptRes.ok) {
          const dept = await deptRes.json()
          const deptName = dept.name?.toLowerCase() || ''
          const isHC = deptName.includes('human capital') || 
                       deptName.includes('human resources') || 
                       deptName.includes('hr')
          setCanManage(isHC)
        }
      }
    } catch (error) {
      console.error('Error checking access:', error)
    } finally {
      setCheckingAccess(false)
    }
  }

  const fetchWeights = async () => {
    try {
      const response = await fetch('/dashboard/performance/api/performance-period/weights')
      if (response.ok) {
        const data = await response.json()
        const newWeights = {
          adhoc: data.weights.adhoc,
          projects: data.weights.projects,
          riskManagement: data.weights.riskManagement,
          rating360: data.weights.rating360
        }
        setWeights(newWeights)
        setOriginalWeights(newWeights)
        setIsLocked(data.isLocked || false)
        setApprovedCount(data.approvedAgreementsCount || 0)
      }
    } catch (error) {
      console.error('Error fetching weights:', error)
      setMessage({ type: 'error', text: 'Failed to load weight thresholds' })
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      setMessage(null)

      // Validate
      if (performanceAgreementWeight <= 0) {
        setMessage({ 
          type: 'error', 
          text: `Total reserved weight (${totalReserved}%) exceeds 100%. Performance Agreement must have at least 1%.` 
        })
        return
      }

      const response = await fetch('/dashboard/performance/api/performance-period/weights', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(weights)
      })

      const data = await response.json()

      if (response.ok) {
        setMessage({ type: 'success', text: 'Weight thresholds updated successfully!' })
        setOriginalWeights(weights)
      } else {
        if (data.isLocked) {
          setIsLocked(true)
          setApprovedCount(data.approvedCount || 0)
        }
        setMessage({ type: 'error', text: data.error || 'Failed to update weights' })
      }
    } catch (error) {
      console.error('Error saving weights:', error)
      setMessage({ type: 'error', text: 'An error occurred while saving' })
    } finally {
      setSaving(false)
    }
  }

  const handleReset = () => {
    setWeights(originalWeights)
    setMessage(null)
  }

  const hasChanges = JSON.stringify(weights) !== JSON.stringify(originalWeights)

  if (checkingAccess || loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <p className="text-gray-500">Loading...</p>
        </div>
      </div>
    )
  }

  if (!canManage) {
    return (
      <div className="p-6">
        <Alert className="border-blue-200 bg-blue-50">
          <Info className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-900">
            Only Human Capital Executive and Admin can manage weight thresholds.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-foreground leading-tight flex items-center gap-2">
          <Settings className="w-8 h-8" />
          Performance Weight Thresholds
        </h1>
        <p className="text-gray-600 mt-2">
          Configure the weight allocation for performance rating components
        </p>
      </div>

      {isLocked && (
        <Alert className="border-amber-200 bg-amber-50">
          <Lock className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-900">
            <strong>Weight thresholds are locked.</strong> {approvedCount} performance agreement(s) have been approved and signed. 
            Weight thresholds cannot be modified once agreements are approved to ensure fairness and consistency.
          </AlertDescription>
        </Alert>
      )}

      {message && (
        <Alert className={
          message.type === 'success' ? 'border-green-200 bg-green-50' :
          message.type === 'error' ? 'border-red-200 bg-red-50' :
          'border-blue-200 bg-blue-50'
        }>
          {message.type === 'success' ? <CheckCircle2 className="h-4 w-4 text-green-600" /> :
           message.type === 'error' ? <AlertCircle className="h-4 w-4 text-red-600" /> :
           <Info className="h-4 w-4 text-blue-600" />}
          <AlertDescription className={
            message.type === 'success' ? 'text-green-900' :
            message.type === 'error' ? 'text-red-900' :
            'text-blue-900'
          }>
            {message.text}
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Weight Distribution
            {isLocked && <Lock className="w-5 h-5 text-amber-600" />}
          </CardTitle>
          <CardDescription>
            {isLocked 
              ? 'Weight thresholds are locked because performance agreements have been approved.'
              : 'Adjust the percentage weight for each performance component. Performance Agreement weight is calculated automatically.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Performance Agreement (Auto-calculated) */}
          <div className="p-4 bg-blue-50 rounded-lg border-2 border-blue-200">
            <div className="flex items-center justify-between mb-2">
              <Label className="text-lg font-semibold text-blue-900">Performance Agreement</Label>
              <div className="text-3xl font-bold text-blue-900">{performanceAgreementWeight}%</div>
            </div>
            <p className="text-sm text-blue-700">
              Automatically calculated as: 100% - (Ad-hoc + Projects + Risk + 360°)
            </p>
          </div>

          {/* Ad-hoc Tasks */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="adhoc" className="text-base font-medium">Ad-hoc Tasks</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="adhoc"
                  type="number"
                  min="0"
                  max="100"
                  value={weights.adhoc}
                  onChange={(e) => setWeights({ ...weights, adhoc: parseInt(e.target.value) || 0 })}
                  className="w-20 text-center"
                  disabled={isLocked || !canManage}
                />
                <span className="text-lg font-semibold">%</span>
              </div>
            </div>
            <Slider
              value={[weights.adhoc]}
              onValueChange={([value]) => setWeights({ ...weights, adhoc: value })}
              max={100}
              step={1}
              disabled={isLocked || !canManage}
            />
          </div>

          {/* Projects */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="projects" className="text-base font-medium">Projects</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="projects"
                  type="number"
                  min="0"
                  max="100"
                  value={weights.projects}
                  onChange={(e) => setWeights({ ...weights, projects: parseInt(e.target.value) || 0 })}
                  className="w-20 text-center"
                  disabled={isLocked || !canManage}
                />
                <span className="text-lg font-semibold">%</span>
              </div>
            </div>
            <Slider
              value={[weights.projects]}
              onValueChange={([value]) => setWeights({ ...weights, projects: value })}
              max={100}
              step={1}
              disabled={isLocked || !canManage}
            />
          </div>

          {/* Risk Management */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="riskManagement" className="text-base font-medium">Risk Management</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="riskManagement"
                  type="number"
                  min="0"
                  max="100"
                  value={weights.riskManagement}
                  onChange={(e) => setWeights({ ...weights, riskManagement: parseInt(e.target.value) || 0 })}
                  className="w-20 text-center"
                  disabled={isLocked || !canManage}
                />
                <span className="text-lg font-semibold">%</span>
              </div>
            </div>
            <Slider
              value={[weights.riskManagement]}
              onValueChange={([value]) => setWeights({ ...weights, riskManagement: value })}
              max={100}
              step={1}
              disabled={isLocked || !canManage}
            />
          </div>

          {/* 360-Degree */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="rating360" className="text-base font-medium">360-Degree Rating</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="rating360"
                  type="number"
                  min="0"
                  max="100"
                  value={weights.rating360}
                  onChange={(e) => setWeights({ ...weights, rating360: parseInt(e.target.value) || 0 })}
                  className="w-20 text-center"
                  disabled={isLocked || !canManage}
                />
                <span className="text-lg font-semibold">%</span>
              </div>
            </div>
            <Slider
              value={[weights.rating360]}
              onValueChange={([value]) => setWeights({ ...weights, rating360: value })}
              max={100}
              step={1}
              disabled={isLocked || !canManage}
            />
          </div>

          {/* Total Summary */}
          <div className="pt-4 border-t">
            <div className="flex items-center justify-between text-lg font-semibold">
              <span>Total Allocated:</span>
              <span className={totalReserved > 100 ? 'text-red-600' : 'text-gray-900'}>
                {totalReserved}% / 100%
              </span>
            </div>
            {totalReserved >= 100 && !isLocked && (
              <p className="text-sm text-red-600 mt-2">
                ⚠️ Total exceeds 100%. Please reduce some weights.
              </p>
            )}
            {performanceAgreementWeight < 10 && performanceAgreementWeight > 0 && !isLocked && (
              <p className="text-sm text-yellow-600 mt-2">
                ⚠️ Performance Agreement weight is very low ({performanceAgreementWeight}%). Consider reducing other weights.
              </p>
            )}
          </div>

          {/* Action Buttons */}
          {!isLocked && (
            <div className="flex gap-3 pt-4">
              <Button
                onClick={handleSave}
                disabled={!hasChanges || saving || performanceAgreementWeight <= 0}
                className="flex-1"
              >
                <Save className="w-4 h-4 mr-2" />
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
              <Button
                onClick={handleReset}
                variant="outline"
                disabled={!hasChanges || saving}
              >
                Reset
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
