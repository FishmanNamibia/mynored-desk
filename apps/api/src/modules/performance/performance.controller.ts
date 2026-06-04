import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { PerformanceService } from './performance.service';
import { CreatePerformanceDto, UpdatePerformanceDto } from './dto';

@Controller('performance')
export class PerformanceController {
  constructor(private readonly performanceService: PerformanceService) {}

  @Post()
  create(@Body() createPerformanceDto: CreatePerformanceDto) {
    return this.performanceService.create(createPerformanceDto);
  }

  @Get()
  findAll() {
    return this.performanceService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.performanceService.findOne(id);
  }

  @Post(':id')
  update(@Param('id') id: string, @Body() updatePerformanceDto: UpdatePerformanceDto) {
    return this.performanceService.update(id, updatePerformanceDto);
  }
}