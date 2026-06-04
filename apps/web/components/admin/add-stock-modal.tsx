"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Package, Plus, Calendar } from "lucide-react";
import { useAPIClient } from "@/lib/api-client";

interface AddStockModalProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  onStockAdded: () => void;
  editingItem?: any;
  onUpdate?: (updatedItem: any) => Promise<void>;
}

export function AddStockModal({ open, setOpen, onStockAdded, editingItem, onUpdate }: AddStockModalProps) {
  const [itemType, setItemType] = useState<"REFRESHMENT">("REFRESHMENT");
  const [loading, setLoading] = useState(false);
  
  // Populate form when editingItem is provided
  useEffect(() => {
    if (editingItem) {
      setRefreshmentForm({
        name: editingItem.name || "",
        category: editingItem.category || "",
        subcategory: "",
        unitType: editingItem.unitType || "",
        quantity: editingItem.quantity?.toString() || "",
        expiryDate: editingItem.expiryDate || "",
        supplier: editingItem.supplier || "",
        notes: ""
      });
    } else {
      // Reset form for adding new item
      setRefreshmentForm({
        name: "",
        category: "",
        subcategory: "",
        unitType: "",
        quantity: "",
        expiryDate: "",
        supplier: "",
        notes: ""
      });
    }
  }, [editingItem, open]);
  
  // Refreshment form state
  const [refreshmentForm, setRefreshmentForm] = useState({
    name: "",
    category: "",
    subcategory: "",
    unitType: "",
    quantity: "",
    expiryDate: "",
    supplier: "",
    notes: ""
  });

  const refreshmentCategories = [
    "Beverages",
    "Snacks", 
    "Dry Fruits",
    "Confectionery"
  ];

  const unitTypes = [
    "Single Units",
    "6xPacks",
    "12xPacks",
    "Box"
  ];

  const apiClient = useAPIClient();
  const [notification, setNotification] = useState<{type: 'success' | 'error', message: string} | null>(null);

  const resetForms = () => {
    setRefreshmentForm({
      name: "",
      category: "",
      subcategory: "",
      unitType: "",
      quantity: "",
      expiryDate: "",
      supplier: "",
      notes: ""
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (editingItem && onUpdate) {
        // Update existing item
        await onUpdate({
          name: refreshmentForm.name,
          category: refreshmentForm.category,
          unitType: refreshmentForm.unitType,
          quantity: parseInt(refreshmentForm.quantity),
          expiryDate: refreshmentForm.expiryDate || undefined,
          supplier: refreshmentForm.supplier || undefined,
          notes: refreshmentForm.notes || undefined
        });
        setNotification({ type: 'success', message: 'Stock item updated successfully!' });
        // Wait 1.5 seconds to show success message before closing
        setTimeout(() => {
          setOpen(false);
          resetForms();
        }, 1500);
      } else {
        // Add new item
        await apiClient.post("/requests/inventory/public/add", {
          name: refreshmentForm.name,
          category: refreshmentForm.category,
          unitType: refreshmentForm.unitType,
          quantity: parseInt(refreshmentForm.quantity),
          expiryDate: refreshmentForm.expiryDate || undefined,
          supplier: refreshmentForm.supplier || undefined,
          notes: refreshmentForm.notes || undefined
        });
        setNotification({ type: 'success', message: 'Stock item added successfully!' });
        // Wait 1.5 seconds to show success message before closing
        setTimeout(() => {
          setOpen(false);
          resetForms();
          onStockAdded();
        }, 1500);
      }
    } catch (error: any) {
      console.error("Failed to save stock item:", error);
      setNotification({ type: 'error', message: `Failed to save item. ${error}` });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="bg-white text-gray-900">
        <DialogHeader>
          <DialogTitle>{editingItem ? 'Edit Inventory Item' : 'Add New Inventory Item'}</DialogTitle>
          <DialogDescription>
            {editingItem ? 'Edit existing inventory item details.' : 'Add new stock items to track inventory levels and availability.'}
          </DialogDescription>
        </DialogHeader>
        
        {/* Notification Display */}
        {notification && (
          <div className={`mb-4 px-4 py-3 rounded-lg border ${
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
        
        <Tabs value={itemType}>
          <TabsList className="grid w-full grid-cols-1">
            <TabsTrigger value="REFRESHMENT">Refreshment</TabsTrigger>
          </TabsList>
          
          <TabsContent value="REFRESHMENT" className="space-y-4">
            <form id="refreshment-form" onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name" className="mt-[6px]">Item Name *</Label>
                  <Input
                    id="name"
                    value={refreshmentForm.name}
                    onChange={(e) => setRefreshmentForm(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Enter item name"
                    className="border-gray-300 bg-gray-50"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="category" className="mt-[6px]">Category *</Label>
                  <Select value={refreshmentForm.category} onValueChange={(value) => setRefreshmentForm(prev => ({ ...prev, category: value }))}>
                    <SelectTrigger className="border-gray-300 bg-gray-50 w-full">
                      <SelectValue placeholder="Select Category" />
                    </SelectTrigger>
                    <SelectContent>
                      {refreshmentCategories.map((category) => (
                        <SelectItem key={category} value={category}>
                          {category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="unitType">Unit Type *</Label>
                  <Select value={refreshmentForm.unitType} onValueChange={(value) => setRefreshmentForm(prev => ({ ...prev, unitType: value }))}>
                    <SelectTrigger className="border-gray-300 bg-gray-50 w-full">
                      <SelectValue placeholder="Select Unit Type" />
                    </SelectTrigger>
                    <SelectContent>
                      {unitTypes.map((unit: string) => (
                        <SelectItem key={unit} value={unit}>
                          {unit}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="quantity">Quantity *</Label>
                  <Input
                    id="quantity"
                    type="number"
                    value={refreshmentForm.quantity}
                    onChange={(e) => setRefreshmentForm(prev => ({ ...prev, quantity: e.target.value }))}
                    placeholder="Enter quantity"
                    className="border-gray-300 bg-gray-50"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="expiryDate">Expiry Date</Label>
                  <Input
                    id="expiryDate"
                    type="date"
                    value={refreshmentForm.expiryDate}
                    onChange={(e) => setRefreshmentForm(prev => ({ ...prev, expiryDate: e.target.value }))}
                    className="border-gray-300 bg-gray-50"
                  />
                </div>

                <div>
                  <Label htmlFor="supplier">Supplier</Label>
                  <Input
                    id="supplier"
                    value={refreshmentForm.supplier}
                    onChange={(e) => setRefreshmentForm(prev => ({ ...prev, supplier: e.target.value }))}
                    placeholder="Supplier name"
                    className="border-gray-300 bg-gray-50"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="notes">Notes</Label>
                <textarea
                  id="notes"
                  value={refreshmentForm.notes}
                  onChange={(e) => setRefreshmentForm(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Additional notes about this item"
                  rows={3}
                  className="w-full border border-gray-300 bg-gray-50 rounded-md p-2 focus:border-gray-300 focus:outline-none focus:ring-1 focus:ring-gray-300"
                ></textarea>
              </div>
            </form>
          </TabsContent>
        </Tabs>
        
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
            className="border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form="refreshment-form"
            disabled={loading}
            className="bg-[#ffb800] hover:bg-[#fbbf24] text-slate-900"
          >
            {loading ? 'Saving...' : (editingItem ? 'Update Item' : 'Add Item')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
