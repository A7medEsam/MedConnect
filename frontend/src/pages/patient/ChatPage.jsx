import React, { useEffect, useRef, useState } from 'react';
import { Plus, MessageSquare, Trash2 } from 'lucide-react';
import AppLayout from '../../layouts/AppLayout';
import ChatInterface from '../../components/ChatInterface';
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

export default function ChatPage() {
  const { t, lang } = useLang();
  const { isBrowserOnline, backendStatus, isBackendReachable } = useConnectivity();
  const toast = useToast();

  const [conversations, setConversations] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loadingList, setLoadingList] = useState(true);
  const [sending, setSending] = useState(false);
  const [sendingElapsed, setSendingElapsed] = useState(0);
  const [chatError, setChatError] = useState(null);
  const [lastPrompt, setLastPrompt] = useState('');

  const sendingRef = useRef(false);

  const isDisconnected = !isBrowserOnline || backendStatus === 'disconnected';

  useEffect(() => {
    if (!sending) {
      setSendingElapsed(0);
      return;
    }
    const started = Date.now();
    const timer = setInterval(() => {
      setSendingElapsed(Math.floor((Date.now() - started) / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, [sending]);

  const loadConversations = async () => {
    try {
      const list = await api.listConversations();
      setConversations(list);
      if (list.length > 0 && !activeId) {
        setActiveId(list[0].id);
      }
    } catch (err) {
      toast.error(getFriendlyErrorMessage(err, lang));
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    loadConversations();
  }, []);

  useEffect(() => {
    if (!activeId) {
      setMessages([]);
      return;
    }
    let active = true;
    async function loadMessages() {
      try {
        const data = await api.getConversation(activeId);
        if (active) {
          setMessages(data.messages || []);
          setChatError(null);
        }
      } catch (err) {
        if (active) toast.error(getFriendlyErrorMessage(err, lang));
      }
    }
    loadMessages();
    return () => {
      active = false;
    };
  }, [activeId]);

  const handleNewChat = async () => {
    if (isDisconnected || sendingRef.current) return;
    try {
      const conv = await api.createConversation();
      setConversations((prev) => [conv, ...prev]);
      setActiveId(conv.id);
      setMessages([]);
      setChatError(null);
    } catch (err) {
      toast.error(getFriendlyErrorMessage(err, lang));
    }
  };

  const handleDeleteConv = async (e, id) => {
    e.stopPropagation();
    if (isDisconnected) return;
    try {
      await api.deleteConversation(id);
      const remaining = conversations.filter((c) => c.id !== id);
      setConversations(remaining);
      if (activeId === id) {
        setActiveId(remaining[0]?.id || null);
      }
    } catch (err) {
      toast.error(getFriendlyErrorMessage(err, lang));
    }
  };

  const handleSendMessage = async (text) => {
    if (sendingRef.current) return;
    if (isDisconnected) {
      const offlineInfo = {
        ...BILINGUAL_FALLBACK_ERRORS.backend_unavailable,
      };
      setChatError(offlineInfo);
      toast.error(getFriendlyErrorMessage(offlineInfo, lang));
      return;
    }

    sendingRef.current = true;
    setChatError(null);
    setLastPrompt(text);
    let targetId = activeId;
    setSending(true);
    try {
      if (!targetId) {
        const conv = await api.createConversation();
        setConversations((prev) => [conv, ...prev]);
        setActiveId(conv.id);
        targetId = conv.id;
      }

      const res = await api.sendMessage(targetId, text, lang);
      setMessages((prev) => [...prev, res.user_message, res.assistant_message]);
      setConversations((prev) =>
        prev.map((c) => (c.id === targetId ? res.conversation : c))
      );
    } catch (err) {
      const info = extractErrorInfo(err) || {
        category: 'service_unavailable',
        message: { ar: getFriendlyErrorMessage(err, 'ar'), en: getFriendlyErrorMessage(err, 'en') },
        retryable: true,
      };
      setChatError(info);
      toast.error(getFriendlyErrorMessage(err, lang));
    } finally {
      sendingRef.current = false;
      setSending(false);
    }
  };

  return (
    <AppLayout>
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{t.chat.title}</h1>
          <p className="text-sm text-slate-500 mt-0.5">{t.chat.subtitle}</p>
        </div>

        <OfflineAiAlert />

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 h-[calc(100vh-14rem)] min-h-[500px]">
          {/* Conversations sidebar */}
          <div className="card p-3 flex flex-col overflow-hidden">
            <button
              type="button"
              disabled={isDisconnected || sending}
              onClick={handleNewChat}
              className="btn-primary w-full inline-flex items-center justify-center gap-2 text-sm mb-3 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus className="w-4 h-4" />
              <span>{t.chat.newChat}</span>
            </button>

            <div className="flex-1 overflow-y-auto space-y-1">
              {loadingList ? (
                <p className="text-xs text-slate-400 p-2">{t.common.loading}</p>
              ) : conversations.length === 0 ? (
                <p className="text-xs text-slate-400 p-2 text-center">
                  {t.chat.emptyConversations}
                </p>
              ) : (
                conversations.map((conv) => (
                  <div
                    key={conv.id}
                    onClick={() => setActiveId(conv.id)}
                    className={`group flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg cursor-pointer text-sm ${
                      activeId === conv.id
                        ? 'bg-primary-50 text-primary-800 font-medium border border-primary-200'
                        : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <MessageSquare className="w-4 h-4 shrink-0 text-primary-600" />
                      <span className="truncate">{conv.title}</span>
                    </div>
                    <button
                      type="button"
                      disabled={isDisconnected}
                      onClick={(e) => handleDeleteConv(e, conv.id)}
                      className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-rose-600 p-0.5 disabled:opacity-20"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Chat main panel */}
          <div className="lg:col-span-3 h-full min-h-[420px]">
            <ChatInterface
              messages={messages}
              sending={sending}
              sendingElapsed={sendingElapsed}
              disabled={!isBackendReachable && backendStatus === 'disconnected' || !isBrowserOnline}
              error={chatError}
              onSendMessage={handleSendMessage}
              onRetryLast={() => lastPrompt && handleSendMessage(lastPrompt)}
              suggestions={[t.chat.suggestion1, t.chat.suggestion2, t.chat.suggestion3]}
            />
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
