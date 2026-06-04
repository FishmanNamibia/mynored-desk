import { Injectable, BadRequestException } from "@nestjs/common";
import prisma from "@mynsa-desk/database";

@Injectable()
export class WorkflowEngineService {
  private prisma = prisma;

  async transitionWorkflow(
    instanceId: string,
    action: "SUBMIT" | "APPROVE" | "REJECT" | "RETURN",
    userId: string,
    comment?: string,
  ): Promise<any> {
    const instance = await this.prisma.workflowInstance.findUnique({
      where: { id: instanceId },
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
        WorkflowAssignment: {
          where: {
            isActive: true,
            assignedTo: userId,
          },
        },
      },
    });

    if (!instance) {
      throw new BadRequestException("Workflow instance not found");
    }

    // Get current step
    const currentStep = (instance as any).WorkflowDefinition.WorkflowStep.find(
      (step: any) => step.state === instance.currentState,
    );

    if (!currentStep && action !== "SUBMIT") {
      throw new BadRequestException("Invalid workflow state");
    }

    // Handle different actions
    let newState: string;
    let newStatus: string = instance.status;

    switch (action) {
      case "SUBMIT":
        if (instance.currentState !== "DRAFT") {
          throw new BadRequestException("Can only submit from DRAFT state");
        }
        // Move to first step
        const firstStep = (instance as any).WorkflowDefinition.WorkflowStep[0];
        if (!firstStep) {
          throw new BadRequestException("No steps defined in workflow");
        }
        newState = firstStep.state;
        newStatus = "ACTIVE";

        // Create assignment
        await this.createAssignment(instance.id, firstStep, userId);
        break;

      case "APPROVE":
        // Verify user has active assignment
        if ((instance as any).WorkflowAssignment.length === 0) {
          throw new BadRequestException(
            "You are not assigned to this workflow",
          );
        }

        // Get next step from config
        const nextStepConfig = (currentStep?.nextStepsConfig as any)?.onApprove;

        if (!nextStepConfig) {
          // Workflow complete
          newState = "COMPLETED";
          newStatus = "COMPLETED";
        } else {
          const nextStep = (instance as any).WorkflowDefinition.WorkflowStep.find(
            (step: any) => step.state === nextStepConfig,
          );
          if (!nextStep) {
            throw new BadRequestException("Invalid next step configuration");
          }
          newState = nextStep.state;

          // Create next assignment
          await this.createAssignment(instance.id, nextStep, userId);
        }

        // Complete current assignment
        await this.prisma.workflowAssignment.updateMany({
          where: {
            workflowInstanceId: instance.id,
            isActive: true,
            assignedTo: userId,
          },
          data: {
            status: "COMPLETED",
            isActive: false,
            completedAt: new Date(),
            action: "APPROVED",
            comment,
          },
        });
        break;

      case "REJECT":
        newState = "REJECTED";
        newStatus = "REJECTED";

        // Complete current assignment
        await this.prisma.workflowAssignment.updateMany({
          where: {
            workflowInstanceId: instance.id,
            isActive: true,
            assignedTo: userId,
          },
          data: {
            status: "COMPLETED",
            isActive: false,
            completedAt: new Date(),
            action: "REJECTED",
            comment,
          },
        });
        break;

      default:
        throw new BadRequestException("Invalid action");
    }

    // Update instance
    const updated = await this.prisma.workflowInstance.update({
      where: { id: instanceId },
      data: {
        currentState: newState,
        status: newStatus as any,
        completedAt:
          newStatus === "COMPLETED" || newStatus === "REJECTED"
            ? new Date()
            : null,
      },
    });

    // Create audit action
    await this.prisma.workflowAction.create({
      data: {
        id: require('crypto').randomUUID(),
        workflowInstanceId: instanceId,
        action: action.toUpperCase(),
        fromState: instance.currentState,
        toState: newState,
        performedBy: userId,
        comment,
      },
    });

    return updated;
  }

  private async createAssignment(
    instanceId: string,
    step: any,
    _currentUserId: string,
  ): Promise<any> {
    const assignmentConfig = step.assignmentConfig as any;
    let assigneeId: string;

    switch (step.assignmentType) {
      case "ROLE":
        // Find first user with the role using UserRole join table
        const userRole = await this.prisma.userRole.findFirst({
          where: {
            role: { name: assignmentConfig.role },
          },
          include: { user: true },
        });
        if (!userRole || !(userRole as any).user) {
          throw new BadRequestException(
            `No user found with role ${assignmentConfig.role}`,
          );
        }
        assigneeId = (userRole as any).user.id;
        break;

      case "USER":
        assigneeId = assignmentConfig.userId;
        break;

      case "DYNAMIC":
        // For now, assign to admin - implement dynamic logic later
        const adminRole = await this.prisma.userRole.findFirst({
          where: { role: { name: "ADMIN" } },
          include: { user: true },
        });
        if (!adminRole || !(adminRole as any).user) {
          throw new BadRequestException("No admin user found");
        }
        assigneeId = (adminRole as any).user.id;
        break;

      default:
        throw new BadRequestException("Invalid assignment type");
    }

    // Calculate due date if SLA is defined
    let dueAt: Date | undefined;
    if (step.expectedDuration) {
      dueAt = new Date();
      dueAt.setHours(dueAt.getHours() + step.expectedDuration);
    }

    return this.prisma.workflowAssignment.create({
      data: {
        id: require('crypto').randomUUID(),
        updatedAt: new Date(),
        workflowInstanceId: instanceId,
        assignedTo: assigneeId,
        stepName: step.name,
        state: step.state,
        dueAt,
      },
    });
  }
}
