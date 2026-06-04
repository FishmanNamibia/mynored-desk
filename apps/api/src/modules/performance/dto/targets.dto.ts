import { IsString, IsOptional, IsInt, Min, Max, IsEnum, ValidateNested, IsArray, IsNumber, IsBoolean } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum TargetStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED'
}

export enum AdhocTaskStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED'
}

export enum AdhocTaskPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  URGENT = 'URGENT'
}

export class CreateTargetDto {
  @ApiProperty()
  @IsString()
  title: string;

  @ApiProperty()
  @IsString()
  description: string;

  @ApiProperty()
  @IsString()
  employeeId: string;

  @ApiProperty()
  @IsString()
  categoryId: string;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  @Max(100)
  weight: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  targetDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  successCriteria?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  resources?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  assignedById?: string;
}

export class UpdateTargetDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  weight?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  targetDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  successCriteria?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  resources?: string;

  @ApiPropertyOptional({ enum: TargetStatus })
  @IsOptional()
  @IsEnum(TargetStatus)
  status?: TargetStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  progress?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  progressNotes?: string;
}

export class ApproveTargetDto {
  @ApiProperty({ enum: TargetStatus })
  @IsEnum(TargetStatus)
  status: TargetStatus.APPROVED | TargetStatus.REJECTED;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  approvalComments?: string;
}

export class CreateAdhocTaskDto {
  @ApiProperty()
  @IsString()
  title: string;

  @ApiProperty()
  @IsString()
  description: string;

  @ApiProperty()
  @IsString()
  assignedToId: string;

  @ApiProperty()
  @IsString()
  assignedById: string;

  @ApiPropertyOptional({ enum: AdhocTaskPriority })
  @IsOptional()
  @IsEnum(AdhocTaskPriority)
  priority?: AdhocTaskPriority = AdhocTaskPriority.MEDIUM;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  dueDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  instructions?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  categoryId?: string;
}

export class UpdateAdhocTaskDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ enum: AdhocTaskPriority })
  @IsOptional()
  @IsEnum(AdhocTaskPriority)
  priority?: AdhocTaskPriority;

  @ApiPropertyOptional({ enum: AdhocTaskStatus })
  @IsOptional()
  @IsEnum(AdhocTaskStatus)
  status?: AdhocTaskStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  dueDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  instructions?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  progress?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  progressNotes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  completionNotes?: string;
}

export class TargetFilterDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  employeeId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiPropertyOptional({ enum: TargetStatus })
  @IsOptional()
  @IsEnum(TargetStatus)
  status?: TargetStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  assignedById?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 10;
}

export class AdhocTaskFilterDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  assignedToId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  assignedById?: string;

  @ApiPropertyOptional({ enum: AdhocTaskStatus })
  @IsOptional()
  @IsEnum(AdhocTaskStatus)
  status?: AdhocTaskStatus;

  @ApiPropertyOptional({ enum: AdhocTaskPriority })
  @IsOptional()
  @IsEnum(AdhocTaskPriority)
  priority?: AdhocTaskPriority;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 10;
}