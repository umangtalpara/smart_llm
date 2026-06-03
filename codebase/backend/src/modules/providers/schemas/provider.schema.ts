import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { ProviderCode } from '../../../../../shared/types';

export type ProviderDocument = Provider & Document;

@Schema({ timestamps: true })
export class Provider {
  @Prop({ required: true })
  name: string;

  @Prop({ type: String, required: true, unique: true, enum: ProviderCode, index: true })
  code: ProviderCode;

  @Prop({ required: true, default: 'active', enum: ['active', 'inactive'] })
  status: 'active' | 'inactive';

  @Prop({ required: true, default: 0 })
  defaultRpmLimit: number;

  @Prop({ required: true, default: 0 })
  defaultTpmLimit: number;
}

export const ProviderSchema = SchemaFactory.createForClass(Provider);
