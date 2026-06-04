import { Injectable } from '@nestjs/common';
import prisma from '@mynsa-desk/database';
import { AddRefreshmentStockDto } from './dto/add-refreshment-stock.dto';
import { AddITEquipmentDto } from './dto/add-it-equipment.dto';

export interface RequestApprovalDto {
  action: 'APPROVE' | 'REJECT';
  rejectionReason?: string;
  adminNotes?: string;
}

@Injectable()
export class AdminRequestsService {
  private prisma = prisma;

  async getAllRequestsForAdmin(userRole: string) {
    // Admin Assistants see all except VEHICLE requests
    const typeFilter = userRole === 'Admin Assistant' ? {
      type: { not: 'VEHICLE' as any }
    } : {};

    return this.prisma.request.findMany({
      where: {
        status: 'PENDING',
        ...typeFilter
      },
      include: {
        requester: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            jobTitle: true,
            departmentName: true
          }
        },
        RefreshmentRequest: true,
        BoardroomRequest: {
          include: {
            Boardroom: true
          }
        },
        VehicleRequest: {
          include: {
            Vehicle: true
          }
        },
        ITEquipmentRequest: {
          include: {
            ITEquipment: true
          }
        }
      },
      orderBy: [
        { priority: 'desc' },
        { requestDate: 'asc' }
      ]
    });
  }

  async approveRequest(requestId: string, adminId: string, approvalData: RequestApprovalDto) {
    const { action, rejectionReason, adminNotes } = approvalData;

    const updateData: any = {
      status: action === 'APPROVE' ? 'APPROVED' : 'REJECTED',
      approvedBy: adminId,
      approvedAt: new Date(),
    };

    if (action === 'REJECT' && rejectionReason) {
      updateData.rejectionReason = rejectionReason;
    }

    if (adminNotes) {
      updateData.description = `${updateData.description || ''}\n\nAdmin Notes: ${adminNotes}`.trim();
    }

    return this.prisma.request.update({
      where: { id: requestId },
      data: updateData,
      include: {
        requester: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        }
      }
    });
  }

  async getRequestCounts(userRole: string) {
    const typeFilter = userRole === 'Admin Assistant' ? {
      type: { not: 'VEHICLE' as any }
    } : {};

    const [pending, approved, rejected, total] = await Promise.all([
      this.prisma.request.count({
        where: { status: 'PENDING', ...typeFilter }
      }),
      this.prisma.request.count({
        where: { status: 'APPROVED', ...typeFilter }
      }),
      this.prisma.request.count({
        where: { status: 'REJECTED', ...typeFilter }
      }),
      this.prisma.request.count({
        where: typeFilter
      })
    ]);

    return { pending, approved, rejected, total };
  }

  async getRefreshmentStock() {
    return this.prisma.refreshment.findMany({
      orderBy: [
        { category: 'asc' },
        { name: 'asc' }
      ]
    });
  }

  async updateRefreshmentStock(stockId: string, quantity: number, operation: 'ADD' | 'REMOVE') {
    const stock = await this.prisma.refreshment.findUnique({
      where: { id: stockId }
    });

    if (!stock) {
      throw new Error('Stock item not found');
    }

    return this.prisma.refreshment.update({
      where: { id: stockId },
      data: {
        quantity: operation === 'ADD' ? stock.quantity + quantity : stock.quantity - quantity,
      }
    });
  }

  async getLowStockAlerts() {
    return this.prisma.refreshment.findMany({
      where: {
        quantity: { lte: 5 }
      },
      orderBy: [
        { quantity: 'asc' }
      ]
    });
  }

  async addRefreshmentStock(addRefreshmentStockDto: AddRefreshmentStockDto) {
    try {
      console.log('Adding refreshment stock:', addRefreshmentStockDto);
      const result = await this.prisma.refreshment.create({
        data: {
          id: require('crypto').randomUUID(),
          name: addRefreshmentStockDto.name,
          category: addRefreshmentStockDto.category,
          dateAdded: new Date().toISOString(),
          expiryDate: addRefreshmentStockDto.expiryDate || undefined,
          quantity: addRefreshmentStockDto.quantity,
          givenOut: 0,
          supplier: addRefreshmentStockDto.supplier,
          departmentId: addRefreshmentStockDto.departmentId || null
        }
      });
      
      console.log('Created refreshment:', result);
      return result;
    } catch (error) {
      console.error('Error adding refreshment stock:', error);
      throw error;
    }
  }

  async addITEquipment(addITEquipmentDto: AddITEquipmentDto) {
    return this.prisma.iTEquipment.create({
      data: {
        id: require('crypto').randomUUID(),
        updatedAt: new Date(),
        ...addITEquipmentDto,
        condition: addITEquipmentDto.condition as any,
        givenOut: 0,
      }
    });
  }

  async testDbConnection() {
    try {
      const count = await this.prisma.refreshment.count();
      return { message: 'Database connection successful', count };
    } catch (error) {
      console.error('Database connection test failed:', error);
      return { message: 'Database connection failed', error: (error as any).message };
    }
  }

  async getAllInventory() {
    // For Administrative Assistants, only return Refreshments
    // IT Equipment will be filtered by department later for IT staff
    const refreshments = await this.prisma.refreshment.findMany({
      where: { },
      orderBy: [
        { category: 'asc' },
        { name: 'asc' }
      ]
    });

    // Transform refreshments to match the frontend interface
    const transformedRefreshments = refreshments.map(item => ({
      id: item.id,
      name: item.name,
      category: item.category || 'Uncategorized',
      type: 'REFRESHMENT' as const,
      quantity: item.quantity,
      givenOut: item.givenOut,
      expiryDate: item.expiryDate?.toISOString().split('T')[0],
      dateAdded: item.dateAdded?.toISOString().split('T')[0],
      supplier: item.supplier,
      departmentId: item.departmentId,
      condition: undefined // Refreshments don't have condition
    }));

    return transformedRefreshments;
  }

  async softDeleteRefreshment(id: string): Promise<void> {
    await this.prisma.refreshment.delete({
      where: { id }
    });
  }

  async updateRefreshment(id: string, data: any): Promise<void> {
    await this.prisma.refreshment.update({
      where: { id },
      data: {
        ...data,
        updatedAt: new Date()
      }
    });
  }
}