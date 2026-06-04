"use client"

import type React from "react"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface NewReviewDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function NewReviewDialog({ open, onOpenChange }: NewReviewDialogProps) {
  const [employee, setEmployee] = useState("")
  const [reviewType, setReviewType] = useState("")
  const [period, setPeriod] = useState("")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // Handle review creation
    console.log({ employee, reviewType, period })
    onOpenChange(false)
    // Reset form
    setEmployee("")
    setReviewType("")
    setPeriod("")
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border text-card-foreground max-w-md">
        <DialogHeader>
          <DialogTitle className="text-card-foreground">Start New Review</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Create a new performance review or 360 feedback
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="employee" className="text-foreground">
              Employee
            </Label>
            <Select value={employee} onValueChange={setEmployee} required>
              <SelectTrigger className="bg-input border-border text-foreground">
                <SelectValue placeholder="Select employee" />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border">
                <SelectItem value="sarah">Sarah Chen</SelectItem>
                <SelectItem value="michael">Michael Rodriguez</SelectItem>
                <SelectItem value="emily">Emily Watson</SelectItem>
                <SelectItem value="david">David Kim</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reviewType" className="text-foreground">
              Review Type
            </Label>
            <Select value={reviewType} onValueChange={setReviewType} required>
              <SelectTrigger className="bg-input border-border text-foreground">
                <SelectValue placeholder="Select review type" />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border">
                <SelectItem value="quarterly">Quarterly Review</SelectItem>
                <SelectItem value="annual">Annual Review</SelectItem>
                <SelectItem value="360">360 Feedback</SelectItem>
                <SelectItem value="probation">Probation Review</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="period" className="text-foreground">
              Review Period
            </Label>
            <Select value={period} onValueChange={setPeriod} required>
              <SelectTrigger className="bg-input border-border text-foreground">
                <SelectValue placeholder="Select period" />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border">
                <SelectItem value="q1-2026">Q1 2026</SelectItem>
                <SelectItem value="q4-2025">Q4 2025</SelectItem>
                <SelectItem value="annual-2025">Annual 2025</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="bg-transparent border-border text-foreground hover:bg-secondary"
            >
              Cancel
            </Button>
            <Button type="submit" className="bg-primary text-primary-foreground">
              Start Review
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
