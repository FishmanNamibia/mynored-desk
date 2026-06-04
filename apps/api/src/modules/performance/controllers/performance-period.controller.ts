import { Controller, Get, Post, Body, Param, Query, UseGuards, Req, Patch, Delete } from '@nestjs/common';
import { PerformancePeriodService } from '../services/performance-period.service';
import { SessionGuard } from '../../auth/guards/session.guard';
import { CreatePerformancePeriodDto, UpdatePerformancePeriodDto } from '../dto/performance-period.dto';

@Controller('performance-period')
@UseGuards(SessionGuard)
export class PerformancePeriodController {
  constructor(private readonly performancePeriodService: PerformancePeriodService) {}

  @Get()
  async findAll(@Query() query: any, @Req() req: any) {
    return this.performancePeriodService.findAll(query, req.user);
  }

  @Post()
  async create(@Body() createDto: CreatePerformancePeriodDto, @Req() req: any) {
    return this.performancePeriodService.create(createDto, req.user.id);
  }

  @Get('current')
  async getCurrent() {
    return this.performancePeriodService.getCurrent();
  }

  @Get('available')
  async getAvailable(@Req() req: any) {
    return this.performancePeriodService.getAvailable(req.user);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() updateDto: UpdatePerformancePeriodDto, @Req() req: any) {
    return this.performancePeriodService.update(id, updateDto, req.user.id);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @Req() req: any) {
    return this.performancePeriodService.delete(id, req.user.id);
  }

  @Get('weights')
  async getWeights() {
    return this.performancePeriodService.getWeights();
  }

  @Patch('weights')
  async updateWeights(@Body() weightsDto: any, @Req() req: any) {
    return this.performancePeriodService.updateWeights(weightsDto, req.user.id);
  }

  @Get('stats')
  async getStats(@Query() query: any) {
    return this.performancePeriodService.getStats(query);
  }
}

@Controller('360-rating')
@UseGuards(SessionGuard)
export class Rating360Controller {
  constructor(private readonly performancePeriodService: PerformancePeriodService) {}

  @Get('questions')
  async getQuestions(@Query() query: any) {
    return this.performancePeriodService.get360Questions(query);
  }

  @Post('questions')
  async createQuestion(@Body() questionDto: any, @Req() req: any) {
    return this.performancePeriodService.create360Question(questionDto, req.user.id);
  }

  @Get('questions/:id')
  async getQuestion(@Param('id') id: string) {
    return this.performancePeriodService.get360Question(id);
  }

  @Patch('questions/:id')
  async updateQuestion(@Param('id') id: string, @Body() updateDto: any, @Req() req: any) {
    return this.performancePeriodService.update360Question(id, updateDto, req.user.id);
  }

  @Post('submit')
  async submit(@Body() submitDto: any, @Req() req: any) {
    return this.performancePeriodService.submit360Rating(submitDto, req.user.id);
  }

  @Get('pending')
  async getPending(@Req() req: any) {
    return this.performancePeriodService.getPending360Ratings(req.user.id);
  }

  @Get('my-rating')
  async getMyRating(@Req() req: any) {
    return this.performancePeriodService.getMy360Rating(req.user.id);
  }

  @Get('team')
  async getTeamRatings(@Req() req: any) {
    return this.performancePeriodService.getTeam360Ratings(req.user);
  }

  @Get('suggest-raters')
  async suggestRaters(@Query() query: any, @Req() req: any) {
    return this.performancePeriodService.suggest360Raters(query, req.user);
  }

  @Get('analysis/:id')
  async getAnalysis(@Param('id') id: string, @Req() req: any) {
    return this.performancePeriodService.get360Analysis(id, req.user);
  }

  @Get('categories')
  async getCategories() {
    return this.performancePeriodService.get360Categories();
  }

  @Get('cycles')
  async getCycles(@Query() query: any) {
    return this.performancePeriodService.get360Cycles(query);
  }

  @Post('cycles/:id/activate')
  async activateCycle(@Param('id') id: string, @Req() req: any) {
    return this.performancePeriodService.activate360Cycle(id, req.user.id);
  }

  @Post('cycles/:id/initialize')
  async initializeCycle(@Param('id') id: string, @Body() initDto: any, @Req() req: any) {
    return this.performancePeriodService.initialize360Cycle(id, initDto, req.user.id);
  }
}