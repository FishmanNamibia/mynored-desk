import { Injectable, NotFoundException } from "@nestjs/common";
import prisma from "@mynsa-desk/database";
import { CreateBoardroomDto } from "./dto/create-boardroom.dto";
import { UpdateBoardroomDto } from "./dto/update-boardroom.dto";
import { randomUUID } from "crypto";

@Injectable()
export class BoardroomsService {
  private prisma = prisma;

  async create(createBoardroomDto: CreateBoardroomDto): Promise<any> {
    return this.prisma.boardroom.create({
      data: {
        id: randomUUID(),
        ...createBoardroomDto,
        isAvailable: (createBoardroomDto as any).isAvailable ?? true,
      },
    });
  }

  async findAll(): Promise<any[]> {
    return this.prisma.boardroom.findMany({ orderBy: { createdAt: "desc" } });
  }

  async findOne(id: string): Promise<any> {
    const boardroom = await this.prisma.boardroom.findUnique({ where: { id } });
    if (!boardroom) {
      throw new NotFoundException(`Boardroom with ID ${id} not found`);
    }
    return boardroom;
  }

  async update(id: string, updateBoardroomDto: UpdateBoardroomDto): Promise<any> {
    await this.findOne(id);
    return this.prisma.boardroom.update({
      where: { id },
      data: { ...updateBoardroomDto, updatedAt: new Date() },
    });
  }

  async remove(id: string): Promise<any> {
    await this.findOne(id);
    return this.prisma.boardroom.delete({ where: { id } });
  }
}
