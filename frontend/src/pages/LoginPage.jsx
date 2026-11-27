import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LogIn, UserCheck, Stethoscope, AlertCircle } from 'lucide-react';
import AuthLayout from '../layouts/AuthLayout';
import { getFriendlyErrorMessage } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useConnectivity } from '../context/ConnectivityContext';
import { useLang } from '../context/LangContext';
import { useToast } from '../components/Toast';

export default function LoginPage() {
  const { login } = useAuth();
  const { isBackendReachable, backendStatus } = useConnectivity();
  const { t, lang } = useLang();
  const toast = useToast();
  const navigate = useNavigate();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (u, p) => {
    if (!isBackendReachable && backendStatus === 'disconnected') {
      setError(t.connectivity.backendDownMessage);
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      const user = await login(u, p);
      toast.success(`${t.auth.welcomeBack}, ${user.full_name}`);
      navigate(user.role === 'doctor' ? '/doctor/dashboard' : '/patient/dashboard');
    } catch (err) {
      setError(getFriendlyErrorMessage(err, lang));
    } finally {
      setSubmitting(false);
    }
  };

  const onSubmit = (e) => {
    e.preventDefault();
    handleLogin(username, password);
  };

  return (
    <AuthLayout>
      <div className="card space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-900">{t.auth.signInTitle}</h1>
          <p className="text-sm text-slate-500 mt-1">{t.auth.signInSubtitle}</p>
        </div>

        {error && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-sm">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              {t.auth.usernameOrEmail}
            </label>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="patient_demo"
              className="input-field"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              {t.auth.password}
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••"
              className="input-field"
            />
          </div>

          <button
            type="submit"
            disabled={submitting || backendStatus === 'disconnected'}
            className="btn-primary w-full inline-flex items-center justify-center gap-2 py-2.5 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <LogIn className="w-4 h-4" />
            <span>{submitting ? t.common.loading : t.auth.signInBtn}</span>
          </button>
        </form>

        {/* Demo Quick Login */}
        <div className="pt-4 border-t border-slate-200 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 text-center">
            {t.auth.quickDemoTitle}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <button
              type="button"
              disabled={submitting || backendStatus === 'disconnected'}
              onClick={() => handleLogin('patient_demo', 'demo123')}
              className="btn-secondary text-xs sm:text-sm inline-flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <UserCheck className="w-4 h-4 text-primary-600" />
              <span>{t.auth.demoPatientBtn}</span>
            </button>
            <button
              type="button"
              disabled={submitting || backendStatus === 'disconnected'}
              onClick={() => handleLogin('doctor_demo', 'demo123')}
              className="btn-secondary text-xs sm:text-sm inline-flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Stethoscope className="w-4 h-4 text-sky-600" />
              <span>{t.auth.demoDoctorBtn}</span>
            </button>
          </div>
          <p className="text-[11px] text-slate-400 text-center">{t.auth.demoCredsNote}</p>
        </div>

        <p className="text-sm text-center text-slate-600">
          {t.auth.noAccount}{' '}
          <Link to="/register" className="font-semibold text-primary-600 hover:text-primary-700">
            {t.auth.createOne}
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
}
