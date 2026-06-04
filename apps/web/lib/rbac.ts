export const engineeringWorkflowRoleDefinitions = [
  {
    key: "engineering_request_initiator",
    name: "Request Initiator",
    description:
      "Captures a new connection request and submits it into the workflow for processing.",
  },
  {
    key: "engineering_application_processor",
    name: "Application Processor",
    description:
      "Reviews and updates the application record, verifies required information, and ensures the profile is complete.",
  },
  {
    key: "engineering_technical_reviewer",
    name: "Technical Reviewer / Supervisor",
    description:
      "Reviews the work done, confirms readiness for the next stage, and approves the application to proceed.",
  },
  {
    key: "engineering_connection_finaliser",
    name: "Connection Finaliser",
    description:
      "Completes the close-out process, confirms energisation, updates the final record, and moves it to active connections.",
  },
] as const;

export type EngineeringWorkflowRole =
  (typeof engineeringWorkflowRoleDefinitions)[number]["key"];

export type UserRole =
  | "admin"
  | "manager"
  | "employee"
  | "hr"
  | "finance"
  | "it"
  | "administrative_assistant"
  | EngineeringWorkflowRole;

export const sharedDeskRoles: UserRole[] = [
  "admin",
  "manager",
  "employee",
  "hr",
  "finance",
  "it",
];

export const engineeringModuleRoles: UserRole[] = [
  ...sharedDeskRoles,
  ...engineeringWorkflowRoleDefinitions.map(
    (roleDefinition) => roleDefinition.key,
  ),
];

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  name: string;
  email: string;
  role: UserRole;
  department?: string;
  subDivision?: string;
  position?: string;
  employeeCode?: string;
  avatar?: string;
}

export interface ModuleAccess {
  view: boolean;
  create: boolean;
  edit: boolean;
  delete: boolean;
  approve?: boolean;
}

export interface Module {
  id: string;
  name: string;
  href: string;
  icon: string;
  description: string;
  subItems?: SubItem[];
  requiredRoles: UserRole[];
}

export interface SubItem {
  name: string;
  href: string;
  requiredRoles: UserRole[];
}

// Temporary mock user for UI development and environments where
// backend-driven roles are not yet wired into the frontend.
// Components that import this should eventually be updated to
// consume the real authenticated user from auth-context.
export const mockUser: User = {
  id: "mock-user",
  firstName: "Demo",
  lastName: "User",
  name: "Demo User",
  email: "demo.user@nored.local",
  role: "employee",
  department: "NORED",
  position: "Staff Member",
};

