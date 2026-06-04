import { MemoFormData } from "@/types/memo.types";

export interface MemoTemplate {
  id: string;
  name: string;
  defaults: Partial<MemoFormData>;
}

export const MEMO_TEMPLATES: Record<string, MemoTemplate> = {
  procurement: {
    id: "procurement",
    name: "Procurement Request",
    defaults: {
      memoTo: "Chief Executive Officer",
      memoToTitle: "Office of the Chief Executive Officer",
      subject: "",
      purpose:
        "The purpose of this memorandum is to request approval for the procurement of ",
      recommendation:
        "It is recommended that the Chief Executive Officer approves the procurement as outlined above, subject to the availability of funds.",
      memoThrough: [{ name: "", title: "Executive: Finance and Administration" }],
      priority: "NORMAL",
    },
  },
  travel: {
    id: "travel",
    name: "Travel Authorization",
    defaults: {
      memoTo: "Chief Executive Officer",
      memoToTitle: "Office of the Chief Executive Officer",
      subject: "REQUEST FOR TRAVEL AUTHORIZATION - ",
      purpose:
        "The purpose of this memorandum is to request approval for official travel to ",
      recommendation:
        "It is recommended that the Chief Executive Officer approves the travel request as outlined above.",
      memoThrough: [{ name: "", title: "" }],
    },
  },
  "it-equipment": {
    id: "it-equipment",
    name: "IT Equipment Request",
    defaults: {
      memoTo: "Chief Executive Officer",
      memoToTitle: "Office of the Chief Executive Officer",
      subject: "REQUEST FOR IT EQUIPMENT - ",
      purpose:
        "The purpose of this memorandum is to request the procurement/replacement of IT equipment as detailed below.\n\nItem(s) Requested:\n1. \n\nJustification:\n",
      recommendation:
        "It is recommended that the Chief Executive Officer approves the acquisition of the above-mentioned IT equipment to support operational efficiency.",
      memoThrough: [{ name: "", title: "Manager: Information Technology" }],
    },
  },
  "staff-request": {
    id: "staff-request",
    name: "Staff / HR Request",
    defaults: {
      memoTo: "Chief Executive Officer",
      memoToTitle: "Office of the Chief Executive Officer",
      subject: "",
      purpose:
        "The purpose of this memorandum is to request approval for ",
      recommendation:
        "It is recommended that the Chief Executive Officer approves this request in the interest of operational effectiveness.",
      memoThrough: [{ name: "", title: "Executive: Human Capital" }],
    },
  },
  "event-approval": {
    id: "event-approval",
    name: "Event / Workshop Approval",
    defaults: {
      memoTo: "Chief Executive Officer",
      memoToTitle: "Office of the Chief Executive Officer",
      subject: "REQUEST FOR APPROVAL - ",
      purpose:
        "The purpose of this memorandum is to request approval for the hosting/attendance of the following event:\n\nEvent Name: \nDate(s): \nVenue: \nExpected Participants: \n\nObjective:\n",
      recommendation:
        "It is recommended that the Chief Executive Officer approves this event/workshop in line with NORED's strategic objectives.",
    },
  },
  "budget-transfer": {
    id: "budget-transfer",
    name: "Budget Transfer / Virement",
    defaults: {
      memoTo: "Chief Executive Officer",
      memoToTitle: "Office of the Chief Executive Officer",
      subject: "REQUEST FOR BUDGET TRANSFER/VIREMENT",
      purpose:
        "The purpose of this memorandum is to request approval for a budget transfer/virement as detailed below.\n\nFrom (Source Budget Line):\nVote: \nAmount: N$ \n\nTo (Destination Budget Line):\nVote: \nAmount: N$ \n\nReason for Transfer:\n",
      recommendation:
        "It is recommended that the Chief Executive Officer approves the budget transfer as outlined, subject to verification by Finance.",
      memoThrough: [{ name: "", title: "Executive: Finance and Administration" }],
    },
  },
  "general-approval": {
    id: "general-approval",
    name: "General Approval Request",
    defaults: {
      memoTo: "Chief Executive Officer",
      memoToTitle: "Office of the Chief Executive Officer",
      subject: "",
      purpose: "The purpose of this memorandum is to seek approval for ",
      recommendation:
        "It is recommended that the Chief Executive Officer considers and approves the above request.",
    },
  },
};

export function getTemplateDefaults(templateId: string): Partial<MemoFormData> | null {
  return MEMO_TEMPLATES[templateId]?.defaults ?? null;
}
