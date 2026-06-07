import React, { useState, useEffect, useCallback } from 'react';
import { ScheduledDispatch, PostDraft, BuildLog, Platform, PLATFORMS, DispatchStatus } from '../types';
import { api, PLATFORM_LABELS, formatDraftForCopy, copyToClipboard } from '../lib/api';
import {
  Calendar, Plus, Loader2, AlertCircle, Check, Trash2, RefreshCw,
  Radio, Copy, Clock,
} from 'lucide-react';

export function DispatchCalendarView() {
  const [dispatches, setDispatches] = useState<ScheduledDispatch[]>([]);
  const [drafts, setDrafts] = useState<PostDraft[]>([]);
  const [logs, setLogs] = useState<BuildLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<DispatchStatus | 'all'>('all');

  const [form, setForm] = useState({
    title: '', platform: 'twitter' as Platform, scheduledAt: '', postDraftId: '', buildLogId: '', notes: '',
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [d, dr, l] = await Promise.all([
        api.listDispatches(filter === 'all' ? undefined : { status: filter }),
        api.listDrafts(),
        api.listBuildLogs(),
      ]);
      setDispatches(d);
      setDrafts(dr);
      setLogs(l);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load calendar.');
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.scheduledAt) return;
    try {
      const draft = form.postDraftId ? drafts.find(d => d.id === form.postDraftId) : null;
      await api.createDispatch({
        title: form.title.trim(),
        platform: form.platform,
        scheduledAt: new Date(form.scheduledAt).toISOString(),
        postDraftId: form.postDraftId || undefined,
        buildLogId: form.buildLogId || draft?.buildLogId,
        contentPreview: draft ? draft.hook : undefined,
        status: 'scheduled',
        notes: form.notes.trim() || undefined,
      });
      setForm({ title: '', platform: 'twitter', scheduledAt: '', postDraftId: '', buildLogId: '', notes: '' });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Schedule failed.');
    }
  };

  const markPosted = async (id: string) => {
    try {
      await api.updateDispatch(id, { status: 'posted' });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Update failed.');
    }
  };

  const markSkipped = async (id: string) => {
    try {
      await api.updateDispatch(id, { status: 'skipped' });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Update failed.');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Remove this scheduled dispatch?')) return;
    try {
      await api.deleteDispatch(id);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Delete failed.');
    }
  };

  const copyDraftContent = async (dispatch: ScheduledDispatch) => {
    const draft = dispatch.postDraftId ? drafts.find(d => d.id === dispatch.postDraftId) : null;
    if (!draft) { setError('No draft linked to copy.'); return; }
    const ok = await copyToClipboard(formatDraftForCopy(draft));
    if (!ok) setError('Copy failed.');
  };

  const upcoming = dispatches.filter(d => d.status === 'scheduled' && new Date(d.scheduledAt) >= new Date());
  const overdue = dispatches.filter(d => d.status === 'scheduled' && new Date(d.scheduledAt) < new Date());

  if (loading && !dispatches.length) {
    return <div className="flex justify-center py-20 text-slate-400"><Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800/50 pb-5">
        <div>
          <h1 className="text-3xl font-display font-black text-slate-100 flex items-center gap-2.5">
            <Calendar className="w-8 h-8 text-brand-cyan" /> Dispatch Calendar
          </h1>
          <p className="text-slate-400 text-xs mt-1">Schedule when to post. Copy drafts manually — no fake auto-posting.</p>
        </div>
        <div className="flex items-center gap-2">
          {(['all', 'scheduled', 'posted', 'skipped'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`text-[10px] font-mono uppercase px-2 py-1 rounded-lg border ${filter === f ? 'border-brand-cyan text-brand-cyan' : 'border-slate-850 text-slate-500'}`}>
              {f}
            </button>
          ))}
          <button onClick={load} className="text-slate-400 p-1"><RefreshCw className="w-4 h-4" /></button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 text-red-300 text-xs p-3 rounded-xl">
          <AlertCircle className="w-4 h-4" /> {error}
        </div>
      )}

      {(overdue.length > 0) && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4">
          <p className="text-xs font-mono text-amber-400 font-bold mb-2"><Clock className="w-3.5 h-3.5 inline mr-1" />{overdue.length} overdue — post or skip</p>
          <div className="space-y-1">{overdue.slice(0, 3).map(d => (
            <div key={d.id} className="flex items-center justify-between text-xs font-mono text-slate-400">
              <span>{d.title} — {PLATFORM_LABELS[d.platform]}</span>
              <div className="flex gap-1">
                <button onClick={() => markPosted(d.id)} className="text-emerald-400 px-2 py-0.5 border border-emerald-500/30 rounded">Posted</button>
                <button onClick={() => markSkipped(d.id)} className="text-slate-500 px-2 py-0.5 border border-slate-700 rounded">Skip</button>
              </div>
            </div>
          ))}</div>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        <div className="xl:col-span-4 tactical-panel rounded-2xl p-5 space-y-3">
          <h3 className="text-sm font-bold text-slate-100">Schedule Dispatch</h3>
          <form onSubmit={handleCreate} className="space-y-2">
            <input required value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="Dispatch title"
              className="w-full bg-slate-950 border border-slate-850 rounded-lg px-3 py-2 text-xs font-mono text-slate-200" />
            <select value={form.platform} onChange={e => setForm(f => ({ ...f, platform: e.target.value as Platform }))}
              className="w-full bg-slate-950 border border-slate-850 rounded-lg px-3 py-2 text-xs font-mono text-slate-200">
              {PLATFORMS.map(p => <option key={p} value={p}>{PLATFORM_LABELS[p]}</option>)}
            </select>
            <input required type="datetime-local" value={form.scheduledAt} onChange={e => setForm(f => ({ ...f, scheduledAt: e.target.value }))}
              className="w-full bg-slate-950 border border-slate-850 rounded-lg px-3 py-2 text-xs font-mono text-slate-200" />
            <select value={form.postDraftId} onChange={e => setForm(f => ({ ...f, postDraftId: e.target.value }))}
              className="w-full bg-slate-950 border border-slate-850 rounded-lg px-3 py-2 text-xs font-mono text-slate-200">
              <option value="">Link post draft (optional)</option>
              {drafts.map(d => (
                <option key={d.id} value={d.id}>{PLATFORM_LABELS[d.platform]} — {d.hook.slice(0, 40)}...</option>
              ))}
            </select>
            <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              placeholder="Notes" rows={2} className="w-full bg-slate-950 border border-slate-850 rounded-lg px-3 py-2 text-xs font-mono text-slate-200 resize-none" />
            <button type="submit" className="w-full bg-brand-cyan text-slate-950 font-bold py-2 rounded-xl text-xs flex items-center justify-center gap-1">
              <Plus className="w-3.5 h-3.5" /> Schedule
            </button>
          </form>
          <p className="text-[10px] text-slate-600 font-mono">Upcoming: {upcoming.length} scheduled</p>
        </div>

        <div className="xl:col-span-8 tactical-panel rounded-2xl p-5 space-y-2">
          <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2"><Radio className="w-4 h-4 text-brand-cyan" /> Dispatch Queue</h3>
          {dispatches.length === 0 ? (
            <p className="text-xs text-slate-500 font-mono py-8 text-center">No dispatches scheduled.</p>
          ) : dispatches.map(d => (
            <div key={d.id} className="p-4 rounded-xl bg-slate-950 border border-slate-850 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[9px] font-mono text-brand-cyan uppercase">{PLATFORM_LABELS[d.platform]}</span>
                  <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${d.status === 'posted' ? 'text-emerald-400 bg-emerald-500/10' : d.status === 'skipped' ? 'text-slate-500 bg-slate-900' : 'text-amber-400 bg-amber-500/10'}`}>{d.status}</span>
                </div>
                <p className="text-xs font-bold font-mono text-slate-200">{d.title}</p>
                <p className="text-[10px] font-mono text-slate-500">{new Date(d.scheduledAt).toLocaleString()}</p>
                {d.contentPreview && <p className="text-[10px] font-mono text-slate-600 truncate mt-0.5">{d.contentPreview}</p>}
              </div>
              <div className="flex flex-wrap gap-1 shrink-0">
                {d.postDraftId && (
                  <button onClick={() => copyDraftContent(d)} className="text-[10px] font-mono px-2 py-1 rounded border border-slate-800 text-slate-400 hover:text-white flex items-center gap-1">
                    <Copy className="w-3 h-3" /> Copy
                  </button>
                )}
                {d.status === 'scheduled' && (
                  <>
                    <button onClick={() => markPosted(d.id)} className="text-[10px] font-mono px-2 py-1 rounded border border-emerald-500/30 text-emerald-400 flex items-center gap-1">
                      <Check className="w-3 h-3" /> Posted
                    </button>
                    <button onClick={() => markSkipped(d.id)} className="text-[10px] font-mono px-2 py-1 rounded border border-slate-700 text-slate-500">Skip</button>
                  </>
                )}
                <button onClick={() => handleDelete(d.id)} className="text-red-400/60 p-1"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
