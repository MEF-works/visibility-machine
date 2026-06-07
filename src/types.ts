// Visibility Machine — core domain types

export const PLATFORMS = [
  'tiktok',
  'facebook',
  'youtube',
  'reddit',
  'twitter',
  'linkedin',
  'instagram',
] as const;

export type Platform = (typeof PLATFORMS)[number];

export const BUILD_LOG_TYPES = [
  'build',
  'fix',
  'lesson',
  'bug',
  'launch',
  'thought',
  'offer',
  'proof',
  'cash',
] as const;

export type BuildLogType = (typeof BUILD_LOG_TYPES)[number];

export const BUILD_LOG_STATUSES = [
  'captured',
  'drafted',
  'posted',
  'got_reply',
  'became_lead',
  'converted',
  'reuse_later',
] as const;

export type BuildLogStatus = (typeof BUILD_LOG_STATUSES)[number];

export const PROOF_TYPES = ['screenshot', 'video', 'url', 'note', 'terminal'] as const;
export type ProofType = (typeof PROOF_TYPES)[number];

export const DRAFT_STATUSES = ['draft', 'copied', 'posted', 'reuse_later'] as const;
export type DraftStatus = (typeof DRAFT_STATUSES)[number];

export const LAUNCH_STATUSES = ['planning', 'building', 'launching', 'live', 'complete'] as const;
export type LaunchStatus = (typeof LAUNCH_STATUSES)[number];

export const DISPATCH_STATUSES = ['scheduled', 'posted', 'skipped'] as const;
export type DispatchStatus = (typeof DISPATCH_STATUSES)[number];

export const LEAD_STATUSES = ['new', 'contacted', 'qualified', 'converted', 'lost'] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];

export const LEAD_SOURCES = ['reply', 'dm', 'email', 'comment', 'referral', 'other'] as const;
export type LeadSource = (typeof LEAD_SOURCES)[number];

export const DEFAULT_PROJECTS = [
  'SovereignStack',
  'SovPay',
  'MGMX',
  'RepairRadar',
  'PersonaStack',
  'Payment Kernel',
  'Visibility Machine',
  'General Build Log',
] as const;

export interface BuildLog {
  id: string;
  date: string;
  title: string;
  project: string;
  type: BuildLogType;
  whatHappened: string;
  whyItMatters: string;
  painPoint: string;
  offerCta: string;
  proofAttachmentIds: string[];
  status: BuildLogStatus;
  launchCampaignId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProofArtifact {
  id: string;
  type: ProofType;
  title: string;
  description: string;
  project: string;
  url?: string;
  content?: string;
  fileName?: string;
  mimeType?: string;
  localPath?: string;
  fileSize?: number;
  createdAt: string;
}

export interface PostDraft {
  id: string;
  buildLogId: string;
  platform: Platform;
  hook: string;
  body: string;
  cta: string;
  visualSuggestion: string;
  hashtags: string[];
  status: DraftStatus;
  notes?: string;
  performanceNotes?: string;
  scheduledAt?: string;
  postedAt?: string;
  replyCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface LaunchChecklistItem {
  id: string;
  label: string;
  done: boolean;
  category: 'proof' | 'content' | 'offer' | 'distribution' | 'followup';
}

export interface LaunchCampaign {
  id: string;
  project: string;
  name: string;
  description: string;
  targetDate?: string;
  status: LaunchStatus;
  checklist: LaunchChecklistItem[];
  buildLogIds: string[];
  offerUrl?: string;
  offerPrice?: number;
  offerCta?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ScheduledDispatch {
  id: string;
  postDraftId?: string;
  buildLogId?: string;
  platform: Platform;
  title: string;
  contentPreview?: string;
  scheduledAt: string;
  status: DispatchStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Lead {
  id: string;
  source: LeadSource;
  platform?: Platform;
  name?: string;
  contact?: string;
  buildLogId?: string;
  postDraftId?: string;
  launchCampaignId?: string;
  status: LeadStatus;
  value?: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PlatformProfile {
  id: string;
  platform: Platform;
  handle: string;
  followerCount: number;
  followerHistory: { date: string; count: number }[];
  notes?: string;
  updatedAt: string;
}

export interface MetricEvent {
  id: string;
  type: string;
  value: number;
  note?: string;
  buildLogId?: string;
  postDraftId?: string;
  leadId?: string;
  launchCampaignId?: string;
  createdAt: string;
}

export interface AppSettings {
  defaultPlatforms: Platform[];
  defaultCta: string;
  projects: string[];
  operatorName?: string;
  platformHandles?: Partial<Record<Platform, string>>;
}

export interface DashboardMetrics {
  buildLogsCaptured: number;
  proofArtifactsAdded: number;
  postsDrafted: number;
  postsPosted: number;
  replies: number;
  leads: number;
  offersMade: number;
  cashCollected: number;
  reuseWorthyPosts: number;
  activeLaunches: number;
  scheduledDispatches: number;
}

export interface StorageStatus {
  backend: 'json-file';
  path: string;
  buildLogs: number;
  proofArtifacts: number;
  postDrafts: number;
  metricEvents: number;
  launchCampaigns: number;
  scheduledDispatches: number;
  leads: number;
  platformProfiles: number;
  uploadsDir: string;
}

export interface GeminiStatus {
  configured: boolean;
  message: string;
}

export interface AngleAnalysis {
  proofStrength: number;
  specificityScore: number;
  moneyConnection: number;
  ctaStrength: number;
  platformFit: number;
  overallScore: number;
  isWeak: boolean;
  fixList: string[];
  strengths: string[];
  weaknesses: string[];
  improvedHook: string;
  improvedCta: string;
  platformNotes: string;
  summary: string;
}

export interface BuildLogInputStrength {
  score: number;
  level: 'weak' | 'moderate' | 'strong';
  missing: string[];
  warnings: string[];
  needsConfirmation: boolean;
}

export interface PlatformDraftPayload {
  hook: string;
  body: string;
  cta: string;
  visualSuggestion: string;
  hashtags: string[];
}

export interface AICoProducerMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: string;
}

export interface PostEdits {
  crop?: '1:1' | '16:9' | '9:16' | 'free';
  trimStart?: number;
  trimEnd?: number;
  filter?: 'normal' | 'vintage' | 'vibrant' | 'grayscale' | 'cinematic';
  textOverlay?: string;
}

export interface MediaFile {
  id: string;
  name: string;
  type: 'image' | 'video';
  url: string;
  thumbnailUrl?: string;
  duration?: number;
  size?: string;
  edits?: PostEdits;
  proofArtifactId?: string;
}

export const DEFAULT_LAUNCH_CHECKLIST: Omit<LaunchChecklistItem, 'id'>[] = [
  { label: 'Capture build log with proof', done: false, category: 'proof' },
  { label: 'Generate platform drafts in Post Factory', done: false, category: 'content' },
  { label: 'Define offer + CTA', done: false, category: 'offer' },
  { label: 'Schedule dispatch calendar slots', done: false, category: 'distribution' },
  { label: 'Post launch announcement', done: false, category: 'distribution' },
  { label: 'Reply to comments within 24h', done: false, category: 'followup' },
  { label: 'Log leads in Money Board', done: false, category: 'followup' },
  { label: 'Mark reuse-worthy content', done: false, category: 'content' },
];
