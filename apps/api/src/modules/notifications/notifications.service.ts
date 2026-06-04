import { Injectable, NotFoundException } from "@nestjs/common";
import prisma from "@mynsa-desk/database";
import { randomUUID } from "crypto";

@Injectable()
export class NotificationsService {
  private prisma = prisma;

  async create(data: {
    type: string;
    message: string;
    receiverId: string;
    senderId?: string;
    entityType?: string;
    entityId?: string;
    metadata?: any;
  }) {
    return (this.prisma as any).pmsNotification.create({
      data: {
        id: randomUUID(),
        type: data.type,
        message: data.message,
        receiverId: data.receiverId,
        senderId: data.senderId || null,
        entityType: data.entityType || null,
        entityId: data.entityId || null,
        metadata: data.metadata || null,
        status: "PENDING",
        updatedAt: new Date(),
      },
    });
  }

  async findAllForUser(userId: string, query?: { page?: number; limit?: number; status?: string }) {
    const page = query?.page || 1;
    const limit = query?.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = { receiverId: userId };
    if (query?.status) {
      where.status = query.status;
    }

    const [data, total] = await Promise.all([
      (this.prisma as any).pmsNotification.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          sender: { select: { id: true, firstName: true, lastName: true, email: true } },
        },
      }),
      (this.prisma as any).pmsNotification.count({ where }),
    ]);

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getUnreadCount(userId: string) {
    const [total, unread] = await Promise.all([
      (this.prisma as any).pmsNotification.count({ where: { receiverId: userId } }),
      (this.prisma as any).pmsNotification.count({ where: { receiverId: userId, status: "PENDING" } }),
    ]);

    return { total, unread, read: total - unread };
  }

  async markAsRead(id: string, userId: string) {
    const notification = await (this.prisma as any).pmsNotification.findFirst({
      where: { id, receiverId: userId },
    });

    if (!notification) {
      throw new NotFoundException("Notification not found");
    }

    return (this.prisma as any).pmsNotification.update({
      where: { id },
      data: { status: "READ", updatedAt: new Date() },
    });
  }

  async markAllAsRead(userId: string) {
    const result = await (this.prisma as any).pmsNotification.updateMany({
      where: { receiverId: userId, status: "PENDING" },
      data: { status: "READ", updatedAt: new Date() },
    });

    return { updated: result.count, message: `Marked ${result.count} notifications as read` };
  }

  async delete(id: string, userId: string) {
    const notification = await (this.prisma as any).pmsNotification.findFirst({
      where: { id, receiverId: userId },
    });

    if (!notification) {
      throw new NotFoundException("Notification not found");
    }

    return (this.prisma as any).pmsNotification.delete({ where: { id } });
  }
}
