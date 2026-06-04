import { Injectable, NotFoundException } from "@nestjs/common";
import prisma from "@mynsa-desk/database";
import { CreateNewsDto } from "./dto/create-news.dto";
import { News } from "./entities/news.entity";

@Injectable()
export class NewsService {
  private prisma = prisma;

  async create(createNewsDto: CreateNewsDto): Promise<any> {
    return this.prisma.news.create({
      data: { id: require('crypto').randomUUID(), updatedAt: new Date(), ...createNewsDto },
    });
  }

  async findAll(): Promise<any[]> {
    return this.prisma.news.findMany({ orderBy: { createdAt: "desc" } });
  }

  async findOne(id: string): Promise<any> {
    const news = await this.prisma.news.findUnique({ where: { id } });
    if (!news) {
      throw new NotFoundException(`News with ID ${id} not found`);
    }
    return news;
  }

  async update(id: string, updateData: Partial<{ title: string; content: string; imageUrl: string; excerpt: string }>): Promise<any> {
    await this.findOne(id);
    return this.prisma.news.update({
      where: { id },
      data: { ...updateData, updatedAt: new Date() },
    });
  }

  async remove(id: string): Promise<any> {
    await this.findOne(id);
    return this.prisma.news.delete({ where: { id } });
  }
}
