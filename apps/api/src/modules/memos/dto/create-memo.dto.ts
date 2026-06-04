import { IsString, IsOptional, IsEnum, IsNumber, IsDateString, IsArray, ValidateNested } from "class-validator";
import { Type } from "class-transformer";

export enum MemoStatus {
  DRAFT = "DRAFT",
  PENDING = "PENDING",
  APPROVED = "APPROVED",
  REJECTED = "REJECTED",
  ARCHIVED = "ARCHIVED",
}

export enum MemoPriority {
  LOW = "LOW",
  NORMAL = "NORMAL",
  HIGH = "HIGH",
  URGENT = "URGENT",
}

export class ThroughPersonDto {
  @IsString()
  name!: string;

  @IsString()
  @IsOptional()
  title?: string;
}

export class CreateMemoDto {
  // Routing Information
  @IsString()
  @IsOptional()
  memoTo?: string;

  @IsString()
  @IsOptional()
  memoToTitle?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ThroughPersonDto)
  @IsOptional()
  memoThrough?: ThroughPersonDto[];

  @IsString()
  @IsOptional()
  memoFrom?: string;

  @IsString()
  @IsOptional()
  memoFromTitle?: string;

  @IsDateString()
  @IsOptional()
  memoDate?: string;

  // Subject and Content
  @IsString()
  @IsOptional()
  subject?: string;

  // 1. PURPOSE
  @IsString()
  @IsOptional()
  purpose?: string;

  // 2. FINANCIAL IMPLICATION
  @IsString()
  @IsOptional()
  procurementActivity?: string;

  @IsString()
  @IsOptional()
  budgetVote?: string;

  @IsNumber()
  @IsOptional()
  budgetedAmount?: number;

  @IsNumber()
  @IsOptional()
  amountSpent?: number;

  @IsNumber()
  @IsOptional()
  availableFunds?: number;

  @IsString()
  @IsOptional()
  executiveName?: string;

  @IsString()
  @IsOptional()
  financialVerification?: string;

  @IsString()
  @IsOptional()
  budgetApproved?: string;

  @IsString()
  @IsOptional()
  financialComments?: string;

  @IsDateString()
  @IsOptional()
  executiveSignatureDate?: string;

  @IsString()
  @IsOptional()
  executiveSignaturePath?: string;

  // 3. RECOMMENDATION
  @IsString()
  @IsOptional()
  recommendation?: string;

  // Meta
  @IsString()
  createdById!: string;

  @IsEnum(MemoStatus)
  @IsOptional()
  status?: MemoStatus;

  @IsEnum(MemoPriority)
  @IsOptional()
  priority?: MemoPriority;

  @IsOptional()
  attachments?: any;
}
