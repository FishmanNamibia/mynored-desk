import { Controller, Get, Post, Put, Delete, Param, Body, Query, UseGuards, Req } from '@nestjs/common';
import { AdminRequestsService, RequestApprovalDto } from './admin-requests.service';
import { SessionGuard } from '../auth/guards/session.guard';
import { AddRefreshmentStockDto } from './dto/add-refreshment-stock.dto';
import { AddITEquipmentDto } from './dto/add-it-equipment.dto';

@Controller('admin/requests')
export class AdminRequestsController {
  constructor(private readonly adminRequestsService: AdminRequestsService) {}
  
  // In-memory storage for newly added items (demo purposes)
  private newlyAddedItems: any[] = [];

  @Get()
  @UseGuards(SessionGuard)
  async getAllRequests(@Req() req: any) {
    const userRole = req.user?.jobTitle || '';
    return this.adminRequestsService.getAllRequestsForAdmin(userRole);
  }

  @Get('counts')
  @UseGuards(SessionGuard)
  async getRequestCounts(@Req() req: any) {
    const userRole = req.user?.jobTitle || '';
    return this.adminRequestsService.getRequestCounts(userRole);
  }

  @Post(':id/approve')
  @UseGuards(SessionGuard)
  async approveRequest(
    @Param('id') requestId: string,
    @Body() approvalData: RequestApprovalDto,
    @Req() req: any
  ) {
    const adminId = req.user.sub;
    return this.adminRequestsService.approveRequest(requestId, adminId, approvalData);
  }

  @Get('stock/refreshments')
  @UseGuards(SessionGuard)
  async getRefreshmentStock() {
    return this.adminRequestsService.getRefreshmentStock();
  }

  @Post('stock/refreshments/:id/update')
  @UseGuards(SessionGuard)
  async updateRefreshmentStock(
    @Param('id') stockId: string,
    @Body() body: { quantity: number; operation: 'ADD' | 'REMOVE' }
  ) {
    return this.adminRequestsService.updateRefreshmentStock(stockId, body.quantity, body.operation);
  }

  @Get('stock/alerts')
  @UseGuards(SessionGuard)
  async getLowStockAlerts() {
    return this.adminRequestsService.getLowStockAlerts();
  }

  @Get('inventory/all')
  @UseGuards(SessionGuard)
  async getAllInventory(@Req() req: any) {
    const userRole = req.user?.jobTitle || '';
    return this.adminRequestsService.getAllInventory();
  }

  @Post('inventory/refreshment')
  @UseGuards(SessionGuard)
  async addRefreshmentStock(@Body() addRefreshmentStockDto: AddRefreshmentStockDto) {
    return this.adminRequestsService.addRefreshmentStock(addRefreshmentStockDto);
  }

  @Post('inventory/it-equipment')
  @UseGuards(SessionGuard)
  async addITEquipment(@Body() addITEquipmentDto: AddITEquipmentDto) {
    return this.adminRequestsService.addITEquipment(addITEquipmentDto);
  }

  // Temporary compatibility endpoint (now authenticated)
  @Get('inventory/public')
  @UseGuards(SessionGuard)
  async getAllInventoryPublic() {
    // Read from actual database instead of mock data
    // TODO: Remove this endpoint once authentication is properly set up
    const refreshments = await this.adminRequestsService.getAllInventory();
    return refreshments;
  }

  // Temporary compatibility endpoint (now authenticated)
  @Post('inventory/public/add')
  @UseGuards(SessionGuard)
  async addRefreshmentStockPublic(@Body() addRefreshmentStockDto: AddRefreshmentStockDto) {
    try {
      console.log('Received DTO:', addRefreshmentStockDto);
      
      // Use real database service instead of in-memory storage
      return this.adminRequestsService.addRefreshmentStock(addRefreshmentStockDto);
    } catch (error) {
      console.error('Error adding refreshment stock:', error);
      throw error;
    }
  }

  @Delete('inventory/:id')
  @UseGuards(SessionGuard)
  async softDeleteInventoryItem(@Param('id') id: string) {
    try {
      await this.adminRequestsService.softDeleteRefreshment(id);
      return { message: 'Item deleted successfully' };
    } catch (error) {
      console.error('Error deleting inventory item:', error);
      throw error;
    }
  }

  @Put('inventory/:id')
  @UseGuards(SessionGuard)
  async updateInventoryItem(@Param('id') id: string, @Body() updateData: any) {
    try {
      await this.adminRequestsService.updateRefreshment(id, updateData);
      return { message: 'Item updated successfully' };
    } catch (error) {
      console.error('Error updating inventory item:', error);
      throw error;
    }
  }

  // Test database connection
  @Get('inventory/test-db')
  @UseGuards(SessionGuard)
  async testDatabase() {
    try {
      const count = await this.adminRequestsService.testDbConnection();
      return { message: 'Database connection successful', count };
    } catch (error) {
      console.error('Database test failed:', error);
      return { message: 'Database connection failed', error: error instanceof Error ? error.message : String(error) };
    }
  }
}
