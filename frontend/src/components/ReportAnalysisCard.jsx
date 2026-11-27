import React from 'react';
import {
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  Info,
  Eye,
} from 'lucide-react';
import { useLang } from '../context/LangContext';

function resolveBilingualText(val, lang) {
  if (val == null) return { text: '', missingTargetLang: false };
  if (typeof val === 'object' && !Array.isArray(val)) {
    const target = val[lang];
    if (typeof target === 'string' && target.trim()) {
      return { text: target.trim(), missingTargetLang: false };
    }
    const fallback = val.en || val.ar || '';
    return { text: String(fallback).trim(), missingTargetLang: Boolean(fallback) };
  }
  const str = String(val).trim();
  if (!str) return { text: '', missingTargetLang: false };
  // Detect legacy single-language content mismatch cleanly without inventing translation
  const hasArabicChars = /[\u0600-\u06FF]/.test(str);
  const mismatch = (lang === 'ar' && !hasArabicChars) || (lang === 'en' && hasArabicChars);
  return { text: str, missingTargetLang: mismatch };
}

function resolveBilingualList(val, lang) {
  if (!val) return { items: [], missingTargetLang: false };
  if (typeof val === 'object' && !Array.isArray(val)) {
    const target = val[lang];
    if (Array.isArray(target) && target.length > 0) {
      return { items: target, missingTargetLang: false };
    }
    const fallback = Array.isArray(val.en) && val.en.length > 0 ? val.en : val.ar || [];
    return { items: fallback, missingTargetLang: fallback.length > 0 };
  }
  if (Array.isArray(val) && val.length > 0) {
    const sample = String(val[0] || '');
    const hasArabicChars = /[\u0600-\u06FF]/.test(sample);
    const mismatch = (lang === 'ar' && !hasArabicChars) || (lang === 'en' && hasArabicChars);
    return { items: val, missingTargetLang: mismatch };
  }
  return { items: [], missingTargetLang: false };
}

