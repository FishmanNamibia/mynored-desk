"use client";

import { toast } from "@/hooks/use-toast";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Badge } from "@/components/ui/badge";
import { CalendarDays, Package, Car, Monitor, Building } from "lucide-react";
import { apiClient } from "@/lib/api-client";

const requestSchema = z.object({
  type: z.enum(["REFRESHMENT", "BOARDROOM", "VEHICLE", "IT_EQUIPMENT"]),
  title: z.string().optional(), // Make title optional for all types
  description: z.string().optional(),
  requiredDate: z.string().optional(),
  quantity: z.number().min(1, "Quantity must be at least 1").optional(),
  priority: z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]).default("NORMAL").optional(),
});

// Refreshment options
const refreshmentOptions = [
  { value: "Water", label: "Water" },
  { value: "Assorted Juice", label: "Assorted Juice" },
  { value: "Assorted Cooldrink", label: "Assorted Cooldrink" },
  { value: "Snacks", label: "Snacks" },
  { value: "Sweets", label: "Sweets" },
  { value: "Request for Platters", label: "Request for Platters" },
];

// Snacks options
const snacksOptions = [
  { value: "chips", label: "Chips" },
  { value: "cookies", label: "Cookies" },
  { value: "peanuts", label: "Peanuts" },
  { value: "biscuits", label: "Biscuits" },
  { value: "crackers", label: "Crackers" },
  { value: "nuts_mix", label: "Mixed Nuts" },
];

// Specific schemas for each request type
const refreshmentRequestSchema = z.object({
  refreshmentId: z.string().min(1, "Please select a refreshment item"),
  quantityRequested: z.number().min(1, "Quantity must be at least 1"),
  purpose: z.string().optional(),
});

const boardroomRequestSchema = z.object({
  boardroomId: z.string().min(1, "Please select a boardroom"),
  startTime: z.string().min(1, "Start time is required"),
  endTime: z.string().min(1, "End time is required"),
  purpose: z.string().min(3, "Purpose is required"),
  attendees: z.number().min(1, "Number of attendees is required"),
});

const vehicleRequestSchema = z.object({
  vehicleId: z.string().optional(),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().min(1, "End date is required"),
  destination: z.string().min(3, "Destination is required"),
  purpose: z.string().min(3, "Purpose is required"),
});

const itEquipmentRequestSchema = z.object({
  equipmentId: z.string().optional(),
  quantityRequested: z.number().min(1, "Quantity must be at least 1"),
  purpose: z.string().optional(),
  returnDate: z.string().optional(),
});

type RequestFormData = z.infer<typeof requestSchema>;

interface NewRequestFormProps {
  onSuccess?: () => void;
}

