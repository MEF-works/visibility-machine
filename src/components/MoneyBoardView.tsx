import React, { useState, useEffect, useCallback } from 'react';
import { Lead, MetricEvent, LeadStatus, LeadSource, LEAD_SOURCES, LEAD_STATUSES, Platform, PLATFORMS, LaunchCampaign } from '../types';
import { api, PLATFORM_LABELS } from '../lib/api';
import {
  DollarSign, Plus, Loader2, AlertCircle, Trash2, RefreshCw,
  Target, TrendingUp, MessageSquare,
} from 'lucide-react';

export function MoneyBoardView() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [events, setEvents] = useState<MetricEvent[]>([]);
  const [launches, setLaunches] = useState<LaunchCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<LeadStatus | 'all'>('all');

  const [leadForm, setLeadForm] = useState({
    source: 'dm' as LeadSource, platform: 'twitter' as Platform, name: '', contact: '', notes: '', value: '', launchCampaignId: '',
  });

  const [cashForm, setCashForm] = useState({ amount: '', note: '' });

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [l, e, launchesList] = await Promise.all([
        api.listLeads(filter === 'all' ? undefined : { status: filter }),
        api.listEvents(),
        api.listLaunches(),
      ]);
      setLeads(l);
      setEvents(e.filter(ev => ['cash', 'lead', 'conversion', 'offer'].includes(ev.type)).slice(0, 30));
      setLaunches(launchesList);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load.');
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  const totalCash = events.filter(e => e.type === 'cash').reduce((s, e) => s + e.value, 0);

  const pipelineValue = leads.filter(l => l.status !== 'lost' && l.status !== 'converted').reduce((s, l) => s + (l.value ?? 0), 0);

  const handleCreateLead = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createLead({
        source: leadForm.source,
        platform: leadForm.platform,
        name: leadForm.name.trim() || undefined,
        contact: leadForm.contact.trim() || undefined,
        notes: leadForm.notes.trim() || undefined,
        value: leadForm.value ? parseFloat(leadForm.value) : undefined,
        launchCampaignId: leadForm.launchCampaignId || undefined,
        status: 'new',
      });
      setLeadForm(f => ({ ...f, name: '', contact: '', notes: '', value: '' }));
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create lead.');
    }
  };

  const handleLogCash = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(cashForm.amount);
    if (!amount || amount <= 0) return;
    try {
      await api.createEvent({ type: 'cash', value: amount, note: cashForm.note.trim() || 'Manual cash entry' });
      setCashForm({ amount: '', note: '' });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to log cash.');
    }
  };

  const updateLeadStatus = async (id: string, status: LeadStatus) => {
    try {
      await api.updateLead(id, { status });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Update failed.');
    }
  };

  const handleDeleteLead = async (id: string) => {
    if (!confirm('Delete this lead?')) return;
    try {
      await api.deleteLead(id);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Delete failed.');
    }
  };

  if (loading && !leads.length) {
    return <div className="flex justify-center py-20 text-slate-400"><Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="border-b border-slate-800/50 pb-5">
        <h1 className="text-3xl font-display font-black text-slate-100 flex items-center gap-2.5">
          <DollarSign className="w-8 h-8 text-emerald-400" /> Money Board
        </h1>
        <p className="text-slate-400 text-xs mt-1">Track leads, offers, and cash — real numbers you enter, not fake analytics.</p>
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 text-red-300 text-xs p-3 rounded-xl">
          <AlertCircle className="w-4 h-4" /> {error}
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Cash Collected', value: `$${totalCash.toLocaleString()}`, icon: DollarSign, color: 'text-emerald-400' },
          { label: 'Pipeline Value', value: `$${pipelineValue.toLocaleString()}`, icon: TrendingUp, color: 'text-brand-cyan' },
          { label: 'Active Leads', value: leads.filter(l => !['converted', 'lost'].includes(l.status)).length, icon: Target, color: 'text-brand-amber' },
          { label: 'Converted', value: leads.filter(l => l.status === 'converted').length, icon: MessageSquare, color: 'text-emerald-400' },
        ].map(m => (
          <div key={m.label} className="tactical-panel p-4 rounded-xl">
            <div className="flex justify-between items-center">
              <span className="text-[9px] font-mono text-slate-500 uppercase">{m.label}</span>
              <m.icon className={`w-4 h-4 ${m.color}`} />
            </div>
            <p className="text-xl font-black text-white mt-2">{m.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        <div className="xl:col-span-4 space-y-4">
          <div className="tactical-panel rounded-2xl p-5 space-y-3">
            <h3 className="text-sm font-bold text-slate-100">Log Lead</h3>
            <form onSubmit={handleCreateLead} className="space-y-2">
              <select value={leadForm.source} onChange={e => setLeadForm(f => ({ ...f, source: e.target.value as LeadSource }))}
                className="w-full bg-slate-950 border border-slate-850 rounded-lg px-3 py-2 text-xs font-mono text-slate-200">
                {LEAD_SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <select value={leadForm.platform} onChange={e => setLeadForm(f => ({ ...f, platform: e.target.value as Platform }))}
                className="w-full bg-slate-950 border border-slate-850 rounded-lg px-3 py-2 text-xs font-mono text-slate-200">
                {PLATFORMS.map(p => <option key={p} value={p}>{PLATFORM_LABELS[p]}</option>)}
              </select>
              <input value={leadForm.name} onChange={e => setLeadForm(f => ({ ...f, name: e.target.value }))} placeholder="Name"
                className="w-full bg-slate-950 border border-slate-850 rounded-lg px-3 py-2 text-xs font-mono text-slate-200" />
              <input value={leadForm.contact} onChange={e => setLeadForm(f => ({ ...f, contact: e.target.value }))} placeholder="Contact (DM, email, handle)"
                className="w-full bg-slate-950 border border-slate-850 rounded-lg px-3 py-2 text-xs font-mono text-slate-200" />
              <input type="number" value={leadForm.value} onChange={e => setLeadForm(f => ({ ...f, value: e.target.value }))} placeholder="Potential value ($)"
                className="w-full bg-slate-950 border border-slate-850 rounded-lg px-3 py-2 text-xs font-mono text-slate-200" />
              <select value={leadForm.launchCampaignId} onChange={e => setLeadForm(f => ({ ...f, launchCampaignId: e.target.value }))}
                className="w-full bg-slate-950 border border-slate-850 rounded-lg px-3 py-2 text-xs font-mono text-slate-200">
                <option value="">Link to launch (optional)</option>
                {launches.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
              <textarea value={leadForm.notes} onChange={e => setLeadForm(f => ({ ...f, notes: e.target.value }))} placeholder="Notes" rows={2}
                className="w-full bg-slate-950 border border-slate-850 rounded-lg px-3 py-2 text-xs font-mono text-slate-200 resize-none" />
              <button type="submit" className="w-full bg-brand-amber text-slate-950 font-bold py-2 rounded-xl text-xs flex items-center justify-center gap-1">
                <Plus className="w-3.5 h-3.5" /> Add Lead
              </button>
            </form>
          </div>

          <div className="tactical-panel rounded-2xl p-5 space-y-3">
            <h3 className="text-sm font-bold text-slate-100">Log Cash</h3>
            <form onSubmit={handleLogCash} className="space-y-2">
              <input required type="number" value={cashForm.amount} onChange={e => setCashForm(f => ({ ...f, amount: e.target.value }))}
                placeholder="Amount ($)" className="w-full bg-slate-950 border border-slate-850 rounded-lg px-3 py-2 text-xs font-mono text-slate-200" />
              <input value={cashForm.note} onChange={e => setCashForm(f => ({ ...f, note: e.target.value }))}
                placeholder="Note e.g. SovPay deposit" className="w-full bg-slate-950 border border-slate-850 rounded-lg px-3 py-2 text-xs font-mono text-slate-200" />
              <button type="submit" className="w-full bg-emerald-500 text-slate-950 font-bold py-2 rounded-xl text-xs">Log Cash</button>
            </form>
          </div>
        </div>

        <div className="xl:col-span-8 space-y-4">
          <div className="flex gap-2 flex-wrap">
            {(['all', ...LEAD_STATUSES] as const).map(s => (
              <button key={s} onClick={() => setFilter(s)}
                className={`text-[10px] font-mono uppercase px-2 py-1 rounded-lg border ${filter === s ? 'border-brand-amber text-brand-amber' : 'border-slate-850 text-slate-500'}`}>
                {s}
              </button>
            ))}
            <button onClick={load} className="ml-auto text-slate-400"><RefreshCw className="w-4 h-4" /></button>
          </div>

          <div className="tactical-panel rounded-2xl p-5 space-y-2">
            <h3 className="text-sm font-bold text-slate-100">Leads Pipeline</h3>
            {leads.length === 0 ? (
              <p className="text-xs text-slate-500 font-mono py-6 text-center">No leads logged yet.</p>
            ) : leads.map(lead => (
              <div key={lead.id} className="p-3 rounded-xl bg-slate-950 border border-slate-850 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[9px] font-mono text-brand-cyan">{lead.source}</span>
                    {lead.platform && <span className="text-[9px] font-mono text-slate-600">{PLATFORM_LABELS[lead.platform]}</span>}
                    {lead.value != null && lead.value > 0 && <span className="text-[9px] font-mono text-emerald-400">${lead.value}</span>}
                  </div>
                  <p className="text-xs font-bold font-mono text-slate-200">{lead.name || lead.contact || 'Unknown'}</p>
                  {lead.notes && <p className="text-[10px] font-mono text-slate-500">{lead.notes}</p>}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <select value={lead.status} onChange={e => updateLeadStatus(lead.id, e.target.value as LeadStatus)}
                    className="bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-[10px] font-mono text-slate-300">
                    {LEAD_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <button onClick={() => handleDeleteLead(lead.id)} className="text-red-400/60 p-1"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </div>
            ))}
          </div>

          <div className="tactical-panel rounded-2xl p-5">
            <h3 className="text-sm font-bold text-slate-100 mb-2">Recent Money Events</h3>
            <div className="space-y-1 max-h-48 overflow-y-auto custom-scrollbar">
              {events.length === 0 ? (
                <p className="text-xs text-slate-500 font-mono">No events yet.</p>
              ) : events.map(ev => (
                <div key={ev.id} className="flex justify-between text-[10px] font-mono py-1 border-b border-slate-900">
                  <span className="text-slate-400">{ev.type} — {ev.note}</span>
                  <span className="text-emerald-400">{ev.type === 'cash' ? `$${ev.value}` : ev.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
