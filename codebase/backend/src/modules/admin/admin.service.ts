import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { UsersRepository } from '../users/users.repository';
import { ProvidersService } from '../providers/providers.service';
import { UsageStat, UsageStatDocument } from '../monitor/schemas/usage-stat.schema';
import { ApiKey, ApiKeyDocument } from '../api-keys/schemas/api-key.schema';
import { KeyStatus, ProviderCode, UserRole } from '../../../../shared/types';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly providersService: ProvidersService,
    @InjectModel(UsageStat.name) private readonly usageStatModel: Model<UsageStatDocument>,
    @InjectModel(ApiKey.name) private readonly apiKeyModel: Model<ApiKeyDocument>,
  ) {}

  async getUsers(page = 1, limit = 20) {
    const [users, total] = await Promise.all([
      this.usersRepository.findPaginated(page, limit),
      this.usersRepository.countAll(),
    ]);

    // Aggregate requests per user to display in admin directory
    const stats = await this.usageStatModel.aggregate([
      {
        $group: {
          _id: '$userId',
          totalRequests: { $sum: '$requestCount' },
        },
      },
    ]);

    const statsMap = new Map<string, number>(
      stats.map((s) => [s._id.toString(), s.totalRequests]),
    );

    const data = users.map((user) => ({
      id: user._id,
      email: user.email,
      name: user.name,
      role: user.role,
      isVerified: user.isVerified,
      createdAt: user.createdAt,
      totalRequests: statsMap.get(user._id.toString()) || 0,
    }));

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async updateUserRole(id: string, role: UserRole) {
    this.logger.log(`Admin updating role of user ${id} to ${role}`);
    const updated = await this.usersRepository.update(id, { role });
    if (!updated) {
      throw new Error('User not found');
    }
    return {
      id: updated._id,
      email: updated.email,
      name: updated.name,
      role: updated.role,
      isVerified: updated.isVerified,
    };
  }

  async getSystemStats(days = 30) {
    // 1. Fetch total keys and active keys count system-wide
    const [totalKeys, activeKeys] = await Promise.all([
      this.apiKeyModel.countDocuments({}),
      this.apiKeyModel.countDocuments({ status: KeyStatus.ACTIVE }),
    ]);

    // 2. Fetch system-wide usage aggregates
    const systemAggregates = await this.usageStatModel.aggregate([
      {
        $group: {
          _id: null,
          totalRequests: { $sum: '$requestCount' },
          totalSuccess: { $sum: '$successCount' },
          totalTokens: { $sum: '$totalTokens' },
          latencySumMs: { $sum: '$latencySumMs' },
        },
      },
    ]);

    const aggregates = systemAggregates[0] || {
      totalRequests: 0,
      totalSuccess: 0,
      totalTokens: 0,
      latencySumMs: 0,
    };

    const successRate =
      aggregates.totalRequests > 0
        ? Math.round((aggregates.totalSuccess / aggregates.totalRequests) * 100)
        : 100;

    const avgLatencyMs =
      aggregates.totalSuccess > 0
        ? Math.round(aggregates.latencySumMs / aggregates.totalSuccess)
        : 0;

    // 3. Fetch system-wide daily aggregate chart data
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    const dateLimitStr = cutoffDate.toISOString().split('T')[0]!;

    const dailyStats = await this.usageStatModel.aggregate([
      { $match: { date: { $gte: dateLimitStr } } },
      {
        $group: {
          _id: '$date',
          date: { $first: '$date' },
          requests: { $sum: '$requestCount' },
          success: { $sum: '$successCount' },
          failed: { $sum: '$failCount' },
          tokens: { $sum: '$totalTokens' },
          latencySumMs: { $sum: '$latencySumMs' },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const chartData = dailyStats.map((stat) => ({
      date: stat.date,
      requests: stat.requests,
      success: stat.success,
      failed: stat.failed,
      tokens: stat.tokens,
      avgLatencyMs: stat.success > 0 ? Math.round(stat.latencySumMs / stat.success) : 0,
    }));

    return {
      metrics: {
        totalRequests: aggregates.totalRequests,
        successRate,
        totalKeys,
        activeKeys,
        totalTokens: aggregates.totalTokens,
        avgLatencyMs,
      },
      chartData,
    };
  }

  async getProviders() {
    return this.providersService.getAllProviders();
  }

  async updateProviderStatus(provider: ProviderCode, status: 'active' | 'inactive') {
    return this.providersService.updateProviderStatus(provider, status);
  }
}
