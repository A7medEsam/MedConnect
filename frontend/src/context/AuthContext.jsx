import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api, getStoredToken, setStoredToken, setUnauthorizedHandler } from '../api/client';
import { useLang } from './LangContext';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const { setLang } = useLang();

  const logout = useCallback(() => {
    setStoredToken(null);
    setUser(null);
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(logout);
  }, [logout]);

  useEffect(() => {
    let active = true;
    async function restoreSession() {
      const token = getStoredToken();
      if (!token) {
        if (active) setLoading(false);
        return;
      }
      try {
        const me = await api.me();
        if (active) {
          setUser(me);
          if (me.language === 'ar' || me.language === 'en') {
            setLang(me.language);
          }
        }
      } catch (err) {
        if (err?.status === 401) {
          setStoredToken(null);
        }
        if (active) setUser(null);
      } finally {
        if (active) setLoading(false);
      }
    }
    restoreSession();
    return () => {
      active = false;
    };
  }, [setLang]);

  const login = async (username, password) => {
    const res = await api.login({ username, password });
    setStoredToken(res.access_token);
    setUser(res.user);
    if (res.user?.language) {
      setLang(res.user.language);
    }
    return res.user;
  };

  const register = async (payload) => {
    const res = await api.register(payload);
    setStoredToken(res.access_token);
    setUser(res.user);
    return res.user;
  };

  const syncLanguage = async (nextLang) => {
    setLang(nextLang);
    if (user) {
      try {
        const updated = await api.updateLanguage(nextLang);
        setUser(updated);
      } catch {
        // Non-blocking if backend language update fails
      }
    }
  };

  const refreshUser = async () => {
    const me = await api.me();
    setUser(me);
    return me;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated: Boolean(user),
        login,
        register,
        logout,
        syncLanguage,
        refreshUser,
        setUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
