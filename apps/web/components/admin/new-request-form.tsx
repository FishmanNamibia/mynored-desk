"use client";

import { toast } from "@/hooks/use-toast";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Coffee, Car, Users, Monitor, ArrowLeft, X } from "lucide-react";
import { apiClient } from "@/lib/api-client";

interface NewRequestFormProps {
  onSuccess?: () => void;
}

type RequestStep = "select-type" | "refreshment-form";

const refreshmentOptions = [
  { id: "water", label: "Water", color: "bg-blue-100 text-blue-800 border-blue-200" },
  { id: "juice", label: "Assorted Juice", color: "bg-orange-100 text-orange-800 border-orange-200" },
  { id: "cooldrink", label: "Assorted Cooldrink", color: "bg-purple-100 text-purple-800 border-purple-200" },
  { id: "platters", label: "Platters", color: "bg-green-100 text-green-800 border-green-200" },
  { id: "snacks", label: "Snacks", color: "bg-yellow-100 text-yellow-800 border-yellow-200" },
];

const snackOptions = [
  { id: "peanuts", label: "Peanuts" },
  { id: "chips", label: "Chips" },
  { id: "cookies", label: "Cookies" },
  { id: "dry-fruits", label: "Dry Fruits" },
  { id: "biscuits", label: "Biscuits" },
  { id: "crackers", label: "Crackers" },
  { id: "nuts-mix", label: "Mixed Nuts" },
  { id: "popcorn", label: "Popcorn" }
];

