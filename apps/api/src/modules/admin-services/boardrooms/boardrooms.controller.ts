import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { BoardroomsService } from './boardrooms.service';
import { CreateBoardroomDto } from './dto/create-boardroom.dto';
import { UpdateBoardroomDto } from './dto/update-boardroom.dto';

@Controller('boardrooms')
export class BoardroomsController {
  constructor(private readonly boardroomsService: BoardroomsService) {}

  @Post()
  create(@Body() createBoardroomDto: CreateBoardroomDto) {
    return this.boardroomsService.create(createBoardroomDto);
  }

  @Get()
  findAll() {
    return this.boardroomsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.boardroomsService.findOne(id);
  }

  @Post(':id')
  update(@Param('id') id: string, @Body() updateBoardroomDto: UpdateBoardroomDto) {
    return this.boardroomsService.update(id, updateBoardroomDto);
  }
}