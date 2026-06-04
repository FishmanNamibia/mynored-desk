import { Controller, Get, Post, Body, Param } from "@nestjs/common";
import { OnboardingService } from "./onboarding.service";
import { CreateEmployeeDto } from "./dto/create-employee.dto";

@Controller("onboarding")
export class OnboardingController {
  constructor(private readonly onboardingService: OnboardingService) {}

  @Post()
  async create(@Body() createEmployeeDto: CreateEmployeeDto): Promise<any> {
    return this.onboardingService.create(createEmployeeDto);
  }

  @Get(":id")
  async findOne(@Param("id") id: string): Promise<any> {
    return this.onboardingService.findOne(id);
  }

  @Get()
  async findAll(): Promise<any> {
    return this.onboardingService.findAll();
  }
}
