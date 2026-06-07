import React, { useState, useEffect, useCallback } from 'react';
import { DashboardMetrics, BuildLog, PostDraft, MetricEvent, LaunchCampaign, ScheduledDispatch } from '../types';
import { api, PLATFORM_LABELS } from '../lib/api';
import {
  Terminal, Flame, DollarSign, Target, MessageSquare, Award,
  CheckCircle, Radio, Plus, Minus, Loader2, AlertCircle,
  ArrowRight, FolderLock, RefreshCw, Rocket, Calendar, Clock,
} from 'lucide-react';

interface DashboardViewProps {
  onNavigateToBuildLog: () => void;
  onNavigateToPostFactory: (buildLogId?: string) => void;
  onNavigateToProofVault: () => void;
  onNavigateToLaunchPad: () => void;
  onNavigateToDispatch: () => void;
  onNavigateToMoneyBoard: () => void;
}

export function DashboardView({
  onNavigateToBuildLog,
  onNavigateToPostFactory,
  onNavigateToProofVault,
  onNavigateToLaunchPad,
  onNavigateToDispatch,
  onNavigateToMoneyBoard,
}: DashboardViewProps) {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [logs, setLogs] = useState<BuildLog[]>([]);
  const [drafts, setDrafts] = useState<PostDraft[]>([]);
  const [events, setEvents] = useState<MetricEvent[]>([]);
  const [launches, setLaunches] = useState<LaunchCampaign[]>([]);
  const [dispatches, setDispatches] = useState<ScheduledDispatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [m, l, d, e, launchesList, disp] = await Promise.all([
        api.getMetrics(),
        api.listBuildLogs(),
        api.listDrafts(),
        api.listEvents(),
        api.listLaunches(),
        api.listDispatches({ status: 'scheduled' }),
      ]);
      setMetrics(m);
      setLogs(l.slice(0, 8));
      setDrafts(d.slice(0, 6));
      setEvents(e.slice(0, 12));
      setLaunches(launchesList.filter(c => c.status !== 'complete').slice(0, 4));
      setDispatches(disp.slice(0, 5));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load dashboard.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const adjustMetric = async (key: keyof DashboardMetrics, amount: number) => {
    if (!metrics) return;
    const next = Math.max(0, (metrics[key] as number) + amount);
    try {
      const updated = await api.updateMetrics({ [key]: next });
      setMetrics(updated);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Metric update failed.');
    }
  };

  const METRIC_DEFS: {
    key: keyof DashboardMetrics;
    label: string;
    color: string;
    icon: React.ElementType;
    sub: string;
    isCurrency?: boolean;
    step?: number;
  }[] = [
    { key: 'buildLogsCaptured', label: 'Build Logs', color: 'text-brand-amber', icon: Terminal, sub: 'Work captured' },
    { key: 'proofArtifactsAdded', label: 'Proof Added', color: 'text-brand-cyan', icon: FolderLock, sub: 'Artifacts in vault' },
    { key: 'postsDrafted', label: 'Posts Drafted', color: 'text-amber-400', icon: Flame, sub: 'Ready to post' },
    { key: 'postsPosted', label: 'Posts Posted', color: 'text-emerald-400', icon: Radio, sub: 'Public dispatches' },
    { key: 'replies', label: 'Replies', color: 'text-brand-cyan', icon: MessageSquare, sub: 'Conversations' },
    { key: 'leads', label: 'Leads', color: 'text-rose-400', icon: Target, sub: 'Prospects caught' },
    { key: 'offersMade', label: 'Offers Made', color: 'text-orange-400', icon: Award, sub: 'Offers sent' },
    { key: 'cashCollected', label: 'Cash Collected', color: 'text-emerald-400', icon: DollarSign, sub: 'Manual total ($)', isCurrency: true, step: 50 },
    { key: 'reuseWorthyPosts', label: 'Reuse-Worthy', color: 'text-teal-400', icon: CheckCircle, sub: 'Evergreen posts' },
    { key: 'activeLaunches', label: 'Active Launches', color: 'text-brand-amber', icon: Rocket, sub: 'In progress' },
    { key: 'scheduledDispatches', label: 'Scheduled', color: 'text-brand-cyan', icon: Calendar, sub: 'Upcoming posts' },
  ];

  const overdueCount = dispatches.filter(d => new Date(d.scheduledAt) < new Date()).length;

  if (loading && !metrics) {
    return (
      <div className="flex items-center justify-center py-20 text-slate-400">
        <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading dashboard...
      </div>
    );
  }

  return (
    <div id="visibility-dashboard-view" className="space-y-6">
      <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-5 border-b border-slate-800/50 pb-5">
        <div>
          <span className="bg-brand-amber/10 border border-brand-amber/30 text-brand-amber text-[10px] font-mono uppercase px-2.5 py-0.5 rounded-full font-bold tracking-wider">
            VISIBILITY MACHINE
          </span>
          <h1 className="text-3xl font-display font-black text-slate-100 tracking-tight flex items-center gap-2.5 mt-2">
            <Terminal className="w-8 h-8 text-brand-amber" />
            Visibility Dashboard
          </h1>
          <p className="text-slate-400 text-xs mt-1 max-w-2xl">
            Your build-in-public command deck. Capture proof, launch products, grow audience, track money — all from real data.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm font-display font-black tracking-wider text-brand-cyan italic">NO BUILD DIES IN PRIVATE.</span>
          <button onClick={onNavigateToBuildLog}
            className="flex items-center gap-1.5 bg-brand-amber hover:bg-brand-amber/90 text-slate-950 text-xs font-black px-4 py-2.5 rounded-xl">
            <Plus className="w-4 h-4" /> Capture Build Log
          </button>
          <button onClick={load} className="text-slate-400 hover:text-slate-200 p-2"><RefreshCw className="w-4 h-4" /></button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 text-red-300 text-xs p-3 rounded-xl">
          <AlertCircle className="w-4 h-4" /> {error}
        </div>
      )}

      {overdueCount > 0 && (
        <button onClick={onNavigateToDispatch}
          className="w-full bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 text-left flex items-center gap-2 hover:bg-amber-500/15 transition">
          <Clock className="w-4 h-4 text-amber-400" />
          <span className="text-xs font-mono text-amber-400">{overdueCount} scheduled dispatch(es) overdue — tap to review</span>
        </button>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-11 gap-3">
        {METRIC_DEFS.map(met => {
          const Icon = met.icon;
          const val = metrics?.[met.key] ?? 0;
          const step = met.step ?? 1;
          return (
            <div key={met.key} className="tactical-panel bg-slate-950/80 p-3.5 rounded-xl border border-slate-850 flex flex-col justify-between group">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 text-[8px] uppercase font-mono font-bold leading-tight">{met.label}</span>
                  <Icon className={`w-3 h-3 ${met.color}`} />
                </div>
                <h3 className="text-lg font-display font-black text-white mt-1.5">
                  {met.isCurrency ? `$${Number(val).toLocaleString()}` : val}
                </h3>
              </div>
              <div className="flex items-center gap-1 mt-2 pt-1.5 border-t border-slate-900/80 justify-end opacity-30 group-hover:opacity-100 transition">
                <button onClick={() => adjustMetric(met.key, -step)} className="p-0.5 hover:bg-slate-800 rounded bg-slate-900 text-slate-400"><Minus className="w-2.5 h-2.5" /></button>
                <button onClick={() => adjustMetric(met.key, step)} className="p-0.5 hover:bg-slate-800 rounded bg-slate-900 text-slate-400"><Plus className="w-2.5 h-2.5" /></button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="tactical-panel rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-slate-100 flex items-center gap-2"><Rocket className="w-4 h-4 text-brand-amber" /> Launch Pad</h4>
            <button onClick={onNavigateToLaunchPad} className="text-brand-amber text-xs font-mono">Open →</button>
          </div>
          {launches.length === 0 ? (
            <p className="text-xs text-slate-500 font-mono">No active launches. Start one in Launch Pad.</p>
          ) : launches.map(l => {
            const done = l.checklist.filter(c => c.done).length;
            const pct = Math.round((done / l.checklist.length) * 100);
            return (
              <div key={l.id} className="p-3 rounded-xl bg-slate-950 border border-slate-850">
                <div className="flex justify-between mb-1">
                  <span className="text-xs font-mono font-bold text-slate-200">{l.name}</span>
                  <span className="text-[9px] font-mono text-brand-cyan">{pct}%</span>
                </div>
                <div className="h-1 bg-slate-900 rounded-full"><div className="h-full bg-brand-amber rounded-full" style={{ width: `${pct}%` }} /></div>
              </div>
            );
          })}
        </div>

        <div className="tactical-panel rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-slate-100 flex items-center gap-2"><Calendar className="w-4 h-4 text-brand-cyan" /> Upcoming Dispatches</h4>
            <button onClick={onNavigateToDispatch} className="text-brand-cyan text-xs font-mono">Calendar →</button>
          </div>
          {dispatches.length === 0 ? (
            <p className="text-xs text-slate-500 font-mono">Nothing scheduled. Schedule from Post Factory.</p>
          ) : dispatches.map(d => (
            <div key={d.id} className="p-2 rounded-lg bg-slate-950 border border-slate-850 text-xs font-mono">
              <span className="text-brand-cyan">{PLATFORM_LABELS[d.platform]}</span>
              <span className="text-slate-500 ml-2">{new Date(d.scheduledAt).toLocaleString()}</span>
              <p className="text-slate-400 truncate mt-0.5">{d.title}</p>
            </div>
          ))}
        </div>

        <div className="tactical-panel rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-slate-100 flex items-center gap-2"><DollarSign className="w-4 h-4 text-emerald-400" /> Money Board</h4>
            <button onClick={onNavigateToMoneyBoard} className="text-emerald-400 text-xs font-mono">Open →</button>
          </div>
          <p className="text-2xl font-black text-emerald-400">${(metrics?.cashCollected ?? 0).toLocaleString()}</p>
          <p className="text-[10px] font-mono text-slate-500">{metrics?.leads ?? 0} leads tracked · {metrics?.offersMade ?? 0} offers</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="tactical-panel rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-slate-100">Dispatch Feed</h4>
            <button onClick={onNavigateToBuildLog} className="text-brand-amber text-xs flex items-center gap-1">Build Log <ArrowRight className="w-3.5 h-3.5" /></button>
          </div>
          {logs.length === 0 ? (
            <p className="text-xs text-slate-500 font-mono">No build logs yet.</p>
          ) : logs.map(log => (
            <button key={log.id} onClick={() => onNavigateToPostFactory(log.id)}
              className="w-full text-left p-3 rounded-xl bg-slate-950 border border-slate-850 hover:border-slate-700 transition">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[9px] font-mono text-brand-cyan">{log.project}</span>
                <span className="text-[9px] font-mono text-slate-500">{log.status.replace(/_/g, ' ')}</span>
              </div>
              <p className="text-xs font-mono text-slate-300 line-clamp-1">{log.title}</p>
            </button>
          ))}
        </div>

        <div className="tactical-panel rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-slate-100">Signal Board</h4>
            <button onClick={() => onNavigateToPostFactory()} className="text-brand-cyan text-xs flex items-center gap-1">Post Factory <ArrowRight className="w-3.5 h-3.5" /></button>
          </div>
          {drafts.length === 0 ? (
            <p className="text-xs text-slate-500 font-mono">No drafts yet.</p>
          ) : drafts.map(d => (
            <div key={d.id} className="p-3 rounded-xl bg-slate-950 border border-slate-850 flex justify-between items-center">
              <div className="min-w-0">
                <span className="text-[9px] font-mono text-brand-amber uppercase">{PLATFORM_LABELS[d.platform]}</span>
                <p className="text-xs font-mono text-slate-400 truncate">{d.hook}</p>
              </div>
              <span className="text-[9px] font-mono text-slate-500 shrink-0 ml-2">{d.status}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="tactical-panel rounded-2xl p-5">
        <h4 className="text-sm font-bold text-slate-100 mb-3">Activity Stream</h4>
        <div className="space-y-1 max-h-40 overflow-y-auto custom-scrollbar">
          {events.length === 0 ? (
            <p className="text-xs text-slate-500 font-mono">Activity appears as you capture, post, and convert.</p>
          ) : events.map(ev => (
            <div key={ev.id} className="flex justify-between text-[10px] font-mono py-1 border-b border-slate-900">
              <span className="text-slate-400">{ev.type} — {ev.note}</span>
              <span className="text-slate-600">{new Date(ev.createdAt).toLocaleDateString()}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
