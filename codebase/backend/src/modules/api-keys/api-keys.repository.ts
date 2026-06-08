import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ApiKey, ApiKeyDocument } from './schemas/api-key.schema';
import { KeyStatus, ProviderCode } from '../../../../shared/types';

@Injectable()
export class ApiKeysRepository {
  constructor(
    @InjectModel(ApiKey.name)
    private readonly apiKeyModel: Model<ApiKeyDocument>,
  ) {}

  async create(keyData: Partial<ApiKey>): Promise<ApiKeyDocument> {
    const newKey = new this.apiKeyModel(keyData);
    return await newKey.save();
  }

  async findById(id: string): Promise<ApiKeyDocument | null> {
    return await this.apiKeyModel.findById(id).exec();
  }

  async findByUser(userId: string): Promise<ApiKeyDocument[]> {
    return await this.apiKeyModel
      .find({ userId })
      .sort({ createdAt: -1 })
      .exec();
  }

  async update(
    id: string,
    updates: Partial<ApiKey>,
  ): Promise<ApiKeyDocument | null> {
    return await this.apiKeyModel
      .findByIdAndUpdate(id, updates, { new: true })
      .exec();
  }

  async delete(id: string): Promise<ApiKeyDocument | null> {
    return await this.apiKeyModel.findByIdAndDelete(id).exec();
  }

  async findActiveKeys(
    userId: string,
    provider: ProviderCode,
    group?: string,
  ): Promise<ApiKeyDocument[]> {
    const query: any = {
      userId,
      provider,
      status: KeyStatus.ACTIVE,
    };

    if (group) {
      query.group = group;
    }

    // Sort by priority descending (highest first), then successCount descending, then createdAt ascending
    return await this.apiKeyModel
      .find(query)
      .sort({ priority: -1, successCount: -1, createdAt: 1 })
      .exec();
  }
}
