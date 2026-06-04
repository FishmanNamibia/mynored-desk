import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import { SystemsService } from "./systems.service";
import { CreateSystemDto, UpdateSystemDto } from "./dto";

@Controller("systems")
export class SystemsController {
  constructor(private readonly systemsService: SystemsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createSystemDto: CreateSystemDto) {
    return this.systemsService.create(createSystemDto);
  }

  @Get()
  async findAll() {
    return this.systemsService.findAll();
  }

  @Get(":id")
  async findOne(@Param("id") id: string) {
    return this.systemsService.findOne(id);
  }

  @Put(":id")
  async update(
    @Param("id") id: string,
    @Body() updateSystemDto: UpdateSystemDto,
  ) {
    return this.systemsService.update(id, updateSystemDto);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param("id") id: string) {
    return this.systemsService.remove(id);
  }

  @Get(":id/licenses")
  async getLicenses(@Param("id") id: string) {
    return this.systemsService.getLicenses(id);
  }
}
