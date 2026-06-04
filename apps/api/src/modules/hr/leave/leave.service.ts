import { Injectable } from "@nestjs/common";
import prisma from "@mynsa-desk/database";
import { CreateLeaveDto } from "./dto/create-leave.dto";

@Injectable()
export class LeaveService {
  private prisma = prisma;

  async create(createLeaveDto: CreateLeaveDto): Promise<any> {
    return this.prisma.leaveRequest.create({
      data: {
        id: require('crypto').randomUUID(),
        userId: createLeaveDto.employeeId,
        startDate: createLeaveDto.startDate,
        endDate: createLeaveDto.endDate,
        reason: createLeaveDto.reason || "",
        status: createLeaveDto.status || "PENDING",
      },
    });
  }

  async findAll(): Promise<any[]> {
    return this.prisma.leaveRequest.findMany();
  }

  async findOne(id: string): Promise<any> {
    return this.prisma.leaveRequest.findUnique({
      where: { id },
    });
  }

  async approve(id: string): Promise<any> {
    return this.prisma.leaveRequest.update({
      where: { id },
      data: { status: "APPROVED" },
    });
  }

  async reject(id: string): Promise<any> {
    return this.prisma.leaveRequest.update({
      where: { id },
      data: { status: "REJECTED" },
    });
  }
}
