import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ProviderAdapter } from '../interfaces/provider-adapter.interface';
import { ProviderCode } from '../../../../../shared/types';

@Injectable()
export class GeminiAdapter implements ProviderAdapter {
  private readonly logger = new Logger(GeminiAdapter.name);
  private readonly baseUrl = 'https://generativelanguage.googleapis.com/v1beta';

  getProviderCode(): ProviderCode {
    return ProviderCode.GEMINI;
  }

  async validateKey(apiKey: string): Promise<boolean> {
    try {
      // Fast minimal model list check
      const response = await fetch(`${this.baseUrl}/models?key=${apiKey}`, {
        method: 'GET',
      });
      return response.status === 200;
    } catch (err: any) {
      this.logger.error(`Gemini key validation failed: ${err.message}`);
      return false;
    }
  }

  async executeChatCompletion(apiKey: string, body: any): Promise<any> {
    try {
      // Extract model and map appropriately
      let model = body.model || 'gemini-1.5-flash';
      // Strip any prefix client sent if needed, default to gemini models
      if (!model.startsWith('gemini')) {
        model = 'gemini-1.5-flash';
      }

      const { contents, systemInstruction } = this.translateMessagesToGemini(body.messages);

      const geminiBody: any = {
        contents,
        generationConfig: {
          temperature: body.temperature ?? 0.7,
          maxOutputTokens: body.max_tokens ?? 1024,
          topP: body.top_p ?? 0.95,
        },
      };

      if (systemInstruction) {
        geminiBody.systemInstruction = {
          parts: [{ text: systemInstruction }],
        };
      }

      const response = await fetch(
        `${this.baseUrl}/models/${model}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(geminiBody),
        },
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new HttpException(
          `Gemini Error: ${response.status} - ${errorText}`,
          response.status,
        );
      }

      const rawResponse = await response.json();
      return this.normalizeGeminiResponse(rawResponse, model);
    } catch (err: any) {
      if (err instanceof HttpException) throw err;
      throw new HttpException(
        `Gemini connection failed: ${err.message}`,
        HttpStatus.BAD_GATEWAY,
      );
    }
  }

  private translateMessagesToGemini(messages: any[]): { contents: any[]; systemInstruction?: string } {
    const contents: any[] = [];
    let systemInstruction: string | undefined;

    if (!messages || !Array.isArray(messages)) {
      return { contents };
    }

    for (const msg of messages) {
      if (msg.role === 'system') {
        systemInstruction = msg.content;
        continue;
      }

      // Map roles: 'assistant' -> 'model', others -> 'user'
      const role = msg.role === 'assistant' ? 'model' : 'user';
      contents.push({
        role,
        parts: [{ text: msg.content }],
      });
    }

    return { contents, systemInstruction };
  }

  private normalizeGeminiResponse(geminiRes: any, model: string): any {
    const text = geminiRes.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const finishReason = geminiRes.candidates?.[0]?.finishReason === 'STOP' ? 'stop' : 'length';
    const promptTokens = geminiRes.usageMetadata?.promptTokenCount || 0;
    const completionTokens = geminiRes.usageMetadata?.candidatesTokenCount || 0;
    const totalTokens = geminiRes.usageMetadata?.totalTokenCount || 0;

    return {
      id: `chatcmpl-gemini-${Date.now()}`,
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
        prompt_tokens: promptTokens,
        completion_tokens: completionTokens,
        total_tokens: totalTokens,
      },
    };
  }
}
