import { ProviderCode } from '../../../../../shared/types';

export interface ProviderAdapter {
  getProviderCode(): ProviderCode;
  
  /**
   * Validate key connectivity with a minimal fast check request
   */
  validateKey(apiKey: string): Promise<boolean>;

  /**
   * Execute chat completions and normalize response to standard OpenAI format
   */
  executeChatCompletion(apiKey: string, body: any): Promise<any>;

  /**
   * Execute embeddings and normalize response to standard OpenAI format
   */
  executeEmbeddings?(apiKey: string, body: any): Promise<any>;
}
