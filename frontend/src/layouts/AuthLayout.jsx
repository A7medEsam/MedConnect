import React from 'react';
import { HeartPulse, Globe, Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { useLang } from '../context/LangContext';
import { useConnectivity } from '../context/ConnectivityContext';

export default function AuthLayout({ children }) {
  const { t, toggleLang } = useLang();
  const { isBrowserOnline, backendStatus, isBackendReachable, checking, checkConnectivity } =
    useConnectivity();

  const isCheckingInitial = backendStatus === 'checking' && checking;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="w-full px-4 sm:px-8 py-4 flex items-center justify-between border-b border-slate-200 bg-white/80 backdrop-blur-sm">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl gradient-primary text-white flex items-center justify-center shadow-sm">
            <HeartPulse className="w-5 h-5" />
          </div>
          <div>
            <span className="font-bold text-lg text-slate-900 tracking-tight">
              {t.appName}
            </span>
            <p className="text-[11px] text-slate-500 hidden sm:block">{t.tagline}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={checkConnectivity}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border ${
              isCheckingInitial
                ? 'bg-slate-50 text-slate-600 border-slate-200'
                : !isBrowserOnline || !isBackendReachable
                ? 'bg-rose-50 text-rose-700 border-rose-200'
                : 'bg-emerald-50 text-emerald-700 border-emerald-200'
            }`}
          >
            {isBrowserOnline && isBackendReachable ? (
              <Wifi className="w-3.5 h-3.5" />
            ) : (
              <WifiOff className="w-3.5 h-3.5" />
            )}
            <span>
              {isCheckingInitial
                ? t.connectivity.backendChecking
                : !isBrowserOnline
                ? t.connectivity.offline
                : isBackendReachable
                ? t.connectivity.backendOk
                : t.connectivity.backendDown}
            </span>
            <RefreshCw className={`w-3 h-3 opacity-70 ${checking ? 'animate-spin' : ''}`} />
          </button>

          <button
            type="button"
            onClick={toggleLang}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-sm font-medium text-slate-700"
          >
            <Globe className="w-4 h-4 text-primary-600" />
            <span>{t.common.languageToggle}</span>
          </button>
        </div>
      </header>

      {backendStatus === 'disconnected' && (
        <div className="bg-rose-50 border-b border-rose-200 px-4 sm:px-8 py-2.5 text-xs text-rose-900 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <WifiOff className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{t.connectivity.backendDownMessage}</span>
          </div>
          <button
            type="button"
            onClick={checkConnectivity}
            className="px-2.5 py-1 rounded bg-white border border-rose-300 text-rose-800 font-medium hover:bg-rose-100 inline-flex items-center gap-1"
          >
            <RefreshCw className={`w-3 h-3 ${checking ? 'animate-spin' : ''}`} />
            <span>{t.common.retry}</span>
          </button>
        </div>
      )}

      <main className="flex-1 flex items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-md">{children}</div>
      </main>
    </div>
  );
}
