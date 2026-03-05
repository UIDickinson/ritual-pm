'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const parseResponseBody = async (response) => {
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      return response.json();
    }

    const text = await response.text();
    if (text?.startsWith('<!DOCTYPE') || text?.startsWith('<html')) {
      throw new Error('Server returned HTML instead of JSON. Check API route/runtime logs.');
    }

    try {
      return JSON.parse(text);
    } catch {
      throw new Error(text || 'Unexpected server response');
    }
  };

  // Check session on mount via server endpoint
  useEffect(() => {
    checkSession();
  }, []);

  const checkSession = async () => {
    try {
      const response = await fetch('/api/auth/session');
      const data = await parseResponseBody(response);
      if (data.user) {
        setUser(data.user);
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error('Session check failed:', error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (username, password) => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      const data = await parseResponseBody(response);

      if (!response.ok) {
        throw new Error(data.error || 'Login failed');
      }

      setUser(data.user);
      return { success: true, user: data.user };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const register = async (username, password) => {
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      const data = await parseResponseBody(response);

      if (!response.ok) {
        throw new Error(data.error || 'Registration failed');
      }

      setUser(data.user);
      return { success: true, user: data.user };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (error) {
      console.error('Logout error:', error);
    }
    setUser(null);
  };

  const refreshUser = async () => {
    if (!user) return;
    
    try {
      const response = await fetch(`/api/users/${user.id}`);
      const data = await parseResponseBody(response);
      
      if (response.ok) {
        setUser(data.user);
      }
    } catch (error) {
      console.error('Error refreshing user:', error);
    }
  };

  const updateBalance = useCallback((newBalance) => {
    setUser(prev => prev ? { ...prev, points_balance: newBalance } : null);
  }, []);

  const value = {
    user,
    setUser,
    login,
    register,
    logout,
    refreshUser,
    updateBalance,
    loading,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'admin',
    isMember: user?.role === 'member' || user?.role === 'admin'
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === null) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
