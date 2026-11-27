import React, { useEffect, useState } from 'react';
import { Save, ShieldCheck, Clock, AlertTriangle, Upload, Download } from 'lucide-react';
import AppLayout from '../../layouts/AppLayout';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useLang } from '../../context/LangContext';
import { useToast } from '../../components/Toast';

export default function DoctorProfilePage() {
  const { refreshUser } = useAuth();
  const { t, lang } = useLang();
  const toast = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submittingVerif, setSubmittingVerif] = useState(false);
  const [specialties, setSpecialties] = useState([]);
  const [licenseFile, setLicenseFile] = useState(null);

  const [form, setForm] = useState({
    full_name: '',
    specialty: '',
    specialty_id: 'gp',
    location: '',
    consultation_fee: '150 SAR',
    license_number: '',
    clinic_name: '',
    years_experience: '',
    phone: '',
    bio: '',
    verification_status: 'unverified',
    verification_document: '',
    verification_notes: '',
    is_demo: false,
  });

  const load = async () => {
    try {
      const [data, specs] = await Promise.all([
        api.getDoctorProfile(),
        api.listSpecialties().catch(() => []),
      ]);
      const u = data.user || {};
      const p = data.profile || {};
      setSpecialties(specs);
      setForm({
        full_name: u.full_name || '',
        specialty: p.specialty || '',
        specialty_id: p.specialty_id || 'gp',
        location: p.location || '',
        consultation_fee: p.consultation_fee || '150 SAR',
        license_number: p.license_number || '',
        clinic_name: p.clinic_name || '',
        years_experience: p.years_experience ?? '',
        phone: p.phone || '',
        bio: p.bio || '',
        verification_status: p.verification_status || 'unverified',
        verification_document: p.verification_document || '',
        verification_notes: p.verification_notes || '',
        is_demo: Boolean(p.is_demo),
      });
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.updateDoctorProfile({
        full_name: form.full_name,
        specialty: form.specialty,
        specialty_id: form.specialty_id,
        location: form.location,
        consultation_fee: form.consultation_fee,
        license_number: form.license_number,
        clinic_name: form.clinic_name,
        years_experience: form.years_experience === '' ? null : Number(form.years_experience),
        phone: form.phone,
        bio: form.bio,
      });
      await refreshUser();
      toast.success(t.profile.savedSuccess);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleVerificationSubmit = async (e) => {
    e.preventDefault();
    if (!licenseFile || !form.license_number.trim()) return;
    setSubmittingVerif(true);
    try {
      const fd = new FormData();
      fd.append('file', licenseFile);
      fd.append('license_number', form.license_number.trim());
      fd.append('specialty', form.specialty || 'General Medicine');
      fd.append('clinic_name', form.clinic_name || '');
      if (form.years_experience !== '') {
        fd.append('years_experience', String(form.years_experience));
      }
      const res = await api.submitDoctorVerification(fd);
      setForm((prev) => ({
        ...prev,
        verification_status: res.profile.verification_status,
        verification_document: res.profile.verification_document || '',
        verification_notes: res.profile.verification_notes || '',
      }));
      setLicenseFile(null);
      toast.success(t.doctor.verificationPendingMsg);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSubmittingVerif(false);
    }
  };

  const handleDownloadLicense = async () => {
    try {
      const blob = await api.fetchDoctorVerificationBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = form.verification_document || 'license';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
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

  const statusConfig = {
    approved: { cls: 'bg-emerald-50 border-emerald-200 text-emerald-900', icon: ShieldCheck, msg: t.doctor.verificationApprovedMsg },
    pending: { cls: 'bg-amber-50 border-amber-300 text-amber-900', icon: Clock, msg: t.doctor.verificationPendingMsg },
    demo: { cls: 'bg-sky-50 border-sky-200 text-sky-900', icon: ShieldCheck, msg: t.doctor.verificationDemoMsg },
    rejected: { cls: 'bg-rose-50 border-rose-200 text-rose-900', icon: AlertTriangle, msg: t.doctor.verificationRejectedMsg },
    unverified: { cls: 'bg-slate-100 border-slate-300 text-slate-800', icon: AlertTriangle, msg: t.doctor.verificationUnverifiedMsg },
  };
  const activeStatus = statusConfig[form.verification_status] || statusConfig.unverified;
  const StatusIcon = activeStatus.icon;

  return (
    <AppLayout>
      <div className="max-w-3xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{t.doctor.profileTitle}</h1>
          <p className="text-sm text-slate-500 mt-1">{t.doctor.profileSubtitle}</p>
        </div>

        {/* Profile Form */}
        <form onSubmit={handleSave} className="card space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                {t.auth.fullName}
              </label>
              <input
                type="text"
                required
                value={form.full_name}
                onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                {t.doctor.specialtyCategory}
              </label>
              <select
                value={form.specialty_id}
                onChange={(e) => {
                  const sid = e.target.value;
                  const match = specialties.find((s) => s.id === sid);
                  setForm({
                    ...form,
                    specialty_id: sid,
                    specialty: match ? match.name_en : form.specialty,
                  });
                }}
                className="input-field"
              >
                {specialties.map((s) => (
                  <option key={s.id} value={s.id}>
                    {lang === 'ar' ? s.name_ar : s.name_en}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                {t.care.specialty}
              </label>
              <input
                type="text"
                value={form.specialty}
                onChange={(e) => setForm({ ...form, specialty: e.target.value })}
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                {t.doctor.consultationFee}
              </label>
              <input
                type="text"
                placeholder="150 SAR / Free"
                value={form.consultation_fee}
                onChange={(e) => setForm({ ...form, consultation_fee: e.target.value })}
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                {t.doctor.location}
              </label>
              <input
                type="text"
                placeholder="Riyadh"
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                {t.doctor.clinicName}
              </label>
              <input
                type="text"
                value={form.clinic_name}
                onChange={(e) => setForm({ ...form, clinic_name: e.target.value })}
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                {t.doctor.yearsExperience}
              </label>
              <input
                type="number"
                min="0"
                value={form.years_experience}
                onChange={(e) => setForm({ ...form, years_experience: e.target.value })}
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                {t.profile.phone}
              </label>
              <input
                type="text"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="input-field"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              {t.doctor.bio}
            </label>
            <textarea
              rows={3}
              value={form.bio}
              onChange={(e) => setForm({ ...form, bio: e.target.value })}
              className="input-field"
            />
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="btn-primary inline-flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? t.common.saving : t.common.save}</span>
            </button>
          </div>
        </form>

        {/* Credential Verification Section */}
        <form onSubmit={handleVerificationSubmit} className="card space-y-4">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <h2 className="text-lg font-semibold text-slate-900">
              {t.doctor.verificationTitle}
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase border bg-white">
              {form.verification_status}
            </span>
          </div>

          <div className={`flex items-start gap-2.5 p-3.5 rounded-xl border text-xs sm:text-sm ${activeStatus.cls}`}>
            <StatusIcon className="w-5 h-5 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">{activeStatus.msg}</p>
              {form.verification_document && (
                <button
                  type="button"
                  onClick={handleDownloadLicense}
                  className="mt-1.5 inline-flex items-center gap-1 underline font-semibold text-xs"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>{form.verification_document}</span>
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                {t.doctor.licenseNumber}
              </label>
              <input
                type="text"
                required
                placeholder="MED-LIC-XXXXX"
                value={form.license_number}
                onChange={(e) => setForm({ ...form, license_number: e.target.value })}
                className="input-field"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                {t.doctor.verificationUploadLabel}
              </label>
              <input
                type="file"
                required
                accept=".pdf,.png,.jpg,.jpeg,.webp"
                onChange={(e) => setLicenseFile(e.target.files?.[0] || null)}
                className="block w-full text-xs text-slate-600 file:me-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:bg-primary-50 file:text-primary-700 file:font-semibold hover:file:bg-primary-100"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={submittingVerif || !licenseFile}
              className="btn-secondary inline-flex items-center gap-2 text-sm"
            >
              <Upload className="w-4 h-4" />
              <span>
                {submittingVerif ? t.common.loading : t.doctor.verificationSubmitBtn}
              </span>
            </button>
          </div>
        </form>
      </div>
    </AppLayout>
  );
}
