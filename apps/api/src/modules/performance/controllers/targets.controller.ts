import { Controller, Get, Post, Body, Param, Query, UseGuards, Req, Patch } from '@nestjs/common';
import { TargetsService } from '../services/targets.service';
import { SessionGuard } from '../../auth/guards/session.guard';
import { CreateTargetDto, UpdateTargetDto, ApproveTargetDto } from '../dto/targets.dto';

@Controller('targets')
@UseGuards(SessionGuard)
export class TargetsController {
  constructor(private readonly targetsService: TargetsService) {}

  @Get()
  async findAll(@Query() query: any, @Req() req: any) {
    return this.targetsService.findAll(query, req.user);
  }

  @Post()
  async create(@Body() createDto: CreateTargetDto, @Req() req: any) {
    return this.targetsService.create(createDto, req.user.id);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Req() req: any) {
    return this.targetsService.findOne(id, req.user);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() updateDto: UpdateTargetDto, @Req() req: any) {
    return this.targetsService.update(id, updateDto, req.user.id);
  }

  @Patch(':id/status')
  async updateStatus(@Param('id') id: string, @Body() statusDto: any, @Req() req: any) {
    return this.targetsService.updateStatus(id, statusDto, req.user.id);
  }

  @Post(':id/approve')
  async approve(@Param('id') id: string, @Body() approveDto: ApproveTargetDto, @Req() req: any) {
    return this.targetsService.approve(id, approveDto, req.user.id);
  }

  @Get('pending-approval')
  async getPendingApproval(@Req() req: any) {
    return this.targetsService.getPendingApproval(req.user);
  }

  @Get('subordinates')
  async getSubordinates(@Req() req: any) {
    return this.targetsService.getSubordinates(req.user.id);
  }

  @Post('cascade')
  async cascade(@Body() cascadeDto: any, @Req() req: any) {
    return this.targetsService.cascade(cascadeDto, req.user.id);
  }

  @Post(':id/reassign')
  async reassign(@Param('id') id: string, @Body() reassignDto: any, @Req() req: any) {
    return this.targetsService.reassign(id, reassignDto, req.user.id);
  }
}

@Controller('adhoc-tasks')
@UseGuards(SessionGuard)
export class AdhocTasksController {
  constructor(private readonly targetsService: TargetsService) {}

  @Get()
  async findAll(@Query() query: any, @Req() req: any) {
    return this.targetsService.findAllAdhocTasks(query, req.user);
  }

  @Post()
  async create(@Body() createDto: any, @Req() req: any) {
    return this.targetsService.createAdhocTask(createDto, req.user.id);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Req() req: any) {
    return this.targetsService.findOneAdhocTask(id, req.user);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() updateDto: any, @Req() req: any) {
    return this.targetsService.updateAdhocTask(id, updateDto, req.user.id);
  }
}