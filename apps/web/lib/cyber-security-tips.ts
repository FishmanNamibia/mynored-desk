export interface CyberSecurityTip {
  id: number;
  title: string;
  tip: string;
  category: string;
}

export const CYBER_TIP_STORAGE_KEY = "nored_cyber_tip_dismissed";

export const CYBER_SECURITY_TIPS: CyberSecurityTip[] = [
  {
    id: 1,
    title: "Protect Utility System Access",
    category: "Data Protection",
    tip: "Use strong, unique passwords for billing, outage, finance, and operations systems. Store them in an approved password manager and never reuse shared credentials.",
  },
  {
    id: 2,
    title: "Use Two-Factor Authentication Everywhere",
    category: "Authentication",
    tip: "Enable 2FA on email, VPN, cloud dashboards, and privileged admin accounts. Authenticator apps are preferred over SMS where possible.",
  },
  {
    id: 3,
    title: "Keep Operations Software Updated",
    category: "System Security",
    tip: "Install approved updates for laptops, field tablets, routers, and office systems promptly. Timely patching reduces exposure to known vulnerabilities.",
  },
  {
    id: 4,
    title: "Verify Payment and Vendor Emails",
    category: "Email Security",
    tip: "Treat bank-detail changes, invoice requests, and urgent payment instructions as suspicious until confirmed through a trusted NORED contact.",
  },
  {
    id: 5,
    title: "Protect Field Connectivity",
    category: "Network Security",
    tip: "Use secure hotspots or VPN when crews connect from the field. Avoid public Wi-Fi for work involving outage reports, customer records, or internal systems.",
  },
  {
    id: 6,
    title: "Back Up Critical Records",
    category: "Data Protection",
    tip: "Follow the 3-2-1 backup approach for reports, contracts, and operational records. Periodically verify recovery works before an incident occurs.",
  },
  {
    id: 7,
    title: "Pause Before Social Engineering Requests",
    category: "Social Engineering",
    tip: "Be cautious of calls or messages requesting customer, payroll, or network information. Confirm unusual requests through official NORED channels before sharing anything.",
  },
  {
    id: 8,
    title: "Use Trusted Web Portals",
    category: "Web Security",
    tip: "Check URLs carefully before signing in to vendor or service portals. Avoid downloading software or documents from unofficial links.",
  },
  {
    id: 9,
    title: "Limit Exposure of Customer Information",
    category: "Privacy",
    tip: "Only access customer and staff information needed for your task. Lock your screen when away and avoid leaving printed records unattended.",
  },
  {
    id: 10,
    title: "Secure Shared Devices and USBs",
    category: "Physical Security",
    tip: "Do not connect unknown USB devices to company computers. Scan approved storage first and keep field devices physically protected during travel.",
  },
  {
    id: 11,
    title: "Work Safely From Home",
    category: "Remote Work",
    tip: "Use company-approved devices, update your router password, and keep work separate from personal browsing when accessing NORED systems remotely.",
  },
  {
    id: 12,
    title: "Watch for Invoice and Payroll Fraud",
    category: "Financial Security",
    tip: "Review payment requests carefully, especially around month-end or supplier changes. Escalate anything unusual before approving or processing it.",
  },
  {
    id: 13,
    title: "Protect Mobile Work Apps",
    category: "Mobile Security",
    tip: "Lock phones and tablets with strong authentication, keep apps updated, and report lost devices immediately so access can be revoked.",
  },
  {
    id: 14,
    title: "Encrypt Sensitive Files",
    category: "Encryption",
    tip: "Use approved encrypted channels and password-protected files when sending contracts, HR data, or infrastructure-related documents outside your team.",
  },
];
