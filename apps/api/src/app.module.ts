import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { validationSchema } from "./config/validation"; // your Joi/Zod schema

import appConfig from "./config/app.config";
import databaseConfig from "./config/database.config";
import jwtConfig from "./config/jwt.config";
import redisConfig from "./config/redis.config";
import aiConfig from "./config/ai.config";

import { ScheduleModule } from "@nestjs/schedule";
import { AuthModule } from "./modules/auth/auth.module";
import { UsersModule } from "./modules/users/users.module";
import { MemosModule } from "./modules/memos/memos.module";
// import { PerformanceModule } from "./modules/performance/performance.module"; // Deactivated for now
import { AdminServicesModule } from "./modules/admin-services/admin-services.module";
import { HrModule } from "./modules/hr/hr.module";
import { TasksModule } from "./modules/tasks/tasks.module";
import { NewsModule } from "./modules/news/news.module";
import { NotificationsModule } from "./modules/notifications/notifications.module";
import { WorkflowModule } from "./modules/workflow/workflow.module";
import { DepartmentsModule } from "./modules/departments/departments.module";
import { VendorsModule } from "./modules/vendors/vendors.module";
import { SystemsModule } from "./modules/systems/systems.module";
import { LicensesModule } from "./modules/licenses/licenses.module";
import { EntraAuthModule } from "./modules/entra-auth/entra-auth.module";
import { HealthModule } from "./modules/health/health.module";
import { AiModule } from "./modules/ai/ai.module";
import { MemoGeneratorModule } from "./modules/memo-generator/memo-generator.module";
import { RequestsModule } from "./modules/requests/requests.module";

@Module({
  imports: [
    // Official recommended way for async/dependent configs
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath:
        process.env.NODE_ENV === "production"
          ? undefined // production: no .env files – use real env vars / secrets manager
          : [
              // Local dev only – monorepo root .env (highest priority)
              `${process.cwd()}/.env.local`,
              `${process.cwd()}/.env.${process.env.NODE_ENV || "development"}`,
              `${process.cwd()}/../../.env`,
            ],
      load: [appConfig, databaseConfig, jwtConfig, redisConfig, aiConfig],
      validationSchema,
      validationOptions: {
        abortEarly: false,
        allowUnknown: true,
      },
      expandVariables: true,
      cache: true, // safe in production
    }),

    ScheduleModule.forRoot(),

    AuthModule,
    UsersModule,
    MemosModule,
    // PerformanceModule, // Deactivated for now
    AdminServicesModule,
    HrModule,
    TasksModule,
    NewsModule,
    NotificationsModule,
    WorkflowModule,
    DepartmentsModule,
    VendorsModule,
    SystemsModule,
    LicensesModule,
    EntraAuthModule,
    HealthModule,
    AiModule,
    MemoGeneratorModule,
    RequestsModule,
  ],
})
export class AppModule {}
