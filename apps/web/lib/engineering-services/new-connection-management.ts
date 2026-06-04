import type { LucideIcon } from "lucide-react";
import {
  ClipboardList,
  MapPinned,
  PlugZap,
  Wallet,
} from "lucide-react";

export const connectionStatusOptions = [
  "Received",
  "Under Investigation",
  "Awaiting Payment",
  "Awaiting Wayleave",
  "Not Allocated",
  "In Progress",
  "Energised",
  "On Hold",
] as const;

export type ConnectionStatus = (typeof connectionStatusOptions)[number];

export const connectionPriorityOptions = ["Low", "Normal", "High", "Urgent"] as const;

export type ConnectionPriority = (typeof connectionPriorityOptions)[number];

export const defaultConnectionPriority: ConnectionPriority = "Normal";

export function normalizeConnectionPriority(value?: string | null): ConnectionPriority {
  const normalized = (value ?? "").trim().toLowerCase();
  const match = connectionPriorityOptions.find(
    (option) => option.toLowerCase() === normalized,
  );
  return match ?? defaultConnectionPriority;
}

export const connectionPriorityBadgeClassNames: Record<ConnectionPriority, string> = {
  Low: "bg-slate-100 text-slate-700",
  Normal: "bg-sky-100 text-sky-800",
  High: "bg-amber-100 text-amber-800",
  Urgent: "bg-red-100 text-red-800",
};

export const workflowOperationalFieldKeys = [
  "status",
  "assignedTo",
  "nextAction",
  "comment",
] as const;

export interface DashboardCard {
  title: string;
  value: string;
  helper: string;
  icon: LucideIcon;
}

export interface StatusBucket {
  title: ConnectionStatus;
  count: number;
  helper: string;
}

export interface GisLayer {
  title: string;
  description: string;
}

export interface CaptureField {
  key: string;
  label: string;
  type: "text" | "date" | "number" | "select" | "textarea";
  placeholder?: string;
  helper?: string;
  required?: boolean;
  span?: "default" | "wide";
  options?: string[];
  dependsOn?: string;
  optionGroups?: Record<string, string[]>;
  disabledPlaceholder?: string;
}

export interface CaptureSection {
  key: string;
  title: string;
  description: string;
  fields: CaptureField[];
}

export interface WorkflowStep {
  title: string;
  helper: string;
  emphasis: string;
}

export interface MapSummaryPin {
  id: string;
  label: string;
  count: number;
  color: string;
  x: string;
  y: string;
}

export interface ConnectionRecord {
  reference: string;
  quotationRef: string;
  customer: string;
  priority: ConnectionPriority;
  constituency?: string;
  keyStakeholder?: string;
  connectionClass: string;
  config?: string;
  connectionType: string;
  locality: string;
  region: string;
  status: ConnectionStatus;
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
}

export interface ReportDefinition {
  key: "summary" | "status-register" | "allocation-queue";
  title: string;
  description: string;
  helper: string;
}

const legacyStatusMap: Record<string, ConnectionStatus> = {
  Received: "Received",
  "Under Investigation": "Under Investigation",
  "Awaiting Payment": "Awaiting Payment",
  "Awaiting Wayleave": "Awaiting Wayleave",
  "Awaiting Allocation": "Not Allocated",
  "Not Allocated": "Not Allocated",
  "In Progress": "In Progress",
  Connected: "Energised",
  Energised: "Energised",
  "On Hold": "On Hold",
};

export function normalizeConnectionStatus(value?: string | null): ConnectionStatus {
  const normalized = value?.trim() ?? "";
  return legacyStatusMap[normalized] ?? "Received";
}

export function getConnectionStatusFilterValues(status?: string | null): string[] {
  const normalized = status?.trim() ?? "";
  if (!normalized) return [];
  if (normalized === "Not Allocated") {
    return ["Not Allocated", "Awaiting Allocation"];
  }
  if (normalized === "Energised") {
    return ["Energised", "Connected"];
  }
  return [normalized];
}

