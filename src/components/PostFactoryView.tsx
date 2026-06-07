import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { BuildLog, PostDraft, DraftStatus, Platform, PLATFORMS } from '../types';
import { api, copyToClipboard, formatDraftForCopy, PLATFORM_LABELS, InputWeakError } from '../lib/api';
import { assessBuildLogInput, isDraftWeak } from '../lib/contentQuality';
import {
  Flame, Loader2, AlertCircle, Copy, Check, ChevronDown,
  RefreshCw, Sparkles, CheckCircle, Calendar, MessageSquare,
  AlertTriangle, Zap,
} from 'lucide-react';

interface PostFactoryViewProps {
  initialBuildLogId?: string | null;
  onNavigateToDispatch?: () => void;
}

const STATUS_OPTIONS: DraftStatus[] = ['draft', 'copied', 'posted', 'reuse_later'];

export function PostFactoryView({ initialBuildLogId, onNavigateToDispatch }: PostFactoryViewProps) {
  const [logs, setLogs] = useState<BuildLog[]>([]);
  const [selectedLogId, setSelectedLogId] = useState<string | null>(initialBuildLogId || null);
  const [drafts, setDrafts] = useState<PostDraft[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [scheduleDraftId, setScheduleDraftId] = useState<string | null>(null);
  const [scheduleAt, setScheduleAt] = useState('');
  const [showInputWarning, setShowInputWarning] = useState(false);
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const l = await api.listBuildLogs();
      setLogs(l);
      const logId = selectedLogId || initialBuildLogId || l[0]?.id || null;
      if (logId && !selectedLogId) setSelectedLogId(logId);
      if (logId) {
        const d = await api.listDrafts(logId);
        setDrafts(d);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load.');
    } finally {
      setLoading(false);
    }
  }, [selectedLogId, initialBuildLogId]);

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (initialBuildLogId) setSelectedLogId(initialBuildLogId);
  }, [initialBuildLogId]);

  useEffect(() => {
    if (!selectedLogId) { setDrafts([]); return; }
    api.listDrafts(selectedLogId).then(setDrafts).catch(() => setDrafts([]));
  }, [selectedLogId]);

  const selectedLog = logs.find(l => l.id === selectedLogId);
  const inputStrength = useMemo(
    () => (selectedLog ? assessBuildLogInput(selectedLog) : null),
    [selectedLog]
  );

  const strengthColor = (level: string) => {
    if (level === 'strong') return 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10';
    if (level === 'moderate') return 'text-brand-cyan border-brand-cyan/30 bg-brand-cyan/10';
    return 'text-amber-400 border-amber-500/30 bg-amber-500/10';
  };

  const runGenerate = async (force = false) => {
    if (!selectedLogId) { setError('Select a build log first.'); return; }
    setGenerating(true);
    setError('');
    setInfo('');
    setShowInputWarning(false);
    try {
      const result = await api.generateDrafts(selectedLogId, { force });
      setDrafts(result.drafts);
      if (result.offline) {
        setInfo('Offline mode — builder-style template drafts generated. Add GEMINI_API_KEY for AI-tailored content.');
      } else {
        setInfo(`Generated ${result.drafts.length} platform drafts.`);
      }
    } catch (e) {
      if (e instanceof InputWeakError) {
        setShowInputWarning(true);
        setError(e.message);
      } else {
        setError(e instanceof Error ? e.message : 'Generation failed.');
      }
    } finally {
      setGenerating(false);
    }
  };

  const handleGenerate = () => {
    if (!selectedLogId) { setError('Select a build log first.'); return; }
    if (inputStrength?.needsConfirmation) {
      setShowInputWarning(true);
      return;
    }
    runGenerate(false);
  };

  const handleRegenerateStronger = async (draft: PostDraft) => {
    setRegeneratingId(draft.id);
    setError('');
    setInfo('');
    try {
      const result = await api.regenerateDraft(draft.id);
      setDrafts(prev => prev.map(d => d.id === draft.id ? result.draft : d));
      setInfo(result.offline
        ? `${PLATFORM_LABELS[draft.platform]} draft regenerated (offline stronger template).`
        : `${PLATFORM_LABELS[draft.platform]} draft regenerated stronger.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Regeneration failed.');
    } finally {
      setRegeneratingId(null);
    }
  };

  const handleCopy = async (draft: PostDraft) => {
    const ok = await copyToClipboard(formatDraftForCopy(draft));
    if (ok) {
      setCopiedId(draft.id);
      setTimeout(() => setCopiedId(null), 2000);
      if (draft.status === 'draft') {
        const updated = await api.updateDraft(draft.id, { status: 'copied' });
        setDrafts(prev => prev.map(d => d.id === draft.id ? updated : d));
      }
    } else {
      setError('Copy to clipboard failed.');
    }
  };

  const handleStatusChange = async (draftId: string, status: DraftStatus) => {
    try {
      const updated = await api.updateDraft(draftId, { status });
      setDrafts(prev => prev.map(d => d.id === draftId ? updated : d));
      if (status === 'posted' && selectedLogId) {
        await api.updateBuildLog(selectedLogId, { status: 'posted' });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Status update failed.');
    }
  };

  const handleSchedule = async (draft: PostDraft) => {
    if (!scheduleAt) { setError('Pick a date/time to schedule.'); return; }
    try {
      await api.createDispatch({
        postDraftId: draft.id,
        buildLogId: draft.buildLogId,
        platform: draft.platform,
        title: `${PLATFORM_LABELS[draft.platform]}: ${draft.hook.slice(0, 50)}`,
        contentPreview: draft.hook,
        scheduledAt: new Date(scheduleAt).toISOString(),
        status: 'scheduled',
      });
      setScheduleDraftId(null);
      setScheduleAt('');
      setInfo('Added to Dispatch Calendar.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Schedule failed.');
    }
  };

  const updateDraftField = async (draftId: string, patch: Partial<PostDraft>) => {
    try {
      const updated = await api.updateDraft(draftId, patch);
      setDrafts(prev => prev.map(d => d.id === draftId ? updated : d));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Update failed.');
    }
  };

  if (loading && !logs.length) {
    return (
      <div className="flex items-center justify-center py-20 text-slate-400">
        <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading post factory...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800/50 pb-5">
        <div>
          <h1 className="text-3xl font-display font-black text-slate-100 tracking-tight flex items-center gap-2.5">
            <Flame className="w-8 h-8 text-brand-amber" />
            Post Factory
          </h1>
          <p className="text-slate-400 text-xs mt-1 max-w-xl">
            Generate platform-specific drafts from build logs. Copy, post manually, track status.
          </p>
        </div>
        <button onClick={load} className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 font-mono">
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 text-red-300 text-xs p-3 rounded-xl">
          <AlertCircle className="w-4 h-4 shrink-0" /> {error}
        </div>
      )}
      {info && (
        <div className="flex items-center gap-2 bg-brand-cyan/10 border border-brand-cyan/30 text-brand-cyan text-xs p-3 rounded-xl">
          <CheckCircle className="w-4 h-4 shrink-0" /> {info}
        </div>
      )}

      <div className="tactical-panel rounded-2xl p-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
          <div className="md:col-span-8">
            <label className="text-[10px] text-slate-500 uppercase font-mono font-bold block mb-1">Source Build Log</label>
            {logs.length === 0 ? (
              <p className="text-xs text-slate-500 font-mono">No build logs yet. Create one in Build Log first.</p>
            ) : (
              <select value={selectedLogId || ''} onChange={e => setSelectedLogId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-850 rounded-xl px-4 py-3 text-slate-200 text-xs font-mono focus:outline-none focus:border-brand-amber/50">
                {logs.map(l => (
                  <option key={l.id} value={l.id}>[{l.date}] {l.title} — {l.project}</option>
                ))}
              </select>
            )}
          </div>
          <div className="md:col-span-4">
            <button onClick={handleGenerate} disabled={generating || !selectedLogId}
              className="w-full bg-brand-amber hover:bg-brand-amber/90 disabled:opacity-50 text-slate-950 font-black py-3 rounded-xl text-xs flex items-center justify-center gap-2">
              {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              {generating ? 'Generating...' : 'Generate Platform Drafts'}
            </button>
          </div>
        </div>

        {selectedLog && inputStrength && (
          <div className={`rounded-xl border p-4 space-y-2 ${strengthColor(inputStrength.level)}`}>
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-mono font-bold uppercase flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" />
                Input strength: {inputStrength.level} ({inputStrength.score}/100)
              </span>
              {inputStrength.missing.length > 0 && (
                <span className="text-[10px] font-mono opacity-80">
                  Missing: {inputStrength.missing.join(', ')}
                </span>
              )}
            </div>
            {inputStrength.warnings.map((w, i) => (
              <p key={i} className="text-[11px] font-mono opacity-90">• {w}</p>
            ))}
            {inputStrength.needsConfirmation && (
              <p className="text-[10px] font-mono font-bold pt-1">
                Fill missing fields in Build Log for stronger drafts — or confirm to generate anyway.
              </p>
            )}
          </div>
        )}

        {showInputWarning && inputStrength?.needsConfirmation && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 space-y-3">
            <p className="text-xs font-mono text-amber-200">
              Thin input produces generic drafts. What Happened, Why It Matters, Pain Point, and CTA should be filled before generating.
            </p>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => runGenerate(true)} disabled={generating}
                className="bg-amber-500 hover:bg-amber-500/90 disabled:opacity-50 text-slate-950 font-bold px-4 py-2 rounded-xl text-xs">
                {generating ? 'Generating...' : 'Generate anyway'}
              </button>
              <button onClick={() => setShowInputWarning(false)}
                className="border border-slate-700 text-slate-400 font-mono px-4 py-2 rounded-xl text-xs hover:text-slate-200">
                Go back — fill fields first
              </button>
            </div>
          </div>
        )}

        {selectedLog && (
          <div className="bg-slate-950 border border-slate-850 rounded-xl p-4 text-xs font-mono space-y-1">
            <p className="text-slate-300 font-bold">{selectedLog.title}</p>
            <p className="text-slate-500 line-clamp-2">{selectedLog.whatHappened}</p>
            <p className="text-[10px] text-slate-600">Platforms: {PLATFORMS.join(', ')}</p>
          </div>
        )}
      </div>

      {drafts.length === 0 ? (
        <div className="tactical-panel rounded-2xl p-12 text-center">
          <p className="text-slate-500 text-xs font-mono">Select a build log and generate drafts to get started.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {drafts.map(draft => {
            const expanded = expandedId === draft.id;
            const weak = isDraftWeak(draft);
            return (
              <div key={draft.id} className={`tactical-panel rounded-2xl p-5 space-y-3 ${weak ? 'ring-1 ring-amber-500/40' : ''}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-black text-brand-cyan uppercase">{PLATFORM_LABELS[draft.platform]}</span>
                    {weak && (
                      <span className="text-[9px] font-mono uppercase bg-amber-500/15 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded">
                        Weak draft
                      </span>
                    )}
                  </div>
                  <select value={draft.status} onChange={e => handleStatusChange(draft.id, e.target.value as DraftStatus)}
                    className="bg-slate-950 border border-slate-850 rounded-lg px-2 py-1 text-[10px] font-mono text-slate-300">
                    {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
                  </select>
                </div>

                <div>
                  <span className="text-[9px] font-mono text-slate-500 uppercase">Hook</span>
                  <p className="text-slate-200 text-xs font-mono mt-0.5">{draft.hook}</p>
                </div>

                <div>
                  <span className="text-[9px] font-mono text-slate-500 uppercase">Body / Script</span>
                  <p className={`text-slate-350 text-xs font-mono mt-0.5 leading-relaxed ${expanded ? '' : 'line-clamp-4'}`}>{draft.body}</p>
                  {draft.body.length > 200 && (
                    <button onClick={() => setExpandedId(expanded ? null : draft.id)}
                      className="text-[10px] text-brand-amber font-mono mt-1 flex items-center gap-0.5">
                      <ChevronDown className={`w-3 h-3 transition ${expanded ? 'rotate-180' : ''}`} />
                      {expanded ? 'Less' : 'More'}
                    </button>
                  )}
                </div>

                <div>
                  <span className="text-[9px] font-mono text-slate-500 uppercase">CTA</span>
                  <p className="text-slate-300 text-xs font-mono mt-0.5">{draft.cta}</p>
                </div>

                <div>
                  <span className="text-[9px] font-mono text-slate-500 uppercase">Visual suggestion</span>
                  <p className="text-slate-500 text-[11px] font-mono mt-0.5">{draft.visualSuggestion}</p>
                </div>

                {draft.hashtags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {draft.hashtags.map((tag, i) => (
                      <span key={i} className="text-[9px] font-mono bg-slate-950 border border-slate-850 px-2 py-0.5 rounded text-slate-400">
                        {tag.startsWith('#') ? tag : `#${tag}`}
                      </span>
                    ))}
                  </div>
                )}

                <button onClick={() => handleCopy(draft)}
                  className="w-full bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-200 font-bold py-2 rounded-xl text-xs flex items-center justify-center gap-1.5">
                  {copiedId === draft.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedId === draft.id ? 'Copied!' : 'Copy Full Draft'}
                </button>

                {weak && (
                  <button onClick={() => handleRegenerateStronger(draft)} disabled={regeneratingId === draft.id}
                    className="w-full bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 font-bold py-2 rounded-xl text-xs flex items-center justify-center gap-1.5 disabled:opacity-50">
                    {regeneratingId === draft.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
                    {regeneratingId === draft.id ? 'Regenerating...' : 'Regenerate stronger'}
                  </button>
                )}

                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-900">
                  <div>
                    <label className="text-[9px] font-mono text-slate-600 uppercase flex items-center gap-1"><MessageSquare className="w-3 h-3" /> Replies</label>
                    <input type="number" min={0} value={draft.replyCount ?? 0}
                      onChange={e => updateDraftField(draft.id, { replyCount: parseInt(e.target.value) || 0 })}
                      className="w-full bg-slate-950 border border-slate-850 rounded-lg px-2 py-1 text-[10px] font-mono text-slate-300 mt-0.5" />
                  </div>
                  <div>
                    <button onClick={() => setScheduleDraftId(scheduleDraftId === draft.id ? null : draft.id)}
                      className="w-full mt-3 bg-slate-950 border border-slate-850 hover:border-brand-cyan/40 text-slate-400 text-[10px] font-mono py-1.5 rounded-lg flex items-center justify-center gap-1">
                      <Calendar className="w-3 h-3" /> Schedule
                    </button>
                  </div>
                </div>

                {scheduleDraftId === draft.id && (
                  <div className="flex gap-2">
                    <input type="datetime-local" value={scheduleAt} onChange={e => setScheduleAt(e.target.value)}
                      className="flex-1 bg-slate-950 border border-slate-850 rounded-lg px-2 py-1 text-[10px] font-mono text-slate-300" />
                    <button onClick={() => handleSchedule(draft)} className="bg-brand-cyan text-slate-950 text-[10px] font-bold px-3 rounded-lg">Add</button>
                  </div>
                )}

                <input placeholder="Performance notes (optional)" value={draft.performanceNotes || ''}
                  onChange={e => updateDraftField(draft.id, { performanceNotes: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-850 rounded-lg px-2 py-1.5 text-[10px] font-mono text-slate-400" />
              </div>
            );
          })}
        </div>
      )}

      {onNavigateToDispatch && drafts.length > 0 && (
        <button onClick={onNavigateToDispatch} className="text-xs font-mono text-brand-cyan hover:underline">
          View Dispatch Calendar →
        </button>
      )}
    </div>
  );
}
