import {
  BarChart3,
  ClipboardList,
  FileSpreadsheet,
  PlugZap,
  Wallet,
  type LucideIcon,
} from "lucide-react";

export type EngineeringReportType =
  | "monthly-engineering"
  | "status-register"
  | "allocation-queue";

export type EngineeringReportFormat = "json" | "csv" | "pdf" | "xlsx";

export interface ReportColumn {
  key: string;
  label: string;
  align?: "left" | "center" | "right";
  tone?: "neutral" | "success" | "warning" | "danger" | "info";
}

export interface ReportTableSection {
  key: string;
  sectionNumber: string;
  title: string;
  tableLabel?: string;
  summary?: string;
  note?: string;
  columns: ReportColumn[];
  rows: Array<Record<string, string | number>>;
  highlightLastRow?: boolean;
}

export interface EngineeringReportDefinition {
  key: EngineeringReportType;
  title: string;
  description: string;
  helper: string;
  formats: EngineeringReportFormat[];
}

export interface EngineeringOverviewCard {
  title: string;
  value: string;
  helper: string;
  icon: LucideIcon;
}

export interface EngineeringMonthlyReport {
  monthLabel: string;
  reportTitle: string;
  introduction: string;
  tableOfContents: string[];
  donatedAssets: ReportTableSection;
  mvSummary: ReportTableSection;
  mvNoredTeams: ReportTableSection;
  mvContractorPhases: ReportTableSection[];
  mvMovementTable: ReportTableSection;
  mvMovementChart: MovementChartPoint[];
  keyStakeholderProjects: ReportTableSection;
  lvStatus: ReportTableSection;
  lvCableOutstanding: ReportTableSection;
  challenges: string[];
}

export interface MovementChartPoint {
  month: string;
  received: number;
  energised: number;
  pendingEnergising: number;
  pending: number;
  backlog: number;
}

const donatedAssetsColumns: ReportColumn[] = [
  { key: "region", label: "Region" },
  { key: "area", label: "Area" },
  { key: "budget", label: "Budget", tone: "info" },
  { key: "description", label: "Project Description" },
  { key: "dateEnergised", label: "Date Energised", tone: "success" },
];

const mvSynopsisColumns: ReportColumn[] = [
  { key: "centreName", label: "Centre Name" },
  { key: "receivedInMarch", label: "Received in March", align: "right", tone: "info" },
  { key: "amountPaid", label: "Amount paid (N$)", align: "right", tone: "info" },
  { key: "energisedInMarch", label: "Energised in March", align: "right", tone: "success" },
  { key: "totalOutstanding", label: "Total outstanding", align: "right", tone: "warning" },
  { key: "inProgress", label: "In progress", align: "right", tone: "neutral" },
  { key: "notAllocated", label: "Not allocated", align: "right", tone: "danger" },
];

const mvTeamColumns: ReportColumn[] = [
  { key: "assignedTo", label: "MV Assigned to NORED Teams" },
  { key: "assignedProjects", label: "Assigned projects", align: "right", tone: "info" },
  { key: "energised", label: "Energised in February", align: "right", tone: "success" },
  { key: "pendingInspection", label: "Pending Inspection", align: "right", tone: "warning" },
  { key: "pendingTieIn", label: "Pending tie-in", align: "right", tone: "warning" },
  { key: "inProgress", label: "Total in progress", align: "right", tone: "neutral" },
  { key: "outstanding", label: "Total outstanding", align: "right", tone: "danger" },
];

const mvContractorColumns: ReportColumn[] = [
  { key: "contractor", label: "Contractor name" },
  { key: "assigned", label: "Assigned", align: "right", tone: "info" },
  { key: "energised", label: "Total energised", align: "right", tone: "success" },
  { key: "pendingEnergising", label: "Pending energising", align: "right", tone: "warning" },
  { key: "pendingTieIn", label: "Pending tied-in", align: "right", tone: "warning" },
  { key: "inProgress", label: "In progress", align: "right", tone: "neutral" },
  { key: "onHold", label: "On hold (dispute or issues)", align: "right", tone: "danger" },
  { key: "outstanding", label: "Total outstanding", align: "right", tone: "danger" },
];

const mvMovementColumns: ReportColumn[] = [
  { key: "month", label: "Month" },
  { key: "received", label: "Received", align: "right", tone: "info" },
  { key: "outstanding", label: "Outstanding", align: "right", tone: "danger" },
  { key: "energised", label: "Energised", align: "right", tone: "success" },
  { key: "receivedPvPo", label: "Received PV (received) or PO", align: "right", tone: "info" },
];

const keyStakeholderColumns: ReportColumn[] = [
  { key: "stakeholder", label: "Stakeholder" },
  { key: "constituency", label: "Constituency" },
  { key: "locality", label: "Locality" },
  { key: "reference", label: "Reference" },
  { key: "statusComment", label: "Status and Comment", tone: "warning" },
];

const lvStatusColumns: ReportColumn[] = [
  { key: "mainCentre", label: "Name of Main Centre" },
  { key: "receivedInMarch", label: "Received in March", align: "right", tone: "info" },
  { key: "amountPaid", label: "Amount paid (N$)", align: "right", tone: "info" },
  { key: "energisedInMarch", label: "Energised in March", align: "right", tone: "success" },
  { key: "totalOutstanding", label: "Total outstanding", align: "right", tone: "warning" },
  { key: "backlog", label: "Backlog >3 months", align: "right", tone: "danger" },
];

const lvCableColumns: ReportColumn[] = [
  { key: "mainCentre", label: "Main Centre Name" },
  { key: "cable10m", label: "10mm2 (m)", align: "right", tone: "info" },
  { key: "cable16m", label: "16mm2 (m)", align: "right", tone: "info" },
  { key: "cable16CoreDrums", label: "16mm2 4-Core (drums)", align: "right", tone: "warning" },
  { key: "drums10", label: "10mm2 (drums)", align: "right", tone: "warning" },
  { key: "drums16", label: "16mm2 (drums)", align: "right", tone: "warning" },
  { key: "drums16Core", label: "16mm2 4-Core (drums)", align: "right", tone: "warning" },
];

