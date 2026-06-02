import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { ProviderCode } from '../../../../../shared/types';

export type RequestLogDocument = RequestLog & Document;

@Schema({ timestamps: true })
export class RequestLog {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true, index: true })
  userId: MongooseSchema.Types.ObjectId | string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'ApiKey', index: true })
  apiKeyId?: MongooseSchema.Types.ObjectId | string;

  @Prop({ type: String, enum: ProviderCode, required: true, index: true })
  provider: ProviderCode;

  @Prop({ required: true, index: true })
  model: string;

  @Prop({ required: true })
  path: string;

  @Prop({ required: true })
  durationMs: number;

  @Prop({ required: true, index: true })
  statusCode: number;

  @Prop()
  errorMsg?: string;

  @Prop({ default: 0 })
  promptTokens?: number;

  @Prop({ default: 0 })
  completionTokens?: number;

  @Prop({ default: 0 })
  totalTokens?: number;

  @Prop({ type: [String], default: [] })
  rotatedFromKeys?: string[];

  createdAt: Date;
  updatedAt: Date;
}

export const RequestLogSchema = SchemaFactory.createForClass(RequestLog);
RequestLogSchema.index({ userId: 1, createdAt: -1 });
