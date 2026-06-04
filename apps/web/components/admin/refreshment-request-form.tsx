"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Package, Users, Coffee } from "lucide-react";

// Updated schema to match backend RefreshmentRequest structure
const refreshmentRequestSchema = z.object({
  mode: z.enum(["SINGLE_ITEM", "BULK_EVENT"]),
  // For SINGLE_ITEM mode
  refreshmentType: z.string().optional(),
  quantityRequested: z.number().min(1).optional(),
  // For BULK_EVENT mode
  attendeeCount: z.number().min(1).optional(),
  itemsDescription: z.string().optional(),
  eventType: z.string().optional(),
  eventDate: z.string().optional(),
  // REQUIRED: Purpose/motivation for approval decision
  purpose: z.string().min(1, "Purpose/motivation is required for approval"),
  notes: z.string().optional(),
  requiredDate: z.string().optional(),
});

// Refreshment options for single item mode
const refreshmentOptions = [
  { value: "Water", label: "Water" },
  { value: "Assorted Juice", label: "Assorted Juice" },
  { value: "Assorted Cooldrink", label: "Assorted Cooldrink" },
  { value: "Tea/Coffee", label: "Tea/Coffee" },
  { value: "Snacks", label: "Snacks" },
];

// Event type options for bulk mode
const eventTypeOptions = [
  { value: "Meeting", label: "Meeting" },
  { value: "Workshop", label: "Workshop" },
  { value: "Training", label: "Training" },
  { value: "Conference", label: "Conference" },
  { value: "Client Visit", label: "Client Visit" },
  { value: "Board Meeting", label: "Board Meeting" },
  { value: "Other", label: "Other" },
];

type RefreshmentRequestData = z.infer<typeof refreshmentRequestSchema>;

interface RefreshmentRequestFormProps {
  onSuccess?: () => void;
}

