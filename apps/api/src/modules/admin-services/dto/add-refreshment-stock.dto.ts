import { IsString, IsNumber, IsOptional, IsDateString, Min } from 'class-validator';

export class AddRefreshmentStockDto {
  @IsString()
  name!: string;

  @IsString()
  @IsOptional()
  category?: string;

  @IsString()
  @IsOptional()
  unitType?: string;

  @IsNumber()
  @Min(1)
  quantity!: number;

  @IsDateString()
  @IsOptional()
  expiryDate?: string;

  @IsString()
  @IsOptional()
  supplier?: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsString()
  @IsOptional()
  departmentId?: string;
}
