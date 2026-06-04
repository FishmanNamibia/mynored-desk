// @ts-nocheck
import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Req,
  ForbiddenException,
  UnauthorizedException,
} from "@nestjs/common";
import { RequestsService, CreateRequestDto } from "./requests.service";
import { JwtGuard } from "../auth/guards/jwt.guard";
import prisma from "@mynsa-desk/database";

@Controller("requests")
export class RequestsController {
  constructor(private readonly requestsService: RequestsService) {}

  private getUserIdFromRequest(req: any): string {
    const userId = req?.user?.userId || req?.user?.sub;
    if (!userId) {
      throw new UnauthorizedException(
        "Authenticated user ID is missing from request context",
      );
    }
    return userId;
  }

  private assertLegacyPublicEndpointsAllowed(): void {
    const isEnabled = process.env.ALLOW_LEGACY_PUBLIC_ENDPOINTS === "true";
    if (!isEnabled) {
      throw new ForbiddenException(
        "Legacy public endpoints are disabled. Use authenticated endpoints.",
      );
    }
  }

  @Post()
  @UseGuards(JwtGuard)
  async createRequest(
    @Body() createRequestDto: CreateRequestDto,
    @Req() req: any,
  ): Promise<any> {
    const userId = this.getUserIdFromRequest(req);
    return this.requestsService.createRequest(userId, createRequestDto);
  }

  // Public endpoint for getting user's own requests without authentication
  // MUST be before @Get("my") to match correctly
  @Get('my/public/:userId')
  async getMyRequestsPublic(@Param('userId') userId: string): Promise<any> {
    this.assertLegacyPublicEndpointsAllowed();
    try {
      console.log('GET my/public endpoint called for userId:', userId);
      
      // Get all requests for this user
      const requests = await prisma.request.findMany({
        where: {
          requesterId: userId
        },
        select: {
          id: true,
          requestNumber: true,
          type: true,
          title: true,
          description: true,
          status: true,
          priority: true,
          createdAt: true,
          requiredDate: true,
          approvedBy: true,
          approvalReason: true,
          rejectionReason: true
        },
        orderBy: {
          createdAt: 'desc'
        }
      });
      
      console.log('Found user requests:', requests.length);

      // Get approver information for approved/rejected requests
      const approverIds = requests.map(req => req.approvedBy).filter(Boolean);
      const approvers = await prisma.user.findMany({
        where: {
          id: {
            in: approverIds
          }
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true
        }
      });

      // Transform to match frontend interface
      const transformedData = requests.map(request => {
        const approver = request.approvedBy ? approvers.find(a => a.id === request.approvedBy) : null;
        
        return {
          id: request.id,
          requestNumber: request.requestNumber,
          title: request.title,
          type: request.type,
          status: request.status,
          description: request.description || '',
          priority: request.priority,
          createdAt: request.createdAt.toISOString(),
          updatedAt: request.createdAt.toISOString(),
          requiredDate: request.requiredDate ? request.requiredDate.toISOString() : undefined,
          approvalReason: request.approvalReason || undefined,
          rejectionReason: request.rejectionReason || undefined,
          approver: approver ? {
            id: approver.id,
            firstName: approver.firstName,
            lastName: approver.lastName,
            email: approver.email || ''
          } : undefined
        };
      });

      console.log('Transformed user requests:', transformedData.length);
      return transformedData;
    } catch (error) {
      console.error('Error fetching user requests:', error);
      return [];
    }
  }

  @Get("my")
  @UseGuards(JwtGuard)
  async getUserRequests(@Req() req: any): Promise<any> {
    const userId = this.getUserIdFromRequest(req);
    return this.requestsService.getUserRequests(userId);
  }

  @Get("pending")
  @UseGuards(JwtGuard)
  async getPendingRequests(@Req() req: any): Promise<any> {
    const userId = this.getUserIdFromRequest(req);
    return this.requestsService.getPendingRequests(userId);
  }

  @Get("colleagues")
  @UseGuards(JwtGuard)
  async getColleagueRequests(@Req() req: any): Promise<any> {
    const userId = this.getUserIdFromRequest(req);
    return this.requestsService.getColleagueRequests(userId);
  }

  @Post(":id/approve")
  @UseGuards(JwtGuard)
  async approveRequest(
    @Param("id") requestId: string,
    @Body("reason") reason?: string,
    @Req() req: any,
  ): Promise<any> {
    const approverId = this.getUserIdFromRequest(req);
    return this.requestsService.approveRequest(requestId, approverId, reason);
  }

