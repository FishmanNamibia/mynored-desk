"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  FileText, 
  ArrowRight, 
  Server, 
  Shield, 
  HardDrive, 
  Wifi, 
  Database,
  Lock,
  AlertTriangle,
  Wrench
} from "lucide-react";
import { NSAMemoGenerator } from "@/components/memos/nsa-memo-generator";
import { useState } from "react";

export default function ITMemoTemplatesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(
    searchParams.get('template')
  );

  const getTemplateData = (templateId: string) => {
    const templateMap: Record<string, any> = {
      "system-maintenance": {
        subject: "SCHEDULED SYSTEM MAINTENANCE NOTICE",
        purpose: "This memo serves to inform all staff members of scheduled system maintenance that will affect access to certain IT systems and services. The maintenance is necessary to ensure optimal performance and security of our infrastructure.",
        recommendation: "All staff are advised to save their work and log out of affected systems before the maintenance window. IT support will be available for any urgent issues during this period.",
      },
      "security-update": {
        subject: "CRITICAL SECURITY UPDATE NOTIFICATION",
        purpose: "This memo notifies all users of a critical security update that must be applied to all NORED systems. The update addresses recently discovered vulnerabilities and is essential for maintaining the security of our IT infrastructure.",
        recommendation: "All users must install the security update within 48 hours. IT department will provide support for the installation process. Systems that do not comply will be temporarily restricted from network access.",
      },
      "hardware-request": {
        subject: "REQUEST FOR HARDWARE PROCUREMENT APPROVAL",
        purpose: "This memo requests approval for the procurement of hardware equipment necessary for departmental operations. The requested equipment will enhance productivity and ensure staff have the necessary tools to perform their duties effectively.",
        recommendation: "Approval is recommended for the procurement of the specified hardware. The equipment is essential for maintaining operational efficiency and meeting departmental objectives.",
      },
      "network-change": {
        subject: "NETWORK INFRASTRUCTURE CONFIGURATION CHANGE",
        purpose: "This memo informs stakeholders of planned changes to the network infrastructure configuration. These changes are designed to improve network performance, reliability, and security across the organization.",
        recommendation: "The proposed network changes are recommended for implementation during the scheduled maintenance window to minimize disruption to business operations.",
      },
      "backup-policy": {
        subject: "DATA BACKUP AND RECOVERY POLICY UPDATE",
        purpose: "This memo outlines updates to the organization's data backup and disaster recovery policy. The updated policy ensures compliance with best practices and provides enhanced protection for critical business data.",
        recommendation: "All departments are required to comply with the updated backup policy. IT will provide training and support to ensure smooth implementation.",
      },
      "access-control": {
        subject: "SYSTEM ACCESS CONTROL REQUEST",
        purpose: "This memo requests approval for system access rights and permissions for specified users. The requested access is necessary for users to perform their assigned duties and responsibilities.",
        recommendation: "Approval is recommended for the requested access rights, subject to verification of user identity and role requirements.",
      },
      "incident-report": {
        subject: "IT INCIDENT REPORT AND RESOLUTION",
        purpose: "This memo reports an IT incident that occurred and documents the actions taken to resolve the issue. The report includes details of the incident, impact assessment, and preventive measures implemented.",
        recommendation: "The incident has been resolved. Recommended actions include implementing the proposed preventive measures to avoid similar incidents in the future.",
      },
      "software-deployment": {
        subject: "NEW SOFTWARE DEPLOYMENT NOTIFICATION",
        purpose: "This memo notifies all users of the upcoming deployment of new software applications. The new software will enhance productivity and provide additional functionality to support business operations.",
        recommendation: "All users are advised to attend the scheduled training sessions. IT support will be available to assist with the transition to the new software.",
      },
    };
    return templateMap[templateId] || {};
  };

  const templates = [
    {
      id: "system-maintenance",
      name: "System Maintenance Notice",
      description: "Template for scheduled system maintenance and downtime notifications",
      icon: Server,
      color: "blue",
    },
    {
      id: "security-update",
      name: "Security Update Memo",
      description: "Template for security patches, updates, and vulnerability notifications",
      icon: Shield,
      color: "red",
    },
    {
      id: "hardware-request",
      name: "Hardware Request Approval",
      description: "Template for hardware procurement and equipment upgrade requests",
      icon: HardDrive,
      color: "green",
    },
    {
      id: "network-change",
      name: "Network Configuration Change",
      description: "Template for network infrastructure changes and updates",
      icon: Wifi,
      color: "purple",
    },
    {
      id: "backup-policy",
      name: "Backup & Recovery Policy",
      description: "Template for data backup procedures and disaster recovery plans",
      icon: Database,
      color: "indigo",
    },
    {
      id: "access-control",
      name: "Access Control Request",
      description: "Template for user access rights, permissions, and system access requests",
      icon: Lock,
      color: "yellow",
    },
    {
      id: "incident-report",
      name: "IT Incident Report",
      description: "Template for reporting IT incidents, outages, and technical issues",
      icon: AlertTriangle,
      color: "orange",
    },
    {
      id: "software-deployment",
      name: "Software Deployment Notice",
      description: "Template for new software installations and application rollouts",
      icon: Wrench,
      color: "teal",
    },
  ];

  const getColorClasses = (color: string) => {
    const colorMap: Record<string, { bg: string; text: string }> = {
      blue: { bg: "bg-blue-100", text: "text-blue-600" },
      red: { bg: "bg-red-100", text: "text-red-600" },
      green: { bg: "bg-green-100", text: "text-green-600" },
      purple: { bg: "bg-purple-100", text: "text-purple-600" },
      indigo: { bg: "bg-indigo-100", text: "text-indigo-600" },
      yellow: { bg: "bg-yellow-100", text: "text-yellow-600" },
      orange: { bg: "bg-orange-100", text: "text-orange-600" },
      teal: { bg: "bg-teal-100", text: "text-teal-600" },
    };
    return colorMap[color] || colorMap.blue;
  };

  if (selectedTemplate) {
    const templateData = getTemplateData(selectedTemplate);
    const template = templates.find(t => t.id === selectedTemplate);
    
    return (
      <div className="p-3 sm:p-4 lg:p-6 space-y-3 sm:space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 leading-tight">
              {template?.name || 'Generate Memo'}
            </h1>
            <p className="text-xs sm:text-sm text-gray-500 leading-tight">
              Fill in the details below to generate your memo
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => setSelectedTemplate(null)}
          >
            ← Back to Templates
          </Button>
        </div>
        
        <NSAMemoGenerator 
          initialData={templateData}
          onSuccess={(filename) => {
            console.log('Memo generated:', filename);
            setSelectedTemplate(null);
          }}
        />
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-4 lg:p-6 space-y-3 sm:space-y-4">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 leading-tight">
          IT Memo Templates
        </h1>
        <p className="text-xs sm:text-sm text-gray-500 leading-tight">
          Choose a template to create an IT-related memo
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {templates.map((template) => {
          const Icon = template.icon;
          const colors = getColorClasses(template.color);
          
          return (
            <Card 
              key={template.id} 
              className="widget-card hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => setSelectedTemplate(template.id)}
            >
              <CardHeader>
                <div className="flex items-center gap-3 mb-2">
                  <div className={`p-3 rounded-lg ${colors.bg}`}>
                    <Icon className={`w-6 h-6 ${colors.text}`} />
                  </div>
                  <CardTitle className="text-base">{template.name}</CardTitle>
                </div>
                <CardDescription className="text-sm">
                  {template.description}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button 
                  className="w-full" 
                  style={{ backgroundColor: "#b91c1c" }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedTemplate(template.id);
                  }}
                >
                  Use Template
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