export function isCompletedConnectionStatus(status?: string | null) {
  return normalizeConnectionStatus(status) === "Energised";
}

const statusHelperMap: Record<ConnectionStatus, string> = {
  Received: "New applications that are logged and waiting for the next operational step.",
  "Under Investigation":
    "Jobs being verified in the field or still waiting for technical findings to be captured.",
  "Awaiting Payment":
    "Quotation has been prepared, but payment confirmation is still outstanding.",
  "Awaiting Wayleave":
    "Payment is settled, but construction is blocked until land access or route wayleave is granted.",
  "Not Allocated":
    "The application is in the queue but still waiting for allocation to a responsible team or contractor.",
  "In Progress": "Connection work is underway and still needs final installation or close-out.",
  Energised: "Connection is complete and now sits in the Connections area for preview and update requests.",
  "On Hold": "The application is blocked by missing information, approvals, or customer actions.",
};

export const regionOptions = [
  "Kavango East",
  "Kavango West",
  "Kunene",
  "Ohangwena",
  "Omusati",
  "Oshana",
  "Oshikoto",
  "Zambezi",
];

const constituencyOptionsByRegion: Record<string, string[]> = {
  Erongo: [
    "Arandis",
    "Daures",
    "Karibib",
    "Swakopmund",
    "Walvis Bay Rural",
    "Walvis Bay Urban",
  ],
  Hardap: [
    "Aranos",
    "Mariental Rural",
    "Mariental Urban",
    "Rehoboth Rural",
    "Rehoboth Urban East",
    "Rehoboth Urban West",
  ],
  Karas: [
    "Berseba",
    "Karasburg East",
    "Karasburg West",
    "Keetmanshoop Rural",
    "Keetmanshoop Urban",
    "Luderitz",
    "Oranjemund",
  ],
  "Kavango East": [
    "Kapako",
    "Mukuvi",
    "Ndiyona",
    "Ndonga Linena",
    "Rundu Rural",
    "Rundu Urban",
  ],
  "Kavango West": [
    "Mpungu",
    "Musese",
    "Ncamagoro",
    "Ncuncuni",
    "Nkurenkuru",
    "Tondoro",
  ],
  Khomas: [
    "John Pandeni",
    "Katutura Central",
    "Katutura East",
    "Khomasdal",
    "Moses Garoeb",
    "Samora Machel",
    "Tobias Hainyeko",
    "Windhoek East",
    "Windhoek Rural",
    "Windhoek West",
  ],
  Kunene: [
    "Epupa",
    "Kamanjab",
    "Khorixas",
    "Opuwo Rural",
    "Opuwo Urban",
    "Outjo",
  ],
  Ohangwena: [
    "Eenhana",
    "Endola",
    "Engela",
    "Epembe",
    "Ohangwena",
    "Okongo",
    "Omulonga",
    "Ondobe",
    "Ongenga",
    "Oshikango",
  ],
  Omaheke: ["Aminuis", "Epukiro", "Gobabis", "Kalahari", "Otjinene"],
  Omusati: [
    "Anamulenge",
    "Elim",
    "Etayi",
    "Ogongo",
    "Okahao",
    "Onesi",
    "Oshikuku",
    "Outapi",
    "Ruacana",
    "Tsandi",
  ],
  Oshana: [
    "Okaku",
    "Ompundja",
    "Ondangwa Urban",
    "Ongwediva",
    "Oshakati East",
    "Oshakati West",
    "Uuvudhiya",
  ],
  Oshikoto: [
    "Eengodi",
    "Guinas",
    "Nehale lya Mpingana",
    "Okankolo",
    "Olukonda",
    "Omuthiya",
    "Onayena",
    "Oniipa",
    "Tsumeb",
  ],
  Otjozondjupa: ["Grootfontein", "Okahandja", "Okakarara", "Otavi", "Otjiwarongo"],
  Zambezi: [
    "Judea Lyaboloma",
    "Kabbe North",
    "Kabbe South",
    "Katima Mulilo Rural",
    "Katima Mulilo Urban",
    "Kongola",
    "Linyanti",
    "Sibbinda",
  ],
};

