import { Module } from "@nestjs/common";
import { VendorsController } from "./vendors.controller";
import { VendorsService } from "./vendors.service";

/**
 * Shared Vendors Module
 *
 * This is a core shared service consumed by multiple modules:
 * - Licenses: Software license vendors
 * - Procurement: Purchase order vendors
 * - Assets: Equipment suppliers
 * - Contracts: Service agreement vendors
 * - Finance: Invoice processing
 *
 * Single source of truth for vendor management across the organization
 */
@Module({
  controllers: [VendorsController],
  providers: [VendorsService],
  exports: [VendorsService],
})
export class VendorsModule {}
