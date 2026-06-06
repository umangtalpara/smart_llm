export enum RotationStrategy {
  ROUND_ROBIN = 'round_robin',
  WEIGHTED = 'weighted',
  PRIORITY = 'priority',
  HEALTH_BASED = 'health_based',
}

export enum KeyStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  COOLDOWN = 'cooldown',
}

export enum ProviderCode {
  OPENAI = 'openai',
  GEMINI = 'gemini',
  CLAUDE = 'claude',
  GROQ = 'groq',
  OPENROUTER = 'openrouter',
  TOGETHER_AI = 'together_ai',
  CEREBRAS = 'cerebras',
  MISTRAL = 'mistral',
}

export enum UserRole {
  USER = 'user',
  ADMIN = 'admin',
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  isVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ApiKey {
  id: string;
  userId: string;
  provider: ProviderCode;
  name: string;
  keyMask: string; // Truncated API key (e.g. sk-proj-...xxxx)
  status: KeyStatus;
  dailyLimit: number; // 0 for unlimited
  rpmLimit: number; // 0 for unlimited
  tpmLimit: number; // 0 for unlimited
  priority: number; // default 1, higher gets chosen first
  tags: string[];
  group?: string;
  cooldownUntil?: string;
  successCount: number;
  errorCount: number;
  lastUsedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Provider {
  id: string;
  name: string;
  code: ProviderCode;
  status: 'active' | 'inactive';
  defaultRpmLimit: number;
  defaultTpmLimit: number;
}

export interface RequestLog {
  id: string;
  userId: string;
  apiKeyId?: string;
  provider: ProviderCode;
  model: string;
  path: string;
  durationMs: number;
  statusCode: number;
  errorMsg?: string;
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  rotatedToKeyId?: string;
  createdAt: string;
}

export interface UsageStat {
  id: string;
  userId: string;
  date: string; // YYYY-MM-DD
  requestCount: number;
  successCount: number;
  failCount: number;
  totalTokens: number;
  durationMsAvg: number;
}

export interface Notification {
  id: string;
  userId: string;
  type: 'key_exhausted' | 'provider_down' | 'high_error_rate' | 'system_alert';
  message: string;
  status: 'unread' | 'read';
  severity: 'info' | 'warning' | 'critical';
  createdAt: string;
}

export interface DeveloperToken {
  id: string;
  userId: string;
  name: string;
  tokenMask: string;
  isActive: boolean;
  lastUsedAt?: string;
  createdAt: string;
  updatedAt: string;
}

