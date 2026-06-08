import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type NotificationDocument = Notification & Document;

export enum NotificationType {
  KEY_EXHAUSTED = 'key_exhausted',
  HIGH_ERROR_RATE = 'high_error_rate',
  PROVIDER_DOWN = 'provider_down',
  KEY_COOLDOWN = 'key_cooldown',
}

export enum NotificationSeverity {
  INFO = 'info',
  WARNING = 'warning',
  CRITICAL = 'critical',
}

@Schema({ timestamps: true })
export class Notification {
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  })
  userId: MongooseSchema.Types.ObjectId | string;

  @Prop({ required: true, enum: NotificationType })
  type: NotificationType;

  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  message: string;

  @Prop({
    required: true,
    enum: NotificationSeverity,
    default: NotificationSeverity.INFO,
  })
  severity: NotificationSeverity;

  @Prop({ default: false, index: true })
  read: boolean;

  @Prop({ type: MongooseSchema.Types.Mixed, default: {} })
  metadata: Record<string, unknown>;

  createdAt: Date;
  updatedAt: Date;
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);

// Compound indexes for fast unread badge queries and paginated inbox
NotificationSchema.index({ userId: 1, read: 1, createdAt: -1 });
NotificationSchema.index({ userId: 1, createdAt: -1 });
