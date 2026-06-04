import { IsString, IsNumber, IsOptional, Min, Max } from "class-validator";

export class CreatePerformanceDto {
  @IsString()
  employeeId!: string;

  @IsString()
  reviewerId!: string;

  @IsString()
  reviewPeriod!: string;

  @IsNumber()
  @Min(1)
  @Max(5)
  rating!: number;

  @IsString()
  @IsOptional()
  comments?: string;

  @IsString()
  @IsOptional()
  strengths?: string;

  @IsString()
  @IsOptional()
  areasForImprovement?: string;
}
