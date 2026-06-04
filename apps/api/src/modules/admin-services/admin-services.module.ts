import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { VehiclesController } from "./vehicles/vehicles.controller";
import { BoardroomsController } from "./boardrooms/boardrooms.controller";
import { RefreshmentsController } from "./refreshments/refreshments.controller";
import { AdminRequestsController } from "./admin-requests.controller";
import { VehiclesService } from "./vehicles/vehicles.service";
import { RefreshmentsService } from "./refreshments/refreshments.service";
import { BoardroomsService } from "./boardrooms/boardrooms.service";
import { AdminRequestsService } from "./admin-requests.service";
import { UsersModule } from "../users/users.module";
import { SessionGuard } from "../auth/guards/session.guard";

@Module({
  imports: [
    ConfigModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: configService.get<string>('JWT_EXPIRES_IN') },
      }),
      inject: [ConfigService],
    }),
    UsersModule,
  ],
  controllers: [
    VehiclesController,
    BoardroomsController,
    RefreshmentsController,
    AdminRequestsController,
  ],
  providers: [VehiclesService, BoardroomsService, RefreshmentsService, AdminRequestsService, SessionGuard],
  exports: [VehiclesService, BoardroomsService, RefreshmentsService, AdminRequestsService],
})
export class AdminServicesModule {}
