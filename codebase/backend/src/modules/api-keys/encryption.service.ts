import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

@Injectable()
export class EncryptionService {
  private readonly logger = new Logger(EncryptionService.name);
  private readonly algorithm = 'aes-256-gcm';
  private readonly key: Buffer;

  constructor(private readonly configService: ConfigService) {
    const rawKey = this.configService.get<string>('ENCRYPTION_KEY');
    if (!rawKey || rawKey.length !== 32) {
      throw new Error('ENCRYPTION_KEY must be exactly 32 characters long');
    }
    this.key = Buffer.from(rawKey, 'utf8');
  }

  encrypt(text: string): string {
    try {
      const iv = crypto.randomBytes(12); // 96-bit IV is standard for GCM
      const cipher = crypto.createCipheriv(this.algorithm, this.key, iv);
      
      let encrypted = cipher.update(text, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      const authTag = cipher.getAuthTag().toString('hex');
      
      // Combine IV, AuthTag and Encrypted Data
      return `${iv.toString('hex')}:${authTag}:${encrypted}`;
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      this.logger.error(`Encryption failed: ${errMsg}`);
      throw new Error('Failed to encrypt secret key');
    }
  }

  decrypt(encryptedText: string): string {
    try {
      const parts = encryptedText.split(':');
      if (parts.length !== 3) {
        throw new Error('Invalid encrypted format');
      }

      const iv = Buffer.from(parts[0]!, 'hex');
      const authTag = Buffer.from(parts[1]!, 'hex');
      const encryptedData = parts[2]!;

      const decipher = crypto.createDecipheriv(this.algorithm, this.key, iv);
      decipher.setAuthTag(authTag);

      let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      this.logger.error(`Decryption failed: ${errMsg}`);
      throw new Error('Failed to decrypt secret key');
    }
  }
}
