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
    @InjectModel(RequestLog.name) private readonly requestLogModel: Model<RequestLogDocument>,
    @InjectModel(UsageStat.name) private readonly usageStatModel: Model<UsageStatDocument>,
  ) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<any> {
    const {
      userId,
      apiKeyId,
      provider,
      model,
      path,
      durationMs,
      statusCode,
      errorMsg,
      promptTokens,
      completionTokens,
      totalTokens,
      rotatedFromKeys,
    } = job.data;

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
      const dateStr = new Date().toISOString().split('T')[0]!; // YYYY-MM-DD

      await this.usageStatModel.updateOne(
        { userId, date: dateStr },
        {
          $inc: {
            requestCount: 1,
            successCount: isSuccess ? 1 : 0,
            failCount: isSuccess ? 0 : 1,
            totalTokens: totalTokens || 0,
            latencySumMs: durationMs || 0,
          },
        },
        { upsert: true },
      );

    } catch (err: any) {
      this.logger.error(`Failed to process request log job ${job.id}: ${err.message}`, err.stack);
      throw err;
    }
  }
}