export const monthlyEngineeringReport = {
  monthLabel: "March 2026",
  reportTitle: "Engineering Department Project Division Monthly Report",
  introduction:
    "This report presents the activities of the Engineering Department Project Division for March 2026. The activities include capturing donated assets, capital transmission and distribution projects, as well as new medium voltage (MV) and low voltage (LV) customer connections.",
  tableOfContents: [
    "1. Introduction",
    "2. Asset and Project Management Division",
    "2.1 Donated Assets",
    "2.2 New Connections",
    "2.3 Challenges",
  ],
  donatedAssets: {
    key: "donated-assets",
    sectionNumber: "2.1",
    title: "Donated Assets",
    tableLabel: "Table 2.2.1 1: Donated Assets for the past three months",
    columns: donatedAssetsColumns,
    rows: [
      {
        region: "Oshikoto",
        area: "Omahiya PS",
        budget: "Consultant to provide",
        description: "Construction of MV line and ABC reticulation to the school and Cucashops",
        dateEnergised: "16 February 2026",
      },
      {
        region: "Oshikoto",
        area: "Vilho Kamyanya CS",
        budget: "Consultant to provide",
        description: "Construction of MV line and ABC reticulation to the school and Cucashops",
        dateEnergised: "16 February 2026",
      },
      {
        region: "Oshikoto",
        area: "Ashihaya PS",
        budget: "Consultant to provide",
        description: "Construction of MV line and ABC reticulation to the school and Cucashops",
        dateEnergised: "16 February 2026",
      },
      {
        region: "Oshikoto",
        area: "Onamatende JPS",
        budget: "Consultant to provide",
        description: "Construction of MV line and ABC reticulation to the school",
        dateEnergised: "17 February 2026",
      },
      {
        region: "Oshikoto",
        area: "Omena PS",
        budget: "Consultant to provide",
        description: "Construction of MV line and ABC reticulation to the school and Cucashops",
        dateEnergised: "17 February 2026",
      },
      {
        region: "Oshikoto",
        area: "Onekongo PS",
        budget: "Consultant to provide",
        description: "Construction of MV line and ABC reticulation to the school and Cucashops",
        dateEnergised: "18 February 2026",
      },
      {
        region: "Oshikoto",
        area: "Kaatri Imalwa",
        budget: "Consultant to provide",
        description: "Construction of MV line and ABC reticulation to the school and Cucashops",
        dateEnergised: "18 February 2026",
      },
      {
        region: "Oshikoto",
        area: "Dimo Hamaambo",
        budget: "Consultant to provide",
        description: "Construction of MV line and ABC reticulation to the school and Cucashops",
        dateEnergised: "19 February 2026",
      },
      {
        region: "Oshikoto",
        area: "Twapandula JPS",
        budget: "Consultant to provide",
        description: "Construction of MV line and ABC reticulation to the school and Cucashops",
        dateEnergised: "19 February 2026",
      },
      {
        region: "Oshikoto",
        area: "Nakandangwa PS",
        budget: "Consultant to provide",
        description: "Construction of MV line and ABC reticulation to the school and Cucashops",
        dateEnergised: "20 February 2026",
      },
    ],
  } satisfies ReportTableSection,
  mvSummary: {
    key: "mv-summary",
    sectionNumber: "2.2.1",
    title: "NORED MV Connections Summary",
    summary:
      "Table 2.3.1-1 gives the overall status of the MV connections at NORED by the end of the month (March 2026) under review.",
    note:
      "The above table is an overview of the MV connections. The detailed pending tie-in, inspection, in progress, and other movements are provided in the following sub-sections.",
    tableLabel: "Table 2.2.1 1: March 2026 MV connections statistics synopsis",
    columns: mvSynopsisColumns,
    rows: [
      {
        centreName: "Ondangwa",
        receivedInMarch: 13,
        amountPaid: "N$2,975,965.19",
        energisedInMarch: 33,
        totalOutstanding: 96,
        inProgress: 71,
        notAllocated: 25,
      },
      {
        centreName: "Katima Mulilo",
        receivedInMarch: 0,
        amountPaid: "N$0.00",
        energisedInMarch: 0,
        totalOutstanding: 5,
        inProgress: 5,
        notAllocated: 0,
      },
      {
        centreName: "Rundu",
        receivedInMarch: 0,
        amountPaid: "N$0.00",
        energisedInMarch: 2,
        totalOutstanding: 11,
        inProgress: 11,
        notAllocated: 0,
      },
      {
        centreName: "Totals",
        receivedInMarch: 13,
        amountPaid: "N$2,975,965.19",
        energisedInMarch: 35,
        totalOutstanding: 112,
        inProgress: 87,
        notAllocated: 25,
      },
    ],
    highlightLastRow: true,
  } satisfies ReportTableSection,
  mvNoredTeams: {
    key: "mv-nored-teams",
    sectionNumber: "2.2.2",
    title: "MV Connections with NORED Construction Teams",
    summary:
      "Table 2.3.1-4 gives the status of the MV connections executed by NORED construction teams by the end of the month (February 2026) under review.",
    tableLabel: "Table 2.2.2 1: NORED Construction Teams MV connections statistics",
    columns: mvTeamColumns,
    rows: [
      {
        assignedTo: "NORED Teams NW",
        assignedProjects: 3,
        energised: 10,
        pendingInspection: 17,
        pendingTieIn: 7,
        inProgress: 21,
        outstanding: 45,
      },
      {
        assignedTo: "NORED Team Katima",
        assignedProjects: 0,
        energised: 0,
        pendingInspection: 0,
        pendingTieIn: 0,
        inProgress: 2,
        outstanding: 2,
      },
      {
        assignedTo: "NORED Team Rundu",
        assignedProjects: 0,
        energised: 4,
        pendingInspection: 1,
        pendingTieIn: 2,
        inProgress: 6,
        outstanding: 9,
      },
      {
        assignedTo: "Totals",
        assignedProjects: 3,
        energised: 14,
        pendingInspection: 18,
        pendingTieIn: 9,
        inProgress: 29,
        outstanding: 56,
      },
    ],
    highlightLastRow: true,
  } satisfies ReportTableSection,
  mvContractorPhases: [
    {
      key: "phase-2-2024",
      sectionNumber: "2.2.3",
      title: "Phase 2 - 2024 Allocated MV connections",
      summary:
        "Table 2.3.2-1 indicates the status of sixty-six (66) MV connections allocated to MV contractors in May and July 2024.",
      tableLabel: "Table 2.2.3 1: Phase 2 - 2024 Allocated MV connections",
      note:
        "The outstanding connection with BDI Electrical Cc has been pending energisation for a long time due to defects, specifically the stays that are not properly installed. However, when the contractor went to rectify this, they found water in the area and could not dig the holes.",
      columns: mvContractorColumns,
      rows: [
        { contractor: "J&A Electrical", assigned: 6, energised: 6, pendingEnergising: 0, pendingTieIn: 0, inProgress: 0, onHold: 0, outstanding: 0 },
        { contractor: "Zone Four", assigned: 4, energised: 4, pendingEnergising: 0, pendingTieIn: 0, inProgress: 0, onHold: 0, outstanding: 0 },
        { contractor: "Earth Pole", assigned: 3, energised: 3, pendingEnergising: 0, pendingTieIn: 0, inProgress: 0, onHold: 0, outstanding: 0 },
        { contractor: "BDI Electrical", assigned: 4, energised: 3, pendingEnergising: 1, pendingTieIn: 0, inProgress: 0, onHold: 0, outstanding: 1 },
        { contractor: "Bulldog Trading", assigned: 8, energised: 8, pendingEnergising: 0, pendingTieIn: 0, inProgress: 0, onHold: 0, outstanding: 0 },
        { contractor: "Coolmasters", assigned: 8, energised: 8, pendingEnergising: 0, pendingTieIn: 0, inProgress: 0, onHold: 0, outstanding: 0 },
        { contractor: "Pawa Engineering", assigned: 4, energised: 4, pendingEnergising: 0, pendingTieIn: 0, inProgress: 0, onHold: 0, outstanding: 0 },
        { contractor: "Power Electrical", assigned: 5, energised: 5, pendingEnergising: 0, pendingTieIn: 0, inProgress: 0, onHold: 0, outstanding: 0 },
        { contractor: "Heat Technician", assigned: 5, energised: 5, pendingEnergising: 0, pendingTieIn: 0, inProgress: 0, onHold: 0, outstanding: 0 },
        { contractor: "Shiimi Electrical", assigned: 4, energised: 4, pendingEnergising: 0, pendingTieIn: 0, inProgress: 0, onHold: 0, outstanding: 0 },
        { contractor: "Forever", assigned: 5, energised: 5, pendingEnergising: 0, pendingTieIn: 0, inProgress: 0, onHold: 0, outstanding: 0 },
        { contractor: "Faradays", assigned: 5, energised: 5, pendingEnergising: 0, pendingTieIn: 0, inProgress: 0, onHold: 0, outstanding: 0 },
        { contractor: "Rubytech", assigned: 5, energised: 5, pendingEnergising: 0, pendingTieIn: 0, inProgress: 0, onHold: 0, outstanding: 0 },
        { contractor: "Total", assigned: 66, energised: 65, pendingEnergising: 1, pendingTieIn: 0, inProgress: 0, onHold: 0, outstanding: 1 },
      ],
      highlightLastRow: true,
    },
    {
      key: "phase-3-2024",
      sectionNumber: "2.2.3",
      title: "Phase 3 - 2024 Allocated MV connections",
      summary:
        "Thirty-eight (38) MV connections were allocated to MV contractors in October 2024, as indicated in the table below.",
      tableLabel: "Table 2.2.3 2: Phase 3 - 2024 Allocated MV connections",
      note:
        "The connection with Earth Pole Investment Cc is on hold due to a land dispute along the MV line route - Customer Care is addressing it.",
      columns: mvContractorColumns,
      rows: [
        { contractor: "J&A Electrical", assigned: 3, energised: 3, pendingEnergising: 0, pendingTieIn: 0, inProgress: 0, onHold: 0, outstanding: 0 },
        { contractor: "Zone Four", assigned: 4, energised: 4, pendingEnergising: 0, pendingTieIn: 0, inProgress: 0, onHold: 0, outstanding: 0 },
        { contractor: "Earth Pole", assigned: 3, energised: 2, pendingEnergising: 0, pendingTieIn: 0, inProgress: 0, onHold: 1, outstanding: 1 },
        { contractor: "BDI Electrical", assigned: 3, energised: 3, pendingEnergising: 0, pendingTieIn: 0, inProgress: 0, onHold: 0, outstanding: 0 },
        { contractor: "Bulldog Trading", assigned: 3, energised: 3, pendingEnergising: 0, pendingTieIn: 0, inProgress: 0, onHold: 0, outstanding: 0 },
        { contractor: "Coolmasters", assigned: 5, energised: 5, pendingEnergising: 0, pendingTieIn: 0, inProgress: 0, onHold: 0, outstanding: 0 },
        { contractor: "Pawa Engineering", assigned: 3, energised: 3, pendingEnergising: 0, pendingTieIn: 0, inProgress: 0, onHold: 0, outstanding: 0 },
        { contractor: "Power Electrical", assigned: 3, energised: 3, pendingEnergising: 0, pendingTieIn: 0, inProgress: 0, onHold: 0, outstanding: 0 },
        { contractor: "Heat Technician", assigned: 4, energised: 4, pendingEnergising: 0, pendingTieIn: 0, inProgress: 0, onHold: 0, outstanding: 0 },
        { contractor: "Shiimi Electrical", assigned: 1, energised: 1, pendingEnergising: 0, pendingTieIn: 0, inProgress: 0, onHold: 0, outstanding: 0 },
        { contractor: "Forever", assigned: 3, energised: 3, pendingEnergising: 0, pendingTieIn: 0, inProgress: 0, onHold: 0, outstanding: 0 },
        { contractor: "Faradays", assigned: 3, energised: 3, pendingEnergising: 0, pendingTieIn: 0, inProgress: 0, onHold: 0, outstanding: 0 },
        { contractor: "Total", assigned: 38, energised: 37, pendingEnergising: 0, pendingTieIn: 0, inProgress: 0, onHold: 1, outstanding: 1 },
      ],
      highlightLastRow: true,
    },
    {
      key: "phase-1-2025",
      sectionNumber: "2.2.3",
      title: "Phase 1 - 2025 Allocated MV connections",
      summary:
        "Fifty (50) MV connections were allocated to MV contractors under Phase 1 - 2025, as indicated in the table below.",
      tableLabel: "Table 2.2.3 4: Phase 1 - 2025 Allocated MV connections",
      note:
        "The outstanding connection with Bulldog Trading Cc is due to bush clearance not being done to the NORED standard. Bush clearance was carried out by community members employed by the Regional Council, and they are rectifying the defect.",
      columns: mvContractorColumns,
      rows: [
        { contractor: "Shiimi Electrical", assigned: 3, energised: 3, pendingEnergising: 0, pendingTieIn: 0, inProgress: 0, onHold: 0, outstanding: 0 },
        { contractor: "BDI Electrical", assigned: 4, energised: 4, pendingEnergising: 0, pendingTieIn: 0, inProgress: 0, onHold: 0, outstanding: 0 },
        { contractor: "Zone Four", assigned: 4, energised: 4, pendingEnergising: 0, pendingTieIn: 0, inProgress: 0, onHold: 0, outstanding: 0 },
        { contractor: "Coolmaster", assigned: 5, energised: 5, pendingEnergising: 0, pendingTieIn: 0, inProgress: 0, onHold: 0, outstanding: 0 },
        { contractor: "Bulldog Trading", assigned: 4, energised: 3, pendingEnergising: 0, pendingTieIn: 1, inProgress: 0, onHold: 0, outstanding: 1 },
        { contractor: "J&A Electrical", assigned: 4, energised: 4, pendingEnergising: 0, pendingTieIn: 0, inProgress: 0, onHold: 0, outstanding: 0 },
        { contractor: "Power Electrical", assigned: 4, energised: 4, pendingEnergising: 0, pendingTieIn: 0, inProgress: 0, onHold: 0, outstanding: 0 },
        { contractor: "Faradays Electrical", assigned: 4, energised: 4, pendingEnergising: 0, pendingTieIn: 0, inProgress: 0, onHold: 0, outstanding: 0 },
        { contractor: "Forever Electrical", assigned: 3, energised: 3, pendingEnergising: 0, pendingTieIn: 0, inProgress: 0, onHold: 0, outstanding: 0 },
        { contractor: "Pawa Engineering", assigned: 3, energised: 3, pendingEnergising: 0, pendingTieIn: 0, inProgress: 0, onHold: 0, outstanding: 0 },
        { contractor: "Heat Technician", assigned: 4, energised: 4, pendingEnergising: 0, pendingTieIn: 0, inProgress: 0, onHold: 0, outstanding: 0 },
        { contractor: "Rubytech", assigned: 2, energised: 2, pendingEnergising: 0, pendingTieIn: 0, inProgress: 0, onHold: 0, outstanding: 0 },
        { contractor: "Laxander Invest. Cc", assigned: 3, energised: 3, pendingEnergising: 0, pendingTieIn: 0, inProgress: 0, onHold: 0, outstanding: 0 },
        { contractor: "Delta Electrical", assigned: 3, energised: 3, pendingEnergising: 0, pendingTieIn: 0, inProgress: 0, onHold: 0, outstanding: 0 },
        { contractor: "Total", assigned: 50, energised: 49, pendingEnergising: 0, pendingTieIn: 1, inProgress: 0, onHold: 0, outstanding: 1 },
      ],
      highlightLastRow: true,
    },
    {
      key: "phase-2-2025",
      sectionNumber: "2.2.3",
      title: "Phase 2 - 2025 Allocated MV connections",
      summary:
        "Thirty-two (32) MV connections were allocated to MV contractors in July 2025, as indicated in the table below.",
      tableLabel: "Table 2.2.3 5: Phase 2 - 2025 Allocated MV connections",
      columns: mvContractorColumns,
      rows: [
        { contractor: "Shiimi Electrical", assigned: 3, energised: 2, pendingEnergising: 1, pendingTieIn: 0, inProgress: 0, onHold: 0, outstanding: 1 },
        { contractor: "BDI Electrical", assigned: 2, energised: 2, pendingEnergising: 0, pendingTieIn: 0, inProgress: 0, onHold: 0, outstanding: 0 },
        { contractor: "Zone Four Investment", assigned: 3, energised: 3, pendingEnergising: 0, pendingTieIn: 0, inProgress: 0, onHold: 0, outstanding: 0 },
        { contractor: "Coolmaster Radiators", assigned: 3, energised: 3, pendingEnergising: 0, pendingTieIn: 0, inProgress: 0, onHold: 0, outstanding: 0 },
        { contractor: "Bulldog Trading", assigned: 4, energised: 4, pendingEnergising: 0, pendingTieIn: 0, inProgress: 0, onHold: 0, outstanding: 0 },
        { contractor: "J&A Electrical & Civil", assigned: 3, energised: 3, pendingEnergising: 0, pendingTieIn: 0, inProgress: 0, onHold: 0, outstanding: 0 },
        { contractor: "Power Electrical", assigned: 3, energised: 2, pendingEnergising: 0, pendingTieIn: 0, inProgress: 1, onHold: 0, outstanding: 1 },
        { contractor: "Faradays Electrical", assigned: 3, energised: 2, pendingEnergising: 0, pendingTieIn: 1, inProgress: 0, onHold: 0, outstanding: 1 },
        { contractor: "Forever Electrical", assigned: 3, energised: 3, pendingEnergising: 0, pendingTieIn: 0, inProgress: 0, onHold: 0, outstanding: 0 },
        { contractor: "Pawa Engineering", assigned: 2, energised: 1, pendingEnergising: 0, pendingTieIn: 1, inProgress: 0, onHold: 0, outstanding: 1 },
        { contractor: "Earth Pole", assigned: 2, energised: 2, pendingEnergising: 0, pendingTieIn: 0, inProgress: 0, onHold: 0, outstanding: 0 },
        { contractor: "Total", assigned: 31, energised: 27, pendingEnergising: 1, pendingTieIn: 2, inProgress: 1, onHold: 0, outstanding: 4 },
      ],
      highlightLastRow: true,
    },
    {
      key: "phase-3-2025",
      sectionNumber: "2.2.3",
      title: "Phase 3 - 2025 Allocated MV connections",
      summary:
        "Thirty-five (35) MV connections were allocated to MV contractors in December 2025, as shown in the table below.",
      tableLabel: "Table 2.2.3 6: Phase 3 - 2025 Allocated MV connections",
      columns: mvContractorColumns,
      rows: [
        { contractor: "Shiimi Electrical", assigned: 3, energised: 2, pendingEnergising: 1, pendingTieIn: 0, inProgress: 0, onHold: 0, outstanding: 1 },
        { contractor: "Heat Technician", assigned: 2, energised: 0, pendingEnergising: 0, pendingTieIn: 2, inProgress: 0, onHold: 0, outstanding: 2 },
        { contractor: "Forever Electrical", assigned: 3, energised: 3, pendingEnergising: 2, pendingTieIn: 0, inProgress: 0, onHold: 0, outstanding: 0 },
        { contractor: "Pawa Engineering", assigned: 3, energised: 3, pendingEnergising: 0, pendingTieIn: 0, inProgress: 0, onHold: 0, outstanding: 0 },
        { contractor: "Bulldog Trading", assigned: 2, energised: 2, pendingEnergising: 0, pendingTieIn: 0, inProgress: 0, onHold: 0, outstanding: 0 },
        { contractor: "J&A Electrical & Civil", assigned: 5, energised: 1, pendingEnergising: 0, pendingTieIn: 1, inProgress: 2, onHold: 1, outstanding: 3 },
        { contractor: "Faradays Electrical", assigned: 3, energised: 0, pendingEnergising: 0, pendingTieIn: 1, inProgress: 2, onHold: 0, outstanding: 3 },
        { contractor: "Zone Four Investment", assigned: 3, energised: 0, pendingEnergising: 0, pendingTieIn: 0, inProgress: 3, onHold: 0, outstanding: 3 },
        { contractor: "Power Electrical", assigned: 2, energised: 0, pendingEnergising: 0, pendingTieIn: 0, inProgress: 2, onHold: 0, outstanding: 2 },
        { contractor: "Earth Pole Investment", assigned: 2, energised: 0, pendingEnergising: 0, pendingTieIn: 1, inProgress: 1, onHold: 0, outstanding: 2 },
        { contractor: "BDI Electrical", assigned: 2, energised: 1, pendingEnergising: 0, pendingTieIn: 0, inProgress: 0, onHold: 1, outstanding: 1 },
        { contractor: "Coolmaster Radiators", assigned: 3, energised: 3, pendingEnergising: 0, pendingTieIn: 0, inProgress: 0, onHold: 0, outstanding: 0 },
        { contractor: "Laxander Investments", assigned: 1, energised: 0, pendingEnergising: 0, pendingTieIn: 0, inProgress: 1, onHold: 0, outstanding: 1 },
        { contractor: "DM Engineering Services", assigned: 2, energised: 2, pendingEnergising: 0, pendingTieIn: 0, inProgress: 0, onHold: 0, outstanding: 0 },
        { contractor: "Total", assigned: 36, energised: 17, pendingEnergising: 3, pendingTieIn: 5, inProgress: 11, onHold: 2, outstanding: 19 },
      ],
      highlightLastRow: true,
    },
    {
      key: "phase-1-2026",
      sectionNumber: "2.2.3",
      title: "Phase 1 - 2026 Allocated MV connections",
      summary:
        "Three (3) MV connections were allocated to MV contractors in the first quarter of 2026 to contractors in the northeast area.",
      tableLabel: "Table 2.2.3 7: Phase 1 - 2026 Allocated MV connections",
      columns: mvContractorColumns,
      rows: [
        { contractor: "J&A Electrical & Civil", assigned: 1, energised: 0, pendingEnergising: 0, pendingTieIn: 1, inProgress: 0, onHold: 0, outstanding: 1 },
        { contractor: "Astrah Investments Cc", assigned: 1, energised: 0, pendingEnergising: 0, pendingTieIn: 0, inProgress: 0, onHold: 1, outstanding: 1 },
        { contractor: "DM Engineering Services", assigned: 1, energised: 0, pendingEnergising: 0, pendingTieIn: 0, inProgress: 0, onHold: 1, outstanding: 1 },
        { contractor: "Total", assigned: 3, energised: 0, pendingEnergising: 0, pendingTieIn: 1, inProgress: 0, onHold: 2, outstanding: 3 },
      ],
      highlightLastRow: true,
    },
  ] satisfies ReportTableSection[],
  mvMovementTable: {
    key: "mv-movement",
    sectionNumber: "2.2.3",
    title: "Monthly New MV Connections Movement",
    summary:
      "Figure 2.2.3 2 shows the MV connection movements for the past six (6) months, while the table below gives the longer month-by-month movement history.",
    tableLabel: "Table 2.2.3 8: Monthly New MV Connections Movement",
    columns: mvMovementColumns,
    rows: [
      { month: "July 2022", received: 23, outstanding: 1, energised: 39, receivedPvPo: "N$2,612,135.77" },
      { month: "May 2024", received: 21, outstanding: 2, energised: 22, receivedPvPo: "N$4,205,098.38" },
      { month: "June 2024", received: 20, outstanding: 1, energised: 22, receivedPvPo: "N$5,126,231.98" },
      { month: "July 2024", received: 21, outstanding: 1, energised: 0, receivedPvPo: "N$5,087,707.90" },
      { month: "December 2024", received: 23, outstanding: 1, energised: 37, receivedPvPo: "N$4,626,685.55" },
      { month: "January 2025", received: 20, outstanding: 0, energised: 28, receivedPvPo: "N$4,088,423.37" },
      { month: "February 2025", received: 13, outstanding: 2, energised: 7, receivedPvPo: "N$3,157,687.90" },
      { month: "March 2025", received: 18, outstanding: 4, energised: 28, receivedPvPo: "N$4,454,707.79" },
      { month: "April 2025", received: 22, outstanding: 1, energised: 11, receivedPvPo: "N$8,881,072.79" },
      { month: "May 2025", received: 14, outstanding: 4, energised: 19, receivedPvPo: "N$2,724,673.64" },
      { month: "June 2025", received: 27, outstanding: 3, energised: 13, receivedPvPo: "N$10,351,114.82" },
      { month: "July 2025", received: 27, outstanding: 5, energised: 21, receivedPvPo: "N$6,819,368.38" },
      { month: "August 2025", received: 13, outstanding: 6, energised: 24, receivedPvPo: "N$3,232,297.59" },
      { month: "September 2025", received: 15, outstanding: 6, energised: 20, receivedPvPo: "N$3,134,936.54" },
      { month: "October 2025", received: 17, outstanding: 4, energised: 26, receivedPvPo: "N$3,896,607.00" },
      { month: "November 2025", received: 20, outstanding: 8, energised: 24, receivedPvPo: "N$3,065,613.20" },
      { month: "December 2025", received: 16, outstanding: 12, energised: 21, receivedPvPo: "N$3,129,404.56" },
      { month: "January 2026", received: 18, outstanding: 18, energised: 11, receivedPvPo: "N$3,087,920.88" },
      { month: "February 2026", received: 20, outstanding: 20, energised: 5, receivedPvPo: "N$3,588,029.32" },
      { month: "March 2026", received: 13, outstanding: 13, energised: 35, receivedPvPo: "N$2,975,965.19" },
    ],
  } satisfies ReportTableSection,
  mvMovementChart: [
    { month: "October", received: 17, energised: 26, pendingEnergising: 13, pending: 124, backlog: 27 },
    { month: "November", received: 19, energised: 24, pendingEnergising: 13, pending: 116, backlog: 26 },
    { month: "December", received: 16, energised: 21, pendingEnergising: 13, pending: 115, backlog: 39 },
    { month: "January", received: 18, energised: 11, pendingEnergising: 7, pending: 122, backlog: 40 },
    { month: "February", received: 20, energised: 10, pendingEnergising: 10, pending: 134, backlog: 36 },
    { month: "March", received: 13, energised: 35, pendingEnergising: 19, pending: 112, backlog: 37 },
  ] satisfies MovementChartPoint[],
  keyStakeholderProjects: {
    key: "key-stakeholder-projects",
    sectionNumber: "2.2.4",
    title: "Key Stakeholder MV connections",
    tableLabel: "Table 2.2.4 1: Outstanding Key Stakeholders' MV Projects",
    columns: keyStakeholderColumns,
    rows: [
      {
        stakeholder: "Oshana RC",
        constituency: "Ondangwa",
        locality: "Onankome",
        reference: "ND1015430",
        statusComment: "Pending Energising",
      },
      {
        stakeholder: "Oshana RC",
        constituency: "Okatjali",
        locality: "Okapalala",
        reference: "ND1018249",
        statusComment: "Pending tie-in",
      },
      {
        stakeholder: "Oshana RC",
        constituency: "Uukwiyu",
        locality: "Oshikweyo",
        reference: "ND1019888",
        statusComment: "Affected by Water",
      },
      {
        stakeholder: "Oniipa TC",
        constituency: "Oniipa",
        locality: "Onethindi Proper",
        reference: "ND1016240",
        statusComment: "Removal of part of the de-energised line not done",
      },
      {
        stakeholder: "NamPower",
        constituency: "Sibbinda",
        locality: "Kasheshe",
        reference: "KM3509309",
        statusComment: "The contractor went to the site",
      },
    ],
  } satisfies ReportTableSection,
  lvStatus: {
    key: "lv-status",
    sectionNumber: "2.2.5",
    title: "NORED LV Connections Status",
    tableLabel: "Table 2.2.5 1: NORED new LV connections status",
    columns: lvStatusColumns,
    rows: [
      {
        mainCentre: "NW AREA 1",
        receivedInMarch: 98,
        amountPaid: "N$3,349,413.10",
        energisedInMarch: 24,
        totalOutstanding: 423,
        backlog: 253,
      },
      {
        mainCentre: "NW AREA 2",
        receivedInMarch: 89,
        amountPaid: "N$2,653,410.79",
        energisedInMarch: 51,
        totalOutstanding: 409,
        backlog: 225,
      },
      {
        mainCentre: "Zambezi",
        receivedInMarch: 15,
        amountPaid: "N$189,088.76",
        energisedInMarch: 22,
        totalOutstanding: 85,
        backlog: 39,
      },
      {
        mainCentre: "Kavango",
        receivedInMarch: 27,
        amountPaid: "N$654,804.56",
        energisedInMarch: 60,
        totalOutstanding: 57,
        backlog: 28,
      },
      {
        mainCentre: "Totals",
        receivedInMarch: 229,
        amountPaid: "N$6,846,717.21",
        energisedInMarch: 157,
        totalOutstanding: 974,
        backlog: 545,
      },
    ],
    highlightLastRow: true,
  } satisfies ReportTableSection,
  lvCableOutstanding: {
    key: "lv-cable-outstanding",
    sectionNumber: "2.2.5",
    title: "NORED new LV connections outstanding cable",
    tableLabel: "Table 2.2.5 2: NORED new LV connections outstanding cable",
    columns: lvCableColumns,
    rows: [
      {
        mainCentre: "NW AREA 1",
        cable10m: 26263,
        cable16m: 28516,
        cable16CoreDrums: 353,
        drums10: 53,
        drums16: 58,
        drums16Core: 1,
      },
      {
        mainCentre: "NW AREA 2",
        cable10m: 19381,
        cable16m: 28370,
        cable16CoreDrums: 376,
        drums10: 39,
        drums16: 57,
        drums16Core: 1,
      },
      {
        mainCentre: "Zambezi",
        cable10m: 4282,
        cable16m: 244,
        cable16CoreDrums: 314,
        drums10: 9,
        drums16: 1,
        drums16Core: 1,
      },
      {
        mainCentre: "Kavango",
        cable10m: 2714,
        cable16m: 769,
        cable16CoreDrums: 87,
        drums10: 6,
        drums16: 2,
        drums16Core: 1,
      },
      {
        mainCentre: "Totals",
        cable10m: 52640,
        cable16m: 57899,
        cable16CoreDrums: 1130,
        drums10: 107,
        drums16: 118,
        drums16Core: 4,
      },
    ],
    highlightLastRow: true,
  } satisfies ReportTableSection,
  challenges: [
    "The challenge remains the unavailability of construction materials that are occasionally out of stock.",
    "Weather, particularly flooding in the northwest and Zambezi, could delay MV and LV electrical installations.",
  ],
};

