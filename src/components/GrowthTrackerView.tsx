import React, { useState, useEffect, useCallback } from 'react';
import { PlatformProfile, Platform } from '../types';
import { api, PLATFORM_LABELS } from '../lib/api';
import { PLATFORM_PLAYBOOKS } from '../data/platformPlaybooks';
import {
  TrendingUp, Loader2, AlertCircle, RefreshCw, Users, BookOpen,
} from 'lucide-react';

export function GrowthTrackerView() {
  const [profiles, setProfiles] = useState<PlatformProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedPlatform, setSelectedPlatform] = useState<Platform>('twitter');
  const [editCounts, setEditCounts] = useState<Record<string, string>>({});
  const [editHandles, setEditHandles] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const p = await api.listProfiles();
      setProfiles(p);
      const counts: Record<string, string> = {};
      const handles: Record<string, string> = {};
      p.forEach(pr => { counts[pr.id] = String(pr.followerCount); handles[pr.id] = pr.handle; });
      setEditCounts(counts);
      setEditHandles(handles);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load profiles.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const saveProfile = async (profile: PlatformProfile) => {
    const count = parseInt(editCounts[profile.id] || '0', 10);
    const handle = editHandles[profile.id]?.trim() || profile.handle;
    try {
      await api.updateProfile(profile.id, { followerCount: isNaN(count) ? 0 : count, handle });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed.');
    }
  };

  const totalFollowers = profiles.reduce((s, p) => s + p.followerCount, 0);
  const playbook = PLATFORM_PLAYBOOKS.find(p => p.platform === selectedPlatform);

  const getGrowth = (profile: PlatformProfile) => {
    const hist = profile.followerHistory;
    if (hist.length < 2) return 0;
    return hist[hist.length - 1].count - hist[hist.length - 2].count;
  };

  if (loading && !profiles.length) {
    return <div className="flex justify-center py-20 text-slate-400"><Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800/50 pb-5">
        <div>
          <h1 className="text-3xl font-display font-black text-slate-100 flex items-center gap-2.5">
            <TrendingUp className="w-8 h-8 text-brand-cyan" /> Growth Tracker
          </h1>
          <p className="text-slate-400 text-xs mt-1">Manual follower counts you update — honest growth tracking, not fake API sync.</p>
        </div>
        <button onClick={load} className="text-slate-400"><RefreshCw className="w-4 h-4" /></button>
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 text-red-300 text-xs p-3 rounded-xl">
          <AlertCircle className="w-4 h-4" /> {error}
        </div>
      )}

      <div className="tactical-panel rounded-2xl p-5 flex items-center gap-4">
        <Users className="w-8 h-8 text-brand-amber" />
        <div>
          <p className="text-[10px] font-mono text-slate-500 uppercase">Total tracked audience</p>
          <p className="text-2xl font-black text-white">{totalFollowers.toLocaleString()}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="tactical-panel rounded-2xl p-5 space-y-3">
          <h3 className="text-sm font-bold text-slate-100">Platform Profiles</h3>
          {profiles.map(profile => {
            const growth = getGrowth(profile);
            return (
              <div key={profile.id} className="p-3 rounded-xl bg-slate-950 border border-slate-850 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-brand-cyan uppercase">{PLATFORM_LABELS[profile.platform]}</span>
                  {growth !== 0 && (
                    <span className={`text-[10px] font-mono ${growth > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {growth > 0 ? '+' : ''}{growth} since last update
                    </span>
                  )}
                </div>
                <input value={editHandles[profile.id] ?? profile.handle}
                  onChange={e => setEditHandles(h => ({ ...h, [profile.id]: e.target.value }))}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs font-mono text-slate-300" />
                <div className="flex gap-2">
                  <input type="number" value={editCounts[profile.id] ?? '0'}
                    onChange={e => setEditCounts(c => ({ ...c, [profile.id]: e.target.value }))}
                    className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs font-mono text-slate-300" />
                  <button onClick={() => saveProfile(profile)}
                    className="bg-brand-cyan text-slate-950 font-bold px-3 py-1.5 rounded-lg text-[10px] font-mono">Save</button>
                </div>
                {profile.followerHistory.length > 1 && (
                  <div className="flex items-end gap-0.5 h-8 pt-1">
                    {profile.followerHistory.slice(-14).map((h, i) => {
                      const max = Math.max(...profile.followerHistory.map(x => x.count), 1);
                      const height = Math.max(4, (h.count / max) * 100);
                      return (
                        <div key={i} title={`${h.date}: ${h.count}`}
                          className="flex-1 bg-brand-cyan/40 rounded-t-sm hover:bg-brand-cyan/70 transition"
                          style={{ height: `${height}%` }} />
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="tactical-panel rounded-2xl p-5 space-y-4">
          <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2"><BookOpen className="w-4 h-4 text-brand-amber" /> Platform Playbook</h3>
          <div className="flex flex-wrap gap-1">
            {PLATFORM_PLAYBOOKS.map(p => (
              <button key={p.platform} onClick={() => setSelectedPlatform(p.platform)}
                className={`text-[10px] font-mono uppercase px-2 py-1 rounded-lg border ${selectedPlatform === p.platform ? 'border-brand-amber text-brand-amber' : 'border-slate-850 text-slate-500'}`}>
                {p.platform}
              </button>
            ))}
          </div>
          {playbook && (
            <div className="space-y-3 text-xs font-mono">
              <p className="text-slate-300">{playbook.purpose}</p>
              <div>
                <span className="text-[10px] text-slate-500 uppercase">Best for</span>
                <p className="text-slate-400 mt-0.5">{playbook.bestFor.join(' · ')}</p>
              </div>
              <div className="bg-slate-950 p-3 rounded-lg border border-slate-850">
                <span className="text-[10px] text-brand-amber uppercase">Hook formula</span>
                <p className="text-slate-300 mt-1 italic">{playbook.hookFormula}</p>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 uppercase">Proof tips</span>
                <ul className="mt-1 space-y-0.5">{playbook.proofTips.map((t, i) => (
                  <li key={i} className="text-slate-400">• {t}</li>
                ))}</ul>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 uppercase">CTA tips</span>
                <ul className="mt-1 space-y-0.5">{playbook.ctaTips.map((t, i) => (
                  <li key={i} className="text-brand-cyan/80">• {t}</li>
                ))}</ul>
              </div>
              <div>
                <span className="text-[10px] text-red-400/70 uppercase">Avoid</span>
                <ul className="mt-1 space-y-0.5">{playbook.avoid.map((t, i) => (
                  <li key={i} className="text-slate-500">• {t}</li>
                ))}</ul>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
