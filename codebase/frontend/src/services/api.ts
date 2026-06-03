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

// ─── Notifications API Types ──────────────────────────────────────────────────

export interface NotificationEntry {
  id: string;
  type: 'key_exhausted' | 'provider_down' | 'high_error_rate' | 'key_cooldown';
  title: string;
  message: string;
  severity: 'info' | 'warning' | 'critical';
  read: boolean;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface NotificationsResponse {
  data: NotificationEntry[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  unreadCount: number;
}

// ─── Notifications API Functions ──────────────────────────────────────────────

export const notificationsApi = {
  getNotifications: (params?: { page?: number; limit?: number; unreadOnly?: boolean }): Promise<NotificationsResponse> => {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', String(params.page));
    if (params?.limit) query.set('limit', String(params.limit));
    if (params?.unreadOnly !== undefined) query.set('unreadOnly', String(params.unreadOnly));
    return api.get<NotificationsResponse>(`/notifications?${query.toString()}`).then((r) => r.data);
  },

  getUnreadCount: (): Promise<{ count: number }> =>
    api.get<{ count: number }>('/notifications/unread-count').then((r) => r.data),

  markAsRead: (id: string): Promise<{ success: boolean }> =>
    api.patch<{ success: boolean }>(`/notifications/${id}/read`).then((r) => r.data),

  markAllAsRead: (): Promise<{ success: boolean }> =>
    api.patch<{ success: boolean }>('/notifications/read-all').then((r) => r.data),
};

// ─── Admin API Types ──────────────────────────────────────────────────────────

export interface AdminUserEntry {
  id: string;
  email: string;
  name: string;
  role: 'user' | 'admin';
  isVerified: boolean;
  createdAt: string;
  totalRequests: number;
}

export interface AdminUsersResponse {
  data: AdminUserEntry[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface AdminSystemStats {
  metrics: {
    totalRequests: number;
    successRate: number;
    totalKeys: number;
    activeKeys: number;
    totalTokens: number;
    avgLatencyMs: number;
  };
  chartData: ChartDataPoint[];
}

export interface AdminProviderEntry {
  id: string;
  name: string;
  code: string;
  status: 'active' | 'inactive';
  defaultRpmLimit: number;
  defaultTpmLimit: number;
}

// ─── Admin API Functions ──────────────────────────────────────────────────────

export const adminApi = {
  getUsers: (params?: { page?: number; limit?: number }): Promise<AdminUsersResponse> => {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', String(params.page));
    if (params?.limit) query.set('limit', String(params.limit));
    return api.get<AdminUsersResponse>(`/admin/users?${query.toString()}`).then((r) => r.data);
  },

  updateUserRole: (id: string, role: 'user' | 'admin'): Promise<unknown> =>
    api.patch(`/admin/users/${id}/role`, { role }).then((r) => r.data),

  getSystemStats: (days = 30): Promise<AdminSystemStats> =>
    api.get<AdminSystemStats>(`/admin/stats?days=${days}`).then((r) => r.data),

  getProviders: (): Promise<AdminProviderEntry[]> =>
    api.get<AdminProviderEntry[]>('/admin/providers').then((r) => r.data),

  updateProviderStatus: (provider: string, status: 'active' | 'inactive'): Promise<unknown> =>
    api.patch(`/admin/providers/${provider}/status`, { status }).then((r) => r.data),
};

