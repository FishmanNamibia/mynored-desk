import { IsString, IsOptional, IsUrl } from "class-validator";

export class CreateNewsDto {
  @IsString()
  title!: string;

  @IsString()
  content!: string;

  @IsString()
  authorId!: string;

  @IsString()
  @IsOptional()
  imageUrl?: string;

  @IsString()
  @IsOptional()
  excerpt?: string;
}
