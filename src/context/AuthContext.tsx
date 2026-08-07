import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import * as api from '@/services/api';
import {
  clearAuth,
  getToken,
  getUser,
  saveToken,
  saveUser,
  StoredUser,
} from '@/services/storage';

// ─── Types ───────────────────────────────────────────────────────────────────

interface AuthState {
  user: StoredUser | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

interface AuthActions {
  login: (email: string, password: string) => Promise<void>;
  signup: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (user: StoredUser) => Promise<void>;
}

type AuthContextType = AuthState & AuthActions;

// ─── Context ─────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ─── Provider ────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<StoredUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Restore session on mount
  useEffect(() => {
    (async () => {
      try {
        const [savedToken, savedUser] = await Promise.all([
          getToken(),
          getUser(),
        ]);
        if (savedToken && savedUser) {
          setToken(savedToken);
          setUser(savedUser);
        }
      } catch (e) {
        console.warn('Failed to restore auth session', e);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const loginFn = useCallback(async (email: string, password: string) => {
    const res = await api.login(email, password);
    const storedUser: StoredUser = {
      id: res.user.id,
      name: res.user.name,
      email: res.user.email,
      kyc_status: res.user.kyc_status,
      kyc_session_id: res.user.kyc_session_id,
      kyc_verified_at: res.user.kyc_verified_at,
    };
    await Promise.all([saveToken(res.token), saveUser(storedUser)]);
    setToken(res.token);
    setUser(storedUser);
  }, []);

  const signupFn = useCallback(
    async (name: string, email: string, password: string) => {
      const res = await api.signup(name, email, password);
      const storedUser: StoredUser = {
        id: res.user.id,
        name: res.user.name,
        email: res.user.email,
        kyc_status: res.user.kyc_status,
        kyc_session_id: res.user.kyc_session_id,
        kyc_verified_at: res.user.kyc_verified_at,
      };
      await Promise.all([saveToken(res.token), saveUser(storedUser)]);
      setToken(res.token);
      setUser(storedUser);
    },
    [],
  );

  const logoutFn = useCallback(async () => {
    await clearAuth();
    setToken(null);
    setUser(null);
  }, []);

  const updateUserFn = useCallback(async (updatedUser: StoredUser) => {
    await saveUser(updatedUser);
    setUser(updatedUser);
  }, []);

  const value = useMemo<AuthContextType>(
    () => ({
      user,
      token,
      isLoading,
      isAuthenticated: !!token && !!user,
      login: loginFn,
      signup: signupFn,
      logout: logoutFn,
      updateUser: updateUserFn,
    }),
    [user, token, isLoading, loginFn, signupFn, logoutFn, updateUserFn],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
