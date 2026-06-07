import React, { useState, useEffect, useCallback } from 'react';
import { LaunchCampaign, LaunchStatus, BuildLog, AppSettings } from '../types';
import { api, LaunchBrief } from '../lib/api';
import {
  Rocket, Plus, Loader2, AlertCircle, Check, Trash2, RefreshCw,
  Sparkles, Calendar, ChevronRight, Target,
} from 'lucide-react';

interface LaunchPadViewProps {
  onOpenPostFactory: (buildLogId?: string) => void;
  onOpenBuildLog: () => void;
}

const STATUS_COLORS: Record<LaunchStatus, string> = {
  planning: 'text-slate-400 bg-slate-900',
  building: 'text-brand-cyan bg-brand-cyan/10',
  launching: 'text-brand-amber bg-brand-amber/10',
  live: 'text-emerald-400 bg-emerald-500/10',
  complete: 'text-slate-500 bg-slate-900',
};

export function LaunchPadView({ onOpenPostFactory, onOpenBuildLog }: LaunchPadViewProps) {
  const [launches, setLaunches] = useState<LaunchCampaign[]>([]);
  const [selected, setSelected] = useState<LaunchCampaign | null>(null);
  const [linkedLogs, setLinkedLogs] = useState<BuildLog[]>([]);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [brief, setBrief] = useState<LaunchBrief | null>(null);
  const [generatingBrief, setGeneratingBrief] = useState(false);

  const [form, setForm] = useState({
    name: '', project: 'General Build Log', description: '', targetDate: '', offerUrl: '', offerPrice: '', offerCta: '',
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [l, s] = await Promise.all([api.listLaunches(), api.getSettings()]);
      setLaunches(l);
      setSettings(s);
      setForm(f => ({ ...f, project: s.projects[0] || 'General Build Log', offerCta: s.defaultCta }));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load launches.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const selectLaunch = async (campaign: LaunchCampaign) => {
    setSelected(campaign);
    setBrief(null);
    try {
      const logs = await api.listBuildLogs({ launchCampaignId: campaign.id });
      setLinkedLogs(logs);
    } catch {
      setLinkedLogs([]);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    try {
      const created = await api.createLaunch({
        name: form.name.trim(),
        project: form.project,
        description: form.description.trim(),
        targetDate: form.targetDate || undefined,
        offerUrl: form.offerUrl.trim() || undefined,
        offerPrice: form.offerPrice ? parseFloat(form.offerPrice) : undefined,
        offerCta: form.offerCta.trim() || undefined,
      });
      setForm({ name: '', project: settings?.projects[0] || 'General Build Log', description: '', targetDate: '', offerUrl: '', offerPrice: '', offerCta: settings?.defaultCta || '' });
      await load();
      selectLaunch(created);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Create failed.');
    }
  };

  const toggleItem = async (itemId: string, done: boolean) => {
    if (!selected) return;
    try {
      const updated = await api.toggleChecklist(selected.id, itemId, done);
      setSelected(updated);
      setLaunches(prev => prev.map(l => l.id === updated.id ? updated : l));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Update failed.');
    }
  };

  const updateStatus = async (status: LaunchStatus) => {
    if (!selected) return;
    try {
      const updated = await api.updateLaunch(selected.id, { status });
      setSelected(updated);
      setLaunches(prev => prev.map(l => l.id === updated.id ? updated : l));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Status update failed.');
    }
  };

  const handleBrief = async () => {
    if (!selected) return;
    setGeneratingBrief(true);
    try {
      const result = await api.generateLaunchBrief(selected.id);
      setBrief(result.brief);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Brief generation failed.');
    } finally {
      setGeneratingBrief(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this launch campaign?')) return;
    try {
      await api.deleteLaunch(id);
      if (selected?.id === id) setSelected(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Delete failed.');
    }
  };

  const checklistProgress = selected
    ? Math.round((selected.checklist.filter(c => c.done).length / selected.checklist.length) * 100)
    : 0;

  if (loading && !launches.length) {
    return <div className="flex justify-center py-20 text-slate-400"><Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800/50 pb-5">
        <div>
          <h1 className="text-3xl font-display font-black text-slate-100 flex items-center gap-2.5">
            <Rocket className="w-8 h-8 text-brand-amber" /> Launch Pad
          </h1>
          <p className="text-slate-400 text-xs mt-1 max-w-xl">Plan product launches, track checklists, and drive awareness from proof to offer.</p>
        </div>
        <button onClick={load} className="text-xs text-slate-400 hover:text-slate-200 font-mono flex items-center gap-1"><RefreshCw className="w-3.5 h-3.5" /> Refresh</button>
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 text-red-300 text-xs p-3 rounded-xl">
          <AlertCircle className="w-4 h-4" /> {error}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        <div className="xl:col-span-4 space-y-4">
          <div className="tactical-panel rounded-2xl p-5 space-y-3">
            <h3 className="text-sm font-bold text-slate-100">New Launch</h3>
            <form onSubmit={handleCreate} className="space-y-2">
              <input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Launch name e.g. SovPay Beta"
                className="w-full bg-slate-950 border border-slate-850 rounded-lg px-3 py-2 text-xs font-mono text-slate-200" />
              <select value={form.project} onChange={e => setForm(f => ({ ...f, project: e.target.value }))}
                className="w-full bg-slate-950 border border-slate-850 rounded-lg px-3 py-2 text-xs font-mono text-slate-200">
                {(settings?.projects || []).map(p => <option key={p} value={p}>{p}</option>)}
              </select>
              <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="What are you launching and for whom?"
                rows={2} className="w-full bg-slate-950 border border-slate-850 rounded-lg px-3 py-2 text-xs font-mono text-slate-200 resize-none" />
              <input type="date" value={form.targetDate} onChange={e => setForm(f => ({ ...f, targetDate: e.target.value }))}
                className="w-full bg-slate-950 border border-slate-850 rounded-lg px-3 py-2 text-xs font-mono text-slate-200" />
              <input value={form.offerUrl} onChange={e => setForm(f => ({ ...f, offerUrl: e.target.value }))}
                placeholder="Offer URL (optional)"
                className="w-full bg-slate-950 border border-slate-850 rounded-lg px-3 py-2 text-xs font-mono text-slate-200" />
              <button type="submit" className="w-full bg-brand-amber text-slate-950 font-bold py-2 rounded-xl text-xs flex items-center justify-center gap-1">
                <Plus className="w-3.5 h-3.5" /> Create Launch
              </button>
            </form>
          </div>

          <div className="tactical-panel rounded-2xl p-5 space-y-2">
            <h3 className="text-sm font-bold text-slate-100">Active Launches ({launches.filter(l => l.status !== 'complete').length})</h3>
            {launches.length === 0 ? (
              <p className="text-xs text-slate-500 font-mono py-4 text-center">No launches yet.</p>
            ) : launches.map(l => (
              <button key={l.id} onClick={() => selectLaunch(l)}
                className={`w-full text-left p-3 rounded-xl border transition ${selected?.id === l.id ? 'border-brand-amber/40 bg-slate-900' : 'border-slate-850 bg-slate-950 hover:border-slate-700'}`}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[9px] font-mono text-brand-cyan">{l.project}</span>
                  <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${STATUS_COLORS[l.status]}`}>{l.status}</span>
                </div>
                <p className="text-xs font-bold font-mono text-slate-200">{l.name}</p>
                {l.targetDate && <p className="text-[10px] text-slate-600 font-mono mt-0.5"><Calendar className="w-3 h-3 inline mr-1" />{l.targetDate}</p>}
              </button>
            ))}
          </div>
        </div>

        <div className="xl:col-span-8 space-y-4">
          {!selected ? (
            <div className="tactical-panel rounded-2xl p-12 text-center text-slate-500 text-xs font-mono">
              Select or create a launch to manage checklist, brief, and linked build logs.
            </div>
          ) : (
            <>
              <div className="tactical-panel rounded-2xl p-6 space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-display font-black text-slate-100">{selected.name}</h2>
                    <p className="text-xs text-slate-500 font-mono mt-1">{selected.description || 'No description'}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {(['planning', 'building', 'launching', 'live', 'complete'] as LaunchStatus[]).map(s => (
                      <button key={s} onClick={() => updateStatus(s)}
                        className={`text-[9px] font-mono uppercase px-2 py-1 rounded-lg border ${selected.status === s ? 'border-brand-amber text-brand-amber' : 'border-slate-850 text-slate-500'}`}>
                        {s}
                      </button>
                    ))}
                    <button onClick={() => handleDelete(selected.id)} className="text-red-400 p-1"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-[10px] font-mono text-slate-500 mb-1">
                    <span>Launch checklist</span><span>{checklistProgress}%</span>
                  </div>
                  <div className="h-1.5 bg-slate-950 rounded-full overflow-hidden mb-3">
                    <div className="h-full bg-brand-amber transition-all" style={{ width: `${checklistProgress}%` }} />
                  </div>
                  <div className="space-y-1.5">
                    {selected.checklist.map(item => (
                      <label key={item.id} className="flex items-center gap-2 p-2 rounded-lg bg-slate-950 border border-slate-850 cursor-pointer hover:border-slate-700">
                        <input type="checkbox" checked={item.done} onChange={e => toggleItem(item.id, e.target.checked)}
                          className="accent-brand-amber" />
                        <span className={`text-xs font-mono flex-1 ${item.done ? 'text-slate-500 line-through' : 'text-slate-300'}`}>{item.label}</span>
                        <span className="text-[9px] font-mono text-slate-600 uppercase">{item.category}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 pt-2">
                  <button onClick={handleBrief} disabled={generatingBrief}
                    className="bg-slate-900 border border-slate-800 text-slate-200 text-xs font-bold px-4 py-2 rounded-xl flex items-center gap-1.5">
                    {generatingBrief ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5 text-brand-amber" />}
                    AI Launch Brief
                  </button>
                  <button onClick={onOpenBuildLog} className="text-xs font-bold text-brand-cyan px-4 py-2 rounded-xl border border-brand-cyan/30">+ Build Log</button>
                  <button onClick={() => onOpenPostFactory()} className="text-xs font-bold text-brand-amber px-4 py-2 rounded-xl border border-brand-amber/30 flex items-center gap-1">
                    Post Factory <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {brief && (
                <div className="tactical-panel rounded-2xl p-6 space-y-3">
                  <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2"><Target className="w-4 h-4 text-brand-amber" /> Launch Brief</h3>
                  <p className="text-sm font-bold text-slate-200">{brief.headline}</p>
                  <p className="text-xs font-mono text-slate-400">{brief.hook}</p>
                  <div>
                    <span className="text-[10px] font-mono text-slate-500 uppercase">Week plan</span>
                    <ul className="mt-1 space-y-1">{brief.weekPlan.map((d, i) => (
                      <li key={i} className="text-xs font-mono text-slate-400 flex items-start gap-2"><Check className="w-3 h-3 text-brand-cyan shrink-0 mt-0.5" />{d}</li>
                    ))}</ul>
                  </div>
                  <p className="text-xs font-mono text-brand-cyan">Offer: {brief.offerAngle}</p>
                  {brief.riskNotes && <p className="text-[11px] font-mono text-amber-400/80">{brief.riskNotes}</p>}
                </div>
              )}

              <div className="tactical-panel rounded-2xl p-5">
                <h3 className="text-sm font-bold text-slate-100 mb-2">Linked Build Logs ({linkedLogs.length})</h3>
                {linkedLogs.length === 0 ? (
                  <p className="text-xs text-slate-500 font-mono">Link build logs by setting launch campaign when capturing work.</p>
                ) : linkedLogs.map(log => (
                  <button key={log.id} onClick={() => onOpenPostFactory(log.id)}
                    className="w-full text-left p-2 rounded-lg border border-slate-850 mb-1 hover:border-slate-700">
                    <span className="text-xs font-mono text-slate-300">{log.title}</span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
