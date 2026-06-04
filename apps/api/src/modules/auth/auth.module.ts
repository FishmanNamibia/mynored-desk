import { Module, forwardRef } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { AuthService } from "./auth.service";
import { AuthController } from "./auth.controller";
import { JwtGuard } from "./guards/jwt.guard";
import { SessionGuard } from "./guards/session.guard";
import { UsersModule } from "../users/users.module";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { SessionService } from "./session.service";

@Module({
  imports: [
    forwardRef(() => UsersModule),
    ConfigModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const jwtSecret = config.get<string>("JWT_SECRET");
        if (!jwtSecret) {
          throw new Error("JWT_SECRET must be configured");
        }

        return {
          secret: jwtSecret,
          signOptions: {
            expiresIn:
              config.get<string>("JWT_EXPIRES_IN") ||
              config.get<string>("JWT_EXPIRES") ||
              "15m",
          },
        };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtGuard, SessionGuard, SessionService],
  exports: [AuthService, JwtGuard, SessionGuard, JwtModule, SessionService],
})
export class AuthModule {}
