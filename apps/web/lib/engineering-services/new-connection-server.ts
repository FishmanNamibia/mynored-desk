import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/pms/prisma";
import type { ConnectionRecord } from "@/lib/engineering-services/new-connection-management";
import {
  getConnectionStatusFilterValues,
  normalizeConnectionPriority,
  normalizeConnectionStatus,
  recentConnections,
} from "@/lib/engineering-services/new-connection-management";

interface ConnectionQueryFilters {
  search?: string;
  status?: string;
  region?: string;
  limit?: number;
}

interface CreateConnectionInput {
  reference: string;
  quotationRef?: string;
  customerType?: string;
  customerName: string;
  priority?: string;
  customerId?: string;
  phoneNumber?: string;
  emailAddress?: string;
  region: string;
  locality: string;
  constituency?: string;
  keyStakeholder?: string;
  plotErf?: string;
  applicationDate: string;
  receivedDate?: string;
  investigationDate?: string;
  quoteIssuedDate?: string;
  fullPaymentDate?: string;
  assignedDate?: string;
  connectionDate?: string;
  status: string;
  assignedTo?: string;
  nextAction?: string;
  connectionClass: string;
  config?: string;
  connectionType: string;
  projectValue?: string;
  capitalContribution?: string;
  mvLength?: string;
  mvConductor?: string;
  lvLength?: string;
  transformerRating?: string;
  voltageRating?: string;
  serviceConnection?: string;
  jobCardNumber?: string;
  coordinates?: string;
  coordinateSource?: string;
  networkReference?: string;
  mapReference?: string;
  meterNumber?: string;
  sealNumber?: string;
  comment?: string;
}

type UpdateConnectionInput = Partial<CreateConnectionInput>;

interface ConnectionValidationIssue {
  path: string[];
  message: string;
}

function toIsoDate(value: Date | null | undefined) {
  return value ? value.toISOString().slice(0, 10) : "";
}

