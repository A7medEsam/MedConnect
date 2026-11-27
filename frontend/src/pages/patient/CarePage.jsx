import React, { useEffect, useState } from 'react';
import {
  Stethoscope,
  ShieldCheck,
  ShieldOff,
  Calendar,
  X,
  MapPin,
  CreditCard,
  AlertCircle,
} from 'lucide-react';
import AppLayout from '../../layouts/AppLayout';
import { api } from '../../api/client';
import { useLang } from '../../context/LangContext';
import { useToast } from '../../components/Toast';

export default function CarePage() {
  const { t } = useLang();
  const toast = useToast();

  const [doctors, setDoctors] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [bookingDoctor, setBookingDoctor] = useState(null);
  const [visitForm, setVisitForm] = useState({
    scheduled_at: '',
    appointment_type: 'general',
    payment_method: 'clinic',
    notes: '',
  });

  const loadData = async () => {
    try {
      const [docs, appts] = await Promise.all([
        api.listDoctors(),
        api.listAppointments(),
      ]);
      setDoctors(docs);
      setAppointments(appts);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const toggleShare = async (doc) => {
    try {
      if (doc.is_shared) {
        await api.revokeDoctorShare(doc.id);
      } else {
        await api.shareWithDoctor(doc.id);
      }
      setDoctors((prev) =>
        prev.map((d) => (d.id === doc.id ? { ...d, is_shared: !d.is_shared } : d))
      );
      toast.success(doc.is_shared ? t.care.revokeBtn : t.care.sharedActive);
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleBookSubmit = async (e) => {
    e.preventDefault();
    if (!bookingDoctor) return;
    try {
      const created = await api.createAppointment({
        doctor_id: bookingDoctor.id,
        scheduled_at: visitForm.scheduled_at,
        appointment_type: visitForm.appointment_type,
        payment_method: visitForm.payment_method,
        notes: visitForm.notes,
      });
      setAppointments((prev) => [...prev, created]);
      setBookingDoctor(null);
      setVisitForm({
        scheduled_at: '',
        appointment_type: 'general',
        payment_method: 'clinic',
        notes: '',
      });
      toast.success(t.care.confirmBooking);
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleCancelVisit = async (id) => {
    try {
      const updated = await api.updateAppointment(id, { status: 'cancelled' });
      setAppointments((prev) => prev.map((a) => (a.id === id ? updated : a)));
      toast.info(t.care.cancelVisit);
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
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{t.care.title}</h1>
          <p className="text-sm text-slate-500 mt-1">{t.care.subtitle}</p>
        </div>

        {/* Doctors Directory */}
        <div className="card space-y-4">
          <h2 className="text-lg font-semibold text-slate-900">
            {t.care.doctorsTitle}
          </h2>
          {doctors.length === 0 ? (
            <p className="text-sm text-slate-500">{t.common.noData}</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {doctors.map((doc) => (
                <div
                  key={doc.id}
                  className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 flex flex-col justify-between gap-4"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-11 h-11 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center shrink-0">
                      <Stethoscope className="w-6 h-6" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <h3 className="font-semibold text-slate-900">{doc.full_name}</h3>
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            doc.is_shared
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-slate-200 text-slate-600'
                          }`}
                        >
                          {doc.is_shared ? t.care.sharedActive : t.care.notShared}
                        </span>
                      </div>
                      <p className="text-xs text-primary-700 font-medium mt-0.5">
                        {doc.specialty}
                      </p>
                      <div className="flex flex-wrap items-center gap-2 mt-1.5 text-xs text-slate-500">
                        {doc.location && (
                          <span className="inline-flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {doc.location}
                          </span>
                        )}
                        <span className="px-2 py-0.5 rounded bg-teal-50 text-teal-800 border border-teal-200 font-semibold">
                          {doc.consultation_fee || '150 SAR'}
                        </span>
                        <span className="px-2 py-0.5 rounded bg-white border border-slate-200 text-[11px]">
                          {doc.is_demo ? t.common.demoBadge : doc.verification_status}
                        </span>
                      </div>
                      {doc.clinic_name && (
                        <p className="text-xs text-slate-500 mt-1">{doc.clinic_name}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => toggleShare(doc)}
                      className={`flex-1 text-xs py-2 px-3 rounded-lg font-medium inline-flex items-center justify-center gap-1.5 border ${
                        doc.is_shared
                          ? 'bg-white border-rose-300 text-rose-700 hover:bg-rose-50'
                          : 'bg-primary-600 border-primary-600 text-white hover:bg-primary-700'
                      }`}
                    >
                      {doc.is_shared ? (
                        <>
                          <ShieldOff className="w-3.5 h-3.5" />
                          <span>{t.care.revokeBtn}</span>
                        </>
                      ) : (
                        <>
                          <ShieldCheck className="w-3.5 h-3.5" />
                          <span>{t.care.shareBtn}</span>
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => setBookingDoctor(doc)}
                      className="btn-secondary text-xs py-2 px-3 inline-flex items-center gap-1.5"
                    >
                      <Calendar className="w-3.5 h-3.5" />
                      <span>{t.care.bookVisitBtn}</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Appointments List */}
        <div className="card space-y-4">
          <h2 className="text-lg font-semibold text-slate-900">
            {t.care.appointmentsTitle}
          </h2>
          {appointments.length === 0 ? (
            <p className="text-sm text-slate-500">{t.dashboard.noAppointmentsYet}</p>
          ) : (
            <div className="space-y-2.5">
              {appointments.map((appt) => (
                <div
                  key={appt.id}
                  className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200"
                >
                  <div>
                    <p className="font-semibold text-sm text-slate-900">
                      {appt.doctor_name}
                      {appt.doctor_specialty ? ` — ${appt.doctor_specialty}` : ''}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {new Date(appt.scheduled_at).toLocaleString()} •{' '}
                      {t.care.visitTypes[appt.appointment_type] || appt.appointment_type} •{' '}
                      <strong>{appt.consultation_fee || '150 SAR'}</strong> (
                      {t.care.paymentMethods[appt.payment_method] || appt.payment_method})
                    </p>
                    {appt.notes && (
                      <p className="text-xs text-slate-600 mt-1">{appt.notes}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-800">
                      {appt.status}
                    </span>
                    {appt.status !== 'cancelled' && appt.status !== 'completed' && (
                      <button
                        type="button"
                        onClick={() => handleCancelVisit(appt.id)}
                        className="text-xs text-rose-600 hover:underline font-medium"
                      >
                        {t.care.cancelVisit}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Book Visit Modal */}
      {bookingDoctor && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">
                {t.care.bookModalTitle}
              </h3>
              <button
                type="button"
                onClick={() => setBookingDoctor(null)}
                className="p-1 rounded-lg text-slate-400 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-900">{bookingDoctor.full_name}</p>
                <p className="text-xs text-primary-700">{bookingDoctor.specialty}</p>
              </div>
              <span className="px-2.5 py-1 rounded-lg bg-teal-50 text-teal-800 border border-teal-200 text-xs font-bold">
                {bookingDoctor.consultation_fee || '150 SAR'}
              </span>
            </div>

            <form onSubmit={handleBookSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  {t.care.dateTime}
                </label>
                <input
                  type="datetime-local"
                  required
                  value={visitForm.scheduled_at}
                  onChange={(e) =>
                    setVisitForm({ ...visitForm, scheduled_at: e.target.value })
                  }
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  {t.care.visitType}
                </label>
                <select
                  value={visitForm.appointment_type}
                  onChange={(e) =>
                    setVisitForm({ ...visitForm, appointment_type: e.target.value })
                  }
                  className="input-field"
                >
                  {Object.entries(t.care.visitTypes).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1 flex items-center gap-1">
                  <CreditCard className="w-3.5 h-3.5" />
                  <span>{t.care.paymentMethod}</span>
                </label>
                <select
                  value={visitForm.payment_method}
                  onChange={(e) =>
                    setVisitForm({ ...visitForm, payment_method: e.target.value })
                  }
                  className="input-field"
                >
                  {Object.entries(t.care.paymentMethods).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
                <p className="mt-1.5 text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-2 flex items-start gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  <span>{t.care.paymentDisclaimer}</span>
                </p>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  {t.common.notes}
                </label>
                <textarea
                  rows={2}
                  value={visitForm.notes}
                  onChange={(e) =>
                    setVisitForm({ ...visitForm, notes: e.target.value })
                  }
                  className="input-field"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setBookingDoctor(null)}
                  className="btn-secondary flex-1"
                >
                  {t.common.cancel}
                </button>
                <button type="submit" className="btn-primary flex-1">
                  {t.care.confirmBooking}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
