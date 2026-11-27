import React, { useEffect, useState } from 'react';
import {
  MessageSquare,
  Plus,
  ThumbsUp,
  Trash2,
  Edit3,
  Send,
  Search,
} from 'lucide-react';
import AppLayout from '../../layouts/AppLayout';
import { api } from '../../api/client';
import { useLang } from '../../context/LangContext';
import { useToast } from '../../components/Toast';

export default function ForumPage() {
  const { t, lang } = useLang();
  const toast = useToast();

  const [posts, setPosts] = useState([]);
  const [specialties, setSpecialties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [specFilter, setSpecFilter] = useState('all');

  const [showNew, setShowNew] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({
    title: '',
    presentation: '',
    protocol: '',
    specialty_id: 'cardio',
    tags: '',
  });
  const [commentInputs, setCommentInputs] = useState({});

  const loadData = async () => {
    try {
      const [p, s] = await Promise.all([
        api.listForumPosts({ specialty_id: specFilter, q }),
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
  }, [specFilter]);

  const handleSearch = (e) => {
    e.preventDefault();
    loadData();
  };

  const handleSavePost = async (e) => {
    e.preventDefault();
    const payload = {
      title: form.title,
      presentation: form.presentation,
      protocol: form.protocol,
      specialty_id: form.specialty_id,
      tags: form.tags
        .split(',')
        .map((x) => x.trim())
        .filter(Boolean),
    };
    try {
      if (editingId) {
        const updated = await api.updateForumPost(editingId, payload);
        setPosts((prev) => prev.map((p) => (p.id === editingId ? updated : p)));
      } else {
        const created = await api.createForumPost(payload);
        setPosts((prev) => [created, ...prev]);
      }
      setShowNew(false);
      setEditingId(null);
      setForm({ title: '', presentation: '', protocol: '', specialty_id: 'cardio', tags: '' });
      toast.success(t.common.save);
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.deleteForumPost(id);
      setPosts((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleUpvote = async (id) => {
    try {
      const updated = await api.toggleForumUpvote(id);
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
      const updated = await api.addForumComment(postId, { body });
      setPosts((prev) => prev.map((p) => (p.id === postId ? updated : p)));
      setCommentInputs((prev) => ({ ...prev, [postId]: '' }));
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
              <span>{t.forum.title}</span>
            </h1>
            <p className="text-sm text-slate-500 mt-1">{t.forum.subtitle}</p>
          </div>
          <button
            type="button"
            onClick={() => {
              setEditingId(null);
              setForm({ title: '', presentation: '', protocol: '', specialty_id: 'cardio', tags: '' });
              setShowNew((v) => !v);
            }}
            className="btn-primary inline-flex items-center gap-2 text-sm"
          >
            <Plus className="w-4 h-4" />
            <span>{t.forum.newPostBtn}</span>
          </button>
        </div>

        {/* Search & Filter */}
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
            value={specFilter}
            onChange={(e) => setSpecFilter(e.target.value)}
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

        {/* Create/Edit Form */}
        {showNew && (
          <form onSubmit={handleSavePost} className="card space-y-3 border-primary-300">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                type="text"
                required
                placeholder={t.forum.postTitle}
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="input-field"
              />
              <select
                value={form.specialty_id}
                onChange={(e) => setForm({ ...form, specialty_id: e.target.value })}
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
              placeholder={t.forum.presentation}
              value={form.presentation}
              onChange={(e) => setForm({ ...form, presentation: e.target.value })}
              className="input-field"
            />
            <textarea
              rows={2}
              placeholder={t.forum.protocol}
              value={form.protocol}
              onChange={(e) => setForm({ ...form, protocol: e.target.value })}
              className="input-field"
            />
            <input
              type="text"
              placeholder={t.forum.tags}
              value={form.tags}
              onChange={(e) => setForm({ ...form, tags: e.target.value })}
              className="input-field"
            />
            <div className="flex justify-end gap-2">
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
          </form>
        )}

        {/* Posts List */}
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
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      {post.is_demo && (
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-100 text-amber-800">
                          {t.common.demoBadge}
                        </span>
                      )}
                      {(post.tags || []).map((tag, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 rounded-full text-[11px] bg-slate-100 text-slate-600"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                    <h3 className="text-base font-bold text-slate-900">
                      {lang === 'ar' && post.title_ar ? post.title_ar : post.title}
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {post.author_name} • {new Date(post.created_at).toLocaleString()}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleUpvote(post.id)}
                      className={`px-3 py-1.5 rounded-lg border text-xs font-medium inline-flex items-center gap-1.5 ${
                        post.user_upvoted
                          ? 'bg-primary-50 border-primary-400 text-primary-700'
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <ThumbsUp className="w-3.5 h-3.5" />
                      <span>
                        {t.forum.upvote} ({post.upvotes_count})
                      </span>
                    </button>

                    {post.is_owner && (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingId(post.id);
                            setForm({
                              title: post.title,
                              presentation: post.presentation,
                              protocol: post.protocol || '',
                              specialty_id: post.specialty_id,
                              tags: (post.tags || []).join(', '),
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
                  {lang === 'ar' && post.presentation_ar
                    ? post.presentation_ar
                    : post.presentation}
                </p>
                {(post.protocol || post.protocol_ar) && (
                  <p className="text-xs italic text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                    {lang === 'ar' && post.protocol_ar ? post.protocol_ar : post.protocol}
                  </p>
                )}

                {/* Comments */}
                <div className="pt-3 border-t border-slate-100 space-y-2">
                  {(post.comments || []).map((c) => (
                    <div
                      key={c.id}
                      className="p-2.5 rounded-lg bg-slate-50 border border-slate-200/80 text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-slate-800">{c.author_name}</span>
                        {c.is_best_approach && (
                          <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-semibold">
                            {t.forum.bestApproach}
                          </span>
                        )}
                      </div>
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
                      placeholder={t.forum.addComment}
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
