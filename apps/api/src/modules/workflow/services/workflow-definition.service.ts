import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import prisma from "@mynsa-desk/database";
import {
  CreateWorkflowDefinitionDto,
  UpdateWorkflowDefinitionDto,
} from "../dto/workflow-definition.dto";

@Injectable()
export class WorkflowDefinitionService {
  private prisma = prisma;

  async findAll(): Promise<any[]> {
    return this.prisma.workflowDefinition.findMany({
      include: {
        WorkflowStep: {
          orderBy: {
            order: "asc",
          },
        },
        _count: {
          select: {
            WorkflowInstance: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  }

  async findAllActive(): Promise<any[]> {
    return this.prisma.workflowDefinition.findMany({
      where: {
        isActive: true,
      },
      include: {
        WorkflowStep: {
          orderBy: {
            order: "asc",
          },
        },
      },
      orderBy: {
        name: "asc",
      },
    });
  }

  async findOne(id: string): Promise<any> {
    const workflow = await this.prisma.workflowDefinition.findUnique({
      where: { id },
      include: {
        WorkflowStep: {
          orderBy: {
            order: "asc",
          },
        },
      },
    });

    if (!workflow) {
      throw new NotFoundException(`Workflow definition ${id} not found`);
    }

    return workflow;
  }

  async findByName(name: string): Promise<any> {
    return this.prisma.workflowDefinition.findUnique({
      where: { name },
      include: {
        WorkflowStep: {
          orderBy: {
            order: "asc",
          },
        },
      },
    });
  }

  async create(dto: CreateWorkflowDefinitionDto): Promise<any> {
    // Validate steps order
    const steps = dto.steps || [];
    const orders = steps.map((s) => s.order);
    const uniqueOrders = new Set(orders);

    if (orders.length !== uniqueOrders.size) {
      throw new BadRequestException("Step orders must be unique");
    }

    return this.prisma.workflowDefinition.create({
      data: {
        id: require('crypto').randomUUID(),
        updatedAt: new Date(),
        name: dto.name,
        description: dto.description,
        module: dto.module,
        category: dto.category,
        icon: dto.icon,
        config: dto.config || {},
        WorkflowStep: {
          create: steps.map((step) => ({
            id: require('crypto').randomUUID(),
            updatedAt: new Date(),
            name: step.name,
            order: step.order,
            state: step.state,
            assignmentType: step.assignmentType,
            assignmentConfig: step.assignmentConfig,
            requiresApproval: step.requiresApproval ?? true,
            allowsComment: step.allowsComment ?? true,
            canEdit: step.canEdit ?? false,
            expectedDuration: step.expectedDuration,
            escalationDuration: step.escalationDuration,
            escalationConfig: step.escalationConfig || {},
            nextStepsConfig: step.nextStepsConfig,
          })),
        },
      },
      include: {
        WorkflowStep: {
          orderBy: {
            order: "asc",
          },
        },
      },
    });
  }

  async update(id: string, dto: UpdateWorkflowDefinitionDto): Promise<any> {
    const existing = await this.findOne(id);

    return this.prisma.workflowDefinition.update({
      where: { id },
      data: {
        name: dto.name,
        description: dto.description,
        module: dto.module,
        category: dto.category,
        icon: dto.icon,
        config: dto.config,
        isActive: dto.isActive,
        version: dto.version ?? existing.version + 1,
      },
      include: {
        WorkflowStep: {
          orderBy: {
            order: "asc",
          },
        },
      },
    });
  }

  async delete(id: string): Promise<any> {
    // Check if there are active instances
    const activeInstances = await this.prisma.workflowInstance.count({
      where: {
        workflowDefinitionId: id,
        status: {
          in: ["DRAFT", "ACTIVE"],
        },
      },
    });

    if (activeInstances > 0) {
      throw new BadRequestException(
        `Cannot delete workflow with ${activeInstances} active instance(s). Please deactivate instead.`,
      );
    }

    return this.prisma.workflowDefinition.delete({
      where: { id },
    });
  }

  async toggleActive(id: string): Promise<any> {
    const workflow = await this.findOne(id);

    return this.prisma.workflowDefinition.update({
      where: { id },
      data: {
        isActive: !workflow.isActive,
      },
    });
  }
}
