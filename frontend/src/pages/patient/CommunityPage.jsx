import React, { useEffect, useState } from 'react';
import {
  MessageSquare,
  Plus,
  Heart,
  Trash2,
  Edit3,
  Send,
  Flag,
  Search,
  ShieldCheck,
} from 'lucide-react';
import AppLayout from '../../layouts/AppLayout';
import { api } from '../../api/client';
import { useLang } from '../../context/LangContext';
import { useToast } from '../../components/Toast';

export default function CommunityPage() {
  const { t, lang } = useLang();
  const toast = useToast();

  const [posts, setPosts] = useState([]);
  const [specialties, setSpecialties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [channelFilter, setChannelFilter] = useState('all');

  const [showNew, setShowNew] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({
    title: '',
    body: '',
    channel_id: 'gp',
    post_type: 'discussion',
  });
  const [commentInputs, setCommentInputs] = useState({});

  const loadData = async () => {
    try {
      const [p, s] = await Promise.all([
        api.listCommunityPosts({ channel_id: channelFilter, q }),
        api.listSpecialties(),
      ]);
      setPosts(p);
      setSpecialties(s);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [channelFilter]);

  const handleSearch = (e) => {
    e.preventDefault();
    loadData();
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        const updated = await api.updateCommunityPost(editingId, form);
        setPosts((prev) => prev.map((p) => (p.id === editingId ? updated : p)));
      } else {
        const created = await api.createCommunityPost(form);
        setPosts((prev) => [created, ...prev]);
      }
      setShowNew(false);
      setEditingId(null);
      setForm({ title: '', body: '', channel_id: 'gp', post_type: 'discussion' });
      toast.success(t.common.save);
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.deleteCommunityPost(id);
      setPosts((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleLike = async (id) => {
    try {
      const updated = await api.toggleCommunityLike(id);
      setPosts((prev) => prev.map((p) => (p.id === id ? updated : p)));
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleComment = async (e, postId) => {
    e.preventDefault();
    const body = (commentInputs[postId] || '').trim();
    if (!body) return;
    try {
      const updated = await api.addCommunityComment(postId, { body });
      setPosts((prev) => prev.map((p) => (p.id === postId ? updated : p)));
      setCommentInputs((prev) => ({ ...prev, [postId]: '' }));
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleReport = async (postId) => {
    const reason = window.prompt(t.community.reportPrompt);
    if (!reason || !reason.trim()) return;
    try {
      const res = await api.reportCommunityPost(postId, reason.trim());
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId ? { ...p, report_count: res.report_count } : p
        )
      );
      toast.info(t.community.reportedSuccess);
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <MessageSquare className="w-7 h-7 text-primary-600" />
              <span>{t.community.title}</span>
            </h1>
            <p className="text-sm text-slate-500 mt-1">{t.community.subtitle}</p>
          </div>
          <button
            type="button"
            onClick={() => {
              setEditingId(null);
              setForm({ title: '', body: '', channel_id: 'gp', post_type: 'discussion' });
              setShowNew((v) => !v);
            }}
            className="btn-primary inline-flex items-center gap-2 text-sm"
          >
            <Plus className="w-4 h-4" />
            <span>{t.community.newPostBtn}</span>
          </button>
        </div>

        <div className="flex items-center gap-2 p-3 rounded-xl bg-teal-50 border border-teal-200 text-teal-900 text-xs">
          <ShieldCheck className="w-4 h-4 text-teal-700 shrink-0" />
          <span>{t.community.subtitle}</span>
        </div>

        <form onSubmit={handleSearch} className="card flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-slate-400 absolute top-1/2 -translate-y-1/2 start-3" />
            <input
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={t.common.search}
              className="input-field ps-9"
            />
          </div>
          <select
            value={channelFilter}
            onChange={(e) => setChannelFilter(e.target.value)}
            className="input-field w-full sm:w-56"
          >
            <option value="all">{t.references.allSpecialties}</option>
            {specialties.map((s) => (
              <option key={s.id} value={s.id}>
                {lang === 'ar' ? s.name_ar : s.name_en}
              </option>
            ))}
          </select>
          <button type="submit" className="btn-secondary text-sm">
            {t.common.search}
          </button>
        </form>

        {showNew && (
          <form onSubmit={handleSave} className="card space-y-3 border-primary-300">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <input
                type="text"
                required
                placeholder={t.community.postTitle}
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="input-field sm:col-span-2"
              />
              <select
                value={form.channel_id}
                onChange={(e) => setForm({ ...form, channel_id: e.target.value })}
                className="input-field"
              >
                {specialties.map((s) => (
                  <option key={s.id} value={s.id}>
                    {lang === 'ar' ? s.name_ar : s.name_en}
                  </option>
                ))}
              </select>
            </div>
            <textarea
              required
              rows={3}
              placeholder={t.community.postBody}
              value={form.body}
              onChange={(e) => setForm({ ...form, body: e.target.value })}
              className="input-field"
            />
            <div className="flex justify-between items-center flex-wrap gap-2">
              <select
                value={form.post_type}
                onChange={(e) => setForm({ ...form, post_type: e.target.value })}
                className="input-field w-48 text-sm"
              >
                {Object.entries(t.community.types).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowNew(false)}
                  className="btn-secondary text-sm"
                >
                  {t.common.cancel}
                </button>
                <button type="submit" className="btn-primary text-sm">
                  {t.common.save}
                </button>
              </div>
            </div>
          </form>
        )}

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="spinner" />
          </div>
        ) : posts.length === 0 ? (
          <div className="card text-center py-12 text-slate-500 text-sm">
            {t.common.noData}
          </div>
        ) : (
          <div className="space-y-4">
            {posts.map((post) => (
              <div key={post.id} className="card space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-sky-50 text-sky-700 border border-sky-200">
                        {post.post_type}
                      </span>
                      {post.is_demo && (
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-100 text-amber-800">
                          {t.common.demoBadge}
                        </span>
                      )}
                    </div>
                    <h3 className="text-base font-bold text-slate-900">
                      {lang === 'ar' && post.title_ar ? post.title_ar : post.title}
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {post.author_name} ({post.author_role}) •{' '}
                      {new Date(post.created_at).toLocaleString()}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleLike(post.id)}
                      className={`px-3 py-1.5 rounded-lg border text-xs font-medium inline-flex items-center gap-1.5 ${
                        post.user_liked
                          ? 'bg-rose-50 border-rose-300 text-rose-700'
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <Heart
                        className={`w-3.5 h-3.5 ${post.user_liked ? 'fill-rose-600 text-rose-600' : ''}`}
                      />
                      <span>
                        {t.community.like} ({post.likes_count})
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleReport(post.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50"
                      title={t.community.report}
                    >
                      <Flag className="w-4 h-4" />
                    </button>

                    {post.is_owner && (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingId(post.id);
                            setForm({
                              title: post.title,
                              body: post.body,
                              channel_id: post.channel_id,
                              post_type: post.post_type,
                            });
                            setShowNew(true);
                          }}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-primary-600 hover:bg-slate-100"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(post.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                <p className="text-sm text-slate-700 leading-relaxed">
                  {lang === 'ar' && post.body_ar ? post.body_ar : post.body}
                </p>

                <div className="pt-3 border-t border-slate-100 space-y-2">
                  {(post.comments || []).map((c) => (
                    <div
                      key={c.id}
                      className="p-2.5 rounded-lg bg-slate-50 border border-slate-200/80 text-xs space-y-1"
                    >
                      <span className="font-semibold text-slate-800">
                        {c.author_name} ({c.author_role})
                      </span>
                      <p className="text-slate-700">
                        {lang === 'ar' && c.body_ar ? c.body_ar : c.body}
                      </p>
                    </div>
                  ))}

                  <form
                    onSubmit={(e) => handleComment(e, post.id)}
                    className="flex gap-2 pt-1"
                  >
                    <input
                      type="text"
                      placeholder={t.community.addComment}
                      value={commentInputs[post.id] || ''}
                      onChange={(e) =>
                        setCommentInputs((prev) => ({
                          ...prev,
                          [post.id]: e.target.value,
                        }))
                      }
                      className="input-field text-xs py-1.5 flex-1"
                    />
                    <button
                      type="submit"
                      className="btn-primary text-xs py-1.5 px-3 inline-flex items-center gap-1"
                    >
                      <Send className="w-3.5 h-3.5" />
                    </button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
