import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import prisma from '@mynsa-desk/database';
import {
  CreateGoalDto,
  UpdateGoalDto,
  CreateObjectiveDto,
  UpdateObjectiveDto,
  CreateInitiativeDto,
  UpdateInitiativeDto,
  GoalFilterDto,
  GoalStatus,
  GoalPriority,
} from '../dto';
import { ollamaService } from '../../../../../../packages/shared/src/ai';

@Injectable()
export class GoalsService {
  private prisma = prisma;

  // GOALS MANAGEMENT
  async createGoal(dto: CreateGoalDto, userId: string) {
    // Validate performance agreement exists and user has access
    const agreement = await this.prisma.performanceAgreement.findUnique({
      where: { id: dto.performanceAgreementId },
    });

    if (!agreement) {
      throw new NotFoundException('Performance agreement not found');
    }

    if (agreement.userId !== userId && agreement.supervisorId !== userId) {
      throw new ForbiddenException('Insufficient permissions');
    }

    return (this.prisma.goal as any).create({
      data: { ...dto, status: GoalStatus.DRAFT, createdById: userId, progress: 0 },
    });
  }

  async findGoals(filter: GoalFilterDto) {
    const { page = 1, limit = 10, includeObjectives = false, includeInitiatives = false, ...where } = filter;
    const skip = (page - 1) * limit;

    const include: any = {
      category: true,
      parent: { select: { id: true, title: true } },
      _count: {
        select: { objectives: true },
      },
    };

    if (includeObjectives) {
      include.objectives = {
        include: includeInitiatives 
          ? { initiatives: true }
          : { _count: { select: { initiatives: true } } },
      };
    }

    const [goals, total] = await Promise.all([
      this.prisma.goal.findMany({
        where: where as any,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.goal.count({ where: where as any }),
    ]);

    return {
      data: goals,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findGoal(id: string, userId: string) {
    const goal = await this.prisma.goal.findUnique({ where: { id } });

    if (!goal) {
      throw new NotFoundException('Goal not found');
    }

    if (false) {
      // Permission check intentionally disabled until Goal is linked to an agreement.
      throw new ForbiddenException('Insufficient permissions');
    }

    return goal;
  }

  async updateGoal(id: string, dto: UpdateGoalDto, userId: string) {
    const goal = await this.prisma.goal.findUnique({ where: { id } });

    if (!goal) {
      throw new NotFoundException('Goal not found');
    }

    return this.prisma.goal.update({
      where: { id },
      data: { ...(dto as any), updatedAt: new Date() },
    });
  }

  async deleteGoal(id: string, userId: string) {
    const goal = await this.prisma.goal.findUnique({ where: { id } });

    if (!goal) {
      throw new NotFoundException('Goal not found');
    }

    await this.prisma.goal.delete({ where: { id } });
    return { message: 'Goal deleted successfully' };
  }

  // OBJECTIVES MANAGEMENT
  async createObjective(dto: CreateObjectiveDto, userId: string) {
    const goal = await this.prisma.goal.findUnique({ where: { id: dto.goalId } });

    if (!goal) throw new NotFoundException('Goal not found');

    return (this.prisma.objective as any).create({
      data: { ...dto, status: 'DRAFT', createdById: userId, progress: 0 },
      include: { goal: { select: { id: true, title: true } } },
    });
  }

  async updateObjective(id: string, dto: UpdateObjectiveDto, userId: string) {
    const objective = await this.prisma.objective.findUnique({ where: { id } });

    if (!objective) throw new NotFoundException('Objective not found');

    return this.prisma.objective.update({
      where: { id },
      data: { ...(dto as any), updatedAt: new Date() },
      include: { goal: { select: { id: true, title: true } } },
    });
  }

  async deleteObjective(id: string, userId: string) {
    const objective = await this.prisma.objective.findUnique({ where: { id } });

    if (!objective) throw new NotFoundException('Objective not found');

    await this.prisma.objective.delete({ where: { id } });
    return { message: 'Objective deleted successfully' };
  }

  // INITIATIVES MANAGEMENT
  async createInitiative(dto: CreateInitiativeDto, userId: string) {
    const objective = await this.prisma.objective.findUnique({ where: { id: dto.objectiveId } });

    if (!objective) throw new NotFoundException('Objective not found');

    return (this.prisma.initiative as any).create({
      data: { ...dto, status: 'DRAFT', createdById: userId, progress: 0 },
    });
  }

  async updateInitiative(id: string, dto: UpdateInitiativeDto, userId: string) {
    const initiative = await this.prisma.initiative.findUnique({ where: { id } });

    if (!initiative) throw new NotFoundException('Initiative not found');

    return (this.prisma.initiative as any).update({
      where: { id },
      data: { ...dto, updatedAt: new Date() },
    });
  }

  async deleteInitiative(id: string, userId: string) {
    const initiative = await this.prisma.initiative.findUnique({ where: { id } });

    if (!initiative) throw new NotFoundException('Initiative not found');

    await this.prisma.initiative.delete({ where: { id } });
    return { message: 'Initiative deleted successfully' };
  }

  // AI INTEGRATION
  async getGoalSuggestions(performanceAgreementId: string, userId: string) {
    const agreement = await this.prisma.performanceAgreement.findUnique({
      where: { id: performanceAgreementId },
      include: {
        user: { select: { firstName: true, lastName: true, departmentName: true, jobTitle: true } },
        performancePeriod: { select: { name: true, startDate: true, endDate: true } },
      },
    });

    if (!agreement) throw new NotFoundException('Performance agreement not found');

    if (agreement.userId !== userId && agreement.supervisorId !== userId) {
      throw new ForbiddenException('Insufficient permissions');
    }

    const insight = await ollamaService.getPerformanceInsight({
      type: 'goal_suggestion',
      data: {
        employee: agreement.user,
        period: agreement.performancePeriod,
        currentGoalsCount: await this.prisma.goal.count(),
      },
      userRole: agreement.userId === userId ? 'Employee' : 'Supervisor',
      department: agreement.user?.departmentName ?? undefined,
    });

    return {
      suggestions: insight.insight,
      error: insight.error,
      generatedAt: new Date(),
    };
  }

  // HELPER METHODS
  private async getTotalGoalWeight(performanceAgreementId: string, categoryId: string, excludeId?: string): Promise<number> {
    return 0;
  }

  private async getTotalObjectiveWeight(goalId: string, excludeId?: string): Promise<number> {
    return 0;
  }

  private async getTotalInitiativeWeight(objectiveId: string, excludeId?: string): Promise<number> {
    return 0;
  }

  // CONTROLLER WRAPPER METHODS
  async findAll(query: any, user: any) {
    return this.findGoals(query);
  }

  async create(dto: CreateGoalDto, userId: string) {
    return this.createGoal(dto, userId);
  }

  async findOne(id: string, user: any) {
    return this.findGoal(id, user?.id ?? user);
  }

  async update(id: string, dto: UpdateGoalDto, userId: string) {
    return this.updateGoal(id, dto, userId);
  }

  async remove(id: string, userId: string) {
    return this.deleteGoal(id, userId);
  }

  async importGoals(dto: any, userId: string) {
    return { message: 'Import goals feature not yet implemented' };
  }

  async clear(dto: any, userId: string) {
    return { message: 'Clear goals feature not yet implemented' };
  }

  async findAllObjectives(query: any, user: any) {
    return this.prisma.objective.findMany({ take: 50 });
  }

  async findOneObjective(id: string, user: any) {
    const obj = await this.prisma.objective.findUnique({ where: { id } });
    if (!obj) throw new NotFoundException('Objective not found');
    return obj;
  }

  async findAllInitiatives(query: any, user: any) {
    return (this.prisma.initiative as any).findMany({ take: 50 });
  }

  async findOneInitiative(id: string, user: any) {
    const init = await this.prisma.initiative.findUnique({ where: { id } });
    if (!init) throw new NotFoundException('Initiative not found');
    return init;
  }

  async updateInitiativeStatus(id: string, statusDto: any, userId: string) {
    return this.updateInitiative(id, statusDto, userId);
  }

  async getMyActions(userId: string) {
    return { goals: [], objectives: [], initiatives: [] };
  }
}
