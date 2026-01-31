import axios, { AxiosInstance, AxiosError } from 'axios';

// API Base URL
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

// Create axios instance
const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Token storage key
const TOKEN_KEY = 'kmarket_token';

// Get stored token
export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

// Set token
export function setStoredToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

// Remove token
export function removeStoredToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

// Request interceptor - add auth token
api.interceptors.request.use(
  (config) => {
    const token = getStoredToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - handle errors
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      removeStoredToken();
      // Optionally trigger logout event
      window.dispatchEvent(new CustomEvent('auth:logout'));
    }
    return Promise.reject(error);
  }
);

// API Response type
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message: string | null;
}

// Auth types
export interface NonceResponse {
  nonce: string;
}

export interface LoginResponse {
  accessToken: string;
  user: {
    id: number;
    address: string;
    balance: string;
    claimable: string;
  };
}

export interface BalanceResponse {
  available: string;
  claimable: string;
  inBets: string;
  total: string;
}

// Auth API
export const authApi = {
  // Get nonce for signing
  getNonce: async (): Promise<ApiResponse<NonceResponse>> => {
    const response = await api.post<ApiResponse<NonceResponse>>('/users/auth/nonce');
    return response.data;
  },

  // Login with wallet signature
  login: async (address: string, signature: string, nonce: string): Promise<ApiResponse<LoginResponse>> => {
    const response = await api.post<ApiResponse<LoginResponse>>('/users/auth/login', {
      address,
      signature,
      nonce,
    });
    return response.data;
  },
};

// User API
export const userApi = {
  // Get balance
  getBalance: async (): Promise<ApiResponse<BalanceResponse>> => {
    const response = await api.get<ApiResponse<BalanceResponse>>('/users/balance');
    return response.data;
  },

  // Claim balance
  claim: async (): Promise<ApiResponse<{ claimed: string; newBalance: string }>> => {
    const response = await api.post<ApiResponse<{ claimed: string; newBalance: string }>>('/users/claim');
    return response.data;
  },
};

// Market API
export const marketApi = {
  // Get current price
  getPrice: async (symbol: string = 'ETHUSDT'): Promise<ApiResponse<{ symbol: string; price: string; timestamp: number }>> => {
    const response = await api.get<ApiResponse<{ symbol: string; price: string; timestamp: number }>>('/market/price', {
      params: { symbol },
    });
    return response.data;
  },

  // Get grid
  getGrid: async (symbol: string = 'ETHUSDT'): Promise<ApiResponse<any>> => {
    const response = await api.get<ApiResponse<any>>('/market/grid', {
      params: { symbol },
    });
    return response.data;
  },
};

// Trade API
export const tradeApi = {
  // Place bet
  placeBet: async (params: {
    symbol: string;
    amount: string;
    priceTick: number;
    settlementTime: number;
  }): Promise<ApiResponse<any>> => {
    const response = await api.post<ApiResponse<any>>('/trade/bet', params);
    return response.data;
  },

  // Get positions
  getPositions: async (symbol?: string): Promise<ApiResponse<any>> => {
    const response = await api.get<ApiResponse<any>>('/trade/positions', {
      params: symbol ? { symbol } : undefined,
    });
    return response.data;
  },

  // Get history
  getHistory: async (page: number = 1, limit: number = 20): Promise<ApiResponse<any>> => {
    const response = await api.get<ApiResponse<any>>('/trade/history', {
      params: { page, limit },
    });
    return response.data;
  },
};

export default api;
