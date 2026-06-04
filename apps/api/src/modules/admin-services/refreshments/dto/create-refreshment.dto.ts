import { IsString, IsNumber, IsOptional } from "class-validator";

export class CreateRefreshmentDto {
  @IsString()
  name!: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsNumber()
  quantity!: number;

  @IsNumber()
  @IsOptional()
  price?: number;
}
