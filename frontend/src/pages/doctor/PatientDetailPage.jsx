import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Activity,
  Pill,
  AlertTriangle,
  Heart,
  FileText,
  Download,
  Eye,
  X,
} from 'lucide-react';
import AppLayout from '../../layouts/AppLayout';
import ReportAnalysisCard from '../../components/ReportAnalysisCard';
import { api } from '../../api/client';
import { useLang } from '../../context/LangContext';
import { useToast } from '../../components/Toast';

export default function PatientDetailPage() {
  const { id } = useParams();
  const { t } = useLang();
  const toast = useToast();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [previewDoc, setPreviewDoc] = useState(null);

  useEffect(() => {
    let active = true;
    api
      .getPatientDetail(id)
      .then((res) => {
        if (active) setData(res);
      })
      .catch((err) => {
        if (active) setError(err.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [id]);

  const handleDownload = async (report) => {
    try {
      const blob = await api.fetchReportBlob(report.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = report.original_filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handlePreview = async (report) => {
    try {
      const blob = await api.fetchReportBlob(report.id);
      const url = URL.createObjectURL(blob);
      setPreviewDoc({
        url,
        name: report.original_filename,
        type: report.content_type || '',
      });
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

  if (error || !data) {
    return (
      <AppLayout>
        <div className="card text-center py-12 space-y-3">
          <p className="text-rose-600 font-medium">{error || t.common.errorGeneric}</p>
          <Link to="/doctor/patients" className="btn-secondary inline-flex items-center gap-2">
            <ArrowLeft className="w-4 h-4 rtl:rotate-180" />
            <span>{t.common.back}</span>
          </Link>
        </div>
      </AppLayout>
    );
  }

  const { patient, profile, conditions, medications, allergies, vitals, reports } = data;

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <Link
              to="/doctor/patients"
              className="text-xs font-medium text-primary-600 hover:text-primary-700 inline-flex items-center gap-1 mb-2"
            >
              <ArrowLeft className="w-3.5 h-3.5 rtl:rotate-180" />
              <span>{t.common.back}</span>
            </Link>
            <h1 className="text-2xl font-bold text-slate-900">{patient.full_name}</h1>
            <p className="text-sm text-slate-500">
              {patient.email}
              {profile?.blood_type ? ` • Blood Type: ${profile.blood_type}` : ''}
              {profile?.gender ? ` • ${profile.gender}` : ''}
              {profile?.date_of_birth ? ` • DOB: ${profile.date_of_birth}` : ''}
            </p>
          </div>
        </div>

        {profile?.medical_notes && (
          <div className="card bg-sky-50/50 border-sky-200">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-sky-800 mb-1">
              {t.profile.medicalNotes}
            </h2>
            <p className="text-sm text-slate-800">{profile.medical_notes}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Conditions */}
          <div className="card space-y-3">
            <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
              <Activity className="w-5 h-5 text-teal-600" />
              <span>{t.profile.conditionsTitle}</span>
            </h2>
            {conditions.length === 0 ? (
              <p className="text-sm text-slate-400">{t.common.noData}</p>
            ) : (
              conditions.map((c) => (
                <div key={c.id} className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm text-slate-900">{c.name}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-teal-100 text-teal-800">
                      {c.status}
                    </span>
                  </div>
                  {c.notes && <p className="text-xs text-slate-500 mt-1">{c.notes}</p>}
                </div>
              ))
            )}
          </div>

          {/* Medications */}
          <div className="card space-y-3">
            <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
              <Pill className="w-5 h-5 text-sky-600" />
              <span>{t.profile.medicationsTitle}</span>
            </h2>
            {medications.length === 0 ? (
              <p className="text-sm text-slate-400">{t.common.noData}</p>
            ) : (
              medications.map((m) => (
                <div key={m.id} className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                  <span className="font-medium text-sm text-slate-900">{m.name}</span>{' '}
                  {m.dosage && <span className="text-xs text-sky-700 font-medium">{m.dosage}</span>}
                  {m.frequency && <p className="text-xs text-slate-500 mt-0.5">{m.frequency}</p>}
                </div>
              ))
            )}
          </div>

          {/* Allergies */}
          <div className="card space-y-3">
            <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
              <span>{t.profile.allergiesTitle}</span>
            </h2>
            {allergies.length === 0 ? (
              <p className="text-sm text-slate-400">{t.common.noData}</p>
            ) : (
              allergies.map((a) => (
                <div key={a.id} className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm text-slate-900">{a.allergen}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-rose-100 text-rose-800">
                      {a.severity}
                    </span>
                  </div>
                  {a.reaction && <p className="text-xs text-slate-500 mt-0.5">{a.reaction}</p>}
                </div>
              ))
            )}
          </div>

          {/* Vitals */}
          <div className="card space-y-3">
            <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
              <Heart className="w-5 h-5 text-rose-600" />
              <span>{t.profile.vitalsTitle}</span>
            </h2>
            {vitals.length === 0 ? (
              <p className="text-sm text-slate-400">{t.common.noData}</p>
            ) : (
              vitals.map((v) => (
                <div key={v.id} className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-200">
                  <div>
                    <p className="text-sm font-medium text-slate-800">
                      {t.profile.vitalTypes[v.vital_type] || v.vital_type}
                    </p>
                    <p className="text-xs text-slate-500">
                      {new Date(v.recorded_at).toLocaleString()}
                    </p>
                  </div>
                  <span className="text-sm font-bold text-primary-700">
                    {v.value} {v.unit}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Uploaded Reports & Analyses */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary-600" />
            <span>{t.nav.reports}</span>
          </h2>
          {reports.length === 0 ? (
            <div className="card text-sm text-slate-500">{t.doctor.noReportsForPatient}</div>
          ) : (
            reports.map((report) => (
              <div key={report.id} className="card space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-slate-900">{report.original_filename}</h3>
                    <p className="text-xs text-slate-500">
                      {new Date(report.uploaded_at).toLocaleString()} • {report.status}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => handlePreview(report)}
                      className="btn-secondary text-xs py-1.5 px-3 inline-flex items-center gap-1.5"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>{t.common.preview}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDownload(report)}
                      className="btn-secondary text-xs py-1.5 px-3 inline-flex items-center gap-1.5"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>{t.common.download}</span>
                    </button>
                  </div>
                </div>
                <ReportAnalysisCard analysis={report.analysis} />
              </div>
            ))
          )}
        </div>
      </div>

      {previewDoc && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden shadow-xl">
            <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-semibold text-slate-900 truncate">{previewDoc.name}</h3>
              <button
                type="button"
                onClick={() => {
                  URL.revokeObjectURL(previewDoc.url);
                  setPreviewDoc(null);
                }}
                className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-auto p-4 bg-slate-100 flex items-center justify-center min-h-[400px]">
              {previewDoc.type.includes('pdf') ? (
                <iframe src={previewDoc.url} title={previewDoc.name} className="w-full h-[70vh] rounded-lg bg-white" />
              ) : (
                <img src={previewDoc.url} alt={previewDoc.name} className="max-w-full max-h-[70vh] object-contain rounded-lg shadow" />
              )}
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
