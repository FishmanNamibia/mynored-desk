import { Injectable, NotFoundException } from "@nestjs/common";
import prisma from "@mynsa-desk/database";
import { CreateVendorDto, UpdateVendorDto } from "./dto";

@Injectable()
export class VendorsService {
  private prisma = prisma;

  async create(createVendorDto: CreateVendorDto): Promise<any> {
    return this.prisma.vendor.create({
      data: { id: require('crypto').randomUUID(), updatedAt: new Date(), ...createVendorDto },
    });
  }

  async findAll(): Promise<any[]> {
    return this.prisma.vendor.findMany({
      include: {
        _count: {
          select: { License: true },
        },
      },
      orderBy: { name: "asc" },
    });
  }

  async findOne(id: string): Promise<any> {
    const vendor = await this.prisma.vendor.findUnique({
      where: { id },
      include: {
        License: {
          include: {
            System: true,
          },
          orderBy: { expiryDate: "asc" },
        },
      },
    });

    if (!vendor) {
      throw new NotFoundException(`Vendor with ID ${id} not found`);
    }

    return vendor;
  }

  async update(id: string, updateVendorDto: UpdateVendorDto): Promise<any> {
    await this.findOne(id); // Check if exists

    return this.prisma.vendor.update({
      where: { id },
      data: updateVendorDto,
    });
  }

  async remove(id: string): Promise<any> {
    await this.findOne(id); // Check if exists

    return this.prisma.vendor.delete({
      where: { id },
    });
  }

  async getLicenses(id: string): Promise<any[]> {
    return this.prisma.license.findMany({
      where: { vendorId: id },
      include: {
        System: true,
        Department: true,
      },
      orderBy: { expiryDate: "asc" },
    });
  }

  async onModuleDestroy(): Promise<void> {
    await this.prisma.$disconnect();
  }
}
