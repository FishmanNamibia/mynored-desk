import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import prisma from "@mynsa-desk/database";

@Injectable()
export class LicenseMonitoringService {
  private readonly logger = new Logger(LicenseMonitoringService.name);
  private prisma = prisma;

  /**
   * Run every day at 8 AM to check for expiring licenses
   */
  @Cron(CronExpression.EVERY_DAY_AT_8AM)
  async checkExpiringLicenses(): Promise<void> {
    this.logger.log("Running license expiry check...");

    try {
      const licenses = await this.prisma.license.findMany({
        where: {
          status: {
            in: ["ACTIVE", "EXPIRING_SOON"],
          },
        },
        include: {
          Vendor: true,
          System: true,
          Department: true,
        },
      });

      for (const license of licenses) {
        await this.checkLicense(license);
      }

      this.logger.log(`Checked ${licenses.length} licenses`);
    } catch (error) {
      this.logger.error("Error checking licenses", error);
    }
  }

  private async checkLicense(license: any): Promise<void> {
    const today = new Date();
    const expiryDate = new Date(license.expiryDate);
    const daysUntilExpiry = Math.ceil(
      (expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
    );

    // Check if license has expired
    if (daysUntilExpiry < 0) {
      await this.handleExpiredLicense(license, Math.abs(daysUntilExpiry));
      return;
    }

    // Check if license is expiring soon
    if (daysUntilExpiry <= license.alertThreshold) {
      await this.handleExpiringSoonLicense(license, daysUntilExpiry);
      return;
    }

    // Update status to ACTIVE if previously EXPIRING_SOON
    if (
      license.status === "EXPIRING_SOON" &&
      daysUntilExpiry > license.alertThreshold
    ) {
      await this.prisma.license.update({
        where: { id: license.id },
        data: { status: "ACTIVE" },
      });
    }
  }

  private async handleExpiredLicense(
    license: any,
    daysExpired: number,
  ): Promise<void> {
    // Update license status
    if (license.status !== "EXPIRED") {
      await this.prisma.license.update({
        where: { id: license.id },
        data: { status: "EXPIRED" },
      });

      this.logger.warn(
        `License ${license.licenseKey} for ${license.productName} has EXPIRED (${daysExpired} days ago)`,
      );
    }

    // Create critical alert
    const existingAlert = await this.prisma.licenseAlert.findFirst({
      where: {
        licenseId: license.id,
        alertType: "EXPIRED",
        acknowledged: false,
      },
    });

    if (!existingAlert) {
      await this.createAlert(license, "EXPIRED", "CRITICAL", daysExpired * -1);
    }
  }

  private async handleExpiringSoonLicense(
    license: any,
    daysUntilExpiry: number,
  ): Promise<void> {
    // Update license status
    if (license.status !== "EXPIRING_SOON") {
      await this.prisma.license.update({
        where: { id: license.id },
        data: { status: "EXPIRING_SOON" },
      });
    }

    // Determine alert type and severity
    let alertType: any;
    let severity: any;

    if (daysUntilExpiry <= 7) {
      alertType = "EXPIRY_CRITICAL";
      severity = "CRITICAL";
    } else if (daysUntilExpiry <= 30) {
      alertType = "EXPIRY_WARNING";
      severity = "WARNING";
    } else {
      alertType = "EXPIRY_WARNING";
      severity = "INFO";
    }

    // Check if alert already exists for this period
    const existingAlert = await this.prisma.licenseAlert.findFirst({
      where: {
        licenseId: license.id,
        alertType,
        acknowledged: false,
      },
    });

    if (!existingAlert) {
      this.logger.warn(
        `License ${license.licenseKey} for ${license.productName} expires in ${daysUntilExpiry} days`,
      );

      await this.createAlert(license, alertType, severity, daysUntilExpiry);
    }
  }

  private async createAlert(
    license: any,
    alertType: any,
    severity: any,
    daysUntilExpiry: number,
  ): Promise<any> {
    const message = this.generateAlertMessage(
      license,
      alertType,
      daysUntilExpiry,
    );

    const alert = await this.prisma.licenseAlert.create({
      data: {
        id: require('crypto').randomUUID(),
        licenseId: license.id,
        alertType,
        severity,
        message,
        daysUntilExpiry,
        notificationSent: false,
      },
    });

    // TODO: Integrate with notification service
    // await this.notificationService.sendLicenseAlert(alert, license);

    // Create task for critical alerts
    if (severity === "CRITICAL") {
      await this.createRenewalTask(license, alert);
    }

    return alert;
  }

  private generateAlertMessage(
    license: any,
    alertType: any,
    daysUntilExpiry: number,
  ): string {
    const productName = license.productName;
    const vendorName = license.vendor?.name || "Unknown Vendor";

    switch (alertType) {
      case "EXPIRED":
        return `URGENT: ${productName} license from ${vendorName} has EXPIRED ${Math.abs(
          daysUntilExpiry,
        )} days ago. Immediate action required!`;
      case "EXPIRY_CRITICAL":
        return `CRITICAL: ${productName} license expires in ${daysUntilExpiry} days. Renewal process must be initiated immediately!`;
      case "EXPIRY_WARNING":
        return `WARNING: ${productName} license expires in ${daysUntilExpiry} days. Plan renewal process.`;
      default:
        return `License alert for ${productName}`;
    }
  }

  private async createRenewalTask(license: any, alert: any): Promise<any> {
    // Check if task already exists
    const existingTask = await this.prisma.task.findFirst({
      where: {
        title: {
          contains: license.licenseKey,
        },
        status: {
          in: ["PENDING", "IN_PROGRESS"],
        },
      },
    });

    if (existingTask) {
      this.logger.log(`Task already exists for license ${license.licenseKey}`);
      return;
    }

    // Get IT Manager user (query from users with ADMIN role in IT department)
    const itManagerRole = await this.prisma.userRole.findFirst({
      where: {
        role: { name: "ADMIN" },
        user: {
          department: {
            name: "IT and Data Management",
          },
        },
      },
      include: { user: true },
    });

    if (!itManagerRole || !(itManagerRole as any).user) {
      this.logger.warn("No IT Manager found to assign renewal task");
      return;
    }
    const itManager = (itManagerRole as any).user;

    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + Math.max(7, alert.daysUntilExpiry - 7));

    const task = await this.prisma.task.create({
      data: {
        id: require('crypto').randomUUID(),
        updatedAt: new Date(),
        title: `Renew License: ${license.productName} (${license.licenseKey})`,
        description: `${alert.message}\n\nVendor: ${
          license.Vendor?.name
        }\nSystem: ${license.System?.name}\nExpiry Date: ${new Date(
          license.expiryDate,
        ).toLocaleDateString()}\n\nAction Required: Initiate license renewal process.`,
        assignedToId: itManager.id,
        dueDate,
        status: "PENDING",
      },
    });

    // Link task to alert
    await this.prisma.licenseAlert.update({
      where: { id: alert.id },
      data: {
        taskCreated: true,
        taskId: task.id,
      },
    });

    this.logger.log(
      `Created renewal task for license ${license.licenseKey}, assigned to ${itManager.username}`,
    );

    return task;
  }

  /**
   * Run on startup to check licenses immediately
   */
  async onModuleInit(): Promise<void> {
    this.logger.log("License Monitoring Service initialized");
    // Optionally run check on startup
    // await this.checkExpiringLicenses();
  }

  async onModuleDestroy(): Promise<void> {
    await this.prisma.$disconnect();
  }
}
