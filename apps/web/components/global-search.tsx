"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search, FileText, Users, Folder, Clock, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface SearchResult {
  id: string;
  title: string;
  description: string;
  type: "document" | "resource" | "page" | "user";
  url: string;
  icon: React.ReactNode;
}

interface GlobalSearchProps {
  className?: string;
  inputClassName?: string;
  placeholder?: string;
}

export function GlobalSearch({ 
  className, 
  inputClassName,
  placeholder = "Search resources, documents..." 
}: GlobalSearchProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  // Load recent searches from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("recentSearches");
    if (saved) {
      setRecentSearches(JSON.parse(saved));
    }
  }, []);

  // Save recent searches
  const saveRecentSearch = (query: string) => {
    const updated = [query, ...recentSearches.filter(q => q !== query)].slice(0, 5);
    setRecentSearches(updated);
    localStorage.setItem("recentSearches", JSON.stringify(updated));
  };

  // Search function
  const performSearch = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);

    // Comprehensive search index - replace with actual API call
    const mockResults: SearchResult[] = [
      // Main Pages
      {
        id: "1",
        title: "Dashboard",
        description: "Main dashboard with overview and quick actions",
        type: "page",
        url: "/dashboard",
        icon: <Folder className="w-4 h-4" />
      },
      {
        id: "2",
        title: "Profile Settings",
        description: "Manage your account details, security, and workspace preferences",
        type: "page",
        url: "/dashboard/settings",
        icon: <Folder className="w-4 h-4" />
      },
      {
        id: "3",
        title: "Memos",
        description: "View and manage internal memos and communications",
        type: "page",
        url: "/dashboard/memos",
        icon: <Folder className="w-4 h-4" />
      },
      
      // Reports Section
      {
        id: "4",
        title: "Reports Dashboard",
        description: "High-level analytics, key performance indicators, and report management",
        type: "page",
        url: "/dashboard/reports",
        icon: <FileText className="w-4 h-4" />
      },
      {
        id: "5",
        title: "Performance Reports",
        description: "Detailed performance analytics, ratings, and employee trends",
        type: "page",
        url: "/dashboard/reports/performance",
        icon: <FileText className="w-4 h-4" />
      },
      {
        id: "6",
        title: "Task Reports",
        description: "Task completion, SLA compliance, and workload distribution analytics",
        type: "page",
        url: "/dashboard/reports/tasks",
        icon: <FileText className="w-4 h-4" />
      },
      {
        id: "7",
        title: "Custom Reports",
        description: "Build, manage, and schedule custom reports tailored to your needs",
        type: "page",
        url: "/dashboard/reports/custom",
        icon: <FileText className="w-4 h-4" />
      },
      
      // Performance Management System
      {
        id: "8",
        title: "Performance Management System",
        description: "Comprehensive performance management and tracking system",
        type: "page",
        url: "/dashboard/performance",
        icon: <Folder className="w-4 h-4" />
      },
      {
        id: "9",
        title: "Performance Overview",
        description: "Real-time overview of organizational performance metrics",
        type: "page",
        url: "/dashboard/performance/dashboard/overview",
        icon: <Folder className="w-4 h-4" />
      },
      {
        id: "10",
        title: "My Performance Agreement",
        description: "View and manage your performance agreement and goals",
        type: "page",
        url: "/dashboard/performance/dashboard/my-tasks/performance",
        icon: <FileText className="w-4 h-4" />
      },
      {
        id: "11",
        title: "My Tasks",
        description: "View and manage your assigned tasks and deadlines",
        type: "page",
        url: "/dashboard/performance/dashboard/my-tasks",
        icon: <FileText className="w-4 h-4" />
      },
      {
        id: "12",
        title: "Task Management",
        description: "Manage organizational tasks and assignments",
        type: "page",
        url: "/dashboard/performance/dashboard/goals",
        icon: <FileText className="w-4 h-4" />
      },
      {
        id: "13",
        title: "Performance Reviews",
        description: "Individual performance review and evaluation",
        type: "page",
        url: "/dashboard/performance/dashboard/performance-reviews",
        icon: <FileText className="w-4 h-4" />
      },
      {
        id: "14",
        title: "360 Degree Rating",
        description: "Comprehensive 360-degree performance feedback",
        type: "page",
        url: "/dashboard/performance/dashboard/360-degree",
        icon: <FileText className="w-4 h-4" />
      },
      {
        id: "15",
        title: "Approvals",
        description: "Review and approve pending performance agreements and tasks",
        type: "page",
        url: "/dashboard/performance/dashboard/approvals",
        icon: <FileText className="w-4 h-4" />
      },
      {
        id: "16",
        title: "User Management",
        description: "Manage users, roles, and permissions",
        type: "page",
        url: "/dashboard/performance/dashboard/user-management",
        icon: <Users className="w-4 h-4" />
      },
      {
        id: "17",
        title: "Audit Logs",
        description: "View system audit logs and activity history",
        type: "page",
        url: "/dashboard/performance/dashboard/audit-logs",
        icon: <FileText className="w-4 h-4" />
      },
      {
        id: "18",
        title: "Help Assistant Stats",
        description: "View help assistant usage statistics and analytics",
        type: "page",
        url: "/dashboard/performance/dashboard/help-assistant-stats",
        icon: <FileText className="w-4 h-4" />
      },
      {
        id: "19",
        title: "Performance Cycles",
        description: "Manage performance periods and cycles",
        type: "page",
        url: "/dashboard/performance/dashboard/settings/performance-period",
        icon: <FileText className="w-4 h-4" />
      },
      
      // Documents & Resources
      {
        id: "20",
        title: "Performance Agreement Template",
        description: "Standard template for performance agreements",
        type: "document",
        url: "/dashboard/performance/documents/template",
        icon: <FileText className="w-4 h-4" />
      },
      {
        id: "21",
        title: "User Guide",
        description: "Complete guide for using the NORED Desk platform",
        type: "document",
        url: "/dashboard/resources/user-guide",
        icon: <FileText className="w-4 h-4" />
      },
      {
        id: "22",
        title: "HR Policies",
        description: "Human resources policies and procedures",
        type: "resource",
        url: "/dashboard/resources/hr-policies",
        icon: <FileText className="w-4 h-4" />
      },
      {
        id: "23",
        title: "IT Support",
        description: "Technical support and troubleshooting resources",
        type: "resource",
        url: "/dashboard/resources/it-support",
        icon: <FileText className="w-4 h-4" />
      },
      {
        id: "24",
        title: "Engineering Services",
        description: "Engineering operations, design review, and connection delivery workspace",
        type: "page",
        url: "/dashboard/engineering-services",
        icon: <Folder className="w-4 h-4" />
      },
      {
        id: "25",
        title: "New Connection Management",
        description: "Track customer applications, technical review, approvals, and energization handover",
        type: "page",
        url: "/dashboard/engineering-services/new-connection-management",
        icon: <FileText className="w-4 h-4" />
      },
    ];

    // Filter results based on query
    const filtered = mockResults.filter(result =>
      result.title.toLowerCase().includes(query.toLowerCase()) ||
      result.description.toLowerCase().includes(query.toLowerCase())
    );

    setTimeout(() => {
      setSearchResults(filtered);
      setIsSearching(false);
    }, 300);
  }, []);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery) {
        performSearch(searchQuery);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, performSearch]);

  // Handle result click
  const handleResultClick = (result: SearchResult) => {
    saveRecentSearch(searchQuery);
    setShowResults(false);
    setSearchQuery("");
    router.push(result.url);
  };

  // Handle recent search click
  const handleRecentSearchClick = (query: string) => {
    setSearchQuery(query);
    setShowResults(true);
  };

  // Clear recent searches
  const clearRecentSearches = () => {
    setRecentSearches([]);
    localStorage.removeItem("recentSearches");
  };

  return (
    <div className={cn("relative", className)}>
      <div className="relative">
        <Search 
          className="absolute left-4 top-1/2 -translate-y-1/2 w-4 lg:w-5 h-4 lg:h-5 text-white/40" 
        />
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onFocus={() => setShowResults(true)}
          onBlur={() => setTimeout(() => setShowResults(false), 200)}
          placeholder={placeholder}
          className={cn(
            "pl-10 lg:pl-12 pr-4 h-9 lg:h-11 border border-white/10 text-white placeholder:text-white/40 focus-visible:ring-0 focus:border-white/20 text-sm",
            inputClassName
          )}
          style={{
            backgroundColor: "rgba(0,0,0,0.25)",
            borderRadius: "24px",
          }}
        />
      </div>

      {/* Search Results Dropdown */}
      {showResults && (
        <div 
          className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 max-h-96 overflow-y-auto z-50 mx-2 sm:mx-0 sm:w-full sm:min-w-[400px]"
        >
          {/* Recent Searches */}
          {!searchQuery && recentSearches.length > 0 && (
            <div className="p-3 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                  Recent Searches
                </span>
                <button
                  onClick={clearRecentSearches}
                  className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  Clear
                </button>
              </div>
              {recentSearches.map((query, index) => (
                <button
                  key={index}
                  onClick={() => handleRecentSearchClick(query)}
                  className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                >
                  <Clock className="w-4 h-4 text-gray-400" />
                  {query}
                </button>
              ))}
            </div>
          )}

          {/* Search Results */}
          {searchQuery && (
            <>
              {isSearching ? (
                <div className="p-4 text-center text-sm text-gray-500">
                  Searching...
                </div>
              ) : searchResults.length > 0 ? (
                <div className="p-2">
                  <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase px-3 py-2">
                    Results ({searchResults.length})
                  </div>
                  {searchResults.map((result) => (
                    <button
                      key={result.id}
                      onClick={() => handleResultClick(result)}
                      className="flex items-start gap-3 w-full px-3 py-2.5 text-left hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                    >
                      <div className="mt-1 text-gray-400 dark:text-gray-500">
                        {result.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                          {result.title}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
                          {result.description}
                        </div>
                        <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                          {result.type.charAt(0).toUpperCase() + result.type.slice(1)}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="p-4 text-center text-sm text-gray-500">
                  No results found for "{searchQuery}"
                </div>
              )}
            </>
          )}

          {/* Empty state */}
          {!searchQuery && recentSearches.length === 0 && (
            <div className="p-4 text-center text-sm text-gray-500">
              Start typing to search resources, documents, and pages
            </div>
          )}
        </div>
      )}
    </div>
  );
}
