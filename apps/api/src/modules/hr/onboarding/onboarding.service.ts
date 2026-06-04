import { Injectable } from "@nestjs/common";
import prisma from "@mynsa-desk/database";
import { randomUUID } from "crypto";
import { CreateEmployeeDto } from "./dto/create-employee.dto";

@Injectable()
export class OnboardingService {
  private prisma = prisma;

  async create(createEmployeeDto: CreateEmployeeDto): Promise<any> {
    const usernameFromEmail = createEmployeeDto.email.split("@")[0];
    const password = `Temp-${Math.random().toString(36).slice(2, 10)}`;

    const createdUser = await this.prisma.user.create({
      data: {
        id: randomUUID(),
        username: usernameFromEmail,
        email: createEmployeeDto.email,
        password,
        firstName: createEmployeeDto.firstName,
        lastName: createEmployeeDto.lastName,
        departmentId: createEmployeeDto.departmentId,
        position: createEmployeeDto.position,
        updatedAt: new Date(),
      },
    });

    // Assign USER role via UserRole join table
    const role = await this.prisma.role.findFirst({ where: { name: "USER" } });
    if (role) {
      await this.prisma.userRole.create({
        data: {
          id: randomUUID(),
          userId: createdUser.id,
          roleId: role.id,
        },
      });
    }

    return createdUser;
  }

  async findAll(): Promise<any[]> {
    return this.prisma.user.findMany();
  }

  async findOne(id: string): Promise<any> {
    return this.prisma.user.findUnique({
      where: { id },
    });
  }
}
