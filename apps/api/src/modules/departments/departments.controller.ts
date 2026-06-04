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
import { CreateDepartmentDto } from "./dto/create-department.dto";
import { UpdateDepartmentDto } from "./dto/update-department.dto";

@Controller("departments")
export class DepartmentsController {
  constructor(
    private readonly departmentsService: DepartmentsService,
    private readonly departmentSyncService: DepartmentSyncService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createDepartmentDto: CreateDepartmentDto): Promise<any> {
    return this.departmentsService.create(createDepartmentDto);
  }

  @Get()
  async findAll(): Promise<any> {
    return this.departmentsService.findAll();
  }

  @Get("hierarchy")
  async getHierarchy(): Promise<any> {
    return this.departmentsService.getHierarchy();
  }

  @Get(":id")
  async findOne(@Param("id") id: string): Promise<any> {
    return this.departmentsService.findOne(id);
  }

  @Put(":id")
  async update(
    @Param("id") id: string,
    @Body() updateDepartmentDto: UpdateDepartmentDto,
  ): Promise<any> {
    return this.departmentsService.update(id, updateDepartmentDto);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param("id") id: string): Promise<any> {
    return this.departmentsService.remove(id);
  }

  @Get(":id/users")
  async getUsers(@Param("id") id: string): Promise<any> {
    return this.departmentsService.getUsers(id);
  }

  @Get(":id/licenses")
  async getLicenses(@Param("id") id: string): Promise<any> {
    return this.departmentsService.getLicenses(id);
  }

  @Post("sync-ad")
  @HttpCode(HttpStatus.OK)
  async syncWithAD(): Promise<any> {
    return this.departmentSyncService.syncDepartments();
  }
}
