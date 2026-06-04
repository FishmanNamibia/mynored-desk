import { Controller, Get, Post, Put, Delete, Body, Param } from "@nestjs/common";
import { RefreshmentsService } from "./refreshments.service";
import { CreateRefreshmentDto } from "./dto/create-refreshment.dto";

@Controller("refreshments")
export class RefreshmentsController {
  constructor(private readonly refreshmentsService: RefreshmentsService) {}

  @Post()
  create(@Body() createRefreshmentDto: CreateRefreshmentDto) {
    return this.refreshmentsService.create(createRefreshmentDto);
  }

  @Get()
  findAll() {
    return this.refreshmentsService.findAll();
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.refreshmentsService.findOne(id);
  }

  @Put(":id")
  update(@Param("id") id: string, @Body() body: any) {
    return this.refreshmentsService.update(id, body);
  }

  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.refreshmentsService.remove(id);
  }
}