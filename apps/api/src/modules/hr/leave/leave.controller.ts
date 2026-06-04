import { Controller, Get, Post, Body, Param } from "@nestjs/common";
import { LeaveService } from "./leave.service";
import { CreateLeaveDto } from "./dto/create-leave.dto";

@Controller("leave")
export class LeaveController {
  constructor(private readonly leaveService: LeaveService) {}

  @Post()
  create(@Body() createLeaveDto: CreateLeaveDto) {
    return this.leaveService.create(createLeaveDto);
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.leaveService.findOne(id);
  }

  @Get()
  findAll() {
    return this.leaveService.findAll();
  }
}
