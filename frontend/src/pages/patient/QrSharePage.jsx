import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { QrCode, ShieldCheck, Copy, Trash2, Clock, Check } from 'lucide-react';
import AppLayout from '../../layouts/AppLayout';
import { api } from '../../api/client';
import { useLang } from '../../context/LangContext';
import { useToast } from '../../components/Toast';

const ALL_SCOPES = ['profile', 'conditions', 'medications', 'allergies', 'vitals', 'reports'];

export default function QrSharePage() {
  const { t } = useLang();
  const toast = useToast();

  const [selectedScope, setSelectedScope] = useState([
    'profile',
    'conditions',
    'medications',
    'allergies',
    'vitals',
  ]);
  const [expiresMinutes, setExpiresMinutes] = useState(60);
  const [generating, setGenerating] = useState(false);

  const [activeGenerated, setActiveGenerated] = useState(null);
  const [qrSvg, setQrSvg] = useState('');
  const [copied, setCopied] = useState(false);
  const [tokens, setTokens] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadTokens = async () => {
    try {
      const list = await api.listQrTokens();
      setTokens(list);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTokens();
  }, []);

  const toggleScope = (item) => {
    setSelectedScope((prev) =>
      prev.includes(item) ? prev.filter((s) => s !== item) : [...prev, item]
    );
  };

  const handleGenerate = async (e) => {
    e.preventDefault();
    if (selectedScope.length === 0) return;
    setGenerating(true);
    try {
      const res = await api.createQrToken({
        scope: selectedScope,
        expires_minutes: Number(expiresMinutes),
      });
      // Encode ONLY the cryptographic token (never health data or patient IDs)
      const svg = await QRCode.toString(res.access_token, {
        type: 'svg',
        width: 220,
        margin: 1,
      });
      setActiveGenerated(res);
      setQrSvg(svg);
      await loadTokens();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setGenerating(false);
    }
  };

  const handleCopy = async () => {
    if (!activeGenerated?.access_token) return;
    try {
      await navigator.clipboard.writeText(activeGenerated.access_token);
      setCopied(true);
      toast.success(t.qr.copied);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Copy failed');
    }
  };

  const handleRevoke = async (id) => {
    try {
      await api.revokeQrToken(id);
      if (activeGenerated?.id === id) {
        setActiveGenerated(null);
        setQrSvg('');
      }
      await loadTokens();
      toast.info(t.qr.revokeBtn);
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <QrCode className="w-7 h-7 text-primary-600" />
            <span>{t.qr.title}</span>
          </h1>
          <p className="text-sm text-slate-500 mt-1">{t.qr.subtitle}</p>
        </div>

        <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-teal-50 border border-teal-200 text-teal-900 text-xs sm:text-sm">
          <ShieldCheck className="w-5 h-5 text-teal-700 shrink-0 mt-0.5" />
          <span>{t.qr.securityNote}</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Generator Form */}
          <form onSubmit={handleGenerate} className="card space-y-4">
            <h2 className="text-base font-semibold text-slate-900">{t.qr.selectScope}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {ALL_SCOPES.map((sc) => (
                <label
                  key={sc}
                  className="flex items-center gap-2.5 p-2.5 rounded-lg border border-slate-200 bg-slate-50 cursor-pointer hover:border-primary-400"
                >
                  <input
                    type="checkbox"
                    checked={selectedScope.includes(sc)}
                    onChange={() => toggleScope(sc)}
                    className="rounded text-primary-600 focus:ring-primary-500"
                  />
                  <span className="text-sm text-slate-800">{t.qr.scopes[sc]}</span>
                </label>
              ))}
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                {t.qr.expiryLabel}
              </label>
              <select
                value={expiresMinutes}
                onChange={(e) => setExpiresMinutes(Number(e.target.value))}
                className="input-field"
              >
                <option value={15}>{t.qr.exp15}</option>
                <option value={60}>{t.qr.exp60}</option>
                <option value={1440}>{t.qr.exp1440}</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={generating || selectedScope.length === 0}
              className="btn-primary w-full inline-flex items-center justify-center gap-2"
            >
              <QrCode className="w-4 h-4" />
              <span>{generating ? t.common.loading : t.qr.generateBtn}</span>
            </button>
          </form>

          {/* Active QR Display */}
          <div className="card flex flex-col items-center justify-center text-center space-y-4">
            {activeGenerated && qrSvg ? (
              <>
                <div
                  className="p-3 bg-white rounded-xl border border-slate-200 shadow-sm"
                  dangerouslySetInnerHTML={{ __html: qrSvg }}
                />
                <div className="w-full max-w-sm space-y-2">
                  <div className="p-2.5 rounded-lg bg-slate-100 font-mono text-xs text-slate-800 break-all">
                    {activeGenerated.access_token}
                  </div>
                  <div className="flex items-center justify-center gap-1.5 text-xs text-slate-500">
                    <Clock className="w-3.5 h-3.5" />
                    <span>
                      Expires: {new Date(activeGenerated.expires_at).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleCopy}
                      className="btn-secondary flex-1 text-xs inline-flex items-center justify-center gap-1.5"
                    >
                      {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copied ? t.qr.copied : t.qr.copyCode}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRevoke(activeGenerated.id)}
                      className="btn-danger text-xs inline-flex items-center gap-1.5"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>{t.qr.revokeBtn}</span>
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="py-12 text-slate-400 space-y-2">
                <QrCode className="w-12 h-12 mx-auto opacity-40" />
                <p className="text-sm">{t.qr.generateBtn}</p>
              </div>
            )}
          </div>
        </div>

        {/* Issued Tokens & Audit Log */}
        <div className="card space-y-4">
          <h2 className="text-base font-semibold text-slate-900">
            {t.qr.activeTokensTitle}
          </h2>
          {loading ? (
            <div className="spinner-sm" />
          ) : tokens.length === 0 ? (
            <p className="text-sm text-slate-500">{t.qr.noTokens}</p>
          ) : (
            <div className="space-y-3">
              {tokens.map((tok) => (
                <div
                  key={tok.id}
                  className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-2"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <span className="font-mono text-xs font-semibold text-slate-800">
                        {tok.token_hint}
                      </span>
                      <span
                        className={`ms-2 px-2 py-0.5 rounded-full text-[11px] font-medium ${
                          tok.status === 'active'
                            ? 'bg-emerald-100 text-emerald-800'
                            : tok.status === 'revoked'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-slate-200 text-slate-700'
                        }`}
                      >
                        {tok.status}
                      </span>
                      <p className="text-xs text-slate-500 mt-1">
                        Scope: {(tok.scope || []).join(', ')} • Expires:{' '}
                        {new Date(tok.expires_at).toLocaleString()}
                      </p>
                    </div>

                    {tok.status === 'active' && (
                      <button
                        type="button"
                        onClick={() => handleRevoke(tok.id)}
                        className="btn-danger text-xs py-1.5 px-3"
                      >
                        {t.qr.revokeBtn}
                      </button>
                    )}
                  </div>

                  {tok.logs && tok.logs.length > 0 && (
                    <div className="pt-2 border-t border-slate-200 space-y-1">
                      {tok.logs.map((lg) => (
                        <div key={lg.id} className="text-[11px] text-slate-600 flex justify-between">
                          <span>
                            {lg.doctor_name} — <strong>{lg.action}</strong>
                          </span>
                          <span>{new Date(lg.accessed_at).toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
