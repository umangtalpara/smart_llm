import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type DeveloperTokenDocument = DeveloperToken & Document;

@Schema({
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class DeveloperToken {
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  })
  userId: MongooseSchema.Types.ObjectId | string;

  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true, unique: true, index: true })
  tokenHash: string;

  @Prop({ required: true })
  tokenMask: string; // e.g., sk_live_...xxxx

  @Prop({ required: true })
  encryptedToken: string;

  @Prop({ type: Boolean, default: true, index: true })
  isActive: boolean;

  @Prop({ type: Date })
  lastUsedAt?: Date;
}

export const DeveloperTokenSchema = SchemaFactory.createForClass(DeveloperToken);

// Compound index for fast queries by user and creation date
DeveloperTokenSchema.index({ userId: 1, createdAt: -1 });
