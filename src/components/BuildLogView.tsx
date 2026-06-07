import React, { useState, useEffect, useCallback } from 'react';
import {
  BuildLog, BuildLogType, BuildLogStatus, ProofArtifact, AppSettings, LaunchCampaign,
  BUILD_LOG_TYPES, BUILD_LOG_STATUSES,
} from '../types';
import { api } from '../lib/api';
import {
  Terminal, Plus, Trash2, ChevronRight, Loader2, AlertCircle,
  Check, Link2, RefreshCw,
} from 'lucide-react';

interface BuildLogViewProps {
  onOpenPostFactory: (buildLogId: string) => void;
  onOpenProofVault: () => void;
}

const TYPE_LABELS: Record<BuildLogType, string> = {
  build: 'Build', fix: 'Fix', lesson: 'Lesson', bug: 'Bug',
  launch: 'Launch', thought: 'Thought', offer: 'Offer', proof: 'Proof', cash: 'Cash',
};

export function BuildLogView({ onOpenPostFactory, onOpenProofVault }: BuildLogViewProps) {
  const [logs, setLogs] = useState<BuildLog[]>([]);
  const [proof, setProof] = useState<ProofArtifact[]>([]);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [searchQ, setSearchQ] = useState('');
  const [launches, setLaunches] = useState<LaunchCampaign[]>([]);

  const emptyForm = {
    date: new Date().toISOString().slice(0, 10),
    title: '', project: 'General Build Log', type: 'build' as BuildLogType,
    whatHappened: '', whyItMatters: '', painPoint: '', offerCta: '',
    proofAttachmentIds: [] as string[], status: 'captured' as BuildLogStatus,
    launchCampaignId: '' as string,
  };
  const [form, setForm] = useState(emptyForm);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [l, p, s, launchesList] = await Promise.all([
        api.listBuildLogs(searchQ ? { q: searchQ } : undefined),
        api.listProof(),
        api.getSettings(),
        api.listLaunches(),
      ]);
      setLogs(l);
      setProof(p);
      setSettings(s);
      setLaunches(launchesList.filter(c => c.status !== 'complete'));
      if (s.defaultCta && !form.offerCta) setForm(f => ({ ...f, offerCta: s.defaultCta, project: s.projects[0] || 'General Build Log' }));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load build logs.');
    } finally {
      setLoading(false);
    }
  }, [searchQ]);

  useEffect(() => { load(); }, [load]);

  const selectLog = (log: BuildLog) => {
    setSelectedId(log.id);
    setForm({
      date: log.date, title: log.title, project: log.project, type: log.type,
      whatHappened: log.whatHappened, whyItMatters: log.whyItMatters,
      painPoint: log.painPoint, offerCta: log.offerCta,
      proofAttachmentIds: log.proofAttachmentIds, status: log.status,
      launchCampaignId: log.launchCampaignId || '',
    });
  };

  const resetForm = () => {
    setSelectedId(null);
    setForm({ ...emptyForm, offerCta: settings?.defaultCta || '', project: settings?.projects[0] || 'General Build Log' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.whatHappened.trim()) {
      setError('Title and what happened are required.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const payload = {
        ...form,
        launchCampaignId: form.launchCampaignId || undefined,
      };
      if (selectedId) {
        await api.updateBuildLog(selectedId, payload);
      } else {
        await api.createBuildLog(payload);
      }
      resetForm();
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this build log and its linked drafts?')) return;
    try {
      await api.deleteBuildLog(id);
      if (selectedId === id) resetForm();
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Delete failed.');
    }
  };

  const toggleProof = (proofId: string) => {
    setForm(f => ({
      ...f,
      proofAttachmentIds: f.proofAttachmentIds.includes(proofId)
        ? f.proofAttachmentIds.filter(id => id !== proofId)
        : [...f.proofAttachmentIds, proofId],
    }));
  };

  if (loading && !logs.length) {
    return (
      <div className="flex items-center justify-center py-20 text-slate-400">
        <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading build logs...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800/50 pb-5">
        <div>
          <h1 className="text-3xl font-display font-black text-slate-100 tracking-tight flex items-center gap-2.5">
            <Terminal className="w-8 h-8 text-brand-amber" />
            Build Log
          </h1>
          <p className="text-slate-400 text-xs mt-1 max-w-xl">
            Capture what you build every day. This is the source of truth for proof, posts, and money.
          </p>
        </div>
        <button onClick={load} className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 font-mono">
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      <div className="flex gap-2">
        <input value={searchQ} onChange={e => setSearchQ(e.target.value)} placeholder="Search build logs..."
          className="flex-1 max-w-md bg-slate-950 border border-slate-850 rounded-xl px-4 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-brand-amber/50" />
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 text-red-300 text-xs p-3 rounded-xl">
          <AlertCircle className="w-4 h-4 shrink-0" /> {error}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* Form */}
        <div className="xl:col-span-7 tactical-panel rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-slate-100 font-display font-bold text-sm">
              {selectedId ? 'Edit Entry' : 'New Build Log Entry'}
            </h3>
            {selectedId && (
              <button onClick={resetForm} className="text-xs text-slate-400 hover:text-slate-200 font-mono">+ New instead</button>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className="text-[10px] text-slate-500 uppercase font-mono font-bold block mb-1">Date</label>
                <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                  className="w-full bg-slate-950 border border-slate-850 rounded-lg px-3 py-2 text-slate-200 text-xs font-mono focus:outline-none focus:border-brand-amber/50" />
              </div>
              <div>
                <label className="text-[10px] text-slate-500 uppercase font-mono font-bold block mb-1">Type</label>
                <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value as BuildLogType }))}
                  className="w-full bg-slate-950 border border-slate-850 rounded-lg px-3 py-2 text-slate-200 text-xs font-mono focus:outline-none">
                  {BUILD_LOG_TYPES.map(t => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] text-slate-500 uppercase font-mono font-bold block mb-1">Project</label>
                <select value={form.project} onChange={e => setForm(f => ({ ...f, project: e.target.value }))}
                  className="w-full bg-slate-950 border border-slate-850 rounded-lg px-3 py-2 text-slate-200 text-xs font-mono focus:outline-none">
                  {(settings?.projects || ['General Build Log']).map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] text-slate-500 uppercase font-mono font-bold block mb-1">Status</label>
                <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as BuildLogStatus }))}
                  className="w-full bg-slate-950 border border-slate-850 rounded-lg px-3 py-2 text-slate-200 text-xs font-mono focus:outline-none">
                  {BUILD_LOG_STATUSES.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className="text-[10px] text-slate-500 uppercase font-mono font-bold block mb-1">Title</label>
              <input required value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder="Shipped SovPay webhook retry logic"
                className="w-full bg-slate-950 border border-slate-850 rounded-lg px-3 py-2.5 text-slate-200 text-sm font-mono focus:outline-none focus:border-brand-amber/50" />
            </div>

            <div>
              <label className="text-[10px] text-slate-500 uppercase font-mono font-bold block mb-1">What happened</label>
              <textarea required rows={3} value={form.whatHappened} onChange={e => setForm(f => ({ ...f, whatHappened: e.target.value }))}
                placeholder="Describe the build, fix, or outcome with specifics..."
                className="w-full bg-slate-950 border border-slate-850 rounded-lg px-3 py-2.5 text-slate-200 text-xs font-mono focus:outline-none focus:border-brand-amber/50 resize-none" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] text-slate-500 uppercase font-mono font-bold block mb-1">Why it matters</label>
                <textarea rows={2} value={form.whyItMatters} onChange={e => setForm(f => ({ ...f, whyItMatters: e.target.value }))}
                  className="w-full bg-slate-950 border border-slate-850 rounded-lg px-3 py-2 text-slate-200 text-xs font-mono focus:outline-none resize-none" />
              </div>
              <div>
                <label className="text-[10px] text-slate-500 uppercase font-mono font-bold block mb-1">Pain point it connects to</label>
                <textarea rows={2} value={form.painPoint} onChange={e => setForm(f => ({ ...f, painPoint: e.target.value }))}
                  className="w-full bg-slate-950 border border-slate-850 rounded-lg px-3 py-2 text-slate-200 text-xs font-mono focus:outline-none resize-none" />
              </div>
            </div>

            <div>
              <label className="text-[10px] text-slate-500 uppercase font-mono font-bold block mb-1">Launch campaign (optional)</label>
              <select value={form.launchCampaignId} onChange={e => setForm(f => ({ ...f, launchCampaignId: e.target.value }))}
                className="w-full bg-slate-950 border border-slate-850 rounded-lg px-3 py-2 text-xs font-mono text-slate-200">
                <option value="">None</option>
                {launches.map(c => <option key={c.id} value={c.id}>{c.name} — {c.project}</option>)}
              </select>
            </div>

            <div>
              <label className="text-[10px] text-slate-500 uppercase font-mono font-bold block mb-1">Offer / CTA</label>
              <input value={form.offerCta} onChange={e => setForm(f => ({ ...f, offerCta: e.target.value }))}
                className="w-full bg-slate-950 border border-slate-850 rounded-lg px-3 py-2 text-slate-200 text-xs font-mono focus:outline-none" />
            </div>

            {/* Proof attachments */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-[10px] text-slate-500 uppercase font-mono font-bold">Proof attachments</label>
                <button type="button" onClick={onOpenProofVault} className="text-[10px] text-brand-cyan font-mono hover:underline flex items-center gap-1">
                  <Link2 className="w-3 h-3" /> Add in Proof Vault
                </button>
              </div>
              {proof.length === 0 ? (
                <p className="text-xs text-slate-500 font-mono">No proof artifacts yet. Add screenshots, URLs, or notes in Proof Vault.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {proof.map(p => {
                    const attached = form.proofAttachmentIds.includes(p.id);
                    return (
                      <button key={p.id} type="button" onClick={() => toggleProof(p.id)}
                        className={`text-[10px] font-mono px-2.5 py-1 rounded-lg border transition ${attached ? 'bg-brand-amber/15 border-brand-amber text-brand-amber' : 'bg-slate-950 border-slate-850 text-slate-400 hover:border-slate-700'}`}>
                        {attached && <Check className="w-3 h-3 inline mr-1" />}{p.title}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="flex gap-2 pt-2">
              <button type="submit" disabled={saving}
                className="bg-brand-amber hover:bg-brand-amber/90 disabled:opacity-50 text-slate-950 font-bold py-2.5 px-5 rounded-xl text-xs flex items-center gap-1.5">
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                {selectedId ? 'Update Entry' : 'Capture Build Log'}
              </button>
              {selectedId && (
                <>
                  <button type="button" onClick={() => onOpenPostFactory(selectedId)}
                    className="bg-slate-900 border border-slate-800 hover:border-brand-cyan/50 text-slate-200 font-bold py-2.5 px-5 rounded-xl text-xs flex items-center gap-1.5">
                    Post Factory <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                  <button type="button" onClick={() => handleDelete(selectedId)}
                    className="text-red-400 hover:text-red-300 p-2.5 rounded-xl border border-red-500/20">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </>
              )}
            </div>
          </form>
        </div>

        {/* List */}
        <div className="xl:col-span-5 tactical-panel rounded-2xl p-6 space-y-3">
          <h3 className="text-slate-100 font-display font-bold text-sm">Recent Entries ({logs.length})</h3>
          {logs.length === 0 ? (
            <p className="text-xs text-slate-500 font-mono py-8 text-center">No build logs yet. Capture your first entry.</p>
          ) : (
            <div className="space-y-2 max-h-[600px] overflow-y-auto custom-scrollbar pr-1">
              {logs.map(log => (
                <button key={log.id} onClick={() => selectLog(log)}
                  className={`w-full text-left p-3 rounded-xl border transition ${selectedId === log.id ? 'bg-slate-900 border-brand-amber/40' : 'bg-slate-950 border-slate-850 hover:border-slate-700'}`}>
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-[9px] font-mono text-brand-cyan uppercase">{log.project}</span>
                    <span className="text-[9px] font-mono text-slate-500">{log.date}</span>
                  </div>
                  <p className="text-slate-200 text-xs font-bold font-mono line-clamp-1">{log.title}</p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="text-[9px] font-mono bg-slate-900 px-1.5 py-0.5 rounded text-slate-400">{TYPE_LABELS[log.type]}</span>
                    <span className="text-[9px] font-mono text-slate-500">{log.status.replace(/_/g, ' ')}</span>
                    {log.proofAttachmentIds.length > 0 && (
                      <span className="text-[9px] font-mono text-brand-amber">{log.proofAttachmentIds.length} proof</span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
