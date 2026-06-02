import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ProviderAdapter } from '../interfaces/provider-adapter.interface';
import { ProviderCode } from '../../../../../shared/types';

@Injectable()
export class GroqAdapter implements ProviderAdapter {
  private readonly logger = new Logger(GroqAdapter.name);
  private readonly baseUrl = 'https://api.groq.com/openai/v1';

  getProviderCode(): ProviderCode {
    return ProviderCode.GROQ;
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
    } catch (err: any) {
      this.logger.error(`Groq key validation failed: ${err.message}`);
      return false;
    }
  }

  async executeChatCompletion(apiKey: string, body: any): Promise<any> {
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
          `Groq Error: ${response.status} - ${errorText}`,
          response.status,
        );
      }

      return await response.json();
    } catch (err: any) {
      if (err instanceof HttpException) throw err;
      throw new HttpException(
        `Groq connection failed: ${err.message}`,
        HttpStatus.BAD_GATEWAY,
      );
    }
  }
}
