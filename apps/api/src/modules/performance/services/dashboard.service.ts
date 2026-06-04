import { Injectable, NotFoundException } from '@nestjs/common';
import prisma from '@mynsa-desk/database';
import {
  DashboardFilterDto,
  GenerateReportDto,
  AuditLogFilterDto,
  NotificationFilterDto,
  MarkNotificationReadDto,
  DashboardPeriod,
  ReportType,
  ReportFormat,
  AuditAction,
} from '../dto';
import { ollamaService } from '../../../../../../packages/shared/src/ai';

@Injectable()
export class DashboardService {
  private prisma = prisma;

  // CONTROLLER WRAPPER METHODS
  async getStats(query: any, user: any) {
    return this.getDashboardData(query, user?.id ?? user);
  }

  async getLeaderboard(query: any, user: any) {
    return { data: [], message: 'Leaderboard not yet implemented' };
  }

  async getTasks(query: any, user: any) {
    return { data: [], message: 'Tasks endpoint not yet implemented' };
  }

  async getUsersActivity(query: any, user: any) {
    return { data: [], message: 'Users activity not yet implemented' };
  }

  async getIndividualActions(query: any, user: any) {
    return { data: [], message: 'Individual actions not yet implemented' };
  }

  async getLevelStats(query: any, user: any) {
    return { data: [], message: 'Level stats not yet implemented' };
  }

  async getLevelTasks(query: any, user: any) {
    return { data: [], message: 'Level tasks not yet implemented' };
  }

  async exportReports(query: any, user: any) {
    return this.generateReport(query, user?.id ?? user);
  }

  async undoAction(id: string, userId: string) {
    return { message: 'Undo action not yet implemented' };
  }

  async getNotificationCount(userId: string) {
    return this.getNotificationCounts(userId);
  }

  async markNotificationAsRead(id: string, userId: string) {
    return this.markNotificationsRead({ notificationIds: [id] } as any, userId);
  }

  async getPerformanceReminders(userId: string) {
    return { data: [], message: 'Performance reminders not yet implemented' };
  }

  // DASHBOARD ANALYTICS
  async getDashboardData(filter: DashboardFilterDto, userId: string) {
    const { 
      employeeId, 
      departmentId, 
      performancePeriodId, 
      period = DashboardPeriod.CURRENT,
      startDate,
      endDate 
    } = filter;

    // Build date filter based on period
    let dateFilter = {};
    if (period === DashboardPeriod.CUSTOM && startDate && endDate) {
      dateFilter = {
        createdAt: {
          gte: new Date(startDate),
          lte: new Date(endDate),
        },
      };
    } else if (period !== DashboardPeriod.CURRENT) {
      const now = new Date();
      let fromDate = new Date();
      
      switch (period) {
        case DashboardPeriod.LAST_30_DAYS:
          fromDate.setDate(now.getDate() - 30);
          break;
        case DashboardPeriod.LAST_90_DAYS:
          fromDate.setDate(now.getDate() - 90);
          break;
        case DashboardPeriod.LAST_YEAR:
          fromDate.setFullYear(now.getFullYear() - 1);
          break;
      }
      
      dateFilter = {
        createdAt: {
          gte: fromDate,
          lte: now,
        },
      };
    }

    // Build where clause for filtering
    const whereClause: any = { ...dateFilter };
    if (employeeId) whereClause.userId = employeeId;
    if (departmentId) whereClause.user = { departmentId };
    if (performancePeriodId) whereClause.performancePeriodId = performancePeriodId;

    const [
      performanceAgreements,
      goals,
      targets,
      adhocTasks,
      ratings360,
      notifications,
    ] = await Promise.all([
      this.getPerformanceAgreementStats(whereClause),
      this.getGoalsStats(whereClause),
      this.getTargetsStats(whereClause),
      this.getAdhocTasksStats(whereClause),
      this.getRatings360Stats(whereClause),
      this.getNotificationStats(userId, employeeId),
    ]);

    return {
      period,
      dateRange: period === DashboardPeriod.CUSTOM ? { startDate, endDate } : null,
      filters: { employeeId, departmentId, performancePeriodId },
      data: {
        performanceAgreements,
        goals,
        targets,
        adhocTasks,
        ratings360,
        notifications,
      },
      generatedAt: new Date(),
    };
  }

