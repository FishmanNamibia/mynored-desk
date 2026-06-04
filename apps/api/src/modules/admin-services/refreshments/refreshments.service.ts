import { Injectable, NotFoundException } from "@nestjs/common";
import prisma from "@mynsa-desk/database";
import { CreateRefreshmentDto } from "./dto/create-refreshment.dto";
import { randomUUID } from "crypto";

@Injectable()
export class RefreshmentsService {
  private prisma = prisma;

  async create(createRefreshmentDto: CreateRefreshmentDto): Promise<any> {
    return this.prisma.refreshment.create({
      data: {
        id: randomUUID(),
        name: createRefreshmentDto.name,
        category: (createRefreshmentDto as any).category || null,
        quantity: (createRefreshmentDto as any).quantity || 0,
        supplier: (createRefreshmentDto as any).supplier || null,
        departmentId: (createRefreshmentDto as any).departmentId || null,
        dateAdded: new Date(),
      },
    });
  }

  async findAll(): Promise<any[]> {
    return this.prisma.refreshment.findMany({ orderBy: { createdAt: "desc" } });
  }

  async findOne(id: string): Promise<any> {
    const refreshment = await this.prisma.refreshment.findUnique({ where: { id } });
    if (!refreshment) {
      throw new NotFoundException(`Refreshment with ID ${id} not found`);
    }
    return refreshment;
  }

  async update(id: string, data: any): Promise<any> {
    await this.findOne(id);
    return this.prisma.refreshment.update({
      where: { id },
      data: { ...data, updatedAt: new Date() },
    });
  }

  async remove(id: string): Promise<any> {
    await this.findOne(id);
    return this.prisma.refreshment.delete({ where: { id } });
  }
}
