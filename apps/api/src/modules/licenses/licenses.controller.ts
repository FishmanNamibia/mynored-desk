import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import { LicensesService } from "./licenses.service";
import { CreateLicenseDto, UpdateLicenseDto } from "./dto";

@Controller("licenses")
export class LicensesController {
  constructor(private readonly licensesService: LicensesService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createLicenseDto: CreateLicenseDto) {
    return this.licensesService.create(createLicenseDto);
  }

  @Get()
  async findAll(
    @Query("status") status?: string,
    @Query("type") type?: string,
    @Query("departmentId") departmentId?: string,
    @Query("vendorId") vendorId?: string,
  ) {
    return this.licensesService.findAll({
      status,
      type,
      departmentId: departmentId || undefined,
      vendorId: vendorId || undefined,
    });
  }

  @Get("expiring")
  async findExpiring(@Query("days") days?: string) {
    const daysCount = days ? parseInt(days) : 60;
    return this.licensesService.findExpiring(daysCount);
  }

  @Get("statistics")
  async getStatistics() {
    return this.licensesService.getStatistics();
  }

  @Get(":id")
  async findOne(@Param("id") id: string) {
    return this.licensesService.findOne(id);
  }

  @Put(":id")
  async update(
    @Param("id") id: string,
    @Body() updateLicenseDto: UpdateLicenseDto,
  ) {
    return this.licensesService.update(id, updateLicenseDto);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param("id") id: string) {
    return this.licensesService.remove(id);
  }

  @Post(":id/renew")
  @HttpCode(HttpStatus.CREATED)
  async initiateRenewal(
    @Param("id") id: string,
    @Body() body: { notes?: string; cost?: number },
  ) {
    return this.licensesService.initiateRenewal(id, body.notes, body.cost);
  }

  @Get(":id/alerts")
  async getAlerts(@Param("id") id: string) {
    return this.licensesService.getAlerts(id);
  }

  @Get(":id/renewals")
  async getRenewals(@Param("id") id: string) {
    return this.licensesService.getRenewals(id);
  }
}
