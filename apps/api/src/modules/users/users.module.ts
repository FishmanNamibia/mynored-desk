import { Module, forwardRef } from "@nestjs/common";
import { UsersController } from "./users.controller";
import { UsersService } from "./users.service";
import prisma from "@mynsa-desk/database";
import { AuthModule } from "../auth/auth.module";

@Module({
  imports: [forwardRef(() => AuthModule)],
  controllers: [UsersController],
  providers: [
    UsersService,
    {
      provide: "PRISMA_CLIENT",
      useValue: prisma,
    },
  ],
  exports: [UsersService],
})
export class UsersModule {}
