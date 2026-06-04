import { IsString, IsNumber, IsOptional, IsEnum, Min } from 'class-validator';

export enum EquipmentCondition {
  NEW = 'NEW',
  GOOD = 'GOOD',
  FAIR = 'FAIR',
  POOR = 'POOR',
  DAMAGED = 'DAMAGED',
  OUT_OF_ORDER = 'OUT_OF_ORDER'
}

export class AddITEquipmentDto {
  @IsString()
  name!: string;

  @IsString()
  category!: string;

  @IsString()
  @IsOptional()
  brand?: string;

  @IsString()
  @IsOptional()
  model?: string;

  @IsString()
  @IsOptional()
  serialNumber?: string;

  @IsString()
  @IsOptional()
  assetTag?: string;

  @IsNumber()
  @Min(0)
  quantity!: number;

  @IsEnum(EquipmentCondition)
  @IsOptional()
  condition?: EquipmentCondition;

  @IsString()
  @IsOptional()
  departmentId?: string;
}
