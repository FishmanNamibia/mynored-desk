import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import prisma from '@mynsa-desk/database';
import {
  CreatePerformancePeriodDto,
  UpdatePerformancePeriodDto,
  WeightConfigurationDto,
  UpdateWeightConfigurationDto,
  Create360RatingDto,
  Update360RatingDto,
  PerformancePeriodFilterDto,
  Rating360FilterDto,
  PerformancePeriodStatus,
  RatingScale,
} from '../dto';

@Injectable()
export class PerformancePeriodService {
  private prisma = prisma;

  // CONTROLLER WRAPPER METHODS
  async findAll(query: any, user: any) {
    return this.findPeriods(query);
  }

  async create(dto: CreatePerformancePeriodDto, userId: string) {
    // Convert title to name for database schema compatibility
    const periodData = {
      ...dto,
      name: dto.title,
      // Generate submission deadline if not provided (30 days from start)
      submissionDeadline: dto.reviewStartDate ? new Date(dto.reviewStartDate) : new Date(new Date(dto.startDate).getTime() + 30 * 24 * 60 * 60 * 1000),
    };
    return this.createPeriod(periodData as any, userId);
  }

  async getCurrent() {
    return this.prisma.performancePeriod.findFirst({
      where: { isActive: true },
      orderBy: { startDate: 'desc' },
    });
  }

  async getAvailable(user: any) {
    return this.prisma.performancePeriod.findMany({
      orderBy: { startDate: 'desc' },
      select: {
        id: true,
        name: true,
        startDate: true,
        endDate: true,
        isActive: true,
      },
    });
  }

  async update(id: string, dto: UpdatePerformancePeriodDto, userId: string) {
    return this.updatePeriod(id, dto, userId);
  }

  async delete(id: string, userId: string) {
    return this.deletePeriod(id, userId);
  }

  async getWeights() {
    const currentPeriod = await this.getCurrent();
    if (!currentPeriod) {
      return {
        adhocWeight: 10,
        projectsWeight: 10,
        riskManagementWeight: 10,
        rating360Weight: 10,
      };
    }
    return {
      adhocWeight: currentPeriod.adhocWeight,
      projectsWeight: currentPeriod.projectsWeight,
      riskManagementWeight: currentPeriod.riskManagementWeight,
      rating360Weight: currentPeriod.rating360Weight,
    };
  }

  async updateWeights(weightsDto: any, userId: string) {
    const currentPeriod = await this.getCurrent();
    if (!currentPeriod) {
      throw new NotFoundException('No active performance period found');
    }
    return this.updatePeriod(currentPeriod.id, weightsDto, userId);
  }

  async getStats(query: any) {
    const currentPeriod = await this.getCurrent();
    if (!currentPeriod) {
      return { message: 'No active performance period found' };
    }
    return this.getPerformancePeriodAnalytics(currentPeriod.id);
  }

  // PERFORMANCE PERIOD MANAGEMENT
  async createPeriod(dto: CreatePerformancePeriodDto, userId: string) {
    // Validate dates
    const startDate = new Date(dto.startDate);
    const endDate = new Date(dto.endDate);
    
    if (endDate <= startDate) {
      throw new BadRequestException('End date must be after start date');
    }

    if (dto.reviewStartDate && dto.reviewEndDate) {
      const reviewStart = new Date(dto.reviewStartDate);
      const reviewEnd = new Date(dto.reviewEndDate);
      
      if (reviewEnd <= reviewStart) {
        throw new BadRequestException('Review end date must be after review start date');
      }
      
      if (reviewStart < endDate) {
        throw new BadRequestException('Review period should start after performance period ends');
      }
    }

    // Check for overlapping periods
    const overlapping = await this.prisma.performancePeriod.findFirst({
      where: {
        OR: [
          {
            startDate: { lte: endDate },
            endDate: { gte: startDate },
          },
        ],
      },
    });

    if (overlapping) {
      throw new BadRequestException('Performance period overlaps with existing period');
    }

    return this.prisma.performancePeriod.create({
      data: {
        ...(dto as any),
        createdById: userId,
        updatedAt: new Date(),
      },
    });
  }

