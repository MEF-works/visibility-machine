import fs from 'fs';
import path from 'path';
import type {
  BuildLog,
  ProofArtifact,
  PostDraft,
  MetricEvent,
  AppSettings,
  DashboardMetrics,
  StorageStatus,
  LaunchCampaign,
  LaunchChecklistItem,
  ScheduledDispatch,
  Lead,
  PlatformProfile,
  Platform,
  LaunchStatus,
  BuildLogStatus,
  DraftStatus,
  DispatchStatus,
} from '../src/types';
import { DEFAULT_PROJECTS, PLATFORMS, DEFAULT_LAUNCH_CHECKLIST } from '../src/types';

export interface Database {
  buildLogs: BuildLog[];
  proofArtifacts: ProofArtifact[];
  postDrafts: PostDraft[];
  metricEvents: MetricEvent[];
  launchCampaigns: LaunchCampaign[];
  scheduledDispatches: ScheduledDispatch[];
  leads: Lead[];
  platformProfiles: PlatformProfile[];
  settings: AppSettings;
  manualMetrics: Partial<DashboardMetrics>;
}

const DEFAULT_SETTINGS: AppSettings = {
  defaultPlatforms: ['tiktok', 'twitter', 'linkedin', 'instagram'],
  defaultCta: 'DM me "BUILD" if you want the stack breakdown.',
  projects: [...DEFAULT_PROJECTS],
  operatorName: 'Operator',
  platformHandles: {},
};

const DEFAULT_DB: Database = {
  buildLogs: [],
  proofArtifacts: [],
  postDrafts: [],
  metricEvents: [],
  launchCampaigns: [],
  scheduledDispatches: [],
  leads: [],
  platformProfiles: [],
  settings: DEFAULT_SETTINGS,
  manualMetrics: {},
};

let dbPath = '';
let uploadsDir = '';
let cache: Database = structuredClone(DEFAULT_DB);

function ensureDir(filePath: string) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function persist() {
  ensureDir(dbPath);
  fs.writeFileSync(dbPath, JSON.stringify(cache, null, 2), 'utf-8');
}

function migrate(parsed: Partial<Database>): Database {
  return {
    buildLogs: parsed.buildLogs ?? [],
    proofArtifacts: parsed.proofArtifacts ?? [],
    postDrafts: parsed.postDrafts ?? [],
    metricEvents: parsed.metricEvents ?? [],
    launchCampaigns: parsed.launchCampaigns ?? [],
    scheduledDispatches: parsed.scheduledDispatches ?? [],
    leads: parsed.leads ?? [],
    platformProfiles: parsed.platformProfiles ?? [],
    settings: { ...DEFAULT_SETTINGS, ...parsed.settings },
    manualMetrics: parsed.manualMetrics ?? {},
  };
}

function loadFromDisk(): Database {
  if (!fs.existsSync(dbPath)) return structuredClone(DEFAULT_DB);
  try {
    const raw = fs.readFileSync(dbPath, 'utf-8');
    return migrate(JSON.parse(raw) as Partial<Database>);
  } catch {
    return structuredClone(DEFAULT_DB);
  }
}

export function initStorage(dataDir: string) {
  dbPath = path.join(dataDir, 'visibility-machine.json');
  uploadsDir = path.join(dataDir, 'uploads');
  if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
  cache = loadFromDisk();
  if (cache.platformProfiles.length === 0) {
    seedDefaultPlatformProfiles();
  }
}

export function getStoragePath() {
  return dbPath;
}

export function getUploadsDir() {
  return uploadsDir;
}

