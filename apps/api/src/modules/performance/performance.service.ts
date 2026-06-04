import { Injectable } from "@nestjs/common";
import { CreatePerformanceDto, UpdatePerformanceDto } from "./dto";
import prisma from "@mynsa-desk/database";
import { randomUUID } from "crypto";

@Injectable()
export class PerformanceService {
  private prisma = prisma;

  async create(createPerformanceDto: CreatePerformanceDto): Promise<any> {
    return this.prisma.performanceReview.create({
      data: {
        id: randomUUID(),
        userId: createPerformanceDto.employeeId,
        reviewerId: createPerformanceDto.reviewerId,
        reviewDate: new Date(),
        feedback:
          createPerformanceDto.comments ||
          createPerformanceDto.strengths ||
          createPerformanceDto.areasForImprovement ||
          "",
        rating: createPerformanceDto.rating ?? 0,
      },
    });
  }

  async findAll(): Promise<any[]> {
    return this.prisma.performanceReview.findMany();
  }

  async findOne(id: string): Promise<any> {
    return this.prisma.performanceReview.findUnique({
      where: { id },
    });
  }

  async update(
    id: string,
    updatePerformanceDto: UpdatePerformanceDto,
  ): Promise<any> {
    const {
      employeeId,
      reviewerId,
      comments,
      strengths,
      areasForImprovement,
      rating,
    } = updatePerformanceDto;

    return this.prisma.performanceReview.update({
      where: { id },
      data: {
        userId: employeeId,
        reviewerId,
        feedback: comments || strengths || areasForImprovement,
        rating,
      },
    });
  }

  async remove(id: string): Promise<any> {
    return this.prisma.performanceReview.delete({
      where: { id },
    });
  }
}
