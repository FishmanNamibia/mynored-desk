import { Injectable, NotFoundException } from "@nestjs/common";
import prisma from "@mynsa-desk/database";
import { CreateVacancyDto, VacancyStatus } from "./dto/create-vacancy.dto";
import { Vacancy } from "./entities/vacancy.entity";

@Injectable()
export class VacanciesService {
  private prisma = prisma;

  async create(createVacancyDto: CreateVacancyDto): Promise<any> {
    const { status = VacancyStatus.OPEN, ...data } = createVacancyDto;
    return this.prisma.vacancy.create({
      data: { id: require('crypto').randomUUID(), updatedAt: new Date(), ...data, status },
    });
  }

  async findAll(): Promise<any[]> {
    return this.prisma.vacancy.findMany({ orderBy: { createdAt: "desc" } });
  }

  async findOne(id: string): Promise<any> {
    const vacancy = await this.prisma.vacancy.findUnique({ where: { id } });
    if (!vacancy) {
      throw new NotFoundException(`Vacancy with ID ${id} not found`);
    }
    return vacancy;
  }

  async remove(id: string): Promise<any> {
    await this.findOne(id);
    return this.prisma.vacancy.delete({ where: { id } });
  }
}
