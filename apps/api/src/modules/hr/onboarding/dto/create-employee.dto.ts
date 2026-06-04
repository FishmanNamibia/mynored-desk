import { IsString, IsEmail, IsDate, IsOptional } from "class-validator";
import { Type } from "class-transformer";

export class CreateEmployeeDto {
  @IsString()
  firstName!: string;

  @IsString()
  lastName!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  departmentId!: string;

  @IsString()
  position!: string;

  @IsDate()
  @Type(() => Date)
  startDate!: Date;

  @IsString()
  @IsOptional()
  managerId?: string;
}
