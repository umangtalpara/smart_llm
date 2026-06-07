import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { UserRole } from '../../../../../shared/types';

export type UserDocument = User & Document;

@Schema({ timestamps: true })
export class User {
  @Prop({
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    index: true,
  })
  email: string;

  @Prop({ required: true })
  passwordHash: string;

  @Prop({ required: true, trim: true })
  name: string;

  @Prop({
    type: String,
    enum: UserRole,
    default: UserRole.USER,
  })
  role: UserRole;

  @Prop({ default: false })
  isVerified: boolean;

  @Prop({ type: String, select: false })
  verificationToken?: string;

  @Prop({ type: Date, select: false })
  verificationTokenExpires?: Date;

  @Prop({ type: String, select: false })
  resetPasswordToken?: string;

  @Prop({ type: Date, select: false })
  resetPasswordExpires?: Date;

  createdAt?: Date;
  updatedAt?: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);

// Ensure index exists on email
UserSchema.index({ email: 1 }, { unique: true });
