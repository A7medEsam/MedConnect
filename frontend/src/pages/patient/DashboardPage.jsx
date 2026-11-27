import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity,
  Pill,
  AlertTriangle,
  FileText,
  Upload,
  MessageCircle,
  User,
  Calendar,
  Stethoscope,
  QrCode,
} from 'lucide-react';
import AppLayout from '../../layouts/AppLayout';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useLang } from '../../context/LangContext';
import { useToast } from '../../components/Toast';

export default function PatientDashboardPage() {
  const { user } = useAuth();
  const { t } = useLang();
  const toast = useToast();

  const [loading, setLoading] = useState(true);
  const [profileData, setProfileData] = useState(null);
  const [reports, setReports] = useState([]);
  const [appointments, setAppointments] = useState([]);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const [prof, reps, appts] = await Promise.all([
          api.getPatientProfile(),
          api.listReports(),
          api.listAppointments(),
        ]);
        if (active) {
          setProfileData(prof);
          setReports(reps);
          setAppointments(appts);
        }
      } catch (err) {
        if (active) toast.error(err.message);
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-20">
          <div className="spinner" />
        </div>
      </AppLayout>
    );
  }

  const conditions = profileData?.conditions || [];
  const medications = profileData?.medications || [];
  const allergies = profileData?.allergies || [];
  const vitals = profileData?.vitals || [];

  const stats = [
    {
      label: t.dashboard.conditionsCount,
      value: conditions.length,
      icon: Activity,
      color: 'bg-teal-50 text-teal-700',
    },
    {
      label: t.dashboard.medicationsCount,
      value: medications.length,
      icon: Pill,
      color: 'bg-sky-50 text-sky-700',
    },
    {
      label: t.dashboard.allergiesCount,
      value: allergies.length,
      icon: AlertTriangle,
      color: 'bg-amber-50 text-amber-700',
    },
    {
      label: t.dashboard.reportsCount,
      value: reports.length,
      icon: FileText,
      color: 'bg-indigo-50 text-indigo-700',
    },
  ];

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Welcome Header */}
        <div className="gradient-primary rounded-2xl p-6 sm:p-8 text-white shadow-sm">
          <h1 className="text-2xl sm:text-3xl font-bold">
            {t.dashboard.hello}, {user?.full_name}
          </h1>
          <p className="text-primary-50 mt-1.5 text-sm sm:text-base max-w-2xl">
            {t.dashboard.patientSubtitle}
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((s) => {
            const Icon = s.icon;
            return (
              <div key={s.label} className="card p-5 flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${s.color}`}>
                  <Icon className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900">{s.value}</p>
                  <p className="text-xs sm:text-sm text-slate-500">{s.label}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Quick Actions */}
        <div className="card">
          <h2 className="text-base font-semibold text-slate-900 mb-4">
            {t.dashboard.quickActions}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <Link
              to="/patient/reports"
              className="flex items-center gap-3 p-3.5 rounded-xl border border-slate-200 hover:border-primary-400 hover:bg-primary-50/50 transition-colors"
            >
              <Upload className="w-5 h-5 text-primary-600 shrink-0" />
              <span className="text-sm font-medium text-slate-800">
                {t.dashboard.uploadReportAction}
              </span>
            </Link>
            <Link
              to="/patient/chat"
              className="flex items-center gap-3 p-3.5 rounded-xl border border-slate-200 hover:border-primary-400 hover:bg-primary-50/50 transition-colors"
            >
              <MessageCircle className="w-5 h-5 text-sky-600 shrink-0" />
              <span className="text-sm font-medium text-slate-800">
                {t.dashboard.askAiAction}
              </span>
            </Link>
            <Link
              to="/patient/profile"
              className="flex items-center gap-3 p-3.5 rounded-xl border border-slate-200 hover:border-primary-400 hover:bg-primary-50/50 transition-colors"
            >
              <User className="w-5 h-5 text-emerald-600 shrink-0" />
              <span className="text-sm font-medium text-slate-800">
                {t.dashboard.editProfileAction}
              </span>
            </Link>
            <Link
              to="/patient/care"
              className="flex items-center gap-3 p-3.5 rounded-xl border border-slate-200 hover:border-primary-400 hover:bg-primary-50/50 transition-colors"
            >
              <Stethoscope className="w-5 h-5 text-indigo-600 shrink-0" />
              <span className="text-sm font-medium text-slate-800">
                {t.dashboard.manageCareAction}
              </span>
            </Link>
            <Link
              to="/patient/qr"
              className="flex items-center gap-3 p-3.5 rounded-xl border border-slate-200 hover:border-primary-400 hover:bg-primary-50/50 transition-colors"
            >
              <QrCode className="w-5 h-5 text-teal-600 shrink-0" />
              <span className="text-sm font-medium text-slate-800">
                {t.dashboard.qrShareAction}
              </span>
            </Link>
          </div>
        </div>

        {/* Recent Vitals & Appointments */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Vitals */}
          <div className="card space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-slate-900">
                {t.dashboard.recentVitals}
              </h2>
              <Link
                to="/patient/profile"
                className="text-xs font-medium text-primary-600 hover:text-primary-700"
              >
                {t.common.viewAll}
              </Link>
            </div>
            {vitals.length === 0 ? (
              <p className="text-sm text-slate-500 py-4">{t.dashboard.noVitalsYet}</p>
            ) : (
              <div className="space-y-2.5">
                {vitals.slice(0, 4).map((v) => (
                  <div
                    key={v.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-200/80"
                  >
                    <div>
                      <p className="text-sm font-medium text-slate-800">
                        {t.profile.vitalTypes[v.vital_type] || v.vital_type}
                      </p>
                      <p className="text-xs text-slate-500">
                        {new Date(v.recorded_at).toLocaleString()}
                      </p>
                    </div>
                    <div className="text-end">
                      <span className="text-base font-bold text-primary-700">
                        {v.value} {v.unit}
                      </span>
                      {v.is_demo && (
                        <span className="block text-[10px] text-amber-600">
                          {t.common.demoBadge}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Appointments */}
          <div className="card space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-primary-600" />
                <span>{t.dashboard.upcomingAppointments}</span>
              </h2>
              <Link
                to="/patient/care"
                className="text-xs font-medium text-primary-600 hover:text-primary-700"
              >
                {t.common.viewAll}
              </Link>
            </div>
            {appointments.length === 0 ? (
              <p className="text-sm text-slate-500 py-4">
                {t.dashboard.noAppointmentsYet}
              </p>
            ) : (
              <div className="space-y-2.5">
                {appointments.slice(0, 4).map((appt) => (
                  <div
                    key={appt.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-200/80"
                  >
                    <div>
                      <p className="text-sm font-medium text-slate-800">
                        {appt.doctor_name}
                      </p>
                      <p className="text-xs text-slate-500">
                        {new Date(appt.scheduled_at).toLocaleString()}
                      </p>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-800">
                      {appt.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