const connectionClassOptions = ["MV", "LV cable", "LV ABC"];
const configOptions = ["HLPCD", "A-Frame", "ABC", "UG"];
const connectionTypeOptions = ["Single Phase", "Three Phase"];
const mvConductorOptions = ["Gopher", "Rabbit", "Maggpie"];
const lvCableOptions = [
  "10mm2 x 2C",
  "16mm2 x 2C",
  "16mm2 x 4C",
  "25mm2 x 4C",
  "35mm2 x 4C",
  "50mm2 x 4C",
  "70mm2 x 4C + street light",
  "95mm2 x 4C",
];
const transformerVoltageOptions = ["0.42kV", "11kV", "19kV", "22kV", "33kV"];
const transformerSizeOptions = [
  "16kVA",
  "25kVA",
  "32kVA",
  "50kVA",
  "100kVA",
  "200kVA",
  "315kVA",
  "500kVA",
];

function normalizeConnectionClass(value: string) {
  const normalized = value.trim().toLowerCase();
  if (normalized.startsWith("mv")) return "MV";
  if (normalized.startsWith("lv")) return "LV";
  return null;
}

export const connectionStatusBadgeClassNames: Record<ConnectionStatus, string> = {
  Received: "bg-amber-100 text-amber-800",
  "Under Investigation": "bg-orange-100 text-orange-800",
  "Awaiting Payment": "bg-yellow-100 text-yellow-800",
  "Awaiting Wayleave": "bg-purple-100 text-purple-800",
  "Not Allocated": "bg-red-100 text-red-800",
  "In Progress": "bg-sky-100 text-sky-800",
  Energised: "bg-green-100 text-green-800",
  "On Hold": "bg-slate-200 text-slate-800",
};

