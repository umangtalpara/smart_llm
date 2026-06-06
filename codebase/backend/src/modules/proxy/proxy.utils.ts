import { ProviderCode } from '../../../../shared/types';

export function getSupportedModels() {
  return {
    object: 'list',
    data: [
      { id: 'gpt-4o', object: 'model', created: 1715644800, owned_by: 'openai' },
      { id: 'gpt-4-turbo', object: 'model', created: 1712620800, owned_by: 'openai' },
      { id: 'gpt-3.5-turbo', object: 'model', created: 1677628800, owned_by: 'openai' },
      { id: 'text-embedding-3-small', object: 'model', created: 1706140800, owned_by: 'openai' },
      { id: 'text-embedding-3-large', object: 'model', created: 1706140800, owned_by: 'openai' },
      { id: 'gemini-1.5-pro', object: 'model', created: 1715644800, owned_by: 'gemini' },
      { id: 'gemini-1.5-flash', object: 'model', created: 1715644800, owned_by: 'gemini' },
      { id: 'claude-3-5-sonnet', object: 'model', created: 1718841600, owned_by: 'claude' },
      { id: 'claude-3-haiku', object: 'model', created: 1710374400, owned_by: 'claude' },
      { id: 'llama3-8b-8192', object: 'model', created: 1713436800, owned_by: 'groq' },
      { id: 'llama3-70b-8192', object: 'model', created: 1713436800, owned_by: 'groq' },
      { id: 'mixtral-8x7b-32768', object: 'model', created: 1702339200, owned_by: 'groq' },
    ],
  };
}

export function resolveProviderFromModel(model: string): ProviderCode {
  const lowercaseModel = model.toLowerCase();
  if (lowercaseModel.includes('gpt') || lowercaseModel.includes('o1') || lowercaseModel.includes('text-embedding')) {
    return ProviderCode.OPENAI;
  }
  if (lowercaseModel.includes('gemini')) {
    return ProviderCode.GEMINI;
  }
  if (lowercaseModel.includes('claude')) {
    return ProviderCode.CLAUDE;
  }
  if (lowercaseModel.includes('llama') || lowercaseModel.includes('mixtral') || lowercaseModel.includes('gemma')) {
    return ProviderCode.GROQ;
  }
  return ProviderCode.OPENAI;
}
