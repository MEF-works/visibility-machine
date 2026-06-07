import React, { useState, useEffect } from 'react';
import { AppSettings, Platform, PLATFORMS, GeminiStatus, StorageStatus } from '../types';
import { api } from '../lib/api';
import {
  Settings, X, Loader2, AlertCircle, CheckCircle, Download, Upload,
  Trash2, Key, Database,
} from 'lucide-react';

interface SettingsViewProps {
  open: boolean;
  onClose: () => void;
}

export function SettingsView({ open, onClose }: SettingsViewProps) {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [gemini, setGemini] = useState<GeminiStatus | null>(null);
  const [storage, setStorage] = useState<StorageStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [projectsText, setProjectsText] = useState('');
  const [importText, setImportText] = useState('');

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setError('');
    setSuccess('');
    Promise.all([api.getSettings(), api.getStatus()])
      .then(([s, status]) => {
        setSettings(s);
        setGemini(status.gemini);
        setStorage(status.storage);
        setProjectsText(s.projects.join('\n'));
      })
      .catch(e => setError(e instanceof Error ? e.message : 'Failed to load settings.'))
      .finally(() => setLoading(false));
  }, [open]);

  if (!open) return null;

  const saveSettings = async () => {
    if (!settings) return;
    setError('');
    try {
      const projects = projectsText.split('\n').map(p => p.trim()).filter(Boolean);
      const updated = await api.updateSettings({
        defaultPlatforms: settings.defaultPlatforms,
        defaultCta: settings.defaultCta,
        projects,
      });
      setSettings(updated);
      setSuccess('Settings saved.');
      setTimeout(() => setSuccess(''), 3000);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed.');
    }
  };

  const togglePlatform = (p: Platform) => {
    if (!settings) return;
    const has = settings.defaultPlatforms.includes(p);
    setSettings({
      ...settings,
      defaultPlatforms: has
        ? settings.defaultPlatforms.filter(x => x !== p)
        : [...settings.defaultPlatforms, p],
    });
  };

  const handleExport = async () => {
    try {
      const data = await api.exportBackup();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `visibility-machine-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setSuccess('Backup downloaded.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Export failed.');
    }
  };

  const handleImport = async () => {
    setError('');
    try {
      const data = JSON.parse(importText);
      await api.importBackup(data);
      setImportText('');
      setSuccess('Backup imported successfully.');
      const status = await api.getStatus();
      setStorage(status.storage);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Import failed — check JSON format.');
    }
  };

  const handleReset = async () => {
    if (!confirm('Reset ALL data? This cannot be undone. Export a backup first if needed.')) return;
    try {
      await api.resetData();
      setSuccess('Data reset.');
      const status = await api.getStatus();
      setStorage(status.storage);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Reset failed.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-slate-950 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto custom-scrollbar shadow-2xl">
        <div className="sticky top-0 bg-slate-950/95 backdrop-blur border-b border-slate-800 p-5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-brand-amber" />
            <h2 className="text-slate-100 font-display font-bold">Settings</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200 p-1"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-5 space-y-6">
          {loading ? (
            <div className="flex items-center justify-center py-8 text-slate-400">
              <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading...
            </div>
          ) : (
            <>
              {error && (
                <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 text-red-300 text-xs p-3 rounded-xl">
                  <AlertCircle className="w-4 h-4" /> {error}
                </div>
              )}
              {success && (
                <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs p-3 rounded-xl">
                  <CheckCircle className="w-4 h-4" /> {success}
                </div>
              )}

              {/* Status */}
              <section className="space-y-3">
                <h3 className="text-xs font-mono font-bold text-slate-400 uppercase">System Status</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="bg-slate-900 border border-slate-850 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Key className="w-4 h-4 text-brand-amber" />
                      <span className="text-xs font-mono font-bold text-slate-300">Gemini API</span>
                    </div>
                    <p className={`text-[11px] font-mono ${gemini?.configured ? 'text-emerald-400' : 'text-amber-400'}`}>
                      {gemini?.message}
                    </p>
                    <p className="text-[10px] text-slate-600 font-mono mt-1">Set GEMINI_API_KEY in .env (server-side only)</p>
                  </div>
                  <div className="bg-slate-900 border border-slate-850 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Database className="w-4 h-4 text-brand-cyan" />
                      <span className="text-xs font-mono font-bold text-slate-300">Storage</span>
                    </div>
                    <p className="text-[11px] font-mono text-slate-400">
                      {storage?.buildLogs} logs · {storage?.proofArtifacts} proof · {storage?.postDrafts} drafts · {storage?.launchCampaigns} launches · {storage?.leads} leads
                    </p>
                    <p className="text-[10px] text-slate-600 font-mono mt-1 truncate" title={storage?.path}>{storage?.path}</p>
                  </div>
                </div>
              </section>

              {/* Preferences */}
              {settings && (
                <section className="space-y-3">
                  <h3 className="text-xs font-mono font-bold text-slate-400 uppercase">Preferences</h3>
                  <div>
                    <label className="text-[10px] text-slate-500 font-mono uppercase block mb-1">Default CTA / Offer</label>
                    <input value={settings.defaultCta} onChange={e => setSettings({ ...settings, defaultCta: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-850 rounded-lg px-3 py-2 text-slate-200 text-xs font-mono" />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 font-mono uppercase block mb-2">Default Platforms</label>
                    <div className="flex flex-wrap gap-2">
                      {PLATFORMS.map(p => (
                        <button key={p} onClick={() => togglePlatform(p)}
                          className={`text-[10px] font-mono px-2.5 py-1 rounded-lg border uppercase ${settings.defaultPlatforms.includes(p) ? 'bg-brand-amber/15 border-brand-amber text-brand-amber' : 'bg-slate-950 border-slate-850 text-slate-500'}`}>
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 font-mono uppercase block mb-1">Projects / Products (one per line)</label>
                    <textarea rows={6} value={projectsText} onChange={e => setProjectsText(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-850 rounded-lg px-3 py-2 text-slate-200 text-xs font-mono resize-none" />
                  </div>
                  <button onClick={saveSettings}
                    className="bg-brand-amber hover:bg-brand-amber/90 text-slate-950 font-bold py-2 px-4 rounded-xl text-xs">
                    Save Preferences
                  </button>
                </section>
              )}

              {/* Backup */}
              <section className="space-y-3 border-t border-slate-800 pt-5">
                <h3 className="text-xs font-mono font-bold text-slate-400 uppercase">Backup & Reset</h3>
                <div className="flex flex-wrap gap-2">
                  <button onClick={handleExport}
                    className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 text-xs font-bold py-2 px-4 rounded-xl">
                    <Download className="w-3.5 h-3.5" /> Export JSON
                  </button>
                  <button onClick={handleReset}
                    className="flex items-center gap-1.5 bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-bold py-2 px-4 rounded-xl">
                    <Trash2 className="w-3.5 h-3.5" /> Reset All Data
                  </button>
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 font-mono uppercase block mb-1">Import backup JSON</label>
                  <textarea rows={4} value={importText} onChange={e => setImportText(e.target.value)}
                    placeholder='Paste exported JSON here...'
                    className="w-full bg-slate-950 border border-slate-850 rounded-lg px-3 py-2 text-slate-200 text-xs font-mono resize-none" />
                  <button onClick={handleImport} disabled={!importText.trim()}
                    className="mt-2 flex items-center gap-1.5 bg-slate-900 border border-slate-800 text-slate-300 text-xs font-bold py-2 px-4 rounded-xl disabled:opacity-50">
                    <Upload className="w-3.5 h-3.5" /> Import
                  </button>
                </div>
              </section>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
