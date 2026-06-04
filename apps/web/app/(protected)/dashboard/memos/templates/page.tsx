"use client";

import { useRouter } from "next/navigation";
import { colors } from "@/app/ui-standards";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  FileText, ArrowRight, ShoppingCart, Plane, Monitor, 
  Users, Megaphone, Shield, DollarSign, Briefcase 
} from "lucide-react";

const MEMO_TEMPLATES = [
  {
    id: "blank",
    name: "Blank Memorandum",
    description: "Start from scratch with an empty official NORED memo template",
    icon: FileText,
    color: "bg-gray-100 text-gray-700",
    badge: null,
    defaults: {},
  },
  {
    id: "procurement",
    name: "Procurement Request",
    description: "Request approval for procurement of goods or services with financial details",
    icon: ShoppingCart,
    color: "bg-blue-100 text-blue-700",
    badge: "Popular",
    defaults: {
      memoTo: "Chief Executive Officer",
      memoToTitle: "Office of the Chief Executive Officer",
      subject: "",
      purpose: "The purpose of this memorandum is to request approval for the procurement of ",
      recommendation: "It is recommended that the Chief Executive Officer approves the procurement as outlined above, subject to the availability of funds.",
      memoThrough: [{ name: "", title: "Executive: Finance and Administration" }],
    },
  },
  {
    id: "travel",
    name: "Travel Authorization",
    description: "Request approval for official travel with itinerary and budget details",
    icon: Plane,
    color: "bg-emerald-100 text-emerald-700",
    badge: null,
    defaults: {
      memoTo: "Chief Executive Officer",
      memoToTitle: "Office of the Chief Executive Officer",
      subject: "REQUEST FOR TRAVEL AUTHORIZATION - ",
      purpose: "The purpose of this memorandum is to request approval for official travel to ",
      recommendation: "It is recommended that the Chief Executive Officer approves the travel request as outlined above.",
      memoThrough: [{ name: "", title: "" }],
    },
  },
  {
    id: "it-equipment",
    name: "IT Equipment Request",
    description: "Request new IT equipment, software licenses, or infrastructure upgrades",
    icon: Monitor,
    color: "bg-purple-100 text-purple-700",
    badge: null,
    defaults: {
      memoTo: "Chief Executive Officer",
      memoToTitle: "Office of the Chief Executive Officer",
      subject: "REQUEST FOR IT EQUIPMENT - ",
      purpose: "The purpose of this memorandum is to request the procurement/replacement of IT equipment as detailed below.\n\nItem(s) Requested:\n1. \n\nJustification:\n",
      recommendation: "It is recommended that the Chief Executive Officer approves the acquisition of the above-mentioned IT equipment to support operational efficiency.",
      memoThrough: [{ name: "", title: "Manager: Information Technology" }],
    },
  },
  {
    id: "staff-request",
    name: "Staff / HR Request",
    description: "HR-related requests including recruitment, training, or staffing changes",
    icon: Users,
    color: "bg-amber-100 text-amber-700",
    badge: null,
    defaults: {
      memoTo: "Chief Executive Officer",
      memoToTitle: "Office of the Chief Executive Officer",
      subject: "",
      purpose: "The purpose of this memorandum is to request approval for ",
      recommendation: "It is recommended that the Chief Executive Officer approves this request in the interest of operational effectiveness.",
      memoThrough: [{ name: "", title: "Executive: Human Capital" }],
    },
  },
  {
    id: "event-approval",
    name: "Event / Workshop Approval",
    description: "Request approval for hosting or attending events, workshops, and conferences",
    icon: Megaphone,
    color: "bg-pink-100 text-pink-700",
    badge: null,
    defaults: {
      memoTo: "Chief Executive Officer",
      memoToTitle: "Office of the Chief Executive Officer",
      subject: "REQUEST FOR APPROVAL - ",
      purpose: "The purpose of this memorandum is to request approval for the hosting/attendance of the following event:\n\nEvent Name: \nDate(s): \nVenue: \nExpected Participants: \n\nObjective:\n",
      recommendation: "It is recommended that the Chief Executive Officer approves this event/workshop in line with NORED's strategic objectives.",
    },
  },
  {
    id: "budget-transfer",
    name: "Budget Transfer / Virement",
    description: "Request approval for transfer of funds between budget lines",
    icon: DollarSign,
    color: "bg-green-100 text-green-700",
    badge: null,
    defaults: {
      memoTo: "Chief Executive Officer",
      memoToTitle: "Office of the Chief Executive Officer",
      subject: "REQUEST FOR BUDGET TRANSFER/VIREMENT",
      purpose: "The purpose of this memorandum is to request approval for a budget transfer/virement as detailed below.\n\nFrom (Source Budget Line):\nVote: \nAmount: N$ \n\nTo (Destination Budget Line):\nVote: \nAmount: N$ \n\nReason for Transfer:\n",
      recommendation: "It is recommended that the Chief Executive Officer approves the budget transfer as outlined, subject to verification by Finance.",
      memoThrough: [{ name: "", title: "Executive: Finance and Administration" }],
    },
  },
  {
    id: "general-approval",
    name: "General Approval Request",
    description: "Standard approval memo for operational decisions and policy matters",
    icon: Briefcase,
    color: "bg-indigo-100 text-indigo-700",
    badge: null,
    defaults: {
      memoTo: "Chief Executive Officer",
      memoToTitle: "Office of the Chief Executive Officer",
      subject: "",
      purpose: "The purpose of this memorandum is to seek approval for ",
      recommendation: "It is recommended that the Chief Executive Officer considers and approves the above request.",
    },
  },
];

export default function MemoTemplatesPage() {
  const router = useRouter();

  const handleSelectTemplate = (templateId: string) => {
    if (templateId === "blank") {
      router.push("/dashboard/memos/create");
    } else {
      router.push(`/dashboard/memos/create?template=${templateId}`);
    }
  };

  return (
    <div className="p-3 sm:p-4 lg:p-6 space-y-3 sm:space-y-4">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-foreground leading-tight">
          Memo Templates
        </h1>
        <p className="text-xs sm:text-sm text-gray-500 leading-tight">
          Choose a template to quickly create a new memo with pre-filled fields
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {MEMO_TEMPLATES.map((template) => {
          const Icon = template.icon;
          return (
            <Card 
              key={template.id} 
              className="widget-card hover:shadow-lg hover:scale-[1.01] transition-all cursor-pointer group"
              onClick={() => handleSelectTemplate(template.id)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between mb-2">
                  <div className={`p-3 rounded-xl ${template.color} group-hover:scale-110 transition-transform`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  {template.badge && (
                    <Badge variant="secondary" className="text-xs bg-blue-50 text-blue-700">
                      {template.badge}
                    </Badge>
                  )}
                </div>
                <CardTitle className="text-base font-semibold">{template.name}</CardTitle>
                <CardDescription className="text-sm leading-relaxed">
                  {template.description}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <Button 
                  className="w-full"
                  variant="outline"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSelectTemplate(template.id);
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
