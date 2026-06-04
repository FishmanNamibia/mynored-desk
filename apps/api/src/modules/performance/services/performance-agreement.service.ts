import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import prisma from '@mynsa-desk/database';
import { randomUUID } from 'crypto';
import { 
  CreatePerformanceAgreementDto,
  UpdatePerformanceAgreementDto,
  BulkCreatePerformanceAgreementDto,
  ApprovePerformanceAgreementDto,
  PerformanceAgreementFilterDto,
  PerformanceAgreementStatus,
  ApprovalAction
} from '../dto';
import { ollamaService } from '../../../../../../packages/shared/src/ai';

@Injectable()
export class PerformanceAgreementService {
  private prisma = prisma;

  async create(dto: CreatePerformanceAgreementDto, createdById: string) {
    // Check if employee already has an agreement for this period
    const existing = await this.prisma.performanceAgreement.findFirst({
      where: {
        userId: dto.employeeId,
        performancePeriodId: dto.performancePeriodId,
      },
    });

    if (existing) {
      throw new BadRequestException('Performance agreement already exists for this employee and period');
    }

    // Validate performance period exists and is active
    const performancePeriod = await this.prisma.performancePeriod.findUnique({
      where: { id: dto.performancePeriodId },
    });

    if (!performancePeriod) {
      throw new NotFoundException('Performance period not found');
    }

    return this.prisma.performanceAgreement.create({
      data: {
        id: randomUUID(),
        userId: dto.employeeId,
        performancePeriodId: dto.performancePeriodId,
        supervisorId: (dto as any).supervisorId,
        status: PerformanceAgreementStatus.DRAFT,
        title: 'Performance Agreement',
        dueDate: new Date(),
        updatedAt: new Date(),
      },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true } },
        performancePeriod: { select: { id: true, name: true, startDate: true, endDate: true } },
        supervisor: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });
  }

  async findAll(filter: PerformanceAgreementFilterDto) {
    const { page = 1, limit = 10, ...where } = filter;
    const skip = (page - 1) * limit;

    const [agreements, total] = await Promise.all([
      this.prisma.performanceAgreement.findMany({
        where: where as any,
        skip,
        take: limit,
        include: {
          user: { select: { id: true, firstName: true, lastName: true, email: true } },
          performancePeriod: { select: { id: true, name: true, startDate: true, endDate: true } },
          supervisor: { select: { id: true, firstName: true, lastName: true, email: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.performanceAgreement.count({ where: where as any }),
    ]);

    return {
      data: agreements,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const agreement = await this.prisma.performanceAgreement.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true } },
        performancePeriod: { select: { id: true, name: true, startDate: true, endDate: true } },
        supervisor: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });

    if (!agreement) {
      throw new NotFoundException('Performance agreement not found');
    }

    return agreement;
  }

  async update(id: string, dto: UpdatePerformanceAgreementDto, updatedById: string) {
    const agreement = await this.prisma.performanceAgreement.findUnique({
      where: { id },
    });

    if (!agreement) {
      throw new NotFoundException('Performance agreement not found');
    }

    // Check if user has permission to update
    if (agreement.userId !== updatedById && agreement.supervisorId !== updatedById) {
      // Additional check for admin/HR roles would go here
      throw new ForbiddenException('Insufficient permissions to update this agreement');
    }

    return this.prisma.performanceAgreement.update({
      where: { id },
      data: { ...(dto as any), updatedAt: new Date() },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true } },
        performancePeriod: { select: { id: true, name: true, startDate: true, endDate: true } },
      },
    });
  }

  async submit(id: string, employeeId: string) {
    const agreement = await this.prisma.performanceAgreement.findUnique({
      where: { id },
    });

    if (!agreement) {
      throw new NotFoundException('Performance agreement not found');
    }

    if (agreement.userId !== employeeId) {
      throw new ForbiddenException('Only the employee can submit their agreement');
    }

    if (agreement.status !== PerformanceAgreementStatus.DRAFT) {
      throw new BadRequestException('Can only submit draft agreements');
    }

    return this.prisma.performanceAgreement.update({
      where: { id },
      data: { status: PerformanceAgreementStatus.SUBMITTED, updatedAt: new Date() },
    });
  }

  async approve(id: string, dto: ApprovePerformanceAgreementDto, supervisorId: string) {
    const agreement = await this.prisma.performanceAgreement.findUnique({
      where: { id },
      include: { user: true, supervisor: true },
    });

    if (!agreement) {
      throw new NotFoundException('Performance agreement not found');
    }

    if (agreement.supervisorId !== supervisorId) {
      throw new ForbiddenException('Only the assigned supervisor can approve this agreement');
    }

    if (agreement.status !== PerformanceAgreementStatus.SUBMITTED) {
      throw new BadRequestException('Can only approve submitted agreements');
    }

    const newStatus = dto.action === ApprovalAction.APPROVE 
      ? PerformanceAgreementStatus.APPROVED
      : dto.action === ApprovalAction.REJECT 
      ? PerformanceAgreementStatus.REJECTED
      : PerformanceAgreementStatus.UNDER_REVIEW;

    const updatedAgreement = await this.prisma.performanceAgreement.update({
      where: { id },
      data: {
        status: newStatus,
        progressNotes: dto.comments,
        approvedAt: dto.action === ApprovalAction.APPROVE ? new Date() : null,
        updatedAt: new Date(),
      },
    });

    // Create notification for employee
    await (this.prisma.pmsNotification as any).create({
      data: {
        receiverId: agreement.userId,
        title: `Performance Agreement ${dto.action.toLowerCase()}`,
        message: `Your performance agreement has been ${dto.action.toLowerCase()}${dto.comments ? `: ${dto.comments}` : ''}`,
        type: 'PERFORMANCE',
        entityType: 'PERFORMANCE_AGREEMENT',
        entityId: id,
        senderId: supervisorId,
      },
    });

    return updatedAgreement;
  }

  async bulkCreate(dto: BulkCreatePerformanceAgreementDto, createdById: string) {
    // Validate performance period
    const performancePeriod = await this.prisma.performancePeriod.findUnique({
      where: { id: dto.performancePeriodId },
    });

    if (!performancePeriod) {
      throw new NotFoundException('Performance period not found');
    }

    // Check for existing agreements
    const existingAgreements = await this.prisma.performanceAgreement.findMany({
      where: {
        userId: { in: dto.employeeIds },
        performancePeriodId: dto.performancePeriodId,
      },
      select: { userId: true },
    });

    const existingEmployeeIds = existingAgreements.map(a => a.userId);
    const newEmployeeIds = dto.employeeIds.filter(id => !existingEmployeeIds.includes(id));

    if (newEmployeeIds.length === 0) {
      throw new BadRequestException('All specified employees already have agreements for this period');
    }

    const agreements = await this.prisma.performanceAgreement.createMany({
      data: newEmployeeIds.map(employeeId => ({
        id: randomUUID(),
        userId: employeeId,
        performancePeriodId: dto.performancePeriodId,
        progressNotes: dto.supervisorNotes,
        status: PerformanceAgreementStatus.DRAFT,
        title: 'Performance Agreement',
        dueDate: new Date(),
        updatedAt: new Date(),
      })),
    });

    return {
      created: agreements.count,
      skipped: existingEmployeeIds.length,
      message: `Created ${agreements.count} agreements, skipped ${existingEmployeeIds.length} existing agreements`,
    };
  }

  async delete(id: string, userId: string) {
    const agreement = await this.prisma.performanceAgreement.findUnique({
      where: { id },
    });

    if (!agreement) {
      throw new NotFoundException('Performance agreement not found');
    }

    // Only allow deletion of draft agreements
    if (agreement.status !== PerformanceAgreementStatus.DRAFT) {
      throw new BadRequestException('Can only delete draft agreements');
    }

    // Check permissions
    if (agreement.userId !== userId && agreement.supervisorId !== userId) {
      throw new ForbiddenException('Insufficient permissions to delete this agreement');
    }

    await this.prisma.performanceAgreement.delete({
      where: { id },
    });

    return { message: 'Performance agreement deleted successfully' };
  }

  async getAIInsights(id: string, userId: string) {
    const agreement = await this.findOne(id);

    // Check permissions
    if (agreement.userId !== userId && agreement.supervisorId !== userId) {
      throw new ForbiddenException('Insufficient permissions to view this agreement');
    }

    // Get AI insights on the performance agreement
    const insight = await ollamaService.getPerformanceInsight({
      type: 'performance_feedback',
      data: {
        agreement: {
          status: agreement.status,
          goalsCount: 0,
          targetsCount: 0,
          ratings: [],
        },
      },
      userRole: agreement.userId === userId ? 'Employee' : 'Supervisor',
      department: undefined,
    });

    return {
      agreementId: id,
      insights: insight.insight,
      error: insight.error,
      generatedAt: new Date(),
    };
  }
}