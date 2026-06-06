import { ProviderCode } from '../../../../../shared/types';

export interface LlmUsage {
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
}

export interface LlmResponse {
  usage?: LlmUsage;
  [key: string]: unknown;
}

export interface ProviderAdapter {
  getProviderCode(): ProviderCode;
  
  /**
   * Validate key connectivity with a minimal fast check request
   */
  validateKey(apiKey: string): Promise<boolean>;

  /**
   * Execute chat completions and normalize response to standard OpenAI format
   */
  executeChatCompletion(apiKey: string, body: Record<string, unknown>): Promise<LlmResponse>;

  /**
   * Execute embeddings and normalize response to standard OpenAI format
   */
  executeEmbeddings?(apiKey: string, body: Record<string, unknown>): Promise<LlmResponse>;
}