export const captureSections: CaptureSection[] = [
  {
    key: "customer",
    title: "Customer details",
    description: "Capture the project identity, area, region, and constituency first.",
    fields: [
      {
        key: "reference",
        label: "Project No.",
        type: "text",
        placeholder: "NCM-2026-0189",
        required: true,
      },
      {
        key: "customerName",
        label: "Project name",
        type: "text",
        placeholder: "Enter project name",
        required: true,
      },
      {
        key: "locality",
        label: "Project area",
        type: "text",
        placeholder: "Type the project area",
        required: true,
      },
      {
        key: "region",
        label: "Region",
        type: "select",
        required: true,
        options: regionOptions,
      },
      {
        key: "constituency",
        label: "Constituency",
        type: "select",
        required: true,
        dependsOn: "region",
        optionGroups: constituencyOptionsByRegion,
        disabledPlaceholder: "Select region first",
      },
      {
        key: "keyStakeholder",
        label: "Key stakeholder",
        type: "text",
        placeholder: "Enter key stakeholder",
        required: true,
      },
      {
        key: "priority",
        label: "Priority",
        type: "select",
        options: [...connectionPriorityOptions],
        helper: "Used to triage the operations queue and reporting.",
      },
    ],
  },
  {
    key: "tracking",
    title: "Tracking and milestones",
    description: "Follow the application through quotation, payment, allocation, and connection.",
    fields: [
      {
        key: "quotationRef",
        label: "Quotation number / reference",
        type: "text",
        placeholder: "QTN-2026-0484",
      },
      {
        key: "applicationDate",
        label: "Application date",
        type: "date",
        required: true,
      },
      {
        key: "receivedDate",
        label: "Date received",
        type: "date",
      },
      {
        key: "investigationDate",
        label: "Investigation date",
        type: "date",
      },
      {
        key: "quoteIssuedDate",
        label: "Quote issued date",
        type: "date",
      },
      {
        key: "fullPaymentDate",
        label: "Paid date",
        type: "date",
      },
      {
        key: "assignedDate",
        label: "Assigned / allocated date",
        type: "date",
      },
      {
        key: "connectionDate",
        label: "Connection date",
        type: "date",
      },
    ],
  },
  {
    key: "technical",
    title: "Technical connection details",
    description: "Store the MV/LV design, configuration, distance, cable, and transformer details.",
    fields: [
      {
        key: "connectionClass",
        label: "Type (MV/LV)",
        type: "select",
        required: true,
        options: connectionClassOptions,
      },
      {
        key: "config",
        label: "Config",
        type: "select",
        required: true,
        options: configOptions,
      },
      {
        key: "connectionType",
        label: "Connection type",
        type: "select",
        required: true,
        options: connectionTypeOptions,
      },
      {
        key: "projectValue",
        label: "Project value",
        type: "text",
        placeholder: "N$0.00",
      },
      {
        key: "capitalContribution",
        label: "Capital contribution",
        type: "text",
        placeholder: "N$0.00",
      },
      {
        key: "mvLength",
        label: "MV distance (m)",
        type: "number",
        placeholder: "Enter MV distance in meters",
      },
      {
        key: "mvConductor",
        label: "Conductor",
        type: "select",
        options: mvConductorOptions,
      },
      {
        key: "lvLength",
        label: "LV distance (m)",
        type: "number",
        placeholder: "Enter LV distance in meters",
      },
      {
        key: "transformerRating",
        label: "Transformer size",
        type: "select",
        options: transformerSizeOptions,
      },
      {
        key: "voltageRating",
        label: "Transformer voltage",
        type: "select",
        options: transformerVoltageOptions,
      },
      {
        key: "serviceConnection",
        label: "Cable",
        type: "select",
        options: lvCableOptions,
      },
      {
        key: "jobCardNumber",
        label: "Job card number",
        type: "text",
        placeholder: "JC-000000",
      },
    ],
  },
  {
    key: "gis",
    title: "GIS and close-out",
    description: "Keep the spatial, meter, and completion details in the same record.",
    fields: [
      {
        key: "coordinates",
        label: "Coordinates",
        type: "text",
        placeholder: "-22.5609, 17.0658",
        helper: "Use the map picker below to drop a point and fill this automatically.",
      },
      {
        key: "coordinateSource",
        label: "Coordinate source",
        type: "select",
        options: [
          "Site visit",
          "Customer pin",
          "GIS desk review",
          "Map picker",
          "Current location",
          "As-built update",
        ],
      },
      {
        key: "networkReference",
        label: "Nearest pole / feeder / kiosk",
        type: "text",
        placeholder: "Enter network reference",
      },
      {
        key: "mapReference",
        label: "Map reference",
        type: "text",
        placeholder: "GIS sheet, route, or feeder reference",
      },
      {
        key: "meterNumber",
        label: "Meter number",
        type: "text",
        placeholder: "Enter meter number",
      },
      {
        key: "sealNumber",
        label: "Seal number",
        type: "text",
        placeholder: "Enter seal number",
      },
    ],
  },
];

export const workflowSteps: WorkflowStep[] = [
  {
    title: "Receive and register",
    helper: "Create the reference, capture customer details, and log the service location.",
    emphasis: "Customer identity, region, locality, and reference must exist from day one.",
  },
  {
    title: "Investigate and quote",
    helper: "Capture field investigation findings and prepare the quotation record.",
    emphasis: "Technical scope and quotation milestones should stay attached to the same record.",
  },
  {
    title: "Confirm payment and allocate",
    helper: "Update payment milestones and assign the job to a team or contractor.",
    emphasis: "The operational queue should be searchable by payment date, area, and assignee.",
  },
  {
    title: "Connect and close out",
    helper: "Record the job card, meter, seal, coordinates, and final connection date.",
    emphasis: "Close-out should make future status queries possible without paper chasing.",
  },
  {
    title: "Review and submit",
    helper: "Check the full record before the application is finally submitted into the queue.",
    emphasis: "Submission should happen after the entire record is reviewed, not while the user is still capturing.",
  },
];

