import { Module } from "@nestjs/common";
import { DepartmentsController } from "./departments.controller";
import { DepartmentsService } from "./departments.service";
import { DepartmentSyncService } from "./department-sync.service";

/**
 * Shared Departments Module
 *
 * This is a core shared service consumed by multiple modules:
 * - Licenses: Department cost allocation
 * - HR: Leave management, employee records
 * - Memos: Routing and approval chains
 * - Assets: Equipment assignment tracking
 * - Tasks: Departmental project management
 * - Performance: Departmental KPIs
 *
 * Single source of truth for organizational structure
 */
@Module({
  controllers: [DepartmentsController],
  providers: [DepartmentsService, DepartmentSyncService],
  exports: [DepartmentsService, DepartmentSyncService],
})
export class DepartmentsModule {}
