import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach JWT access token to requests automatically
api.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('accessToken');
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// Intercept 401 errors to refresh access tokens
let isRefreshing = false;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let failedRequestsQueue: any[] = [];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const processQueue = (error: any, token: string | null = null) => {
  failedRequestsQueue.forEach((prom) => {
    if (token) {
      prom.resolve(token);
    } else {
      prom.reject(error);
    }
  });
  failedRequestsQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedRequestsQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = typeof window !== 'undefined' ? localStorage.getItem('refreshToken') : null;

      if (!refreshToken) {
        isRefreshing = false;
        // Redirect to login if no refresh token exists
        if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login') && !window.location.pathname.startsWith('/register')) {
          localStorage.clear();
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }

      try {
        const { data } = await axios.post(`${API_BASE_URL}/auth/refresh`, {
          refreshToken,
        });

        const { accessToken, refreshToken: newRefreshToken } = data;

        if (typeof window !== 'undefined') {
          localStorage.setItem('accessToken', accessToken);
          localStorage.setItem('refreshToken', newRefreshToken);
        }

        api.defaults.headers.common.Authorization = `Bearer ${accessToken}`;
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;

        processQueue(null, accessToken);
        isRefreshing = false;

        return api(originalRequest);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (refreshError: any) {
        processQueue(refreshError, null);
        isRefreshing = false;

        if (typeof window !== 'undefined') {
          localStorage.clear();
          window.location.href = '/login';
        }
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

// ─── Monitor API Types ────────────────────────────────────────────────────────

export interface MetricsData {
  totalRequests: number;
  successRate: number;
  activeKeys: number;
  totalTokens: number;
}

export interface ChartDataPoint {
  date: string;
  requests: number;
  success: number;
  failed: number;
  tokens: number;
  avgLatencyMs: number;
}

export interface RequestLogEntry {
  id: string;
  provider: string;
  model: string;
  path: string;
  durationMs: number;
  statusCode: number;
  errorMsg?: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  rotatedFromKeys: string[];
  createdAt: string;
}

export interface LogsResponse {
  data: RequestLogEntry[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ProviderHealth {
  status: 'healthy' | 'degraded' | 'down' | 'inactive';
  activeKeys: number;
  cooldownKeys: number;
  label: string;
}

export interface HealthData {
  openai: ProviderHealth;
  gemini: ProviderHealth;
  claude: ProviderHealth;
  groq: ProviderHealth;
}

// ─── Monitor API Functions ────────────────────────────────────────────────────

export const monitorApi = {
  getMetrics: (): Promise<MetricsData> =>
    api.get<MetricsData>('/monitor/metrics').then((r) => r.data),

  getCharts: (days = 30): Promise<ChartDataPoint[]> =>
    api.get<ChartDataPoint[]>(`/monitor/charts?days=${days}`).then((r) => r.data),

  getLogs: (params: {
    page?: number;
    limit?: number;
    provider?: string;
    statusCode?: number;
  }): Promise<LogsResponse> => {
    const query = new URLSearchParams();
    if (params.page) query.set('page', String(params.page));
    if (params.limit) query.set('limit', String(params.limit));
    if (params.provider) query.set('provider', params.provider);
    if (params.statusCode) query.set('statusCode', String(params.statusCode));
    return api.get<LogsResponse>(`/monitor/logs?${query.toString()}`).then((r) => r.data);
  },

  getHealth: (): Promise<HealthData> =>
    api.get<HealthData>('/monitor/health').then((r) => r.data),
};

