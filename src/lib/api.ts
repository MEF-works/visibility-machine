import type {
  BuildLog,
  ProofArtifact,
  PostDraft,
  AppSettings,
  DashboardMetrics,
  StorageStatus,
  GeminiStatus,
  AngleAnalysis,
  Platform,
  MetricEvent,
  LaunchCampaign,
  ScheduledDispatch,
  Lead,
  PlatformProfile,
  LaunchStatus,
  DispatchStatus,
  LeadStatus,
  DraftStatus,
  BuildLogStatus,
  BuildLogInputStrength,
} from '../types';

export class InputWeakError extends Error {
  code = 'INPUT_WEAK' as const;
  inputStrength: BuildLogInputStrength;
  constructor(message: string, inputStrength: BuildLogInputStrength) {
    super(message);
    this.name = 'InputWeakError';
    this.inputStrength = inputStrength;
  }
}

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || data.message || `Request failed: ${res.status}`);
  }
  return data as T;
}

export interface LaunchBrief {
  headline: string;
  hook: string;
  weekPlan: string[];
  offerAngle: string;
  platforms: string[];
  riskNotes?: string;
}

export const api = {
  getMetrics: () => request<DashboardMetrics>('/api/metrics'),
  updateMetrics: (patch: Partial<DashboardMetrics>) =>
    request<DashboardMetrics>('/api/metrics', { method: 'PATCH', body: JSON.stringify(patch) }),

  listBuildLogs: (params?: { project?: string; status?: BuildLogStatus; q?: string; launchCampaignId?: string }) => {
    const q = new URLSearchParams();
    if (params?.project) q.set('project', params.project);
    if (params?.status) q.set('status', params.status);
    if (params?.q) q.set('q', params.q);
    if (params?.launchCampaignId) q.set('launchCampaignId', params.launchCampaignId);
    const qs = q.toString();
    return request<BuildLog[]>(`/api/build-logs${qs ? `?${qs}` : ''}`);
  },
  createBuildLog: (data: Omit<BuildLog, 'id' | 'createdAt' | 'updatedAt'>) =>
    request<BuildLog>('/api/build-logs', { method: 'POST', body: JSON.stringify(data) }),
  updateBuildLog: (id: string, patch: Partial<BuildLog>) =>
    request<BuildLog>(`/api/build-logs/${id}`, { method: 'PATCH', body: JSON.stringify(patch) }),
  deleteBuildLog: (id: string) =>
    request<{ ok: true }>(`/api/build-logs/${id}`, { method: 'DELETE' }),

  listProof: () => request<ProofArtifact[]>('/api/proof'),
  createProof: (data: Omit<ProofArtifact, 'id' | 'createdAt'>) =>
    request<ProofArtifact>('/api/proof', { method: 'POST', body: JSON.stringify(data) }),
  uploadProof: async (file: File, meta: { title?: string; description?: string; project?: string; type?: string }) => {
    const form = new FormData();
    form.append('file', file);
    if (meta.title) form.append('title', meta.title);
    if (meta.description) form.append('description', meta.description);
    if (meta.project) form.append('project', meta.project);
    if (meta.type) form.append('type', meta.type);
    const res = await fetch('/api/proof/upload', { method: 'POST', body: form });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Upload failed.');
    return data as ProofArtifact;
  },
  updateProof: (id: string, patch: Partial<ProofArtifact>) =>
    request<ProofArtifact>(`/api/proof/${id}`, { method: 'PATCH', body: JSON.stringify(patch) }),
  deleteProof: (id: string) =>
    request<{ ok: true }>(`/api/proof/${id}`, { method: 'DELETE' }),

  listDrafts: (buildLogId?: string, status?: DraftStatus) => {
    const q = new URLSearchParams();
    if (buildLogId) q.set('buildLogId', buildLogId);
    if (status) q.set('status', status);
    const qs = q.toString();
    return request<PostDraft[]>(`/api/post-drafts${qs ? `?${qs}` : ''}`);
  },
  updateDraft: (id: string, patch: Partial<PostDraft>) =>
    request<PostDraft>(`/api/post-drafts/${id}`, { method: 'PATCH', body: JSON.stringify(patch) }),
  deleteDraft: (id: string) =>
    request<{ ok: true }>(`/api/post-drafts/${id}`, { method: 'DELETE' }),

  generateDrafts: async (
    buildLogId: string,
    opts?: { platforms?: Platform[]; force?: boolean; stronger?: boolean }
  ) => {
    const res = await fetch('/api/ai/generate-drafts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        buildLogId,
        platforms: opts?.platforms,
        force: opts?.force,
        stronger: opts?.stronger,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.status === 422 && data.code === 'INPUT_WEAK') {
      throw new InputWeakError(
        data.error || 'Build log input is too thin for strong drafts.',
        data.inputStrength
      );
    }
    if (!res.ok) throw new Error(data.error || data.message || `Request failed: ${res.status}`);
    return data as { drafts: PostDraft[]; offline?: boolean; inputStrength?: BuildLogInputStrength };
  },

  regenerateDraft: (draftId: string) =>
    request<{ draft: PostDraft; offline?: boolean }>('/api/ai/regenerate-draft', {
      method: 'POST',
      body: JSON.stringify({ draftId }),
    }),

  analyzeAngle: (content: string, platforms: Platform[]) =>
    request<{ analysis: AngleAnalysis; offline?: boolean }>('/api/ai/analyze-angle', {
      method: 'POST',
      body: JSON.stringify({ content, platforms }),
    }),

  generateLaunchBrief: (campaignId: string) =>
    request<{ brief: LaunchBrief; offline?: boolean }>('/api/ai/launch-brief', {
      method: 'POST',
      body: JSON.stringify({ campaignId }),
    }),

  chat: (messages: { role: string; text: string }[]) =>
    request<{ reply: string; offline?: boolean }>('/api/ai/chat', {
      method: 'POST',
      body: JSON.stringify({ messages }),
    }),

  listLaunches: (status?: LaunchStatus) =>
    request<LaunchCampaign[]>(status ? `/api/launches?status=${status}` : '/api/launches'),
  getLaunch: (id: string) => request<LaunchCampaign>(`/api/launches/${id}`),
  createLaunch: (data: { project: string; name: string; description?: string; targetDate?: string; offerUrl?: string; offerPrice?: number; offerCta?: string }) =>
    request<LaunchCampaign>('/api/launches', { method: 'POST', body: JSON.stringify(data) }),
  updateLaunch: (id: string, patch: Partial<LaunchCampaign>) =>
    request<LaunchCampaign>(`/api/launches/${id}`, { method: 'PATCH', body: JSON.stringify(patch) }),
  toggleChecklist: (launchId: string, itemId: string, done: boolean) =>
    request<LaunchCampaign>(`/api/launches/${launchId}/checklist/${itemId}`, {
      method: 'PATCH',
      body: JSON.stringify({ done }),
    }),
  deleteLaunch: (id: string) =>
    request<{ ok: true }>(`/api/launches/${id}`, { method: 'DELETE' }),

  listDispatches: (params?: { status?: DispatchStatus; from?: string; to?: string }) => {
    const q = new URLSearchParams();
    if (params?.status) q.set('status', params.status);
    if (params?.from) q.set('from', params.from);
    if (params?.to) q.set('to', params.to);
    const qs = q.toString();
    return request<ScheduledDispatch[]>(`/api/dispatches${qs ? `?${qs}` : ''}`);
  },
  createDispatch: (data: Omit<ScheduledDispatch, 'id' | 'createdAt' | 'updatedAt'>) =>
    request<ScheduledDispatch>('/api/dispatches', { method: 'POST', body: JSON.stringify(data) }),
  updateDispatch: (id: string, patch: Partial<ScheduledDispatch>) =>
    request<ScheduledDispatch>(`/api/dispatches/${id}`, { method: 'PATCH', body: JSON.stringify(patch) }),
  deleteDispatch: (id: string) =>
    request<{ ok: true }>(`/api/dispatches/${id}`, { method: 'DELETE' }),

  listLeads: (params?: { status?: LeadStatus; launchCampaignId?: string }) => {
    const q = new URLSearchParams();
    if (params?.status) q.set('status', params.status);
    if (params?.launchCampaignId) q.set('launchCampaignId', params.launchCampaignId);
    const qs = q.toString();
    return request<Lead[]>(`/api/leads${qs ? `?${qs}` : ''}`);
  },
  createLead: (data: Omit<Lead, 'id' | 'createdAt' | 'updatedAt'>) =>
    request<Lead>('/api/leads', { method: 'POST', body: JSON.stringify(data) }),
  updateLead: (id: string, patch: Partial<Lead>) =>
    request<Lead>(`/api/leads/${id}`, { method: 'PATCH', body: JSON.stringify(patch) }),
  deleteLead: (id: string) =>
    request<{ ok: true }>(`/api/leads/${id}`, { method: 'DELETE' }),

  listProfiles: () => request<PlatformProfile[]>('/api/profiles'),
  updateProfile: (id: string, patch: Partial<PlatformProfile>) =>
    request<PlatformProfile>(`/api/profiles/${id}`, { method: 'PATCH', body: JSON.stringify(patch) }),

  listEvents: () => request<MetricEvent[]>('/api/events'),
  createEvent: (data: Omit<MetricEvent, 'id' | 'createdAt'>) =>
    request<MetricEvent>('/api/events', { method: 'POST', body: JSON.stringify(data) }),

  getSettings: () => request<AppSettings>('/api/settings'),
  updateSettings: (patch: Partial<AppSettings>) =>
    request<AppSettings>('/api/settings', { method: 'PATCH', body: JSON.stringify(patch) }),

  getStatus: () =>
    request<{ storage: StorageStatus; gemini: GeminiStatus }>('/api/status'),

  exportBackup: () => request<unknown>('/api/backup/export'),
  importBackup: (data: unknown) =>
    request<{ ok: true }>('/api/backup/import', { method: 'POST', body: JSON.stringify(data) }),
  resetData: () => request<{ ok: true }>('/api/backup/reset', { method: 'POST' }),
};

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      return true;
    } catch {
      return false;
    }
  }
}

export function formatDraftForCopy(draft: PostDraft): string {
  const tags = draft.hashtags.length ? '\n\n' + draft.hashtags.map((t) => (t.startsWith('#') ? t : `#${t}`)).join(' ') : '';
  return `${draft.hook}\n\n${draft.body}\n\n${draft.cta}${tags}`;
}

export const PLATFORM_LABELS: Record<Platform, string> = {
  tiktok: 'TikTok', facebook: 'Facebook', youtube: 'YouTube Shorts',
  reddit: 'Reddit', twitter: 'X', linkedin: 'LinkedIn', instagram: 'Instagram',
};
