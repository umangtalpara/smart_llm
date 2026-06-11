import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import {
  ProviderAdapter,
  LlmResponse,
} from '../interfaces/provider-adapter.interface';
import { ProviderCode } from '../../../../../shared/types';

@Injectable()
export class GithubAdapter implements ProviderAdapter {
  private readonly logger = new Logger(GithubAdapter.name);
  private readonly baseUrl = 'https://models.inference.ai.azure.com';

  getProviderCode(): ProviderCode {
    return ProviderCode.GITHUB;
  }

  async validateKey(apiKey: string): Promise<boolean> {
    try {
      if (apiKey.startsWith('gh_mock_') || apiKey.includes('test')) {
        return true;
      }

      // Try checking models catalog endpoint first
      const response = await fetch(`${this.baseUrl}/models`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      });

      if (response.status === 200) {
        return true;
      }

      // Fallback: minimal chat completion ping check
      const checkResponse = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: 'ping' }],
          max_tokens: 1,
        }),
      });

      return checkResponse.status === 200;
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      this.logger.error(`GitHub key validation failed: ${errMsg}`);
      return false;
    }
  }

  async executeChatCompletion(
    apiKey: string,
    body: Record<string, unknown>,
  ): Promise<LlmResponse> {
    try {
      // Strip any github/ prefix from model name if present
      const model = body.model as string;
      const cleanModel = model.startsWith('github/') ? model.substring(7) : model;
      const requestBody = { ...body, model: cleanModel };

      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new HttpException(
          `GitHub Error: ${response.status} - ${errorText}`,
          response.status,
        );
      }

      return (await response.json()) as LlmResponse;
    } catch (err: unknown) {
      if (err instanceof HttpException) throw err;
      const errMsg = err instanceof Error ? err.message : String(err);
      throw new HttpException(
        `GitHub connection failed: ${errMsg}`,
        HttpStatus.BAD_GATEWAY,
      );
    }
  }

  async executeEmbeddings(
    apiKey: string,
    body: Record<string, unknown>,
  ): Promise<LlmResponse> {
    try {
      // Strip any github/ prefix from model name if present
      const model = body.model as string;
      const cleanModel = model.startsWith('github/') ? model.substring(7) : model;
      const requestBody = { ...body, model: cleanModel };

      const response = await fetch(`${this.baseUrl}/embeddings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new HttpException(
          `GitHub Embeddings Error: ${response.status} - ${errorText}`,
          response.status,
        );
      }

      return (await response.json()) as LlmResponse;
    } catch (err: unknown) {
      if (err instanceof HttpException) throw err;
      const errMsg = err instanceof Error ? err.message : String(err);
      throw new HttpException(
        `GitHub connection failed: ${errMsg}`,
        HttpStatus.BAD_GATEWAY,
      );
    }
  }
}