export function NewRequestForm({ onSuccess }: NewRequestFormProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState<RequestStep>("select-type");
  const [selectedRefreshments, setSelectedRefreshments] = useState<string[]>([]);
  const [selectedSnacks, setSelectedSnacks] = useState<string[]>([]);
  const [itemQuantities, setItemQuantities] = useState<{[key: string]: number}>({});
  const [purpose, setPurpose] = useState("");
  const [requestDate, setRequestDate] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{[key: string]: string}>({});
  const [notification, setNotification] = useState<{type: 'success' | 'error', message: string} | null>(null);

  const handleRefreshmentToggle = (optionId: string) => {
    // Clear error when user selects a refreshment
    if (errors.refreshments) {
      setErrors(prev => ({ ...prev, refreshments: "" }));
    }
    setSelectedRefreshments(prev => {
      if (prev.includes(optionId)) {
        // If deselecting, remove quantity and snack selections if applicable
        if (optionId === "snacks") {
          setSelectedSnacks([]);
          // Remove snack quantities too
          setItemQuantities(prevQty => {
            const newQty = { ...prevQty };
            delete newQty[optionId];
            snackOptions.forEach(s => delete newQty[s.id]);
            return newQty;
          });
        } else {
          setItemQuantities(prevQty => {
            const newQty = { ...prevQty };
            delete newQty[optionId];
            return newQty;
          });
        }
        return prev.filter(id => id !== optionId);
      } else {
        // Initialize quantity to 1 when selecting
        setItemQuantities(prevQty => ({ ...prevQty, [optionId]: 1 }));
        return [...prev, optionId];
      }
    });
  };

  const handleSnackToggle = (snackId: string) => {
    setSelectedSnacks(prev => {
      if (prev.includes(snackId)) {
        // Remove quantity when deselecting
        setItemQuantities(prevQty => {
          const newQty = { ...prevQty };
          delete newQty[snackId];
          return newQty;
        });
        return prev.filter(id => id !== snackId);
      } else {
        // Initialize quantity to 1 when selecting
        setItemQuantities(prevQty => ({ ...prevQty, [snackId]: 1 }));
        return [...prev, snackId];
      }
    });
  };

  const handleQuantityChange = (itemId: string, value: number) => {
    if (errors.quantities) {
      setErrors(prev => ({ ...prev, quantities: "" }));
    }
    setItemQuantities(prev => ({ ...prev, [itemId]: Math.max(1, value) }));
  };

  const getSelectedLabels = () => {
    return refreshmentOptions
      .filter(option => selectedRefreshments.includes(option.id))
      .map(option => {
        let label = option.label;
        // Add snack details if snacks are selected
        if (option.id === "snacks" && selectedSnacks.length > 0) {
          const snackLabels = selectedSnacks.map(snackId => {
            const snack = snackOptions.find(s => s.id === snackId);
            return snack?.label || snackId;
          });
          label += ` (${snackLabels.join(", ")})`;
        }
        return label;
      });
  };

  const resetForm = () => {
    setCurrentStep("select-type");
    setSelectedRefreshments([]);
    setSelectedSnacks([]);
    setItemQuantities({});
    setPurpose("");
    setRequestDate("");
    setErrors({});
    setNotification(null);
  };

  const handleClose = () => {
    setIsOpen(false);
    setTimeout(resetForm, 300); // Reset after modal closes
  };

  const handleSubmitRefreshment = async () => {
    const newErrors: {[key: string]: string} = {};
    
    if (selectedRefreshments.length === 0) {
      newErrors.refreshments = "Please select at least one refreshment item";
    }

    if (!purpose.trim()) {
      newErrors.purpose = "Please provide a description";
    }

    // Validate quantities - all selected items must have quantity >= 1
    const allItemsToCheck = [
      ...selectedRefreshments.filter(id => id !== "snacks"),
      ...selectedSnacks
    ];
    const hasInvalidQuantities = allItemsToCheck.some(id => !itemQuantities[id] || itemQuantities[id] < 1);
    if (hasInvalidQuantities) {
      newErrors.quantities = "Please specify quantity for all selected items";
    }

    if (!requestDate) {
      newErrors.requestDate = "Please select a request date";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({}); // Clear errors if validation passes

    try {
      setIsSubmitting(true);
      
      // Build items array with quantities
      const items = allItemsToCheck.map(id => {
        const option = refreshmentOptions.find(o => o.id === id) || snackOptions.find(s => s.id === id);
        return {
          itemId: id,
          name: option?.label || id,
          quantity: itemQuantities[id] || 1
        };
      });
      
      // Build description with quantities
      const itemsDescription = items.map(item => `${item.name} (${item.quantity})`).join(", ");
      
      // Create the request payload matching backend RefreshmentRequest schema
      const requestData = {
        type: "REFRESHMENT",
        title: itemsDescription,
        description: purpose,
        requiredDate: requestDate,
        priority: "NORMAL",
        refreshmentDetails: {
          mode: "BULK_EVENT", // Always use BULK_EVENT for proper quantity tracking
          purpose: purpose,
          itemsDescription: itemsDescription,
          eventDate: requestDate,
          items: items, // Include structured items with quantities
        },
      };
      
      console.log("Submitting refreshment request:", requestData);
      
      // Use Next.js API route instead of external API client
      const response = await fetch("/api/requests", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestData),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP ${response.status}`);
      }
      
      const result = await response.json();
      console.log("Request submitted successfully:", result);
      setNotification({type: 'success', message: 'Refreshment request submitted successfully!'});
      
      // Close form after short delay to show success message
      setTimeout(() => {
        handleClose();
        onSuccess?.();
      }, 1500);
      
    } catch (error) {
      console.error("Failed to submit request:", error);
      
      let errorMessage = "Failed to submit request";
      
      if (error instanceof Error) {
        if (error.message.includes('404')) {
          errorMessage = "Request service is not available. Please contact your administrator.";
        } else if (error.message.includes('400')) {
          errorMessage = "Invalid request data. Please check all fields and try again.";
        } else if (error.message.includes('401')) {
          errorMessage = "You are not authorized to submit requests. Please log in again.";
        } else if (error.message.includes('500')) {
          errorMessage = "Server error. Please try again later or contact support.";
        } else {
          errorMessage = error.message;
        }
      }
      
      setNotification({type: 'error', message: errorMessage});
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOtherRequest = (type: string) => {
    toast({ title: `$1`, variant: "destructive" });
    handleClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="bg-[#ffb800] hover:bg-[#fbbf24] text-slate-900 font-medium transition-colors duration-200 shadow-md hover:shadow-lg">
          + New Request
        </Button>
      </DialogTrigger>
      
      <DialogContent className="w-[90vw] max-w-7xl bg-white border-0 shadow-2xl rounded-2xl p-0 overflow-hidden">
        {currentStep === "select-type" ? (
          // Main Request Type Selection
          <>
            <DialogHeader className="px-8 py-5 bg-white border-b border-gray-200">
              <DialogTitle className="text-xl font-bold text-gray-800 text-center flex items-center justify-center gap-2">
                <div className="w-6 h-6 bg-[#ffb800] rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">+</span>
                </div>
                New Service Request
              </DialogTitle>
            </DialogHeader>
            
            <div className="p-8 bg-white">
              <p className="text-gray-600 text-center mb-8">Select the type of service you need</p>
              
              <div className="space-y-4">
                {/* Top Row - 2 buttons */}
                <div className="grid grid-cols-2 gap-4">
                  {/* Refreshments */}
                  <button
                    onClick={() => setCurrentStep("refreshment-form")}
                    className="group p-4 rounded-xl border-2 border-gray-200 hover:border-emerald-400 hover:shadow-lg transition-all duration-300 flex flex-col items-center gap-2 bg-white hover:bg-linear-to-br hover:from-emerald-50 hover:to-green-50 transform hover:-translate-y-0.5"
                  >
                    <div className="w-10 h-10 bg-linear-to-br from-emerald-400 to-green-500 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                      <Coffee className="w-5 h-5 text-white" />
                    </div>
                    <div className="text-center">
                      <h3 className="font-semibold text-gray-800 text-sm group-hover:text-emerald-700">Refreshments</h3>
                      <p className="text-xs text-gray-500 mt-0.5">Water, drinks & snacks</p>
                    </div>
                  </button>

                  {/* Vehicle */}
                  <button
                    onClick={() => handleOtherRequest("Vehicle")}
                    className="group p-4 rounded-xl border-2 border-gray-200 hover:border-blue-400 hover:shadow-lg transition-all duration-300 flex flex-col items-center gap-2 bg-white hover:bg-linear-to-br hover:from-blue-50 hover:to-sky-50 transform hover:-translate-y-0.5"
                  >
                    <div className="w-10 h-10 bg-linear-to-br from-blue-400 to-blue-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                      <Car className="w-5 h-5 text-white" />
                    </div>
                    <div className="text-center">
                      <h3 className="font-semibold text-gray-800 text-sm group-hover:text-blue-700">Vehicle</h3>
                      <p className="text-xs text-gray-500 mt-0.5">Transportation</p>
                    </div>
                  </button>
                </div>

                {/* Bottom Row - 2 buttons */}
                <div className="grid grid-cols-2 gap-4">
                  {/* Board Rooms */}
                  <button
                    onClick={() => handleOtherRequest("Board Room")}
                    className="group p-4 rounded-xl border-2 border-gray-200 hover:border-purple-400 hover:shadow-lg transition-all duration-300 flex flex-col items-center gap-2 bg-white hover:bg-linear-to-br hover:from-purple-50 hover:to-violet-50 transform hover:-translate-y-0.5"
                  >
                    <div className="w-10 h-10 bg-linear-to-br from-purple-400 to-violet-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                      <Users className="w-5 h-5 text-white" />
                    </div>
                    <div className="text-center">
                      <h3 className="font-semibold text-gray-800 text-sm group-hover:text-purple-700">Board Rooms</h3>
                      <p className="text-xs text-gray-500 mt-0.5">Meeting rooms</p>
                    </div>
                  </button>

                  {/* IT Equipment */}
                  <button
                    onClick={() => handleOtherRequest("IT Equipment")}
                    className="group p-4 rounded-xl border-2 border-gray-200 hover:border-orange-400 hover:shadow-lg transition-all duration-300 flex flex-col items-center gap-2 bg-white hover:bg-linear-to-br hover:from-orange-50 hover:to-amber-50 transform hover:-translate-y-0.5"
                  >
                    <div className="w-10 h-10 bg-linear-to-br from-orange-400 to-amber-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                      <Monitor className="w-5 h-5 text-white" />
                    </div>
                    <div className="text-center">
                      <h3 className="font-semibold text-gray-800 text-sm group-hover:text-orange-700">IT Equipment</h3>
                      <p className="text-xs text-gray-500 mt-0.5">Hardware & software</p>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          </>
        ) : (
          // Refreshment Form
          <>
            <DialogHeader className="px-6 py-3 bg-linear-to-r from-emerald-50 to-green-50 border-b border-emerald-100">
              <div className="flex items-center justify-between">
                <button
                  onClick={() => setCurrentStep("select-type")}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/80 transition-colors text-emerald-700 font-medium"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to Request Types
                </button>
              </div>
              <DialogTitle className="text-lg font-bold text-emerald-800 text-center flex items-center justify-center gap-2 mt-1">
                <Coffee className="w-5 h-5 text-emerald-600" />
                Refreshment Request
              </DialogTitle>
            </DialogHeader>
            
            {/* Notification Bar */}
            {notification && (
              <div className={`px-6 py-3 border-b ${
                notification.type === 'success' 
                  ? 'bg-green-50 border-green-200 text-green-800' 
                  : 'bg-red-50 border-red-200 text-red-800'
              }`}>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${
                    notification.type === 'success' ? 'bg-green-500' : 'bg-red-500'
                  }`}></div>
                  <p className="text-sm font-medium">{notification.message}</p>
                  <button 
                    onClick={() => setNotification(null)}
                    className="ml-auto text-sm hover:opacity-70"
                  >
                    ✕
                  </button>
                </div>
              </div>
            )}
            
            <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto">
              {/* Refreshment Selection */}
              <div className="space-y-4">
                <div>
                  <Label className={`text-base font-semibold ${errors.refreshments ? 'text-red-600' : 'text-gray-700'}`}>
                    Select Refreshments *
                  </Label>
                  {errors.refreshments && (
                    <p className="text-sm text-red-600 mt-1">{errors.refreshments}</p>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-4">
                  {refreshmentOptions.map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => handleRefreshmentToggle(option.id)}
                      className={`p-3 rounded-lg border-2 transition-all duration-200 text-left ${
                        selectedRefreshments.includes(option.id)
                          ? `${option.color} border-current shadow-md transform scale-105`
                          : "bg-gray-50 border-gray-200 hover:border-gray-300 hover:bg-gray-100"
                      }`}
                    >
                      <div className="font-medium text-sm">{option.label}</div>
                    </button>
                  ))}
                </div>

                {/* Snack Sub-options - Show when Snacks is selected */}
                {selectedRefreshments.includes("snacks") && (
                  <div className="mt-4 p-4 bg-white rounded-lg border-2 border-gray-200">
                    <Label className="text-sm font-semibold text-gray-700 mb-3 block">Select Snack Types:</Label>
                    <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto">
                      {snackOptions.map((snack) => (
                        <button
                          key={snack.id}
                          type="button"
                          onClick={() => handleSnackToggle(snack.id)}
                          className={`p-2 rounded-md border-2 transition-all duration-200 text-left text-sm ${
                            selectedSnacks.includes(snack.id)
                              ? "bg-gray-800 text-white border-gray-800 shadow-sm"
                              : "bg-white border-gray-300 hover:border-gray-400 hover:bg-gray-50 text-gray-700"
                          }`}
                        >
                          {snack.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Selected Items Display */}
                {selectedRefreshments.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-2 max-h-20 overflow-y-auto">
                    {getSelectedLabels().map((label, index) => (
                      <Badge key={index} variant="secondary" className="bg-emerald-100 text-emerald-800 px-2 py-1 text-xs">
                        {label}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              {/* Quantities for Each Selected Item */}
              {selectedRefreshments.length > 0 && (
                <div className="space-y-4">
                  <div>
                    <Label className={`text-base font-semibold ${errors.quantities ? 'text-red-600' : 'text-gray-700'}`}>
                      Quantities *
                    </Label>
                    {errors.quantities && (
                      <p className="text-sm text-red-600 mt-1">{errors.quantities}</p>
                    )}
                  </div>
                  <div className="space-y-3 p-4 bg-gray-50 rounded-lg border">
                    {/* Main refreshment items (except snacks which have sub-items) */}
                    {selectedRefreshments.filter(id => id !== "snacks").map((itemId) => {
                      const option = refreshmentOptions.find(o => o.id === itemId);
                      if (!option) return null;
                      return (
                        <div key={itemId} className="flex items-center justify-between gap-4">
                          <span className="text-sm font-medium text-gray-700 flex-1">{option.label}</span>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleQuantityChange(itemId, (itemQuantities[itemId] || 1) - 1)}
                              className="w-8 h-8 flex items-center justify-center rounded-md border border-gray-300 bg-white hover:bg-gray-100"
                            >
                              -
                            </button>
                            <Input
                              type="number"
                              min="1"
                              value={itemQuantities[itemId] || 1}
                              onChange={(e) => handleQuantityChange(itemId, parseInt(e.target.value) || 1)}
                              className="w-20 h-8 text-center border-gray-300"
                            />
                            <button
                              type="button"
                              onClick={() => handleQuantityChange(itemId, (itemQuantities[itemId] || 1) + 1)}
                              className="w-8 h-8 flex items-center justify-center rounded-md border border-gray-300 bg-white hover:bg-gray-100"
                            >
                              +
                            </button>
                          </div>
                        </div>
                      );
                    })}
                    {/* Snack sub-items */}
                    {selectedSnacks.map((snackId) => {
                      const snack = snackOptions.find(s => s.id === snackId);
                      if (!snack) return null;
                      return (
                        <div key={snackId} className="flex items-center justify-between gap-4 pl-4 border-l-2 border-yellow-300">
                          <span className="text-sm font-medium text-gray-600 flex-1">{snack.label}</span>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleQuantityChange(snackId, (itemQuantities[snackId] || 1) - 1)}
                              className="w-8 h-8 flex items-center justify-center rounded-md border border-gray-300 bg-white hover:bg-gray-100"
                            >
                              -
                            </button>
                            <Input
                              type="number"
                              min="1"
                              value={itemQuantities[snackId] || 1}
                              onChange={(e) => handleQuantityChange(snackId, parseInt(e.target.value) || 1)}
                              className="w-20 h-8 text-center border-gray-300"
                            />
                            <button
                              type="button"
                              onClick={() => handleQuantityChange(snackId, (itemQuantities[snackId] || 1) + 1)}
                              className="w-8 h-8 flex items-center justify-center rounded-md border border-gray-300 bg-white hover:bg-gray-100"
                            >
                              +
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Description Field - REQUIRED */}
              <div className="space-y-2">
                <Label htmlFor="purpose" className={`text-base font-semibold ${errors.purpose ? 'text-red-600' : 'text-gray-700'}`}>
                  Description *
                </Label>
                <Textarea
                  id="purpose"
                  value={purpose}
                  onChange={(e) => {
                    setPurpose(e.target.value);
                    if (errors.purpose) setErrors(prev => ({ ...prev, purpose: "" }));
                  }}
                  placeholder="Please describe what this is for and any special requirements..."
                  className={`min-h-25 border-2 focus:ring-2 focus:ring-emerald-100 resize-none ${
                    errors.purpose 
                      ? 'border-red-500 focus:border-red-500' 
                      : 'border-gray-200 focus:border-emerald-500'
                  }`}
                />
                {errors.purpose && (
                  <p className="text-sm text-red-600">{errors.purpose}</p>
                )}
              </div>

              {/* Request Date */}
              <div className="space-y-2">
                <Label htmlFor="requestDate" className={`text-base font-semibold ${errors.requestDate ? 'text-red-600' : 'text-gray-700'}`}>
                  Date Needed *
                </Label>
                <Input
                  id="requestDate"
                  type="date"
                  value={requestDate}
                  onChange={(e) => {
                    setRequestDate(e.target.value);
                    if (errors.requestDate) setErrors(prev => ({ ...prev, requestDate: "" }));
                  }}
                  min={new Date().toISOString().split('T')[0]}
                  className={`h-12 border-2 focus:ring-2 focus:ring-emerald-100 ${
                    errors.requestDate 
                      ? 'border-red-500 focus:border-red-500' 
                      : 'border-gray-200 focus:border-emerald-500'
                  }`}
                />
                {errors.requestDate && (
                  <p className="text-sm text-red-600">{errors.requestDate}</p>
                )}
              </div>
            </div>
            
            {/* Form Actions */}
            <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
              <Button 
                type="button" 
                onClick={handleClose}
                className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white border-0 font-medium"
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleSubmitRefreshment}
                disabled={isSubmitting || selectedRefreshments.length === 0}
                className="px-8 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-md hover:shadow-lg"
              >
                {isSubmitting ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Submitting...
                  </div>
                ) : (
                  "Submit Request"
                )}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}