  @Post(":id/reject")
  @UseGuards(JwtGuard)
  async rejectRequest(
    @Param("id") requestId: string,
    @Body("reason") reason: string,
    @Req() req: any,
  ): Promise<any> {
    const approverId = this.getUserIdFromRequest(req);
    return this.requestsService.rejectRequest(requestId, approverId, reason);
  }

  @Put(":id")
  @UseGuards(JwtGuard)
  async updateRequest(
    @Param("id") requestId: string,
    @Body() updateData: Partial<CreateRequestDto>,
    @Req() req: any,
  ): Promise<any> {
    const userId = this.getUserIdFromRequest(req);
    return this.requestsService.updateRequest(requestId, userId, updateData);
  }

  @Post(":id/cancel")
  @UseGuards(JwtGuard)
  async cancelRequest(
    @Param("id") requestId: string,
    @Req() req: any,
  ): Promise<any> {
    const userId = this.getUserIdFromRequest(req);
    return this.requestsService.cancelRequest(requestId, userId);
  }

  @Post(":id/resubmit")
  @UseGuards(JwtGuard)
  async resubmitRequest(
    @Param("id") requestId: string,
    @Req() req: any,
  ): Promise<any> {
    const userId = this.getUserIdFromRequest(req);
    return this.requestsService.resubmitRequest(requestId, userId);
  }

  @Delete(":id")
  @UseGuards(JwtGuard)
  async deleteRequest(
    @Param("id") requestId: string,
    @Req() req: any,
  ): Promise<any> {
    const userId = this.getUserIdFromRequest(req);
    return this.requestsService.deleteRequest(requestId, userId);
  }

  // Test endpoint to check database connection
  @Get('inventory/test')
  @UseGuards(JwtGuard)
  async testDatabase(): Promise<any> {
    try {
      const count = await prisma.refreshment.count();
      return { message: 'Database connection successful', count };
    } catch (error) {
      console.error('Database test failed:', error);
      return { message: 'Database connection failed', error: error instanceof Error ? error.message : String(error) };
    }
  }

  // Temporary public endpoint for inventory without authentication
  @Get('inventory/public')
  async getAllInventoryPublic(): Promise<any> {
    this.assertLegacyPublicEndpointsAllowed();
    try {
      console.log('GET inventory/public endpoint called');
      
      // Query actual database with only existing columns
      const refreshments = await prisma.refreshment.findMany({
        select: {
          id: true,
          name: true,
          category: true,
          dateAdded: true,
          expiryDate: true,
          quantity: true,
          givenOut: true,
          supplier: true,
          departmentId: true
        },
        orderBy: [
          { category: 'asc' },
          { name: 'asc' }
        ]
      });

      console.log('Raw refreshments from DB:', JSON.stringify(refreshments, null, 2));

      // Transform to match frontend interface
      const transformedData = refreshments.map(item => ({
        id: item.id?.toString() || '',
        name: item.name || '',
        category: item.category || 'Uncategorized',
        type: 'REFRESHMENT' as const,
        quantity: item.quantity || 0,
        givenOut: item.givenOut || 0,
        unitType: 'pieces',
        expiryDate: item.expiryDate ? item.expiryDate.toISOString().split('T')[0] : undefined,
        supplier: item.supplier || undefined,
        dateAdded: item.dateAdded ? item.dateAdded.toISOString().split('T')[0] : undefined,
        departmentId: item.departmentId || undefined
      }));

      console.log('Transformed inventory data:', JSON.stringify(transformedData, null, 2));
      
      return transformedData;
    } catch (error) {
      console.error('Error fetching inventory:', error);
      return [];
    }
  }

