import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
} from "@nestjs/common";
import { NotificationsService } from "./notifications.service";
import { SessionGuard } from "../auth/guards/session.guard";

@Controller("notifications")
@UseGuards(SessionGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  async findAll(@Query() query: any, @Req() req: any) {
    const userId = req.user?.userId || req.user?.sub;
    return this.notificationsService.findAllForUser(userId, query);
  }

  @Get("count")
  async getCount(@Req() req: any) {
    const userId = req.user?.userId || req.user?.sub;
    return this.notificationsService.getUnreadCount(userId);
  }

  @Post()
  async create(@Body() body: any, @Req() req: any) {
    const senderId = req.user?.userId || req.user?.sub;
    return this.notificationsService.create({ ...body, senderId });
  }

  @Patch(":id/read")
  async markAsRead(@Param("id") id: string, @Req() req: any) {
    const userId = req.user?.userId || req.user?.sub;
    return this.notificationsService.markAsRead(id, userId);
  }

  @Patch("read-all")
  async markAllAsRead(@Req() req: any) {
    const userId = req.user?.userId || req.user?.sub;
    return this.notificationsService.markAllAsRead(userId);
  }

  @Delete(":id")
  async delete(@Param("id") id: string, @Req() req: any) {
    const userId = req.user?.userId || req.user?.sub;
    return this.notificationsService.delete(id, userId);
  }
}