function parseDate(value?: string | null) {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function cleanValue(value?: string | null) {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

function createValidationError(details: ConnectionValidationIssue[]) {
  const error = new Error("Validation failed") as Error & {
    name: string;
    details: ConnectionValidationIssue[];
  };
  error.name = "ConnectionValidationError";
  error.details = details;
  return error;
}

function buildWorkflowValidationIssues(input: {
  status?: string | null;
  comment?: string | null;
  connectionDate?: string | null;
  meterNumber?: string | null;
  sealNumber?: string | null;
  coordinates?: string | null;
}) {
  const issues: ConnectionValidationIssue[] = [];
  const status = normalizeConnectionStatus(input.status);

  if (status === "Not Allocated" && !cleanValue(input.comment)) {
    issues.push({
      path: ["comment"],
      message: "Operational comment is required while the application is not allocated.",
    });
  }

  if (status === "Energised") {
    if (!cleanValue(input.connectionDate)) {
      issues.push({
        path: ["connectionDate"],
        message: "Connection date is required before a record can move into Connections.",
      });
    }
    if (!cleanValue(input.meterNumber)) {
      issues.push({
        path: ["meterNumber"],
        message: "Meter number is required before a record can move into Connections.",
      });
    }
    if (!cleanValue(input.sealNumber)) {
      issues.push({
        path: ["sealNumber"],
        message: "Seal number is required before a record can move into Connections.",
      });
    }
    if (!cleanValue(input.coordinates)) {
      issues.push({
        path: ["coordinates"],
        message: "Coordinates are required before a record can move into Connections.",
      });
    }
  }

  return issues;
}

function isMvConnectionClass(value: string) {
  return value.trim().toLowerCase().startsWith("mv");
}

function inferCustomerType(connection: ConnectionRecord) {
  const lowerName = connection.customer.toLowerCase();
  if (
    lowerName.includes("school") ||
    lowerName.includes("guesthouse") ||
    lowerName.includes("depot") ||
    lowerName.includes("fuel") ||
    lowerName.includes("group")
  ) {
    return "Commercial";
  }

  return isMvConnectionClass(connection.connectionClass) ? "Commercial" : "Residential";
}

function mapSampleToSeed(connection: ConnectionRecord) {
  return {
    reference: connection.reference,
    quotationRef: cleanValue(connection.quotationRef),
    customerType: inferCustomerType(connection),
    customerName: connection.customer,
    priority: normalizeConnectionPriority(connection.priority),
    customerId: null,
    phoneNumber: null,
    emailAddress: null,
    region: connection.region,
    locality: connection.locality,
    constituency: cleanValue(connection.constituency),
    keyStakeholder: cleanValue(connection.keyStakeholder),
    plotErf: null,
    applicationDate: new Date(connection.applicationDate),
    receivedDate: parseDate(connection.receivedDate),
    investigationDate: parseDate(connection.investigationDate),
    quoteIssuedDate: parseDate(connection.quoteIssuedDate),
    fullPaymentDate: parseDate(connection.fullPaymentDate),
    assignedDate: parseDate(connection.assignedDate),
    connectionDate: parseDate(connection.connectionDate),
    status: normalizeConnectionStatus(connection.status),
    assignedTo: cleanValue(connection.assignedTo),
    nextAction: cleanValue(connection.nextAction),
    connectionClass: connection.connectionClass,
    config: cleanValue(connection.config),
    connectionType: connection.connectionType,
    projectValue: cleanValue(connection.projectValue),
    capitalContribution: cleanValue(connection.capitalContribution),
    mvLength: cleanValue(connection.mvLength),
    mvConductor: cleanValue(connection.mvConductor),
    lvLength: cleanValue(connection.lvLength),
    transformerRating: cleanValue(connection.transformerRating),
    voltageRating: cleanValue(connection.voltageRating),
    serviceConnection: cleanValue(connection.serviceConnection),
    jobCardNumber: cleanValue(connection.jobCardNumber),
    coordinates: cleanValue(connection.coordinates),
    coordinateSource: null,
    networkReference: null,
    mapReference: null,
    meterNumber: cleanValue(connection.meterNumber),
    sealNumber: cleanValue(connection.sealNumber),
    comment: cleanValue(connection.comment),
    createdById: "system-seed",
    createdByName: "System seed",
  };
}

function getNewConnectionDelegate() {
  return (prisma as any).newConnectionApplication as
    | {
        count: () => Promise<number>;
        createMany: (args: { data: ReturnType<typeof mapSampleToSeed>[]; skipDuplicates?: boolean }) => Promise<unknown>;
        findUnique: (args: { where: { reference: string } }) => Promise<any | null>;
        findMany: (args: {
          where?: Record<string, unknown>;
          orderBy?: Array<Record<string, "asc" | "desc">>;
          take?: number | undefined;
        }) => Promise<any[]>;
        create: (args: { data: Record<string, unknown> }) => Promise<any>;
        update: (args: {
          where: { reference: string };
          data: Record<string, unknown>;
        }) => Promise<any>;
      }
    | undefined;
}

function toNullableDateValue(value: Date | null | undefined) {
  return value ?? null;
}

function toNullableTextValue(value?: string | null) {
  return value ?? null;
}

function normalizeCount(value: unknown) {
  if (typeof value === "number") return value;
  if (typeof value === "bigint") return Number(value);
  if (typeof value === "string") return Number(value);
  return 0;
}

async function rawCountRecords() {
  const rows = await prisma.$queryRaw<Array<{ count: unknown }>>(Prisma.sql`
    SELECT COUNT(*) AS count
    FROM "NewConnectionApplication"
  `);

  return normalizeCount(rows[0]?.count);
}

async function rawInsertRecord(
  input: ReturnType<typeof mapSampleToSeed> | Record<string, unknown>,
  skipDuplicateReference = false,
) {
  const conflictSql = skipDuplicateReference
    ? Prisma.sql` ON CONFLICT ("reference") DO NOTHING`
    : Prisma.empty;

  const rows = await prisma.$queryRaw<any[]>(Prisma.sql`
    INSERT INTO "NewConnectionApplication" (
      "reference",
      "quotationRef",
      "customerType",
      "customerName",
      "priority",
      "customerId",
      "phoneNumber",
      "emailAddress",
      "region",
      "locality",
      "constituency",
      "keyStakeholder",
      "plotErf",
      "applicationDate",
      "receivedDate",
      "investigationDate",
      "quoteIssuedDate",
      "fullPaymentDate",
      "assignedDate",
      "connectionDate",
      "status",
      "assignedTo",
      "nextAction",
      "connectionClass",
      "config",
      "connectionType",
      "projectValue",
      "capitalContribution",
      "mvLength",
      "mvConductor",
      "lvLength",
      "transformerRating",
      "voltageRating",
      "serviceConnection",
      "jobCardNumber",
      "coordinates",
      "coordinateSource",
      "networkReference",
      "mapReference",
      "meterNumber",
      "sealNumber",
      "comment",
      "createdById",
      "createdByName"
    ) VALUES (
      ${String(input.reference ?? "").trim()},
      ${toNullableTextValue((input.quotationRef as string | null | undefined) ?? null)},
      ${String(input.customerType ?? "").trim()},
      ${String(input.customerName ?? "").trim()},
      ${normalizeConnectionPriority(input.priority as string | null | undefined)},
      ${toNullableTextValue((input.customerId as string | null | undefined) ?? null)},
      ${toNullableTextValue((input.phoneNumber as string | null | undefined) ?? null)},
      ${toNullableTextValue((input.emailAddress as string | null | undefined) ?? null)},
      ${String(input.region ?? "").trim()},
      ${String(input.locality ?? "").trim()},
      ${toNullableTextValue((input.constituency as string | null | undefined) ?? null)},
      ${toNullableTextValue((input.keyStakeholder as string | null | undefined) ?? null)},
      ${toNullableTextValue((input.plotErf as string | null | undefined) ?? null)},
      ${toNullableDateValue(input.applicationDate as Date | null | undefined)},
      ${toNullableDateValue(input.receivedDate as Date | null | undefined)},
      ${toNullableDateValue(input.investigationDate as Date | null | undefined)},
      ${toNullableDateValue(input.quoteIssuedDate as Date | null | undefined)},
      ${toNullableDateValue(input.fullPaymentDate as Date | null | undefined)},
      ${toNullableDateValue(input.assignedDate as Date | null | undefined)},
      ${toNullableDateValue(input.connectionDate as Date | null | undefined)},
      ${String(input.status ?? "").trim()},
      ${toNullableTextValue((input.assignedTo as string | null | undefined) ?? null)},
      ${toNullableTextValue((input.nextAction as string | null | undefined) ?? null)},
      ${String(input.connectionClass ?? "").trim()},
      ${toNullableTextValue((input.config as string | null | undefined) ?? null)},
      ${String(input.connectionType ?? "").trim()},
      ${toNullableTextValue((input.projectValue as string | null | undefined) ?? null)},
      ${toNullableTextValue((input.capitalContribution as string | null | undefined) ?? null)},
      ${toNullableTextValue((input.mvLength as string | null | undefined) ?? null)},
      ${toNullableTextValue((input.mvConductor as string | null | undefined) ?? null)},
      ${toNullableTextValue((input.lvLength as string | null | undefined) ?? null)},
      ${toNullableTextValue((input.transformerRating as string | null | undefined) ?? null)},
      ${toNullableTextValue((input.voltageRating as string | null | undefined) ?? null)},
      ${toNullableTextValue((input.serviceConnection as string | null | undefined) ?? null)},
      ${toNullableTextValue((input.jobCardNumber as string | null | undefined) ?? null)},
      ${toNullableTextValue((input.coordinates as string | null | undefined) ?? null)},
      ${toNullableTextValue((input.coordinateSource as string | null | undefined) ?? null)},
      ${toNullableTextValue((input.networkReference as string | null | undefined) ?? null)},
      ${toNullableTextValue((input.mapReference as string | null | undefined) ?? null)},
      ${toNullableTextValue((input.meterNumber as string | null | undefined) ?? null)},
      ${toNullableTextValue((input.sealNumber as string | null | undefined) ?? null)},
      ${toNullableTextValue((input.comment as string | null | undefined) ?? null)},
      ${toNullableTextValue((input.createdById as string | null | undefined) ?? null)},
      ${toNullableTextValue((input.createdByName as string | null | undefined) ?? null)}
    )
    ${conflictSql}
    RETURNING *
  `);

  return rows[0] ?? null;
}

async function rawFindRecords(filters: ConnectionQueryFilters = {}) {
  const clauses: Prisma.Sql[] = [];
  const search = filters.search?.trim();

  if (filters.status?.trim()) {
    const statusValues = getConnectionStatusFilterValues(filters.status);
    if (statusValues.length === 1) {
      clauses.push(Prisma.sql`"status" = ${statusValues[0]}`);
    } else if (statusValues.length > 1) {
      clauses.push(Prisma.sql`"status" IN (${Prisma.join(statusValues)})`);
    }
  }

  if (filters.region?.trim()) {
    clauses.push(Prisma.sql`"region" = ${filters.region.trim()}`);
  }

  if (search) {
    const like = `%${search}%`;
    clauses.push(Prisma.sql`(
      "reference" ILIKE ${like}
      OR "quotationRef" ILIKE ${like}
      OR "customerName" ILIKE ${like}
      OR "locality" ILIKE ${like}
      OR "constituency" ILIKE ${like}
      OR "keyStakeholder" ILIKE ${like}
      OR "meterNumber" ILIKE ${like}
      OR "jobCardNumber" ILIKE ${like}
      OR "coordinates" ILIKE ${like}
    )`);
  }

  const whereSql = clauses.length > 0 ? Prisma.sql`WHERE ${Prisma.join(clauses, Prisma.sql` AND `)}` : Prisma.empty;
  const limitSql = filters.limit ? Prisma.sql`LIMIT ${filters.limit}` : Prisma.empty;

  return prisma.$queryRaw<any[]>(Prisma.sql`
    SELECT *
    FROM "NewConnectionApplication"
    ${whereSql}
    ORDER BY "applicationDate" DESC, "createdAt" DESC
    ${limitSql}
  `);
}

async function rawFindRecordByReference(reference: string) {
  const rows = await prisma.$queryRaw<any[]>(Prisma.sql`
    SELECT *
    FROM "NewConnectionApplication"
    WHERE "reference" = ${reference}
    LIMIT 1
  `);

  return rows[0] ?? null;
}

function hasOwnProperty<T extends object>(value: T, key: keyof any) {
  return Object.prototype.hasOwnProperty.call(value, key);
}

function buildUpdatePayload(input: UpdateConnectionInput) {
  const payload: Record<string, unknown> = {};

  if (hasOwnProperty(input, "quotationRef")) payload.quotationRef = cleanValue(input.quotationRef);
  if (hasOwnProperty(input, "customerType")) payload.customerType = cleanValue(input.customerType) ?? "Project";
  if (hasOwnProperty(input, "customerName")) payload.customerName = input.customerName?.trim();
  if (hasOwnProperty(input, "priority")) payload.priority = normalizeConnectionPriority(input.priority);
  if (hasOwnProperty(input, "customerId")) payload.customerId = cleanValue(input.customerId);
  if (hasOwnProperty(input, "phoneNumber")) payload.phoneNumber = cleanValue(input.phoneNumber);
  if (hasOwnProperty(input, "emailAddress")) payload.emailAddress = cleanValue(input.emailAddress);
  if (hasOwnProperty(input, "region")) payload.region = input.region?.trim();
  if (hasOwnProperty(input, "locality")) payload.locality = input.locality?.trim();
  if (hasOwnProperty(input, "constituency")) payload.constituency = cleanValue(input.constituency);
  if (hasOwnProperty(input, "keyStakeholder")) payload.keyStakeholder = cleanValue(input.keyStakeholder);
  if (hasOwnProperty(input, "plotErf")) payload.plotErf = cleanValue(input.plotErf);
  if (hasOwnProperty(input, "applicationDate") && input.applicationDate) {
    payload.applicationDate = new Date(input.applicationDate);
  }
  if (hasOwnProperty(input, "receivedDate")) payload.receivedDate = parseDate(input.receivedDate);
  if (hasOwnProperty(input, "investigationDate")) payload.investigationDate = parseDate(input.investigationDate);
  if (hasOwnProperty(input, "quoteIssuedDate")) payload.quoteIssuedDate = parseDate(input.quoteIssuedDate);
  if (hasOwnProperty(input, "fullPaymentDate")) payload.fullPaymentDate = parseDate(input.fullPaymentDate);
  if (hasOwnProperty(input, "assignedDate")) payload.assignedDate = parseDate(input.assignedDate);
  if (hasOwnProperty(input, "connectionDate")) payload.connectionDate = parseDate(input.connectionDate);
  if (hasOwnProperty(input, "status")) payload.status = normalizeConnectionStatus(input.status);
  if (hasOwnProperty(input, "assignedTo")) payload.assignedTo = cleanValue(input.assignedTo);
  if (hasOwnProperty(input, "nextAction")) payload.nextAction = cleanValue(input.nextAction);
  if (hasOwnProperty(input, "connectionClass")) payload.connectionClass = input.connectionClass?.trim();
  if (hasOwnProperty(input, "config")) payload.config = cleanValue(input.config);
  if (hasOwnProperty(input, "connectionType")) payload.connectionType = input.connectionType?.trim();
  if (hasOwnProperty(input, "projectValue")) payload.projectValue = cleanValue(input.projectValue);
  if (hasOwnProperty(input, "capitalContribution")) {
    payload.capitalContribution = cleanValue(input.capitalContribution);
  }
  if (hasOwnProperty(input, "mvLength")) payload.mvLength = cleanValue(input.mvLength);
  if (hasOwnProperty(input, "mvConductor")) payload.mvConductor = cleanValue(input.mvConductor);
  if (hasOwnProperty(input, "lvLength")) payload.lvLength = cleanValue(input.lvLength);
  if (hasOwnProperty(input, "transformerRating")) {
    payload.transformerRating = cleanValue(input.transformerRating);
  }
  if (hasOwnProperty(input, "voltageRating")) payload.voltageRating = cleanValue(input.voltageRating);
  if (hasOwnProperty(input, "serviceConnection")) {
    payload.serviceConnection = cleanValue(input.serviceConnection);
  }
  if (hasOwnProperty(input, "jobCardNumber")) payload.jobCardNumber = cleanValue(input.jobCardNumber);
  if (hasOwnProperty(input, "coordinates")) payload.coordinates = cleanValue(input.coordinates);
  if (hasOwnProperty(input, "coordinateSource")) {
    payload.coordinateSource = cleanValue(input.coordinateSource);
  }
  if (hasOwnProperty(input, "networkReference")) {
    payload.networkReference = cleanValue(input.networkReference);
  }
  if (hasOwnProperty(input, "mapReference")) payload.mapReference = cleanValue(input.mapReference);
  if (hasOwnProperty(input, "meterNumber")) payload.meterNumber = cleanValue(input.meterNumber);
  if (hasOwnProperty(input, "sealNumber")) payload.sealNumber = cleanValue(input.sealNumber);
  if (hasOwnProperty(input, "comment")) payload.comment = cleanValue(input.comment);

  return payload;
}

async function rawUpdateRecord(reference: string, input: UpdateConnectionInput) {
  const payload = buildUpdatePayload(input);
  const assignments = Object.entries(payload).map(([column, value]) => {
    return Prisma.sql`${Prisma.raw(`"${column}"`)} = ${value}`;
  });

  if (assignments.length === 0) {
    return rawFindRecordByReference(reference);
  }

  assignments.push(Prisma.sql`"updatedAt" = ${new Date()}`);

  const rows = await prisma.$queryRaw<any[]>(Prisma.sql`
    UPDATE "NewConnectionApplication"
    SET ${Prisma.join(assignments, Prisma.sql`, `)}
    WHERE "reference" = ${reference}
    RETURNING *
  `);

  return rows[0] ?? null;
}

export function serializeConnectionRecord(row: any): ConnectionRecord {
  return {
    reference: row.reference,
    quotationRef: row.quotationRef ?? "",
    customer: row.customerName,
    priority: normalizeConnectionPriority(row.priority),
    constituency: row.constituency ?? "",
    keyStakeholder: row.keyStakeholder ?? "",
    connectionClass: row.connectionClass,
    config: row.config ?? "",
    connectionType: row.connectionType,
    locality: row.locality,
    region: row.region,
    status: normalizeConnectionStatus(row.status),
    applicationDate: toIsoDate(row.applicationDate),
    investigationDate: toIsoDate(row.investigationDate),
    quoteIssuedDate: toIsoDate(row.quoteIssuedDate),
    fullPaymentDate: toIsoDate(row.fullPaymentDate),
    receivedDate: toIsoDate(row.receivedDate),
    assignedDate: toIsoDate(row.assignedDate),
    connectionDate: toIsoDate(row.connectionDate),
    assignedTo: row.assignedTo ?? "",
    jobCardNumber: row.jobCardNumber ?? "",
    meterNumber: row.meterNumber ?? "",
    sealNumber: row.sealNumber ?? "",
    coordinates: row.coordinates ?? "",
    coordinateSource: row.coordinateSource ?? "",
    networkReference: row.networkReference ?? "",
    mapReference: row.mapReference ?? "",
    projectValue: row.projectValue ?? "",
    capitalContribution: row.capitalContribution ?? "",
    mvLength: row.mvLength ?? "",
    mvConductor: row.mvConductor ?? "",
    lvLength: row.lvLength ?? "",
    transformerRating: row.transformerRating ?? "",
    voltageRating: row.voltageRating ?? "",
    serviceConnection: row.serviceConnection ?? "",
    comment: row.comment ?? "",
    nextAction: row.nextAction ?? "",
  };
}

export async function ensureNewConnectionSeedData() {
  const delegate = getNewConnectionDelegate();
  const count = delegate ? await delegate.count() : await rawCountRecords();
  if (count > 0) {
    return;
  }

  const seedRows = recentConnections.map(mapSampleToSeed);

  if (delegate) {
    await delegate.createMany({
      data: seedRows,
      skipDuplicates: true,
    });
    return;
  }

  for (const row of seedRows) {
    await rawInsertRecord(row, true);
  }
}

export async function getNewConnectionRecords(filters: ConnectionQueryFilters = {}) {
  await ensureNewConnectionSeedData();
  const delegate = getNewConnectionDelegate();

  if (!delegate) {
    const rows = await rawFindRecords(filters);
    return rows.map(serializeConnectionRecord);
  }

  const where: any = {};
  const search = filters.search?.trim();

  if (filters.status?.trim()) {
    const statusValues = getConnectionStatusFilterValues(filters.status);
    if (statusValues.length > 0) {
      where.status = { in: statusValues };
    }
  }

  if (filters.region?.trim()) {
    where.region = filters.region.trim();
  }

  if (search) {
    where.OR = [
      { reference: { contains: search, mode: "insensitive" } },
      { quotationRef: { contains: search, mode: "insensitive" } },
      { customerName: { contains: search, mode: "insensitive" } },
      { locality: { contains: search, mode: "insensitive" } },
      { constituency: { contains: search, mode: "insensitive" } },
      { keyStakeholder: { contains: search, mode: "insensitive" } },
      { meterNumber: { contains: search, mode: "insensitive" } },
      { jobCardNumber: { contains: search, mode: "insensitive" } },
      { coordinates: { contains: search, mode: "insensitive" } },
    ];
  }

  const rows = await delegate.findMany({
    where,
    orderBy: [{ applicationDate: "desc" }, { createdAt: "desc" }],
    take: filters.limit ?? undefined,
  });

  return rows.map(serializeConnectionRecord);
}

export async function getNewConnectionRecordByReference(reference: string) {
  await ensureNewConnectionSeedData();
  const delegate = getNewConnectionDelegate();

  const row = delegate
    ? await delegate.findUnique({ where: { reference } })
    : await rawFindRecordByReference(reference);

  return row ? serializeConnectionRecord(row) : null;
}

export async function createNewConnectionRecord(
  input: CreateConnectionInput,
  actor?: { id?: string; firstName?: string; lastName?: string; email?: string | undefined },
) {
  const validationIssues = buildWorkflowValidationIssues({
    status: input.status,
    comment: input.comment,
    connectionDate: input.connectionDate,
    meterNumber: input.meterNumber,
    sealNumber: input.sealNumber,
    coordinates: input.coordinates,
  });

  if (validationIssues.length > 0) {
    throw createValidationError(validationIssues);
  }

  const payload = {
    reference: input.reference.trim(),
    quotationRef: cleanValue(input.quotationRef),
    customerType: cleanValue(input.customerType) ?? "Project",
    customerName: input.customerName.trim(),
    priority: normalizeConnectionPriority(input.priority),
    customerId: cleanValue(input.customerId),
    phoneNumber: cleanValue(input.phoneNumber),
    emailAddress: cleanValue(input.emailAddress),
    region: input.region.trim(),
    locality: input.locality.trim(),
    constituency: cleanValue(input.constituency),
    keyStakeholder: cleanValue(input.keyStakeholder),
    plotErf: cleanValue(input.plotErf),
    applicationDate: new Date(input.applicationDate),
    receivedDate: parseDate(input.receivedDate),
    investigationDate: parseDate(input.investigationDate),
    quoteIssuedDate: parseDate(input.quoteIssuedDate),
    fullPaymentDate: parseDate(input.fullPaymentDate),
    assignedDate: parseDate(input.assignedDate),
    connectionDate: parseDate(input.connectionDate),
    status: normalizeConnectionStatus(input.status),
    assignedTo: cleanValue(input.assignedTo),
    nextAction: cleanValue(input.nextAction),
    connectionClass: input.connectionClass.trim(),
    config: cleanValue(input.config),
    connectionType: input.connectionType.trim(),
    projectValue: cleanValue(input.projectValue),
    capitalContribution: cleanValue(input.capitalContribution),
    mvLength: cleanValue(input.mvLength),
    mvConductor: cleanValue(input.mvConductor),
    lvLength: cleanValue(input.lvLength),
    transformerRating: cleanValue(input.transformerRating),
    voltageRating: cleanValue(input.voltageRating),
    serviceConnection: cleanValue(input.serviceConnection),
    jobCardNumber: cleanValue(input.jobCardNumber),
    coordinates: cleanValue(input.coordinates),
    coordinateSource: cleanValue(input.coordinateSource),
    networkReference: cleanValue(input.networkReference),
    mapReference: cleanValue(input.mapReference),
    meterNumber: cleanValue(input.meterNumber),
    sealNumber: cleanValue(input.sealNumber),
    comment: cleanValue(input.comment),
    createdById: actor?.id ?? null,
    createdByName:
      [actor?.firstName, actor?.lastName].filter(Boolean).join(" ").trim() ||
      actor?.email ||
      "NORED user",
  };

  const delegate = getNewConnectionDelegate();
  const row = delegate ? await delegate.create({ data: payload }) : await rawInsertRecord(payload);

  return serializeConnectionRecord(row);
}

async function notifyConnectionStatusChange(params: {
  reference: string;
  receiverId?: string | null;
  senderId?: string | null;
  previousStatus: string;
  nextStatus: string;
}) {
  const { reference, receiverId, senderId, previousStatus, nextStatus } = params;

  if (!receiverId || receiverId === "system-seed") return;
  if (previousStatus === nextStatus) return;

  try {
    await (prisma as any).pmsNotification.create({
      data: {
        type: "SYSTEM",
        status: "PENDING",
        senderId: senderId && senderId !== receiverId ? senderId : null,
        receiverId,
        entityType: "NewConnectionApplication",
        entityId: reference,
        message: `New connection ${reference} moved from "${previousStatus}" to "${nextStatus}".`,
        metadata: JSON.stringify({ reference, previousStatus, nextStatus }),
      },
    });
  } catch (error) {
    console.error("[new-connection] status-change notification failed:", error);
  }
}

export async function updateNewConnectionRecord(
  reference: string,
  input: UpdateConnectionInput,
  actor?: { id?: string; firstName?: string; lastName?: string; email?: string | undefined },
) {
  const currentRecord = await getNewConnectionRecordByReference(reference);
  if (!currentRecord) {
    return null;
  }

  const validationIssues = buildWorkflowValidationIssues({
    status: input.status ?? currentRecord.status,
    comment: input.comment ?? currentRecord.comment,
    connectionDate: input.connectionDate ?? currentRecord.connectionDate,
    meterNumber: input.meterNumber ?? currentRecord.meterNumber,
    sealNumber: input.sealNumber ?? currentRecord.sealNumber,
    coordinates: input.coordinates ?? currentRecord.coordinates,
  });

  if (validationIssues.length > 0) {
    throw createValidationError(validationIssues);
  }

  const payload = buildUpdatePayload(input);
  const delegate = getNewConnectionDelegate();

  const row = delegate
    ? await delegate.update({
        where: { reference },
        data: payload,
      })
    : await rawUpdateRecord(reference, input);

  if (row) {
    const nextStatus = normalizeConnectionStatus(row.status);
    if (nextStatus !== currentRecord.status) {
      await notifyConnectionStatusChange({
        reference,
        receiverId: row.createdById ?? null,
        senderId: actor?.id ?? null,
        previousStatus: currentRecord.status,
        nextStatus,
      });
    }
  }

  return row ? serializeConnectionRecord(row) : null;
}
