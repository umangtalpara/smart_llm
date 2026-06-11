import { ProviderCode } from '../../../../shared/types';

export const PROVIDER_DEFAULT_MODELS: Record<ProviderCode, string> = {
  [ProviderCode.OPENAI]: 'gpt-4o',
  [ProviderCode.GEMINI]: 'gemini-1.5-flash',
  [ProviderCode.CLAUDE]: 'claude-3-haiku',
  [ProviderCode.GROQ]: 'qwen/qwen3-32b',
  [ProviderCode.GROK]: 'grok-beta',
  [ProviderCode.OPENROUTER]: 'openrouter/auto',
  [ProviderCode.MISTRAL]: 'mistral-large-latest',
  [ProviderCode.CEREBRAS]: 'zai-glm-4.7',
  [ProviderCode.CAMBERCLOUD]: 'camber-model',
  [ProviderCode.TOGETHER_AI]: 'llama3-8b-8192',
  [ProviderCode.GITHUB]: 'gpt-4o-mini',
};

export function getSupportedModels() {
  return {
    object: 'list',
    data: [
      {
        id: 'gpt-4o',
        object: 'model',
        created: 1715644800,
        owned_by: 'openai',
      },
      {
        id: 'gpt-4-turbo',
        object: 'model',
        created: 1712620800,
        owned_by: 'openai',
      },
      {
        id: 'gpt-3.5-turbo',
        object: 'model',
        created: 1677628800,
        owned_by: 'openai',
      },
      {
        id: 'text-embedding-3-small',
        object: 'model',
        created: 1706140800,
        owned_by: 'openai',
      },
      {
        id: 'text-embedding-3-large',
        object: 'model',
        created: 1706140800,
        owned_by: 'openai',
      },
      {
        id: 'gemini-1.5-pro',
        object: 'model',
        created: 1715644800,
        owned_by: 'gemini',
      },
      {
        id: 'gemini-1.5-flash',
        object: 'model',
        created: 1715644800,
        owned_by: 'gemini',
      },
      {
        id: 'claude-3-5-sonnet',
        object: 'model',
        created: 1718841600,
        owned_by: 'claude',
      },
      {
        id: 'claude-3-haiku',
        object: 'model',
        created: 1710374400,
        owned_by: 'claude',
      },
      {
        id: 'qwen/qwen3-32b',
        object: 'model',
        created: 1723000000,
        owned_by: 'groq',
      },
      {
        id: 'llama-3.1-8b-instant',
        object: 'model',
        created: 1723000000,
        owned_by: 'groq',
      },
      {
        id: 'meta-llama/llama-4-scout-17b-16e-instruct',
        object: 'model',
        created: 1723000000,
        owned_by: 'groq',
      },
      {
        id: 'groq/compound',
        object: 'model',
        created: 1723000000,
        owned_by: 'groq',
      },
      { id: 'grok-2', object: 'model', created: 1723000000, owned_by: 'grok' },
      {
        id: 'grok-beta',
        object: 'model',
        created: 1723000000,
        owned_by: 'grok',
      },
      {
        id: 'mistral-large-latest',
        object: 'model',
        created: 1723000000,
        owned_by: 'mistral',
      },
      {
        id: 'zai-glm-4.7',
        object: 'model',
        created: 1723000000,
        owned_by: 'cerebras',
      },
    ],
  };
}

export function resolveProviderFromModel(model: string): ProviderCode {
  const lowercaseModel = model.toLowerCase();
  if (lowercaseModel.includes('github')) {
    return ProviderCode.GITHUB;
  }
  if (
    lowercaseModel.includes('gpt') ||
    lowercaseModel.includes('o1') ||
    lowercaseModel.includes('text-embedding')
  ) {
    return ProviderCode.OPENAI;
  }
  if (lowercaseModel.includes('gemini')) {
    return ProviderCode.GEMINI;
  }
  if (lowercaseModel.includes('claude')) {
    return ProviderCode.CLAUDE;
  }
  if (lowercaseModel.includes('grok')) {
    return ProviderCode.GROK;
  }
  if (
    lowercaseModel.includes('mistral') &&
    !lowercaseModel.includes('mixtral')
  ) {
    return ProviderCode.MISTRAL;
  }
  if (lowercaseModel.includes('openrouter')) {
    return ProviderCode.OPENROUTER;
  }
  if (
    lowercaseModel.includes('cerebras') ||
    lowercaseModel.includes('zai-glm-4.7')
  ) {
    return ProviderCode.CEREBRAS;
  }
  if (lowercaseModel.includes('camber')) {
    return ProviderCode.CAMBERCLOUD;
  }
  if (
    lowercaseModel.includes('llama') ||
    lowercaseModel.includes('mixtral') ||
    lowercaseModel.includes('gemma') ||
    lowercaseModel.includes('qwen') ||
    lowercaseModel.includes('groq/') ||
    lowercaseModel.includes('compound')
  ) {
    return ProviderCode.GROQ;
  }
  return ProviderCode.OPENAI;
}