export function RefreshmentRequestForm({ onSuccess }: RefreshmentRequestFormProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notification, setNotification] = useState<{type: 'success' | 'error', message: string} | null>(null);
  
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm<RefreshmentRequestData>({
    resolver: zodResolver(refreshmentRequestSchema),
    defaultValues: {
      mode: "BULK_EVENT",
    }
  });

  const selectedMode = watch("mode");

  const onSubmit = async (data: RefreshmentRequestData) => {
    try {
      setIsSubmitting(true);
      setNotification(null);
      
      // Build the request payload matching backend structure
      const requestData = {
        type: "REFRESHMENT" as const,
        title: data.mode === "SINGLE_ITEM" 
          ? `${data.refreshmentType} Request` 
          : `${data.eventType || 'Event'} Refreshments`,
        description: data.mode === "SINGLE_ITEM"
          ? `Request for ${data.quantityRequested} x ${data.refreshmentType}`
          : data.itemsDescription,
        requiredDate: data.requiredDate || data.eventDate,
        priority: "NORMAL" as const,
        refreshmentDetails: {
          mode: data.mode,
          // For SINGLE_ITEM
          ...(data.mode === "SINGLE_ITEM" && {
            refreshmentId: data.refreshmentType, // Using type as ID for now
            quantityRequested: data.quantityRequested,
          }),
          // For BULK_EVENT
          ...(data.mode === "BULK_EVENT" && {
            attendeeCount: data.attendeeCount,
            itemsDescription: data.itemsDescription,
            eventType: data.eventType,
            eventDate: data.eventDate,
          }),
          // Common fields
          purpose: data.purpose,
          notes: data.notes,
        },
      };
      
      console.log("Submitting refreshment request:", requestData);
      
      const response = await fetch("/api/requests", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(requestData),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || errorData.message || `HTTP ${response.status}`);
      }
      
      const result = await response.json();
      console.log("Request submitted successfully:", result);
      
      setNotification({type: 'success', message: 'Refreshment request submitted successfully!'});
      
      setTimeout(() => {
        setIsOpen(false);
        reset();
        setNotification(null);
        onSuccess?.();
      }, 1500);
      
    } catch (error) {
      console.error("Failed to submit request:", error);
      setNotification({
        type: 'error', 
        message: error instanceof Error ? error.message : "Failed to submit request"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    reset();
    setNotification(null);
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="bg-[#ffb800] hover:bg-[#fbbf24] text-slate-900 font-medium transition-colors duration-200 shadow-md hover:shadow-lg">
          + New Refreshment Request
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-xl border-2 border-gray-100 shadow-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pb-4">
          <DialogTitle className="flex items-center gap-3 text-xl font-semibold text-gray-800">
            <div className="p-2 bg-green-100 rounded-lg">
              <Package className="w-6 h-6 text-green-600" />
            </div>
            Create Refreshment Request
          </DialogTitle>
        </DialogHeader>
        
        {notification && (
          <div className={`p-3 rounded-lg mb-4 ${
            notification.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}>
            {notification.message}
          </div>
        )}
        
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {/* Request Mode Selection */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700">Request Type *</Label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setValue("mode", "SINGLE_ITEM")}
                className={`p-4 rounded-lg border-2 transition-all ${
                  selectedMode === "SINGLE_ITEM"
                    ? "border-green-500 bg-green-50"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <Coffee className="w-6 h-6 mx-auto mb-2 text-green-600" />
                <div className="text-sm font-medium">Single Item</div>
                <div className="text-xs text-gray-500">Specific item & quantity</div>
              </button>
              <button
                type="button"
                onClick={() => setValue("mode", "BULK_EVENT")}
                className={`p-4 rounded-lg border-2 transition-all ${
                  selectedMode === "BULK_EVENT"
                    ? "border-green-500 bg-green-50"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <Users className="w-6 h-6 mx-auto mb-2 text-green-600" />
                <div className="text-sm font-medium">Event/Meeting</div>
                <div className="text-xs text-gray-500">For attendees at events</div>
              </button>
            </div>
          </div>

          {/* SINGLE_ITEM Mode Fields */}
          {selectedMode === "SINGLE_ITEM" && (
            <>
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">Refreshment Type *</Label>
                <Select onValueChange={(value) => setValue("refreshmentType", value)}>
                  <SelectTrigger className="h-11 border-2 border-gray-200 focus:border-green-500">
                    <SelectValue placeholder="Select refreshment item" />
                  </SelectTrigger>
                  <SelectContent>
                    {refreshmentOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">Quantity *</Label>
                <Input
                  type="number"
                  min="1"
                  placeholder="Enter quantity needed"
                  className="h-11 border-2 border-gray-200 focus:border-green-500"
                  {...register("quantityRequested", { valueAsNumber: true })}
                />
                {errors.quantityRequested && (
                  <p className="text-sm text-red-600">{errors.quantityRequested.message}</p>
                )}
              </div>
            </>
          )}

          {/* BULK_EVENT Mode Fields */}
          {selectedMode === "BULK_EVENT" && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">Event Type</Label>
                  <Select onValueChange={(value) => setValue("eventType", value)}>
                    <SelectTrigger className="h-11 border-2 border-gray-200 focus:border-green-500">
                      <SelectValue placeholder="Select event type" />
                    </SelectTrigger>
                    <SelectContent>
                      {eventTypeOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">Number of Attendees *</Label>
                  <Input
                    type="number"
                    min="1"
                    placeholder="e.g., 20"
                    className="h-11 border-2 border-gray-200 focus:border-green-500"
                    {...register("attendeeCount", { valueAsNumber: true })}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">Event Date</Label>
                <Input
                  type="datetime-local"
                  className="h-11 border-2 border-gray-200 focus:border-green-500"
                  {...register("eventDate")}
                />
              </div>
              
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">Items Needed</Label>
                <Textarea
                  placeholder="e.g., Tea, coffee, biscuits, bottled water, sandwiches..."
                  rows={2}
                  className="border-2 border-gray-200 focus:border-green-500"
                  {...register("itemsDescription")}
                />
              </div>
            </>
          )}

          {/* PURPOSE - REQUIRED for both modes */}
          <div className="space-y-2 bg-yellow-50 p-4 rounded-lg border border-yellow-200">
            <Label className="text-sm font-medium text-gray-700">
              Purpose / Motivation * 
              <span className="text-xs text-gray-500 ml-2">(Required for approval)</span>
            </Label>
            <Textarea
              placeholder="Why is this needed? e.g., Board meeting with external stakeholders, Training session for new employees..."
              rows={3}
              className="border-2 border-gray-200 focus:border-green-500 bg-white"
              {...register("purpose")}
            />
            {errors.purpose && (
              <p className="text-sm text-red-600">{errors.purpose.message}</p>
            )}
          </div>

          {/* Additional Notes */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700">Additional Notes</Label>
            <Textarea
              placeholder="Any special requirements or dietary restrictions..."
              rows={2}
              className="border-2 border-gray-200 focus:border-green-500"
              {...register("notes")}
            />
          </div>

          {/* Form Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <Button
              type="button"
              onClick={resetForm}
              disabled={isSubmitting}
              className="px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white border-0"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="px-8 py-2.5 bg-[#ffb800] hover:bg-[#fbbf24] disabled:bg-gray-300 text-slate-900 font-medium"
            >
              {isSubmitting ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-slate-900/20 border-t-slate-900 rounded-full animate-spin"></div>
                  Submitting...
                </div>
              ) : (
                "Submit Request"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}