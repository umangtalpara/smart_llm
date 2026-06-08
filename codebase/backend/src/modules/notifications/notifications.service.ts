import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  Notification,
  NotificationDocument,
  NotificationType,
  NotificationSeverity,
} from './schemas/notification.schema';
import { Subject } from 'rxjs';
import { filter, map } from 'rxjs/operators';

export interface MappedNotification {
  id: unknown;
  type: string;
  title: string;
  message: string;
  severity: string;
  read: boolean;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

@Injectable()
export class NotificationsService {
  private readonly notificationSubject = new Subject<{
    userId: string;
    notification: MappedNotification;
  }>();

  constructor(
    @InjectModel(Notification.name)
    private readonly notificationModel: Model<NotificationDocument>,
  ) {}

  async createNotification(dto: {
    userId: string;
    type: NotificationType;
    severity: NotificationSeverity;
    title: string;
    message: string;
    metadata?: Record<string, unknown>;
  }): Promise<NotificationDocument> {
    const notification = new this.notificationModel({
      userId: dto.userId,
      type: dto.type,
      severity: dto.severity,
      title: dto.title,
      message: dto.message,
      metadata: dto.metadata ?? {},
      read: false,
    });
    const saved = await notification.save();

    const mapped = {
      id: saved._id,
      type: saved.type,
      title: saved.title,
      message: saved.message,
      severity: saved.severity,
      read: saved.read,
      metadata: saved.metadata,
      createdAt: saved.createdAt,
    };

    // Emit event for real-time SSE stream
    this.notificationSubject.next({
      userId: dto.userId,
      notification: mapped,
    });

    return saved;
  }

  getNotificationStream(userId: string) {
    return this.notificationSubject.asObservable().pipe(
      filter((event) => event.userId === userId),
      map((event) => ({ data: event.notification })),
    );
  }

  async getNotifications(
    userId: string,
    page = 1,
    limit = 20,
    unreadOnly = false,
  ) {
    const skip = (page - 1) * limit;
    const query: Record<string, unknown> = { userId };
    if (unreadOnly) query.read = false;

    const [data, total] = await Promise.all([
      this.notificationModel
        .find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      this.notificationModel.countDocuments(query),
    ]);

    return {
      data: data.map((n) => ({
        id: n._id,
        type: n.type,
        title: n.title,
        message: n.message,
        severity: n.severity,
        read: n.read,
        metadata: n.metadata,
        createdAt: n.createdAt,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      unreadCount: await this.getUnreadCount(userId),
    };
  }

  async getUnreadCount(userId: string): Promise<number> {
    return this.notificationModel.countDocuments({ userId, read: false });
  }

  async markAsRead(userId: string, notificationId: string): Promise<void> {
    await this.notificationModel.updateOne(
      { _id: notificationId, userId },
      { $set: { read: true } },
    );
  }

  async markAllAsRead(userId: string): Promise<void> {
    await this.notificationModel.updateMany(
      { userId, read: false },
      { $set: { read: true } },
    );
  }
}
