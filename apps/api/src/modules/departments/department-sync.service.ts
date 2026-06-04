import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import prisma from "@mynsa-desk/database";

/**
 * Service for syncing departments
 * This is a shared service that keeps department data in sync across the entire application
 */
@Injectable()
export class DepartmentSyncService {
  private readonly logger = new Logger(DepartmentSyncService.name);
  private prisma = prisma;

  /**
   * Sync departments every day at 2 AM
   */
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async scheduledSync(): Promise<void> {
    this.logger.log("Running scheduled department sync...");
    await this.syncDepartments();
  }

  /**
   * Sync departments
   * This updates the single source of truth for departments used by all modules
   */
  async syncDepartments(): Promise<{
    success: boolean;
    created: number;
    updated: number;
    total: number;
    timestamp: Date;
  }> {
    this.logger.log("Starting department sync...");

    try {
      const departments = await this.fetchDepartments();

      let created = 0;
      let updated = 0;

      for (const dept of departments) {
        const existing = await this.prisma.department.findUnique({
          where: { code: dept.code },
        });

        if (existing) {
          await this.prisma.department.update({
            where: { code: dept.code },
            data: {
              name: dept.name,
              managerId: dept.managerId,
              managerName: dept.managerName,
              managerEmail: dept.managerEmail,
              adSyncedAt: new Date(),
            },
          });
          updated++;
        } else {
          await this.prisma.department.create({
            data: {
              id: require('crypto').randomUUID(),
              updatedAt: new Date(),
              code: dept.code,
              name: dept.name,
              managerId: dept.managerId,
              managerName: dept.managerName,
              managerEmail: dept.managerEmail,
              adSyncedAt: new Date(),
            },
          });
          created++;
        }
      }

      this.logger.log(`Sync complete: ${created} created, ${updated} updated`);

      return {
        success: true,
        created,
        updated,
        total: departments.length,
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger.error("Error syncing departments", error);
      throw error;
    }
  }

  /**
   * Fetch departments
   */
  private async fetchDepartments(): Promise<any[]> {
    this.logger.warn("Using placeholder data for departments");

    return [
      {
        code: "ICT",
        name: "IT and Data Management",
        managerId: "guid-lmatota",
        managerName: "Leon Matota",
        managerEmail: "lmatota@nsa.org.na",
      },
      {
        code: "HR",
        name: "Human Resources",
        managerId: "guid-hr-manager",
        managerName: "HR Manager",
        managerEmail: "hr@nsa.org.na",
      },
      {
        code: "STATS",
        name: "Statistics Division",
        managerId: "guid-stats-manager",
        managerName: "Statistics Manager",
        managerEmail: "stats@nsa.org.na",
      },
      {
        code: "FIN",
        name: "Finance and Procurement",
        managerId: "guid-finance-manager",
        managerName: "Finance Manager",
        managerEmail: "finance@nsa.org.na",
      },
      {
        code: "ADMIN",
        name: "Administration",
        managerId: "guid-admin-manager",
        managerName: "Administration Manager",
        managerEmail: "admin@nsa.org.na",
      },
    ];
  }

  /**
   * Manual sync trigger endpoint
   */
  async triggerManualSync(): Promise<{
    success: boolean;
    created: number;
    updated: number;
    total: number;
    timestamp: Date;
  }> {
    this.logger.log("Manual AD sync triggered");
    return this.syncDepartments();
  }

  async onModuleInit(): Promise<void> {
    this.logger.log(
      "Department Sync Service initialized - shared across all modules",
    );
  }

  async onModuleDestroy(): Promise<void> {
    await this.prisma.$disconnect();
  }
}
