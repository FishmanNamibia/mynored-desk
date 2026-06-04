import { Controller, Get, Post, Body, Param, Query, UseGuards, Req, Patch } from '@nestjs/common';
import { DashboardService } from '../services/dashboard.service';
import { SessionGuard } from '../../auth/guards/session.guard';

@Controller('dashboard')
@UseGuards(SessionGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('stats')
  async getStats(@Query() query: any, @Req() req: any) {
    return this.dashboardService.getStats(query, req.user);
  }

  @Get('leaderboard')
  async getLeaderboard(@Query() query: any, @Req() req: any) {
    return this.dashboardService.getLeaderboard(query, req.user);
  }

  @Get('tasks')
  async getTasks(@Query() query: any, @Req() req: any) {
    return this.dashboardService.getTasks(query, req.user);
  }

  @Get('users-activity')
  async getUsersActivity(@Query() query: any, @Req() req: any) {
    return this.dashboardService.getUsersActivity(query, req.user);
  }

  @Get('individual-actions')
  async getIndividualActions(@Query() query: any, @Req() req: any) {
    return this.dashboardService.getIndividualActions(query, req.user);
  }

  @Get('level-stats')
  async getLevelStats(@Query() query: any, @Req() req: any) {
    return this.dashboardService.getLevelStats(query, req.user);
  }

  @Get('level-tasks')
  async getLevelTasks(@Query() query: any, @Req() req: any) {
    return this.dashboardService.getLevelTasks(query, req.user);
  }
}

@Controller('reports')
@UseGuards(SessionGuard)
export class ReportsController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('export')
  async export(@Query() query: any, @Req() req: any) {
    return this.dashboardService.exportReports(query, req.user);
  }
}

@Controller('audit-logs')
@UseGuards(SessionGuard)
export class AuditLogsController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get()
  async findAll(@Query() query: any, @Req() req: any) {
    return this.dashboardService.getAuditLogs(query, req.user);
  }

  @Post(':id/undo')
  async undo(@Param('id') id: string, @Req() req: any) {
    return this.dashboardService.undoAction(id, req.user.id);
  }
}

@Controller('notifications')
@UseGuards(SessionGuard)
export class NotificationsController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get()
  async findAll(@Query() query: any, @Req() req: any) {
    return this.dashboardService.getNotifications(query, req.user);
  }

  @Get('count')
  async getCount(@Req() req: any) {
    return this.dashboardService.getNotificationCount(req.user.id);
  }

  @Patch(':id')
  async markAsRead(@Param('id') id: string, @Req() req: any) {
    return this.dashboardService.markNotificationAsRead(id, req.user.id);
  }

  @Get('performance-reminders')
  async getPerformanceReminders(@Req() req: any) {
    return this.dashboardService.getPerformanceReminders(req.user.id);
  }
}