import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ProviderAdapter, LlmResponse } from '../interfaces/provider-adapter.interface';
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
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      this.logger.error(`Gemini key validation failed: ${errMsg}`);
      return false;
    }
  }

  async executeChatCompletion(apiKey: string, body: Record<string, unknown>): Promise<LlmResponse> {
    try {
      // Extract model and map appropriately
      let model = (body.model as string | undefined) || 'gemini-1.5-flash';
      // Strip any prefix client sent if needed, default to gemini models
      if (!model.startsWith('gemini')) {
        model = 'gemini-1.5-flash';
      }

      const { contents, systemInstruction } = this.translateMessagesToGemini(body.messages);

      const geminiBody: Record<string, unknown> = {
        contents,
        generationConfig: {
          temperature: (body.temperature as number | undefined) ?? 0.7,
          maxOutputTokens: (body.max_tokens as number | undefined) ?? 1024,
          topP: (body.top_p as number | undefined) ?? 0.95,
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

      const rawResponse = await response.json() as Record<string, unknown>;
      return this.normalizeGeminiResponse(rawResponse, model);
    } catch (err: unknown) {
      if (err instanceof HttpException) throw err;
      const errMsg = err instanceof Error ? err.message : String(err);
      throw new HttpException(
        `Gemini connection failed: ${errMsg}`,
        HttpStatus.BAD_GATEWAY,
      );
    }
  }

  private translateMessagesToGemini(messages: unknown): { contents: Record<string, unknown>[]; systemInstruction?: string } {
    const contents: Record<string, unknown>[] = [];
    let systemInstruction: string | undefined;

    if (!messages || !Array.isArray(messages)) {
      return { contents };
    }

    for (const msg of messages) {
      const typedMsg = msg as Record<string, unknown>;
      if (typedMsg.role === 'system') {
        systemInstruction = typedMsg.content as string | undefined;
        continue;
      }

      // Map roles: 'assistant' -> 'model', others -> 'user'
      const role = typedMsg.role === 'assistant' ? 'model' : 'user';
      contents.push({
        role,
        parts: [{ text: typedMsg.content as string | undefined }],
      });
    }

    return { contents, systemInstruction };
  }

  private normalizeGeminiResponse(geminiRes: Record<string, unknown>, model: string): LlmResponse {
    const candidates = geminiRes.candidates as Record<string, unknown>[] | undefined;
    const firstCandidate = candidates?.[0];
    const content = firstCandidate?.content as Record<string, unknown> | undefined;
    const parts = content?.parts as Record<string, unknown>[] | undefined;
    const text = (parts?.[0]?.text as string | undefined) || '';
    
    const finishReason = firstCandidate?.finishReason === 'STOP' ? 'stop' : 'length';
    
    const usageMetadata = geminiRes.usageMetadata as Record<string, unknown> | undefined;
    const promptTokens = (usageMetadata?.promptTokenCount as number | undefined) || 0;
    const completionTokens = (usageMetadata?.candidatesTokenCount as number | undefined) || 0;
    const totalTokens = (usageMetadata?.totalTokenCount as number | undefined) || 0;

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
