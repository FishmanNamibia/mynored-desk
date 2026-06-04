import { IsString, IsDate, IsEnum, IsOptional } from "class-validator";
import { Type } from "class-transformer";

export enum LeaveStatus {
  PENDING = "PENDING",
  APPROVED = "APPROVED",
  REJECTED = "REJECTED",
}

export class CreateLeaveDto {
  @IsString()
  employeeId!: string;

  @IsString()
  leaveType!: string;

  @IsDate()
  @Type(() => Date)
  startDate!: Date;

  @IsDate()
  @Type(() => Date)
  endDate!: Date;

  @IsString()
  @IsOptional()
  reason?: string;

  @IsEnum(LeaveStatus)
  @IsOptional()
  status?: LeaveStatus;
}
