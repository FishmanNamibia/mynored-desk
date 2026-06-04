import {
  IsString,
  IsNumber,
  IsDate,
  IsOptional,
  IsEnum,
} from "class-validator";
import { Type } from "class-transformer";

export enum VacancyStatus {
  OPEN = "OPEN",
  CLOSED = "CLOSED",
  FILLED = "FILLED",
}

export class CreateVacancyDto {
  @IsString()
  title!: string;

  @IsString()
  description!: string;

  @IsString()
  departmentId!: string;

  @IsString()
  @IsOptional()
  requirements?: string;

  @IsNumber()
  @IsOptional()
  salary?: number;

  @IsDate()
  @Type(() => Date)
  @IsOptional()
  closingDate?: Date;

  @IsEnum(VacancyStatus)
  @IsOptional()
  status?: VacancyStatus;
}
