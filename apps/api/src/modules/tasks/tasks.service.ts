import { Injectable } from "@nestjs/common";
import { CreateTaskDto, UpdateTaskDto } from "./dto";
import prisma from "@mynsa-desk/database";

@Injectable()
export class TasksService {
  private prisma = prisma;

  async create(createTaskDto: CreateTaskDto): Promise<any> {
    return this.prisma.task.create({
      data: {
        id: require('crypto').randomUUID(),
        updatedAt: new Date(),
        title: createTaskDto.title,
        description: createTaskDto.description || "",
        assignedToId: createTaskDto.assigneeId,
        dueDate: createTaskDto.dueDate ?? new Date(),
        status: (createTaskDto.status ?? "PENDING") as any,
      },
    });
  }

  async findAll(): Promise<any[]> {
    return this.prisma.task.findMany();
  }

  async findOne(id: string): Promise<any> {
    return this.prisma.task.findUnique({
      where: { id },
    });
  }

  async update(id: string, updateTaskDto: UpdateTaskDto): Promise<any> {
    const { assigneeId, assignerId, ...rest } = updateTaskDto;

    return this.prisma.task.update({
      where: { id },
      data: {
        ...rest,
        assignedToId: assigneeId ?? undefined,
      },
    });
  }

  async remove(id: string): Promise<any> {
    return this.prisma.task.delete({
      where: { id },
    });
  }
}