  // Temporary public endpoint for colleagues requests without authentication
  @Get('colleagues/public')
  async getColleagueRequestsPublic(): Promise<any> {
    this.assertLegacyPublicEndpointsAllowed();
    try {
      console.log('GET colleagues/public endpoint called');
      
      // Get all refreshment requests
      const refreshmentRequests = await prisma.refreshmentRequest.findMany({
        orderBy: [
          { id: 'desc' }
        ]
      });
      console.log('Found refreshment requests:', refreshmentRequests.length);

      // Get Request records to find actual user IDs using correct field name
      const requestIds = refreshmentRequests.map(req => req.requestId);
      const requests = await prisma.request.findMany({
        where: {
          id: {
            in: requestIds
          }
        },
        select: {
          id: true,
          requesterId: true,
          createdAt: true,
          requiredDate: true
        }
      });
      console.log('Found request records:', requests.length);

      // Get users who made requests using requesterId from Request table
      const userIds = requests.map(req => req.requesterId).filter(Boolean);
      console.log('User IDs to lookup:', userIds);
      const users = await prisma.user.findMany({
        where: {
          id: {
            in: userIds
          }
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          subDivision: true,
          jobTitle: true
        }
      });
      console.log('Found users:', users.length);
      console.log('Users data:', JSON.stringify(users, null, 2));
      
      // Transform to match frontend interface
      const transformedData = refreshmentRequests.map(item => {
        const request = requests.find(r => r.id === item.requestId);
        const user = request ? users.find(u => u.id === request.requesterId) : null;
        return {
          id: item.id?.toString() || '',
          requestId: item.requestId || '',
          requestNumber: `REF-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`,
          title: item.itemsDescription || 'Refreshment Request',
          type: 'REFRESHMENT',
          refreshmentId: item.refreshmentId || '',
          quantityRequested: item.quantityRequested || 0,
          description: item.purpose && item.purpose !== 'test' ? item.purpose : '',
          itemsDescription: item.itemsDescription || '', 
          eventDate: item.eventDate ? item.eventDate.toISOString().split('T')[0] : '', 
          createdAt: request?.createdAt ? request.createdAt.toISOString() : new Date().toISOString(),
          requestDate: request?.createdAt ? request.createdAt.toISOString() : new Date().toISOString(),
          requiredDate: request?.requiredDate ? request.requiredDate.toISOString().split('T')[0] : (item.eventDate ? item.eventDate.toISOString().split('T')[0] : ''),
          purpose: item.purpose && item.purpose !== 'test' ? item.purpose : 'Refreshment stock for office use',
          status: 'PENDING',
          requester: {
            id: user?.id || '',
            firstName: user?.firstName || 'Unknown',
            lastName: user?.lastName || 'User',
            departmentName: user?.subDivision || 'Unknown Department',
            jobTitle: user?.jobTitle || 'Unknown Position'
          }
        };
      });

      console.log('Transformed requests:', JSON.stringify(transformedData, null, 2));
      
      return transformedData;
    } catch (error) {
      console.error('Error fetching colleague requests:', error);
      return [];
    }
  }

  // Temporary public endpoint for adding items without authentication
  @Post('inventory/public/add')
  async addRefreshmentStockPublic(@Body() addRefreshmentStockDto: any): Promise<any> {
    this.assertLegacyPublicEndpointsAllowed();
    try {
      console.log('Adding refreshment stock:', addRefreshmentStockDto);
      
      // Generate UUID manually
      const { randomUUID } = require('crypto');
      const id = randomUUID();
      
      // Use raw SQL to insert data, bypassing Prisma schema validation
      const expiryDate = addRefreshmentStockDto.expiryDate 
        ? new Date(addRefreshmentStockDto.expiryDate) 
        : new Date(new Date().setFullYear(new Date().getFullYear() + 1));
      
      const result = await prisma.$queryRaw`
        INSERT INTO "Refreshment" (
          id, name, category, "dateAdded", "expiryDate", quantity, "givenOut", supplier, "departmentId"
        ) VALUES (
          ${id},
          ${addRefreshmentStockDto.name},
          ${addRefreshmentStockDto.category},
          ${new Date()},
          ${expiryDate},
          ${addRefreshmentStockDto.quantity}::integer,
          0,
          ${addRefreshmentStockDto.supplier || null},
          ${addRefreshmentStockDto.departmentId || null}
        )
        RETURNING id, name, category, "dateAdded", "expiryDate", quantity, "givenOut", supplier, "departmentId"
      `;
      
      console.log('Created refreshment:', result);
      return { 
        message: 'Stock item added successfully!',
        data: result[0]
      };
    } catch (error) {
      console.error('Error adding refreshment:', error);
      throw error;
    }
  }

  // Public endpoint for approving requests without authentication
  @Post(':id/approve/public')
  async approveRequestPublic(
    @Param('id') requestId: string,
    @Body('reason') reason?: string,
    @Body('approverId') approverId?: string,
  ): Promise<any> {
    this.assertLegacyPublicEndpointsAllowed();
    // Use a default approver ID if not provided
    const approver = approverId || '00000000-0000-0000-0000-000000000000';
    return this.requestsService.approveRequest(requestId, approver, reason);
  }

  // Public endpoint for rejecting requests without authentication
  @Post(':id/reject/public')
  async rejectRequestPublic(
    @Param('id') requestId: string,
    @Body('reason') reason: string,
    @Body('approverId') approverId?: string,
  ): Promise<any> {
    this.assertLegacyPublicEndpointsAllowed();
    // Use a default approver ID if not provided
    const approver = approverId || '00000000-0000-0000-0000-000000000000';
    return this.requestsService.rejectRequest(requestId, approver, reason);
  }
}
