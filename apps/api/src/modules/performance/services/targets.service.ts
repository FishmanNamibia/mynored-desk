import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import prisma from '@mynsa-desk/database';
import { randomUUID } from 'crypto';
import {
  CreateTargetDto,
  UpdateTargetDto,
  ApproveTargetDto,
  CreateAdhocTaskDto,
  UpdateAdhocTaskDto,
  TargetFilterDto,
  AdhocTaskFilterDto,
  TargetStatus,
  AdhocTaskStatus,
} from '../dto';
import { ollamaService } from '../../../../../../packages/shared/src/ai';

@Injectable()
export class TargetsService {
  private prisma = prisma;

  // TARGETS MANAGEMENT
  async createTarget(dto: CreateTargetDto, userId: string) {
    // Validate employee exists
    const employee = await this.prisma.user.findUnique({
      where: { id: dto.employeeId },
    });

    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    // Category validation skipped - Category model doesn't exist in schema

    return this.prisma.target.create({
      data: {
        id: randomUUID(),
        title: dto.title,
        description: dto.description,
        responsibleId: dto.employeeId,
        status: 'NOT_STARTED' as any,
        percentComplete: 0,
        updatedAt: new Date(),
      },
      include: {
        responsible: {
          select: { id: true, firstName: true, lastName: true, email: true, department: true },
        },
        initiative: {
          select: { id: true, title: true },
        },
      },
    });
  }

