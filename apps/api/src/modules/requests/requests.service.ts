// @ts-nocheck
import { Injectable, Logger } from "@nestjs/common";
import prisma from "@mynsa-desk/database";

export interface CreateRequestDto {
  type: "REFRESHMENT" | "BOARDROOM" | "VEHICLE" | "IT_EQUIPMENT";
  title: string;
  description?: string;
  requiredDate?: string;
  priority?: "LOW" | "NORMAL" | "HIGH" | "URGENT";
  refreshmentDetails?: {
    mode: "SINGLE_ITEM" | "BULK_EVENT";
    // For SINGLE_ITEM mode
    refreshmentId?: string;
    quantityRequested?: number;
    // For BULK_EVENT mode (meetings, events)
    itemsDescription?: string;  // "Tea, coffee, biscuits for 20 people"
    eventDate?: string;
    // REQUIRED: Motivation/justification for approval decision
    purpose: string;            // Why is this needed? (e.g., "Board meeting with external stakeholders")
  };
  boardroomDetails?: {
    boardroomId: string;
    startTime: string;
    endTime: string;
    purpose: string;
    attendees: number;
  };
  vehicleDetails?: {
    vehicleId?: string;
    startDate: string;
    endDate: string;
    destination: string;
    purpose: string;
  };
  itEquipmentDetails?: {
    equipmentId?: string;
    quantityRequested: number;
    purpose?: string;
    returnDate?: string;
  };
}

@Injectable()
export class RequestsService {
  private readonly logger = new Logger(RequestsService.name);
  private prisma = prisma;

  async createRequest(userId: string, createRequestDto: CreateRequestDto) {
    try {
      // Generate request number
      const requestNumber = await this.generateRequestNumber(createRequestDto.type);

      // Generate UUID manually
      const { randomUUID } = require('crypto');
      const requestId = randomUUID();

      // Create the main request using raw SQL
      const requiredDate = createRequestDto.requiredDate ? new Date(createRequestDto.requiredDate) : null;
      
      await this.prisma.$queryRaw`
        INSERT INTO "Request" (
          id, "requestNumber", type, title, description, "requesterId", priority, "requiredDate", status
        ) VALUES (
          ${requestId},
          ${requestNumber},
          ${createRequestDto.type},
          ${createRequestDto.title},
          ${createRequestDto.description || null},
          ${userId},
          ${createRequestDto.priority || 'NORMAL'},
          ${requiredDate},
          'PENDING'
        )
      `;

      // Create a simple request object to use for the response
      const request = {
        id: requestId,
        requestNumber,
        type: createRequestDto.type,
        title: createRequestDto.title,
        description: createRequestDto.description,
        requesterId: userId,
        priority: createRequestDto.priority || 'NORMAL',
        requiredDate: requiredDate,
        status: 'PENDING',
      };

      // Create type-specific details based on request type and mode
      if (createRequestDto.type === "REFRESHMENT" && createRequestDto.refreshmentDetails) {
        const details = createRequestDto.refreshmentDetails;
        const mode = details.mode || "SINGLE_ITEM";

        // Purpose/motivation is REQUIRED for all refreshment requests
        if (!details.purpose || details.purpose.trim() === "") {
          throw new Error("Purpose/motivation is required for refreshment requests. Please explain why this is needed.");
        }

        // Generate UUID manually
        const { randomUUID } = require('crypto');
        const refreshmentRequestId = randomUUID();

        if (mode === "SINGLE_ITEM" && details.refreshmentId && details.quantityRequested) {
          // Single item request - specific refreshment with quantity
          await this.prisma.$queryRaw`
            INSERT INTO "RefreshmentRequest" (
              id, "requestId", mode, "refreshmentId", "quantityRequested", purpose
            ) VALUES (
              ${refreshmentRequestId},
              ${request.id},
              'SINGLE_ITEM',
              ${details.refreshmentId},
              ${details.quantityRequested}::integer,
              ${details.purpose}
            )
          `;
        } else if (mode === "BULK_EVENT") {
          // Bulk/event request - describe needs for attendees
          const eventDate = details.eventDate ? new Date(details.eventDate) : null;
          await this.prisma.$queryRaw`
            INSERT INTO "RefreshmentRequest" (
              id, "requestId", mode, "itemsDescription", "eventDate", purpose
            ) VALUES (
              ${refreshmentRequestId},
              ${request.id},
              'BULK_EVENT',
              ${details.itemsDescription || null},
              ${eventDate},
              ${details.purpose}
            )
          `;
        } else {
          // Fallback: create a basic request entry for description-only requests
          await this.prisma.$queryRaw`
            INSERT INTO "RefreshmentRequest" (
              id, "requestId", mode, "itemsDescription", purpose
            ) VALUES (
              ${refreshmentRequestId},
              ${request.id},
              'BULK_EVENT',
              ${createRequestDto.description || null},
              ${details.purpose}
            )
          `;
        }
      }

      if (createRequestDto.type === "BOARDROOM" && createRequestDto.boardroomDetails) {
        await this.prisma.boardroomRequest.create({
          data: {
            requestId: request.id,
            boardroomId: createRequestDto.boardroomDetails.boardroomId,
            startTime: new Date(createRequestDto.boardroomDetails.startTime),
            endTime: new Date(createRequestDto.boardroomDetails.endTime),
            purpose: createRequestDto.boardroomDetails.purpose,
            attendees: createRequestDto.boardroomDetails.attendees,
          },
        });
      }

      if (createRequestDto.type === "VEHICLE" && createRequestDto.vehicleDetails) {
        await this.prisma.vehicleRequest.create({
          data: {
            requestId: request.id,
            vehicleId: createRequestDto.vehicleDetails.vehicleId,
            startDate: new Date(createRequestDto.vehicleDetails.startDate),
            endDate: new Date(createRequestDto.vehicleDetails.endDate),
            destination: createRequestDto.vehicleDetails.destination,
            purpose: createRequestDto.vehicleDetails.purpose,
          },
        });
      }

      if (createRequestDto.type === "IT_EQUIPMENT" && createRequestDto.itEquipmentDetails) {
        await this.prisma.iTEquipmentRequest.create({
          data: {
            requestId: request.id,
            equipmentId: createRequestDto.itEquipmentDetails.equipmentId,
            quantityRequested: createRequestDto.itEquipmentDetails.quantityRequested,
            purpose: createRequestDto.itEquipmentDetails.purpose,
            returnDate: createRequestDto.itEquipmentDetails.returnDate 
              ? new Date(createRequestDto.itEquipmentDetails.returnDate) 
              : undefined,
          },
        });
      }

      // Return the simple request object (no need to fetch with relations)
      return request;
    } catch (error) {
      const e = error as Error;
      this.logger.error(`Failed to create request: ${e.message}`, e.stack);
      throw error;
    }
  }

