import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLang } from '../context/LangContext';

export default function ProtectedRoute({ children, allowedRole }) {
  const { user, loading, isAuthenticated } = useAuth();
  const { t } = useLang();

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 gap-3">
        <div className="spinner" />
        <p className="text-sm text-slate-500">{t.common.loading}</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRole && user.role !== allowedRole) {
    const target = user.role === 'doctor' ? '/doctor/dashboard' : '/patient/dashboard';
    return <Navigate to={target} replace />;
  }

  return children;
}
