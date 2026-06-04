import { Controller, Get, Post, Body, Param } from "@nestjs/common";
import { VacanciesService } from "./vacancies.service";
import { CreateVacancyDto } from "./dto/create-vacancy.dto";
import { Vacancy } from "./entities/vacancy.entity";

@Controller("vacancies")
export class VacanciesController {
  constructor(private readonly vacanciesService: VacanciesService) {}

  @Post()
  create(@Body() createVacancyDto: CreateVacancyDto): Promise<Vacancy> {
    return this.vacanciesService.create(createVacancyDto);
  }

  @Get()
  findAll(): Promise<Vacancy[]> {
    return this.vacanciesService.findAll();
  }

  @Get(":id")
  findOne(@Param("id") id: string): Promise<Vacancy> {
    return this.vacanciesService.findOne(id);
  }
}
