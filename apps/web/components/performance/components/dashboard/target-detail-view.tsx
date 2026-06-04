'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Calendar, User, Building2, CheckCircle, Clock, AlertCircle, Edit, UserCog, FileText, ExternalLink } from 'lucide-react'
import { TaskUpdateModal } from './task-update-modal'
import { TaskReassignModal } from './task-reassign-modal'

interface Target {
  id: string
  title: string
  description: string | null
  status: string
  priority?: string
  dueDate: string | Date | null
  completedAt?: string | Date | null
  staffRating?: number | null
  evidenceUrl?: string | null
  evidenceNotes?: string | null
  approvalStatus?: string | null
  supervisorRating?: number | null
  rejectionReason?: string | null
  isAdhoc?: boolean
  initiative?: {
    id: string
    title: string
    objective: {
      id: string
      title: string
      goal: {
        id: string
        title: string
      }
    }
  } | null
  responsible?: {
    id: string
    name: string
    email: string
    role: string
    profilePicture?: string | null
    department?: {
      id: string
      name: string
    } | null
    division?: {
      id: string
      name: string
    } | null
  } | null
  approver?: {
    id: string
    name: string
    email: string
  } | null
  statusHistory: Array<{
    id: string
    newStatus: string
    createdAt: string | Date
    changedByUser: {
      id: string
      name: string
    }
  }>
}

interface TargetDetailViewProps {
  target: Target
  currentUser: {
    id: string
    name: string
    email: string
    role: string
  }
}

const statusColors = {
  NOT_STARTED: 'bg-red-500 text-white',
  IN_PROGRESS: 'bg-amber-500 text-white',
  COMPLETED: 'bg-green-500 text-white',
  OVERDUE: 'bg-red-700 text-white',
  BLOCKED: 'bg-red-700 text-white',
}

const priorityColors = {
  LOW: 'bg-gray-100 text-gray-800',
  MEDIUM: 'bg-yellow-100 text-yellow-800',
  HIGH: 'bg-orange-100 text-orange-800',
  CRITICAL: 'bg-red-100 text-red-800',
}

