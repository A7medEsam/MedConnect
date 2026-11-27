import React, { useEffect, useMemo, useState } from 'react';
import { BookMarked, ExternalLink, Search, AlertCircle } from 'lucide-react';
import AppLayout from '../../layouts/AppLayout';
import { api } from '../../api/client';
import { useLang } from '../../context/LangContext';
import { useConnectivity } from '../../context/ConnectivityContext';

export default function ReferencesPage() {
  const { t, lang } = useLang();
  const { eduBundle, isBackendReachable } = useConnectivity();

  const [refs, setRefs] = useState([]);
  const [specialties, setSpecialties] = useState([]);
  const [guidelines, setGuidelines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [usingOfflineCache, setUsingOfflineCache] = useState(false);

  const [q, setQ] = useState('');
  const [specialtyFilter, setSpecialtyFilter] = useState('all');
  const [guidelineFilter, setGuidelineFilter] = useState('all');

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const [r, s, g] = await Promise.all([
          api.listReferences(),
          api.listSpecialties(),
          api.listGuidelines(),
        ]);
        if (active) {
          setRefs(r);
          setSpecialties(s);
          setGuidelines(g);
          setUsingOfflineCache(false);
        }
      } catch {
        if (active && eduBundle) {
          setRefs(eduBundle.references || []);
          setSpecialties(eduBundle.specialties || []);
          setGuidelines(eduBundle.guidelines || []);
          setUsingOfflineCache(true);
        }
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, [eduBundle, isBackendReachable]);

  const filtered = useMemo(() => {
    const search = q.trim().toLowerCase();
    return refs.filter((r) => {
      if (specialtyFilter !== 'all' && r.specialty_id !== specialtyFilter) return false;
      if (guidelineFilter !== 'all' && !(r.guidelines || []).includes(guidelineFilter)) return false;
      if (search) {
        const hay = `${r.title_en} ${r.title_ar} ${r.source_en} ${r.source_ar} ${r.summary_en} ${r.summary_ar} ${(r.guidelines || []).join(' ')}`.toLowerCase();
        if (!hay.includes(search)) return false;
      }
      return true;
    });
  }, [refs, specialtyFilter, guidelineFilter, q]);

  const specName = (id) => {
    const found = specialties.find((s) => s.id === id);
    if (!found) return id;
    return lang === 'ar' ? found.name_ar : found.name_en;
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <BookMarked className="w-7 h-7 text-primary-600" />
              <span>{t.references.title}</span>
            </h1>
            <p className="text-sm text-slate-500 mt-1">{t.references.subtitle}</p>
          </div>
          <span className="px-3 py-1 rounded-full text-xs font-medium bg-sky-50 text-sky-800 border border-sky-200">
            {t.references.offlineNotice}
          </span>
        </div>

        {usingOfflineCache && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{t.common.offlineEduBadge}</span>
          </div>
        )}

        {/* Filters */}
        <div className="card space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute top-1/2 -translate-y-1/2 start-3" />
              <input
                type="text"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={t.references.searchPlaceholder}
                className="input-field ps-9"
              />
            </div>

            <select
              value={specialtyFilter}
              onChange={(e) => setSpecialtyFilter(e.target.value)}
              className="input-field"
            >
              <option value="all">{t.references.allSpecialties}</option>
              {specialties.map((s) => (
                <option key={s.id} value={s.id}>
                  {lang === 'ar' ? s.name_ar : s.name_en}
                </option>
              ))}
            </select>

            <select
              value={guidelineFilter}
              onChange={(e) => setGuidelineFilter(e.target.value)}
              className="input-field"
            >
              <option value="all">{t.references.allOrgs}</option>
              {guidelines.map((g) => (
                <option key={g.code} value={g.code}>
                  {lang === 'ar' ? g.name_ar : g.name_en}
                </option>
              ))}
            </select>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="spinner" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="card text-center py-12 text-slate-500 text-sm">
            {t.common.noData}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filtered.map((r) => (
              <div key={r.id} className="card flex flex-col justify-between gap-3">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-50 text-primary-700 border border-primary-200">
                        {specName(r.specialty_id)}
                      </span>
                      {(r.guidelines || []).map((code) => (
                        <span
                          key={code}
                          className="px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200"
                        >
                          {code}
                        </span>
                      ))}
                    </div>
                    <span className="text-xs text-slate-500">
                      {r.year} {r.last_updated && r.last_updated !== r.year ? `(Updated ${r.last_updated})` : ''}
                    </span>
                  </div>

                  <h3 className="font-semibold text-slate-900 text-base leading-snug">
                    {lang === 'ar' ? r.title_ar : r.title_en}
                  </h3>
                  <p className="text-xs font-medium text-slate-600">
                    {lang === 'ar' ? r.source_ar : r.source_en}
                  </p>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    {lang === 'ar' ? r.summary_ar : r.summary_en}
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[11px] px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200">
                    {r.verification_status}
                  </span>
                  <a
                    href={r.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-semibold text-primary-600 hover:text-primary-700 inline-flex items-center gap-1"
                  >
                    <span>{t.references.openSource}</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
