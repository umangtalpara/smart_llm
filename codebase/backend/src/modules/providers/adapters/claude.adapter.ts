import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ProviderAdapter, LlmResponse } from '../interfaces/provider-adapter.interface';
import { ProviderCode } from '../../../../../shared/types';

@Injectable()
export class ClaudeAdapter implements ProviderAdapter {
  private readonly logger = new Logger(ClaudeAdapter.name);
  private readonly baseUrl = 'https://api.anthropic.com/v1';

  getProviderCode(): ProviderCode {
    return ProviderCode.CLAUDE;
  }

  async validateKey(apiKey: string): Promise<boolean> {
    try {
      // Test key validation with minimal request
      const response = await fetch(`${this.baseUrl}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-3-5-sonnet-20240620',
          max_tokens: 1,
          messages: [{ role: 'user', content: 'h' }],
        }),
      });
      return response.status === 200 || response.status === 400;
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      this.logger.error(`Claude key validation failed: ${errMsg}`);
      return false;
    }
  }

  async executeChatCompletion(apiKey: string, body: Record<string, unknown>): Promise<LlmResponse> {
    try {
      let model = (body.model as string | undefined) || 'claude-3-5-sonnet-20240620';
      if (!model.startsWith('claude')) {
        model = 'claude-3-5-sonnet-20240620';
      }

      const { messages, system } = this.translateMessagesToClaude(body.messages);

      const claudeBody: Record<string, unknown> = {
        model,
        messages,
        max_tokens: (body.max_tokens as number | undefined) ?? 1024,
        temperature: (body.temperature as number | undefined) ?? 0.7,
      };

      if (system) {
        claudeBody.system = system;
      }

      const response = await fetch(`${this.baseUrl}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify(claudeBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new HttpException(
          `Claude Error: ${response.status} - ${errorText}`,
          response.status,
        );
      }

      const rawResponse = await response.json() as Record<string, unknown>;
      return this.normalizeClaudeResponse(rawResponse, model);
    } catch (err: unknown) {
      if (err instanceof HttpException) throw err;
      const errMsg = err instanceof Error ? err.message : String(err);
      throw new HttpException(
        `Claude connection failed: ${errMsg}`,
        HttpStatus.BAD_GATEWAY,
      );
    }
  }

  private translateMessagesToClaude(messages: unknown): { messages: Record<string, unknown>[]; system?: string } {
    const claudeMessages: Record<string, unknown>[] = [];
    let system: string | undefined;

    if (!messages || !Array.isArray(messages)) {
      return { messages: claudeMessages };
    }

    for (const msg of messages) {
      const typedMsg = msg as Record<string, unknown>;
      if (typedMsg.role === 'system') {
        system = typedMsg.content as string | undefined;
        continue;
      }

      claudeMessages.push({
        role: typedMsg.role === 'assistant' ? 'assistant' : 'user',
        content: typedMsg.content,
      });
    }

    return { messages: claudeMessages, system };
  }

  private normalizeClaudeResponse(claudeRes: Record<string, unknown>, model: string): LlmResponse {
    const content = claudeRes.content as Record<string, unknown>[] | undefined;
    const text = (content?.[0]?.text as string | undefined) || '';
    const finishReason = claudeRes.stop_reason === 'end_turn' ? 'stop' : 'length';
    
    const usage = claudeRes.usage as Record<string, unknown> | undefined;
    const inputTokens = (usage?.input_tokens as number | undefined) || 0;
    const outputTokens = (usage?.output_tokens as number | undefined) || 0;
    const totalTokens = inputTokens + outputTokens;

    return {
      id: `chatcmpl-claude-${claudeRes.id as string || Date.now()}`,
      object: 'chat.completion',
      created: Math.floor(Date.now() / 1000),
      model,
      choices: [
        {
          index: 0,
          message: {
            role: 'assistant',
            content: text,
          },
          logprobs: null,
          finish_reason: finishReason,
        },
      ],
      usage: {
        prompt_tokens: inputTokens,
        completion_tokens: outputTokens,
        total_tokens: totalTokens,
      },
    };
  }
}