export const gisLayers: GisLayer[] = [
  {
    title: "Customer and locality point",
    description: "Search by customer, application reference, village, town, or service area.",
  },
  {
    title: "Network take-off context",
    description: "Tie each job to the nearest pole, feeder, kiosk, transformer, or T-off point.",
  },
  {
    title: "MV and LV build footprint",
    description: "Plot the actual MV, LV, and service-connection distances for each application.",
  },
  {
    title: "Meter and seal close-out point",
    description: "Store the final installed meter, seal, and completion point for follow-up and reporting.",
  },
];

export const recentConnections: ConnectionRecord[] = [
  {
    reference: "NCM-2026-0181",
    quotationRef: "QTN-2026-0448",
    customer: "Maria Kavetuna",
    priority: "Normal",
    connectionClass: "LV",
    connectionType: "Single Phase",
    locality: "Ondangwa West",
    region: "Northern",
    status: "Received",
    applicationDate: "2026-04-24",
    investigationDate: "",
    quoteIssuedDate: "",
    fullPaymentDate: "",
    receivedDate: "2026-04-24",
    assignedDate: "",
    connectionDate: "",
    assignedTo: "Intake Desk",
    jobCardNumber: "",
    meterNumber: "",
    sealNumber: "",
    coordinates: "-17.9116, 15.9512",
    coordinateSource: "",
    networkReference: "",
    mapReference: "",
    projectValue: "",
    capitalContribution: "",
    mvLength: "",
    lvLength: "35 m",
    transformerRating: "",
    voltageRating: "400/230 V",
    serviceConnection: "35 m service wire",
    comment: "Awaiting investigation scheduling.",
    nextAction: "Schedule site investigation",
  },
  {
    reference: "NCM-2026-0174",
    quotationRef: "QTN-2026-0416",
    customer: "Zambezi Agro Depot",
    priority: "High",
    connectionClass: "MV",
    connectionType: "Three Phase",
    locality: "Ngoma",
    region: "Zambezi",
    status: "Not Allocated",
    applicationDate: "2026-04-08",
    investigationDate: "2026-04-11",
    quoteIssuedDate: "2026-04-15",
    fullPaymentDate: "2026-04-21",
    receivedDate: "2026-04-08",
    assignedDate: "",
    connectionDate: "",
    assignedTo: "Pending allocation",
    jobCardNumber: "",
    meterNumber: "",
    sealNumber: "",
    coordinates: "-17.8944, 24.0549",
    coordinateSource: "",
    networkReference: "",
    mapReference: "",
    projectValue: "N$186,340.00",
    capitalContribution: "N$46,585.00",
    mvLength: "420 m",
    lvLength: "65 m",
    transformerRating: "25 kVA",
    voltageRating: "33 kV",
    serviceConnection: "Three phase supply",
    comment: "Commercial milestone complete and ready for field dispatch.",
    nextAction: "Assign contractor and issue job card",
  },
  {
    reference: "NCM-2026-0169",
    quotationRef: "QTN-2026-0398",
    customer: "Kandjengo Primary School",
    priority: "Normal",
    connectionClass: "LV",
    connectionType: "Single Phase",
    locality: "Eenhana",
    region: "Northern",
    status: "Awaiting Payment",
    applicationDate: "2026-04-04",
    investigationDate: "2026-04-06",
    quoteIssuedDate: "2026-04-12",
    fullPaymentDate: "",
    receivedDate: "2026-04-04",
    assignedDate: "",
    connectionDate: "",
    assignedTo: "Commercial follow-up",
    jobCardNumber: "",
    meterNumber: "",
    sealNumber: "",
    coordinates: "-17.4694, 16.3326",
    coordinateSource: "",
    networkReference: "",
    mapReference: "",
    projectValue: "N$14,880.00",
    capitalContribution: "",
    mvLength: "",
    lvLength: "48 m",
    transformerRating: "",
    voltageRating: "400/230 V",
    serviceConnection: "10 mm x 2 core",
    comment: "Quotation shared and awaiting proof of payment.",
    nextAction: "Follow up on payment confirmation",
  },
  {
    reference: "NCM-2026-0158",
    quotationRef: "QTN-2026-0369",
    customer: "Tsumeb Fuel Stop",
    priority: "High",
    connectionClass: "MV",
    connectionType: "Three Phase",
    locality: "Tsumeb South",
    region: "Central",
    status: "In Progress",
    applicationDate: "2026-03-28",
    investigationDate: "2026-03-30",
    quoteIssuedDate: "2026-04-03",
    fullPaymentDate: "2026-04-09",
    receivedDate: "2026-03-28",
    assignedDate: "2026-04-11",
    connectionDate: "",
    assignedTo: "North Depot Team A",
    jobCardNumber: "JC-88431",
    meterNumber: "",
    sealNumber: "",
    coordinates: "-19.2331, 17.7165",
    coordinateSource: "",
    networkReference: "",
    mapReference: "",
    projectValue: "N$224,700.00",
    capitalContribution: "N$56,175.00",
    mvLength: "285 m",
    lvLength: "55 m",
    transformerRating: "50 kVA",
    voltageRating: "33 kV",
    serviceConnection: "3 x 95 mm service tail",
    comment: "Civil and pole work started. Meter still outstanding.",
    nextAction: "Install meter and capture seal on completion",
  },
  {
    reference: "NCM-2026-0143",
    quotationRef: "QTN-2026-0327",
    customer: "Selma Nghipondoka",
    priority: "Low",
    connectionClass: "LV",
    connectionType: "Single Phase",
    locality: "Oshakati West",
    region: "Northern",
    status: "Energised",
    applicationDate: "2026-03-16",
    investigationDate: "2026-03-18",
    quoteIssuedDate: "2026-03-22",
    fullPaymentDate: "2026-03-29",
    receivedDate: "2026-03-16",
    assignedDate: "2026-04-02",
    connectionDate: "2026-04-18",
    assignedTo: "North Depot Team B",
    jobCardNumber: "JC-88107",
    meterNumber: "MTR-34098172",
    sealNumber: "SL-218844",
    coordinates: "-17.7883, 15.7044",
    coordinateSource: "",
    networkReference: "",
    mapReference: "",
    projectValue: "N$9,420.00",
    capitalContribution: "",
    mvLength: "",
    lvLength: "24 m",
    transformerRating: "",
    voltageRating: "400/230 V",
    serviceConnection: "16 mm x 2 core",
    comment: "Connected and available for customer status queries.",
    nextAction: "Closed",
  },
  {
    reference: "NCM-2026-0138",
    quotationRef: "QTN-2026-0311",
    customer: "Hangula Guesthouse",
    priority: "Urgent",
    connectionClass: "LV",
    connectionType: "Three Phase",
    locality: "Katima Mulilo CBD",
    region: "Zambezi",
    status: "On Hold",
    applicationDate: "2026-03-12",
    investigationDate: "2026-03-14",
    quoteIssuedDate: "2026-03-21",
    fullPaymentDate: "",
    receivedDate: "2026-03-12",
    assignedDate: "",
    connectionDate: "",
    assignedTo: "Engineering Review",
    jobCardNumber: "",
    meterNumber: "",
    sealNumber: "",
    coordinates: "-17.5006, 24.2754",
    coordinateSource: "",
    networkReference: "",
    mapReference: "",
    projectValue: "N$38,600.00",
    capitalContribution: "",
    mvLength: "",
    lvLength: "70 m",
    transformerRating: "",
    voltageRating: "400/230 V",
    serviceConnection: "3 phase service cable",
    comment: "Awaiting customer wayleave confirmation before field allocation.",
    nextAction: "Resolve wayleave and release back into queue",
  },
];