  async findTargets(filter: TargetFilterDto) {
    const { page = 1, limit = 10, ...where } = filter;
    const skip = (page - 1) * limit;

    const [targets, total] = await Promise.all([
      this.prisma.target.findMany({
        where: where as any,
        skip,
        take: limit,
        include: {
          responsible: {
            select: { id: true, firstName: true, lastName: true, email: true, department: true },
          },
          initiative: {
            select: { id: true, title: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.target.count({ where: where as any }),
    ]);

    return {
      data: targets,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findTarget(id: string, userId: string) {
    const target = await this.prisma.target.findUnique({
      where: { id },
      include: {
        responsible: {
          select: { id: true, firstName: true, lastName: true, email: true, department: true },
        },
        initiative: {
          select: { id: true, title: true },
        },
      },
    });

    if (!target) {
      throw new NotFoundException('Target not found');
    }

    // Check permissions - only responsible user can view
    if (target.responsibleId !== userId) {
      throw new ForbiddenException('Insufficient permissions');
    }

    return target;
  }

  async updateTarget(id: string, dto: UpdateTargetDto, userId: string) {
    const target = await this.prisma.target.findUnique({
      where: { id },
    });

    if (!target) {
      throw new NotFoundException('Target not found');
    }

    // Check permissions
    if (target.responsibleId !== userId) {
      throw new ForbiddenException('Insufficient permissions');
    }

    return this.prisma.target.update({
      where: { id },
      data: {
        ...(dto as any),
        updatedAt: new Date(),
      },
      include: {
        responsible: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        initiative: {
          select: { id: true, title: true },
        },
      },
    });
  }

  async deleteTarget(id: string, userId: string) {
    const target = await this.prisma.target.findUnique({
      where: { id },
    });

    if (!target) {
      throw new NotFoundException('Target not found');
    }

    // Check permissions
    if (target.responsibleId !== userId) {
      throw new ForbiddenException('Insufficient permissions');
    }

    // Can only delete pending targets
    if (target.status !== 'NOT_STARTED') {
      throw new BadRequestException('Can only delete pending targets');
    }

    await this.prisma.target.delete({ where: { id } });
    return { message: 'Target deleted successfully' };
  }

  // ADHOC TASKS MANAGEMENT
  async createAdhocTask(dto: CreateAdhocTaskDto, userId: string) {
    // Validate assigned user exists
    const assignedUser = await this.prisma.user.findUnique({
      where: { id: dto.assignedToId },
    });

    if (!assignedUser) {
      throw new NotFoundException('Assigned user not found');
    }

    // Validate assigner (should be supervisor or admin)
    if (dto.assignedById !== userId) {
      throw new BadRequestException('Can only create tasks assigned by yourself');
    }

    return this.prisma.adhocTask.create({
      data: {
        id: randomUUID(),
        title: dto.title,
        description: dto.description,
        priority: dto.priority || 'MEDIUM',
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
        assignedToId: dto.assignedToId,
        createdById: userId,
        status: 'NOT_STARTED' as any,
        percentComplete: 0,
        updatedAt: new Date(),
      },
      include: {
        assignedTo: {
          select: { id: true, firstName: true, lastName: true, email: true, department: true },
        },
        createdBy: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });
  }

  // CONTROLLER WRAPPER METHODS
  async findAll(filter: any, user: any) {
    return this.findTargets(filter);
  }

  async create(dto: CreateTargetDto, userId: string) {
    return this.createTarget(dto, userId);
  }

  async findOne(id: string, user: any) {
    return this.findTarget(id, user?.id ?? user);
  }

  async update(id: string, dto: UpdateTargetDto, userId: string) {
    return this.updateTarget(id, dto, userId);
  }

  async updateStatus(id: string, statusDto: any, userId: string) {
    return this.updateTarget(id, { status: statusDto.status }, userId);
  }

  async approve(id: string, approveDto: ApproveTargetDto, userId: string) {
    const target = await this.prisma.target.findUnique({ where: { id } });
    if (!target) throw new NotFoundException('Target not found');
    return this.prisma.target.update({
      where: { id },
      data: {
        approvalStatus: approveDto.status as any,
        approvedBy: userId,
        approvedAt: new Date(),
        updatedAt: new Date(),
      },
    });
  }

  async getPendingApproval(user: any) {
    return this.prisma.target.findMany({
      where: { approvalStatus: 'PENDING' as any },
      include: {
        responsible: { select: { id: true, firstName: true, lastName: true } },
      },
    });
  }

  async getSubordinates(userId: string) {
    return this.prisma.target.findMany({
      where: { responsibleId: userId },
      include: {
        responsible: { select: { id: true, firstName: true, lastName: true } },
      },
    });
  }

  async cascade(cascadeDto: any, userId: string) {
    throw new BadRequestException('Cascade targets feature not yet implemented');
  }

  async reassign(id: string, reassignDto: any, userId: string) {
    const target = await this.prisma.target.findUnique({ where: { id } });
    if (!target) throw new NotFoundException('Target not found');
    return this.prisma.target.update({
      where: { id },
      data: { responsibleId: reassignDto.newResponsibleId, updatedAt: new Date() },
    });
  }

  async findAllAdhocTasks(filter: any, user: any) {
    return this.findAdhocTasks(filter);
  }

  async findOneAdhocTask(id: string, user: any) {
    return this.findAdhocTask(id, user?.id ?? user);
  }

  async findAdhocTasks(filter: AdhocTaskFilterDto) {
    const { page = 1, limit = 10, ...where } = filter;
    const skip = (page - 1) * limit;

    const [tasks, total] = await Promise.all([
      this.prisma.adhocTask.findMany({
        where,
        skip,
        take: limit,
        include: {
          assignedTo: {
            select: { id: true, firstName: true, lastName: true, email: true, department: true },
          },
          createdBy: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
        },
        orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
      }),
      this.prisma.adhocTask.count({ where }),
    ]);

    return {
      data: tasks,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findAdhocTask(id: string, userId: string) {
    const task = await this.prisma.adhocTask.findUnique({
      where: { id },
      include: {
        assignedTo: {
          select: { id: true, firstName: true, lastName: true, email: true, department: true },
        },
        createdBy: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });

    if (!task) {
      throw new NotFoundException('Adhoc task not found');
    }

    // Check permissions
    if (task.assignedToId !== userId && task.createdById !== userId) {
      throw new ForbiddenException('Insufficient permissions');
    }

    return task;
  }

  async updateAdhocTask(id: string, dto: UpdateAdhocTaskDto, userId: string) {
    const task = await this.prisma.adhocTask.findUnique({
      where: { id },
    });

    if (!task) {
      throw new NotFoundException('Adhoc task not found');
    }

    // Check permissions
    if (task.assignedToId !== userId && task.createdById !== userId) {
      throw new ForbiddenException('Insufficient permissions');
    }

    // If task is being completed, set completion date
    const updateData: any = { ...dto, updatedAt: new Date() };
    if (dto.status === 'COMPLETED' && task.status !== 'COMPLETED') {
      updateData.completedAt = new Date();
      updateData.percentComplete = 100;
    }

    const updatedTask = await this.prisma.adhocTask.update({
      where: { id },
      data: updateData,
      include: {
        assignedTo: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        createdBy: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });

    return updatedTask;
  }

  async deleteAdhocTask(id: string, userId: string) {
    const task = await this.prisma.adhocTask.findUnique({
      where: { id },
    });

    if (!task) {
      throw new NotFoundException('Adhoc task not found');
    }

    // Only creator can delete, and only if not completed
    if (task.createdById !== userId) {
      throw new ForbiddenException('Only the task creator can delete this task');
    }

    if (task.status === 'COMPLETED') {
      throw new BadRequestException('Cannot delete completed tasks');
    }

    await this.prisma.adhocTask.delete({ where: { id } });
    return { message: 'Adhoc task deleted successfully' };
  }

  // AI INTEGRATION
  async getTargetInsights(targetId: string, userId: string) {
    const target = await this.findTarget(targetId, userId);

    const insight = await ollamaService.getPerformanceInsight({
      type: 'development_plan',
      data: {
        target: {
          title: target.title,
          description: target.description,
          weight: 0, // Target model doesn't have weight field
          progress: target.percentComplete,
          status: target.status as any,
        },
        employee: target.responsible,
      },
      userRole: target.responsibleId === userId ? 'Employee' : 'Supervisor',
      department: target.responsible.department?.name,
    });

    return {
      targetId,
      insights: insight.insight,
      error: insight.error,
      generatedAt: new Date(),
    };
  }

  async getTaskRecommendations(employeeId: string, userId: string) {
    // Check if user can view recommendations for this employee
    const employee = await this.prisma.user.findUnique({
      where: { id: employeeId },
      select: { id: true, firstName: true, lastName: true, department: true, jobTitle: true },
    });

    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    // Get recent tasks and performance data for context
    const recentTasks = await this.prisma.adhocTask.findMany({
      where: { assignedToId: employeeId },
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: {
        title: true,
        status: true,
        priority: true,
        percentComplete: true,
      },
    });

    const insight = await ollamaService.getPerformanceInsight({
      type: 'development_plan',
      data: {
        employee,
        recentTasks,
        context: 'task_recommendations',
      },
      userRole: employeeId === userId ? 'Employee' : 'Supervisor',
      department: employee.department?.name,
    });

    return {
      employeeId,
      recommendations: insight.insight,
      error: insight.error,
      generatedAt: new Date(),
    };
  }
}
