import { Injectable, NotFoundException } from "@nestjs/common";
import prisma from "@mynsa-desk/database";
import { CreateVehicleDto } from "./dto/create-vehicle.dto";
import { Vehicle } from "./entities/vehicle.entity";

@Injectable()
export class VehiclesService {
  private prisma = prisma;

  async create(createVehicleDto: CreateVehicleDto): Promise<any> {
    return this.prisma.vehicle.create({
      data: {
        id: require('crypto').randomUUID(),
        updatedAt: new Date(),
        ...createVehicleDto,
        isAvailable: createVehicleDto.isAvailable ?? true,
      },
    });
  }

  async findAll(): Promise<any[]> {
    return this.prisma.vehicle.findMany({ orderBy: { createdAt: "desc" } });
  }

  async findOne(id: string): Promise<any> {
    const vehicle = await this.prisma.vehicle.findUnique({ where: { id } });
    if (!vehicle) {
      throw new NotFoundException(`Vehicle with ID ${id} not found`);
    }
    return vehicle;
  }

  async remove(id: string): Promise<any> {
    await this.findOne(id);
    return this.prisma.vehicle.delete({ where: { id } });
  }
}