export function buildDashboardCards(connections: ConnectionRecord[]): DashboardCard[] {
  const mvCount = connections.filter(
    (connection) => normalizeConnectionClass(connection.connectionClass) === "MV",
  ).length;
  const lvCount = connections.filter(
    (connection) => normalizeConnectionClass(connection.connectionClass) === "LV",
  ).length;
  const connectedCount = connections.filter((connection) =>
    isCompletedConnectionStatus(connection.status),
  ).length;
  const openCount = connections.length - connectedCount;
  const meterGapCount = connections.filter(
    (connection) => !connection.meterNumber || !connection.sealNumber,
  ).length;

  return [
    {
      title: "Captured applications",
      value: String(connections.length),
      helper: "Applications currently being tracked in the new connection workspace.",
      icon: ClipboardList,
    },
    {
      title: "MV / LV mix",
      value: `${mvCount} / ${lvCount}`,
      helper: "Current split between medium-voltage and low-voltage connections.",
      icon: MapPinned,
    },
    {
      title: "Open operational items",
      value: String(openCount),
      helper: "Applications still waiting for investigation, payment, allocation, or close-out.",
      icon: Wallet,
    },
    {
      title: "Meter close-out gaps",
      value: String(meterGapCount),
      helper: "Records still missing meter or seal details after work has started.",
      icon: PlugZap,
    },
  ];
}

