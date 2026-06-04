import { Module } from "@nestjs/common";
import { SystemsController } from "./systems.controller";
import { SystemsService } from "./systems.service";

/**
 * Shared Systems Module
 *
 * This is a core shared service consumed by multiple modules:
 * - Licenses: License-to-system mapping
 * - IT Support: System status and incident tracking
 * - User Access: System permissions and access control
 * - Assets: Installed systems on hardware
 *
 * Single source of truth for applications and systems across the organization
 */
@Module({
  controllers: [SystemsController],
  providers: [SystemsService],
  exports: [SystemsService],
})
export class SystemsModule {}
