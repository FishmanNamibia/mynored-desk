import { IsString, IsOptional, IsInt, Min, Max, IsEnum, ValidateNested, IsArray, IsDateString, IsBoolean, IsNumber } from 'class-validator';
import { Type, Transform } from 'class-transformer';

export enum PerformanceAgreementStatus {
  DRAFT = 'DRAFT',
  SUBMITTED = 'SUBMITTED',
  UNDER_REVIEW = 'UNDER_REVIEW',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  FINALIZED = 'FINALIZED'
}

export enum ApprovalAction {
  APPROVE = 'APPROVE',
  REJECT = 'REJECT',
  REQUEST_CHANGES = 'REQUEST_CHANGES'
}

export class CreatePerformanceAgreementDto {
  @IsString()
  employeeId: string;

  @IsString()
  performancePeriodId: string;

  @IsOptional()
  @IsString()
  supervisorNotes?: string;
}

export class UpdatePerformanceAgreementDto {
  @IsOptional()
  @IsString()
  supervisorNotes?: string;

  @IsOptional()
  @IsEnum(PerformanceAgreementStatus)
  status?: PerformanceAgreementStatus;
}

export class BulkCreatePerformanceAgreementDto {
  @IsString()
  performancePeriodId: string;

  @IsArray()
  @IsString({ each: true })
  employeeIds: string[];

  @IsOptional()
  @IsString()
  supervisorNotes?: string;
}

export class ApprovePerformanceAgreementDto {
  @IsEnum(ApprovalAction)
  action: ApprovalAction;

  @IsOptional()
  @IsString()
  comments?: string;
}

export class PerformanceAgreementFilterDto {
  @IsOptional()
  @IsString()
  employeeId?: string;

  @IsOptional()
  @IsString()
  performancePeriodId?: string;

  @IsOptional()
  @IsEnum(PerformanceAgreementStatus)
  status?: PerformanceAgreementStatus;

  @IsOptional()
  @IsString()
  supervisorId?: string;

  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 10;
}