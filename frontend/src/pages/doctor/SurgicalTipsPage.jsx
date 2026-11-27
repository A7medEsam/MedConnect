import React, { useEffect, useMemo, useState } from 'react';
import {
  Scissors,
  Search,
  Bookmark,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  ExternalLink,
} from 'lucide-react';
import AppLayout from '../../layouts/AppLayout';
import { api } from '../../api/client';
import { useLang } from '../../context/LangContext';
import { useConnectivity } from '../../context/ConnectivityContext';
import { useToast } from '../../components/Toast';

export default function SurgicalTipsPage() {
  const { t, lang } = useLang();
  const { eduBundle, isBackendReachable } = useConnectivity();
  const toast = useToast();

  const [tips, setTips] = useState([]);
  const [specialties, setSpecialties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [specialtyFilter, setSpecialtyFilter] = useState('all');
  const [bookmarkedOnly, setBookmarkedOnly] = useState(false);
  const [expanded, setExpanded] = useState({});

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const [tipsData, specsData] = await Promise.all([
          api.listSurgicalTips(),
          api.listSpecialties(),
        ]);
        if (active) {
          setTips(tipsData);
          setSpecialties(specsData.filter((s) => s.is_surgical));
        }
      } catch {
        if (active && eduBundle) {
          setTips(eduBundle.surgical_tips || []);
          setSpecialties((eduBundle.specialties || []).filter((s) => s.is_surgical));
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

  const toggleBookmark = async (tipId) => {
    try {
      const res = await api.toggleTipBookmark(tipId);
      setTips((prev) =>
        prev.map((tip) =>
          tip.id === tipId ? { ...tip, is_bookmarked: res.is_bookmarked } : tip
        )
      );
    } catch (err) {
      toast.error(err.message);
    }
  };

  const filtered = useMemo(() => {
    const search = q.trim().toLowerCase();
    return tips.filter((tip) => {
      if (specialtyFilter !== 'all' && tip.specialty_id !== specialtyFilter) return false;
      if (bookmarkedOnly && !tip.is_bookmarked) return false;
      if (search) {
        const hay = `${tip.title_en} ${tip.title_ar} ${tip.excerpt_en} ${tip.excerpt_ar} ${tip.author_name_en}`.toLowerCase();
        if (!hay.includes(search)) return false;
      }
      return true;
    });
  }, [tips, specialtyFilter, bookmarkedOnly, q]);

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Scissors className="w-7 h-7 text-primary-600" />
            <span>{t.surgical.title}</span>
          </h1>
          <p className="text-sm text-slate-500 mt-1">{t.surgical.subtitle}</p>
        </div>

        <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-amber-50 border border-amber-300 text-amber-950 text-xs sm:text-sm">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <span className="font-medium">{t.surgical.disclaimer}</span>
        </div>

        <div className="card flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-slate-400 absolute top-1/2 -translate-y-1/2 start-3" />
            <input
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={t.surgical.searchPlaceholder}
              className="input-field ps-9"
            />
          </div>

          <select
            value={specialtyFilter}
            onChange={(e) => setSpecialtyFilter(e.target.value)}
            className="input-field w-full sm:w-56"
          >
            <option value="all">{t.references.allSpecialties}</option>
            {specialties.map((s) => (
              <option key={s.id} value={s.id}>
                {lang === 'ar' ? s.name_ar : s.name_en}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => setBookmarkedOnly((v) => !v)}
            className={`px-3.5 py-2 rounded-lg border text-sm font-medium inline-flex items-center gap-1.5 ${
              bookmarkedOnly
                ? 'bg-primary-50 border-primary-400 text-primary-700'
                : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
            }`}
          >
            <Bookmark className="w-4 h-4" />
            <span>{t.surgical.bookmarkedOnly}</span>
          </button>
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
            {filtered.map((tip) => {
              const isOpen = Boolean(expanded[tip.id]);
              return (
                <div key={tip.id} className="card flex flex-col justify-between gap-3">
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-violet-50 text-violet-700 border border-violet-200 uppercase">
                          {tip.tip_type}
                        </span>
                        {tip.duration && (
                          <span className="text-xs text-slate-500 font-mono">
                            {tip.duration}
                          </span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => toggleBookmark(tip.id)}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border ${
                          tip.is_bookmarked
                            ? 'bg-primary-50 border-primary-300 text-primary-700'
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <Bookmark
                          className={`w-3.5 h-3.5 ${
                            tip.is_bookmarked ? 'fill-primary-600 text-primary-600' : ''
                          }`}
                        />
                        <span>
                          {tip.is_bookmarked ? t.surgical.bookmarked : t.surgical.bookmark}
                        </span>
                      </button>
                    </div>

                    <h3 className="font-semibold text-slate-900 text-base">
                      {lang === 'ar' ? tip.title_ar : tip.title_en}
                    </h3>
                    <p className="text-sm text-slate-600 leading-relaxed">
                      {lang === 'ar' ? tip.excerpt_ar : tip.excerpt_en}
                    </p>

                    {Array.isArray(tip.steps) && tip.steps.length > 0 && (
                      <div className="pt-1">
                        <button
                          type="button"
                          onClick={() =>
                            setExpanded((prev) => ({ ...prev, [tip.id]: !prev[tip.id] }))
                          }
                          className="text-xs font-semibold text-primary-700 inline-flex items-center gap-1"
                        >
                          <span>
                            {t.surgical.stepsLabel} ({tip.steps.length})
                          </span>
                          {isOpen ? (
                            <ChevronUp className="w-4 h-4" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
                        </button>
                        {isOpen && (
                          <ol className="mt-2 space-y-1.5 bg-slate-50 p-3 rounded-lg border border-slate-200">
                            {tip.steps.map((st, idx) => (
                              <li key={idx} className="flex items-start gap-2 text-xs text-slate-700">
                                <span className="w-5 h-5 rounded-full bg-primary-100 text-primary-800 flex items-center justify-center font-bold shrink-0">
                                  {idx + 1}
                                </span>
                                <span>{lang === 'ar' ? st.ar : st.en}</span>
                              </li>
                            ))}
                          </ol>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                    <span>{lang === 'ar' ? tip.author_name_ar : tip.author_name_en}</span>
                    {tip.reference_url && (
                      <a
                        href={tip.reference_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary-600 hover:underline inline-flex items-center gap-1"
                      >
                        <span>{t.references.openSource}</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