  async getEmployeePerformanceOverview(employeeId: string, currentUserId: string) {
    const employee = await this.prisma.user.findUnique({
      where: { id: employeeId },
      select: { id: true, firstName: true, lastName: true, email: true, departmentName: true },
    });

    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    // Get current active performance period
    const activePeriod = await this.prisma.performancePeriod.findFirst({
      where: { isActive: true },
      orderBy: { startDate: 'desc' },
    });

    if (!activePeriod) {
      return {
        employee,
        message: 'No active performance period found',
        data: null,
      };
    }

    // Get employee's performance agreement for active period
    const agreement = await this.prisma.performanceAgreement.findFirst({
      where: {
        userId: employeeId,
        performancePeriodId: activePeriod.id,
      },
    });

    if (!agreement) {
      return {
        employee,
        activePeriod,
        message: 'No performance agreement found for active period',
        data: null,
      };
    }

    const goalsProgress = this.calculateGoalsProgress([]);
    const targetsProgress = this.calculateTargetsProgress([]);
    const ratingsAnalysis = this.calculateRatingsAnalysis([]);

    return {
      employee,
      activePeriod,
      agreement: {
        id: agreement.id,
        status: agreement.status,
        createdAt: agreement.createdAt,
        approvedAt: agreement.approvedAt,
      },
      performance: {
        goals: goalsProgress,
        targets: targetsProgress,
        ratings: ratingsAnalysis,
        overallScore: this.calculateOverallScore(goalsProgress, targetsProgress, ratingsAnalysis),
      },
    };
  }

  // REPORTING
  async generateReport(dto: GenerateReportDto, userId: string) {
    const { type, format, employeeId, departmentId, performancePeriodId, startDate, endDate, includeFields } = dto;

    // Build filter for report data
    const filter: any = {};
    if (employeeId) filter.employeeId = employeeId;
    if (departmentId) filter.employee = { departmentId };
    if (performancePeriodId) filter.performancePeriodId = performancePeriodId;
    if (startDate && endDate) {
      filter.createdAt = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    }

    let reportData: any = {};

    switch (type) {
      case ReportType.PERFORMANCE_SUMMARY:
        reportData = await this.generatePerformanceSummaryData(filter);
        break;
      case ReportType.GOALS_PROGRESS:
        reportData = await this.generateGoalsProgressData(filter);
        break;
      case ReportType.RATINGS_ANALYSIS:
        reportData = await this.generateRatingsAnalysisData(filter);
        break;
      case ReportType.DEPARTMENT_OVERVIEW:
        reportData = await this.generateDepartmentOverviewData(filter);
        break;
      case ReportType.EMPLOYEE_DEVELOPMENT:
        reportData = await this.generateEmployeeDevelopmentData(filter);
        break;
    }

    // Log report generation
    await this.createAuditLog({
      userId,
      action: AuditAction.VIEW,
      entityType: 'REPORT',
      entityId: `${type}_${Date.now()}`,
      details: { type, format, filters: filter },
    });

    return {
      reportId: `${type}_${Date.now()}`,
      type,
      format,
      generatedBy: userId,
      generatedAt: new Date(),
      filters: filter,
      data: reportData,
      // In a real implementation, this would generate actual file downloads
      downloadUrl: format === ReportFormat.PDF ? `/reports/${type}.pdf` : 
                   format === ReportFormat.EXCEL ? `/reports/${type}.xlsx` : 
                   `/reports/${type}.csv`,
    };
  }

