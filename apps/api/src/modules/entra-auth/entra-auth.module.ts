import { Module, forwardRef } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { EntraAuthService } from "./entra-auth.service";
import { EntraAuthController } from "./entra-auth.controller";
import { UsersService } from "../users/users.service";
import { RedisService } from "../redis/redis.service";
import { SessionService } from "../auth/session.service";
import { AuthModule } from "../auth/auth.module";

@Module({
  imports: [ConfigModule, forwardRef(() => AuthModule)],
  controllers: [EntraAuthController],
  providers: [EntraAuthService, UsersService, RedisService, SessionService],
  exports: [EntraAuthService],
})
export class EntraAuthModule {}