export function buildStatusBuckets(connections: ConnectionRecord[]): StatusBucket[] {
  return [...connectionStatusOptions]
    .map((status) => ({
      title: status,
      count: connections.filter(
        (connection) => normalizeConnectionStatus(connection.status) === status,
      ).length,
      helper: statusHelperMap[status],
    }))
    .filter((bucket) => bucket.count > 0);
}

export const dashboardCards: DashboardCard[] = buildDashboardCards(recentConnections);

export const statusBuckets: StatusBucket[] = buildStatusBuckets(recentConnections);

export function buildMapPins(connections: ConnectionRecord[]): MapSummaryPin[] {
  return [
    {
      id: "A",
      label: "Received",
      count: connections.filter((connection) => connection.status === "Received").length,
      color: "#f59e0b",
      x: "18%",
      y: "34%",
    },
    {
      id: "B",
      label: "Awaiting Payment",
      count: connections.filter((connection) => connection.status === "Awaiting Payment").length,
      color: "#eab308",
      x: "39%",
      y: "26%",
    },
    {
      id: "C",
      label: "Not Allocated",
      count: connections.filter(
        (connection) => normalizeConnectionStatus(connection.status) === "Not Allocated",
      ).length,
      color: "#dc2626",
      x: "58%",
      y: "47%",
    },
    {
      id: "D",
      label: "In Progress",
      count: connections.filter((connection) => connection.status === "In Progress").length,
      color: "#0ea5e9",
      x: "76%",
      y: "37%",
    },
    {
      id: "E",
      label: "Energised",
      count: connections.filter(
        (connection) => normalizeConnectionStatus(connection.status) === "Energised",
      ).length,
      color: "#16a34a",
      x: "67%",
      y: "69%",
    },
  ];
}

export const mapPins: MapSummaryPin[] = buildMapPins(recentConnections);

const priorityStatusOrder: ConnectionStatus[] = [
  "Received",
  "Under Investigation",
  "Awaiting Payment",
  "Awaiting Wayleave",
  "Not Allocated",
  "In Progress",
  "On Hold",
];

export function buildPriorityConnections(connections: ConnectionRecord[]): ConnectionRecord[] {
  return [...connections]
    .filter((connection) => priorityStatusOrder.includes(normalizeConnectionStatus(connection.status)))
    .sort(
      (left, right) =>
        priorityStatusOrder.indexOf(normalizeConnectionStatus(left.status)) -
        priorityStatusOrder.indexOf(normalizeConnectionStatus(right.status)),
    )
    .slice(0, 4);
}

export const priorityConnections = buildPriorityConnections(recentConnections);

export const reportDefinitions: ReportDefinition[] = [
  {
    key: "summary",
    title: "Summary report",
    description: "High-level operational view for the new connection dashboard.",
    helper: "Dashboard metrics and current pipeline counts",
  },
  {
    key: "status-register",
    title: "Status register",
    description: "Detailed register for status queries, operational tracking, and handovers.",
    helper: "Reference, customer, dates, technical scope, assignment, meter, and GIS details",
  },
  {
    key: "allocation-queue",
    title: "Operations follow-up report",
    description: "Outstanding jobs that still need investigation, payment, allocation, or close-out.",
    helper: "Best for daily engineering and field coordination reviews",
  },
];

