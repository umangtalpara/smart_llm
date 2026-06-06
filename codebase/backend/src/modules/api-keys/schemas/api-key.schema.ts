import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { KeyStatus, ProviderCode } from '../../../../../shared/types';
import { User } from '../../users/schemas/user.schema';

export type ApiKeyDocument = ApiKey & Document;

@Schema({
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class ApiKey {
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  })
  userId: MongooseSchema.Types.ObjectId | string;

  @Prop({
    type: String,
    enum: ProviderCode,
    required: true,
    index: true,
  })
  provider: ProviderCode;

  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true })
  encryptedKey: string;

  @Prop({ required: true })
  keyMask: string; // Stored as plain text mask (e.g. sk-proj-...xxxx) for safety

  @Prop({
    type: String,
    enum: KeyStatus,
    default: KeyStatus.ACTIVE,
    index: true,
  })
  status: KeyStatus;

  @Prop({ default: 0 })
  dailyLimit: number; // 0 for unlimited

  @Prop({ default: 0 })
  rpmLimit: number; // 0 for unlimited

  @Prop({ default: 0 })
  tpmLimit: number; // 0 for unlimited

  @Prop({ default: 1, index: true })
  priority: number; // Default 1, higher gets chosen first

  @Prop({ type: [String], default: [] })
  tags: string[];

  @Prop({ trim: true, index: true })
  group?: string;

  @Prop({ type: Date, index: true })
  cooldownUntil?: Date;

  @Prop({ default: 0 })
  successCount: number;

  @Prop({ default: 0 })
  errorCount: number;

  @Prop({ type: Date })
  lastUsedAt?: Date;
}

export const ApiKeySchema = SchemaFactory.createForClass(ApiKey);

// Add compound indexes for rapid key query selections
ApiKeySchema.index({ userId: 1, provider: 1, status: 1, priority: -1 });
ApiKeySchema.index({ userId: 1, group: 1, status: 1 });
