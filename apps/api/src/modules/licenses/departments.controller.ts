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
import { DepartmentsService } from "./departments.service";
import { DepartmentSyncService } from "./department-sync.service";
import { CreateDepartmentDto, UpdateDepartmentDto } from "./dto";

@Controller("departments")
export class DepartmentsController {
  constructor(
    private readonly departmentsService: DepartmentsService,
    private readonly departmentSyncService: DepartmentSyncService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createDepartmentDto: CreateDepartmentDto) {
    return this.departmentsService.create(createDepartmentDto);
  }

  @Get()
  async findAll() {
    return this.departmentsService.findAll();
  }

  @Get("hierarchy")
  async getHierarchy() {
    return this.departmentsService.getHierarchy();
  }

  @Get(":id")
  async findOne(@Param("id") id: string) {
    return this.departmentsService.findOne(id);
  }

  @Put(":id")
  async update(
    @Param("id") id: string,
    @Body() updateDepartmentDto: UpdateDepartmentDto,
  ) {
    return this.departmentsService.update(id, updateDepartmentDto);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param("id") id: string) {
    return this.departmentsService.remove(id);
  }

  @Get(":id/licenses")
  async getLicenses(@Param("id") id: string) {
    return this.departmentsService.getLicenses(id);
  }

  @Post("sync-ad")
  @HttpCode(HttpStatus.OK)
  async syncWithAD() {
    return this.departmentSyncService.syncDepartmentsFromAD();
  }
}