export const reportGeneratedAtLabel = "29 Apr 2026 15:08";

export const newConnectionApiBase =
  "/dashboard/api/engineering-services/new-connection-management";

export function getReportHref(
  type: ReportDefinition["key"],
  format: "json" | "csv",
): string {
  return `${newConnectionApiBase}/report?type=${type}&format=${format}`;
}

export interface StatusTimelineEvent {
  key: string;
  label: string;
  date: string;
  done: boolean;
  description: string;
}

export function buildStatusTimeline(connection: ConnectionRecord): StatusTimelineEvent[] {
  const milestones: Array<{ key: string; label: string; date: string; description: string }> = [
    {
      key: "applicationDate",
      label: "Application received",
      date: connection.applicationDate,
      description: "The new connection application was logged.",
    },
    {
      key: "investigationDate",
      label: "Site investigation",
      date: connection.investigationDate,
      description: "Field investigation and technical findings captured.",
    },
    {
      key: "quoteIssuedDate",
      label: "Quotation issued",
      date: connection.quoteIssuedDate,
      description: "A quotation was prepared and shared with the customer.",
    },
    {
      key: "fullPaymentDate",
      label: "Payment confirmed",
      date: connection.fullPaymentDate,
      description: "Full payment / capital contribution was confirmed.",
    },
    {
      key: "assignedDate",
      label: "Allocated for construction",
      date: connection.assignedDate,
      description: "The job was assigned to a team or contractor.",
    },
    {
      key: "connectionDate",
      label: "Energised",
      date: connection.connectionDate,
      description: "The connection was completed and energised.",
    },
  ];

  return milestones.map((milestone) => ({
    ...milestone,
    done: Boolean(milestone.date?.trim()),
  }));
}

export interface DistributionSlice {
  label: string;
  count: number;
}

export interface ConnectionAnalytics {
  total: number;
  energised: number;
  open: number;
  energisedRate: number;
  statusDistribution: DistributionSlice[];
  priorityDistribution: DistributionSlice[];
  regionDistribution: DistributionSlice[];
  classDistribution: DistributionSlice[];
  urgentOpen: number;
}

function countBy<T>(items: T[], selector: (item: T) => string): DistributionSlice[] {
  const map = new Map<string, number>();
  items.forEach((item) => {
    const key = selector(item) || "Unspecified";
    map.set(key, (map.get(key) ?? 0) + 1);
  });
  return Array.from(map.entries())
    .map(([label, count]) => ({ label, count }))
    .sort((left, right) => right.count - left.count);
}

export function buildConnectionAnalytics(connections: ConnectionRecord[]): ConnectionAnalytics {
  const total = connections.length;
  const energised = connections.filter((connection) =>
    isCompletedConnectionStatus(connection.status),
  ).length;
  const open = total - energised;

  const statusDistribution = [...connectionStatusOptions]
    .map((status) => ({
      label: status,
      count: connections.filter(
        (connection) => normalizeConnectionStatus(connection.status) === status,
      ).length,
    }))
    .filter((slice) => slice.count > 0);

  const priorityDistribution = [...connectionPriorityOptions]
    .map((priority) => ({
      label: priority,
      count: connections.filter(
        (connection) => normalizeConnectionPriority(connection.priority) === priority,
      ).length,
    }))
    .filter((slice) => slice.count > 0);

  const regionDistribution = countBy(connections, (connection) => connection.region);
  const classDistribution = countBy(connections, (connection) => {
    const normalized = normalizeConnectionClass(connection.connectionClass);
    return normalized ?? connection.connectionClass;
  });

  const urgentOpen = connections.filter(
    (connection) =>
      !isCompletedConnectionStatus(connection.status) &&
      normalizeConnectionPriority(connection.priority) === "Urgent",
  ).length;

  return {
    total,
    energised,
    open,
    energisedRate: total === 0 ? 0 : Math.round((energised / total) * 100),
    statusDistribution,
    priorityDistribution,
    regionDistribution,
    classDistribution,
    urgentOpen,
  };
}
