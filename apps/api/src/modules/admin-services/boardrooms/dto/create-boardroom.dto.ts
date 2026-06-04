import { IsString, IsNumber, IsOptional, IsBoolean } from "class-validator";

export class CreateBoardroomDto {
  @IsString()
  name!: string;

  @IsString()
  @IsOptional()
  location?: string;

  @IsNumber()
  capacity!: number;

  @IsBoolean()
  @IsOptional()
  hasProjector?: boolean;

  @IsBoolean()
  @IsOptional()
  hasVideoConference?: boolean;

  @IsString()
  @IsOptional()
  facilities?: string;
}