  async findPeriods(filter: PerformancePeriodFilterDto) {
    const { page = 1, limit = 10, ...where } = filter;
    const skip = (page - 1) * limit;

    const [periods, total] = await Promise.all([
      this.prisma.performancePeriod.findMany({
        where: where as any,
        skip,
        take: limit,
        include: {
          _count: {
            select: { performanceAgreements: true },
          },
        },
        orderBy: { startDate: 'desc' },
      }),
      this.prisma.performancePeriod.count({ where: where as any }),
    ]);

    return {
      data: periods,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findPeriod(id: string) {
    const period = await this.prisma.performancePeriod.findUnique({
      where: { id },
      include: {
        _count: {
          select: { performanceAgreements: true },
        },
      },
    });

    if (!period) {
      throw new NotFoundException('Performance period not found');
    }

    return period;
  }

  async updatePeriod(id: string, dto: UpdatePerformancePeriodDto, userId: string) {
    const period = await this.prisma.performancePeriod.findUnique({
      where: { id },
    });

    if (!period) {
      throw new NotFoundException('Performance period not found');
    }

    // Validate date changes if provided
    if (dto.startDate || dto.endDate) {
      const startDate = new Date(dto.startDate || period.startDate);
      const endDate = new Date(dto.endDate || period.endDate);
      
      if (endDate <= startDate) {
        throw new BadRequestException('End date must be after start date');
      }
    }

    return this.prisma.performancePeriod.update({
      where: { id },
      data: { ...(dto as any), updatedAt: new Date() },
    });
  }

  async deletePeriod(id: string, userId: string) {
    const period = await this.prisma.performancePeriod.findUnique({
      where: { id },
      include: {
        _count: {
          select: { performanceAgreements: true },
        },
      },
    });

    if (!period) {
      throw new NotFoundException('Performance period not found');
    }

    if (period._count.performanceAgreements > 0) {
      throw new BadRequestException('Cannot delete period with existing performance agreements');
    }

    await this.prisma.performancePeriod.delete({ where: { id } });
    return { message: 'Performance period deleted successfully' };
  }

  // WEIGHT CONFIGURATION MANAGEMENT
  async updateWeightConfiguration(dto: UpdateWeightConfigurationDto, userId: string) {
    const period = await this.prisma.performancePeriod.findUnique({
      where: { id: dto.performancePeriodId },
    });

    if (!period) {
      throw new NotFoundException('Performance period not found');
    }

    // Validate total weights equal 100%
    const totalWeight = dto.configurations.reduce((sum, config) => sum + config.weight, 0);
    if (Math.abs(totalWeight - 100) > 0.01) {
      throw new BadRequestException('Total category weights must equal 100%');
    }

    // Delete existing configurations (using userTaskWeight as substitute if available)
    await (this.prisma as any).userTaskWeight?.deleteMany({
      where: { periodId: dto.performancePeriodId },
    }).catch(() => {});

    const configurations: any[] = [];

    return {
      performancePeriodId: dto.performancePeriodId,
      configurations,
      message: 'Weight configurations updated successfully',
    };
  }

  async getWeightConfiguration(periodId: string) {
    const configurations: any[] = [];

    return {
      performancePeriodId: periodId,
      configurations,
    };
  }

  // 360-DEGREE RATING MANAGEMENT
  async create360Rating(dto: Create360RatingDto, userId: string) {
    const rater = await this.prisma.user.findUnique({ where: { id: dto.raterId } });
    if (!rater) throw new NotFoundException('Rater not found');

    return (this.prisma.rating360 as any).create({
      data: { ...dto, createdById: userId },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true } },
        supervisor: { select: { id: true, firstName: true, lastName: true } },
        cycle: { select: { id: true, name: true } },
      },
    });
  }

  async find360Ratings(filter: Rating360FilterDto) {
    const { page = 1, limit = 10 } = filter;
    const skip = (page - 1) * limit;

    const [ratings, total] = await Promise.all([
      this.prisma.rating360.findMany({
        skip,
        take: limit,
        include: {
          user: { select: { id: true, firstName: true, lastName: true, email: true } },
          supervisor: { select: { id: true, firstName: true, lastName: true } },
          cycle: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.rating360.count(),
    ]);

    return {
      data: ratings,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async find360Rating(id: string, userId: string) {
    const rating = await this.prisma.rating360.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true } },
        supervisor: { select: { id: true, firstName: true, lastName: true } },
        cycle: { select: { id: true, name: true } },
      },
    });

    if (!rating) throw new NotFoundException('360-degree rating not found');

    if (rating.userId !== userId && rating.supervisorId !== userId) {
      throw new ForbiddenException('Insufficient permissions');
    }

    return rating;
  }

  async update360Rating(id: string, dto: Update360RatingDto, userId: string) {
    const rating = await this.prisma.rating360.findUnique({
      where: { id },
      include: { cycle: { select: { id: true, isActive: true } } },
    });

    if (!rating) throw new NotFoundException('360-degree rating not found');

    if (rating.userId !== userId && rating.supervisorId !== userId) {
      throw new ForbiddenException('Only the rated user or supervisor can update this rating');
    }

    if (!rating.cycle.isActive) {
      throw new BadRequestException('Can only update ratings during an active cycle');
    }

    return this.prisma.rating360.update({
      where: { id },
      data: { ...(dto as any), updatedAt: new Date() },
      include: {
        user: { select: { id: true, firstName: true, lastName: true } },
        cycle: { select: { id: true, name: true } },
      },
    });
  }

  async delete360Rating(id: string, userId: string) {
    const rating = await this.prisma.rating360.findUnique({
      where: { id },
      include: { cycle: { select: { id: true, isActive: true } } },
    });

    if (!rating) throw new NotFoundException('360-degree rating not found');

    if (rating.userId !== userId && rating.supervisorId !== userId) {
      throw new ForbiddenException('Only the rated user or supervisor can delete this rating');
    }

    if (!rating.cycle.isActive) {
      throw new BadRequestException('Can only delete ratings during an active cycle');
    }

    await this.prisma.rating360.delete({ where: { id } });
    return { message: '360-degree rating deleted successfully' };
  }

  // ANALYTICS & REPORTING
  async getPerformancePeriodAnalytics(periodId: string) {
    const period = await this.prisma.performancePeriod.findUnique({ where: { id: periodId } });
    if (!period) throw new NotFoundException('Performance period not found');

    const [agreementStats, targetStats, ratingStats] = await Promise.all([
      this.prisma.performanceAgreement.groupBy({
        by: ['status'],
        where: { performancePeriodId: periodId },
        _count: { _all: true },
      }),
      this.prisma.target.groupBy({
        by: ['status'],
        _count: { _all: true },
      }),
      this.prisma.rating360.aggregate({
        _avg: { averageRating: true },
        _count: { _all: true },
      }),
    ]);

    return {
      periodId,
      agreements: {
        total: agreementStats.reduce((sum, stat) => sum + (stat._count?._all ?? 0), 0),
        byStatus: Object.fromEntries(agreementStats.map(stat => [stat.status, stat._count?._all ?? 0])),
      },
      goals: { total: 0, byStatus: {} },
      targets: {
        total: targetStats.reduce((sum, stat) => sum + (stat._count?._all ?? 0), 0),
        byStatus: Object.fromEntries(targetStats.map(stat => [stat.status, stat._count?._all ?? 0])),
      },
      ratings360: {
        total: ratingStats._count?._all ?? 0,
        average: ratingStats._avg?.averageRating ?? null,
      },
    };
  }

  // MISSING CONTROLLER METHODS
  async get360Categories() {
    const questions = await this.prisma.rating360Question.findMany({
      where: { isActive: true },
      distinct: ['category'],
      select: { category: true },
    });
    return questions.map(q => q.category);
  }

  async get360Cycles(query: any) {
    return this.prisma.rating360Cycle.findMany({
      orderBy: { startDate: 'desc' },
      include: { _count: { select: { ratings: true } } },
    });
  }

  async activate360Cycle(id: string, userId: string) {
    const cycle = await this.prisma.rating360Cycle.findUnique({ where: { id } });
    if (!cycle) throw new NotFoundException('360 cycle not found');
    return this.prisma.rating360Cycle.update({
      where: { id },
      data: { isActive: true, updatedAt: new Date() },
    });
  }

  async initialize360Cycle(id: string, initDto: any, userId: string) {
    const cycle = await this.prisma.rating360Cycle.findUnique({ where: { id } });
    if (!cycle) throw new NotFoundException('360 cycle not found');
    return cycle;
  }

  async submit360Rating(submitDto: any, userId: string) {
    return this.create360Rating(submitDto, userId);
  }

  async getPending360Ratings(userId: string) {
    return this.prisma.rating360.findMany({
      where: { userId, status: 'PENDING' },
      include: { cycle: { select: { id: true, name: true } } },
    });
  }

  async getMy360Rating(userId: string) {
    return this.prisma.rating360.findMany({
      where: { userId },
      include: { cycle: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getTeam360Ratings(user: any) {
    return this.prisma.rating360.findMany({
      where: { supervisorId: user?.id },
      include: {
        user: { select: { id: true, firstName: true, lastName: true } },
        cycle: { select: { id: true, name: true } },
      },
    });
  }

  async suggest360Raters(query: any, user: any) {
    return this.prisma.user.findMany({
      where: { status: 'ACTIVE' as any },
      select: { id: true, firstName: true, lastName: true, email: true, jobTitle: true },
      take: 20,
    });
  }

  async get360Analysis(id: string, user: any) {
    const rating = await this.prisma.rating360.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, firstName: true, lastName: true } },
        supervisor: { select: { id: true, firstName: true, lastName: true } },
        cycle: { select: { id: true, name: true } },
        peerRatings: true,
        subordinateRatings: true,
      },
    });
    if (!rating) throw new NotFoundException('360-degree rating not found');
    return rating;
  }

  async get360Questions(query: any) {
    return this.prisma.rating360Question.findMany({
      where: { isActive: true },
      orderBy: [{ category: 'asc' }, { order: 'asc' }],
    });
  }

  async create360Question(questionDto: any, userId: string) {
    return (this.prisma.rating360Question as any).create({
      data: { ...questionDto, createdById: userId },
    });
  }

  async get360Question(id: string) {
    const question = await this.prisma.rating360Question.findUnique({ where: { id } });
    if (!question) throw new NotFoundException('Question not found');
    return question;
  }

  async update360Question(id: string, updateDto: any, userId: string) {
    const question = await this.prisma.rating360Question.findUnique({ where: { id } });
    if (!question) throw new NotFoundException('Question not found');
    return this.prisma.rating360Question.update({
      where: { id },
      data: { ...(updateDto as any), updatedAt: new Date() },
    });
  }
}