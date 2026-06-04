import { Controller, Get, Post, Body, Param, Query, UseGuards, Req, Patch, Delete } from '@nestjs/common';
import { GoalsService } from '../services/goals.service';
import { SessionGuard } from '../../auth/guards/session.guard';
import { CreateGoalDto, UpdateGoalDto, CreateObjectiveDto, CreateInitiativeDto } from '../dto/goals.dto';

@Controller('goals')
@UseGuards(SessionGuard)
export class GoalsController {
  constructor(private readonly goalsService: GoalsService) {}

  @Get()
  async findAll(@Query() query: any, @Req() req: any) {
    return this.goalsService.findAll(query, req.user);
  }

  @Post()
  async create(@Body() createDto: CreateGoalDto, @Req() req: any) {
    return this.goalsService.create(createDto, req.user.id);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Req() req: any) {
    return this.goalsService.findOne(id, req.user);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() updateDto: UpdateGoalDto, @Req() req: any) {
    return this.goalsService.update(id, updateDto, req.user.id);
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @Req() req: any) {
    return this.goalsService.remove(id, req.user.id);
  }

  @Post('import')
  async import(@Body() importDto: any, @Req() req: any) {
    return this.goalsService.importGoals(importDto, req.user.id);
  }

  @Post('clear')
  async clear(@Body() clearDto: any, @Req() req: any) {
    return this.goalsService.clear(clearDto, req.user.id);
  }
}

@Controller('objectives')
@UseGuards(SessionGuard)
export class ObjectivesController {
  constructor(private readonly goalsService: GoalsService) {}

  @Get()
  async findAll(@Query() query: any, @Req() req: any) {
    return this.goalsService.findAllObjectives(query, req.user);
  }

  @Post()
  async create(@Body() createDto: CreateObjectiveDto, @Req() req: any) {
    return this.goalsService.createObjective(createDto, req.user.id);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Req() req: any) {
    return this.goalsService.findOneObjective(id, req.user);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() updateDto: any, @Req() req: any) {
    return this.goalsService.updateObjective(id, updateDto, req.user.id);
  }
}

@Controller('initiatives')
@UseGuards(SessionGuard)
export class InitiativesController {
  constructor(private readonly goalsService: GoalsService) {}

  @Get()
  async findAll(@Query() query: any, @Req() req: any) {
    return this.goalsService.findAllInitiatives(query, req.user);
  }

  @Post()
  async create(@Body() createDto: CreateInitiativeDto, @Req() req: any) {
    return this.goalsService.createInitiative(createDto, req.user.id);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Req() req: any) {
    return this.goalsService.findOneInitiative(id, req.user);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() updateDto: any, @Req() req: any) {
    return this.goalsService.updateInitiative(id, updateDto, req.user.id);
  }

  @Patch(':id/status')
  async updateStatus(@Param('id') id: string, @Body() statusDto: any, @Req() req: any) {
    return this.goalsService.updateInitiativeStatus(id, statusDto, req.user.id);
  }

  @Get('my-actions')
  async getMyActions(@Req() req: any) {
    return this.goalsService.getMyActions(req.user.id);
  }
}