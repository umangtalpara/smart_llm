import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ProviderAdapter } from '../interfaces/provider-adapter.interface';
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
      // 200 or 400 (validation check fails content-wise but is connected) works, but 200 is clean
      return response.status === 200 || response.status === 400;
    } catch (err: any) {
      this.logger.error(`Claude key validation failed: ${err.message}`);
      return false;
    }
  }

  async executeChatCompletion(apiKey: string, body: any): Promise<any> {
    try {
      let model = body.model || 'claude-3-5-sonnet-20240620';
      if (!model.startsWith('claude')) {
        model = 'claude-3-5-sonnet-20240620';
      }

      const { messages, system } = this.translateMessagesToClaude(body.messages);

      const claudeBody: any = {
        model,
        messages,
        max_tokens: body.max_tokens ?? 1024,
        temperature: body.temperature ?? 0.7,
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

      const rawResponse = await response.json();
      return this.normalizeClaudeResponse(rawResponse, model);
    } catch (err: any) {
      if (err instanceof HttpException) throw err;
      throw new HttpException(
        `Claude connection failed: ${err.message}`,
        HttpStatus.BAD_GATEWAY,
      );
    }
  }

  private translateMessagesToClaude(messages: any[]): { messages: any[]; system?: string } {
    const claudeMessages: any[] = [];
    let system: string | undefined;

    if (!messages || !Array.isArray(messages)) {
      return { messages: claudeMessages };
    }

    for (const msg of messages) {
      if (msg.role === 'system') {
        system = msg.content;
        continue;
      }

      claudeMessages.push({
        role: msg.role === 'assistant' ? 'assistant' : 'user',
        content: msg.content,
      });
    }

    return { messages: claudeMessages, system };
  }

  private normalizeClaudeResponse(claudeRes: any, model: string): any {
    const text = claudeRes.content?.[0]?.text || '';
    const finishReason = claudeRes.stop_reason === 'end_turn' ? 'stop' : 'length';
    const inputTokens = claudeRes.usage?.input_tokens || 0;
    const outputTokens = claudeRes.usage?.output_tokens || 0;
    const totalTokens = inputTokens + outputTokens;

    return {
      id: `chatcmpl-claude-${claudeRes.id}`,
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
