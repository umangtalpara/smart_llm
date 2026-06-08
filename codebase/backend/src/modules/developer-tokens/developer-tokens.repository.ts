import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  DeveloperToken,
  DeveloperTokenDocument,
} from './schemas/developer-token.schema';

@Injectable()
export class DeveloperTokensRepository {
  constructor(
    @InjectModel(DeveloperToken.name)
    private readonly tokenModel: Model<DeveloperTokenDocument>,
  ) {}

  async create(
    tokenData: Partial<DeveloperToken>,
  ): Promise<DeveloperTokenDocument> {
    const newToken = new this.tokenModel(tokenData);
    return await newToken.save();
  }

  async findByHash(tokenHash: string): Promise<DeveloperTokenDocument | null> {
    return await this.tokenModel.findOne({ tokenHash, isActive: true }).exec();
  }

  async findByUser(userId: string): Promise<DeveloperTokenDocument[]> {
    return await this.tokenModel
      .find({ userId })
      .sort({ createdAt: -1 })
      .exec();
  }

  async findById(id: string): Promise<DeveloperTokenDocument | null> {
    return await this.tokenModel.findById(id).exec();
  }

  async delete(id: string): Promise<DeveloperTokenDocument | null> {
    return await this.tokenModel.findByIdAndDelete(id).exec();
  }

  async updateLastUsed(id: string): Promise<void> {
    await this.tokenModel
      .findByIdAndUpdate(id, { $set: { lastUsedAt: new Date() } })
      .exec();
  }
}
