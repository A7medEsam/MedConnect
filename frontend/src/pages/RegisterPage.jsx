import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { UserPlus, User, Stethoscope, AlertCircle } from 'lucide-react';
import AuthLayout from '../layouts/AuthLayout';
import { getFriendlyErrorMessage } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useConnectivity } from '../context/ConnectivityContext';
import { useLang } from '../context/LangContext';
import { useToast } from '../components/Toast';

export default function RegisterPage() {
  const { register } = useAuth();
  const { backendStatus } = useConnectivity();
  const { t, lang } = useLang();
  const toast = useToast();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    full_name: '',
    username: '',
    email: '',
    password: '',
    role: 'patient',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const onSubmit = async (e) => {
    e.preventDefault();
    if (backendStatus === 'disconnected') {
      setError(t.connectivity.backendDownMessage);
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      const user = await register({ ...form, language: lang });
      toast.success(t.auth.accountCreated);
      navigate(user.role === 'doctor' ? '/doctor/dashboard' : '/patient/dashboard');
    } catch (err) {
      setError(getFriendlyErrorMessage(err, lang));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout>
      <div className="card space-y-5">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-900">{t.auth.registerTitle}</h1>
          <p className="text-sm text-slate-500 mt-1">{t.auth.registerSubtitle}</p>
        </div>

        {error && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-sm">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={onSubmit} className="space-y-4">
          {/* Role selector */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              {t.auth.role}
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setForm({ ...form, role: 'patient' })}
                className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border text-sm font-medium transition-all ${
                  form.role === 'patient'
                    ? 'border-primary-600 bg-primary-50 text-primary-700 ring-1 ring-primary-500'
                    : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                <User className="w-4 h-4" />
                <span>{t.auth.patientRole}</span>
              </button>
              <button
                type="button"
                onClick={() => setForm({ ...form, role: 'doctor' })}
                className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border text-sm font-medium transition-all ${
                  form.role === 'doctor'
                    ? 'border-primary-600 bg-primary-50 text-primary-700 ring-1 ring-primary-500'
                    : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Stethoscope className="w-4 h-4" />
                <span>{t.auth.doctorRole}</span>
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              {t.auth.fullName}
            </label>
            <input
              type="text"
              required
              minLength={2}
              value={form.full_name}
              onChange={(e) => setForm({ ...form, full_name: e.target.value })}
              className="input-field"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              {t.auth.username}
            </label>
            <input
              type="text"
              required
              minLength={3}
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              className="input-field"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              {t.auth.email}
            </label>
            <input
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
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
              minLength={4}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="input-field"
            />
          </div>

          <button
            type="submit"
            disabled={submitting || backendStatus === 'disconnected'}
            className="btn-primary w-full inline-flex items-center justify-center gap-2 py-2.5 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <UserPlus className="w-4 h-4" />
            <span>{submitting ? t.common.loading : t.auth.registerBtn}</span>
          </button>
        </form>

        <p className="text-sm text-center text-slate-600">
          {t.auth.haveAccount}{' '}
          <Link to="/login" className="font-semibold text-primary-600 hover:text-primary-700">
            {t.auth.signInHere}
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
}
