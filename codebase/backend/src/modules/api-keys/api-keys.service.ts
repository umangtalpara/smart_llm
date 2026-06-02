import { Injectable, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { ApiKeysRepository } from './api-keys.repository';
import { EncryptionService } from './encryption.service';
import { CreateApiKeyDto } from './dto/create-api-key.dto';
import { UpdateApiKeyDto } from './dto/update-api-key.dto';
import { ApiKey, ApiKeyDocument } from './schemas/api-key.schema';
import { KeyStatus } from '../../../../shared/types';

@Injectable()
export class ApiKeysService {
  private readonly logger = new Logger(ApiKeysService.name);

  constructor(
    private readonly apiKeysRepository: ApiKeysRepository,
    private readonly encryptionService: EncryptionService,
  ) {}

  async create(userId: string, dto: CreateApiKeyDto): Promise<ApiKeyDocument> {
    const encryptedKey = this.encryptionService.encrypt(dto.apiKey);
    const keyMask = this.generateKeyMask(dto.provider, dto.apiKey);

    const apiKeyData: Partial<ApiKey> = {
      userId,
      provider: dto.provider,
      name: dto.name,
      encryptedKey,
      keyMask,
      status: KeyStatus.ACTIVE,
      dailyLimit: dto.dailyLimit || 0,
      rpmLimit: dto.rpmLimit || 0,
      tpmLimit: dto.tpmLimit || 0,
      priority: dto.priority || 1,
      tags: dto.tags || [],
      group: dto.group,
    };

    return await this.apiKeysRepository.create(apiKeyData);
  }

  async findAll(userId: string): Promise<ApiKeyDocument[]> {
    const keys = await this.apiKeysRepository.findByUser(userId);
    // Exclude encryptedKey from returned objects for absolute security
    return keys.map((key) => this.stripSecret(key));
  }

  async findOne(userId: string, id: string): Promise<ApiKeyDocument> {
    const key = await this.apiKeysRepository.findById(id);
    if (!key) {
      throw new NotFoundException('API Key not found');
    }

    if (key.userId.toString() !== userId) {
      throw new ForbiddenException('You do not own this API Key');
    }

    return this.stripSecret(key);
  }

  async update(userId: string, id: string, dto: UpdateApiKeyDto): Promise<ApiKeyDocument> {
    const key = await this.apiKeysRepository.findById(id);
    if (!key) {
      throw new NotFoundException('API Key not found');
    }

    if (key.userId.toString() !== userId) {
      throw new ForbiddenException('You do not own this API Key');
    }

    const updates: Partial<ApiKey> = {
      name: dto.name,
      status: dto.status,
      dailyLimit: dto.dailyLimit,
      rpmLimit: dto.rpmLimit,
      tpmLimit: dto.tpmLimit,
      priority: dto.priority,
      tags: dto.tags,
      group: dto.group,
    };

    if (dto.apiKey) {
      updates.encryptedKey = this.encryptionService.encrypt(dto.apiKey);
      updates.keyMask = this.generateKeyMask(key.provider, dto.apiKey);
    }

    const updatedKey = await this.apiKeysRepository.update(id, updates);
    return this.stripSecret(updatedKey!);
  }

  async delete(userId: string, id: string): Promise<{ success: boolean; message: string }> {
    const key = await this.apiKeysRepository.findById(id);
    if (!key) {
      throw new NotFoundException('API Key not found');
    }

    if (key.userId.toString() !== userId) {
      throw new ForbiddenException('You do not own this API Key');
    }

    await this.apiKeysRepository.delete(id);
    return { success: true, message: 'API Key successfully deleted' };
  }

  // Get raw unencrypted key (only internally consumed by Smart Rotation / Proxy engines!)
  async getDecryptedKeyValue(userId: string, id: string): Promise<string> {
    const key = await this.apiKeysRepository.findById(id);
    if (!key) {
      throw new NotFoundException('API Key not found');
    }

    if (key.userId.toString() !== userId) {
      throw new ForbiddenException('Access denied');
    }

    return this.encryptionService.decrypt(key.encryptedKey);
  }

  private generateKeyMask(provider: string, rawKey: string): string {
    const prefix = rawKey.substring(0, 7);
    const suffix = rawKey.substring(rawKey.length - 4);
    return `${provider.toLowerCase()}:${prefix}...${suffix}`;
  }

  private stripSecret(keyDocument: ApiKeyDocument): ApiKeyDocument {
    const keyObj = keyDocument.toObject();
    delete keyObj.encryptedKey;
    return keyObj as ApiKeyDocument;
  }
}
