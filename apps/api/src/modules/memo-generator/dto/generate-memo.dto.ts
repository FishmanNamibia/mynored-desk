import { IsString, IsOptional, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class BoardMemberDto {
  @IsString()
  name!: string;

  @IsString()
  title!: string;
}

export class ThroughPersonDto {
  @IsString()
  name!: string;

  @IsString()
  position!: string;
}

export class GenerateMemoDto {
  @IsString()
  to!: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => ThroughPersonDto)
  through?: ThroughPersonDto;

  @IsString()
  fromName!: string;

  @IsString()
  fromTitle!: string;

  @IsString()
  date!: string;

  @IsString()
  subject!: string;

  @IsString()
  purpose!: string;

  @IsOptional()
  @IsString()
  financialImplication?: string;

  @IsString()
  recommendation!: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BoardMemberDto)
  boardMembers?: BoardMemberDto[];
}
