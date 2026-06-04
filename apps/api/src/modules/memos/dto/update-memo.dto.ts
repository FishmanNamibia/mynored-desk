import { PartialType } from "@nestjs/mapped-types";
import { CreateMemoDto } from "./create-memo.dto";
import { OmitType } from "@nestjs/mapped-types";

export class UpdateMemoDto extends PartialType(
  OmitType(CreateMemoDto, ['createdById'] as const)
) {}
