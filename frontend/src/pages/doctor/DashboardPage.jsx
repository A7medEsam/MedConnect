import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  Calendar,
  Stethoscope,
  ArrowRight,
  CheckCircle2,
  XCircle,
  GraduationCap,
  BookMarked,
  MessageSquare,
} from 'lucide-react';
import AppLayout from '../../layouts/AppLayout';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useLang } from '../../context/LangContext';
import { useToast } from '../../components/Toast';

export default function DoctorDashboardPage() {
  const { user } = useAuth();
  const { t } = useLang();
  const toast = useToast();

  const [patients, setPatients] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const [pats, appts] = await Promise.all([
          api.listSharedPatients(),
          api.listAppointments(),
        ]);
        if (active) {
          setPatients(pats);
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

  const updateStatus = async (id, status) => {
    try {
      const updated = await api.updateAppointment(id, { status });
      setAppointments((prev) => prev.map((a) => (a.id === id ? updated : a)));
      toast.success(status);
    } catch (err) {
      toast.error(err.message);
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex justify-center py-20">
          <div className="spinner" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="gradient-primary rounded-2xl p-6 sm:p-8 text-white shadow-sm">
          <h1 className="text-2xl sm:text-3xl font-bold">
            {t.dashboard.hello}, {user?.full_name}
          </h1>
          <p className="text-primary-50 mt-1.5 text-sm sm:text-base max-w-2xl">
            {t.dashboard.doctorSubtitle}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="card p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{patients.length}</p>
              <p className="text-sm text-slate-500">{t.dashboard.sharedPatientsCount}</p>
            </div>
          </div>

          <div className="card p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-sky-50 text-sky-700 flex items-center justify-center">
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{appointments.length}</p>
              <p className="text-sm text-slate-500">{t.dashboard.totalAppointmentsCount}</p>
            </div>
          </div>

          <Link
            to="/doctor/profile"
            className="card card-hover p-5 flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center">
                <Stethoscope className="w-6 h-6" />
              </div>
              <span className="font-semibold text-slate-800">
                {t.dashboard.openDoctorProfile}
              </span>
            </div>
            <ArrowRight className="w-5 h-5 text-slate-400 rtl:rotate-180" />
          </Link>
        </div>

        {/* Restored Clinical Tools Quick Access */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Link
            to="/doctor/mentor"
            className="card card-hover p-4 flex items-center gap-3"
          >
            <GraduationCap className="w-6 h-6 text-primary-600 shrink-0" />
            <span className="text-sm font-semibold text-slate-800">
              {t.dashboard.openMentorAction}
            </span>
          </Link>
          <Link
            to="/doctor/references"
            className="card card-hover p-4 flex items-center gap-3"
          >
            <BookMarked className="w-6 h-6 text-sky-600 shrink-0" />
            <span className="text-sm font-semibold text-slate-800">
              {t.dashboard.openRefsAction}
            </span>
          </Link>
          <Link
            to="/doctor/forum"
            className="card card-hover p-4 flex items-center gap-3"
          >
            <MessageSquare className="w-6 h-6 text-indigo-600 shrink-0" />
            <span className="text-sm font-semibold text-slate-800">
              {t.dashboard.openForumAction}
            </span>
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Shared Patients Summary */}
          <div className="card space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-slate-900">
                {t.doctor.patientsTitle}
              </h2>
              <Link
                to="/doctor/patients"
                className="text-xs font-medium text-primary-600 hover:text-primary-700"
              >
                {t.common.viewAll}
              </Link>
            </div>
            {patients.length === 0 ? (
              <p className="text-sm text-slate-500 py-4">{t.doctor.noPatients}</p>
            ) : (
              <div className="space-y-2.5">
                {patients.slice(0, 5).map((p) => (
                  <Link
                    key={p.id}
                    to={`/doctor/patients/${p.id}`}
                    className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 border border-slate-200 hover:border-primary-400 transition-colors"
                  >
                    <div>
                      <p className="font-semibold text-sm text-slate-900">
                        {p.full_name}
                      </p>
                      <p className="text-xs text-slate-500">
                        {p.conditions_count} {t.dashboard.conditionsCount} •{' '}
                        {p.reports_count} {t.dashboard.reportsCount}
                      </p>
                    </div>
                    <span className="text-xs font-medium text-primary-600">
                      {t.doctor.viewRecord}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Appointments */}
          <div className="card space-y-4">
            <h2 className="text-base font-semibold text-slate-900">
              {t.dashboard.upcomingAppointments}
            </h2>
            {appointments.length === 0 ? (
              <p className="text-sm text-slate-500 py-4">
                {t.dashboard.noAppointmentsYet}
              </p>
            ) : (
              <div className="space-y-2.5">
                {appointments.map((appt) => (
                  <div
                    key={appt.id}
                    className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <p className="font-semibold text-sm text-slate-900">
                          {appt.patient_name}
                        </p>
                        <p className="text-xs text-slate-500">
                          {new Date(appt.scheduled_at).toLocaleString()} • {appt.appointment_type}
                        </p>
                      </div>
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-800">
                        {appt.status}
                      </span>
                    </div>

                    {appt.status === 'scheduled' && (
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => updateStatus(appt.id, 'confirmed')}
                          className="text-xs px-2.5 py-1 rounded bg-emerald-600 text-white hover:bg-emerald-700 inline-flex items-center gap-1"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>{t.care.confirmVisit}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => updateStatus(appt.id, 'cancelled')}
                          className="text-xs px-2.5 py-1 rounded bg-rose-100 text-rose-700 hover:bg-rose-200 inline-flex items-center gap-1"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          <span>{t.care.cancelVisit}</span>
                        </button>
                      </div>
                    )}
                    {appt.status === 'confirmed' && (
                      <button
                        type="button"
                        onClick={() => updateStatus(appt.id, 'completed')}
                        className="text-xs px-2.5 py-1 rounded bg-sky-600 text-white hover:bg-sky-700 inline-flex items-center gap-1"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>{t.care.completeVisit}</span>
                      </button>
                    )}
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
