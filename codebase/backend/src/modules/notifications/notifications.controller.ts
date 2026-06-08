import {
  Controller,
  Get,
  Patch,
  Query,
  Param,
  UseGuards,
  Sse,
  MessageEvent,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { GetUser } from '../../common/decorators/get-user.decorator';
import { Observable } from 'rxjs';

@ApiTags('Notifications')
@Controller('notifications')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Sse('sse')
  @ApiOperation({ summary: 'Stream real-time notifications' })
  @ApiResponse({
    status: 200,
    description: 'Real-time Server-Sent Events stream',
  })
  sse(@GetUser('id') userId: string): Observable<MessageEvent> {
    return this.notificationsService.getNotificationStream(userId);
  }

  @Get()
  @ApiOperation({ summary: 'Get paginated notifications inbox' })
  @ApiResponse({
    status: 200,
    description: 'Paginated notification list returned',
  })
  async getNotifications(
    @GetUser('id') userId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('unreadOnly') unreadOnly?: string,
  ) {
    return this.notificationsService.getNotifications(
      userId,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
      unreadOnly === 'true',
    );
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Get count of unread notifications for bell badge' })
  @ApiResponse({ status: 200, description: '{ count: number }' })
  async getUnreadCount(@GetUser('id') userId: string) {
    const count = await this.notificationsService.getUnreadCount(userId);
    return { count };
  }

  @Patch('read-all')
  @ApiOperation({ summary: 'Mark all notifications as read' })
  @ApiResponse({ status: 200, description: 'All notifications marked read' })
  async markAllAsRead(@GetUser('id') userId: string) {
    await this.notificationsService.markAllAsRead(userId);
    return { success: true };
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Mark a single notification as read' })
  @ApiResponse({ status: 200, description: 'Notification marked read' })
  async markAsRead(
    @GetUser('id') userId: string,
    @Param('id') notificationId: string,
  ) {
    await this.notificationsService.markAsRead(userId, notificationId);
    return { success: true };
  }
}
