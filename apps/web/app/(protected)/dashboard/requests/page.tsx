"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { apiClient } from "@/lib/api-client";
import { PageLayout } from "@/components/page-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  ClipboardList, 
  Package, 
  Clock, 
  CheckCircle,
  FileText,
  User,
  Users,
  AlertTriangle,
  Calendar
} from "lucide-react";
import { NewRequestForm } from "@/components/admin/new-request-form";
import { AdminRequestsDashboard } from "@/components/admin/admin-requests-dashboard";
import { ColleaguesRequestsList } from "@/components/requests/colleagues-requests-list";
import { MyRequestsList } from "@/components/requests/my-requests-list";
import { InventoryManagement } from "@/components/admin/inventory-management";
import { useAuth } from "@/lib/auth-context";

// Define types for requests
interface UserRequest {
  id: string;
  title: string;
  type: "REFRESHMENT" | "VEHICLE" | "BOARDROOM" | "IT_EQUIPMENT";
  status: "PENDING" | "APPROVED" | "REJECTED";
  description?: string;
  createdAt: string;
  updatedAt: string;
  approvedAt?: string;
  rejectedAt?: string;
  approvedBy?: string;
  rejectionReason?: string;
  refreshmentDetails?: {
    items: string[];
    snacks: string[];
  };
}

