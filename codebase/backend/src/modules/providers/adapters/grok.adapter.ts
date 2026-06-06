import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ProviderAdapter, LlmResponse } from '../interfaces/provider-adapter.interface';
import { ProviderCode } from '../../../../../shared/types';

@Injectable()
export class GrokAdapter implements ProviderAdapter {
  private readonly logger = new Logger(GrokAdapter.name);
  private readonly baseUrl = 'https://api.x.ai/v1';

  getProviderCode(): ProviderCode {
    return ProviderCode.GROK;
  }

  async validateKey(apiKey: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/models`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      });
      return response.status === 200;
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      this.logger.error(`Grok key validation failed: ${errMsg}`);
      return false;
    }
  }

  async executeChatCompletion(apiKey: string, body: Record<string, unknown>): Promise<LlmResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new HttpException(
          `Grok Error: ${response.status} - ${errorText}`,
          response.status,
        );
      }

      return await response.json() as LlmResponse;
    } catch (err: unknown) {
      if (err instanceof HttpException) throw err;
      const errMsg = err instanceof Error ? err.message : String(err);
      throw new HttpException(
        `Grok connection failed: ${errMsg}`,
        HttpStatus.BAD_GATEWAY,
      );
    }
  }
}