// Module definitions with RBAC
export const modules: Module[] = [
  {
    id: "dashboard",
    name: "NORED Desk",
    href: "/dashboard",
    icon: "LayoutDashboard",
    description: "Your workspace overview",
    requiredRoles: engineeringModuleRoles,
  },
  {
    id: "memos",
    name: "Memo Management",
    href: "/dashboard/memos",
    icon: "FileText",
    description: "Digital memos & communications",
    requiredRoles: ["admin", "manager", "employee", "hr", "finance", "it"],
    subItems: [
      {
        name: "All Memos",
        href: "/dashboard/memos",
        requiredRoles: ["admin", "manager", "employee", "hr", "finance", "it"],
      },
      {
        name: "Create Memo",
        href: "/dashboard/memos/create",
        requiredRoles: ["admin", "manager", "employee", "hr", "finance", "it"],
      },
      {
        name: "My Memos",
        href: "/dashboard/memos/my-memos",
        requiredRoles: ["admin", "manager", "employee", "hr", "finance", "it"],
      },
      {
        name: "Memo Templates",
        href: "/dashboard/memos/templates",
        requiredRoles: ["admin", "manager", "employee", "hr", "finance", "it"],
      },
      {
        name: "Draft Memos",
        href: "/dashboard/memos/drafts",
        requiredRoles: ["admin", "manager", "employee", "hr", "finance", "it"],
      },
      {
        name: "Pending Approval",
        href: "/dashboard/memos/pending",
        requiredRoles: ["admin", "manager"],
      },
      {
        name: "Approved",
        href: "/dashboard/memos/approved",
        requiredRoles: ["admin", "manager", "employee", "hr", "finance", "it"],
      },
      {
        name: "Initiator Review",
        href: "/dashboard/memos/review/initiator",
        requiredRoles: ["admin", "manager", "employee", "hr", "finance", "it"],
      },
      {
        name: "Manager Review",
        href: "/dashboard/memos/review/manager",
        requiredRoles: ["admin", "manager"],
      },
      {
        name: "Senior Manager Review",
        href: "/dashboard/memos/review/senior",
        requiredRoles: ["admin", "manager"],
      },
      {
        name: "Executive Review",
        href: "/dashboard/memos/review/executive",
        requiredRoles: ["admin", "manager"],
      },
      {
        name: "PMU Review",
        href: "/dashboard/memos/review/pmu",
        requiredRoles: ["admin", "manager", "finance"],
      },
      {
        name: "SG Review",
        href: "/dashboard/memos/review/sg",
        requiredRoles: ["admin"],
      },
      {
        name: "Admin Panel",
        href: "/dashboard/memos/admin",
        requiredRoles: ["admin"],
      },
    ],
  },
  {
    id: "tasks",
    name: "Task Management",
    href: "/dashboard/tasks",
    icon: "CheckSquare",
    description: "Tasks & projects",
    requiredRoles: ["admin", "manager", "employee", "hr", "finance", "it"],
    subItems: [
      {
        name: "My Tasks",
        href: "/dashboard/performance/my-tasks",
        requiredRoles: ["admin", "manager", "employee", "hr", "finance", "it"],
      },
      {
        name: "Team Tasks",
        href: "/dashboard/tasks/team",
        requiredRoles: ["admin", "manager"],
      },
      {
        name: "Projects",
        href: "/dashboard/tasks/projects",
        requiredRoles: ["admin", "manager", "employee"],
      },
      {
        name: "Calendar View",
        href: "/dashboard/tasks/calendar",
        requiredRoles: ["admin", "manager", "employee", "hr", "finance", "it"],
      },
    ],
  },
  {
    id: "performance",
    name: "Performance Management",
    href: "/dashboard/performance",
    icon: "TrendingUp",
    description: "Reviews & appraisals",
    requiredRoles: ["admin", "manager", "employee", "hr"],
    subItems: [
      {
        name: "My Reviews",
        href: "/dashboard/performance/dashboard/performance-reviews",
        requiredRoles: ["admin", "manager", "employee", "hr"],
      },
      {
        name: "Performance Agreements",
        href: "/dashboard/performance/dashboard/my-tasks/performance",
        requiredRoles: ["admin", "manager", "employee", "hr"],
      },
      {
        name: "Pending Reviews",
        href: "/dashboard/performance/dashboard/approvals",
        requiredRoles: ["admin", "manager", "hr"],
      },
      {
        name: "360 Feedback",
        href: "/dashboard/performance/dashboard/360-degree",
        requiredRoles: ["admin", "manager", "employee", "hr"],
      },
      {
        name: "Team Performance",
        href: "/dashboard/performance/dashboard/departmental",
        requiredRoles: ["admin", "manager", "hr"],
      },
      {
        name: "Reports",
        href: "/dashboard/performance/dashboard/reports",
        requiredRoles: ["admin", "hr"],
      },
    ],
  },
  {
    id: "admin",
    name: "Requests",
    href: "/dashboard/requests",
    icon: "ClipboardList",
    description: "Request management system",
    requiredRoles: ["admin", "manager", "employee", "hr", "finance", "it"],
    subItems: [
      {
        name: "Overview",
        href: "/dashboard/requests",
        requiredRoles: ["admin", "manager", "employee", "hr", "finance", "it"],
      },
      {
        name: "My Requests",
        href: "/dashboard/requests?tab=my-requests",
        requiredRoles: ["admin", "manager", "employee", "hr", "finance", "it"],
      },
      {
        name: "Pending Approval",
        href: "/dashboard/requests?tab=pending",
        requiredRoles: ["admin", "manager", "administrative_assistant"],
      },
      {
        name: "Inventory Management",
        href: "/dashboard/requests?tab=inventory",
        requiredRoles: ["admin", "manager", "administrative_assistant"],
      },
    ],
  },
  {
    id: "hr",
    name: "Human Capital",
    href: "/dashboard/hr",
    icon: "Users",
    description: "Leave & employee services",
    requiredRoles: ["admin", "manager", "employee", "hr", "finance", "it"],
    subItems: [
      {
        name: "My Leave",
        href: "/dashboard/hr/leave",
        requiredRoles: ["admin", "manager", "employee", "hr", "finance", "it"],
      },
      {
        name: "Apply for Leave",
        href: "/dashboard/hr/leave/apply",
        requiredRoles: ["admin", "manager", "employee", "hr", "finance", "it"],
      },
      {
        name: "Leave Balance",
        href: "/dashboard/hr/leave/balance",
        requiredRoles: ["admin", "manager", "employee", "hr", "finance", "it"],
      },
      {
        name: "Team Leave",
        href: "/dashboard/hr/leave/team",
        requiredRoles: ["admin", "manager", "hr"],
      },
      {
        name: "Leave Calendar",
        href: "/dashboard/hr/leave/calendar",
        requiredRoles: ["admin", "manager", "hr"],
      },
      {
        name: "Employees",
        href: "/dashboard/hr/employees",
        requiredRoles: ["admin", "hr"],
      },
      {
        name: "Recruitment",
        href: "/dashboard/hr/recruitment",
        requiredRoles: ["admin", "hr"],
      },
      {
        name: "Training",
        href: "/dashboard/hr/training",
        requiredRoles: ["admin", "hr"],
      },
      {
        name: "Payroll",
        href: "/dashboard/hr/payroll",
        requiredRoles: ["admin", "hr"],
      },
    ],
  },
  {
    id: "it",
    name: "IT Services",
    href: "/dashboard/it",
    icon: "Laptop",
    description: "Technology support & requests",
    requiredRoles: ["admin", "manager", "employee", "hr", "finance", "it"],
    subItems: [
      {
        name: "My Requests",
        href: "/dashboard/it",
        requiredRoles: ["admin", "manager", "employee", "hr", "finance", "it"],
      },
      {
        name: "Equipment Request",
        href: "/dashboard/it/equipment",
        requiredRoles: ["admin", "manager", "employee", "hr", "finance", "it"],
      },
      {
        name: "Password Management",
        href: "/dashboard/it/password",
        requiredRoles: ["admin", "manager", "employee", "hr", "finance", "it"],
      },
      {
        name: "IT Policies",
        href: "/dashboard/it/policies",
        requiredRoles: ["admin", "manager", "employee", "hr", "finance", "it"],
      },
      {
        name: "Support Tickets",
        href: "/dashboard/it/tickets",
        requiredRoles: ["admin", "manager", "employee", "hr", "finance", "it"],
      },
      {
        name: "Asset Management",
        href: "/dashboard/it/assets",
        requiredRoles: ["admin", "it"],
      },
      {
        name: "License Management",
        href: "/dashboard/licenses",
        requiredRoles: ["admin", "it"],
      },
      {
        name: "System Status",
        href: "/dashboard/it/status",
        requiredRoles: ["admin", "it"],
      },
    ],
  },
  {
    id: "licenses",
    name: "License Management",
    href: "/dashboard/licenses",
    icon: "Key",
    description: "Software licenses & subscriptions",
    requiredRoles: ["admin", "it"],
    subItems: [
      {
        name: "Overview",
        href: "/dashboard/licenses",
        requiredRoles: ["admin", "it"],
      },
      {
        name: "Active Licenses",
        href: "/dashboard/licenses?tab=active",
        requiredRoles: ["admin", "it"],
      },
      {
        name: "Expiring Soon",
        href: "/dashboard/licenses?tab=expiring",
        requiredRoles: ["admin", "it"],
      },
      {
        name: "Vendors",
        href: "/dashboard/licenses?tab=vendors",
        requiredRoles: ["admin", "it"],
      },
      {
        name: "Systems",
        href: "/dashboard/licenses?tab=systems",
        requiredRoles: ["admin", "it"],
      },
    ],
  },
  {
    id: "engineering-services",
    name: "Engineering Services",
    href: "/dashboard/engineering-services",
    icon: "Cable",
    description: "Connections, design reviews, and field delivery",
    requiredRoles: engineeringModuleRoles,
    subItems: [
      {
        name: "Overview",
        href: "/dashboard/engineering-services/new-connection-management",
        requiredRoles: engineeringModuleRoles,
      },
      {
        name: "Capture",
        href: "/dashboard/engineering-services/new-connection-management/capture",
        requiredRoles: engineeringModuleRoles,
      },
      {
        name: "Operations",
        href: "/dashboard/engineering-services/new-connection-management/operations",
        requiredRoles: engineeringModuleRoles,
      },
      {
        name: "Register",
        href: "/dashboard/engineering-services/new-connection-management/register",
        requiredRoles: engineeringModuleRoles,
      },
      {
        name: "Reports",
        href: "/dashboard/engineering-services/new-connection-management/reports",
        requiredRoles: engineeringModuleRoles,
      },
    ],
  },
  {
    id: "documents",
    name: "Documents",
    href: "/dashboard/documents",
    icon: "FolderOpen",
    description: "Document management & storage",
    requiredRoles: ["admin", "manager", "employee", "hr", "finance", "it"],
    subItems: [
      {
        name: "My Documents",
        href: "/dashboard/documents",
        requiredRoles: ["admin", "manager", "employee", "hr", "finance", "it"],
      },
      {
        name: "Shared With Me",
        href: "/dashboard/documents/shared",
        requiredRoles: ["admin", "manager", "employee", "hr", "finance", "it"],
      },
      {
        name: "Department Files",
        href: "/dashboard/documents/department",
        requiredRoles: ["admin", "manager", "employee", "hr", "finance", "it"],
      },
      {
        name: "Policies & Procedures",
        href: "/dashboard/resources/policies",
        requiredRoles: ["admin", "manager", "employee", "hr", "finance", "it"],
      },
      {
        name: "Templates",
        href: "/dashboard/documents/templates",
        requiredRoles: ["admin", "manager", "employee", "hr", "finance", "it"],
      },
      {
        name: "Archive",
        href: "/dashboard/documents/archive",
        requiredRoles: ["admin", "manager"],
      },
      {
        name: "Trash",
        href: "/dashboard/documents/trash",
        requiredRoles: ["admin", "manager", "employee", "hr", "finance", "it"],
      },
    ],
  },
  {
    id: "reports",
    name: "Reports & Analytics",
    href: "/dashboard/reports",
    icon: "BarChart3",
    description: "Data & insights",
    requiredRoles: ["admin", "manager"],
    subItems: [
      {
        name: "Dashboard",
        href: "/dashboard/reports",
        requiredRoles: ["admin", "manager"],
      },
      {
        name: "Performance Reports",
        href: "/dashboard/reports/performance",
        requiredRoles: ["admin", "manager"],
      },
      {
        name: "Task Reports",
        href: "/dashboard/reports/tasks",
        requiredRoles: ["admin", "manager"],
      },
      {
        name: "Custom Reports",
        href: "/dashboard/reports/custom",
        requiredRoles: ["admin"],
      },
    ],
  },
  {
    id: "settings",
    name: "Settings",
    href: "/dashboard/settings",
    icon: "Settings",
    description: "Personal & system settings",
    requiredRoles: ["admin", "manager", "employee", "hr", "finance", "it"],
    subItems: [
      {
        name: "Profile",
        href: "/dashboard/settings",
        requiredRoles: ["admin", "manager", "employee", "hr", "finance", "it"],
      },
      {
        name: "User Management",
        href: "/dashboard/settings/user-management",
        requiredRoles: ["admin", "hr"],
      },
      {
        name: "Users & Roles",
        href: "/dashboard/settings/users",
        requiredRoles: ["admin"],
      },
      {
        name: "Departments",
        href: "/dashboard/settings/departments",
        requiredRoles: ["admin"],
      },
      {
        name: "Integrations",
        href: "/dashboard/settings/integrations",
        requiredRoles: ["admin"],
      },
    ],
  },
];

// Check if user has access to a module
export function hasModuleAccess(userRole: UserRole, module: Module): boolean {
  return module.requiredRoles.includes(userRole);
}

// Get accessible modules for a user
export function getAccessibleModules(userRole: UserRole): Module[] {
  return modules.filter((module) => hasModuleAccess(userRole, module));
}

// Get accessible sub-items for a module
export function getAccessibleSubItems(
  userRole: UserRole,
  module: Module,
): SubItem[] {
  if (!module.subItems) return [];
  return module.subItems.filter((subItem) =>
    subItem.requiredRoles.includes(userRole),
  );
}

// Default/fallback user object for UI - will be replaced with real user data from backend
