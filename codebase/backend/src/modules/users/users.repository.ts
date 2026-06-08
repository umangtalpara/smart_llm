import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from './schemas/user.schema';

@Injectable()
export class UsersRepository {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
  ) {}

  async create(user: Partial<User>): Promise<UserDocument> {
    const newUser = new this.userModel(user);
    return await newUser.save();
  }

  async findByEmail(email: string): Promise<UserDocument | null> {
    return await this.userModel.findOne({ email }).exec();
  }

  async findByEmailWithSecrets(email: string): Promise<UserDocument | null> {
    // Manually select passwordHash and other hidden fields for authentication purposes
    return await this.userModel
      .findOne({ email })
      .select('+passwordHash +verificationToken +verificationTokenExpires')
      .exec();
  }

  async findById(id: string): Promise<UserDocument | null> {
    return await this.userModel.findById(id).exec();
  }

  async update(
    id: string,
    updates: Partial<User>,
  ): Promise<UserDocument | null> {
    return await this.userModel
      .findByIdAndUpdate(id, updates, { new: true })
      .exec();
  }

  async findByVerificationToken(token: string): Promise<UserDocument | null> {
    return await this.userModel
      .findOne({
        verificationToken: token,
        verificationTokenExpires: { $gt: new Date() },
      })
      .exec();
  }

  async findPaginated(page: number, limit: number): Promise<UserDocument[]> {
    const skip = (page - 1) * limit;
    return await this.userModel
      .find({})
      .select('-passwordHash -verificationToken -verificationTokenExpires')
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 })
      .exec();
  }

  async countAll(): Promise<number> {
    return await this.userModel.countDocuments({}).exec();
  }

  async findByResetToken(token: string): Promise<UserDocument | null> {
    return await this.userModel
      .findOne({
        resetPasswordToken: token,
        resetPasswordExpires: { $gt: new Date() },
      })
      .select('+passwordHash +resetPasswordToken +resetPasswordExpires')
      .exec();
  }

  async updateResetToken(
    userId: string,
    token: string | null,
    expires: Date | null,
  ): Promise<UserDocument | null> {
    return await this.userModel
      .findByIdAndUpdate(
        userId,
        { resetPasswordToken: token, resetPasswordExpires: expires },
        { new: true },
      )
      .exec();
  }

  async updatePassword(
    userId: string,
    passwordHash: string,
  ): Promise<UserDocument | null> {
    return await this.userModel
      .findByIdAndUpdate(
        userId,
        {
          passwordHash,
          resetPasswordToken: null,
          resetPasswordExpires: null,
        },
        { new: true },
      )
      .exec();
  }
}
