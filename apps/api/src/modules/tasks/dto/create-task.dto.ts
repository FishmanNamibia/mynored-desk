import { IsString, IsOptional, IsEnum, IsDate } from "class-validator";
import { Type } from "class-transformer";

export enum TaskStatus {
  PENDING = "PENDING",
  IN_PROGRESS = "IN_PROGRESS",
  COMPLETED = "COMPLETED",
}

export class CreateTaskDto {
  @IsString()
  title!: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  assigneeId!: string;

  @IsString()
  @IsOptional()
  assignerId?: string;

  @IsEnum(TaskStatus)
  @IsOptional()
  status?: TaskStatus;

  @IsDate()
  @Type(() => Date)
  @IsOptional()
  dueDate?: Date;
}
