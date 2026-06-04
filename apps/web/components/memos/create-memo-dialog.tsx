"use client"

import type React from "react"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface CreateMemoDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CreateMemoDialog({ open, onOpenChange }: CreateMemoDialogProps) {
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [category, setCategory] = useState("")
  const [priority, setPriority] = useState("")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // Handle memo creation
    console.log({ title, description, category, priority })
    onOpenChange(false)
    // Reset form
    setTitle("")
    setDescription("")
    setCategory("")
    setPriority("")
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border text-card-foreground max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-card-foreground">Create New Memo</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Initiate a new digital memo for review and approval
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title" className="text-foreground">
              Memo Title
            </Label>
            <Input
              id="title"
              placeholder="Enter memo title..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="bg-input border-border text-foreground"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category" className="text-foreground">
                Category
              </Label>
              <Select value={category} onValueChange={setCategory} required>
                <SelectTrigger className="bg-input border-border text-foreground">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  <SelectItem value="security">Security</SelectItem>
                  <SelectItem value="finance">Finance</SelectItem>
                  <SelectItem value="hr">Human Resources</SelectItem>
                  <SelectItem value="it">IT & Technology</SelectItem>
                  <SelectItem value="operations">Operations</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="priority" className="text-foreground">
                Priority
              </Label>
              <Select value={priority} onValueChange={setPriority} required>
                <SelectTrigger className="bg-input border-border text-foreground">
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description" className="text-foreground">
              Memo Content
            </Label>
            <Textarea
              id="description"
              placeholder="Enter the memo content..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              rows={8}
              className="bg-input border-border text-foreground resize-none"
            />
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
              Create Memo
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
