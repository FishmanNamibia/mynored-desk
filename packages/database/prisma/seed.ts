import "dotenv/config";
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // Create sample users
  const lmatota = await prisma.user.upsert({
    where: { email: "lmatota@nsa.org.na" },
    update: {
      firstName: "Leon",
      lastName: "Matota",
      departmentName: "IT and Data Management",
      subDivision: "Business Information System",
      position: "Senior Software Engineer",
    },
    create: {
      username: "lmatota",
      email: "lmatota@nsa.org.na",
      password: "hashed_password", // In production, use proper hashing
      firstName: "Leon",
      lastName: "Matota",
      departmentName: "IT and Data Management",
      subDivision: "Business Information System",
      position: "Senior Software Engineer",
      employeeCode: "NSA-ICT-001",
    },
  });

  const admin = await prisma.user.upsert({
    where: { email: "admin@nsa.org.na" },
    update: {},
    create: {
      username: "admin",
      email: "admin@nsa.org.na",
      password: "hashed_password", // In production, use proper hashing
      firstName: "System",
      lastName: "Administrator",
      departmentName: "Administration",
      position: "System Admin",
      employeeCode: "NSA-SYS-000",
    },
  });

  const employee = await prisma.user.upsert({
    where: { email: "employee@nsa.org.na" },
    update: {},
    create: {
      username: "employee",
      email: "employee@nsa.org.na",
      password: "hashed_password",
      firstName: "Test",
      lastName: "Employee",
      departmentName: "Statistics",
      position: "Statistician",
      employeeCode: "NSA-STAT-100",
    },
  });

  console.log("✅ Users created");

  // Create Overtime Request Workflow
  const overtimeWorkflow = await prisma.workflowDefinition.upsert({
    where: { name: "Overtime Request" },
    update: {},
    create: {
      name: "Overtime Request",
      description:
        "Employee overtime approval workflow with supervisor and HR approval",
      module: "hr",
      category: "HR",
      icon: "Clock",
      isActive: true,
      config: {
        allowDraft: true,
        requiresInitialApproval: true,
        canEmployeeView: true,
      },
      steps: {
        create: [
          {
            name: "Supervisor Approval",
            order: 0,
            state: "SUBMITTED",
            assignmentType: "DYNAMIC",
            assignmentConfig: {
              dynamicRule: "reportingManager",
              fallbackRole: "ADMIN",
            },
            requiresApproval: true,
            allowsComment: true,
            canEdit: false,
            expectedDuration: 24,
            escalationDuration: 48,
            escalationConfig: {
              escalateTo: "ADMIN",
              notifyUsers: [],
            },
            nextStepsConfig: {
              onApprove: "SUPERVISOR_APPROVED",
              onReject: "REJECTED",
            },
          },
          {
            name: "HR Review",
            order: 1,
            state: "SUPERVISOR_APPROVED",
            assignmentType: "ROLE",
            assignmentConfig: {
              role: "ADMIN", // In production, would be HR role
            },
            requiresApproval: true,
            allowsComment: true,
            canEdit: false,
            expectedDuration: 24,
            escalationDuration: 48,
            escalationConfig: {
              escalateTo: "ADMIN",
              notifyUsers: [],
            },
            nextStepsConfig: {
              onApprove: "HR_APPROVED",
              onReject: "REJECTED",
              onReturn: "SUBMITTED",
            },
          },
          {
            name: "Processing",
            order: 2,
            state: "HR_APPROVED",
            assignmentType: "ROLE",
            assignmentConfig: {
              role: "ADMIN",
            },
            requiresApproval: true,
            allowsComment: false,
            canEdit: false,
            expectedDuration: 8,
            nextStepsConfig: {
              onApprove: "COMPLETED",
            },
          },
        ],
      },
    },
  });

  console.log("✅ Overtime workflow created");

  // Create Leave Request Workflow
  const leaveWorkflow = await prisma.workflowDefinition.upsert({
    where: { name: "Leave Request" },
    update: {},
    create: {
      name: "Leave Request",
      description: "Employee leave request approval workflow",
      module: "hr",
      category: "HR",
      icon: "Calendar",
      isActive: true,
      config: {
        allowDraft: true,
        requiresInitialApproval: true,
      },
      steps: {
        create: [
          {
            name: "Manager Approval",
            order: 0,
            state: "SUBMITTED",
            assignmentType: "DYNAMIC",
            assignmentConfig: {
              dynamicRule: "reportingManager",
              fallbackRole: "ADMIN",
            },
            requiresApproval: true,
            allowsComment: true,
            canEdit: false,
            expectedDuration: 48,
            nextStepsConfig: {
              onApprove: "MANAGER_APPROVED",
              onReject: "REJECTED",
            },
          },
          {
            name: "HR Processing",
            order: 1,
            state: "MANAGER_APPROVED",
            assignmentType: "ROLE",
            assignmentConfig: {
              role: "ADMIN",
            },
            requiresApproval: true,
            allowsComment: false,
            canEdit: false,
            expectedDuration: 24,
            nextStepsConfig: {
              onApprove: "COMPLETED",
              onReject: "REJECTED",
            },
          },
        ],
      },
    },
  });

  console.log("✅ Leave request workflow created");

  // Create Memo Approval Workflow
  const memoWorkflow = await prisma.workflowDefinition.upsert({
    where: { name: "Memo Approval" },
    update: {},
    create: {
      name: "Memo Approval",
      description: "Internal memo review and approval workflow",
      module: "memos",
      category: "Communication",
      icon: "FileText",
      isActive: true,
      config: {
        allowDraft: true,
        requiresInitialApproval: true,
      },
      steps: {
        create: [
          {
            name: "Department Head Review",
            order: 0,
            state: "SUBMITTED",
            assignmentType: "DYNAMIC",
            assignmentConfig: {
              dynamicRule: "departmentHead",
              fallbackRole: "ADMIN",
            },
            requiresApproval: true,
            allowsComment: true,
            canEdit: false,
            expectedDuration: 24,
            nextStepsConfig: {
              onApprove: "DEPT_APPROVED",
              onReject: "REJECTED",
            },
          },
          {
            name: "Final Approval",
            order: 1,
            state: "DEPT_APPROVED",
            assignmentType: "ROLE",
            assignmentConfig: {
              role: "ADMIN",
            },
            requiresApproval: true,
            allowsComment: true,
            canEdit: false,
            expectedDuration: 24,
            nextStepsConfig: {
              onApprove: "COMPLETED",
              onReject: "REJECTED",
            },
          },
        ],
      },
    },
  });

  console.log("✅ Memo workflow created");

  // Create License Renewal Workflow
  const licenseRenewalWorkflow = await prisma.workflowDefinition.upsert({
    where: { name: "License Renewal" },
    update: {},
    create: {
      name: "License Renewal",
      description:
        "Software license and subscription renewal approval workflow",
      module: "licenses",
      category: "IT",
      icon: "Key",
      isActive: true,
      config: {
        allowDraft: false,
        requiresInitialApproval: true,
        autoCreateTask: true,
      },
      steps: {
        create: [
          {
            name: "IT Manager Review",
            order: 0,
            state: "SUBMITTED",
            assignmentType: "ROLE",
            assignmentConfig: {
              role: "ADMIN", // In production, would be IT Manager role
            },
            requiresApproval: true,
            allowsComment: true,
            canEdit: false,
            expectedDuration: 48,
            nextStepsConfig: {
              onApprove: "IT_APPROVED",
              onReject: "REJECTED",
            },
          },
          {
            name: "Finance Approval",
            order: 1,
            state: "IT_APPROVED",
            assignmentType: "ROLE",
            assignmentConfig: {
              role: "ADMIN", // In production, would be Finance role
            },
            requiresApproval: true,
            allowsComment: true,
            canEdit: false,
            expectedDuration: 48,
            nextStepsConfig: {
              onApprove: "FINANCE_APPROVED",
              onReject: "REJECTED",
              onReturn: "SUBMITTED",
            },
          },
          {
            name: "Procurement",
            order: 2,
            state: "FINANCE_APPROVED",
            assignmentType: "ROLE",
            assignmentConfig: {
              role: "ADMIN",
            },
            requiresApproval: true,
            allowsComment: true,
            canEdit: false,
            expectedDuration: 120,
            nextStepsConfig: {
              onApprove: "COMPLETED",
            },
          },
        ],
      },
    },
  });

  console.log("✅ License renewal workflow created");

  // Create Departments
  const itDepartment = await prisma.department.upsert({
    where: { code: "ICT" },
    update: {},
    create: {
      code: "ICT",
      name: "IT and Data Management",
      managerId: "ad-guid-lmatota",
      managerName: "Leon Matota",
      managerEmail: "lmatota@nsa.org.na",
    },
  });

  const hrDepartment = await prisma.department.upsert({
    where: { code: "HR" },
    update: {},
    create: {
      code: "HR",
      name: "Human Resources",
      managerName: "HR Manager",
      managerEmail: "hr@nsa.org.na",
    },
  });

  const statsDepartment = await prisma.department.upsert({
    where: { code: "STATS" },
    update: {},
    create: {
      code: "STATS",
      name: "Statistics Division",
      managerName: "Statistics Manager",
      managerEmail: "stats@nsa.org.na",
    },
  });

  console.log("✅ Departments created");

  // Create Vendors
  const microsoft = await prisma.vendor.upsert({
    where: { name: "Microsoft Corporation" },
    update: {},
    create: {
      name: "Microsoft Corporation",
      contactName: "Enterprise Support",
      email: "support@microsoft.com",
      phone: "+1-800-642-7676",
      website: "https://www.microsoft.com",
      notes: "Primary software vendor for Office 365 and Azure services",
    },
  });

  const adobe = await prisma.vendor.upsert({
    where: { name: "Adobe Inc." },
    update: {},
    create: {
      name: "Adobe Inc.",
      contactName: "Enterprise Licensing",
      email: "enterprise@adobe.com",
      phone: "+1-800-833-6687",
      website: "https://www.adobe.com",
      notes: "Creative Cloud licenses for design team",
    },
  });

  const jetbrains = await prisma.vendor.upsert({
    where: { name: "JetBrains" },
    update: {},
    create: {
      name: "JetBrains",
      contactName: "Sales Team",
      email: "sales@jetbrains.com",
      website: "https://www.jetbrains.com",
      notes: "Development tools and IDEs",
    },
  });

  const digicert = await prisma.vendor.upsert({
    where: { name: "DigiCert" },
    update: {},
    create: {
      name: "DigiCert",
      contactName: "Certificate Services",
      email: "support@digicert.com",
      phone: "+1-801-701-9600",
      website: "https://www.digicert.com",
      notes: "SSL certificate provider",
    },
  });

  console.log("✅ Vendors created");

  // Create Systems
  const office365 = await prisma.system.upsert({
    where: { name: "Microsoft 365" },
    update: {},
    create: {
      name: "Microsoft 365",
      description: "Office productivity suite and cloud services",
      category: "Office Suite",
    },
  });

  const azure = await prisma.system.upsert({
    where: { name: "Microsoft Azure" },
    update: {},
    create: {
      name: "Microsoft Azure",
      description: "Cloud computing platform and services",
      category: "Cloud Infrastructure",
    },
  });

  const adobeCC = await prisma.system.upsert({
    where: { name: "Adobe Creative Cloud" },
    update: {},
    create: {
      name: "Adobe Creative Cloud",
      description: "Creative design and media production tools",
      category: "Design Software",
    },
  });

  const webInfra = await prisma.system.upsert({
    where: { name: "Web Infrastructure" },
    update: {},
    create: {
      name: "Web Infrastructure",
      description: "NSA public website and internal portals",
      category: "Infrastructure",
    },
  });

  const devTools = await prisma.system.upsert({
    where: { name: "Development Tools" },
    update: {},
    create: {
      name: "Development Tools",
      description: "Software development IDEs and tools",
      category: "Development",
    },
  });

  console.log("✅ Systems created");

  // Create Licenses
  const today = new Date();
  const oneMonthFromNow = new Date(today);
  oneMonthFromNow.setMonth(today.getMonth() + 1);
  const twoMonthsFromNow = new Date(today);
  twoMonthsFromNow.setMonth(today.getMonth() + 2);
  const sixMonthsFromNow = new Date(today);
  sixMonthsFromNow.setMonth(today.getMonth() + 6);
  const oneYearFromNow = new Date(today);
  oneYearFromNow.setFullYear(today.getFullYear() + 1);
  const oneYearAgo = new Date(today);
  oneYearAgo.setFullYear(today.getFullYear() - 1);

  // Critical - Expiring Soon
  const office365License = await prisma.license.upsert({
    where: { licenseKey: "M365-ENT-E3-2025" },
    update: {},
    create: {
      licenseKey: "M365-ENT-E3-2025",
      licenseType: "SUBSCRIPTION",
      status: "EXPIRING_SOON",
      vendorId: microsoft.id,
      systemId: office365.id,
      departmentId: itDepartment.id,
      productName: "Microsoft 365 E3",
      version: "Enterprise E3",
      edition: "Enterprise",
      userCount: 150,
      description:
        "Organization-wide Office 365 subscription with email, Teams, and Office apps",
      purchaseDate: oneYearAgo,
      startDate: oneYearAgo,
      expiryDate: oneMonthFromNow,
      renewalFrequency: "ANNUAL",
      autoRenew: true,
      renewalCost: 285000.0,
      currency: "NAD",
      alertThreshold: 30,
      supportContact: "Microsoft Enterprise Support",
      supportEmail: "support@microsoft.com",
      supportPhone: "+1-800-642-7676",
      documentationUrl: "https://docs.microsoft.com/office365",
      notes: "CRITICAL: Primary productivity suite for entire organization",
    },
  });

  // SSL Certificate - Expiring Soon
  const sslCert = await prisma.license.upsert({
    where: { licenseKey: "SSL-NSA-WILDCARD-2025" },
    update: {},
    create: {
      licenseKey: "SSL-NSA-WILDCARD-2025",
      licenseType: "SSL_CERTIFICATE",
      status: "EXPIRING_SOON",
      vendorId: digicert.id,
      systemId: webInfra.id,
      departmentId: itDepartment.id,
      productName: "DigiCert Wildcard SSL",
      version: "SHA-256",
      edition: "Organization Validation",
      description: "Wildcard SSL certificate for *.nsa.org.na domains",
      purchaseDate: twoMonthsFromNow,
      startDate: oneYearAgo,
      expiryDate: twoMonthsFromNow,
      renewalFrequency: "ANNUAL",
      autoRenew: true,
      renewalCost: 12500.0,
      currency: "NAD",
      alertThreshold: 45,
      supportContact: "DigiCert Support",
      supportEmail: "support@digicert.com",
      supportPhone: "+1-801-701-9600",
      documentationUrl: "https://digicert.com/support",
      notes: "CRITICAL: Required for all public NSA websites and portals",
    },
  });

  // Azure Subscription - Active
  const azureSubscription = await prisma.license.upsert({
    where: { licenseKey: "AZURE-PAY-AS-GO-2025" },
    update: {},
    create: {
      licenseKey: "AZURE-PAY-AS-GO-2025",
      licenseType: "CLOUD_SERVICE",
      status: "ACTIVE",
      vendorId: microsoft.id,
      systemId: azure.id,
      departmentId: itDepartment.id,
      productName: "Azure Cloud Services",
      version: "Pay-as-you-go",
      edition: "Enterprise",
      description:
        "Azure cloud infrastructure for hosting MyNSA Desk and other applications",
      purchaseDate: oneYearAgo,
      startDate: oneYearAgo,
      expiryDate: oneYearFromNow,
      renewalFrequency: "MONTHLY",
      autoRenew: true,
      renewalCost: 45000.0,
      currency: "NAD",
      alertThreshold: 30,
      supportContact: "Azure Support",
      supportEmail: "azuresupport@microsoft.com",
      documentationUrl: "https://docs.microsoft.com/azure",
      notes: "Monthly billing, hosts production and development environments",
    },
  });

  // Adobe Creative Cloud - Active
  const adobeLicense = await prisma.license.upsert({
    where: { licenseKey: "ADOBE-CC-TEAMS-2025" },
    update: {},
    create: {
      licenseKey: "ADOBE-CC-TEAMS-2025",
      licenseType: "SUBSCRIPTION",
      status: "ACTIVE",
      vendorId: adobe.id,
      systemId: adobeCC.id,
      departmentId: statsDepartment.id,
      productName: "Adobe Creative Cloud for Teams",
      version: "2025",
      edition: "Teams",
      userCount: 10,
      description: "Creative suite for publications and infographic team",
      purchaseDate: oneYearAgo,
      startDate: oneYearAgo,
      expiryDate: sixMonthsFromNow,
      renewalFrequency: "ANNUAL",
      autoRenew: false,
      renewalCost: 85000.0,
      currency: "NAD",
      alertThreshold: 60,
      supportContact: "Adobe Enterprise",
      supportEmail: "enterprise@adobe.com",
      documentationUrl: "https://helpx.adobe.com",
      notes:
        "Used by publications team for statistical reports and infographics",
    },
  });

  // JetBrains - Active
  const jetbrainsLicense = await prisma.license.upsert({
    where: { licenseKey: "JETBRAINS-ALL-2025" },
    update: {},
    create: {
      licenseKey: "JETBRAINS-ALL-2025",
      licenseType: "SOFTWARE_LICENSE",
      status: "ACTIVE",
      vendorId: jetbrains.id,
      systemId: devTools.id,
      departmentId: itDepartment.id,
      productName: "JetBrains All Products Pack",
      version: "2025.1",
      edition: "Commercial",
      userCount: 5,
      description: "Development IDEs for software development team",
      purchaseDate: oneYearAgo,
      startDate: oneYearAgo,
      expiryDate: oneYearFromNow,
      renewalFrequency: "ANNUAL",
      autoRenew: false,
      renewalCost: 22000.0,
      currency: "NAD",
      alertThreshold: 45,
      supportContact: "JetBrains Sales",
      supportEmail: "sales@jetbrains.com",
      documentationUrl: "https://jetbrains.com/support",
      notes: "Used by development team for building internal applications",
    },
  });

  console.log("✅ Licenses created");

  // Create License Alerts for expiring licenses
  await prisma.licenseAlert.create({
    data: {
      licenseId: office365License.id,
      alertType: "EXPIRY_CRITICAL",
      severity: "CRITICAL",
      message:
        "Microsoft 365 subscription expires in less than 30 days. Immediate action required!",
      daysUntilExpiry: 30,
      notificationSent: false,
    },
  });

  await prisma.licenseAlert.create({
    data: {
      licenseId: sslCert.id,
      alertType: "EXPIRY_CRITICAL",
      severity: "CRITICAL",
      message:
        "SSL Certificate for *.nsa.org.na expires in 2 months. Website security at risk!",
      daysUntilExpiry: 60,
      notificationSent: false,
    },
  });

  console.log("✅ License alerts created");

  console.log("🎉 Seeding complete!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
