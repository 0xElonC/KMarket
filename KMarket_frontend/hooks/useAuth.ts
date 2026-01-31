import { useState, useCallback, useEffect } from 'react';
import { useAccount, useSignMessage } from 'wagmi';
import { authApi, getStoredToken, setStoredToken, removeStoredToken, LoginResponse } from '../config/api';

export interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: LoginResponse['user'] | null;
  error: string | null;
}

export interface UseAuthReturn extends AuthState {
  login: () => Promise<void>;
  logout: () => void;
}

/**
 * Hook to handle backend authentication with wallet signature
 */
export function useAuth(): UseAuthReturn {
  const { address, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();
  
  const [state, setState] = useState<AuthState>({
    isAuthenticated: false,
    isLoading: false,
    user: null,
    error: null,
  });

  // Check if already authenticated on mount
  useEffect(() => {
    const token = getStoredToken();
    if (token && isConnected) {
      // Token exists, consider authenticated
      // In production, you might want to validate the token
      setState((s) => ({ ...s, isAuthenticated: true }));
    } else if (!isConnected) {
      // Wallet disconnected, clear auth
      setState({
        isAuthenticated: false,
        isLoading: false,
        user: null,
        error: null,
      });
      removeStoredToken();
    }
  }, [isConnected]);

  // Listen for logout events (e.g., from API interceptor on 401)
  useEffect(() => {
    const handleLogout = () => {
      setState({
        isAuthenticated: false,
        isLoading: false,
        user: null,
        error: null,
      });
    };

    window.addEventListener('auth:logout', handleLogout);
    return () => window.removeEventListener('auth:logout', handleLogout);
  }, []);

  const login = useCallback(async () => {
    if (!address || !isConnected) {
      setState((s) => ({ ...s, error: 'Please connect your wallet first' }));
      return;
    }

    setState((s) => ({ ...s, isLoading: true, error: null }));

    try {
      // Step 1: Get nonce from backend
      const nonceResponse = await authApi.getNonce();
      if (!nonceResponse.success) {
        throw new Error('Failed to get nonce');
      }
      const { nonce } = nonceResponse.data;

      // Step 2: Sign the message
      const message = `Sign this message to login to KMarket:\nNonce: ${nonce}`;
      const signature = await signMessageAsync({ message });

      // Step 3: Login with signature
      const loginResponse = await authApi.login(address, signature, nonce);
      if (!loginResponse.success) {
        throw new Error(loginResponse.message || 'Login failed');
      }

      // Step 4: Store token and update state
      setStoredToken(loginResponse.data.accessToken);
      setState({
        isAuthenticated: true,
        isLoading: false,
        user: loginResponse.data.user,
        error: null,
      });

      console.log('Login successful:', loginResponse.data.user);
    } catch (err) {
      console.error('Login failed:', err);
      setState({
        isAuthenticated: false,
        isLoading: false,
        user: null,
        error: err instanceof Error ? err.message : 'Login failed',
      });
    }
  }, [address, isConnected, signMessageAsync]);

  const logout = useCallback(() => {
    removeStoredToken();
    setState({
      isAuthenticated: false,
      isLoading: false,
      user: null,
      error: null,
    });
  }, []);

  return {
    ...state,
    login,
    logout,
  };
}
