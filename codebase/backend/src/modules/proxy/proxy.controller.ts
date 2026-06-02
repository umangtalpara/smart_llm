import { Controller, Post, Get, Body, Headers, UseGuards, HttpStatus, HttpCode } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ProxyService } from './proxy.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { GetUser } from '../../common/decorators/get-user.decorator';
import { RotationStrategy } from '../../../../shared/types';

@ApiTags('Unified Proxy Gateway')
@Controller('proxy')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ProxyController {
  constructor(private readonly proxyService: ProxyService) {}

  @Post('chat/completions')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Standard OpenAI-compatible Chat Completions unified gateway',
    description: 'Intercepts requests, handles fails, and rotates secret keys on rate limits or outages automatically.',
  })
  @ApiResponse({ status: HttpStatus.OK, description: 'Successful completion payload' })
  @ApiResponse({ status: HttpStatus.SERVICE_UNAVAILABLE, description: 'All active keys are exhausted or cooled down' })
  async executeChatCompletion(
    @GetUser('id') userId: string,
    @Body() body: any,
    @Headers('x-rotation-strategy') headerStrategy?: string,
    @Headers('x-fallback-group') headerGroup?: string,
  ) {
    // Parse rotation strategy from headers if exists
    let strategy = RotationStrategy.PRIORITY;
    if (headerStrategy && Object.values(RotationStrategy).includes(headerStrategy as RotationStrategy)) {
      strategy = headerStrategy as RotationStrategy;
    }

    return await this.proxyService.executeProxyChatCompletion(
      userId,
      body,
      strategy,
      headerGroup,
    );
  }

  @Post('embeddings')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Standard OpenAI-compatible Embeddings unified gateway',
    description: 'Intercepts embedding requests, rotates secret keys, and executes across available keys.',
  })
  @ApiResponse({ status: HttpStatus.OK, description: 'Successful embedding payload' })
  async executeEmbeddings(
    @GetUser('id') userId: string,
    @Body() body: any,
    @Headers('x-rotation-strategy') headerStrategy?: string,
    @Headers('x-fallback-group') headerGroup?: string,
  ) {
    let strategy = RotationStrategy.PRIORITY;
    if (headerStrategy && Object.values(RotationStrategy).includes(headerStrategy as RotationStrategy)) {
      strategy = headerStrategy as RotationStrategy;
    }

    return await this.proxyService.executeProxyEmbeddings(
      userId,
      body,
      strategy,
      headerGroup,
    );
  }

  @Get('models')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Retrieve all supported AI models in ProxyLLM',
    description: 'Returns a list of all models officially supported by ProxyLLM in standardized format.',
  })
  @ApiResponse({ status: HttpStatus.OK, description: 'List of supported models' })
  async getSupportedModels() {
    return this.proxyService.getSupportedModels();
  }
}
