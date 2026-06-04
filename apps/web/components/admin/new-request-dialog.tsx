"use client"

import React, { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Car, Users, Coffee, Monitor } from "lucide-react"
import { apiClient } from "@/lib/api-client"

interface NewRequestDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

type RequestType = "REFRESHMENT" | "VEHICLE" | "BOARDROOM" | "IT_EQUIPMENT"

export function NewRequestDialog({ open, onOpenChange, onSuccess }: NewRequestDialogProps) {
  const [requestType, setRequestType] = useState("")
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!requestType) {
      toast({ title: "$1", variant: "destructive" })
      return
    }

    // Handle refreshment requests by closing this dialog
    // The refreshment form will be accessed separately
    if (requestType === "refreshments") {
      onOpenChange(false)
      // You can add a message here to guide the user
      toast({ title: "$1", variant: "destructive" })
      return
    }

    if (!title.trim() || !description.trim()) {
      toast({ title: "$1", variant: "destructive" })
      return
    }

    try {
      setIsSubmitting(true)
      
      const requestData = {
        type: requestType.toUpperCase(),
        title: title.trim(),
        description: description.trim()
      }
      
      console.log("Submitting request:", requestData)
      
      const response = await apiClient.post("/requests", requestData)
      
      console.log("Request submitted successfully:", response)
      toast({ title: "$1", variant: "destructive" })
      
      // Reset form
      setRequestType("")
      setTitle("")
      setDescription("")
      onOpenChange(false)
      onSuccess?.()
      
    } catch (error) {
      console.error("Failed to submit request:", error)
      const errorMessage = error instanceof Error ? error.message : "Failed to submit request"
      toast({ title: `$1`, variant: "destructive" })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border text-card-foreground max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-card-foreground">New Service Request</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Request a vehicle, room booking, or refreshments
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label className="text-foreground">Request Type</Label>
            <div className="grid grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => setRequestType("vehicle")}
                className={`p-4 rounded-lg border-2 transition-colors ${
                  requestType === "vehicle"
                    ? "border-primary bg-primary/10"
                    : "border-border bg-secondary hover:border-primary/50"
                }`}
              >
                <Car className="w-6 h-6 mx-auto mb-2 text-primary" />
                <div className="text-sm font-medium text-foreground">Vehicle</div>
              </button>
              <button
                type="button"
                onClick={() => setRequestType("room")}
                className={`p-4 rounded-lg border-2 transition-colors ${
                  requestType === "room"
                    ? "border-primary bg-primary/10"
                    : "border-border bg-secondary hover:border-primary/50"
                }`}
              >
                <Users className="w-6 h-6 mx-auto mb-2 text-primary" />
                <div className="text-sm font-medium text-foreground">Room</div>
              </button>
              <button
                type="button"
                onClick={() => setRequestType("refreshments")}
                className={`p-4 rounded-lg border-2 transition-colors ${
                  requestType === "refreshments"
                    ? "border-primary bg-primary/10"
                    : "border-border bg-secondary hover:border-primary/50"
                }`}
              >
                <Coffee className="w-6 h-6 mx-auto mb-2 text-primary" />
                <div className="text-sm font-medium text-foreground">Refreshments</div>
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="title" className="text-foreground">Request Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Brief description of your request"
              required={requestType !== "refreshments"}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description" className="text-foreground">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detailed description of your request"
              className="min-h-25"
              required={requestType !== "refreshments"}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!requestType || isSubmitting}>
              {isSubmitting ? "Submitting..." : (requestType === "refreshments" ? "Open Refreshment Form" : "Submit Request")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
