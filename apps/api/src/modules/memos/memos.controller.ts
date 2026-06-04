import { Controller, Get, Post, Body, Param, Put, Delete, Query, Patch } from '@nestjs/common';
import { MemosService } from './memos.service';
import { CreateMemoDto, UpdateMemoDto } from './dto/index';

@Controller('memos')
export class MemosController {
  constructor(private readonly memosService: MemosService) {}

  @Post()
  create(@Body() createMemoDto: CreateMemoDto) {
    return this.memosService.create(createMemoDto);
  }

  @Get()
  findAll(
    @Query('userId') userId?: string,
    @Query('status') status?: string,
  ) {
    return this.memosService.findAll(userId, status);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.memosService.findOne(id);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() updateMemoDto: UpdateMemoDto) {
    return this.memosService.update(id, updateMemoDto);
  }

  @Patch(':id/status')
  updateStatus(
    @Param('id') id: string,
    @Body('status') status: string,
  ) {
    return this.memosService.updateStatus(id, status);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.memosService.remove(id);
  }
}