export function NewRequestForm({ onSuccess }: NewRequestFormProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedRefreshments, setSelectedRefreshments] = useState<string[]>([]);
  const [selectedSnacks, setSelectedSnacks] = useState<string[]>([]);
  
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm<RequestFormData>({
    resolver: zodResolver(requestSchema),
  });

  const requestType = watch("type");

  const requestTypes = [
    {
      value: "REFRESHMENT",
      label: "Refreshments",
      description: "Request tea, coffee, snacks, or catering",
      icon: Package,
      color: "bg-green-500",
    },
    {
      value: "BOARDROOM",
      label: "Boardroom",
      description: "Book meeting rooms and conference spaces",
      icon: Building,
      color: "bg-blue-500",
    },
    {
      value: "VEHICLE",
      label: "Vehicle",
      description: "Request company vehicles for business use",
      icon: Car,
      color: "bg-orange-500",
    },
    {
      value: "IT_EQUIPMENT",
      label: "IT Equipment",
      description: "Request laptops, monitors, and other IT gear",
      icon: Monitor,
      color: "bg-purple-500",
    },
  ];

  const onSubmit = async (data: RequestFormData) => {
    console.log("Form submission started...", { data, selectedType, selectedRefreshments, selectedSnacks });
    
    try {
      setIsSubmitting(true);
      
      // Custom validation for refreshment requests
      if (selectedType === "REFRESHMENT" && selectedRefreshments.length === 0) {
        toast({ title: "$1", variant: "destructive" });
        console.log("Validation failed: No refreshments selected");
        return;
      }
      
      // Prepare the request data
      const requestData = {
        ...data,
        type: selectedType, // Ensure type is set from selected type
        title: selectedType === "REFRESHMENT" ? selectedRefreshments.join(", ") : data.title || `${selectedType} Request`,
        refreshmentDetails: selectedType === "REFRESHMENT" ? {
          items: selectedRefreshments,
          snacks: selectedRefreshments.includes("Snacks") ? selectedSnacks : []
        } : undefined
      };
      
      console.log("Submitting request data:", requestData);
      
      // Create the request
      const response = await apiClient.post("/requests", requestData);
      
      // Success feedback
      if (response && (response as any).data) {
        console.log("Request created successfully:", (response as any).data);
        toast({ title: "$1", variant: "destructive" });
      }
      
      setIsOpen(false);
      reset();
      setSelectedType("");
      setSelectedRefreshments([]);
      setSelectedSnacks([]);
      onSuccess?.();
    } catch (error) {
      console.error("Failed to create request:", error);
      const errorMessage = error instanceof Error ? error.message : 'Please try again.';
      toast({ title: `$1`, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTypeSelect = (type: string) => {
    setSelectedType(type);
    setValue("type", type as any);
  };

  const resetForm = () => {
    reset();
    setSelectedType("");
    setSelectedRefreshments([]);
    setSelectedSnacks([]);
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="bg-[#ffb800] hover:bg-[#fbbf24] text-slate-900">
          + New Request
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-5xl w-full h-[70vh] bg-white border-0 shadow-2xl overflow-hidden">
        <DialogHeader className="pb-4 px-6 pt-6 border-b border-gray-100">
          <DialogTitle className="flex items-center gap-2 text-xl font-semibold text-gray-800">
            <CalendarDays className="w-6 h-6 text-[#ffb800]" />
            Create New Request
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Request Type Selection */}
            {!selectedType && (
              <div className="space-y-4">
                <Label className="text-sm font-medium">Select Request Type</Label>
                <div className="grid grid-cols-2 gap-4">
                  {requestTypes.map((type) => {
                    const Icon = type.icon;
                    return (
                      <Card
                        key={type.value}
                        className="cursor-pointer hover:border-[#ffb800] hover:shadow-md transition-all duration-200 bg-white"
                        onClick={() => handleTypeSelect(type.value)}
                      >
                        <CardContent className="p-4">
                          <div className="flex flex-col items-center gap-2 text-center">
                            <div className={`p-3 rounded-lg ${type.color}`}>
                              <Icon className="w-5 h-5 text-white" />
                            </div>
                            <div>
                              <h3 className="font-medium text-sm">{type.label}</h3>
                              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                {type.description}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Request Form */}
            {selectedType && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Badge variant="secondary" className="text-xs">
                    {requestTypes.find(t => t.value === selectedType)?.label} Request
                  </Badge>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => setSelectedType("")}
                    className="bg-yellow-500 hover:bg-yellow-600 text-white"
                  >
                    Change Type
                  </Button>
                </div>

                {/* Basic Request Fields */}
                <div className="space-y-4">
                  {requestType === "REFRESHMENT" ? (
                    // Enhanced Refreshment Fields with modern layout
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
                      <div className="p-6 space-y-6">
                        <div className="space-y-3">
                          <Label className="text-sm font-medium text-gray-700">Refreshment Types *</Label>
                          <div className="grid grid-cols-2 gap-4">
                            {refreshmentOptions.map((option) => (
                              <div key={option.value} className="flex items-center space-x-2 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                                <input
                                  type="checkbox"
                                  id={option.value}
                                  checked={selectedRefreshments.includes(option.value)}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setSelectedRefreshments(prev => [...prev, option.value]);
                                    } else {
                                      setSelectedRefreshments(prev => prev.filter(item => item !== option.value));
                                      if (option.value === "Snacks") {
                                        setSelectedSnacks([]);
                                      }
                                    }
                                    setValue("title", selectedRefreshments.join(", "));
                                  }}
                                  className="h-4 w-4 appearance-none bg-white border-2 border-gray-400 rounded checked:bg-white checked:border-gray-600 checked:before:content-['✓'] checked:before:text-green-600 checked:before:text-xs checked:before:flex checked:before:items-center checked:before:justify-center focus:ring-2 focus:ring-green-200"
                                />
                                <label htmlFor={option.value} className="text-sm text-gray-700 cursor-pointer font-medium">
                                  {option.label}
                                </label>
                              </div>
                            ))}
                          </div>
                          
                          {/* Nested Snacks Selection */}
                          {selectedRefreshments.includes("Snacks") && (
                            <div className="mt-4 p-4 bg-linear-to-r from-orange-50 to-yellow-50 rounded-lg border border-orange-200">
                              <Label className="text-sm font-medium text-gray-700 mb-3 block">Select Snacks:</Label>
                              <div className="grid grid-cols-2 gap-3">
                                {snacksOptions.map((snack) => (
                                  <div key={snack.value} className="flex items-center space-x-2 p-2 bg-white rounded hover:bg-orange-50 transition-colors">
                                    <input
                                      type="checkbox"
                                      id={snack.value}
                                      checked={selectedSnacks.includes(snack.value)}
                                      onChange={(e) => {
                                        if (e.target.checked) {
                                          setSelectedSnacks(prev => [...prev, snack.value]);
                                        } else {
                                          setSelectedSnacks(prev => prev.filter(item => item !== snack.value));
                                        }
                                      }}
                                      className="h-4 w-4 appearance-none bg-white border-2 border-gray-400 rounded checked:bg-white checked:border-gray-600 checked:before:content-['✓'] checked:before:text-orange-600 checked:before:text-xs checked:before:flex checked:before:items-center checked:before:justify-center focus:ring-2 focus:ring-orange-200"
                                    />
                                    <label htmlFor={snack.value} className="text-xs text-gray-600 cursor-pointer">
                                      {snack.label}
                                    </label>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Conditional Fields in horizontal layout */}
                        <div className="grid grid-cols-2 gap-6">
                          {/* Conditional Quantity Field */}
                          {selectedRefreshments.length === 1 && (
                            <div className="space-y-2">
                              <Label htmlFor="quantity" className="text-sm font-medium text-gray-700">Quantity *</Label>
                              <Input
                                id="quantity"
                                type="number"
                                min="1"
                                placeholder="Enter quantity"
                                className="h-11 border-2 border-gray-300 focus:border-green-500 focus:ring-2 focus:ring-green-100 transition-all duration-200 bg-white"
                                {...register("quantity", {
                                  valueAsNumber: true,
                                  required: selectedRefreshments.length === 1 ? "Quantity is required" : false
                                })}
                              />
                              {errors.quantity && (
                                <p className="text-sm text-red-600 flex items-center gap-1">
                                  <span className="w-1 h-1 bg-red-600 rounded-full"></span>
                                  {errors.quantity.message}
                                </p>
                              )}
                            </div>
                          )}
                          
                          {/* Required Date */}
                          <div className="space-y-2">
                            <Label htmlFor="requiredDate" className="text-sm font-medium text-gray-700">Required Date</Label>
                            <Input
                              id="requiredDate"
                              type="date"
                              className="h-11 border-2 border-gray-300 focus:border-green-500 focus:ring-2 focus:ring-green-100 transition-all duration-200 bg-white"
                              {...register("requiredDate")}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    // Regular Title Field for Other Types
                    <div>
                      <Label htmlFor="title">Request Title</Label>
                      <Input
                        id="title"
                        {...register("title")}
                        placeholder="Brief description of your request"
                        className="h-11 border-2 border-gray-300 focus:border-[#ffb800] focus:ring-2 focus:ring-[#ffb800]/20 transition-all duration-200"
                      />
                      {errors.title && (
                        <p className="text-sm text-red-600 mt-1">{errors.title.message}</p>
                      )}
                    </div>
                  )}

                  <div className="space-y-4">
                    <Label htmlFor="description" className="text-sm font-medium text-gray-700">
                      Additional Details {requestType === "REFRESHMENT" && selectedRefreshments.length > 1 ? "*" : ""}
                    </Label>
                    {requestType === "REFRESHMENT" && selectedRefreshments.length > 1 && (
                      <p className="text-xs text-gray-500 bg-blue-50 p-2 rounded border-l-4 border-blue-400">💡 Please describe the quantities needed for each selected item.</p>
                    )}
                    <Textarea
                      id="description"
                      {...register("description", {
                        required: requestType === "REFRESHMENT" && selectedRefreshments.length > 1 ? "Please describe quantities for multiple items" : false
                      })}
                      placeholder={requestType === "REFRESHMENT" && selectedRefreshments.length > 1 ? 
                        "Example: 2 bottles of water, 5 packets of chips, 3 cookies..." : 
                        "Any additional information or special requirements"
                      }
                      rows={3}
                      className="border-2 border-gray-300 focus:border-[#ffb800] focus:ring-2 focus:ring-[#ffb800]/20 transition-all duration-200 resize-none bg-white"
                    />
                    {errors.description && (
                      <p className="text-sm text-red-600 mt-1">{errors.description.message}</p>
                    )}
                  </div>

                  {requestType !== "REFRESHMENT" && (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="requiredDate" className="text-sm font-medium text-gray-700">Required Date</Label>
                        <Input
                          id="requiredDate"
                          type="date"
                          className="h-11 border-2 border-gray-300 focus:border-[#ffb800] focus:ring-2 focus:ring-[#ffb800]/20 transition-all duration-200 bg-white"
                          {...register("requiredDate")}
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="priority">Priority</Label>
                        <Select onValueChange={(value) => setValue("priority", value as any)}>
                          <SelectTrigger className="h-11 border-2 border-gray-300 focus:border-[#ffb800] focus:ring-2 focus:ring-[#ffb800]/20 transition-all duration-200 bg-white">
                            <SelectValue placeholder="Select priority" />
                          </SelectTrigger>
                          <SelectContent className="bg-white">
                            <SelectItem value="LOW">Low</SelectItem>
                            <SelectItem value="NORMAL">Normal</SelectItem>
                            <SelectItem value="HIGH">High</SelectItem>
                            <SelectItem value="URGENT">Urgent</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </form>
        </div>
        
        {/* Form Actions - Fixed at bottom */}
        {selectedType && (
          <div className="flex justify-end gap-3 p-6 border-t border-gray-100 bg-gray-50">
            <Button
              type="button"
              onClick={resetForm}
              disabled={isSubmitting}
              className="px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white border-0 transition-colors duration-200 font-medium shadow-md hover:shadow-lg"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="px-8 py-2.5 bg-[#ffb800] hover:bg-[#fbbf24] text-slate-900 font-medium transition-colors duration-200 shadow-md hover:shadow-lg"
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
        )}
      </DialogContent>
    </Dialog>
  );
}