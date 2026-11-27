import React, { useEffect, useRef, useState } from 'react';
import { Send, Bot, User, Sparkles, AlertCircle, RefreshCw } from 'lucide-react';
import { useLang } from '../context/LangContext';
import { getFriendlyErrorMessage } from '../api/client';

export default function ChatInterface({
  messages = [],
  sending = false,
  sendingElapsed = 0,
  disabled = false,
  error = null,
  onSendMessage,
  onRetryLast = null,
  suggestions = [],
}) {
  const { t, lang } = useLang();
  const [input, setInput] = useState('');
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sending, sendingElapsed]);

  const isQuotaBlocked = error && error.category === 'quota_exceeded';
  const isBlocked = disabled || sending || isQuotaBlocked;

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || isBlocked) return;
    setInput('');
    onSendMessage(trimmed);
  };

  const renderMessageContent = (msg) => {
    if (msg.role !== 'assistant') {
      return { text: msg.content, missingSecondLang: false };
    }
    const target = lang === 'ar' ? msg.content_ar : msg.content_en;
    if (target && target.trim()) {
      return { text: target, missingSecondLang: false };
    }
    const fallback = msg.content || msg.content_en || msg.content_ar || '';
    const hasArabic = /[\u0600-\u06FF]/.test(fallback);
    const missing = Boolean(fallback) && ((lang === 'ar' && !hasArabic) || (lang === 'en' && hasArabic));
    return { text: fallback, missingSecondLang: missing };
  };

  const errMsgText = error ? getFriendlyErrorMessage(error, lang) : '';
  const canRetry = Boolean(error && error.retryable && onRetryLast && !disabled && !sending);

  const stageLabel = sendingElapsed < 2 ? t.chat.sendingQuestion : t.chat.thinking;

  return (
    <div className="flex flex-col h-full bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-slate-50/50">
        {messages.length === 0 && !sending ? (
          <div className="h-full flex flex-col items-center justify-center text-center max-w-md mx-auto py-8">
            <div className="w-14 h-14 rounded-2xl bg-primary-100 text-primary-700 flex items-center justify-center mb-4">
              <Sparkles className="w-7 h-7" />
            </div>
            <h3 className="text-base font-semibold text-slate-800">
              {t.chat.emptyMessagesTitle}
            </h3>
            <p className="text-sm text-slate-500 mt-1.5">
              {t.chat.emptyMessagesHint}
            </p>
            {suggestions.length > 0 && (
              <div className="mt-5 flex flex-col gap-2 w-full">
                {suggestions.map((text, idx) => (
                  <button
                    key={idx}
                    type="button"
                    disabled={isBlocked}
                    onClick={() => !isBlocked && onSendMessage(text)}
                    className="text-start text-xs sm:text-sm px-3.5 py-2.5 rounded-lg bg-white border border-slate-200 hover:border-primary-400 hover:bg-primary-50/50 text-slate-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {text}
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          messages.map((msg) => {
            const isUser = msg.role === 'user';
            const resolved = renderMessageContent(msg);
            return (
              <div
                key={msg.id}
                className={`flex items-start gap-3 ${
                  isUser ? 'flex-row-reverse' : 'flex-row'
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                    isUser
                      ? 'bg-primary-600 text-white'
                      : 'bg-sky-100 text-sky-700 border border-sky-200'
                  }`}
                >
                  {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                </div>
                <div
                  className={`max-w-[82%] sm:max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm ${
                    isUser
                      ? 'bg-primary-600 text-white rounded-se-sm'
                      : 'bg-white text-slate-800 border border-slate-200 rounded-ss-sm'
                  }`}
                >
                  <p className="whitespace-pre-wrap break-words">{resolved.text}</p>
                  {resolved.missingSecondLang && (
                    <p className="text-[11px] mt-1.5 text-amber-700 bg-amber-50 px-2 py-0.5 rounded">
                      {t.reports.secondLangUnavailable}
                    </p>
                  )}
                  {msg.created_at && (
                    <div
                      className={`text-[10px] mt-1.5 ${
                        isUser ? 'text-primary-100' : 'text-slate-400'
                      }`}
                    >
                      {new Date(msg.created_at).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}

        {sending && (
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-sky-100 text-sky-700 border border-sky-200 flex items-center justify-center shrink-0">
              <Bot className="w-4 h-4" />
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl rounded-ss-sm px-4 py-3 shadow-sm space-y-1">
              <div className="flex items-center gap-2">
                <span className="loading-dot" />
                <span className="loading-dot" />
                <span className="loading-dot" />
                <span className="text-xs font-medium text-slate-700 ms-1">{stageLabel}</span>
              </div>
              {sendingElapsed >= 10 && (
                <p className="text-[11px] text-slate-500">{t.chat.continuingNotice}</p>
              )}
            </div>
          </div>
        )}

        {error && (
          <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="flex-1 space-y-1.5">
              <p className="font-medium">{t.reports.analysisUnavailable}</p>
              <p className="text-xs text-rose-700 leading-relaxed">{errMsgText}</p>
              {error.retry_after_seconds && (
                <p className="text-[11px] text-rose-600">
                  {t.reports.retryAfterPrefix} {error.retry_after_seconds}s
                </p>
              )}
              {canRetry && (
                <button
                  type="button"
                  onClick={onRetryLast}
                  className="mt-1 px-2.5 py-1 rounded bg-white border border-rose-300 text-xs font-medium text-rose-800 hover:bg-rose-100 inline-flex items-center gap-1"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>{t.common.retry}</span>
                </button>
              )}
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input form */}
      <form
        onSubmit={handleSubmit}
        className="p-3 sm:p-4 bg-white border-t border-slate-200 flex items-center gap-2"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={t.chat.placeholder}
          disabled={sending || disabled}
          className="input-field flex-1"
        />
        <button
          type="submit"
          disabled={!input.trim() || isBlocked}
          className="btn-primary inline-flex items-center gap-2 shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Send className="w-4 h-4" />
          <span className="hidden sm:inline">{t.chat.send}</span>
        </button>
      </form>
    </div>
  );
}
