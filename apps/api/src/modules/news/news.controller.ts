import { Controller, Get, Post, Put, Delete, Body, Param } from "@nestjs/common";
import { NewsService } from "./news.service";
import { CreateNewsDto } from "./dto/create-news.dto";

@Controller("news")
export class NewsController {
  constructor(private readonly newsService: NewsService) {}

  @Post()
  create(@Body() createNewsDto: CreateNewsDto) {
    return this.newsService.create(createNewsDto);
  }

  @Get()
  findAll() {
    return this.newsService.findAll();
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.newsService.findOne(id);
  }

  @Put(":id")
  update(@Param("id") id: string, @Body() body: Partial<CreateNewsDto>) {
    return this.newsService.update(id, body);
  }

  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.newsService.remove(id);
  }
}