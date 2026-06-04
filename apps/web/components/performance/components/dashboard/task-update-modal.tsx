'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Upload, Link as LinkIcon, Star } from 'lucide-react'

interface TaskUpdateModalProps {
  isOpen: boolean
  onClose: () => void
  task: {
    id: string
    title: string
    status: string
  }
}

export function TaskUpdateModal({ isOpen, onClose, task }: TaskUpdateModalProps) {
  const router = useRouter()
  const [status, setStatus] = useState(task.status)
  const [progressNotes, setProgressNotes] = useState('')
  const [rating, setRating] = useState(0)
  const [evidenceType, setEvidenceType] = useState<'file' | 'url'>('url')
  const [evidenceUrl, setEvidenceUrl] = useState('')
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null)
  const [evidenceNotes, setEvidenceNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const isCompleting = status === 'COMPLETED' && task.status !== 'COMPLETED'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    // Validation for completion
    if (isCompleting) {
      if (rating === 0) {
        setError('Please rate your work before marking as complete')
        return
      }
      if (!evidenceUrl && !evidenceFile) {
        setError('Please provide evidence (file or URL) before marking as complete')
        return
      }
    }

    setLoading(true)

    try {
      let uploadedEvidenceUrl = evidenceUrl

      // Upload file if provided
      if (evidenceFile) {
        const formData = new FormData()
        formData.append('file', evidenceFile)
        formData.append('taskId', task.id)

        const uploadRes = await fetch('/dashboard/performance/api/upload/evidence', {
          method: 'POST',
          body: formData,
        })

        if (!uploadRes.ok) {
          throw new Error('Failed to upload evidence file')
        }

        const uploadData = await uploadRes.json()
        uploadedEvidenceUrl = uploadData.url
      }

      // Update task status
      const updateData: any = {
        status,
        progressNotes,
      }

      if (isCompleting) {
        updateData.staffRating = rating
        updateData.evidenceUrl = uploadedEvidenceUrl
        updateData.evidenceNotes = evidenceNotes
        updateData.completedAt = new Date().toISOString()
        updateData.approvalStatus = 'SUBMITTED'
      }

      const res = await fetch(`/dashboard/performance/api/targets/${task.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to update task')
      }

      router.refresh()
      onClose()
    } catch (err: any) {
      setError(err.message || 'Failed to update task')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Update Task Status</DialogTitle>
          <DialogDescription>{task.title}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Status Selection */}
          <div className="space-y-2">
            <Label htmlFor="status">Task Status *</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="NOT_STARTED">Not Started</SelectItem>
                <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                <SelectItem value="COMPLETED">Completed</SelectItem>
                <SelectItem value="BLOCKED">Blocked</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-500">
              Update the current status of your task
            </p>
          </div>

          {/* Progress Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Progress Notes</Label>
            <Textarea
              id="notes"
              value={progressNotes}
              onChange={(e) => setProgressNotes(e.target.value)}
              placeholder="Add any notes about your progress..."
              rows={3}
            />
          </div>

          {/* Completion Section - Only show when marking as complete */}
          {isCompleting && (
            <div className="space-y-6 p-4 border-2 border-blue-200 rounded-lg bg-blue-50">
              <h3 className="font-semibold text-lg">Task Completion Details</h3>

              {/* Self Rating */}
              <div className="space-y-2">
                <Label>Rate Your Work *</Label>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      className="focus:outline-none transition-transform hover:scale-110"
                    >
                      <Star
                        className={`h-8 w-8 ${
                          star <= rating
                            ? 'fill-yellow-400 text-yellow-400'
                            : 'text-gray-300'
                        }`}
                      />
                    </button>
                  ))}
                  <span className="ml-2 text-sm text-gray-600">
                    {rating === 0 && 'Select a rating'}
                    {rating === 1 && '1 - Not done well'}
                    {rating === 2 && '2 - Below expectations'}
                    {rating === 3 && '3 - Met expectations'}
                    {rating === 4 && '4 - Above expectations'}
                    {rating === 5 && '5 - Exceptional work'}
                  </span>
                </div>
              </div>

              {/* Evidence Type Selection */}
              <div className="space-y-2">
                <Label>Evidence Type *</Label>
                <div className="flex gap-4">
                  <button
                    type="button"
                    onClick={() => setEvidenceType('url')}
                    className={`flex-1 p-4 border-2 rounded-lg transition-all ${
                      evidenceType === 'url'
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <LinkIcon className="h-6 w-6 mx-auto mb-2" />
                    <p className="font-medium">URL/Link</p>
                    <p className="text-xs text-gray-500">Link to online evidence</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setEvidenceType('file')}
                    className={`flex-1 p-4 border-2 rounded-lg transition-all ${
                      evidenceType === 'file'
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <Upload className="h-6 w-6 mx-auto mb-2" />
                    <p className="font-medium">Upload File</p>
                    <p className="text-xs text-gray-500">PDF, DOC, XLS, etc.</p>
                  </button>
                </div>
              </div>

              {/* Evidence URL */}
              {evidenceType === 'url' && (
                <div className="space-y-2">
                  <Label htmlFor="evidenceUrl">Evidence URL *</Label>
                  <Input
                    id="evidenceUrl"
                    type="url"
                    value={evidenceUrl}
                    onChange={(e) => setEvidenceUrl(e.target.value)}
                    placeholder="https://example.com/evidence"
                    required={isCompleting}
                  />
                  <p className="text-xs text-gray-500">
                    Provide a link to your evidence (Google Drive, SharePoint, etc.)
                  </p>
                </div>
              )}

              {/* Evidence File Upload */}
              {evidenceType === 'file' && (
                <div className="space-y-2">
                  <Label htmlFor="evidenceFile">Upload Evidence File *</Label>
                  <Input
                    id="evidenceFile"
                    type="file"
                    onChange={(e) => setEvidenceFile(e.target.files?.[0] || null)}
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.jpg,.jpeg,.png"
                    required={isCompleting && !evidenceFile}
                  />
                  <p className="text-xs text-gray-500">
                    Accepted: PDF, Word, Excel, PowerPoint, Images (Max 10MB)
                  </p>
                  {evidenceFile && (
                    <p className="text-sm text-green-600">
                      Selected: {evidenceFile.name} ({(evidenceFile.size / 1024 / 1024).toFixed(2)} MB)
                    </p>
                  )}
                </div>
              )}

              {/* Evidence Notes */}
              <div className="space-y-2">
                <Label htmlFor="evidenceNotes">Evidence Notes</Label>
                <Textarea
                  id="evidenceNotes"
                  value={evidenceNotes}
                  onChange={(e) => setEvidenceNotes(e.target.value)}
                  placeholder="Add any additional notes about the evidence..."
                  rows={3}
                />
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Updating...' : isCompleting ? 'Submit for Approval' : 'Update Status'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
