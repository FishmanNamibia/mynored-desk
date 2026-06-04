import { IsString, IsOptional, IsInt, Min, Max, IsEnum, ValidateNested, IsArray, IsNumber, IsBoolean, IsDateString } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum PerformancePeriodStatus {
  PLANNING = 'PLANNING',
  ACTIVE = 'ACTIVE',
  REVIEW = 'REVIEW',
  CLOSED = 'CLOSED'
}

export enum RatingScale {
  ONE = 1,
  TWO = 2,
  THREE = 3,
  FOUR = 4,
  FIVE = 5
}

export class CreatePerformancePeriodDto {
  @ApiProperty()
  @IsString()
  title: string; // This will be mapped to 'name' in the service

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty()
  @IsDateString()
  startDate: string;

  @ApiProperty()
  @IsDateString()
  endDate: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  submissionDeadline?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  reviewStartDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  reviewEndDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdatePerformancePeriodDto {
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
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  reviewStartDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  reviewEndDate?: string;

  @ApiPropertyOptional({ enum: PerformancePeriodStatus })
  @IsOptional()
  @IsEnum(PerformancePeriodStatus)
  status?: PerformancePeriodStatus;
}

export class WeightConfigurationDto {
  @ApiProperty()
  @IsString()
  categoryId: string;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  @Max(100)
  weight: number;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  @Max(100)
  goalsWeight: number;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  @Max(100)
  competenciesWeight: number;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  @Max(100)
  adhocWeight: number;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  @Max(100)
  behavioralWeight: number;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  @Max(100)
  developmentWeight: number;
}

export class UpdateWeightConfigurationDto {
  @ApiProperty()
  @IsString()
  performancePeriodId: string;

  @ApiProperty({ type: [WeightConfigurationDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WeightConfigurationDto)
  configurations: WeightConfigurationDto[];
}

export class Create360RatingDto {
  @ApiProperty()
  @IsString()
  performanceAgreementId: string;

  @ApiProperty()
  @IsString()
  raterId: string;

  @ApiProperty()
  @IsString()
  categoryId: string;

  @ApiProperty({ enum: RatingScale })
  @IsEnum(RatingScale)
  rating: RatingScale;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  comments?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  strengths?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  areasForImprovement?: string;
}

export class Update360RatingDto {
  @ApiPropertyOptional({ enum: RatingScale })
  @IsOptional()
  @IsEnum(RatingScale)
  rating?: RatingScale;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  comments?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  strengths?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  areasForImprovement?: string;
}

export class PerformancePeriodFilterDto {
  @ApiPropertyOptional({ enum: PerformancePeriodStatus })
  @IsOptional()
  @IsEnum(PerformancePeriodStatus)
  status?: PerformancePeriodStatus;

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

export class Rating360FilterDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  performanceAgreementId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  raterId?: string;

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