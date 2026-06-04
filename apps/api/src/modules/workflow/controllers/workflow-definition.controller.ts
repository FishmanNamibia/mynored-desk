import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
} from "@nestjs/common";
import { WorkflowDefinitionService } from "../services/workflow-definition.service";
import {
  CreateWorkflowDefinitionDto,
  UpdateWorkflowDefinitionDto,
} from "../dto/workflow-definition.dto";

@Controller("workflows/definitions")
export class WorkflowDefinitionController {
  constructor(
    private readonly workflowDefinitionService: WorkflowDefinitionService,
  ) {}

  @Get()
  async findAll(): Promise<any> {
    return this.workflowDefinitionService.findAll();
  }

  @Get("active")
  async findAllActive(): Promise<any> {
    return this.workflowDefinitionService.findAllActive();
  }

  @Get(":id")
  async findOne(@Param("id") id: string): Promise<any> {
    return this.workflowDefinitionService.findOne(id);
  }

  @Post()
  async create(@Body() dto: CreateWorkflowDefinitionDto): Promise<any> {
    return this.workflowDefinitionService.create(dto);
  }

  @Put(":id")
  async update(
    @Param("id") id: string,
    @Body() dto: UpdateWorkflowDefinitionDto,
  ): Promise<any> {
    return this.workflowDefinitionService.update(id, dto);
  }

  @Put(":id/toggle-active")
  async toggleActive(@Param("id") id: string): Promise<any> {
    return this.workflowDefinitionService.toggleActive(id);
  }

  @Delete(":id")
  async delete(@Param("id") id: string): Promise<any> {
    return this.workflowDefinitionService.delete(id);
  }
}
