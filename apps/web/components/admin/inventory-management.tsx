"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { GoldSpinner } from "@/components/ui/gold-spinner";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  AlertTriangle,
  Package,
  Monitor,
  Calendar,
  TrendingDown,
  Search,
  Filter,
  Plus,
  Edit,
  Trash2,
  Archive,
  Coffee
} from "lucide-react";
import { useAPIClient } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import { AddStockModal } from "./add-stock-modal";

interface InventoryItem {
  id: string;
  name: string;
  category: string;
  type: "REFRESHMENT" | "IT_EQUIPMENT";
  quantity: number;
  givenOut: number;
  expiryDate?: string;
  dateAdded: string;
  supplier?: string;
  department?: string;
  condition?: "NEW" | "GOOD" | "FAIR" | "POOR" | "DAMAGED" | "OUT_OF_ORDER";
}

interface InventoryStatsProps {
  items: InventoryItem[];
}

function InventoryStats({ items }: InventoryStatsProps) {
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalGivenOut = items.reduce((sum, item) => sum + item.givenOut, 0);
  const availableItems = totalItems - totalGivenOut;

  const expiringItems = items.filter(item => {
    if (!item.expiryDate) return false;
    const expiryDate = new Date(item.expiryDate);
    const today = new Date();
    const daysUntilExpiry = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 3600 * 24));
    return daysUntilExpiry <= 30 && daysUntilExpiry > 0;
  });

  const expiredItems = items.filter(item => {
    if (!item.expiryDate) return false;
    const expiryDate = new Date(item.expiryDate);
    const today = new Date();
    return expiryDate < today;
  });

  const lowStockItems = items.filter(item => {
    const availableStock = item.quantity - item.givenOut;
    return availableStock <= 5 && availableStock > 0;
  });

  const outOfStockItems = items.filter(item => {
    const availableStock = item.quantity - item.givenOut;
    return availableStock <= 0;
  });

  return (
    <div className="grid grid-cols-2 lg:grid-cols-6 gap-4 mb-6">
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2">
            <Package className="w-4 h-4 text-blue-600" />
            <div>
              <p className="text-2xl font-bold">{totalItems}</p>
              <p className="text-xs text-muted-foreground">Total Stock</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2">
            <TrendingDown className="w-4 h-4 text-green-600" />
            <div>
              <p className="text-2xl font-bold">{availableItems}</p>
              <p className="text-xs text-muted-foreground">Available</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-orange-600" />
            <div>
              <p className="text-2xl font-bold">{lowStockItems.length}</p>
              <p className="text-xs text-muted-foreground">Low Stock</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-600" />
            <div>
              <p className="text-2xl font-bold">{outOfStockItems.length}</p>
              <p className="text-xs text-muted-foreground">Out of Stock</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-yellow-600" />
            <div>
              <p className="text-2xl font-bold">{expiringItems.length}</p>
              <p className="text-xs text-muted-foreground">Expiring Soon</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2">
            <Archive className="w-4 h-4 text-red-600" />
            <div>
              <p className="text-2xl font-bold">{expiredItems.length}</p>
              <p className="text-xs text-muted-foreground">Expired</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function InventoryManagement() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [allItems, setAllItems] = useState<InventoryItem[]>([]); // Store all items for filtering
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<InventoryItem | null>(null);
  const [selectedType, setSelectedType] = useState<"ALL" | "REFRESHMENT" | "IT_EQUIPMENT">("ALL");
  const [selectedStatus, setSelectedStatus] = useState<"ALL" | "LOW_STOCK" | "EXPIRING" | "EXPIRED">("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const itemsPerPage = 10;

  const apiClient = useAPIClient();

  const loadInventory = async (page: number = 1) => {
    try {
      setLoading(true);
      
      // Temporary direct database connection to bypass API issues
      // TODO: Replace with API call once server is fixed
      try {
        const response = await apiClient.get("/requests/inventory/public") as any;
        const allItems = response || response.data || [];
        
        // Filter to only show Refreshments for Administrative Assistants
        const filteredItems = allItems.filter((item: InventoryItem) => item.type === "REFRESHMENT");
        
        // Store all items for client-side filtering
        setAllItems(filteredItems);
        
        // Calculate pagination
        const totalItems = filteredItems.length;
        const totalPages = Math.ceil(totalItems / itemsPerPage);
        setTotalPages(totalPages);
        
        // Get items for current page
        const startIndex = (page - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        const paginatedItems = filteredItems.slice(startIndex, endIndex);
        setItems(paginatedItems);
        
        setCurrentPage(page);
      } catch (apiError) {
        // If API fails, show a message to the user
        console.log('API not available, showing placeholder data');
        setItems([]);
        setAllItems([]);
      }
    } catch (error) {
      console.error('Error loading inventory:', error);
      setItems([]);
      setAllItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInventory(currentPage);
  }, [currentPage]);

  useEffect(() => {
    loadInventory(1); // Reset to first page when filters change
  }, [searchTerm, selectedType, selectedStatus]);

  const isExpiringSoon = (expiryDate?: string) => {
    if (!expiryDate) return false;
    const expiry = new Date(expiryDate);
    const today = new Date();
    const daysUntilExpiry = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return daysUntilExpiry <= 30 && daysUntilExpiry > 0;
  };

  const isExpired = (expiryDate?: string) => {
    if (!expiryDate) return false;
    const expiry = new Date(expiryDate);
    const today = new Date();
    return expiry < today;
  };

  const handleEditItem = async (item: InventoryItem) => {
    setEditingItem(item);
    setIsEditModalOpen(true);
  };

  const handleDeleteItem = async (item: InventoryItem) => {
    setItemToDelete(item);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (itemToDelete) {
      try {
        await apiClient.delete(`/admin/requests/inventory/${itemToDelete.id}`);
        await loadInventory(currentPage); // Refresh the list
        setIsDeleteModalOpen(false);
        setItemToDelete(null);
      } catch (error) {
        console.error('Failed to delete item:', error);
      }
    }
  };

  const handleUpdateItem = async (updatedItem: Partial<InventoryItem>) => {
    try {
      await apiClient.put(`/admin/requests/inventory/${editingItem?.id}`, updatedItem);
      setIsEditModalOpen(false);
      setEditingItem(null);
      await loadInventory(currentPage); // Refresh the list
    } catch (error) {
      console.error('Failed to update item:', error);
    }
  };

  const getStatusText = (quantity: number, givenOut: number) => {
    if (givenOut === 0) {
      return `${quantity} in stock`;
    } else if (quantity <= givenOut) {
      return `${quantity - givenOut} used`;
    } else {
      return `${givenOut} used`;
    }
  };

  const getStatusColor = (quantity: number, givenOut: number) => {
    if (givenOut === 0) {
      return 'bg-green-100 text-green-800 border-green-300';
    } else if (quantity <= givenOut) {
      return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    } else {
      return 'bg-red-100 text-red-800 border-red-300';
    }
  };

  const handleAddStock = (item: any) => {
    console.log('Add Stock clicked:', item);
    // TODO: Implement add stock functionality
  };

  const handleEditStock = (item: any) => {
    console.log('Edit Stock clicked:', item);
    // TODO: Implement edit stock functionality
  };

  const handleDeleteStock = (item: any) => {
    console.log('Delete Stock clicked:', item);
    // TODO: Implement delete stock functionality
  };

  const getStatusBadge = (item: InventoryItem) => {
    const availableStock = item.quantity - item.givenOut;
    
    if (availableStock <= 0) {
      return <Badge className="bg-red-100 text-red-800">Out of Stock</Badge>;
    }
    
    if (availableStock <= 30) {
      return <Badge className="bg-red-100 text-red-800">Low Stock</Badge>;
    }
    
    if (availableStock >= 70) {
      return <Badge className="bg-green-100 text-green-800">Good Stock</Badge>;
    }
    
    return <Badge className="bg-blue-100 text-blue-800">In Stock</Badge>;
  };

  const filteredItems = allItems.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.category.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = selectedType === "ALL" || item.type === selectedType;
    
    let matchesStatus = true;
    if (selectedStatus !== "ALL") {
      const availableStock = item.quantity - item.givenOut;
      
      switch (selectedStatus) {
        case "LOW_STOCK":
          matchesStatus = availableStock <= 30;
          break;
        case "EXPIRING":
          matchesStatus = isExpiringSoon(item.expiryDate);
          break;
        case "EXPIRED":
          if (item.expiryDate) {
            const expiryDate = new Date(item.expiryDate);
            const today = new Date();
            matchesStatus = expiryDate < today;
          } else {
            matchesStatus = false;
          }
          break;
      }
    }

    return matchesSearch && matchesType && matchesStatus;
  });

  // Apply pagination to filtered results
  const paginatedItems = filteredItems.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  if (loading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="p-8">
            <div className="flex items-center justify-center">
              <GoldSpinner size="md" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <InventoryStats items={allItems} />

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Package className="w-5 h-5" />
              Inventory Management
            </div>
            <div className="flex gap-2">
              <Button 
                onClick={() => setIsAddModalOpen(true)}
                size="sm" 
                className="bg-[#ffb800] hover:bg-[#fbbf24] text-slate-900"
              >
                <Plus className="w-4 h-4 mr-1" />
                Refreshment Item
              </Button>
              <AddStockModal 
                open={isAddModalOpen} 
                setOpen={setIsAddModalOpen} 
                onStockAdded={loadInventory} 
              />
              <AddStockModal 
                open={isEditModalOpen} 
                setOpen={setIsEditModalOpen} 
                onStockAdded={() => {}} 
                editingItem={editingItem}
                onUpdate={handleUpdateItem}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search items by name or category..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={selectedType} onValueChange={(value: any) => setSelectedType(value)}>
              <SelectTrigger className="w-45">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Items</SelectItem>
                <SelectItem value="REFRESHMENT">Refreshments Only</SelectItem>
              </SelectContent>
            </Select>

            <Select value={selectedStatus} onValueChange={(value: any) => setSelectedStatus(value)}>
              <SelectTrigger className="w-45">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Status</SelectItem>
                <SelectItem value="LOW_STOCK">Low Stock</SelectItem>
                <SelectItem value="EXPIRING">Expiring Soon</SelectItem>
                <SelectItem value="EXPIRED">Expired</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Inventory Table */}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Stock</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Given Out</TableHead>
                <TableHead>Date Created</TableHead>
                <TableHead>Expiry Date</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedItems.map((item) => {
                const availableStock = item.quantity - item.givenOut;
                return (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium text-sm">{item.name}</p>
                        {item.supplier && (
                          <p className="text-xs text-muted-foreground">Supplier: {item.supplier}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {item.type === "REFRESHMENT" ? (
                          <Coffee className="w-4 h-4 text-amber-600" />
                        ) : (
                          <Monitor className="w-4 h-4 text-purple-600" />
                        )}
                        <span className="text-sm">
                          {item.type === "REFRESHMENT" ? "Refreshment" : "IT Equipment"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm">
                          {item.quantity} available
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Badge className={getStatusColor(item.quantity, item.givenOut || 0)}>
                          {getStatusText(item.quantity, item.givenOut || 0)}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm font-medium">
                        {item.givenOut || 0}
                      </p>
                    </TableCell>
                    <TableCell>
                      {item.dateAdded ? (
                        <p className="text-sm">
                          {new Date(item.dateAdded).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        </p>
                      ) : (
                        <p className="text-sm text-muted-foreground">-</p>
                      )}
                    </TableCell>
                    <TableCell>
                      {item.expiryDate ? (
                        <p className="text-sm">
                          {new Date(item.expiryDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        </p>
                      ) : (
                        <p className="text-sm text-muted-foreground">-</p>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                       
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleEditStock(item)}
                          className="bg-yellow-600 hover:bg-yellow-700 text-white"
                        >
                          <Edit className="w-4 h-4 mr-1" />
                          Edit
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleDeleteStock(item)}
                          className="bg-red-600 hover:bg-red-700 text-white"
                        >
                          <Trash2 className="w-4 h-4 mr-1" />
                          Delete
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};