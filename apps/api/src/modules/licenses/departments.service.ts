import { Injectable, NotFoundException } from "@nestjs/common";
import prisma from "@mynsa-desk/database";
import { CreateDepartmentDto, UpdateDepartmentDto } from "./dto";

@Injectable()
export class DepartmentsService {
  private prisma = prisma;

  async create(createDepartmentDto: CreateDepartmentDto): Promise<any> {
    return this.prisma.department.create({
      data: { id: require('crypto').randomUUID(), updatedAt: new Date(), ...createDepartmentDto },
    });
  }

  async findAll(): Promise<any[]> {
    return this.prisma.department.findMany({
      include: {
        parent: true,
        _count: {
          select: {
            License: true,
            children: true,
          },
        },
      },
      orderBy: { code: "asc" },
    });
  }

  async getHierarchy(): Promise<any[]> {
    // Get root departments (those without parent)
    const rootDepartments = await this.prisma.department.findMany({
      where: { parentId: null },
      include: {
        children: {
          include: {
            children: true,
            _count: {
              select: { License: true },
            },
          },
        },
        _count: {
          select: { License: true },
        },
      },
      orderBy: { code: "asc" },
    });

    return rootDepartments;
  }

  async findOne(id: string): Promise<any> {
    const department = await this.prisma.department.findUnique({
      where: { id },
      include: {
        parent: true,
        children: true,
        License: {
          include: {
            Vendor: true,
            System: true,
          },
          orderBy: { expiryDate: "asc" },
        },
      },
    });

    if (!department) {
      throw new NotFoundException(`Department with ID ${id} not found`);
    }

    return department;
  }

  async update(
    id: string,
    updateDepartmentDto: UpdateDepartmentDto,
  ): Promise<any> {
    await this.findOne(id); // Check if exists

    return this.prisma.department.update({
      where: { id },
      data: updateDepartmentDto,
    });
  }

  async remove(id: string): Promise<any> {
    await this.findOne(id); // Check if exists

    return this.prisma.department.delete({
      where: { id },
    });
  }

  async getLicenses(id: string): Promise<any[]> {
    return this.prisma.license.findMany({
      where: { departmentId: id },
      include: {
        Vendor: true,
        System: true,
      },
      orderBy: { expiryDate: "asc" },
    });
  }

  async onModuleDestroy(): Promise<void> {
    await this.prisma.$disconnect();
  }
}