  async getUserRequests(userId: string) {
    try {
      const requests = await this.prisma.request.findMany({
        where: {
          requesterId: userId,
        },
        include: {
          requester: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              jobTitle: true,
              departmentName: true,
            },
          },
          approver: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          refreshmentRequests: {
            include: { refreshment: true },
          },
          boardroomRequests: {
            include: { boardroom: true },
          },
          vehicleRequests: {
            include: { vehicle: true },
          },
          itEquipmentRequests: {
            include: { equipment: true },
          },
        },
        orderBy: {
          requestDate: "desc",
        },
      });

      return requests;
    } catch (error) {
      const e = error as Error;
      this.logger.error(`Failed to get user requests: ${e.message}`, e.stack);
      return [];
    }
  }

  async getPendingRequests(excludeUserId?: string) {
    try {
      const requests = await this.prisma.request.findMany({
        where: {
          status: "PENDING",
          // Exclude the current user's own requests - they should only see colleagues' requests
          ...(excludeUserId && { requesterId: { not: excludeUserId } }),
        },
        include: {
          requester: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              jobTitle: true,
              departmentName: true,
            },
          },
          refreshmentRequests: {
            include: { refreshment: true },
          },
          boardroomRequests: {
            include: { boardroom: true },
          },
          vehicleRequests: {
            include: { vehicle: true },
          },
          itEquipmentRequests: {
            include: { equipment: true },
          },
        },
        orderBy: {
          requestDate: "asc",
        },
      });

      return requests;
    } catch (error) {
      const e = error as Error;
      this.logger.error(`Failed to get pending requests: ${e.message}`, e.stack);
      return [];
    }
  }

  async getColleagueRequests(excludeUserId?: string) {
    try {
      const requests = await this.prisma.request.findMany({
        where: {
          // Exclude the current user's own requests - they should only see colleagues' requests
          ...(excludeUserId && { requesterId: { not: excludeUserId } }),
        },
        include: {
          requester: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              jobTitle: true,
              departmentName: true,
            },
          },
          approver: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          refreshmentRequests: {
            include: { refreshment: true },
          },
          boardroomRequests: {
            include: { boardroom: true },
          },
          vehicleRequests: {
            include: { vehicle: true },
          },
          itEquipmentRequests: {
            include: { equipment: true },
          },
        },
        orderBy: {
          requestDate: "desc",
        },
      });

      return requests;
    } catch (error) {
      const e = error as Error;
      this.logger.error(`Failed to get colleague requests: ${e.message}`, e.stack);
      return [];
    }
  }

  async approveRequest(requestId: string, approverId: string, reason?: string) {
    try {
      const request = await this.prisma.request.update({
        where: { id: requestId },
        data: {
          status: "APPROVED",
          approvedBy: approverId,
          approvedAt: new Date(),
        },
        include: {
          requester: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          approver: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      });

      this.logger.log(`Request ${requestId} approved by ${approverId}`);
      return request;
    } catch (error) {
      const e = error as Error;
      this.logger.error(`Failed to approve request: ${e.message}`, e.stack);
      throw error;
    }
  }

  async rejectRequest(requestId: string, approverId: string, reason: string) {
    try {
      const request = await this.prisma.request.update({
        where: { id: requestId },
        data: {
          status: "REJECTED",
          approvedBy: approverId,
          approvedAt: new Date(),
          rejectionReason: reason,
        },
        include: {
          requester: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          approver: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      });

      this.logger.log(`Request ${requestId} rejected by ${approverId}`);
      return request;
    } catch (error) {
      const e = error as Error;
      this.logger.error(`Failed to reject request: ${e.message}`, e.stack);
      throw error;
    }
  }

  async updateRequest(requestId: string, userId: string, updateData: Partial<CreateRequestDto>) {
    try {
      const request = await this.prisma.request.update({
        where: { 
          id: requestId,
          requesterId: userId,
          status: "PENDING",
        },
        data: {
          title: updateData.title,
          description: updateData.description,
          priority: updateData.priority,
          requiredDate: updateData.requiredDate ? new Date(updateData.requiredDate) : undefined,
        },
        include: {
          requester: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      });

      this.logger.log(`Request ${requestId} updated by ${userId}`);
      return request;
    } catch (error) {
      const e = error as Error;
      this.logger.error(`Failed to update request: ${e.message}`, e.stack);
      throw error;
    }
  }

  async cancelRequest(requestId: string, userId: string) {
    try {
      const request = await this.prisma.request.update({
        where: { 
          id: requestId,
          requesterId: userId,
        },
        data: {
          status: "CANCELLED",
        },
        include: {
          requester: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      });

      this.logger.log(`Request ${requestId} cancelled by ${userId}`);
      return request;
    } catch (error) {
      const e = error as Error;
      this.logger.error(`Failed to cancel request: ${e.message}`, e.stack);
      throw error;
    }
  }

  async deleteRequest(requestId: string, userId: string) {
    try {
      // First delete related records
      await this.prisma.refreshmentRequest.deleteMany({ where: { requestId } });
      await this.prisma.boardroomRequest.deleteMany({ where: { requestId } });
      await this.prisma.vehicleRequest.deleteMany({ where: { requestId } });
      await this.prisma.iTEquipmentRequest.deleteMany({ where: { requestId } });

      // Then delete the main request
      const request = await this.prisma.request.delete({
        where: { 
          id: requestId,
          requesterId: userId,
        },
      });

      this.logger.log(`Request ${requestId} permanently deleted by ${userId}`);
      return { success: true, message: "Request deleted successfully" };
    } catch (error) {
      const e = error as Error;
      this.logger.error(`Failed to delete request: ${e.message}`, e.stack);
      throw error;
    }
  }

  async resubmitRequest(requestId: string, userId: string) {
    try {
      const request = await this.prisma.request.update({
        where: { 
          id: requestId,
          requesterId: userId,
          status: "CANCELLED",
        },
        data: {
          status: "PENDING",
        },
        include: {
          requester: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      });

      this.logger.log(`Request ${requestId} resubmitted by ${userId}`);
      return request;
    } catch (error) {
      const e = error as Error;
      this.logger.error(`Failed to resubmit request: ${e.message}`, e.stack);
      throw error;
    }
  }

  private async generateRequestNumber(type: string): Promise<string> {
    const prefix = {
      REFRESHMENT: "REF",
      BOARDROOM: "BR", 
      VEHICLE: "VEH",
      IT_EQUIPMENT: "IT",
    }[type] || "REQ";

    const year = new Date().getFullYear();
    
    // Get the count of requests of this type for the year
    try {
      const count = await this.prisma.request.count({
        where: {
          type: type as any,
          createdAt: {
            gte: new Date(`${year}-01-01`),
            lt: new Date(`${year + 1}-01-01`),
          },
        },
      });
      
      return `${prefix}-${year}-${(count + 1).toString().padStart(3, "0")}`;
    } catch (error) {
      // Fallback to random number if database query fails
      const counter = Math.floor(Math.random() * 1000) + 1;
      return `${prefix}-${year}-${counter.toString().padStart(3, "0")}`;
    }
  }
}