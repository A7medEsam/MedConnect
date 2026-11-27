import React, { useEffect, useRef, useState } from 'react';
import {
  FileText,
  Sparkles,
  Trash2,
  Download,
  Eye,
  AlertCircle,
  RefreshCw,
  X,
} from 'lucide-react';
import AppLayout from '../../layouts/AppLayout';
import FileUpload from '../../components/FileUpload';
import ReportAnalysisCard from '../../components/ReportAnalysisCard';
import OfflineAiAlert from '../../components/OfflineAiAlert';
import {
  api,
  BILINGUAL_FALLBACK_ERRORS,
  extractErrorInfo,
  getFriendlyErrorMessage,
} from '../../api/client';
import { useConnectivity } from '../../context/ConnectivityContext';
import { useLang } from '../../context/LangContext';
import { useToast } from '../../components/Toast';

export default function ReportsPage() {
  const { t, lang } = useLang();
  const { isBrowserOnline, backendStatus } = useConnectivity();
  const toast = useToast();

  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [confirmedUpload, setConfirmedUpload] = useState(null);
  const [analyzingId, setAnalyzingId] = useState(null);
  const [analyzeElapsed, setAnalyzeElapsed] = useState(0);
  const [analysisErrors, setAnalysisErrors] = useState({});
  const [previewDoc, setPreviewDoc] = useState(null);

  const uploadingRef = useRef(false);
  const analyzingRef = useRef(false);

  const isDisconnected = !isBrowserOnline || backendStatus === 'disconnected';

  useEffect(() => {
    if (!analyzingId) {
      setAnalyzeElapsed(0);
      return;
    }
    const started = Date.now();
    const timer = setInterval(() => {
      setAnalyzeElapsed(Math.floor((Date.now() - started) / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, [analyzingId]);

  const loadReports = async () => {
    try {
      const data = await api.listReports();
      setReports(data);
    } catch (err) {
      toast.error(getFriendlyErrorMessage(err, lang));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, []);

  const handleAnalyze = async (reportId) => {
    if (analyzingRef.current) return;
    if (isDisconnected) {
      const offlineInfo = { ...BILINGUAL_FALLBACK_ERRORS.backend_unavailable };
      setAnalysisErrors((prev) => ({ ...prev, [reportId]: offlineInfo }));
      toast.error(getFriendlyErrorMessage(offlineInfo, lang));
      return;
    }

    analyzingRef.current = true;
    setAnalyzingId(reportId);
    setAnalysisErrors((prev) => ({ ...prev, [reportId]: null }));
    try {
      const updated = await api.analyzeReport(reportId, lang);
      setReports((prev) => prev.map((r) => (r.id === reportId ? updated : r)));
      toast.success(t.reports.analysisSuccess);
    } catch (err) {
      const info = extractErrorInfo(err) || {
        category: 'service_unavailable',
        message: { ar: getFriendlyErrorMessage(err, 'ar'), en: getFriendlyErrorMessage(err, 'en') },
        retryable: true,
      };
      setAnalysisErrors((prev) => ({ ...prev, [reportId]: info }));
      toast.error(getFriendlyErrorMessage(err, lang));
      await loadReports();
    } finally {
      analyzingRef.current = false;
      setAnalyzingId(null);
    }
  };

  const handleFileSelected = async (file) => {
    if (uploadingRef.current || analyzingRef.current) return;
    if (isDisconnected) {
      toast.error(t.connectivity.backendDownMessage);
      return;
    }

    uploadingRef.current = true;
    setConfirmedUpload(null);
    setUploading(true);
    setProgress(0);
    try {
      const created = await api.uploadReport(file, setProgress);
      if (!created || !created.id) {
        throw new Error(t.common.errorGeneric);
      }
      setConfirmedUpload(created);
      setReports((prev) => [created, ...prev]);
      toast.success(t.reports.uploadSuccess);
      uploadingRef.current = false;
      setUploading(false);
      await handleAnalyze(created.id);
    } catch (err) {
      setConfirmedUpload(null);
      toast.error(getFriendlyErrorMessage(err, lang));
      uploadingRef.current = false;
      setUploading(false);
    }
  };

  const handleDelete = async (reportId) => {
    if (isDisconnected) {
      toast.error(t.connectivity.backendDownMessage);
      return;
    }
    try {
      await api.deleteReport(reportId);
      setReports((prev) => prev.filter((r) => r.id !== reportId));
      if (confirmedUpload?.id === reportId) {
        setConfirmedUpload(null);
      }
      toast.info(t.common.delete);
    } catch (err) {
      toast.error(getFriendlyErrorMessage(err, lang));
    }
  };

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
      toast.error(getFriendlyErrorMessage(err, lang));
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
      toast.error(getFriendlyErrorMessage(err, lang));
    }
  };

  const closePreview = () => {
    if (previewDoc?.url) {
      URL.revokeObjectURL(previewDoc.url);
    }
    setPreviewDoc(null);
  };

  const statusBadge = (status) => {
    const map = {
      uploaded: 'bg-slate-100 text-slate-700',
      analyzing: 'bg-sky-100 text-sky-700',
      analyzed: 'bg-emerald-100 text-emerald-700',
      error: 'bg-rose-100 text-rose-700',
      demo_sample: 'bg-amber-100 text-amber-800',
    };
    const labelMap = {
      uploaded: t.reports.statusUploaded,
      analyzing: t.reports.statusAnalyzing,
      analyzed: t.reports.statusAnalyzed,
      error: t.reports.statusError,
      demo_sample: t.reports.statusDemoSample,
    };
    return (
      <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${map[status] || map.uploaded}`}>
        {labelMap[status] || status}
      </span>
    );
  };

  const analyzeStageLabel =
    analyzeElapsed < 4 ? t.reports.analyzing : t.reports.preparingSummary;

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{t.reports.title}</h1>
          <p className="text-sm text-slate-500 mt-1">{t.reports.subtitle}</p>
        </div>

        <OfflineAiAlert />

        {/* Upload Zone */}
        <div className="card space-y-3">
          <h2 className="text-base font-semibold text-slate-900">
            {t.reports.uploadZoneTitle}
          </h2>
          <FileUpload
            onFileSelected={handleFileSelected}
            uploading={uploading}
            progress={progress}
            disabled={isDisconnected || Boolean(analyzingId)}
            uploadedReport={confirmedUpload}
          />
        </div>

        {/* Reports List */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="spinner" />
          </div>
        ) : reports.length === 0 ? (
          <div className="card text-center py-12 text-slate-500">
            <FileText className="w-10 h-10 mx-auto text-slate-300 mb-2" />
            <p className="text-sm">{t.reports.noReports}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {reports.map((report) => {
              const isAnalyzing = analyzingId === report.id;
              const errInfo = analysisErrors[report.id] || report.last_error || null;
              const errMsg = errInfo ? getFriendlyErrorMessage(errInfo, lang) : '';
              const isQuotaBlocked = errInfo && errInfo.category === 'quota_exceeded';
              const canRetryAnalyze = Boolean(
                !isAnalyzing &&
                !isDisconnected &&
                !isQuotaBlocked &&
                errInfo &&
                errInfo.retryable !== false
              );

              return (
                <div key={report.id} className="card space-y-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-primary-50 text-primary-700 flex items-center justify-center shrink-0">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-900 break-all">
                          {report.original_filename}
                        </h3>
                        <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-slate-500">
                          <span>{new Date(report.uploaded_at).toLocaleString()}</span>
                          {report.file_size && (
                            <span>• {(report.file_size / 1024).toFixed(1)} KB</span>
                          )}
                          {statusBadge(isAnalyzing ? 'analyzing' : report.status)}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {report.status !== 'demo_sample' && (
                        <>
                          <button
                            type="button"
                            disabled={isDisconnected}
                            onClick={() => handlePreview(report)}
                            className="btn-secondary text-xs py-1.5 px-3 inline-flex items-center gap-1.5 disabled:opacity-50"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>{t.common.preview}</span>
                          </button>
                          <button
                            type="button"
                            disabled={isDisconnected}
                            onClick={() => handleDownload(report)}
                            className="btn-secondary text-xs py-1.5 px-3 inline-flex items-center gap-1.5 disabled:opacity-50"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>{t.common.download}</span>
                          </button>
                          <button
                            type="button"
                            disabled={isAnalyzing || Boolean(analyzingId) || isQuotaBlocked || isDisconnected}
                            onClick={() => handleAnalyze(report.id)}
                            className="btn-primary text-xs py-1.5 px-3 inline-flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>
                              {isAnalyzing
                                ? analyzeStageLabel
                                : report.analysis
                                ? t.reports.reanalyzeBtn
                                : t.reports.analyzeBtn}
                            </span>
                          </button>
                        </>
                      )}
                      <button
                        type="button"
                        disabled={isDisconnected || isAnalyzing}
                        onClick={() => handleDelete(report.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 disabled:opacity-40"
                        title={t.common.delete}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {isAnalyzing && (
                    <div className="flex items-start gap-2.5 p-3 rounded-lg bg-sky-50 border border-sky-200 text-sky-900 text-sm">
                      <div className="spinner-sm mt-0.5 shrink-0" />
                      <div className="space-y-0.5">
                        <p className="font-medium">{analyzeStageLabel}</p>
                        {analyzeElapsed >= 10 && (
                          <p className="text-xs text-sky-700">{t.reports.continuingNotice}</p>
                        )}
                      </div>
                    </div>
                  )}

                  {errMsg && (
                    <div className="flex items-start gap-2.5 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-sm">
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                      <div className="flex-1 space-y-1.5">
                        <p className="font-medium">{t.reports.analysisUnavailable}</p>
                        <p className="text-xs text-rose-700 leading-relaxed">{errMsg}</p>
                        {errInfo?.retry_after_seconds && (
                          <p className="text-[11px] text-rose-600">
                            {t.reports.retryAfterPrefix} {errInfo.retry_after_seconds}s
                          </p>
                        )}
                        {canRetryAnalyze && (
                          <button
                            type="button"
                            onClick={() => handleAnalyze(report.id)}
                            className="mt-1 px-2.5 py-1 rounded bg-white border border-rose-300 text-xs font-medium text-rose-800 hover:bg-rose-100 inline-flex items-center gap-1"
                          >
                            <RefreshCw className="w-3 h-3" />
                            <span>{t.common.retry}</span>
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  <ReportAnalysisCard analysis={report.analysis} />
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* File Preview Modal */}
      {previewDoc && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden shadow-xl">
            <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-semibold text-slate-900 truncate">
                {t.reports.previewTitle}: {previewDoc.name}
              </h3>
              <button
                type="button"
                onClick={closePreview}
                className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-auto bg-slate-100 p-4 flex items-center justify-center">
              {previewDoc.type.includes('pdf') ? (
                <iframe
                  src={previewDoc.url}
                  title={previewDoc.name}
                  className="w-full h-[72vh] rounded-lg bg-white border border-slate-200"
                />
              ) : (
                <img
                  src={previewDoc.url}
                  alt={previewDoc.name}
                  className="max-h-[72vh] max-w-full rounded-lg shadow"
                />
              )}
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