export const engineeringReportDefinitions: EngineeringReportDefinition[] = [
  {
    key: "monthly-engineering",
    title: "Monthly Engineering Report",
    description:
      "Pre-generated monthly report pack covering donated assets, MV and LV connections, movement analysis, and challenges.",
    helper: "Best for management reporting, board packs, and month-end engineering submissions.",
    formats: ["pdf", "xlsx", "json"],
  },
  {
    key: "status-register",
    title: "Status Register",
    description:
      "Detailed register for status queries, operational tracking, and handovers.",
    helper: "Reference, customer, dates, technical scope, assignment, meter, and GIS details.",
    formats: ["pdf", "xlsx", "csv", "json"],
  },
  {
    key: "allocation-queue",
    title: "Operations Follow-up Report",
    description:
      "Outstanding jobs that still need investigation, payment, allocation, or close-out.",
    helper: "Best for daily engineering and field coordination reviews.",
    formats: ["pdf", "xlsx", "csv", "json"],
  },
];

export function parseCurrency(value: string) {
  const cleaned = value.replace(/[^\d.-]/g, "");
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function formatCurrency(value: number) {
  return `N$${value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function buildEngineeringOverviewCards(): EngineeringOverviewCard[] {
  const mvTotalRow =
    monthlyEngineeringReport.mvSummary.rows[
      monthlyEngineeringReport.mvSummary.rows.length - 1
    ];
  const lvTotalRow =
    monthlyEngineeringReport.lvStatus.rows[
      monthlyEngineeringReport.lvStatus.rows.length - 1
    ];
  const totalPaid =
    parseCurrency(String(mvTotalRow?.amountPaid ?? "0")) +
    parseCurrency(String(lvTotalRow?.amountPaid ?? "0"));

  return [
    {
      title: "Donated assets tracked",
      value: String(monthlyEngineeringReport.donatedAssets.rows.length),
      helper: "Projects energised and recorded over the past three months.",
      icon: ClipboardList,
    },
    {
      title: "March MV / LV received",
      value: `${mvTotalRow?.receivedInMarch ?? 0} / ${lvTotalRow?.receivedInMarch ?? 0}`,
      helper: "New MV and LV applications received during the month under review.",
      icon: PlugZap,
    },
    {
      title: "Outstanding connections",
      value: String(
        Number(mvTotalRow?.totalOutstanding ?? 0) +
          Number(lvTotalRow?.totalOutstanding ?? 0),
      ),
      helper: "Combined MV and LV connections still open at month end.",
      icon: Wallet,
    },
    {
      title: "Paid value in March",
      value: formatCurrency(totalPaid),
      helper: "Combined MV and LV paid amounts reflected in the monthly report.",
      icon: FileSpreadsheet,
    },
  ];
}

export function buildReportCoverageCards(
  report: EngineeringMonthlyReport,
): EngineeringOverviewCard[] {
  return [
    {
      title: "Report sections",
      value: String(report.tableOfContents.length),
      helper: "Contents, introduction, donated assets, new connections, and challenges.",
      icon: BarChart3,
    },
    {
      title: "MV contractor phases",
      value: String(report.mvContractorPhases.length),
      helper: "Allocated contractor batches included in the monthly report pack.",
      icon: PlugZap,
    },
    {
      title: "Key stakeholder projects",
      value: String(report.keyStakeholderProjects.rows.length),
      helper: "Outstanding stakeholder-driven MV projects captured for follow-up.",
      icon: ClipboardList,
    },
    {
      title: "LV cable lines",
      value: String(
        Math.max(0, report.lvCableOutstanding.rows.length - (report.lvCableOutstanding.highlightLastRow ? 1 : 0)),
      ),
      helper: "Main centre cable outlook rows presented before the totals line.",
      icon: Wallet,
    },
  ];
}

export function getMonthlyReportDownloadLabel(format: EngineeringReportFormat) {
  switch (format) {
    case "pdf":
      return "Download PDF";
    case "xlsx":
      return "Download Excel";
    case "json":
      return "Pull JSON";
    case "csv":
      return "Download CSV";
  }
}

export const newConnectionReportApiBase =
  "/dashboard/api/engineering-services/new-connection-management/report";

export function getEngineeringReportHref(
  type: EngineeringReportType,
  format: EngineeringReportFormat,
) {
  return `${newConnectionReportApiBase}?type=${type}&format=${format}`;
}

type LiveConnectionRecord = {
  reference: string;
  quotationRef: string;
  customer: string;
  constituency?: string;
  keyStakeholder?: string;
  connectionClass: string;
  config?: string;
  connectionType: string;
  locality: string;
  region: string;
  status: string;
  applicationDate: string;
  investigationDate: string;
  quoteIssuedDate: string;
  fullPaymentDate: string;
  receivedDate: string;
  assignedDate: string;
  connectionDate: string;
  assignedTo: string;
  jobCardNumber: string;
  meterNumber: string;
  sealNumber: string;
  coordinates: string;
  coordinateSource?: string;
  networkReference?: string;
  mapReference?: string;
  projectValue: string;
  capitalContribution: string;
  mvLength: string;
  mvConductor?: string;
  lvLength: string;
  transformerRating: string;
  voltageRating: string;
  serviceConnection: string;
  comment: string;
  nextAction: string;
};

function parseDate(value?: string) {
  if (!value?.trim()) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function isSameMonth(date: Date | null, referenceDate: Date) {
  return Boolean(
    date &&
      date.getFullYear() === referenceDate.getFullYear() &&
      date.getMonth() === referenceDate.getMonth(),
  );
}

function addMonths(date: Date, offset: number) {
  const next = new Date(date.getFullYear(), date.getMonth() + offset, 1);
  next.setHours(0, 0, 0, 0);
  return next;
}

function getMonthStart(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function getMonthEnd(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
}

function getMonthLabel(date: Date) {
  return new Intl.DateTimeFormat("en-NA", {
    month: "long",
    year: "numeric",
  }).format(date);
}

function getShortMonthLabel(date: Date) {
  return new Intl.DateTimeFormat("en-NA", {
    month: "short",
  }).format(date);
}

function parseNumber(value?: string) {
  const cleaned = String(value ?? "").replace(/[^\d.-]/g, "");
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatDateValue(date: Date | null) {
  if (!date) return "";
  return new Intl.DateTimeFormat("en-NA", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);
}

function normalizeConnectionClassValue(connectionClass: string) {
  const normalized = connectionClass.trim().toLowerCase();
  if (normalized.startsWith("mv")) return "MV";
  if (normalized.startsWith("lv")) return "LV";
  return connectionClass.trim().toUpperCase();
}

function isMvRecord(record: LiveConnectionRecord) {
  return normalizeConnectionClassValue(record.connectionClass) === "MV";
}

function isLvRecord(record: LiveConnectionRecord) {
  return normalizeConnectionClassValue(record.connectionClass) === "LV";
}

function isEnergisedStatus(status: string) {
  return status.trim().toLowerCase() === "energised";
}

function isOpenStatus(status: string) {
  return !isEnergisedStatus(status);
}

function inferOperationalCentre(record: LiveConnectionRecord) {
  const fingerprint = `${record.region} ${record.locality} ${record.constituency ?? ""}`.toLowerCase();

  if (fingerprint.includes("katima") || fingerprint.includes("zambezi")) {
    return "Katima Mulilo";
  }
  if (fingerprint.includes("rundu") || fingerprint.includes("kavango")) {
    return "Rundu";
  }
  if (
    fingerprint.includes("ondangwa") ||
    fingerprint.includes("oshakati") ||
    fingerprint.includes("eenhana") ||
    fingerprint.includes("oniipa") ||
    fingerprint.includes("omuthiya") ||
    fingerprint.includes("ohangwena") ||
    fingerprint.includes("oshana") ||
    fingerprint.includes("omusati") ||
    fingerprint.includes("oshikoto")
  ) {
    return "Ondangwa";
  }

  return record.region || "Unassigned Centre";
}

function getPaidAmount(record: LiveConnectionRecord) {
  const contributionAmount = parseNumber(record.capitalContribution);
  if (contributionAmount > 0) return contributionAmount;
  return parseNumber(record.projectValue);
}

function getOpenBacklogCount(records: LiveConnectionRecord[], now: Date, months: number) {
  const threshold = addMonths(now, -months);
  return records.filter((record) => {
    const applicationDate = parseDate(record.applicationDate);
    return Boolean(applicationDate && applicationDate <= threshold && isOpenStatus(record.status));
  }).length;
}

function getAllocationBucketLabel(record: LiveConnectionRecord) {
  const assignedTo = record.assignedTo.trim();
  if (!assignedTo) return "Pending allocation";

  const normalized = assignedTo.toLowerCase();
  if (
    normalized.includes("team") ||
    normalized.includes("nored") ||
    normalized.includes("depot")
  ) {
    return assignedTo;
  }

  if (
    normalized.includes("desk") ||
    normalized.includes("follow-up") ||
    normalized.includes("review") ||
    normalized.includes("allocation")
  ) {
    return "Pending allocation";
  }

  return assignedTo;
}

function isTeamAssignment(record: LiveConnectionRecord) {
  const label = getAllocationBucketLabel(record).toLowerCase();
  return label !== "pending allocation" && (label.includes("team") || label.includes("nored"));
}

function isContractorAssignment(record: LiveConnectionRecord) {
  return getAllocationBucketLabel(record) !== "Pending allocation" && !isTeamAssignment(record);
}

function countPendingInspection(records: LiveConnectionRecord[]) {
  return records.filter((record) => {
    const combined = `${record.comment} ${record.nextAction}`.toLowerCase();
    return (
      record.status === "Under Investigation" ||
      combined.includes("inspection")
    );
  }).length;
}

function countPendingTieIn(records: LiveConnectionRecord[]) {
  return records.filter((record) => {
    const combined = `${record.comment} ${record.nextAction}`.toLowerCase();
    return combined.includes("tie-in") || combined.includes("tie in");
  }).length;
}

function countPendingEnergising(records: LiveConnectionRecord[]) {
  return records.filter((record) => {
    const combined = `${record.comment} ${record.nextAction}`.toLowerCase();
    return (
      !isEnergisedStatus(record.status) &&
      (combined.includes("energis") ||
        (record.meterNumber.trim() !== "" && record.sealNumber.trim() !== ""))
    );
  }).length;
}

function summarizeByCentre(
  records: LiveConnectionRecord[],
  now: Date,
) {
  const grouped = new Map<string, LiveConnectionRecord[]>();

  records.forEach((record) => {
    const centre = inferOperationalCentre(record);
    const bucket = grouped.get(centre) ?? [];
    bucket.push(record);
    grouped.set(centre, bucket);
  });

  const rows = Array.from(grouped.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([centreName, groupRecords]) => {
      const paidAmount = groupRecords
        .filter((record) => isSameMonth(parseDate(record.fullPaymentDate), now))
        .reduce((sum, record) => sum + getPaidAmount(record), 0);

      return {
        centreName,
        mainCentre: centreName,
        receivedInMarch: groupRecords.filter((record) =>
          isSameMonth(parseDate(record.applicationDate), now),
        ).length,
        amountPaid: formatCurrency(paidAmount),
        energisedInMarch: groupRecords.filter((record) =>
          isSameMonth(parseDate(record.connectionDate), now),
        ).length,
        totalOutstanding: groupRecords.filter((record) => isOpenStatus(record.status)).length,
        inProgress: groupRecords.filter(
          (record) =>
            record.status === "In Progress" || record.status === "Under Investigation",
        ).length,
        notAllocated: groupRecords.filter((record) => record.status === "Not Allocated").length,
        backlog: getOpenBacklogCount(groupRecords, now, 3),
      };
    });

  const totals = rows.reduce(
    (accumulator, row) => ({
      centreName: "Totals",
      mainCentre: "Totals",
      receivedInMarch: accumulator.receivedInMarch + Number(row.receivedInMarch),
      amountPaid: accumulator.amountPaid + parseCurrency(String(row.amountPaid)),
      energisedInMarch: accumulator.energisedInMarch + Number(row.energisedInMarch),
      totalOutstanding: accumulator.totalOutstanding + Number(row.totalOutstanding),
      inProgress: accumulator.inProgress + Number(row.inProgress),
      notAllocated: accumulator.notAllocated + Number(row.notAllocated),
      backlog: accumulator.backlog + Number(row.backlog),
    }),
    {
      centreName: "Totals",
      mainCentre: "Totals",
      receivedInMarch: 0,
      amountPaid: 0,
      energisedInMarch: 0,
      totalOutstanding: 0,
      inProgress: 0,
      notAllocated: 0,
      backlog: 0,
    },
  );

  if (rows.length > 0) {
    rows.push({
      ...totals,
      amountPaid: formatCurrency(totals.amountPaid),
    });
  }

  return rows;
}

function buildMovementSeries(
  records: LiveConnectionRecord[],
  now: Date,
  months = 6,
) {
  const monthPoints = Array.from({ length: months }, (_, index) => addMonths(now, -(months - 1 - index)));

  return monthPoints.map((monthDate) => {
    const monthStart = getMonthStart(monthDate);
    const monthEnd = getMonthEnd(monthDate);
    const received = records.filter((record) => {
      const applicationDate = parseDate(record.applicationDate);
      return Boolean(applicationDate && applicationDate >= monthStart && applicationDate <= monthEnd);
    }).length;
    const energised = records.filter((record) => {
      const connectionDate = parseDate(record.connectionDate);
      return Boolean(connectionDate && connectionDate >= monthStart && connectionDate <= monthEnd);
    }).length;
    const pending = records.filter((record) => {
      const applicationDate = parseDate(record.applicationDate);
      const connectionDate = parseDate(record.connectionDate);
      return Boolean(
        applicationDate &&
          applicationDate <= monthEnd &&
          (!connectionDate || connectionDate > monthEnd),
      );
    }).length;
    const backlog = records.filter((record) => {
      const applicationDate = parseDate(record.applicationDate);
      const connectionDate = parseDate(record.connectionDate);
      const backlogThreshold = addMonths(monthEnd, -6);
      return Boolean(
        applicationDate &&
          applicationDate <= backlogThreshold &&
          (!connectionDate || connectionDate > monthEnd),
      );
    }).length;
    const pendingEnergising = records.filter((record) => {
      const assignedDate = parseDate(record.assignedDate);
      const connectionDate = parseDate(record.connectionDate);
      return Boolean(
        assignedDate &&
          assignedDate <= monthEnd &&
          (!connectionDate || connectionDate > monthEnd) &&
          record.status !== "Not Allocated",
      );
    }).length;
    const paidAmount = records
      .filter((record) => {
        const paymentDate = parseDate(record.fullPaymentDate);
        return Boolean(paymentDate && paymentDate >= monthStart && paymentDate <= monthEnd);
      })
      .reduce((sum, record) => sum + getPaidAmount(record), 0);

    return {
      monthDate,
      month: getShortMonthLabel(monthDate),
      longMonth: getMonthLabel(monthDate),
      received,
      energised,
      pending,
      backlog,
      pendingEnergising,
      paidAmount,
    };
  });
}

function buildCableSummaryRows(records: LiveConnectionRecord[]) {
  const grouped = new Map<
    string,
    {
      cable10m: number;
      cable16m: number;
      cable16CoreLength: number;
    }
  >();

  records.forEach((record) => {
    const centre = inferOperationalCentre(record);
    const bucket = grouped.get(centre) ?? {
      cable10m: 0,
      cable16m: 0,
      cable16CoreLength: 0,
    };
    const serviceConnection = record.serviceConnection.toLowerCase();
    const lvLength = parseNumber(record.lvLength);

    if (serviceConnection.includes("10")) {
      bucket.cable10m += lvLength;
    } else if (serviceConnection.includes("16") && (serviceConnection.includes("4c") || serviceConnection.includes("4 core") || serviceConnection.includes("x 4"))) {
      bucket.cable16CoreLength += lvLength;
    } else if (serviceConnection.includes("16")) {
      bucket.cable16m += lvLength;
    }

    grouped.set(centre, bucket);
  });

  const rows = Array.from(grouped.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([mainCentre, bucket]) => ({
      mainCentre,
      cable10m: Math.round(bucket.cable10m),
      cable16m: Math.round(bucket.cable16m),
      cable16CoreDrums: Math.round(bucket.cable16CoreLength),
      drums10: Math.ceil(bucket.cable10m / 500),
      drums16: Math.ceil(bucket.cable16m / 500),
      drums16Core: Math.ceil(bucket.cable16CoreLength / 500),
    }));

  if (rows.length > 0) {
    rows.push(
      rows.reduce(
        (accumulator, row) => ({
          mainCentre: "Totals",
          cable10m: accumulator.cable10m + Number(row.cable10m),
          cable16m: accumulator.cable16m + Number(row.cable16m),
          cable16CoreDrums:
            accumulator.cable16CoreDrums + Number(row.cable16CoreDrums),
          drums10: accumulator.drums10 + Number(row.drums10),
          drums16: accumulator.drums16 + Number(row.drums16),
          drums16Core: accumulator.drums16Core + Number(row.drums16Core),
        }),
        {
          mainCentre: "Totals",
          cable10m: 0,
          cable16m: 0,
          cable16CoreDrums: 0,
          drums10: 0,
          drums16: 0,
          drums16Core: 0,
        },
      ),
    );
  }

  return rows;
}

export function buildDynamicMonthlyEngineeringReport(
  connections: LiveConnectionRecord[],
  now = new Date(),
): EngineeringMonthlyReport {
  const monthLabel = getMonthLabel(now);
  const mvConnections = connections.filter(isMvRecord);
  const lvConnections = connections.filter(isLvRecord);
  const mvSummaryRows = summarizeByCentre(mvConnections, now);
  const lvSummaryRows = summarizeByCentre(lvConnections, now);
  const liveMovementSeries = buildMovementSeries(mvConnections, now, 6);
  const teamAssignments = mvConnections.filter(isTeamAssignment);
  const contractorAssignments = mvConnections.filter(isContractorAssignment);
  const stakeholderProjects = mvConnections.filter(
    (record) => record.keyStakeholder?.trim() && isOpenStatus(record.status),
  );
  const cableSummaryRows = buildCableSummaryRows(lvConnections.filter((record) => isOpenStatus(record.status)));

  const teamGroups = Array.from(
    teamAssignments.reduce((map, record) => {
      const key = getAllocationBucketLabel(record);
      const bucket = map.get(key) ?? [];
      bucket.push(record);
      map.set(key, bucket);
      return map;
    }, new Map<string, LiveConnectionRecord[]>()),
  )
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([assignedTo, records]) => ({
      assignedTo,
      assignedProjects: records.length,
      energised: records.filter((record) => isEnergisedStatus(record.status)).length,
      pendingInspection: countPendingInspection(records),
      pendingTieIn: countPendingTieIn(records),
      inProgress: records.filter((record) => record.status === "In Progress").length,
      outstanding: records.filter((record) => isOpenStatus(record.status)).length,
    }));

  if (teamGroups.length > 0) {
    teamGroups.push(
      teamGroups.reduce(
        (accumulator, row) => ({
          assignedTo: "Totals",
          assignedProjects: accumulator.assignedProjects + Number(row.assignedProjects),
          energised: accumulator.energised + Number(row.energised),
          pendingInspection: accumulator.pendingInspection + Number(row.pendingInspection),
          pendingTieIn: accumulator.pendingTieIn + Number(row.pendingTieIn),
          inProgress: accumulator.inProgress + Number(row.inProgress),
          outstanding: accumulator.outstanding + Number(row.outstanding),
        }),
        {
          assignedTo: "Totals",
          assignedProjects: 0,
          energised: 0,
          pendingInspection: 0,
          pendingTieIn: 0,
          inProgress: 0,
          outstanding: 0,
        },
      ),
    );
  }

  const contractorGroups = Array.from(
    contractorAssignments.reduce((map, record) => {
      const key = getAllocationBucketLabel(record);
      const bucket = map.get(key) ?? [];
      bucket.push(record);
      map.set(key, bucket);
      return map;
    }, new Map<string, LiveConnectionRecord[]>()),
  )
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([contractor, records]) => ({
      contractor,
      assigned: records.length,
      energised: records.filter((record) => isEnergisedStatus(record.status)).length,
      pendingEnergising: countPendingEnergising(records),
      pendingTieIn: countPendingTieIn(records),
      inProgress: records.filter((record) => record.status === "In Progress").length,
      onHold: records.filter((record) => record.status === "On Hold").length,
      outstanding: records.filter((record) => isOpenStatus(record.status)).length,
    }));

  if (contractorGroups.length > 0) {
    contractorGroups.push(
      contractorGroups.reduce(
        (accumulator, row) => ({
          contractor: "Total",
          assigned: accumulator.assigned + Number(row.assigned),
          energised: accumulator.energised + Number(row.energised),
          pendingEnergising:
            accumulator.pendingEnergising + Number(row.pendingEnergising),
          pendingTieIn: accumulator.pendingTieIn + Number(row.pendingTieIn),
          inProgress: accumulator.inProgress + Number(row.inProgress),
          onHold: accumulator.onHold + Number(row.onHold),
          outstanding: accumulator.outstanding + Number(row.outstanding),
        }),
        {
          contractor: "Total",
          assigned: 0,
          energised: 0,
          pendingEnergising: 0,
          pendingTieIn: 0,
          inProgress: 0,
          onHold: 0,
          outstanding: 0,
        },
      ),
    );
  }

  const paidThisMonth = connections
    .filter((record) => isSameMonth(parseDate(record.fullPaymentDate), now))
    .reduce((sum, record) => sum + getPaidAmount(record), 0);
  const outstandingTotal = connections.filter((record) => isOpenStatus(record.status)).length;
  const notAllocatedCount = connections.filter((record) => record.status === "Not Allocated").length;
  const onHoldCount = connections.filter((record) => record.status === "On Hold").length;
  const missingCloseOutCount = connections.filter(
    (record) =>
      (record.status === "In Progress" || record.status === "Energised") &&
      (!record.meterNumber.trim() || !record.sealNumber.trim()),
  ).length;
  const awaitingPaymentCount = connections.filter(
    (record) => record.status === "Awaiting Payment",
  ).length;

  const challenges = [
    notAllocatedCount > 0
      ? `${notAllocatedCount} live applications are still not allocated and need operational follow-up.`
      : null,
    onHoldCount > 0
      ? `${onHoldCount} applications are currently on hold due to unresolved field or customer issues.`
      : null,
    missingCloseOutCount > 0
      ? `${missingCloseOutCount} records still need meter or seal close-out details to complete the operational trail.`
      : null,
    awaitingPaymentCount > 0
      ? `${awaitingPaymentCount} applications are still awaiting payment confirmation before they can progress.`
      : null,
    !notAllocatedCount && !onHoldCount && !missingCloseOutCount && !awaitingPaymentCount
      ? "No major system-derived challenges are currently flagged from the live new connection register."
      : null,
  ].filter((value): value is string => Boolean(value));

  return {
    monthLabel,
    reportTitle: "Engineering Department Project Division Monthly Report",
    introduction: `This report presents the live activities of the Engineering Department Project Division for ${monthLabel}. The report is generated directly from the current new connection register and reflects the latest MV and LV connection activity, operational assignments, status movement, and close-out progress in the system at the time of viewing.`,
    tableOfContents: [
      "1. Introduction",
      "2. Asset and Project Management Division",
      "2.1 Donated Assets",
      "2.2 New Connections",
      "2.3 Challenges",
    ],
    donatedAssets: {
      key: "donated-assets",
      sectionNumber: "2.1",
      title: "Donated Assets",
      tableLabel: `Table 2.1.1: Donated Assets captured in the system for ${monthLabel}`,
      summary:
        "This section becomes live as soon as donated asset records are captured in the system.",
      note:
        "No dedicated donated asset records are currently stored in this new connection register.",
      columns: donatedAssetsColumns,
      rows: [],
    },
    mvSummary: {
      key: "mv-summary",
      sectionNumber: "2.2.1",
      title: "NORED MV Connections Summary",
      tableLabel: `Table 2.2.1: ${monthLabel} MV connections statistics synopsis`,
      summary:
        "This table gives the live status of MV connections under review for the current reporting month.",
      note:
        "Counts are generated from the current register using application, payment, and connection dates stored on each MV application.",
      columns: mvSynopsisColumns,
      rows: mvSummaryRows,
      highlightLastRow: true,
    },
    mvNoredTeams: {
      key: "mv-nored-teams",
      sectionNumber: "2.2.2",
      title: "MV Connections with NORED Construction Teams",
      tableLabel: `Table 2.2.2: MV connections currently assigned to NORED teams`,
      summary:
        "This view groups MV applications by internal NORED team assignment using the live assigned-to value on each profile.",
      columns: mvTeamColumns,
      rows: teamGroups,
      highlightLastRow: true,
    },
    mvContractorPhases: [
      {
        key: "mv-contractors-live",
        sectionNumber: "2.2.3",
        title: "MV Connections with MV Contractors",
        tableLabel: `Table 2.2.3: Live MV contractor allocation status for ${monthLabel}`,
        summary:
          "This table groups MV applications that are allocated to contractor-type assignees in the current register.",
        note:
          "Contractor grouping is based on the current assignee on the application profile rather than historical batch allocation files.",
        columns: mvContractorColumns,
        rows: contractorGroups,
        highlightLastRow: true,
      },
    ],
    mvMovementTable: {
      key: "mv-movement",
      sectionNumber: "2.2.3",
      title: "Monthly New MV Connections Movement",
      tableLabel: "Table 2.2.4: Live monthly MV movement based on the last six months",
      summary:
        "The movement below is generated from the dates recorded on the MV application profiles for the past six reporting months.",
      columns: [
        { key: "month", label: "Month" },
        { key: "received", label: "Received", align: "right", tone: "info" },
        { key: "outstanding", label: "Outstanding", align: "right", tone: "danger" },
        { key: "energised", label: "Energised", align: "right", tone: "success" },
        { key: "receivedPvPo", label: "Amount paid (N$)", align: "right", tone: "info" },
      ],
      rows: liveMovementSeries.map((point) => ({
        month: point.longMonth,
        received: point.received,
        outstanding: point.pending,
        energised: point.energised,
        receivedPvPo: formatCurrency(point.paidAmount),
      })),
    },
    mvMovementChart: liveMovementSeries.map((point) => ({
      month: point.month,
      received: point.received,
      energised: point.energised,
      pendingEnergising: point.pendingEnergising,
      pending: point.pending,
      backlog: point.backlog,
    })),
    keyStakeholderProjects: {
      key: "key-stakeholder-projects",
      sectionNumber: "2.2.4",
      title: "Key Stakeholder MV connections",
      tableLabel: "Table 2.2.5: Outstanding key stakeholder MV projects",
      columns: keyStakeholderColumns,
      rows: stakeholderProjects.map((record) => ({
        stakeholder: record.keyStakeholder ?? "",
        constituency: record.constituency ?? "",
        locality: record.locality,
        reference: record.reference,
        statusComment: record.comment || record.nextAction || record.status,
      })),
    },
    lvStatus: {
      key: "lv-status",
      sectionNumber: "2.2.5",
      title: "NORED LV Connections Status",
      tableLabel: `Table 2.2.6: ${monthLabel} live LV connections status`,
      columns: [
        { key: "mainCentre", label: "Name of Main Centre" },
        { key: "receivedInMarch", label: `Received in ${new Intl.DateTimeFormat("en-NA", { month: "long" }).format(now)}`, align: "right", tone: "info" },
        { key: "amountPaid", label: "Amount paid (N$)", align: "right", tone: "info" },
        { key: "energisedInMarch", label: `Energised in ${new Intl.DateTimeFormat("en-NA", { month: "long" }).format(now)}`, align: "right", tone: "success" },
        { key: "totalOutstanding", label: "Total outstanding", align: "right", tone: "warning" },
        { key: "backlog", label: "Backlog >3 months", align: "right", tone: "danger" },
      ],
      rows: lvSummaryRows.map((row) => ({
        mainCentre: row.mainCentre,
        receivedInMarch: row.receivedInMarch,
        amountPaid: row.amountPaid,
        energisedInMarch: row.energisedInMarch,
        totalOutstanding: row.totalOutstanding,
        backlog: row.backlog,
      })),
      highlightLastRow: true,
    },
    lvCableOutstanding: {
      key: "lv-cable-outstanding",
      sectionNumber: "2.2.5",
      title: "NORED new LV connections outstanding cable",
      tableLabel: "Table 2.2.7: Live LV cable quantities required for open connections",
      summary:
        "Cable lengths and drum estimates are calculated from the open LV connection records currently stored in the register.",
      columns: [
        { key: "mainCentre", label: "Main Centre Name" },
        { key: "cable10m", label: "10mm2 (m)", align: "right", tone: "info" },
        { key: "cable16m", label: "16mm2 (m)", align: "right", tone: "info" },
        { key: "cable16CoreDrums", label: "16mm2 4-Core (m)", align: "right", tone: "info" },
        { key: "drums10", label: "10mm2 (drums est.)", align: "right", tone: "warning" },
        { key: "drums16", label: "16mm2 (drums est.)", align: "right", tone: "warning" },
        { key: "drums16Core", label: "16mm2 4-Core (drums est.)", align: "right", tone: "warning" },
      ],
      rows: cableSummaryRows,
      highlightLastRow: true,
    },
    challenges,
  };
}

export function buildEngineeringOverviewCardsFromConnections(
  connections: LiveConnectionRecord[],
  now = new Date(),
): EngineeringOverviewCard[] {
  const monthName = new Intl.DateTimeFormat("en-NA", { month: "long" }).format(now);
  const receivedThisMonth = connections.filter((record) =>
    isSameMonth(parseDate(record.applicationDate), now),
  );
  const paidThisMonth = connections
    .filter((record) => isSameMonth(parseDate(record.fullPaymentDate), now))
    .reduce((sum, record) => sum + getPaidAmount(record), 0);
  const openConnections = connections.filter((record) => isOpenStatus(record.status));
  const mvReceivedThisMonth = receivedThisMonth.filter(isMvRecord).length;
  const lvReceivedThisMonth = receivedThisMonth.filter(isLvRecord).length;

  return [
    {
      title: "Live applications",
      value: String(connections.length),
      helper: "Connection profiles currently stored in the live register.",
      icon: ClipboardList,
    },
    {
      title: `${monthName} MV / LV received`,
      value: `${mvReceivedThisMonth} / ${lvReceivedThisMonth}`,
      helper: "Applications received in the current month, split by MV and LV.",
      icon: PlugZap,
    },
    {
      title: "Outstanding connections",
      value: String(openConnections.length),
      helper: "Applications still open and not yet fully energised.",
      icon: Wallet,
    },
    {
      title: `${monthName} paid value`,
      value: formatCurrency(paidThisMonth),
      helper: "Live paid amount derived from records with payment dates in the current month.",
      icon: FileSpreadsheet,
    },
  ];
}
