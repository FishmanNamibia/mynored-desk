import { Injectable, NotFoundException } from "@nestjs/common";
import prisma from "@mynsa-desk/database";
import { CreateLicenseDto, UpdateLicenseDto, LicenseStatus } from "./dto";

@Injectable()
export class LicensesService {
  private prisma = prisma;

  async create(createLicenseDto: CreateLicenseDto): Promise<any> {
    return this.prisma.license.create({
      data: {
        id: require('crypto').randomUUID(),
        updatedAt: new Date(),
        ...createLicenseDto,
        status: LicenseStatus.ACTIVE,
      },
      include: {
        Vendor: true,
        System: true,
        Department: true,
      },
    });
  }

  async findAll(filters?: {
    status?: string;
    type?: string;
    departmentId?: string;
    vendorId?: string;
  }): Promise<any[]> {
    const where: any = {};

    if (filters?.status) {
      where.status = filters.status;
    }
    if (filters?.type) {
      where.licenseType = filters.type;
    }
    if (filters?.departmentId) {
      where.departmentId = filters.departmentId;
    }
    if (filters?.vendorId) {
      where.vendorId = filters.vendorId;
    }

    return this.prisma.license.findMany({
      where,
      include: {
        Vendor: true,
        System: true,
        Department: true,
        LicenseAlert: {
          where: { acknowledged: false },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
      orderBy: { expiryDate: "asc" },
    });
  }

  async findExpiring(days: number = 60): Promise<any[]> {
    const expiryThreshold = new Date();
    expiryThreshold.setDate(expiryThreshold.getDate() + days);

    return this.prisma.license.findMany({
      where: {
        expiryDate: {
          lte: expiryThreshold,
        },
        status: {
          in: [LicenseStatus.ACTIVE, LicenseStatus.EXPIRING_SOON],
        },
      },
      include: {
        Vendor: true,
        System: true,
        Department: true,
        LicenseAlert: {
          where: { acknowledged: false },
          orderBy: { createdAt: "desc" },
        },
      },
      orderBy: { expiryDate: "asc" },
    });
  }

  async findOne(id: string): Promise<any> {
    const license = await this.prisma.license.findUnique({
      where: { id },
      include: {
        Vendor: true,
        System: true,
        Department: true,
        LicenseAlert: {
          orderBy: { createdAt: "desc" },
        },
        LicenseRenewal: {
          orderBy: { createdAt: "desc" },
          include: {
            WorkflowInstance: true,
          },
        },
      },
    });

    if (!license) {
      throw new NotFoundException(`License with ID ${id} not found`);
    }

    return license;
  }

  async update(id: string, updateLicenseDto: UpdateLicenseDto): Promise<any> {
    await this.findOne(id); // Check if exists

    return this.prisma.license.update({
      where: { id },
      data: updateLicenseDto,
      include: {
        Vendor: true,
        System: true,
        Department: true,
      },
    });
  }

  async remove(id: string): Promise<any> {
    await this.findOne(id); // Check if exists

    return this.prisma.license.delete({
      where: { id },
    });
  }

  async initiateRenewal(licenseId: string, notes?: string, cost?: number): Promise<any> {
    const license = await this.findOne(licenseId);

    const newExpiryDate = this.calculateNewExpiryDate(
      license.expiryDate,
      license.renewalFrequency,
    );

    const renewal = await this.prisma.licenseRenewal.create({
      data: {
        id: require('crypto').randomUUID(),
        updatedAt: new Date(),
        licenseId,
        renewalDate: new Date(),
        previousExpiryDate: license.expiryDate,
        newExpiryDate,
        cost: cost || license.renewalCost || undefined,
        currency: license.currency,
        status: "PENDING",
        initiatedBy: "system",
        notes,
      },
      include: {
        License: {
          include: {
            Vendor: true,
            System: true,
          },
        },
      },
    });

    // TODO: Create workflow instance for License Renewal workflow
    // TODO: Send notification to IT Manager

    return renewal;
  }

  async getAlerts(licenseId: string): Promise<any[]> {
    return this.prisma.licenseAlert.findMany({
      where: { licenseId },
      orderBy: { createdAt: "desc" },
      include: {
        Task: true,
      },
    });
  }

  async getRenewals(licenseId: string): Promise<any[]> {
    return this.prisma.licenseRenewal.findMany({
      where: { licenseId },
      orderBy: { createdAt: "desc" },
      include: {
        WorkflowInstance: true,
      },
    });
  }

  async getStatistics(): Promise<any> {
    const [
      total,
      active,
      expiringSoon,
      expired,
      byType,
      byDepartment,
      totalCost,
    ] = await Promise.all([
      this.prisma.license.count(),
      this.prisma.license.count({ where: { status: LicenseStatus.ACTIVE } }),
      this.prisma.license.count({
        where: { status: LicenseStatus.EXPIRING_SOON },
      }),
      this.prisma.license.count({ where: { status: LicenseStatus.EXPIRED } }),
      this.prisma.license.groupBy({
        by: ["licenseType"],
        _count: true,
      }),
      this.prisma.license.groupBy({
        by: ["departmentId"],
        _count: true,
        where: {
          departmentId: { not: null },
        },
      }),
      this.prisma.license.aggregate({
        _sum: {
          renewalCost: true,
        },
        where: {
          status: {
            in: [LicenseStatus.ACTIVE, LicenseStatus.EXPIRING_SOON],
          },
        },
      }),
    ]);

    return {
      total,
      byStatus: {
        active,
        expiringSoon,
        expired,
      },
      byType,
      byDepartment,
      totalAnnualCost: totalCost._sum.renewalCost || 0,
    };
  }

  private calculateNewExpiryDate(currentExpiry: Date, frequency: string): Date {
    const newDate = new Date(currentExpiry);

    switch (frequency) {
      case "MONTHLY":
        newDate.setMonth(newDate.getMonth() + 1);
        break;
      case "QUARTERLY":
        newDate.setMonth(newDate.getMonth() + 3);
        break;
      case "SEMI_ANNUAL":
        newDate.setMonth(newDate.getMonth() + 6);
        break;
      case "ANNUAL":
        newDate.setFullYear(newDate.getFullYear() + 1);
        break;
      case "BIENNIAL":
        newDate.setFullYear(newDate.getFullYear() + 2);
        break;
      case "TRIENNIAL":
        newDate.setFullYear(newDate.getFullYear() + 3);
        break;
      default:
        newDate.setFullYear(newDate.getFullYear() + 1);
    }

    return newDate;
  }

  async onModuleDestroy(): Promise<void> {
    await this.prisma.$disconnect();
  }
}
