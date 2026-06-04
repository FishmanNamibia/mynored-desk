import { Controller, Get, Post, Put, Body, Param, Query } from "@nestjs/common";
import { WorkflowInstanceService } from "../services/workflow-instance.service";
import {
  CreateWorkflowInstanceDto,
  TransitionWorkflowDto,
} from "../dto/workflow-instance.dto";

@Controller("workflows/instances")
export class WorkflowInstanceController {
  constructor(
    private readonly workflowInstanceService: WorkflowInstanceService,
  ) {}

  @Get()
  async findAll(
    @Query("status") status?: string,
    @Query("createdBy") createdBy?: string,
    @Query("workflowDefinitionId") workflowDefinitionId?: string,
  ): Promise<any> {
    return this.workflowInstanceService.findAll({
      status,
      createdBy: createdBy || undefined,
      workflowDefinitionId,
    });
  }

  @Get(":id")
  async findOne(@Param("id") id: string): Promise<any> {
    return this.workflowInstanceService.findOne(id);
  }

  @Post()
  async create(@Body() dto: CreateWorkflowInstanceDto): Promise<any> {
    // TODO: Get userId from auth context
    const userId = "mock-user"; // Mock user
    return this.workflowInstanceService.create(dto, userId);
  }

  @Put(":id/submit")
  async submit(@Param("id") id: string): Promise<any> {
    // TODO: Get userId from auth context
    const userId = "mock-user";
    return this.workflowInstanceService.submit(id, userId);
  }

  @Put(":id/approve")
  async approve(
    @Param("id") id: string,
    @Body() dto: TransitionWorkflowDto,
  ): Promise<any> {
    // TODO: Get userId from auth context
    const userId = "mock-user";
    return this.workflowInstanceService.approve(id, userId, dto.comment);
  }

  @Put(":id/reject")
  async reject(
    @Param("id") id: string,
    @Body() dto: TransitionWorkflowDto,
  ): Promise<any> {
    // TODO: Get userId from auth context
    const userId = "mock-user";
    return this.workflowInstanceService.reject(id, userId, dto.comment!);
  }

  @Put(":id/cancel")
  async cancel(
    @Param("id") id: string,
    @Body("reason") reason: string,
  ): Promise<any> {
    // TODO: Get userId from auth context
    const userId = "mock-user";
    return this.workflowInstanceService.cancel(id, userId, reason);
  }
}
