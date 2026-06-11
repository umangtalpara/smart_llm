import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { MonitorService } from './monitor.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { GetUser } from '../../common/decorators/get-user.decorator';
import { ProviderCode } from '../../../../shared/types';

@ApiTags('Health Monitoring & Analytics')
@Controller('monitor')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class MonitorController {
  constructor(private readonly monitorService: MonitorService) {}

  @Get('metrics')
  @ApiOperation({ summary: 'Get total dashboard metrics counters (widgets)' })
  @ApiResponse({
    status: 200,
    description: 'Aggregated total counters returned',
  })
  async getMetrics(@GetUser('id') userId: string) {
    return await this.monitorService.getMetrics(userId);
  }

  @Get('charts')
  @ApiOperation({
    summary: 'Get Recharts-compatible throughput & latency timeseries data',
  })
  @ApiResponse({
    status: 200,
    description: 'Timeseries array dataset returned',
  })
  async getCharts(@GetUser('id') userId: string, @Query('days') days?: string) {
    const daysCount = days ? parseInt(days, 10) : 30;
    return await this.monitorService.getChartData(userId, daysCount);
  }

  @Get('logs')
  @ApiOperation({ summary: 'Get paginated request logs with failover tracks' })
  @ApiResponse({ status: 200, description: 'Paginated request log list' })
  async getLogs(
    @GetUser('id') userId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('provider') provider?: ProviderCode,
    @Query('statusCode') statusCode?: string,
    @Query('cursor') cursor?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 20;
    const codeNum = statusCode ? parseInt(statusCode, 10) : undefined;

    return await this.monitorService.getLogs(
      userId,
      pageNum,
      limitNum,
      provider,
      codeNum,
      cursor,
    );
  }

  @Get('health')
  @ApiOperation({
    summary: 'Get live active provider key and connection status',
  })
  @ApiResponse({ status: 200, description: 'Provider key health map returned' })
  async getHealth(@GetUser('id') userId: string) {
    return await this.monitorService.getHealthStatus(userId);
  }
}
