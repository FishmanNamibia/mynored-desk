import { Controller, Get, Post, Body, Param, Query, UseGuards, Req, Patch, Delete } from '@nestjs/common';
import { PerformanceAgreementService } from '../services/performance-agreement.service';
import { SessionGuard } from '../../auth/guards/session.guard';
import { CreatePerformanceAgreementDto, UpdatePerformanceAgreementDto } from '../dto/performance-agreement.dto';

@Controller('performance-agreements')
@UseGuards(SessionGuard)
export class PerformanceAgreementController {
  constructor(private readonly performanceAgreementService: PerformanceAgreementService) {}

  @Post()
  async create(@Body() createDto: CreatePerformanceAgreementDto, @Req() req: any) {
    return this.performanceAgreementService.create(createDto, req.user.id);
  }

  @Get()
  async findAll(@Query() query: any, @Req() req: any) {
    return this.performanceAgreementService.findAll(query);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Req() req: any) {
    return this.performanceAgreementService.findOne(id);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() updateDto: UpdatePerformanceAgreementDto, @Req() req: any) {
    return this.performanceAgreementService.update(id, updateDto, req.user.id);
  }

  @Post(':id/submit')
  async submit(@Param('id') id: string, @Req() req: any) {
    return this.performanceAgreementService.submit(id, req.user.id);
  }

  // Temporarily disabled methods - to be implemented later
  /*
  @Post('submit-all')
  async submitAll(@Req() req: any) {
    return this.performanceAgreementService.submitAll(req.user.id);
  }

  @Get('my-rate')
  async getMyRate(@Req() req: any) {
    return this.performanceAgreementService.getMyRate(req.user.id);
  }

  @Post('approve')
  async approve(@Body() approveDto: any, @Req() req: any) {
    return this.performanceAgreementService.approve(approveDto, req.user.id);
  }

  @Get('pending-approval')
  async getPendingApproval(@Req() req: any) {
    return this.performanceAgreementService.getPendingApproval(req.user);
  }

  @Get('completion-stats')
  async getCompletionStats(@Query() query: any) {
    return this.performanceAgreementService.getCompletionStats(query);
  }

  @Post(':id/resubmit')
  async resubmit(@Param('id') id: string, @Body() resubmitDto: any, @Req() req: any) {
    return this.performanceAgreementService.resubmit(id, resubmitDto, req.user.id);
  }

  @Post('resubmit-all')
  async resubmitAll(@Req() req: any) {
    return this.performanceAgreementService.resubmitAll(req.user.id);
  }
  */
}