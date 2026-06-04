import { PartialType } from "@nestjs/mapped-types";
import { CreateBoardroomDto } from "./create-boardroom.dto";

export class UpdateBoardroomDto extends PartialType(CreateBoardroomDto) {}