export default function RequestsPage() {
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("overview");
  const [userRequests, setUserRequests] = useState<UserRequest[]>([]);
  const [colleagueRequests, setColleagueRequests] = useState<UserRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [inventoryItems, setInventoryItems] = useState<any[]>([]);

  // Determine user permissions based on job title
  const jobTitle = user?.jobTitle?.toLowerCase() || "";
  const isAdminAssistant = jobTitle.includes("admin assistant") || 
                           jobTitle.includes("administrative assistant");

  // Calculate stats - for admin assistants, show colleague request stats; for others, show their own
  const requestStats = isAdminAssistant ? {
    pending: colleagueRequests.filter(r => r.status === "PENDING").length,
    approved: colleagueRequests.filter(r => r.status === "APPROVED").length,
    rejected: colleagueRequests.filter(r => r.status === "REJECTED").length,
    total: colleagueRequests.length
  } : {
    pending: userRequests.filter(r => r.status === "PENDING").length,
    approved: userRequests.filter(r => r.status === "APPROVED").length,
    rejected: userRequests.filter(r => r.status === "REJECTED").length,
    total: userRequests.length
  };

  // Calculate request counts by type - use colleagueRequests for admin assistants
  const requestsToCount = isAdminAssistant ? colleagueRequests : userRequests;
  const requestTypeStats = {
    refreshments: requestsToCount.filter(r => r.type === "REFRESHMENT").length,
    vehicles: requestsToCount.filter(r => r.type === "VEHICLE").length,
    boardrooms: requestsToCount.filter(r => r.type === "BOARDROOM").length,
    itEquipment: requestsToCount.filter(r => r.type === "IT_EQUIPMENT").length,
  };

  // Debug logging
  console.log('=== DEBUG INFO ===');
  console.log('user:', user);
  console.log('user.id:', user?.id);
  console.log('isAdminAssistant:', isAdminAssistant);
  console.log('userRequests:', userRequests);
  console.log('userRequests.length:', userRequests.length);
  console.log('colleagueRequests:', colleagueRequests);
  console.log('requestsToCount:', requestsToCount);
  console.log('requestTypeStats:', requestTypeStats);
  console.log('requestStats:', requestStats);
  console.log('==================');

  // Load user's requests and colleague requests for admins
  useEffect(() => {
    if (user?.id) {
      loadUserRequests();
    }
    if (isAdminAssistant) {
      loadColleagueRequests();
      loadInventory();
    }
  }, [isAdminAssistant, user?.id]);

  const loadInventory = async () => {
    try {
      const response = await fetch('/api/requests/inventory/public');
      if (response.ok) {
        const data = await response.json();
        setInventoryItems(data || []);
      }
    } catch (error) {
      console.error("Failed to load inventory:", error);
    }
  };

  const loadColleagueRequests = async () => {
    try {
      const response = await fetch('/api/requests/colleagues/public');
      if (response.ok) {
        const data = await response.json();
        console.log('Loaded colleague requests:', data);
        console.log('Number of requests:', data.length);
        console.log('Refreshment requests:', data.filter((r: any) => r.type === 'REFRESHMENT').length);
        setColleagueRequests(data || []);
      }
    } catch (error) {
      console.error("Failed to load colleague requests:", error);
    }
  };

  // Set active tab from URL parameter
  useEffect(() => {
    const tabParam = searchParams.get("tab");
    if (tabParam) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  const loadUserRequests = async () => {
    try {
      setLoading(true);
      // Use public endpoint with user ID
      if (user?.id) {
        console.log('Loading user requests for userId:', user.id);
        const response = await fetch(`/api/requests/my/public/${user.id}`);
        console.log('Response status:', response.status);
        if (response.ok) {
          const data = await response.json();
          console.log('Loaded user requests - raw data:', data);
          console.log('Number of requests:', data?.length);
          setUserRequests(data || []);
        } else {
          const errorText = await response.text();
          console.error('Failed to load user requests:', response.status, errorText);
          setUserRequests([]);
        }
      } else {
        console.log('No user ID available, skipping load');
      }
    } catch (error) {
      console.error("Failed to load requests:", error);
      setUserRequests([]);
    } finally {
      setLoading(false);
    }
  };

  // isAdminAssistant already defined above

  return (
    <PageLayout>
      <div className="space-y-6">
        {/* Header with New Request Button */}
        <div className="flex items-center justify-between">
          <div className="ml-1">
            <h1 className="text-2xl font-bold tracking-tight">Requests</h1>
            <p className="text-muted-foreground">
              Manage requests for refreshments, vehicles, boardrooms, and IT equipment
            </p>
          </div>
          <div className="mr-3">
            <NewRequestForm onSuccess={() => {
              // Refresh all requests data to show the new request
              loadUserRequests();
              if (isAdminAssistant) {
                loadColleagueRequests();
              }
            }} />
          </div>
        </div>

        {/* Request Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <Clock className="w-4 h-4 text-yellow-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{requestStats.pending}</p>
                  <p className="text-xs text-muted-foreground">{isAdminAssistant ? "To Review" : "Pending"}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{requestStats.approved}</p>
                  <p className="text-xs text-muted-foreground">Approved</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-100 rounded-lg">
                  <FileText className="w-4 h-4 text-red-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{requestStats.rejected}</p>
                  <p className="text-xs text-muted-foreground">Rejected</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <ClipboardList className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{requestStats.total}</p>
                  <p className="text-xs text-muted-foreground">Total Requests</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content with Tabs */}
        <div className="mx-[3px]">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <TabsList className={`grid w-full ${isAdminAssistant ? 'grid-cols-4' : 'grid-cols-2'}`}>
              {isAdminAssistant && (
                <TabsTrigger value="colleagues" className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Colleagues Requests
                </TabsTrigger>
              )}
            
              <TabsTrigger value="overview" className="flex items-center gap-2">
                <ClipboardList className="w-4 h-4" />
                Overview
              </TabsTrigger>
            
              <TabsTrigger value="my-requests" className="flex items-center gap-2">
                <User className="w-4 h-4" />
                My Requests
              </TabsTrigger>

              {isAdminAssistant && (
                <TabsTrigger value="inventory" className="flex items-center gap-2">
                  <Package className="w-4 h-4" />
                  Inventory
                </TabsTrigger>
              )}
            </TabsList>

          <TabsContent value="overview">
            <div className="grid gap-6" key={`overview-${colleagueRequests.length}-${userRequests.length}`}>
              {/* Quick Stats */}
              <div className={`grid grid-cols-1 ${isAdminAssistant ? 'md:grid-cols-2' : ''} gap-6`}>
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <ClipboardList className="w-5 h-5" />
                      Request Types
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 rounded-lg bg-linear-to-r from-amber-50 to-orange-50 border border-amber-200">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-amber-100 rounded-lg">
                            <Package className="w-4 h-4 text-amber-600" />
                          </div>
                          <span className="text-sm font-medium">Refreshments</span>
                        </div>
                        <Badge className="bg-amber-600 hover:bg-amber-700 text-white">{requestTypeStats.refreshments}</Badge>
                      </div>
                      {/* <div className="flex items-center justify-between p-3 rounded-lg bg-linear-to-r from-blue-50 to-cyan-50 border border-blue-200">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-blue-100 rounded-lg">
                            <FileText className="w-4 h-4 text-blue-600" />
                          </div>
                          <span className="text-sm font-medium">Vehicles</span>
                        </div>
                        <Badge className="bg-blue-600 hover:bg-blue-700 text-white">{requestTypeStats.vehicles}</Badge>
                      </div> */}
                      <div className="flex items-center justify-between p-3 rounded-lg bg-linear-to-r from-purple-50 to-pink-50 border border-purple-200">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-purple-100 rounded-lg">
                            <ClipboardList className="w-4 h-4 text-purple-600" />
                          </div>
                          <span className="text-sm font-medium">Boardrooms</span>
                        </div>
                        <Badge className="bg-purple-600 hover:bg-purple-700 text-white">{requestTypeStats.boardrooms}</Badge>
                      </div>
                      {/* <div className="flex items-center justify-between p-3 rounded-lg bg-linear-to-r from-green-50 to-emerald-50 border border-green-200">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-green-100 rounded-lg">
                            <Package className="w-4 h-4 text-green-600" />
                          </div>
                          <span className="text-sm font-medium">IT Equipment</span>
                        </div>
                        <Badge className="bg-green-600 hover:bg-green-700 text-white">{requestTypeStats.itEquipment}</Badge>
                      </div> */}
                    </div>
                  </CardContent>
                </Card>

                {isAdminAssistant && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <Package className="w-5 h-5" />
                        Stock Alerts
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {(() => {
                          const lowStockItems = inventoryItems.filter(item => {
                            const available = item.quantity - (item.givenOut || 0);
                            return available > 0 && available <= 10;
                          });
                          const expiringItems = inventoryItems.filter(item => {
                            if (!item.expiryDate) return false;
                            const expiryDate = new Date(item.expiryDate);
                            const today = new Date();
                            const daysUntilExpiry = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 3600 * 24));
                            return daysUntilExpiry <= 30 && daysUntilExpiry > 0;
                          });
                          const outOfStockItems = inventoryItems.filter(item => {
                            const available = item.quantity - (item.givenOut || 0);
                            return available <= 0;
                          });

                          return (
                            <>
                              <div className="p-3 rounded-lg bg-linear-to-r from-orange-50 to-red-50 border border-orange-200">
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center gap-3">
                                    <div className="p-2 bg-orange-100 rounded-lg">
                                      <AlertTriangle className="w-4 h-4 text-orange-600" />
                                    </div>
                                    <span className="text-sm font-medium">Low Stock</span>
                                  </div>
                                  <Badge className="bg-orange-600 hover:bg-orange-700 text-white">{lowStockItems.length}</Badge>
                                </div>
                                {lowStockItems.length > 0 && (
                                  <div className="pl-4 space-y-1">
                                    {lowStockItems.slice(0, 3).map(item => (
                                      <div key={item.id} className="flex items-center justify-between text-xs">
                                        <span className="text-muted-foreground">{item.name}</span>
                                        <span className="font-medium text-orange-600">{item.quantity - (item.givenOut || 0)} left</span>
                                      </div>
                                    ))}
                                    {lowStockItems.length > 3 && (
                                      <p className="text-xs text-muted-foreground italic">+{lowStockItems.length - 3} more</p>
                                    )}
                                  </div>
                                )}
                              </div>

                              <div className="p-3 rounded-lg bg-linear-to-r from-yellow-50 to-amber-50 border border-yellow-200">
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center gap-3">
                                    <div className="p-2 bg-yellow-100 rounded-lg">
                                      <Calendar className="w-4 h-4 text-yellow-600" />
                                    </div>
                                    <span className="text-sm font-medium">Expiring Soon</span>
                                  </div>
                                  <Badge className="bg-yellow-600 hover:bg-yellow-700 text-white">{expiringItems.length}</Badge>
                                </div>
                                {expiringItems.length > 0 && (
                                  <div className="pl-4 space-y-1">
                                    {expiringItems.slice(0, 3).map(item => (
                                      <div key={item.id} className="flex items-center justify-between text-xs">
                                        <span className="text-muted-foreground">{item.name}</span>
                                        <span className="font-medium text-yellow-600">
                                          {Math.ceil((new Date(item.expiryDate).getTime() - new Date().getTime()) / (1000 * 3600 * 24))} days
                                        </span>
                                      </div>
                                    ))}
                                    {expiringItems.length > 3 && (
                                      <p className="text-xs text-muted-foreground italic">+{expiringItems.length - 3} more</p>
                                    )}
                                  </div>
                                )}
                              </div>

                              <div className="p-3 rounded-lg bg-linear-to-r from-red-50 to-rose-50 border border-red-200">
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center gap-3">
                                    <div className="p-2 bg-red-100 rounded-lg">
                                      <AlertTriangle className="w-4 h-4 text-red-600" />
                                    </div>
                                    <span className="text-sm font-medium">Out of Stock</span>
                                  </div>
                                  <Badge className="bg-red-600 hover:bg-red-700 text-white">{outOfStockItems.length}</Badge>
                                </div>
                                {outOfStockItems.length > 0 && (
                                  <div className="pl-4 space-y-1">
                                    {outOfStockItems.slice(0, 3).map(item => (
                                      <div key={item.id} className="flex items-center justify-between text-xs">
                                        <span className="text-muted-foreground">{item.name}</span>
                                        <span className="font-medium text-red-600">0 left</span>
                                      </div>
                                    ))}
                                    {outOfStockItems.length > 3 && (
                                      <p className="text-xs text-muted-foreground italic">+{outOfStockItems.length - 3} more</p>
                                    )}
                                  </div>
                                )}
                              </div>
                            </>
                          );
                        })()}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </TabsContent>

          {isAdminAssistant && (
            <TabsContent value="colleagues">
              <ColleaguesRequestsList 
                key={colleagueRequests.length} 
                onRequestsChange={() => { loadUserRequests(); loadColleagueRequests(); }} 
              />
            </TabsContent>
          )}

          <TabsContent value="my-requests">
            <MyRequestsList 
              requests={userRequests} 
              loading={loading}
              onRequestsChange={loadUserRequests}
            />
          </TabsContent>

          {isAdminAssistant && (
            <TabsContent value="inventory">
              <InventoryManagement />
            </TabsContent>
          )}
        </Tabs>
        </div>
      </div>
    </PageLayout>
  );
}