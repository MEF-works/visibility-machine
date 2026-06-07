import React, { useState, useEffect, useCallback } from 'react';
import { ProofArtifact, ProofType, AppSettings, PROOF_TYPES } from '../types';
import { api } from '../lib/api';
import {
  FolderLock, Plus, Trash2, Loader2, AlertCircle, RefreshCw,
  Link, FileText, Terminal, Image, Video, Upload,
} from 'lucide-react';

const TYPE_ICONS: Record<ProofType, React.ElementType> = {
  screenshot: Image, video: Video, url: Link, note: FileText, terminal: Terminal,
};

export function ProofVaultView() {
  const [artifacts, setArtifacts] = useState<ProofArtifact[]>([]);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const emptyForm = {
    type: 'note' as ProofType, title: '', description: '',
    project: 'General Build Log', url: '', content: '', fileName: '', mimeType: '',
  };
  const [form, setForm] = useState(emptyForm);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [a, s] = await Promise.all([api.listProof(), api.getSettings()]);
      setArtifacts(a);
      setSettings(s);
      setForm(f => ({ ...f, project: s.projects[0] || 'General Build Log' }));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load proof vault.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) { setError('Title is required.'); return; }
    setSaving(true);
    setError('');
    try {
      await api.createProof({
        type: form.type,
        title: form.title.trim(),
        description: form.description.trim(),
        project: form.project,
        url: form.url.trim() || undefined,
        content: form.content.trim() || undefined,
        fileName: form.fileName.trim() || undefined,
        mimeType: form.mimeType.trim() || undefined,
      });
      setForm({ ...emptyForm, project: settings?.projects[0] || 'General Build Log' });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed.');
    } finally {
      setSaving(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError('');
    try {
      await api.uploadProof(file, {
        title: form.title || file.name,
        description: form.description,
        project: form.project,
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed.');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this proof artifact?')) return;
    try {
      await api.deleteProof(id);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Delete failed.');
    }
  };

  if (loading && !artifacts.length) {
    return (
      <div className="flex items-center justify-center py-20 text-slate-400">
        <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading proof vault...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800/50 pb-5">
        <div>
          <h1 className="text-3xl font-display font-black text-slate-100 tracking-tight flex items-center gap-2.5">
            <FolderLock className="w-8 h-8 text-brand-cyan" />
            Proof Vault
          </h1>
          <p className="text-slate-400 text-xs mt-1 max-w-xl">
            Store screenshots, URLs, terminal output, and notes. Attach proof to build logs and posts.
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

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        <div className="xl:col-span-5 tactical-panel rounded-2xl p-6 space-y-4">
          <h3 className="text-slate-100 font-display font-bold text-sm">Add Proof Artifact</h3>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] text-slate-500 uppercase font-mono font-bold block mb-1">Type</label>
                <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value as ProofType }))}
                  className="w-full bg-slate-950 border border-slate-850 rounded-lg px-3 py-2 text-slate-200 text-xs font-mono">
                  {PROOF_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] text-slate-500 uppercase font-mono font-bold block mb-1">Project</label>
                <select value={form.project} onChange={e => setForm(f => ({ ...f, project: e.target.value }))}
                  className="w-full bg-slate-950 border border-slate-850 rounded-lg px-3 py-2 text-slate-200 text-xs font-mono">
                  {(settings?.projects || []).map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="text-[10px] text-slate-500 uppercase font-mono font-bold block mb-1">Title / filename</label>
              <input required value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder="deploy-success.png or Demo video link"
                className="w-full bg-slate-950 border border-slate-850 rounded-lg px-3 py-2 text-slate-200 text-xs font-mono focus:outline-none focus:border-brand-cyan/50" />
            </div>
            <div>
              <label className="text-[10px] text-slate-500 uppercase font-mono font-bold block mb-1">Description</label>
              <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                className="w-full bg-slate-950 border border-slate-850 rounded-lg px-3 py-2 text-slate-200 text-xs font-mono focus:outline-none" />
            </div>
            {(form.type === 'url' || form.type === 'video' || form.type === 'screenshot') && (
              <div>
                <label className="text-[10px] text-slate-500 uppercase font-mono font-bold block mb-1">URL</label>
                <input value={form.url} onChange={e => setForm(f => ({ ...f, url: e.target.value }))}
                  placeholder="https://..."
                  className="w-full bg-slate-950 border border-slate-850 rounded-lg px-3 py-2 text-slate-200 text-xs font-mono focus:outline-none" />
              </div>
            )}
            {(form.type === 'note' || form.type === 'terminal') && (
              <div>
                <label className="text-[10px] text-slate-500 uppercase font-mono font-bold block mb-1">
                  {form.type === 'terminal' ? 'Terminal / log text' : 'Note content'}
                </label>
                <textarea rows={4} value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
                  className="w-full bg-slate-950 border border-slate-850 rounded-lg px-3 py-2 text-slate-200 text-xs font-mono focus:outline-none resize-none" />
              </div>
            )}
            {(form.type === 'screenshot' || form.type === 'video') && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-slate-500 uppercase font-mono font-bold block mb-1">Filename (metadata)</label>
                  <input value={form.fileName} onChange={e => setForm(f => ({ ...f, fileName: e.target.value }))}
                    placeholder="screenshot.png"
                    className="w-full bg-slate-950 border border-slate-850 rounded-lg px-3 py-2 text-slate-200 text-xs font-mono" />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 uppercase font-mono font-bold block mb-1">MIME type</label>
                  <input value={form.mimeType} onChange={e => setForm(f => ({ ...f, mimeType: e.target.value }))}
                    placeholder="image/png"
                    className="w-full bg-slate-950 border border-slate-850 rounded-lg px-3 py-2 text-slate-200 text-xs font-mono" />
                </div>
              </div>
            )}
            <p className="text-[10px] text-slate-600 font-mono">Upload images/videos (max 50MB) or use URL/note fields below.</p>
            <label className="flex items-center justify-center gap-2 w-full border border-dashed border-slate-800 hover:border-brand-cyan/50 rounded-xl py-4 cursor-pointer transition">
              <input type="file" accept="image/*,video/*,.txt,.log" onChange={handleFileUpload} className="hidden" disabled={uploading} />
              {uploading ? <Loader2 className="w-4 h-4 animate-spin text-brand-cyan" /> : <Upload className="w-4 h-4 text-brand-cyan" />}
              <span className="text-xs font-mono text-slate-400">{uploading ? 'Uploading...' : 'Upload file'}</span>
            </label>
            <button type="submit" disabled={saving}
              className="bg-brand-cyan hover:bg-brand-cyan/90 disabled:opacity-50 text-slate-950 font-bold py-2.5 px-5 rounded-xl text-xs flex items-center gap-1.5">
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
              Add to Vault
            </button>
          </form>
        </div>

        <div className="xl:col-span-7 tactical-panel rounded-2xl p-6 space-y-3">
          <h3 className="text-slate-100 font-display font-bold text-sm">Stored Artifacts ({artifacts.length})</h3>
          {artifacts.length === 0 ? (
            <p className="text-xs text-slate-500 font-mono py-8 text-center">Vault is empty. Add your first proof artifact.</p>
          ) : (
            <div className="space-y-2 max-h-[600px] overflow-y-auto custom-scrollbar pr-1">
              {artifacts.map(a => {
                const Icon = TYPE_ICONS[a.type];
                return (
                  <div key={a.id} className="p-4 rounded-xl bg-slate-950 border border-slate-850 flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="p-2 rounded-lg bg-slate-900 border border-slate-800 shrink-0">
                        <Icon className="w-4 h-4 text-brand-cyan" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-[9px] font-mono text-brand-amber uppercase">{a.project}</span>
                          <span className="text-[9px] font-mono text-slate-600">{a.type}</span>
                        </div>
                        <p className="text-slate-200 text-xs font-bold font-mono">{a.title}</p>
                        {a.description && <p className="text-slate-500 text-[11px] font-mono mt-0.5">{a.description}</p>}
                        {a.url && (
                          a.url.startsWith('/uploads') || a.localPath ? (
                            a.mimeType?.startsWith('video/') ? (
                              <video src={a.url} controls className="mt-2 max-h-32 rounded-lg w-full" />
                            ) : a.mimeType?.startsWith('image/') || a.type === 'screenshot' ? (
                              <img src={a.url} alt={a.title} className="mt-2 max-h-32 rounded-lg object-cover" />
                            ) : (
                              <a href={a.url} target="_blank" rel="noopener noreferrer" className="text-brand-cyan text-[10px] font-mono hover:underline block mt-1">{a.url}</a>
                            )
                          ) : (
                            <a href={a.url} target="_blank" rel="noopener noreferrer"
                              className="text-brand-cyan text-[10px] font-mono hover:underline block mt-1 truncate">{a.url}</a>
                          )
                        )}
                        {a.content && (
                          <pre className="text-slate-400 text-[10px] font-mono mt-1 bg-slate-900 p-2 rounded-lg max-h-20 overflow-auto whitespace-pre-wrap">{a.content}</pre>
                        )}
                        {a.fileName && <p className="text-[10px] text-slate-600 font-mono mt-1">{a.fileName}{a.mimeType ? ` (${a.mimeType})` : ''}</p>}
                        <p className="text-[9px] text-slate-600 font-mono mt-1">{new Date(a.createdAt).toLocaleString()}</p>
                      </div>
                    </div>
                    <button onClick={() => handleDelete(a.id)} className="text-red-400/60 hover:text-red-400 shrink-0 p-1">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