export function TargetDetailView({ target, currentUser }: TargetDetailViewProps) {
  const router = useRouter()
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false)
  const [isReassignModalOpen, setIsReassignModalOpen] = useState(false)

  // Check if current user is the responsible person
  const isResponsible = target.responsible?.id === currentUser.id
  
  // Check if user can reassign (not senior level)
  const seniorRoles = ['EXECUTIVE', 'DEPUTY_SG', 'SG', 'ADMIN']
  const canReassign = isResponsible && !seniorRoles.includes(currentUser.role) && target.status !== 'COMPLETED'

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-gray-900">{target.title}</h1>
          <div className="flex items-center gap-2 mt-2">
            <Badge className={statusColors[target.status as keyof typeof statusColors]}>
              {target.status.replace('_', ' ')}
            </Badge>
            {target.status === 'COMPLETED' && target.evidenceUrl && (
              <a
                href={target.evidenceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 px-3 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 hover:text-blue-900 rounded-md transition-colors border border-blue-200"
                title="View Evidence"
              >
                <FileText className="h-4 w-4" />
                <span className="text-sm font-medium">View Evidence</span>
                <ExternalLink className="h-3 w-3" />
              </a>
            )}
            {target.priority && (
              <Badge className={priorityColors[target.priority as keyof typeof priorityColors]}>
                {target.priority}
              </Badge>
            )}
          </div>
        </div>
        {isResponsible && target.status !== 'COMPLETED' && (
          <div className="flex gap-2">
            <Button onClick={() => setIsUpdateModalOpen(true)}>
              <Edit className="h-4 w-4 mr-2" />
              Update Status
            </Button>
            {canReassign && (
              <Button variant="outline" onClick={() => setIsReassignModalOpen(true)}>
                <UserCog className="h-4 w-4 mr-2" />
                Reassign
              </Button>
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Description */}
          <Card>
            <CardHeader>
              <CardTitle>Description</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700 whitespace-pre-wrap">{target.description}</p>
            </CardContent>
          </Card>

          {/* Hierarchy */}
          {target.initiative ? (
            <Card>
              <CardHeader>
                <CardTitle>Strategic Alignment</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-sm text-gray-500">Goal</p>
                  <p className="font-medium">{target.initiative.objective.goal.title}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Objective</p>
                  <p className="font-medium">{target.initiative.objective.title}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Initiative</p>
                  <p className="font-medium">{target.initiative.title}</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Task Type</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <Badge className="bg-purple-100 text-purple-800">Ad-hoc Task</Badge>
                  <p className="text-sm text-gray-600">This task is not aligned to a specific goal or initiative</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Completion Details */}
          {target.approvalStatus && (
            <Card>
              <CardHeader>
                <CardTitle>Completion Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-gray-500">Approval Status</p>
                  <Badge className={
                    target.approvalStatus === 'APPROVED' ? 'bg-green-500 text-white' :
                    target.approvalStatus === 'REJECTED' ? 'bg-red-500 text-white' :
                    target.approvalStatus === 'SUBMITTED' ? 'bg-blue-500 text-white' :
                    'bg-gray-500 text-white'
                  }>
                    {target.approvalStatus}
                  </Badge>
                </div>

                {target.staffRating && (
                  <div>
                    <p className="text-sm text-gray-500">Staff Rating</p>
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <span key={star} className={star <= target.staffRating! ? 'text-yellow-400' : 'text-gray-300'}>
                          ★
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {target.supervisorRating && (
                  <div>
                    <p className="text-sm text-gray-500">Supervisor Rating</p>
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <span key={star} className={star <= target.supervisorRating! ? 'text-yellow-400' : 'text-gray-300'}>
                          ★
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {target.evidenceUrl && (
                  <div>
                    <p className="text-sm text-gray-500 mb-2">Evidence Document</p>
                    <a 
                      href={target.evidenceUrl} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 hover:text-blue-900 rounded-lg transition-colors border border-blue-200"
                    >
                      <FileText className="h-5 w-5" />
                      <span className="font-medium">View Evidence Document</span>
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </div>
                )}

                {target.evidenceNotes && (
                  <div>
                    <p className="text-sm text-gray-500">Evidence Notes</p>
                    <p className="text-gray-700">{target.evidenceNotes}</p>
                  </div>
                )}

                {target.rejectionReason && (
                  <div>
                    <p className="text-sm text-gray-500">Rejection Reason</p>
                    <p className="text-red-700">{target.rejectionReason}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Status History */}
          <Card>
            <CardHeader>
              <CardTitle>Status History</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {target.statusHistory.map((history) => (
                  <div key={history.id} className="flex items-start gap-3 pb-3 border-b last:border-0">
                    <div className="flex-1">
                      <Badge className={statusColors[history.newStatus as keyof typeof statusColors]}>
                        {history.newStatus.replace('_', ' ')}
                      </Badge>
                      <p className="text-sm text-gray-600 mt-1">
                        Changed by {history.changedByUser.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(history.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Key Details */}
          <Card>
            <CardHeader>
              <CardTitle>Key Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-gray-500" />
                <div>
                  <p className="text-sm text-gray-500">Due Date</p>
                  <p className="font-medium">{target.dueDate ? new Date(target.dueDate).toLocaleDateString() : 'No due date'}</p>
                </div>
              </div>

              {target.completedAt && (
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <div>
                    <p className="text-sm text-gray-500">Completed</p>
                    <p className="font-medium">{new Date(target.completedAt).toLocaleDateString()}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Responsible Person */}
          {target.responsible && (
            <Card>
              <CardHeader>
                <CardTitle>Responsible</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-gray-500" />
                  <div>
                    <p className="font-medium">{target.responsible.name}</p>
                    <p className="text-sm text-gray-500">{target.responsible.email}</p>
                    <Badge variant="outline" className="mt-1">{target.responsible.role}</Badge>
                  </div>
                </div>

                {target.responsible.department && (
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-gray-500" />
                    <div>
                      <p className="text-sm text-gray-500">Department</p>
                      <p className="font-medium">{target.responsible.department.name}</p>
                    </div>
                  </div>
                )}

                {target.responsible.division && (
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-gray-500" />
                    <div>
                      <p className="text-sm text-gray-500">Division</p>
                      <p className="font-medium">{target.responsible.division.name}</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Approved By */}
          {target.approver && (
            <Card>
              <CardHeader>
                <CardTitle>Approved By</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <div>
                    <p className="font-medium">{target.approver.name}</p>
                    <p className="text-sm text-gray-500">{target.approver.email}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Update Modal */}
      {isResponsible && (
        <TaskUpdateModal
          isOpen={isUpdateModalOpen}
          onClose={() => setIsUpdateModalOpen(false)}
          task={{
            id: target.id,
            title: target.title,
            status: target.status,
          }}
        />
      )}

      {/* Reassign Modal */}
      {isResponsible && target.responsible && (
        <TaskReassignModal
          isOpen={isReassignModalOpen}
          onClose={() => setIsReassignModalOpen(false)}
          task={{
            id: target.id,
            title: target.title,
            responsible: {
              id: target.responsible.id,
              name: target.responsible.name,
              role: target.responsible.role,
            },
          }}
          currentUserRole={currentUser.role}
        />
      )}
    </div>
  )
}