export default function ReportAnalysisCard({ analysis }) {
  const { t, lang } = useLang();
  if (!analysis || !analysis.result) return null;

  const data = analysis.result;
  const urgencyColors = {
    urgent: 'bg-rose-100 text-rose-800 border-rose-200',
    follow_up_soon: 'bg-amber-100 text-amber-800 border-amber-200',
    routine: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  };

  const reportType = resolveBilingualText(data.report_type || data.document_type, lang);
  const summary = resolveBilingualText(data.summary, lang);
  const findings = resolveBilingualList(data.findings, lang);
  const observations = resolveBilingualList(data.observations, lang);
  const abnormalFlags = resolveBilingualList(data.abnormal_flags, lang);
  const recommendations = resolveBilingualList(data.recommendations, lang);
  const questions = resolveBilingualList(data.questions_for_doctor, lang);
  const limitations = resolveBilingualText(data.limitations, lang);
  const notice = resolveBilingualText(data.medical_review_notice || data.disclaimer, lang);

  const measurements = Array.isArray(data.measurements)
    ? data.measurements
    : Array.isArray(data.key_values)
    ? data.key_values
    : [];

  const showSingleLangBanner =
    data.schema_version !== 'bilingual_v2' &&
    (summary.missingTargetLang || reportType.missingTargetLang);

  return (
    <div className="mt-4 rounded-xl border border-primary-200 bg-gradient-to-br from-primary-50/40 to-sky-50/40 p-4 sm:p-5 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-primary-600 text-white">
            <Sparkles className="w-3.5 h-3.5" />
            {t.common.aiBadge}
          </span>
          {analysis.model_used && (
            <span className="text-xs text-slate-500 font-mono">
              {analysis.model_used}
            </span>
          )}
        </div>

        {data.urgency_level && (
          <span
            className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${
              urgencyColors[data.urgency_level] || urgencyColors.routine
            }`}
          >
            {t.reports.urgency}: {data.urgency_level}
          </span>
        )}
      </div>

      {showSingleLangBanner && (
        <div className="flex items-start gap-2 p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs">
          <Info className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
          <span>{t.reports.secondLangUnavailable}</span>
        </div>
      )}

      {reportType.text && (
        <div>
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {t.reports.documentType}
          </span>
          <p className="text-sm font-semibold text-slate-800 mt-0.5">
            {reportType.text}
          </p>
        </div>
      )}

      {summary.text && (
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">
            {t.reports.summary}
          </h4>
          <p className="text-sm text-slate-800 leading-relaxed bg-white/80 rounded-lg p-3 border border-slate-200/80">
            {summary.text}
          </p>
        </div>
      )}

      {measurements.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">
            {t.reports.keyValues}
          </h4>
          <div className="overflow-x-auto bg-white rounded-lg border border-slate-200">
            <table className="w-full text-sm text-start">
              <thead className="bg-slate-50 text-xs text-slate-600 border-b border-slate-200">
                <tr>
                  <th className="py-2 px-3 text-start">{t.reports.valueName}</th>
                  <th className="py-2 px-3 text-start">{t.reports.valueMeasured}</th>
                  <th className="py-2 px-3 text-start">{t.reports.valueReference}</th>
                  <th className="py-2 px-3 text-start">{t.common.status}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {measurements.map((kv, idx) => {
                  const isAbnormal = kv.status === 'high' || kv.status === 'low' || kv.status === 'abnormal';
                  const nameRes = resolveBilingualText(kv.name, lang);
                  const displayVal = kv.unit && !String(kv.value || '').includes(kv.unit)
                    ? `${kv.value} ${kv.unit}`
                    : kv.value;
                  return (
                    <tr key={idx}>
                      <td className="py-2 px-3 font-medium text-slate-800">{nameRes.text}</td>
                      <td className="py-2 px-3 font-semibold text-slate-900">{displayVal}</td>
                      <td className="py-2 px-3 text-slate-500">{kv.reference_range || '-'}</td>
                      <td className="py-2 px-3">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                            isAbnormal
                              ? 'bg-rose-100 text-rose-700'
                              : kv.status === 'normal'
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {kv.status || 'unknown'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {abnormalFlags.items.length > 0 && (
        <div className="bg-rose-50 border border-rose-200 rounded-lg p-3">
          <h4 className="text-xs font-semibold text-rose-800 flex items-center gap-1.5 mb-1.5">
            <AlertTriangle className="w-4 h-4" />
            {t.reports.abnormalFlags}
          </h4>
          <ul className="list-disc list-inside text-sm text-rose-900 space-y-1">
            {abnormalFlags.items.map((flag, idx) => (
              <li key={idx}>{flag}</li>
            ))}
          </ul>
        </div>
      )}

      {findings.items.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1.5">
            {t.reports.findings}
          </h4>
          <ul className="space-y-1 text-sm text-slate-700">
            {findings.items.map((f, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-primary-600 shrink-0 mt-0.5" />
                <span>{f}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {observations.items.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1.5 flex items-center gap-1.5">
            <Eye className="w-3.5 h-3.5 text-slate-500" />
            <span>{t.reports.observations}</span>
          </h4>
          <ul className="list-disc list-inside text-sm text-slate-700 space-y-1">
            {observations.items.map((obs, idx) => (
              <li key={idx}>{obs}</li>
            ))}
          </ul>
        </div>
      )}

      {recommendations.items.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1.5">
            {t.reports.recommendations}
          </h4>
          <ul className="list-disc list-inside text-sm text-slate-700 space-y-1">
            {recommendations.items.map((rec, idx) => (
              <li key={idx}>{rec}</li>
            ))}
          </ul>
        </div>
      )}

      {questions.items.length > 0 && (
        <div className="bg-sky-50 border border-sky-200 rounded-lg p-3">
          <h4 className="text-xs font-semibold text-sky-800 flex items-center gap-1.5 mb-1.5">
            <HelpCircle className="w-4 h-4" />
            {t.reports.questionsForDoctor}
          </h4>
          <ul className="list-disc list-inside text-sm text-sky-900 space-y-1">
            {questions.items.map((q, idx) => (
              <li key={idx}>{q}</li>
            ))}
          </ul>
        </div>
      )}

      {limitations.text && (
        <div className="text-xs text-slate-600 bg-white/70 border border-slate-200 rounded-lg p-2.5">
          <strong>{t.reports.limitations}:</strong> {limitations.text}
        </div>
      )}

      {notice.text && (
        <div className="flex items-start gap-2 text-xs text-slate-500 pt-2 border-t border-slate-200/80">
          <Info className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{notice.text}</span>
        </div>
      )}
    </div>
  );
}
