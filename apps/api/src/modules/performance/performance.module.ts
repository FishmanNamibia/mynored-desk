import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import prisma from '@mynsa-desk/database';

// Controllers
import { PerformanceAgreementController } from './controllers/performance-agreement.controller';
import { GoalsController, ObjectivesController, InitiativesController } from './controllers/goals.controller';
import { TargetsController, AdhocTasksController } from './controllers/targets.controller';
import { PerformancePeriodController, Rating360Controller } from './controllers/performance-period.controller';
import { DashboardController, ReportsController, AuditLogsController, NotificationsController } from './controllers/dashboard.controller';

// Services
import {
  PerformanceAgreementService,
  GoalsService,
  TargetsService,
  PerformancePeriodService,
  DashboardService,
} from './services';

// Legacy (to be phased out)
import { PerformanceController } from './performance.controller';
import { PerformanceService } from './performance.service';

@Module({
  imports: [JwtModule.register({})],
  controllers: [
    // Legacy controller (maintain for backward compatibility)
    PerformanceController,
    // New PMS controllers
    PerformanceAgreementController,
    GoalsController,
    ObjectivesController,
    InitiativesController,
    TargetsController,
    AdhocTasksController,
    PerformancePeriodController,
    Rating360Controller,
    DashboardController,
    ReportsController,
    AuditLogsController,
    NotificationsController,
  ],
  providers: [
    // Legacy service (maintain for backward compatibility)
    PerformanceService,
    // New PMS services
    PerformanceAgreementService,
    GoalsService,
    TargetsService,
    PerformancePeriodService,
    DashboardService,
  ],
  exports: [
    // Legacy export
    PerformanceService,
    // Export new services for use in other modules
    PerformanceAgreementService,
    GoalsService,
    TargetsService,
    PerformancePeriodService,
    DashboardService,
  ],
})
export class PerformanceModule {}