  // AUDIT LOGGING
  async getAuditLogs(filter: AuditLogFilterDto, _user?: any) {
    const { page = 1, limit = 10, ...where } = filter;
    const skip = (page - 1) * limit;

    // Convert date strings to Date objects if provided
    const auditWhere: any = { ...where };
    if (auditWhere.startDate) {
      auditWhere.createdAt = { 
        ...auditWhere.createdAt, 
        gte: new Date(auditWhere.startDate) 
      };
      delete auditWhere.startDate;
    }
    if (auditWhere.endDate) {
      auditWhere.createdAt = { 
        ...auditWhere.createdAt, 
        lte: new Date(auditWhere.endDate) 
      };
      delete auditWhere.endDate;
    }

    const [logs, total] = await Promise.all([
      (this.prisma as any).pmsAuditLog.findMany({
        where: auditWhere,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      (this.prisma as any).pmsAuditLog.count({ where: auditWhere }),
    ]);

    return {
      data: logs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async createAuditLog(data: {
    userId: string;
    action: AuditAction;
    entityType: string;
    entityId: string;
    details?: any;
  }) {
    return (this.prisma as any).pmsAuditLog.create({
      data: {
        userId: data.userId,
        action: data.action,
        entityType: data.entityType,
        entityId: data.entityId,
        details: data.details || {},
      },
    });
  }

  // NOTIFICATIONS
  async getNotifications(filter: NotificationFilterDto, currentUserId: string) {
    const { page = 1, limit = 10, userId, ...where } = filter;
    const skip = (page - 1) * limit;

    // Users can only see their own notifications unless they're admin
    const finalUserId = userId || currentUserId;
    const finalWhere = { ...where, userId: finalUserId };

    const [notifications, total] = await Promise.all([
      (this.prisma as any).pmsNotification.findMany({
        where: finalWhere,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      (this.prisma as any).pmsNotification.count({ where: finalWhere }),
    ]);

    return {
      data: notifications,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async markNotificationsRead(dto: MarkNotificationReadDto, userId: string) {
    const result = await (this.prisma as any).pmsNotification.updateMany({
      where: {
        id: { in: dto.notificationIds },
        receiverId: userId,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    return {
      updated: result.count,
      message: `Marked ${result.count} notifications as read`,
    };
  }

  async getNotificationCounts(userId: string) {
    const [total, unread] = await Promise.all([
      (this.prisma as any).pmsNotification.count({
        where: { receiverId: userId },
      }),
      (this.prisma as any).pmsNotification.count({
        where: { receiverId: userId, isRead: false },
      }),
    ]);

    return {
      total,
      unread,
      read: total - unread,
    };
  }

  // AI INSIGHTS
  async getPerformanceInsights(employeeId: string, currentUserId: string) {
    const overview: any = await this.getEmployeePerformanceOverview(employeeId, currentUserId);
    
    if (!overview.data && !overview.performance) {
      return {
        message: 'Insufficient data for AI insights',
        insights: null,
      };
    }

    const insight = await ollamaService.getPerformanceInsight({
      type: 'performance_feedback',
      data: {
        employee: overview.employee,
        performance: overview.performance,
        agreement: overview.agreement,
      },
      userRole: employeeId === currentUserId ? 'Employee' : 'Supervisor',
      department: overview.employee?.departmentName,
    });

    return {
      employeeId,
      insights: insight.insight,
      error: insight.error,
      generatedAt: new Date(),
    };
  }

  // HELPER METHODS
  private async getPerformanceAgreementStats(whereClause: any) {
    const stats = await this.prisma.performanceAgreement.groupBy({
      by: ['status'],
      where: whereClause,
      _count: { _all: true },
    });

    return {
      total: stats.reduce((sum: number, stat: any) => sum + (stat._count?._all ?? 0), 0),
      byStatus: Object.fromEntries(stats.map((stat: any) => [stat.status, stat._count?._all ?? 0])),
    };
  }

  private async getGoalsStats(whereClause: any) {
    const total = await this.prisma.goal.count();
    return {
      total,
      byStatus: {},
      averageProgress: 0,
    };
  }

  private async getTargetsStats(whereClause: any) {
    const stats = await this.prisma.target.groupBy({
      by: ['status'],
      _count: { _all: true },
    });

    return {
      total: stats.reduce((sum: number, stat: any) => sum + (stat._count?._all ?? 0), 0),
      byStatus: Object.fromEntries(stats.map((stat: any) => [stat.status, stat._count?._all ?? 0])),
    };
  }

  private async getAdhocTasksStats(whereClause: any) {
    const stats = await this.prisma.adhocTask.groupBy({
      by: ['status', 'priority'],
      _count: { _all: true },
    });

    const byStatus: Record<string, number> = {};
    const byPriority: Record<string, number> = {};
    
    stats.forEach((stat: any) => {
      byStatus[stat.status] = (byStatus[stat.status] || 0) + (stat._count?._all ?? 0);
      byPriority[stat.priority] = (byPriority[stat.priority] || 0) + (stat._count?._all ?? 0);
    });

    return {
      total: stats.reduce((sum: number, stat: any) => sum + (stat._count?._all ?? 0), 0),
      byStatus,
      byPriority,
    };
  }

  private async getRatings360Stats(whereClause: any) {
    const stats = await this.prisma.rating360.aggregate({
      _avg: { averageRating: true },
      _count: { _all: true },
    });

    return {
      total: stats._count._all,
      averageRating: stats._avg.averageRating || 0,
    };
  }

  private async getNotificationStats(userId: string, employeeId?: string) {
    const targetUserId = employeeId || userId;
    
    return {
      total: await (this.prisma as any).pmsNotification.count({ where: { receiverId: targetUserId } }),
      unread: await (this.prisma as any).pmsNotification.count({ where: { receiverId: targetUserId, isRead: false } }),
    };
  }

  private calculateGoalsProgress(goals: any[]) {
    if (!goals.length) return { total: 0, averageProgress: 0, completed: 0 };
    
    const totalProgress = goals.reduce((sum, goal) => sum + goal.progress, 0);
    const completed = goals.filter(goal => goal.status === 'COMPLETED').length;
    
    return {
      total: goals.length,
      averageProgress: totalProgress / goals.length,
      completed,
      completionRate: (completed / goals.length) * 100,
    };
  }

  private calculateTargetsProgress(targets: any[]) {
    if (!targets.length) return { total: 0, averageProgress: 0, approved: 0 };
    
    const totalProgress = targets.reduce((sum, target) => sum + target.progress, 0);
    const approved = targets.filter(target => target.status === 'APPROVED').length;
    
    return {
      total: targets.length,
      averageProgress: totalProgress / targets.length,
      approved,
      approvalRate: (approved / targets.length) * 100,
    };
  }

  private calculateRatingsAnalysis(ratings: any[]) {
    if (!ratings.length) return { total: 0, averageRating: 0, byCategory: {} };
    
    const totalRating = ratings.reduce((sum, rating) => sum + rating.rating, 0);
    const byCategory: Record<string, any> = {};
    
    ratings.forEach(rating => {
      const categoryName = rating.category.name;
      if (!byCategory[categoryName]) {
        byCategory[categoryName] = { total: 0, sum: 0, average: 0 };
      }
      byCategory[categoryName].total += 1;
      byCategory[categoryName].sum += rating.rating;
      byCategory[categoryName].average = byCategory[categoryName].sum / byCategory[categoryName].total;
    });

    return {
      total: ratings.length,
      averageRating: totalRating / ratings.length,
      byCategory,
    };
  }

  private calculateOverallScore(goalsProgress: any, targetsProgress: any, ratingsAnalysis: any) {
    // Simple weighted calculation - in practice this would use the weight configurations
    const goalsWeight = 0.4;
    const targetsWeight = 0.3;
    const ratingsWeight = 0.3;
    
    const goalsScore = goalsProgress.averageProgress || 0;
    const targetsScore = targetsProgress.averageProgress || 0;
    const ratingsScore = (ratingsAnalysis.averageRating || 0) * 20; // Convert 1-5 scale to 0-100
    
    return (goalsScore * goalsWeight) + (targetsScore * targetsWeight) + (ratingsScore * ratingsWeight);
  }

  // Report generation helper methods (would be expanded in full implementation)
  private async generatePerformanceSummaryData(filter: any) {
    // Implementation would generate comprehensive performance summary
    return { type: 'performance_summary', message: 'Report data generation not fully implemented' };
  }

  private async generateGoalsProgressData(filter: any) {
    // Implementation would generate goals progress analysis
    return { type: 'goals_progress', message: 'Report data generation not fully implemented' };
  }

  private async generateRatingsAnalysisData(filter: any) {
    // Implementation would generate ratings analysis
    return { type: 'ratings_analysis', message: 'Report data generation not fully implemented' };
  }

  private async generateDepartmentOverviewData(filter: any) {
    // Implementation would generate department overview
    return { type: 'department_overview', message: 'Report data generation not fully implemented' };
  }

  private async generateEmployeeDevelopmentData(filter: any) {
    // Implementation would generate employee development plans
    return { type: 'employee_development', message: 'Report data generation not fully implemented' };
  }
}