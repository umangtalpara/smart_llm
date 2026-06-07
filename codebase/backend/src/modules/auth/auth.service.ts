import { Injectable, UnauthorizedException, BadRequestException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { UsersRepository } from '../users/users.repository';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { MailService } from '../mail/mail.service';
import { RedisService } from '../../cache/redis.service';
import { JwtPayload } from './interfaces/jwt-payload.interface';
import { UserRole } from '../../../../shared/types';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly bcryptSaltRounds = 12;

  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly redisService: RedisService,
    private readonly mailService: MailService,
  ) {}

  async register(dto: RegisterDto) {
    const passwordHash = await bcrypt.hash(dto.password, this.bcryptSaltRounds);
    
    const user = await this.usersRepository.create({
      email: dto.email,
      name: dto.name,
      passwordHash,
      role: UserRole.USER,
      isVerified: false,
    });

    const tokens = await this.generateTokens(user.id, user.email, user.role);
    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        isVerified: user.isVerified,
      },
      ...tokens,
    };
  }

  async login(dto: LoginDto) {
    const user = await this.usersRepository.findByEmailWithSecrets(dto.email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const tokens = await this.generateTokens(user.id, user.email, user.role);
    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        isVerified: user.isVerified,
      },
      ...tokens,
    };
  }

  async refresh(refreshToken: string) {
    try {
      const secret = this.configService.get<string>('JWT_SECRET');
      const payload: JwtPayload = await this.jwtService.verifyAsync(refreshToken, { secret });

      // Retrieve stored refresh token from Redis
      const redisKey = `user:${payload.sub}:refresh_token`;
      const storedToken = await this.redisService.get(redisKey);

      if (!storedToken) {
        throw new UnauthorizedException('Session has expired. Please log in again.');
      }

      if (storedToken !== refreshToken) {
        // Detect possible token reuse/theft attack!
        await this.redisService.del(redisKey); // Revoke session completely
        this.logger.warn(`Refresh token reuse detected for user ${payload.sub}. Revoking all sessions.`);
        throw new UnauthorizedException('Access denied. Security breach detected.');
      }

      // Check if user still exists
      const user = await this.usersRepository.findById(payload.sub);
      if (!user) {
        throw new UnauthorizedException('User no longer exists.');
      }

      // Rotate tokens
      const tokens = await this.generateTokens(user.id, user.email, user.role);
      return tokens;
    } catch (error: unknown) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Invalid refresh token.');
    }
  }

  async logout(userId: string) {
    const redisKey = `user:${userId}:refresh_token`;
    await this.redisService.del(redisKey);
    return { success: true, message: 'Logged out successfully' };
  }

  private async generateTokens(userId: string, email: string, role: UserRole) {
    const payload: JwtPayload = { sub: userId, email, role };

    const accessToken = await this.jwtService.signAsync(payload, {
      expiresIn: (this.configService.get<string>('JWT_ACCESS_EXPIRY') || '15m') as unknown as number,
    });

    const refreshToken = await this.jwtService.signAsync(payload, {
      expiresIn: (this.configService.get<string>('JWT_REFRESH_EXPIRY') || '7d') as unknown as number,
    });

    // Store refresh token in Redis with a 7-day expiry (matching refresh token default)
    const redisKey = `user:${userId}:refresh_token`;
    const sevenDaysInSeconds = 7 * 24 * 60 * 60;
    await this.redisService.setWithTtl(redisKey, refreshToken, sevenDaysInSeconds);

    return {
      accessToken,
      refreshToken,
    };
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.usersRepository.findByEmail(dto.email);
    if (!user) {
      // Return success even if email is not found to prevent user enumeration
      this.logger.log(`Forgot password request for non-existent email: ${dto.email}`);
      return { success: true, message: 'If the email exists, a reset link has been sent.' };
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date();
    expires.setHours(expires.getHours() + 1); // token expires in 1 hour

    await this.usersRepository.updateResetToken(user.id, token, expires);

    try {
      await this.mailService.sendResetPasswordEmail(user.email, user.name, token);
    } catch (error) {
      // Clean up token if email fails to send
      await this.usersRepository.updateResetToken(user.id, null, null);
      throw error;
    }

    return { success: true, message: 'Password reset email sent.' };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const user = await this.usersRepository.findByResetToken(dto.token);
    if (!user) {
      throw new BadRequestException('Invalid or expired password reset token.');
    }

    const passwordHash = await bcrypt.hash(dto.password, this.bcryptSaltRounds);
    await this.usersRepository.updatePassword(user.id, passwordHash);

    return { success: true, message: 'Password successfully reset.' };
  }
}
