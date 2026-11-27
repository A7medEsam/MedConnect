import React from 'react';
import { Link } from 'react-router-dom';
import { WifiOff, RefreshCw, BookMarked } from 'lucide-react';
import { useConnectivity } from '../context/ConnectivityContext';
import { useLang } from '../context/LangContext';
import { useAuth } from '../context/AuthContext';

export default function OfflineAiAlert() {
  const { isBrowserOnline, isBackendReachable, isGeminiConfigured, checking, checkConnectivity } =
    useConnectivity();
  const { t } = useLang();
  const { user } = useAuth();

  if (isBrowserOnline && isBackendReachable && isGeminiConfigured) {
    return null;
  }

  return (
    <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-amber-950 space-y-2.5">
      <div className="flex items-start gap-2.5">
        <WifiOff className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
        <div className="space-y-1 text-sm">
          <p className="font-semibold">
            {!isBrowserOnline
              ? t.connectivity.offlineBannerTitle
              : !isBackendReachable
              ? t.connectivity.backendDown
              : t.connectivity.geminiMissing}
          </p>
          <p className="text-xs text-amber-900 leading-relaxed">
            {!isBrowserOnline
              ? t.connectivity.offlineAiMessage
              : !isBackendReachable
              ? t.connectivity.backendDownMessage
              : t.connectivity.geminiMissingMessage}
          </p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2 pt-1">
        <button
          type="button"
          onClick={checkConnectivity}
          className="px-3 py-1.5 rounded-lg bg-white border border-amber-300 text-xs font-medium text-amber-900 hover:bg-amber-100 inline-flex items-center gap-1.5"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${checking ? 'animate-spin' : ''}`} />
          <span>{t.common.retry}</span>
        </button>
        {user?.role === 'doctor' && (
          <Link
            to="/doctor/references"
            className="px-3 py-1.5 rounded-lg bg-amber-900 text-white text-xs font-medium hover:bg-amber-800 inline-flex items-center gap-1.5"
          >
            <BookMarked className="w-3.5 h-3.5" />
            <span>{t.connectivity.browseOfflineRefs}</span>
          </Link>
        )}
      </div>
    </div>
  );
}
