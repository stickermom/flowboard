'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../lib/supabase';

interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: string;
  twoFactorEnabled: boolean;
}

interface AdminAuthContextType {
  adminUser: AdminUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{
    success: boolean;
    error?: string;
    requiresOtp?: boolean;
    challengeId?: string;
  }>;
  verifyTwoFactor: (challengeId: string, code: string) => Promise<{ success: boolean; error?: string }>;
  startTwoFactorSetup: (password: string) => Promise<{ secret?: string; recoveryCodes?: string[]; error?: string }>;
  confirmTwoFactorSetup: (password: string, code: string) => Promise<{ success: boolean; error?: string }>;
  disableTwoFactor: (password: string, code: string) => Promise<{ success: boolean; error?: string }>;
  updateAdminUser: (updates: Partial<AdminUser>) => void;
  logout: () => void;
  isAuthenticated: boolean;
}

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined);

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (typeof window === 'undefined') {
      setLoading(false);
      return;
    }
    
    const storedAdmin = localStorage.getItem('adminUser');
    if (storedAdmin) {
      try {
        const parsed = JSON.parse(storedAdmin);
        setAdminUser({
          ...parsed,
          twoFactorEnabled: parsed.twoFactorEnabled ?? false
        });
      } catch (err) {
        console.error('Failed to parse stored admin user', err);
        localStorage.removeItem('adminUser');
      }
    }
    setLoading(false);
  }, []);

  const persistUser = (user: AdminUser | null) => {
    setAdminUser(user);
    if (typeof window !== 'undefined') {
      if (user) {
        localStorage.setItem('adminUser', JSON.stringify(user));
      } else {
        localStorage.removeItem('adminUser');
      }
    }
  };

  const mapUser = (payload: any): AdminUser => ({
    id: payload.id,
    email: payload.email,
    name: payload.name,
    role: payload.role,
    twoFactorEnabled: payload.two_factor_enabled ?? false
  });

  const updateAdminUser = (updates: Partial<AdminUser>) => {
    setAdminUser(prev => {
      if (!prev) return prev;
      const next = { ...prev, ...updates };
      localStorage.setItem('adminUser', JSON.stringify(next));
      return next;
    });
  };

  const login = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase
        .rpc('admin_login', {
          login_email: email,
          login_password: password
        });

      console.log('Login response:', { data, error });

      if (error) {
        console.error('Login error:', error);
        return { success: false, error: 'Invalid credentials' };
      }

      if (!data || data.length === 0) {
        console.log('No user found');
        return { success: false, error: 'Invalid credentials' };
      }

      const response = data[0];

      if (response?.requires_otp) {
        console.log('2FA required, challenge issued');
        return {
          success: false,
          requiresOtp: true,
          challengeId: response.challenge_id as string
        };
      }

      if (!response?.success) {
        return { success: false, error: response?.error ?? 'Invalid credentials' };
      }

      const user = mapUser(response);
      console.log('Login successful:', user);
      persistUser(user);

      return { success: true };
    } catch (err) {
      console.error('Login exception:', err);
      return { success: false, error: 'Login failed' };
    }
  };

  const verifyTwoFactor = async (challengeId: string, code: string) => {
    try {
      const { data, error } = await supabase.rpc('admin_verify_two_factor', {
        challenge: challengeId,
        otp_code: code
      });

      if (error) {
        console.error('2FA verification error:', error);
        return { success: false, error: 'Verification failed' };
      }

      const result = data?.[0];

      if (!result?.success) {
        return { success: false, error: result?.error ?? 'Verification failed' };
      }

      const user = mapUser(result);
      persistUser(user);

      return { success: true };
    } catch (err) {
      console.error('2FA verification exception:', err);
      return { success: false, error: 'Verification failed' };
    }
  };

  const ensureAdminEmail = () => {
    if (!adminUser) {
      throw new Error('Admin user not available');
    }
    return adminUser.email;
  };

  const startTwoFactorSetup = async (password: string) => {
    try {
      const email = ensureAdminEmail();
      const { data, error } = await supabase.rpc('admin_start_two_factor', {
        login_email: email,
        login_password: password
      });

      if (error) {
        console.error('startTwoFactorSetup error:', error);
        return { error: 'Unable to start setup' };
      }

      const result = data?.[0];
      if (!result?.secret) {
        return { error: 'Unable to start setup' };
      }

      return {
        secret: result.secret as string,
        recoveryCodes: result.recovery_codes as string[]
      };
    } catch (err) {
      console.error('startTwoFactorSetup exception:', err);
      return { error: 'Unable to start setup' };
    }
  };

  const confirmTwoFactorSetup = async (password: string, code: string) => {
    try {
      const email = ensureAdminEmail();
      const { data, error } = await supabase.rpc('admin_confirm_two_factor', {
        login_email: email,
        login_password: password,
        otp_code: code
      });

      if (error) {
        console.error('confirmTwoFactorSetup error:', error);
        return { success: false, error: 'Unable to confirm 2FA' };
      }

      const result = data?.[0];
      if (!result?.success) {
        return { success: false, error: result?.error ?? 'Unable to confirm 2FA' };
      }

      updateAdminUser({ twoFactorEnabled: true });
      return { success: true };
    } catch (err) {
      console.error('confirmTwoFactorSetup exception:', err);
      return { success: false, error: 'Unable to confirm 2FA' };
    }
  };

  const disableTwoFactor = async (password: string, code: string) => {
    try {
      const email = ensureAdminEmail();
      const { data, error } = await supabase.rpc('admin_disable_two_factor', {
        login_email: email,
        login_password: password,
        otp_code: code
      });

      if (error) {
        console.error('disableTwoFactor error:', error);
        return { success: false, error: 'Unable to disable 2FA' };
      }

      const result = data?.[0];
      if (!result?.success) {
        return { success: false, error: result?.error ?? 'Unable to disable 2FA' };
      }

      updateAdminUser({ twoFactorEnabled: false });
      return { success: true };
    } catch (err) {
      console.error('disableTwoFactor exception:', err);
      return { success: false, error: 'Unable to disable 2FA' };
    }
  };

  const logout = () => {
    persistUser(null);
  };

  return (
    <AdminAuthContext.Provider value={{
      adminUser,
      loading,
      login,
      verifyTwoFactor,
      startTwoFactorSetup,
      confirmTwoFactorSetup,
      disableTwoFactor,
      updateAdminUser,
      logout,
      isAuthenticated: !!adminUser
    }}>
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth() {
  const context = useContext(AdminAuthContext);
  if (context === undefined) {
    // During static generation/build time, return a safe default
    // This allows components to be rendered during build without errors
    if (typeof window === 'undefined') {
      return {
        adminUser: null,
        loading: true,
        login: async () => ({ success: false, error: 'Not available during build' }),
        verifyTwoFactor: async () => ({ success: false, error: 'Not available during build' }),
        startTwoFactorSetup: async () => ({ error: 'Not available during build' }),
        confirmTwoFactorSetup: async () => ({ success: false, error: 'Not available during build' }),
        disableTwoFactor: async () => ({ success: false, error: 'Not available during build' }),
        updateAdminUser: () => {},
        logout: () => {},
        isAuthenticated: false,
      } as AdminAuthContextType;
    }
    throw new Error('useAdminAuth must be used within an AdminAuthProvider');
  }
  return context;
}
