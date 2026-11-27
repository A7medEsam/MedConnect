import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import jsQR from 'jsqr';
import {
  Search,
  Users,
  FileText,
  Activity,
  Pill,
  QrCode,
  Camera,
  CameraOff,
  Download,
  AlertCircle,
} from 'lucide-react';
import AppLayout from '../../layouts/AppLayout';
import ReportAnalysisCard from '../../components/ReportAnalysisCard';
import { api } from '../../api/client';
import { useLang } from '../../context/LangContext';
import { useToast } from '../../components/Toast';

export default function DoctorPatientsPage() {
  const { t } = useLang();
  const toast = useToast();

  const [patients, setPatients] = useState([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);

  // QR Access State
  const [qrInput, setQrInput] = useState('');
  const [redeeming, setRedeeming] = useState(false);
  const [qrError, setQrError] = useState('');
  const [qrRecord, setQrRecord] = useState(null);
  const [activeQrToken, setActiveQrToken] = useState('');

  // Camera Scanning State
  const [cameraOn, setCameraOn] = useState(false);
  const [cameraInfo, setCameraInfo] = useState('');
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const scanTimerRef = useRef(null);

  useEffect(() => {
    let active = true;
    api
      .listSharedPatients()
      .then((data) => {
        if (active) setPatients(data);
      })
      .catch((err) => {
        if (active) toast.error(err.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
      stopCamera();
    };
  }, []);

  const stopCamera = () => {
    if (scanTimerRef.current) {
      clearInterval(scanTimerRef.current);
      scanTimerRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((tr) => tr.stop());
      streamRef.current = null;
    }
    setCameraOn(false);
  };

  const redeemToken = async (rawToken) => {
    const token = (rawToken || '').trim();
    if (!token) return;
    setQrError('');
    setRedeeming(true);
    try {
      const data = await api.redeemQrToken(token);
      setQrRecord(data);
      setActiveQrToken(token);
      toast.success(t.qr.accessGrantedBanner);
      stopCamera();
    } catch (err) {
      setQrRecord(null);
      setQrError(err.message);
      toast.error(err.message);
    } finally {
      setRedeeming(false);
    }
  };

  const startCamera = async () => {
    setCameraInfo('');
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraInfo(t.qr.cameraUnsupported);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      streamRef.current = stream;
      setCameraOn(true);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
      }, 100);

      scanTimerRef.current = setInterval(async () => {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        if (!video || !canvas || video.readyState < 2) return;
        const ctx = canvas.getContext('2d');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imgData.data, imgData.width, imgData.height);
        if (code && code.data) {
          setQrInput(code.data);
          await redeemToken(code.data);
        }
      }, 400);
    } catch {
      setCameraInfo(t.qr.cameraUnsupported);
      stopCamera();
    }
  };

  const handleDownloadQrReport = async (rep) => {
    try {
      const blob = await api.fetchQrReportBlob(rep.id, activeQrToken);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = rep.original_filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      toast.error(err.message);
    }
  };

  const filtered = patients.filter((p) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (
      p.full_name.toLowerCase().includes(q) ||
      p.email.toLowerCase().includes(q) ||
      p.username.toLowerCase().includes(q)
    );
  });

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              {t.doctor.patientsTitle}
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              {t.doctor.patientsSubtitle}
            </p>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute top-1/2 -translate-y-1/2 start-3" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t.doctor.searchPlaceholder}
              className="input-field ps-9"
            />
          </div>
        </div>

        {/* Temporary QR Access Card */}
        <div className="card space-y-4 border-primary-200 bg-primary-50/20">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
              <QrCode className="w-5 h-5 text-primary-600" />
              <span>{t.qr.doctorScanTitle}</span>
            </h2>
            {!cameraOn ? (
              <button
                type="button"
                onClick={startCamera}
                className="btn-secondary text-xs py-1.5 px-3 inline-flex items-center gap-1.5"
              >
                <Camera className="w-4 h-4" />
                <span>{t.qr.scanCameraBtn}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={stopCamera}
                className="btn-danger text-xs py-1.5 px-3 inline-flex items-center gap-1.5"
              >
                <CameraOff className="w-4 h-4" />
                <span>{t.qr.stopCameraBtn}</span>
              </button>
            )}
          </div>

          {cameraInfo && (
            <p className="text-xs text-amber-800 bg-amber-50 p-2.5 rounded-lg border border-amber-200">
              {cameraInfo}
            </p>
          )}

          {cameraOn && (
            <div className="flex flex-col items-center">
              <video ref={videoRef} className="w-full max-w-sm rounded-xl border border-slate-300" />
              <canvas ref={canvasRef} className="hidden" />
            </div>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              redeemToken(qrInput);
            }}
            className="flex flex-wrap gap-2"
          >
            <input
              type="text"
              value={qrInput}
              onChange={(e) => setQrInput(e.target.value)}
              placeholder={`${t.qr.manualCodeLabel} (${t.qr.manualPlaceholder})`}
              className="input-field flex-1 font-mono text-sm"
            />
            <button
              type="submit"
              disabled={redeeming || !qrInput.trim()}
              className="btn-primary text-sm"
            >
              {redeeming ? t.common.loading : t.qr.redeemBtn}
            </button>
          </form>

          {qrError && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{qrError}</span>
            </div>
          )}

          {qrRecord && (
            <div className="p-4 rounded-xl bg-white border border-primary-300 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="text-xs font-semibold text-primary-700">
                    {t.qr.accessGrantedBanner} {(qrRecord.scope || []).join(', ')}
                  </span>
                  <h3 className="text-lg font-bold text-slate-900">{qrRecord.patient_name}</h3>
                </div>
                <span className="text-xs text-slate-500">
                  Expires: {new Date(qrRecord.expires_at).toLocaleString()}
                </span>
              </div>

              {qrRecord.profile && (
                <div className="text-xs text-slate-700 bg-slate-50 p-3 rounded-lg">
                  DOB: {qrRecord.profile.date_of_birth || '-'} • Blood: {qrRecord.profile.blood_type || '-'} • {qrRecord.profile.medical_notes || ''}
                </div>
              )}

              {qrRecord.conditions && (
                <div className="text-xs">
                  <strong>{t.profile.conditionsTitle}:</strong>{' '}
                  {qrRecord.conditions.map((c) => `${c.name} (${c.status})`).join(', ') || t.common.noData}
                </div>
              )}
              {qrRecord.medications && (
                <div className="text-xs">
                  <strong>{t.profile.medicationsTitle}:</strong>{' '}
                  {qrRecord.medications.map((m) => `${m.name} ${m.dosage || ''}`).join(', ') || t.common.noData}
                </div>
              )}
              {qrRecord.allergies && (
                <div className="text-xs">
                  <strong>{t.profile.allergiesTitle}:</strong>{' '}
                  {qrRecord.allergies.map((a) => `${a.allergen} (${a.severity})`).join(', ') || t.common.noData}
                </div>
              )}
              {qrRecord.vitals && qrRecord.vitals.length > 0 && (
                <div className="text-xs">
                  <strong>{t.profile.vitalsTitle}:</strong>{' '}
                  {qrRecord.vitals.map((v) => `${v.vital_type}: ${v.value} ${v.unit || ''}`).join(' | ')}
                </div>
              )}
              {qrRecord.reports && qrRecord.reports.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-slate-200">
                  <strong className="text-xs">{t.nav.reports}:</strong>
                  {qrRecord.reports.map((rep) => (
                    <div key={rep.id} className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-medium">{rep.original_filename}</span>
                        {rep.status !== 'demo_sample' && (
                          <button
                            type="button"
                            onClick={() => handleDownloadQrReport(rep)}
                            className="btn-secondary text-xs py-1 px-2 inline-flex items-center gap-1"
                          >
                            <Download className="w-3 h-3" />
                            <span>{t.common.download}</span>
                          </button>
                        )}
                      </div>
                      <ReportAnalysisCard analysis={rep.analysis} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Permanently Shared Patients */}
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="spinner" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="card text-center py-12 text-slate-500">
            <Users className="w-10 h-10 mx-auto text-slate-300 mb-2" />
            <p className="text-sm">{t.doctor.noPatients}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filtered.map((p) => (
              <div key={p.id} className="card card-hover flex flex-col justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-11 h-11 rounded-full bg-primary-100 text-primary-800 flex items-center justify-center font-bold text-lg shrink-0">
                    {p.full_name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-slate-900">{p.full_name}</h3>
                    <p className="text-xs text-slate-500">{p.email}</p>
                    <div className="flex flex-wrap gap-2 mt-2 text-xs text-slate-600">
                      {p.gender && <span>{p.gender}</span>}
                      {p.blood_type && (
                        <span className="px-2 py-0.5 rounded bg-rose-50 text-rose-700 font-medium">
                          {p.blood_type}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 pt-3 border-t border-slate-100 text-center text-xs">
                  <div className="p-2 rounded-lg bg-slate-50">
                    <Activity className="w-4 h-4 mx-auto text-teal-600 mb-1" />
                    <span className="font-bold text-slate-900">{p.conditions_count}</span>
                    <p className="text-slate-500">{t.dashboard.conditionsCount}</p>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-50">
                    <Pill className="w-4 h-4 mx-auto text-sky-600 mb-1" />
                    <span className="font-bold text-slate-900">{p.medications_count}</span>
                    <p className="text-slate-500">{t.dashboard.medicationsCount}</p>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-50">
                    <FileText className="w-4 h-4 mx-auto text-indigo-600 mb-1" />
                    <span className="font-bold text-slate-900">{p.reports_count}</span>
                    <p className="text-slate-500">{t.dashboard.reportsCount}</p>
                  </div>
                </div>

                <Link
                  to={`/doctor/patients/${p.id}`}
                  className="btn-primary text-center text-sm"
                >
                  {t.doctor.viewRecord}
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
