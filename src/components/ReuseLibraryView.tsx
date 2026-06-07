import React, { useState, useEffect, useCallback } from 'react';
import { PostDraft, BuildLog } from '../types';
import { api, PLATFORM_LABELS, formatDraftForCopy, copyToClipboard } from '../lib/api';
import {
  Gem, Loader2, AlertCircle, Copy, Check, RefreshCw, ChevronDown, Flame,
} from 'lucide-react';

export function ReuseLibraryView() {
  const [drafts, setDrafts] = useState<PostDraft[]>([]);
  const [logs, setLogs] = useState<BuildLog[]>([]);
  const [allLogs, setAllLogs] = useState<BuildLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [allDrafts, allLogs, allBuildLogs] = await Promise.all([
        api.listDrafts(undefined, 'reuse_later'),
        api.listBuildLogs({ status: 'reuse_later' }),
        api.listBuildLogs(),
      ]);
      setDrafts(allDrafts);
      setLogs(allLogs);
      setAllLogs(allBuildLogs);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load reuse library.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCopy = async (draft: PostDraft) => {
    const ok = await copyToClipboard(formatDraftForCopy(draft));
    if (ok) {
      setCopiedId(draft.id);
      setTimeout(() => setCopiedId(null), 2000);
    } else {
      setError('Copy failed.');
    }
  };

  const getLogTitle = (buildLogId: string) => allLogs.find(l => l.id === buildLogId)?.title || 'Build log';

  if (loading) {
    return <div className="flex justify-center py-20 text-slate-400"><Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading...</div>;
  }

  const total = drafts.length + logs.length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800/50 pb-5">
        <div>
          <h1 className="text-3xl font-display font-black text-slate-100 flex items-center gap-2.5">
            <Gem className="w-8 h-8 text-teal-400" /> Reuse Library
          </h1>
          <p className="text-slate-400 text-xs mt-1">Evergreen posts marked reuse-worthy. Repost winners without losing them in private.</p>
        </div>
        <button onClick={load} className="text-slate-400"><RefreshCw className="w-4 h-4" /></button>
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 text-red-300 text-xs p-3 rounded-xl">
          <AlertCircle className="w-4 h-4" /> {error}
        </div>
      )}

      {total === 0 ? (
        <div className="tactical-panel rounded-2xl p-12 text-center">
          <Gem className="w-10 h-10 text-slate-700 mx-auto mb-3" />
          <p className="text-slate-500 text-xs font-mono">No reuse-worthy content yet. Mark drafts or build logs as reuse_later in Post Factory or Build Log.</p>
        </div>
      ) : (
        <>
          {logs.length > 0 && (
            <div className="tactical-panel rounded-2xl p-5 space-y-2">
              <h3 className="text-sm font-bold text-slate-100">Reuse Build Logs ({logs.length})</h3>
              {logs.map(log => (
                <div key={log.id} className="p-3 rounded-xl bg-slate-950 border border-slate-850">
                  <div className="flex items-center gap-2 mb-1">
                    <Flame className="w-3.5 h-3.5 text-teal-400" />
                    <span className="text-[9px] font-mono text-brand-cyan">{log.project}</span>
                  </div>
                  <p className="text-xs font-bold font-mono text-slate-200">{log.title}</p>
                  <p className="text-[11px] font-mono text-slate-500 mt-1 line-clamp-2">{log.whatHappened}</p>
                </div>
              ))}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {drafts.map(draft => {
              const expanded = expandedId === draft.id;
              return (
                <div key={draft.id} className="tactical-panel rounded-2xl p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-black text-teal-400 uppercase">{PLATFORM_LABELS[draft.platform]}</span>
                    <span className="text-[9px] font-mono text-slate-600">{getLogTitle(draft.buildLogId)}</span>
                  </div>
                  <p className="text-slate-200 text-xs font-mono font-bold">{draft.hook}</p>
                  <p className={`text-slate-400 text-xs font-mono ${expanded ? '' : 'line-clamp-3'}`}>{draft.body}</p>
                  {draft.body.length > 150 && (
                    <button onClick={() => setExpandedId(expanded ? null : draft.id)} className="text-[10px] text-brand-amber font-mono flex items-center gap-0.5">
                      <ChevronDown className={`w-3 h-3 ${expanded ? 'rotate-180' : ''}`} /> {expanded ? 'Less' : 'More'}
                    </button>
                  )}
                  {draft.performanceNotes && (
                    <p className="text-[10px] font-mono text-emerald-400/80 bg-emerald-500/5 p-2 rounded-lg">{draft.performanceNotes}</p>
                  )}
                  <button onClick={() => handleCopy(draft)}
                    className="w-full bg-slate-900 border border-slate-800 text-slate-200 font-bold py-2 rounded-xl text-xs flex items-center justify-center gap-1.5">
                    {copiedId === draft.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedId === draft.id ? 'Copied!' : 'Copy for Repost'}
                  </button>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
