import { Module } from "@nestjs/common";
import { LicensesController } from "./licenses.controller";
import { LicensesService } from "./licenses.service";
import { LicenseMonitoringService } from "./license-monitoring.service";
import { DepartmentsModule } from "../departments/departments.module";
import { VendorsModule } from "../vendors/vendors.module";
import { SystemsModule } from "../systems/systems.module";

/**
 * Licenses Module
 *
 * Depends on shared services:
 * - DepartmentsModule: For department-based cost allocation
 * - VendorsModule: For vendor management
 * - SystemsModule: For system-to-license mapping
 */
@Module({
  imports: [DepartmentsModule, VendorsModule, SystemsModule],
  controllers: [LicensesController],
  providers: [LicensesService, LicenseMonitoringService],
  exports: [LicensesService, LicenseMonitoringService],
})
export class LicensesModule {}
