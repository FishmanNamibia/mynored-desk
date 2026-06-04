import { IsString, IsOptional, IsBoolean } from "class-validator";

export class CreateVehicleDto {
  @IsString()
  make!: string;

  @IsString()
  model!: string;

  @IsString()
  licensePlate!: string;

  @IsString()
  @IsOptional()
  year?: string;

  @IsBoolean()
  @IsOptional()
  isAvailable?: boolean;
}
