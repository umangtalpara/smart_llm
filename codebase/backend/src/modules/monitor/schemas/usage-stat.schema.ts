import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type UsageStatDocument = UsageStat & Document;

@Schema({ timestamps: true })
export class UsageStat {
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  })
  userId: MongooseSchema.Types.ObjectId | string;

  @Prop({ required: true, index: true })
  date: string; // YYYY-MM-DD

  @Prop({ default: 0 })
  requestCount: number;

  @Prop({ default: 0 })
  successCount: number;

  @Prop({ default: 0 })
  failCount: number;

  @Prop({ default: 0 })
  totalTokens: number;

  @Prop({ default: 0 })
  latencySumMs: number;

  createdAt: Date;
  updatedAt: Date;
}

export const UsageStatSchema = SchemaFactory.createForClass(UsageStat);
UsageStatSchema.index({ userId: 1, date: 1 }, { unique: true });
