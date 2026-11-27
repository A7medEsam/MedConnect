import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api, subscribeBackendStatus } from '../api/client';

const ConnectivityContext = createContext(null);
const PUBLIC_EDU_CACHE_KEY = 'medconnect_public_edu_cache';

function loadCachedBundle() {
  try {
    const raw = localStorage.getItem(PUBLIC_EDU_CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function ConnectivityProvider({ children }) {
  const [isBrowserOnline, setIsBrowserOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  // 'checking' | 'connected' | 'disconnected'
  const [backendStatus, setBackendStatus] = useState('checking');
  const [isGeminiConfigured, setIsGeminiConfigured] = useState(false);
  const [geminiModel, setGeminiModel] = useState('');
  const [timeouts, setTimeouts] = useState({
    health_seconds: 3,
    upload_seconds: 30,
    chat_seconds: 45,
    report_seconds: 90,
  });
  const [eduBundle, setEduBundle] = useState(() => loadCachedBundle());
  const [checking, setChecking] = useState(true);

  const checkConnectivity = useCallback(async () => {
    setChecking(true);
    const browserOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
    setIsBrowserOnline(browserOnline);

    try {
      const health = await api.health();
      setBackendStatus('connected');
      setIsGeminiConfigured(Boolean(health?.gemini_configured));
      setGeminiModel(health?.gemini_model || '');
      if (health?.timeouts) {
        setTimeouts(health.timeouts);
      }

      // Refresh public educational cache (contains zero private patient data)
      try {
        const bundle = await api.getClinicalBundle();
        if (bundle && Array.isArray(bundle.references)) {
          setEduBundle(bundle);
          localStorage.setItem(PUBLIC_EDU_CACHE_KEY, JSON.stringify(bundle));
        }
      } catch {
        // Keep cached bundle if refresh fails
      }
      return true;
    } catch {
      setBackendStatus('disconnected');
      return false;
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeBackendStatus((reachable) => {
      setBackendStatus(reachable ? 'connected' : 'disconnected');
    });
    checkConnectivity();

    const handleOnline = () => {
      setIsBrowserOnline(true);
      checkConnectivity();
    };
    const handleOffline = () => {
      setIsBrowserOnline(false);
    };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    const interval = setInterval(checkConnectivity, 30000);
    return () => {
      unsubscribe();
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, [checkConnectivity]);

  const isBackendReachable = backendStatus === 'connected';
  const canUseAi = isBrowserOnline && isBackendReachable && isGeminiConfigured;

  return (
    <ConnectivityContext.Provider
      value={{
        isBrowserOnline,
        backendStatus,
        isBackendReachable,
        isGeminiConfigured,
        geminiModel,
        timeouts,
        canUseAi,
        eduBundle,
        checking,
        checkConnectivity,
      }}
    >
      {children}
    </ConnectivityContext.Provider>
  );
}

export function useConnectivity() {
  const ctx = useContext(ConnectivityContext);
  if (!ctx) {
    throw new Error('useConnectivity must be used within ConnectivityProvider');
  }
  return ctx;
}