function id(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function recordEvent(data: Omit<MetricEvent, 'id' | 'createdAt'>) {
  cache.metricEvents.unshift({
    ...data,
    id: id('me'),
    createdAt: new Date().toISOString(),
  });
  persist();
}

function seedDefaultPlatformProfiles() {
  const handles: Partial<Record<Platform, string>> = cache.settings.platformHandles ?? {};
  for (const platform of PLATFORMS) {
    cache.platformProfiles.push({
      id: id('pp'),
      platform,
      handle: handles[platform] || `@your_${platform}`,
      followerCount: 0,
      followerHistory: [{ date: new Date().toISOString().slice(0, 10), count: 0 }],
      updatedAt: new Date().toISOString(),
    });
  }
  persist();
}

// --- Build Logs ---

export function listBuildLogs(filters?: { project?: string; status?: BuildLogStatus; launchCampaignId?: string; q?: string }): BuildLog[] {
  let logs = [...cache.buildLogs];
  if (filters?.project) logs = logs.filter((b) => b.project === filters.project);
  if (filters?.status) logs = logs.filter((b) => b.status === filters.status);
  if (filters?.launchCampaignId) logs = logs.filter((b) => b.launchCampaignId === filters.launchCampaignId);
  if (filters?.q) {
    const q = filters.q.toLowerCase();
    logs = logs.filter(
      (b) =>
        b.title.toLowerCase().includes(q) ||
        b.whatHappened.toLowerCase().includes(q) ||
        b.project.toLowerCase().includes(q)
    );
  }
  return logs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export function getBuildLog(logId: string): BuildLog | undefined {
  return cache.buildLogs.find((b) => b.id === logId);
}

export function createBuildLog(data: Omit<BuildLog, 'id' | 'createdAt' | 'updatedAt'>): BuildLog {
  const now = new Date().toISOString();
  const entry: BuildLog = { ...data, id: id('bl'), createdAt: now, updatedAt: now };
  cache.buildLogs.unshift(entry);
  recordEvent({ type: 'build_log', value: 1, note: entry.title, buildLogId: entry.id });
  if (data.launchCampaignId) {
    const campaign = getLaunchCampaign(data.launchCampaignId);
    if (campaign && !campaign.buildLogIds.includes(entry.id)) {
      updateLaunchCampaign(data.launchCampaignId, { buildLogIds: [...campaign.buildLogIds, entry.id] });
    }
  }
  persist();
  return entry;
}

export function updateBuildLog(logId: string, patch: Partial<BuildLog>): BuildLog | null {
  const idx = cache.buildLogs.findIndex((b) => b.id === logId);
  if (idx === -1) return null;
  const prev = cache.buildLogs[idx];
  cache.buildLogs[idx] = { ...prev, ...patch, id: logId, updatedAt: new Date().toISOString() };
  const next = cache.buildLogs[idx];

  if (patch.status && patch.status !== prev.status) {
    const statusEvents: Partial<Record<BuildLogStatus, { type: string; value: number }>> = {
      posted: { type: 'post', value: 1 },
      got_reply: { type: 'reply', value: 1 },
      became_lead: { type: 'lead', value: 1 },
      converted: { type: 'conversion', value: 1 },
      reuse_later: { type: 'reuse', value: 1 },
    };
    const ev = statusEvents[patch.status];
    if (ev) recordEvent({ ...ev, note: next.title, buildLogId: logId });
  }
  if (patch.type === 'offer' && prev.type !== 'offer') {
    recordEvent({ type: 'offer', value: 1, note: next.title, buildLogId: logId });
  }
  if (patch.type === 'cash' && prev.type !== 'cash') {
    recordEvent({ type: 'cash', value: 0, note: next.title, buildLogId: logId });
  }

  persist();
  return next;
}

export function deleteBuildLog(logId: string): boolean {
  const before = cache.buildLogs.length;
  cache.buildLogs = cache.buildLogs.filter((b) => b.id !== logId);
  cache.postDrafts = cache.postDrafts.filter((d) => d.buildLogId !== logId);
  cache.scheduledDispatches = cache.scheduledDispatches.filter((d) => d.buildLogId !== logId);
  if (cache.buildLogs.length === before) return false;
  persist();
  return true;
}

// --- Proof ---

export function listProofArtifacts(): ProofArtifact[] {
  return [...cache.proofArtifacts].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export function createProofArtifact(data: Omit<ProofArtifact, 'id' | 'createdAt'>): ProofArtifact {
  const entry: ProofArtifact = { ...data, id: id('pf'), createdAt: new Date().toISOString() };
  cache.proofArtifacts.unshift(entry);
  recordEvent({ type: 'proof', value: 1, note: entry.title });
  persist();
  return entry;
}

export function updateProofArtifact(artifactId: string, patch: Partial<ProofArtifact>): ProofArtifact | null {
  const idx = cache.proofArtifacts.findIndex((p) => p.id === artifactId);
  if (idx === -1) return null;
  cache.proofArtifacts[idx] = { ...cache.proofArtifacts[idx], ...patch, id: artifactId };
  persist();
  return cache.proofArtifacts[idx];
}

export function deleteProofArtifact(artifactId: string): boolean {
  const artifact = cache.proofArtifacts.find((p) => p.id === artifactId);
  if (!artifact) return false;
  if (artifact.localPath) {
    const full = path.join(uploadsDir, artifact.localPath);
    if (fs.existsSync(full)) fs.unlinkSync(full);
  }
  cache.proofArtifacts = cache.proofArtifacts.filter((p) => p.id !== artifactId);
  cache.buildLogs = cache.buildLogs.map((b) => ({
    ...b,
    proofAttachmentIds: b.proofAttachmentIds.filter((pid) => pid !== artifactId),
  }));
  persist();
  return true;
}

// --- Post Drafts ---

export function listPostDrafts(buildLogId?: string, status?: DraftStatus): PostDraft[] {
  let drafts = [...cache.postDrafts];
  if (buildLogId) drafts = drafts.filter((d) => d.buildLogId === buildLogId);
  if (status) drafts = drafts.filter((d) => d.status === status);
  return drafts.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}

export function getPostDraft(draftId: string): PostDraft | undefined {
  return cache.postDrafts.find((d) => d.id === draftId);
}

export function upsertPostDrafts(drafts: Omit<PostDraft, 'id' | 'createdAt' | 'updatedAt'>[]): PostDraft[] {
  const now = new Date().toISOString();
  const saved: PostDraft[] = [];
  for (const draft of drafts) {
    const existing = cache.postDrafts.find(
      (d) => d.buildLogId === draft.buildLogId && d.platform === draft.platform
    );
    if (existing) {
      Object.assign(existing, draft, { updatedAt: now });
      saved.push(existing);
    } else {
      const entry: PostDraft = { ...draft, id: id('pd'), createdAt: now, updatedAt: now };
      cache.postDrafts.unshift(entry);
      recordEvent({ type: 'draft', value: 1, note: `${draft.platform} draft`, buildLogId: draft.buildLogId, postDraftId: entry.id });
      saved.push(entry);
    }
  }
  persist();
  return saved;
}

export function updatePostDraft(draftId: string, patch: Partial<PostDraft>): PostDraft | null {
  const idx = cache.postDrafts.findIndex((d) => d.id === draftId);
  if (idx === -1) return null;
  const prev = cache.postDrafts[idx];
  cache.postDrafts[idx] = { ...prev, ...patch, id: draftId, updatedAt: new Date().toISOString() };
  const next = cache.postDrafts[idx];

  if (patch.status === 'posted' && prev.status !== 'posted') {
    if (!next.postedAt) next.postedAt = new Date().toISOString();
    recordEvent({ type: 'post', value: 1, note: `${next.platform} posted`, buildLogId: next.buildLogId, postDraftId: draftId });
  }
  if (patch.status === 'reuse_later' && prev.status !== 'reuse_later') {
    recordEvent({ type: 'reuse', value: 1, note: `${next.platform} reuse`, postDraftId: draftId });
  }
  if (patch.replyCount !== undefined && patch.replyCount > (prev.replyCount ?? 0)) {
    const delta = patch.replyCount - (prev.replyCount ?? 0);
    recordEvent({ type: 'reply', value: delta, note: `${next.platform} replies`, postDraftId: draftId });
  }

  persist();
  return next;
}

export function deletePostDraft(draftId: string): boolean {
  const before = cache.postDrafts.length;
  cache.postDrafts = cache.postDrafts.filter((d) => d.id !== draftId);
  if (cache.postDrafts.length === before) return false;
  persist();
  return true;
}

// --- Launch Campaigns ---

export function listLaunchCampaigns(status?: LaunchStatus): LaunchCampaign[] {
  let campaigns = [...cache.launchCampaigns];
  if (status) campaigns = campaigns.filter((c) => c.status === status);
  return campaigns.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}

export function getLaunchCampaign(campaignId: string): LaunchCampaign | undefined {
  return cache.launchCampaigns.find((c) => c.id === campaignId);
}

export function createLaunchCampaign(data: {
  project: string;
  name: string;
  description?: string;
  targetDate?: string;
  offerUrl?: string;
  offerPrice?: number;
  offerCta?: string;
}): LaunchCampaign {
  const now = new Date().toISOString();
  const checklist: LaunchChecklistItem[] = DEFAULT_LAUNCH_CHECKLIST.map((item) => ({
    ...item,
    id: id('chk'),
  }));
  const campaign: LaunchCampaign = {
    id: id('lc'),
    project: data.project,
    name: data.name,
    description: data.description ?? '',
    targetDate: data.targetDate,
    status: 'planning',
    checklist,
    buildLogIds: [],
    offerUrl: data.offerUrl,
    offerPrice: data.offerPrice,
    offerCta: data.offerCta ?? cache.settings.defaultCta,
    createdAt: now,
    updatedAt: now,
  };
  cache.launchCampaigns.unshift(campaign);
  recordEvent({ type: 'launch', value: 1, note: campaign.name, launchCampaignId: campaign.id });
  persist();
  return campaign;
}

export function updateLaunchCampaign(campaignId: string, patch: Partial<LaunchCampaign>): LaunchCampaign | null {
  const idx = cache.launchCampaigns.findIndex((c) => c.id === campaignId);
  if (idx === -1) return null;
  cache.launchCampaigns[idx] = {
    ...cache.launchCampaigns[idx],
    ...patch,
    id: campaignId,
    updatedAt: new Date().toISOString(),
  };
  persist();
  return cache.launchCampaigns[idx];
}

export function toggleChecklistItem(campaignId: string, itemId: string, done: boolean): LaunchCampaign | null {
  const campaign = getLaunchCampaign(campaignId);
  if (!campaign) return null;
  const checklist = campaign.checklist.map((item) =>
    item.id === itemId ? { ...item, done } : item
  );
  return updateLaunchCampaign(campaignId, { checklist });
}

export function deleteLaunchCampaign(campaignId: string): boolean {
  const before = cache.launchCampaigns.length;
  cache.launchCampaigns = cache.launchCampaigns.filter((c) => c.id !== campaignId);
  cache.buildLogs = cache.buildLogs.map((b) =>
    b.launchCampaignId === campaignId ? { ...b, launchCampaignId: undefined } : b
  );
  if (cache.launchCampaigns.length === before) return false;
  persist();
  return true;
}

// --- Scheduled Dispatches ---

export function listScheduledDispatches(filters?: { status?: DispatchStatus; from?: string; to?: string }): ScheduledDispatch[] {
  let items = [...cache.scheduledDispatches];
  if (filters?.status) items = items.filter((d) => d.status === filters.status);
  if (filters?.from) items = items.filter((d) => d.scheduledAt >= filters.from!);
  if (filters?.to) items = items.filter((d) => d.scheduledAt <= filters.to!);
  return items.sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());
}

export function createScheduledDispatch(
  data: Omit<ScheduledDispatch, 'id' | 'createdAt' | 'updatedAt'>
): ScheduledDispatch {
  const now = new Date().toISOString();
  const entry: ScheduledDispatch = { ...data, id: id('sd'), createdAt: now, updatedAt: now };
  cache.scheduledDispatches.push(entry);
  recordEvent({ type: 'schedule', value: 1, note: entry.title, postDraftId: entry.postDraftId, buildLogId: entry.buildLogId });
  persist();
  return entry;
}

export function updateScheduledDispatch(dispatchId: string, patch: Partial<ScheduledDispatch>): ScheduledDispatch | null {
  const idx = cache.scheduledDispatches.findIndex((d) => d.id === dispatchId);
  if (idx === -1) return null;
  const prev = cache.scheduledDispatches[idx];
  cache.scheduledDispatches[idx] = {
    ...prev,
    ...patch,
    id: dispatchId,
    updatedAt: new Date().toISOString(),
  };
  if (patch.status === 'posted' && prev.status !== 'posted') {
    recordEvent({ type: 'post', value: 1, note: prev.title, postDraftId: prev.postDraftId, buildLogId: prev.buildLogId });
  }
  persist();
  return cache.scheduledDispatches[idx];
}

export function deleteScheduledDispatch(dispatchId: string): boolean {
  const before = cache.scheduledDispatches.length;
  cache.scheduledDispatches = cache.scheduledDispatches.filter((d) => d.id !== dispatchId);
  if (cache.scheduledDispatches.length === before) return false;
  persist();
  return true;
}

// --- Leads ---

export function listLeads(filters?: { status?: Lead['status']; launchCampaignId?: string }): Lead[] {
  let items = [...cache.leads];
  if (filters?.status) items = items.filter((l) => l.status === filters.status);
  if (filters?.launchCampaignId) items = items.filter((l) => l.launchCampaignId === filters.launchCampaignId);
  return items.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}

export function createLead(data: Omit<Lead, 'id' | 'createdAt' | 'updatedAt'>): Lead {
  const now = new Date().toISOString();
  const entry: Lead = { ...data, id: id('ld'), createdAt: now, updatedAt: now };
  cache.leads.unshift(entry);
  recordEvent({
    type: 'lead',
    value: 1,
    note: entry.name || entry.contact || 'New lead',
    leadId: entry.id,
    buildLogId: entry.buildLogId,
    postDraftId: entry.postDraftId,
    launchCampaignId: entry.launchCampaignId,
  });
  persist();
  return entry;
}

export function updateLead(leadId: string, patch: Partial<Lead>): Lead | null {
  const idx = cache.leads.findIndex((l) => l.id === leadId);
  if (idx === -1) return null;
  const prev = cache.leads[idx];
  cache.leads[idx] = { ...prev, ...patch, id: leadId, updatedAt: new Date().toISOString() };
  const next = cache.leads[idx];

  if (patch.status === 'converted' && prev.status !== 'converted') {
    recordEvent({
      type: 'conversion',
      value: next.value ?? 1,
      note: next.name || 'Lead converted',
      leadId,
      launchCampaignId: next.launchCampaignId,
    });
    if (next.value && next.value > 0) {
      recordEvent({ type: 'cash', value: next.value, note: `Cash from ${next.name || 'lead'}`, leadId });
    }
  }
  persist();
  return next;
}

export function deleteLead(leadId: string): boolean {
  const before = cache.leads.length;
  cache.leads = cache.leads.filter((l) => l.id !== leadId);
  if (cache.leads.length === before) return false;
  persist();
  return true;
}

// --- Platform Profiles ---

export function listPlatformProfiles(): PlatformProfile[] {
  return [...cache.platformProfiles].sort((a, b) => a.platform.localeCompare(b.platform));
}

export function updatePlatformProfile(profileId: string, patch: Partial<PlatformProfile>): PlatformProfile | null {
  const idx = cache.platformProfiles.findIndex((p) => p.id === profileId);
  if (idx === -1) return null;
  const prev = cache.platformProfiles[idx];
  const next = {
    ...prev,
    ...patch,
    id: profileId,
    updatedAt: new Date().toISOString(),
  };

  if (patch.followerCount !== undefined && patch.followerCount !== prev.followerCount) {
    const today = new Date().toISOString().slice(0, 10);
    const history = [...prev.followerHistory];
    const lastEntry = history[history.length - 1];
    if (lastEntry?.date === today) {
      history[history.length - 1] = { date: today, count: patch.followerCount };
    } else {
      history.push({ date: today, count: patch.followerCount });
    }
    next.followerHistory = history.slice(-90);
    const growth = patch.followerCount - prev.followerCount;
    if (growth > 0) {
      recordEvent({ type: 'follower_growth', value: growth, note: `${prev.platform} +${growth}` });
    }
  }

  cache.platformProfiles[idx] = next;
  persist();
  return next;
}

// --- Metrics ---

export function listMetricEvents(limit = 100): MetricEvent[] {
  return [...cache.metricEvents]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, limit);
}

export function createMetricEvent(data: Omit<MetricEvent, 'id' | 'createdAt'>): MetricEvent {
  const entry: MetricEvent = { ...data, id: id('me'), createdAt: new Date().toISOString() };
  cache.metricEvents.unshift(entry);
  persist();
  return entry;
}

export function computeDashboardMetrics(): DashboardMetrics {
  const m = cache.manualMetrics;
  const drafts = cache.postDrafts;
  const replyFromDrafts = drafts.reduce((s, d) => s + (d.replyCount ?? 0), 0);
  const eventReplies = cache.metricEvents.filter((e) => e.type === 'reply').reduce((s, e) => s + e.value, 0);
  const eventLeads = cache.leads.length;
  const eventCash = cache.metricEvents.filter((e) => e.type === 'cash').reduce((s, e) => s + e.value, 0);
  const convertedValue = cache.leads.filter((l) => l.status === 'converted').reduce((s, l) => s + (l.value ?? 0), 0);

  return {
    buildLogsCaptured: m.buildLogsCaptured ?? cache.buildLogs.length,
    proofArtifactsAdded: m.proofArtifactsAdded ?? cache.proofArtifacts.length,
    postsDrafted: m.postsDrafted ?? drafts.filter((d) => d.status === 'draft' || d.status === 'copied').length,
    postsPosted:
      m.postsPosted ??
      drafts.filter((d) => d.status === 'posted').length +
        cache.scheduledDispatches.filter((d) => d.status === 'posted').length,
    replies:
      m.replies ??
      Math.max(replyFromDrafts, eventReplies, cache.buildLogs.filter((b) => b.status === 'got_reply').length),
    leads:
      m.leads ??
      Math.max(eventLeads, cache.buildLogs.filter((b) => b.status === 'became_lead' || b.status === 'converted').length),
    offersMade: m.offersMade ?? cache.buildLogs.filter((b) => b.type === 'offer').length + cache.launchCampaigns.filter((c) => c.offerUrl).length,
    cashCollected: m.cashCollected ?? Math.max(eventCash, convertedValue),
    reuseWorthyPosts:
      m.reuseWorthyPosts ??
      drafts.filter((d) => d.status === 'reuse_later').length +
        cache.buildLogs.filter((b) => b.status === 'reuse_later').length,
    activeLaunches:
      m.activeLaunches ?? cache.launchCampaigns.filter((c) => c.status !== 'complete').length,
    scheduledDispatches:
      m.scheduledDispatches ?? cache.scheduledDispatches.filter((d) => d.status === 'scheduled').length,
  };
}

export function updateManualMetrics(patch: Partial<DashboardMetrics>): DashboardMetrics {
  cache.manualMetrics = { ...cache.manualMetrics, ...patch };
  persist();
  return computeDashboardMetrics();
}

// --- Settings ---

export function getSettings(): AppSettings {
  return { ...cache.settings };
}

export function updateSettings(patch: Partial<AppSettings>): AppSettings {
  cache.settings = {
    ...cache.settings,
    ...patch,
    projects: patch.projects ?? cache.settings.projects,
    defaultPlatforms: patch.defaultPlatforms ?? cache.settings.defaultPlatforms,
    platformHandles: patch.platformHandles ?? cache.settings.platformHandles,
  };
  persist();
  return cache.settings;
}

// --- Backup ---

export function exportBackup(): Database {
  return structuredClone(cache);
}

export function importBackup(data: unknown): { ok: true } | { ok: false; error: string } {
  if (!data || typeof data !== 'object') {
    return { ok: false, error: 'Backup must be a JSON object.' };
  }
  cache = migrate(data as Partial<Database>);
  persist();
  return { ok: true };
}

export function resetDemoData(): void {
  cache = structuredClone(DEFAULT_DB);
  persist();
  seedDefaultPlatformProfiles();
}

export function getStorageStatus(): StorageStatus {
  return {
    backend: 'json-file',
    path: dbPath,
    buildLogs: cache.buildLogs.length,
    proofArtifacts: cache.proofArtifacts.length,
    postDrafts: cache.postDrafts.length,
    metricEvents: cache.metricEvents.length,
    launchCampaigns: cache.launchCampaigns.length,
    scheduledDispatches: cache.scheduledDispatches.length,
    leads: cache.leads.length,
    platformProfiles: cache.platformProfiles.length,
    uploadsDir,
  };
}

export function validatePlatforms(platforms: string[]): platforms is Platform[] {
  return platforms.every((p) => (PLATFORMS as readonly string[]).includes(p));
}
