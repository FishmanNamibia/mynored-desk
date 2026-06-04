import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import prisma from "@mynsa-desk/database";
import { WorkflowEngineService } from "./workflow-engine.service";
import { CreateWorkflowInstanceDto } from "../dto/workflow-instance.dto";

@Injectable()
export class WorkflowInstanceService {
  private prisma = prisma;
  constructor(private workflowEngine: WorkflowEngineService) {}

  async findAll(filters?: {
    status?: string;
    createdBy?: string;
    workflowDefinitionId?: string;
  }): Promise<any[]> {
    return this.prisma.workflowInstance.findMany({
      where: {
        status: filters?.status as any,
        createdBy: filters?.createdBy,
        workflowDefinitionId: filters?.workflowDefinitionId,
      },
      include: {
        WorkflowDefinition: true,
        User: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
        WorkflowAssignment: {
          where: {
            isActive: true,
          },
          include: {
            User: {
              select: {
                id: true,
                username: true,
                email: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  }

  async findOne(id: string): Promise<any> {
    const instance = await this.prisma.workflowInstance.findUnique({
      where: { id },
      include: {
        WorkflowDefinition: {
          include: {
            WorkflowStep: {
              orderBy: {
                order: "asc",
              },
            },
          },
        },
        User: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
        WorkflowAssignment: {
          include: {
            User: {
              select: {
                id: true,
                username: true,
                email: true,
              },
            },
          },
          orderBy: {
            assignedAt: "desc",
          },
        },
        WorkflowAction: {
          include: {
            User: {
              select: {
                id: true,
                username: true,
                email: true,
              },
            },
          },
          orderBy: {
            performedAt: "desc",
          },
        },
        WorkflowSLA: {
          orderBy: {
            startedAt: "desc",
          },
        },
      },
    });

    if (!instance) {
      throw new NotFoundException(`Workflow instance ${id} not found`);
    }

    return instance;
  }

  async create(dto: CreateWorkflowInstanceDto, userId: string): Promise<any> {
    // Get workflow definition
    const definition = await this.prisma.workflowDefinition.findUnique({
      where: { id: dto.workflowDefinitionId },
      include: {
        WorkflowStep: {
          orderBy: {
            order: "asc",
          },
        },
      },
    });

    if (!definition) {
      throw new NotFoundException("Workflow definition not found");
    }

    if (!definition.isActive) {
      throw new BadRequestException("Workflow definition is not active");
    }

    // Generate reference number
    const count = await this.prisma.workflowInstance.count({
      where: {
        workflowDefinitionId: dto.workflowDefinitionId,
      },
    });

    const prefix = definition.name.substring(0, 3).toUpperCase();
    const year = new Date().getFullYear();
    const refNumber = `${prefix}-${year}-${String(count + 1).padStart(4, "0")}`;

    // Create instance
    const instance = await this.prisma.workflowInstance.create({
      data: {
        id: require('crypto').randomUUID(),
        updatedAt: new Date(),
        workflowDefinitionId: dto.workflowDefinitionId,
        title: dto.title,
        referenceNumber: refNumber,
        currentState: "DRAFT",
        createdBy: userId,
        status: "DRAFT",
        priority: dto.priority || "NORMAL",
        formData: dto.formData,
        metadata: dto.metadata || {},
      },
      include: {
        WorkflowDefinition: {
          include: {
            WorkflowStep: {
              orderBy: {
                order: "asc",
              },
            },
          },
        },
      },
    });

    // Create audit action
    await this.prisma.workflowAction.create({
      data: {
        id: require('crypto').randomUUID(),
        workflowInstanceId: instance.id,
        action: "CREATED",
        toState: "DRAFT",
        performedBy: userId,
      },
    });

    return instance;
  }

  async submit(instanceId: string, userId: string): Promise<any> {
    return this.workflowEngine.transitionWorkflow(instanceId, "SUBMIT", userId);
  }

  async approve(
    instanceId: string,
    userId: string,
    comment?: string,
  ): Promise<any> {
    return this.workflowEngine.transitionWorkflow(
      instanceId,
      "APPROVE",
      userId,
      comment,
    );
  }

  async reject(
    instanceId: string,
    userId: string,
    comment: string,
  ): Promise<any> {
    return this.workflowEngine.transitionWorkflow(
      instanceId,
      "REJECT",
      userId,
      comment,
    );
  }

  async cancel(
    instanceId: string,
    userId: string,
    reason: string,
  ): Promise<any> {
    const instance = await this.findOne(instanceId);

    if (instance.createdBy !== userId) {
      throw new BadRequestException(
        "Only the creator can cancel this workflow",
      );
    }

    if (instance.status !== "DRAFT" && instance.status !== "ACTIVE") {
      throw new BadRequestException("Cannot cancel workflow in current state");
    }

    return this.prisma.workflowInstance.update({
      where: { id: instanceId },
      data: {
        status: "CANCELLED",
        completedAt: new Date(),
      },
    });
  }
}
