import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  HeartPulse,
  LayoutDashboard,
  User,
  FileText,
  MessageCircle,
  Users,
  Stethoscope,
  GraduationCap,
  BookMarked,
  Scissors,
  MessageSquare,
  QrCode,
  Globe,
  LogOut,
  Menu,
  X,
  Info,
  Wifi,
  WifiOff,
  RefreshCw,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLang } from '../context/LangContext';
import { useConnectivity } from '../context/ConnectivityContext';

export default function AppLayout({ children }) {
  const { user, logout, syncLanguage } = useAuth();
  const { t, lang } = useLang();
  const {
    isBrowserOnline,
    backendStatus,
    isBackendReachable,
    isGeminiConfigured,
    checking,
    checkConnectivity,
  } = useConnectivity();
  const isCheckingInitial = backendStatus === 'checking' && checking;
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const isDoctor = user?.role === 'doctor';
  const isDemoUser = Boolean(user?.username?.includes('demo'));

  const navItems = isDoctor
    ? [
        { to: '/doctor/dashboard', label: t.nav.dashboard, icon: LayoutDashboard },
        { to: '/doctor/patients', label: t.nav.patients, icon: Users },
        { to: '/doctor/mentor', label: t.nav.mentor, icon: GraduationCap },
        { to: '/doctor/references', label: t.nav.references, icon: BookMarked },
        { to: '/doctor/surgical-tips', label: t.nav.surgicalTips, icon: Scissors },
        { to: '/doctor/forum', label: t.nav.forum, icon: MessageSquare },
        { to: '/doctor/chat', label: t.nav.chat, icon: MessageCircle },
        { to: '/doctor/profile', label: t.nav.doctorProfile, icon: Stethoscope },
      ]
    : [
        { to: '/patient/dashboard', label: t.nav.dashboard, icon: LayoutDashboard },
        { to: '/patient/profile', label: t.nav.profile, icon: User },
        { to: '/patient/reports', label: t.nav.reports, icon: FileText },
        { to: '/patient/chat', label: t.nav.chat, icon: MessageCircle },
        { to: '/patient/community', label: t.nav.community, icon: MessageSquare },
        { to: '/patient/care', label: t.nav.careTeam, icon: Stethoscope },
        { to: '/patient/qr', label: t.nav.qrShare, icon: QrCode },
      ];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleToggleLanguage = () => {
    syncLanguage(lang === 'ar' ? 'en' : 'ar');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="sticky top-0 z-30 bg-white border-b border-slate-200 px-4 sm:px-6 h-16 flex items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setSidebarOpen((v) => !v)}
            className="lg:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100"
            aria-label="Toggle Menu"
          >
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl gradient-primary text-white flex items-center justify-center shadow-sm">
              <HeartPulse className="w-5 h-5" />
            </div>
            <div className="leading-tight">
              <span className="font-bold text-lg text-slate-900">{t.appName}</span>
              <span className="hidden sm:inline-block ms-2 text-xs px-2 py-0.5 rounded-full bg-primary-50 text-primary-700 font-medium border border-primary-200">
                {isDoctor ? t.auth.doctorRole : t.auth.patientRole}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {/* Live Connectivity & Gemini Indicator */}
          <button
            type="button"
            onClick={checkConnectivity}
            title={
              isCheckingInitial
                ? t.connectivity.backendChecking
                : !isBrowserOnline
                ? t.connectivity.offline
                : !isBackendReachable
                ? t.connectivity.backendDown
                : isGeminiConfigured
                ? t.connectivity.geminiReady
                : t.connectivity.geminiMissing
            }
            className={`hidden md:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
              isCheckingInitial
                ? 'bg-slate-50 text-slate-600 border-slate-200'
                : !isBrowserOnline || !isBackendReachable
                ? 'bg-rose-50 text-rose-700 border-rose-200'
                : isGeminiConfigured
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-amber-50 text-amber-800 border-amber-200'
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
                : !isBackendReachable
                ? t.connectivity.backendDown
                : isGeminiConfigured
                ? t.connectivity.geminiReady
                : t.connectivity.geminiMissing}
            </span>
            <RefreshCw className={`w-3 h-3 opacity-70 ${checking ? 'animate-spin' : ''}`} />
          </button>

          <button
            type="button"
            onClick={handleToggleLanguage}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-xs sm:text-sm font-medium text-slate-700"
          >
            <Globe className="w-4 h-4 text-primary-600" />
            <span>{t.common.languageToggle}</span>
          </button>

          <div className="hidden sm:flex items-center gap-2 ps-2 border-s border-slate-200">
            <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-800 flex items-center justify-center font-semibold text-sm">
              {(user?.full_name || user?.username || 'U').charAt(0).toUpperCase()}
            </div>
            <div className="text-start leading-tight">
              <p className="text-sm font-medium text-slate-800 max-w-[140px] truncate">
                {user?.full_name}
              </p>
              <p className="text-[11px] text-slate-500">@{user?.username}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium text-rose-600 hover:bg-rose-50"
            title={t.common.logout}
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden md:inline">{t.common.logout}</span>
          </button>
        </div>
      </header>

      {/* Offline / Backend Unreachable Banner */}
      {(!isBrowserOnline || backendStatus === 'disconnected') && (
        <div className="bg-rose-50 border-b border-rose-200 px-4 sm:px-6 py-2.5 text-xs text-rose-900 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <WifiOff className="w-4 h-4 text-rose-600 shrink-0" />
            <span>
              {!isBrowserOnline
                ? t.connectivity.offlineAiMessage
                : t.connectivity.backendDownMessage}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {isDoctor && (
              <NavLink
                to="/doctor/references"
                className="underline font-semibold text-rose-800"
              >
                {t.connectivity.browseOfflineRefs}
              </NavLink>
            )}
            <button
              type="button"
              onClick={checkConnectivity}
              className="px-2.5 py-1 rounded bg-white border border-rose-300 text-rose-800 font-medium hover:bg-rose-100 inline-flex items-center gap-1"
            >
              <RefreshCw className={`w-3 h-3 ${checking ? 'animate-spin' : ''}`} />
              <span>{t.common.retry}</span>
            </button>
          </div>
        </div>
      )}

      {/* Demo Banner */}
      {isDemoUser && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 sm:px-6 py-2 text-xs text-amber-900 flex items-center gap-2">
          <Info className="w-4 h-4 text-amber-600 shrink-0" />
          <span>{t.demoBanner}</span>
        </div>
      )}

      <div className="flex-1 flex relative">
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-slate-900/40 z-20 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        <aside
          className={`fixed lg:static inset-y-0 start-0 z-20 w-64 bg-white border-e border-slate-200 pt-20 lg:pt-6 pb-6 px-3 flex flex-col justify-between transition-transform duration-200 ${
            sidebarOpen
              ? 'translate-x-0'
              : '-translate-x-full rtl:translate-x-full lg:translate-x-0 lg:rtl:translate-x-0'
          }`}
        >
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => setSidebarOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-primary-50 text-primary-700 border border-primary-200/80 shadow-xs'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }`
                  }
                >
                  <Icon className="w-5 h-5 shrink-0" />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </nav>

          <div className="px-3 pt-4 border-t border-slate-100 text-xs text-slate-400">
            MedConnect Full-Stack Prototype
          </div>
        </aside>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
