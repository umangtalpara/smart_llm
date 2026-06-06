import { Injectable, UnauthorizedException, NotFoundException } from '@nestjs/common';
import * as crypto from 'crypto';
import { DeveloperTokensRepository } from './developer-tokens.repository';
import { UsersRepository } from '../users/users.repository';
import { DeveloperTokenDocument } from './schemas/developer-token.schema';
import { UserDocument } from '../users/schemas/user.schema';

@Injectable()
export class DeveloperTokensService {
  constructor(
    private readonly tokenRepository: DeveloperTokensRepository,
    private readonly usersRepository: UsersRepository,
  ) {}

  async generateToken(
    userId: string,
    name: string,
  ): Promise<{ rawToken: string; token: DeveloperTokenDocument }> {
    // Generate secure random key
    const randomHex = crypto.randomBytes(24).toString('hex');
    const rawToken = `sk_live_${randomHex}`;

    // Hash token using SHA-256 for secure storage
    const tokenHash = this.hashToken(rawToken);

    // Create mask (e.g. sk_live_...4a2c)
    const tokenMask = `sk_live_...${rawToken.slice(-6)}`;

    const token = await this.tokenRepository.create({
      userId,
      name,
      tokenHash,
      tokenMask,
      isActive: true,
    });

    return { rawToken, token };
  }

  async listTokens(userId: string): Promise<DeveloperTokenDocument[]> {
    return await this.tokenRepository.findByUser(userId);
  }

  async revokeToken(userId: string, tokenId: string): Promise<void> {
    const token = await this.tokenRepository.findById(tokenId);
    if (!token || token.userId.toString() !== userId) {
      throw new NotFoundException('Developer token not found');
    }
    await this.tokenRepository.delete(tokenId);
  }

  async validateToken(rawToken: string): Promise<UserDocument> {
    const tokenHash = this.hashToken(rawToken);
    const token = await this.tokenRepository.findByHash(tokenHash);
    
    if (!token) {
      throw new UnauthorizedException('Invalid or expired developer token');
    }

    const user = await this.usersRepository.findById(token.userId.toString());
    if (!user) {
      throw new UnauthorizedException('User associated with token not found');
    }

    // Update last used timestamp in background
    await this.tokenRepository.updateLastUsed(token.id);

    return user;
  }

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }
}
