import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  GraduationCap,
  Activity,
  ListTree,
  Stethoscope,
  BookMarked,
  Lightbulb,
  HelpCircle,
  AlertTriangle,
  Sparkles,
  Check,
  X,
  RotateCcw,
  History,
  Info,
} from 'lucide-react';
import AppLayout from '../../layouts/AppLayout';
import FileUpload from '../../components/FileUpload';
import OfflineAiAlert from '../../components/OfflineAiAlert';
import { api, extractErrorInfo, getFriendlyErrorMessage } from '../../api/client';
import { useLang } from '../../context/LangContext';
import { useConnectivity } from '../../context/ConnectivityContext';
import { useToast } from '../../components/Toast';

function pick(val, lang) {
  if (val == null) return '';
  if (typeof val === 'string' || typeof val === 'number') return String(val);
  return val[lang] || val.en || val.ar || '';
}

function MentorSixCardView({ data, lang, t, isDemo }) {
  const [answers, setAnswers] = useState({});
  const [revealed, setRevealed] = useState({});

  useEffect(() => {
    setAnswers({});
    setRevealed({});
  }, [data]);

  if (!data) return null;

  const choose = (qi, oi) => {
    setAnswers((prev) => ({ ...prev, [qi]: oi }));
    setRevealed((prev) => ({ ...prev, [qi]: true }));
  };

  return (
    <div className="space-y-4">
      {isDemo && (
        <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-xs sm:text-sm">
          <Info className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <span className="font-medium">{t.mentor.demoWarning}</span>
        </div>
      )}

      {data.supported_report_type === false && (
        <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-sm">
          <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">{t.mentor.unsupportedBanner}</p>
            <p className="text-xs mt-0.5">{pick(data.unsupported_reason, lang)}</p>
          </div>
        </div>
      )}

      {/* Header Card */}
      <div className="card space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span
            className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
              isDemo
                ? 'bg-amber-100 text-amber-800 border border-amber-300'
                : 'bg-primary-600 text-white'
            }`}
          >
            {isDemo ? t.common.demoBadge : t.common.aiBadge}
          </span>
          {data.model_used && (
            <span className="text-xs text-slate-500 font-mono">{data.model_used}</span>
          )}
        </div>
        <h2 className="text-lg font-bold text-slate-900">{pick(data.report_title, lang)}</h2>
        <p className="text-xs font-medium text-primary-700">{pick(data.report_type, lang)}</p>
        {Array.isArray(data.guidelines) && data.guidelines.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {data.guidelines.map((g) => (
              <span
                key={g}
                className="px-2 py-0.5 rounded-full text-xs font-medium bg-sky-50 text-sky-700 border border-sky-200"
              >
                {g}
              </span>
            ))}
          </div>
        )}
        {Array.isArray(data.sample_measures) && data.sample_measures.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 pt-2">
            {data.sample_measures.map((m, idx) => (
              <div key={idx} className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                <p className="text-[11px] text-slate-500">{pick(m.name, lang)}</p>
                <p className="text-sm font-bold text-slate-900">{pick(m.value, lang)}</p>
                {m.note && <p className="text-[11px] text-slate-500 mt-0.5">{pick(m.note, lang)}</p>}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Card 1: Pathophysiology */}
      {data.pathophysiology && (
        <div className="card space-y-3">
          <h3 className="font-semibold text-slate-900 flex items-center gap-2">
            <Activity className="w-5 h-5 text-emerald-600" />
            <span>{t.mentor.card1}</span>
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200">
              <p className="text-xs font-bold text-emerald-800 mb-1">{t.mentor.physiology}</p>
              <p className="text-sm text-slate-700 leading-relaxed">
                {pick(data.pathophysiology.physiology, lang)}
              </p>
            </div>
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200">
              <p className="text-xs font-bold text-rose-800 mb-1">{t.mentor.pathology}</p>
              <p className="text-sm text-slate-700 leading-relaxed">
                {pick(data.pathophysiology.pathology, lang)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Card 2: Differential Diagnosis */}
      {Array.isArray(data.differentials) && (
        <div className="card space-y-3">
          <h3 className="font-semibold text-slate-900 flex items-center gap-2">
            <ListTree className="w-5 h-5 text-primary-600" />
            <span>{t.mentor.card2}</span>
          </h3>
          {data.probability_note && (
            <p className="text-xs text-slate-500 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
              {pick(data.probability_note, lang)}
            </p>
          )}
          <div className="space-y-2">
            {data.differentials.map((d, i) => (
              <div
                key={i}
                className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl border border-slate-200 bg-slate-50/70"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-sm text-slate-900">{pick(d.dx, lang)}</p>
                  <p className="text-xs text-slate-600 mt-0.5">{pick(d.severity, lang)}</p>
                  {d.justification && (
                    <p className="text-xs text-slate-500 mt-1">{pick(d.justification, lang)}</p>
                  )}
                </div>
                <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-white border border-slate-200 text-slate-700 shrink-0">
                  {typeof d.probability === 'number'
                    ? `${d.probability}%`
                    : t.mentor.notCalculated}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Card 3: Clinical Decision Making */}
      {data.decision && (
        <div className="card space-y-3">
          <h3 className="font-semibold text-slate-900 flex items-center gap-2">
            <Stethoscope className="w-5 h-5 text-sky-600" />
            <span>{t.mentor.card3}</span>
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200">
              <p className="text-xs font-bold text-rose-800 mb-1">{t.mentor.intervene}</p>
              <p className="text-sm text-slate-700 leading-relaxed">
                {pick(data.decision.intervene, lang)}
              </p>
            </div>
            <div className="p-3.5 rounded-xl bg-teal-50 border border-teal-200">
              <p className="text-xs font-bold text-teal-800 mb-1">{t.mentor.observe}</p>
              <p className="text-sm text-slate-700 leading-relaxed">
                {pick(data.decision.observe, lang)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Card 4: Pitfalls & Guidelines */}
      {data.pitfalls && (
        <div className="card space-y-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <h3 className="font-semibold text-slate-900 flex items-center gap-2">
              <BookMarked className="w-5 h-5 text-amber-600" />
              <span>{t.mentor.card4}</span>
            </h3>
            <Link
              to="/doctor/references"
              className="text-xs font-medium text-primary-600 hover:underline"
            >
              {t.nav.references} →
            </Link>
          </div>
          {data.pitfalls.refs && (
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-700">
              {pick(data.pitfalls.refs, lang)}
            </div>
          )}
          <ul className="space-y-1.5">
            {(data.pitfalls.pitfalls || []).map((pf, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>{pick(pf, lang)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Card 5: Clinical Pearls & Patient Script */}
      {data.pearls && (
        <div className="card space-y-3">
          <h3 className="font-semibold text-slate-900 flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-yellow-600" />
            <span>{t.mentor.card5}</span>
          </h3>
          <ul className="space-y-1.5">
            {(data.pearls.pearls || []).map((pe, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                <Sparkles className="w-4 h-4 text-primary-600 shrink-0 mt-0.5" />
                <span>{pick(pe, lang)}</span>
              </li>
            ))}
          </ul>
          {data.pearls.patient_script && (
            <div className="p-3.5 rounded-xl bg-teal-50 border border-teal-200">
              <p className="text-xs font-bold text-teal-800 mb-1">
                {t.mentor.patientScript}
              </p>
              <p className="text-sm text-slate-700 leading-relaxed">
                {pick(data.pearls.patient_script, lang)}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Card 6: Interactive MCQ Quiz */}
      {Array.isArray(data.quiz) && data.quiz.length > 0 && (
        <div className="card space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-slate-900 flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-indigo-600" />
              <span>{t.mentor.card6}</span>
            </h3>
            <button
              type="button"
              onClick={() => {
                setAnswers({});
                setRevealed({});
              }}
              className="btn-secondary text-xs py-1 px-2.5 inline-flex items-center gap-1"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>{t.mentor.resetQuiz}</span>
            </button>
          </div>

          <div className="space-y-4">
            {data.quiz.map((qz, qi) => {
              const selected = answers[qi];
              const isRevealed = revealed[qi];
              const isRight = selected === qz.correct;
              return (
                <div
                  key={qi}
                  className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 space-y-2.5"
                >
                  <p className="font-medium text-sm text-slate-900">{pick(qz.q, lang)}</p>
                  <div className="space-y-1.5">
                    {(qz.options || []).map((opt, oi) => {
                      const active = selected === oi;
                      const correctOpt = oi === qz.correct;
                      const style = !active
                        ? 'bg-white border-slate-200 hover:border-primary-400 text-slate-700'
                        : correctOpt
                        ? 'bg-emerald-50 border-emerald-400 text-emerald-900 font-medium'
                        : 'bg-rose-50 border-rose-400 text-rose-900 font-medium';
                      return (
                        <button
                          key={oi}
                          type="button"
                          onClick={() => choose(qi, oi)}
                          className={`w-full text-start flex items-center gap-2.5 px-3 py-2 rounded-lg border text-xs sm:text-sm transition-colors ${style}`}
                        >
                          <span className="w-6 h-6 rounded-full border border-current flex items-center justify-center text-[11px] font-bold shrink-0">
                            {String.fromCharCode(65 + oi)}
                          </span>
                          <span className="flex-1">{pick(opt, lang)}</span>
                          {active && correctOpt && <Check className="w-4 h-4 text-emerald-600" />}
                          {active && !correctOpt && <X className="w-4 h-4 text-rose-600" />}
                        </button>
                      );
                    })}
                  </div>
                  {isRevealed && (
                    <div
                      className={`p-2.5 rounded-lg text-xs ${
                        isRight ? 'bg-emerald-100 text-emerald-900' : 'bg-rose-100 text-rose-900'
                      }`}
                    >
                      <strong>
                        {isRight ? t.mentor.correctAnswer : t.mentor.incorrectAnswer}:
                      </strong>{' '}
                      {t.mentor.rationale}: {pick(qz.rationale, lang)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default function MentorPage() {
  const { t, lang } = useLang();
  const { eduBundle, isBrowserOnline, backendStatus } = useConnectivity();
  const toast = useToast();

  const [tab, setTab] = useState('real');
  const [reportType, setReportType] = useState('auto');
  const [uploading, setUploading] = useState(false);
  const [analyzingStage, setAnalyzingStage] = useState(false);
  const [analyzeElapsed, setAnalyzeElapsed] = useState(0);
  const [progress, setProgress] = useState(0);
  const [realResult, setRealResult] = useState(null);
  const [errorInfo, setErrorInfo] = useState(null);
  const [lastFile, setLastFile] = useState(null);

  const [samples, setSamples] = useState([]);
  const [selectedSampleId, setSelectedSampleId] = useState('ctg');
  const [history, setHistory] = useState([]);

  const isDisconnected = !isBrowserOnline || backendStatus === 'disconnected';

  useEffect(() => {
    if (!analyzingStage) {
      setAnalyzeElapsed(0);
      return;
    }
    const started = Date.now();
    const timer = setInterval(() => {
      setAnalyzeElapsed(Math.floor((Date.now() - started) / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, [analyzingStage]);

  useEffect(() => {
    api
      .getMentorSamples()
      .then(setSamples)
      .catch(() => {
        if (eduBundle?.mentor_samples) {
          setSamples(eduBundle.mentor_samples);
        }
      });

    api
      .getMentorHistory()
      .then(setHistory)
      .catch(() => {});
  }, [eduBundle]);

  const handleUpload = async (file) => {
    if (!file || uploading) return;
    if (isDisconnected) {
      toast.error(t.connectivity.backendDownMessage);
      return;
    }
    setLastFile(file);
    setErrorInfo(null);
    setUploading(true);
    setAnalyzingStage(false);
    setProgress(0);
    try {
      const res = await api.analyzeMentorReport(
        file,
        reportType,
        lang,
        setProgress,
        () => setAnalyzingStage(true)
      );
      setRealResult(res.result);
      setHistory((prev) => [res, ...prev]);
      toast.success(t.reports.analysisSuccess);
    } catch (err) {
      const info = extractErrorInfo(err) || {
        category: 'service_unavailable',
        message: { ar: getFriendlyErrorMessage(err, 'ar'), en: getFriendlyErrorMessage(err, 'en') },
        retryable: true,
      };
      setErrorInfo(info);
      toast.error(getFriendlyErrorMessage(err, lang));
    } finally {
      setUploading(false);
      setAnalyzingStage(false);
    }
  };

  const activeSample = samples.find((s) => s.id === selectedSampleId) || samples[0];

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <GraduationCap className="w-7 h-7 text-primary-600" />
            <span>{t.mentor.title}</span>
          </h1>
          <p className="text-sm text-slate-500 mt-1">{t.mentor.subtitle}</p>
        </div>

        <OfflineAiAlert />

        {/* Tabs */}
        <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-3">
          <button
            type="button"
            onClick={() => setTab('real')}
            className={`px-4 py-2 rounded-xl text-sm font-medium ${
              tab === 'real'
                ? 'bg-primary-600 text-white'
                : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            {t.mentor.realUploadTab}
          </button>
          <button
            type="button"
            onClick={() => setTab('demo')}
            className={`px-4 py-2 rounded-xl text-sm font-medium ${
              tab === 'demo'
                ? 'bg-amber-600 text-white'
                : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            {t.mentor.demoSamplesTab}
          </button>
          <button
            type="button"
            onClick={() => setTab('history')}
            className={`px-4 py-2 rounded-xl text-sm font-medium inline-flex items-center gap-1.5 ${
              tab === 'history'
                ? 'bg-slate-800 text-white'
                : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            <History className="w-4 h-4" />
            <span>
              {t.mentor.historyTab} ({history.length})
            </span>
          </button>
        </div>

        {tab === 'real' && (
          <div className="space-y-5">
            <div className="card space-y-4">
              <div className="max-w-sm">
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  {t.mentor.reportTypeLabel}
                </label>
                <select
                  value={reportType}
                  onChange={(e) => setReportType(e.target.value)}
                  className="input-field"
                >
                  {Object.entries(t.mentor.reportTypes).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
              </div>
              <FileUpload
                onFileSelected={handleUpload}
                uploading={uploading && !analyzingStage}
                progress={progress}
                disabled={isDisconnected || uploading}
              />
              {analyzingStage && (
                <div className="flex items-start gap-2.5 p-3 rounded-lg bg-sky-50 border border-sky-200 text-sky-900 text-sm">
                  <div className="spinner-sm mt-0.5 shrink-0" />
                  <div className="space-y-0.5">
                    <p className="font-medium">
                      {analyzeElapsed < 4 ? t.reports.analyzing : t.reports.preparingSummary}
                    </p>
                    {analyzeElapsed >= 10 && (
                      <p className="text-xs text-sky-700">{t.reports.continuingNotice}</p>
                    )}
                  </div>
                </div>
              )}
              {errorInfo && (
                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm space-y-1.5">
                  <p className="font-semibold">{t.reports.analysisUnavailable}</p>
                  <p className="text-xs leading-relaxed">
                    {getFriendlyErrorMessage(errorInfo, lang)}
                  </p>
                  {errorInfo.retry_after_seconds && (
                    <p className="text-[11px] text-rose-600">
                      {t.reports.retryAfterPrefix} {errorInfo.retry_after_seconds}s
                    </p>
                  )}
                  {errorInfo.retryable && lastFile && !isDisconnected && !uploading && (
                    <button
                      type="button"
                      onClick={() => handleUpload(lastFile)}
                      className="mt-1 px-2.5 py-1 rounded bg-white border border-rose-300 text-xs font-medium text-rose-800 hover:bg-rose-100 inline-flex items-center gap-1"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>{t.common.retry}</span>
                    </button>
                  )}
                </div>
              )}
            </div>

            {realResult && (
              <MentorSixCardView data={realResult} lang={lang} t={t} isDemo={false} />
            )}
          </div>
        )}

        {tab === 'demo' && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {samples.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setSelectedSampleId(s.id)}
                  className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-medium border ${
                    selectedSampleId === s.id
                      ? 'bg-amber-50 border-amber-400 text-amber-900'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {lang === 'ar' ? s.title_ar : s.title_en}
                </button>
              ))}
            </div>
            {activeSample && (
              <MentorSixCardView data={activeSample.data} lang={lang} t={t} isDemo={true} />
            )}
          </div>
        )}

        {tab === 'history' && (
          <div className="space-y-4">
            {history.length === 0 ? (
              <div className="card text-center py-10 text-slate-500 text-sm">
                {t.common.noData}
              </div>
            ) : (
              history.map((item) => (
                <div key={item.id} className="space-y-3">
                  <div className="text-xs text-slate-500 font-medium">
                    {item.original_filename} • {new Date(item.created_at).toLocaleString()}
                  </div>
                  <MentorSixCardView data={item.result} lang={lang} t={t} isDemo={false} />
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
