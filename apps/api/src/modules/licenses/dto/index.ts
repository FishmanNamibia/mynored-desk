import {
  IsString,
  IsEnum,
  IsDate,
  IsOptional,
  IsBoolean,
  IsNumber,
} from "class-validator";
import { Type } from "class-transformer";

export enum LicenseType {
  SOFTWARE_LICENSE = "SOFTWARE_LICENSE",
  SUBSCRIPTION = "SUBSCRIPTION",
  SSL_CERTIFICATE = "SSL_CERTIFICATE",
  SUPPORT_CONTRACT = "SUPPORT_CONTRACT",
  CLOUD_SERVICE = "CLOUD_SERVICE",
  API_LICENSE = "API_LICENSE",
}

export enum LicenseStatus {
  ACTIVE = "ACTIVE",
  EXPIRING_SOON = "EXPIRING_SOON",
  EXPIRED = "EXPIRED",
  CANCELLED = "CANCELLED",
  SUSPENDED = "SUSPENDED",
}

export enum RenewalFrequency {
  MONTHLY = "MONTHLY",
  QUARTERLY = "QUARTERLY",
  SEMI_ANNUAL = "SEMI_ANNUAL",
  ANNUAL = "ANNUAL",
  BIENNIAL = "BIENNIAL",
  TRIENNIAL = "TRIENNIAL",
  ONE_TIME = "ONE_TIME",
}

export class CreateLicenseDto {
  @IsString()
  licenseKey!: string;

  @IsEnum(LicenseType)
  licenseType!: LicenseType;

  @IsString()
  vendorId!: string;

  @IsString()
  systemId!: string;

  @IsOptional()
  @IsString()
  departmentId?: string;

  @IsString()
  productName!: string;

  @IsOptional()
  @IsString()
  version?: string;

  @IsOptional()
  @IsString()
  edition?: string;

  @IsOptional()
  @IsNumber()
  userCount?: number;

  @IsOptional()
  @IsString()
  description?: string;

  @IsDate()
  @Type(() => Date)
  purchaseDate!: Date;

  @IsDate()
  @Type(() => Date)
  startDate!: Date;

  @IsDate()
  @Type(() => Date)
  expiryDate!: Date;

  @IsEnum(RenewalFrequency)
  renewalFrequency!: RenewalFrequency;

  @IsOptional()
  @IsBoolean()
  autoRenew?: boolean;

  @IsOptional()
  @IsNumber()
  renewalCost?: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsNumber()
  alertThreshold?: number;

  @IsOptional()
  @IsString()
  supportContact?: string;

  @IsOptional()
  @IsString()
  supportEmail?: string;

  @IsOptional()
  @IsString()
  supportPhone?: string;

  @IsOptional()
  @IsString()
  documentationUrl?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateLicenseDto {
  @IsOptional()
  @IsEnum(LicenseStatus)
  status?: LicenseStatus;

  @IsOptional()
  @IsString()
  version?: string;

  @IsOptional()
  @IsString()
  edition?: string;

  @IsOptional()
  @IsNumber()
  userCount?: number;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  expiryDate?: Date;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  lastRenewedDate?: Date;

  @IsOptional()
  @IsBoolean()
  autoRenew?: boolean;

  @IsOptional()
  @IsNumber()
  renewalCost?: number;

  @IsOptional()
  @IsNumber()
  alertThreshold?: number;

  @IsOptional()
  @IsString()
  supportContact?: string;

  @IsOptional()
  @IsString()
  supportEmail?: string;

  @IsOptional()
  @IsString()
  supportPhone?: string;

  @IsOptional()
  @IsString()
  documentationUrl?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

// Department DTOs
export class CreateDepartmentDto {
  @IsString()
  code!: string;

  @IsString()
  name!: string;

  @IsString()
  @IsOptional()
  parentId?: string;

  @IsString()
  @IsOptional()
  managerId?: string;

  @IsString()
  @IsOptional()
  managerName?: string;

  @IsString()
  @IsOptional()
  managerEmail?: string;
}

export class UpdateDepartmentDto {
  @IsString()
  @IsOptional()
  code?: string;

  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  parentId?: string;

  @IsString()
  @IsOptional()
  managerId?: string;

  @IsString()
  @IsOptional()
  managerName?: string;

  @IsString()
  @IsOptional()
  managerEmail?: string;
}

// System DTOs
export class CreateSystemDto {
  @IsString()
  name!: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  category?: string;
}

export class UpdateSystemDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  category?: string;
}

// Vendor DTOs
export class CreateVendorDto {
  @IsString()
  name!: string;

  @IsString()
  @IsOptional()
  contactEmail?: string;

  @IsString()
  @IsOptional()
  contactPhone?: string;

  @IsString()
  @IsOptional()
  website?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class UpdateVendorDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  contactEmail?: string;

  @IsString()
  @IsOptional()
  contactPhone?: string;

  @IsString()
  @IsOptional()
  website?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}
