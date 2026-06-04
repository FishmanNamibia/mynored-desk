"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Shield,
  Lock,
  AlertCircle,
  Download,
  Calendar,
  Search,
  Eye,
  FileText,
  CheckCircle,
  Clock,
} from "lucide-react";
import { useState } from "react";

export default function ITPoliciesPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");

  const policies = [
    {
      id: 1,
      name: "Password Management Policy",
      category: "Security",
      description:
        "Guidelines for creating and managing strong passwords, MFA requirements, and password reset procedures.",
      effectiveDate: "Jan 1, 2024",
      lastUpdated: "Dec 15, 2025",
      status: "active",
      version: "2.1",
    },
    {
      id: 2,
      name: "Data Protection & Privacy",
      category: "Data Protection",
      description:
        "Comprehensive guidelines on handling, storing, and protecting sensitive personal and organizational data.",
      effectiveDate: "Jan 1, 2024",
      lastUpdated: "Nov 20, 2025",
      status: "active",
      version: "1.8",
    },
    {
      id: 3,
      name: "Acceptable Use of IT Resources",
      category: "Acceptable Use",
      description:
        "Policy outlining appropriate use of company computers, networks, and internet access.",
      effectiveDate: "Mar 15, 2023",
      lastUpdated: "Oct 10, 2025",
      status: "active",
      version: "3.2",
    },
    {
      id: 4,
      name: "Remote Work & VPN Access",
      category: "Security",
      description:
        "Security requirements for remote work, VPN usage, and accessing corporate resources from home.",
      effectiveDate: "May 1, 2023",
      lastUpdated: "Jan 5, 2026",
      status: "active",
      version: "2.0",
    },
  ];

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "Security":
        return "bg-red-100 text-red-800";
      case "Data Protection":
        return "bg-purple-100 text-purple-800";
      case "Acceptable Use":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const filteredPolicies = policies.filter((policy) => {
    const matchesSearch =
      policy.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      policy.description.toLowerCase().includes(searchQuery.toLowerCase());

    if (activeTab === "all") return matchesSearch;
    return matchesSearch && policy.category === activeTab;
  });

  return (
    <div className="w-full px-6 py-8 space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight mb-1 text-foreground">
          IT Policies
        </h1>
        <p className="text-sm text-muted-foreground">
          Review and download IT policies that govern the use of corporate
          resources
        </p>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">
                  Total Policies
                </p>
                <p className="text-2xl font-bold">{policies.length}</p>
              </div>
              <FileText className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Active</p>
                <p className="text-2xl font-bold">
                  {policies.filter((p) => p.status === "active").length}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Categories</p>
                <p className="text-2xl font-bold">4</p>
              </div>
              <Shield className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">
                  Last Updated
                </p>
                <p className="text-sm font-bold">Jan 10, 2026</p>
              </div>
              <Clock className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card>
        <CardHeader>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search policies by name or keyword..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </CardHeader>
      </Card>

      {/* Tabs and Grid */}
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-6"
      >
        <TabsList className="h-10">
          <TabsTrigger value="all" className="px-4">
            All Policies
          </TabsTrigger>
          <TabsTrigger value="Security" className="px-4">
            Security
          </TabsTrigger>
          <TabsTrigger value="Data Protection" className="px-4">
            Data Protection
          </TabsTrigger>
          <TabsTrigger value="Acceptable Use" className="px-4">
            Acceptable Use
          </TabsTrigger>
          <TabsTrigger value="Operations" className="px-4">
            Operations
          </TabsTrigger>
        </TabsList>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPolicies.map((policy) => (
            <Card
              key={policy.id}
              className="hover:shadow-lg transition-shadow h-full flex flex-col"
            >
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{policy.name}</CardTitle>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge className={getCategoryColor(policy.category)}>
                        {policy.category}
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col justify-between space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">
                    {policy.description}
                  </p>
                  <div className="mt-4 space-y-2 text-xs text-muted-foreground">
                    <p>
                      <strong>Effective Date:</strong> {policy.effectiveDate}
                    </p>
                    <p>
                      <strong>Last Updated:</strong> {policy.lastUpdated}
                    </p>
                    <p>
                      <strong>Version:</strong> {policy.version}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2 pt-4">
                  <Button variant="outline" className="flex-1" size="sm">
                    <Eye className="h-4 w-4 mr-2" />
                    View
                  </Button>
                  <Button variant="outline" size="sm">
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </Tabs>
    </div>
  );
}
