import { Injectable, NotFoundException } from "@nestjs/common";
import prisma from "@mynsa-desk/database";
import { CreateSystemDto, UpdateSystemDto } from "./dto";

@Injectable()
export class SystemsService {
  private prisma = prisma;

  async create(createSystemDto: CreateSystemDto): Promise<any> {
    return this.prisma.system.create({
      data: { id: require('crypto').randomUUID(), updatedAt: new Date(), ...createSystemDto },
    });
  }

  async findAll(): Promise<any[]> {
    return this.prisma.system.findMany({
      include: {
        _count: {
          select: { License: true },
        },
      },
      orderBy: { name: "asc" },
    });
  }

  async findOne(id: string): Promise<any> {
    const system = await this.prisma.system.findUnique({
      where: { id },
      include: {
        License: {
          include: {
            Vendor: true,
          },
          orderBy: { expiryDate: "asc" },
        },
      },
    });

    if (!system) {
      throw new NotFoundException(`System with ID ${id} not found`);
    }

    return system;
  }

  async update(id: string, updateSystemDto: UpdateSystemDto): Promise<any> {
    await this.findOne(id); // Check if exists

    return this.prisma.system.update({
      where: { id },
      data: updateSystemDto,
    });
  }

  async remove(id: string): Promise<any> {
    await this.findOne(id); // Check if exists

    return this.prisma.system.delete({
      where: { id },
    });
  }

  async getLicenses(id: string): Promise<any[]> {
    return this.prisma.license.findMany({
      where: { systemId: id },
      include: {
        Vendor: true,
        Department: true,
      },
      orderBy: { expiryDate: "asc" },
    });
  }

  async onModuleDestroy(): Promise<void> {
    await this.prisma.$disconnect();
  }
}
