import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { RequestLog, RequestLogDocument } from '../schemas/request-log.schema';
import { UsageStat, UsageStatDocument } from '../schemas/usage-stat.schema';
import { Logger } from '@nestjs/common';

@Processor('request-logs')
export class LogProcessor extends WorkerHost {
  private readonly logger = new Logger(LogProcessor.name);

  constructor(
    @InjectModel(RequestLog.name)
    private readonly requestLogModel: Model<RequestLogDocument>,
    @InjectModel(UsageStat.name)
    private readonly usageStatModel: Model<UsageStatDocument>,
  ) {
    super();
  }

  async process(
    job: Job<Record<string, unknown>, unknown, string>,
  ): Promise<void> {
    const userId = job.data.userId as string | undefined;
    const apiKeyId = job.data.apiKeyId as string | undefined;
    const provider = job.data.provider as string | undefined;
    const model = job.data.model as string | undefined;
    const path = job.data.path as string | undefined;
    const durationMs = job.data.durationMs as number | undefined;
    const statusCode = job.data.statusCode as number | undefined;
    const errorMsg = job.data.errorMsg as string | undefined;
    const promptTokens = job.data.promptTokens as number | undefined;
    const completionTokens = job.data.completionTokens as number | undefined;
    const totalTokens = job.data.totalTokens as number | undefined;
    const rotatedFromKeys = job.data.rotatedFromKeys as string[] | undefined;

    if (!userId || statusCode === undefined) return;

    try {
      // 1. Save RequestLog
      const log = new this.requestLogModel({
        userId,
        apiKeyId: apiKeyId || undefined,
        provider,
        model,
        path,
        durationMs,
        statusCode,
        errorMsg: errorMsg || undefined,
        promptTokens: promptTokens || 0,
        completionTokens: completionTokens || 0,
        totalTokens: totalTokens || 0,
        rotatedFromKeys: rotatedFromKeys || [],
      });
      await log.save();

      // 2. Aggregate Daily UsageStat
      const isSuccess = statusCode >= 200 && statusCode < 300;
      const dateStr = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

      await this.usageStatModel.updateOne(
        { userId, date: dateStr },
        {
          $inc: {
            requestCount: 1,
            successCount: isSuccess ? 1 : 0,
            failCount: isSuccess ? 0 : 1,
            totalTokens: totalTokens || 0,
            latencySumMs: isSuccess ? durationMs || 0 : 0,
          },
        },
        { upsert: true },
      );
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      const errStack = err instanceof Error ? err.stack : undefined;
      this.logger.error(
        `Failed to process request log job ${job.id}: ${errMsg}`,
        errStack,
      );
      throw err;
    }
  }
}
