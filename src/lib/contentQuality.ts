import type { BuildLog, Platform, ProofArtifact, PostDraft } from '../types';

export interface BuildLogInputStrength {
  score: number;
  level: 'weak' | 'moderate' | 'strong';
  missing: string[];
  warnings: string[];
  needsConfirmation: boolean;
}

const FIELD_LABELS = {
  whatHappened: 'What Happened',
  whyItMatters: 'Why It Matters',
  painPoint: 'Pain Point',
  offerCta: 'Offer / CTA',
} as const;

type InputField = keyof typeof FIELD_LABELS;

export function assessBuildLogInput(log: {
  whatHappened?: string;
  whyItMatters?: string;
  painPoint?: string;
  offerCta?: string;
  proofAttachmentIds?: string[];
  title?: string;
}): BuildLogInputStrength {
  const missing: string[] = [];
  const warnings: string[] = [];

  const fields: InputField[] = ['whatHappened', 'whyItMatters', 'painPoint', 'offerCta'];
  for (const key of fields) {
    const val = log[key]?.trim();
    if (!val) missing.push(FIELD_LABELS[key]);
  }

  const whatLen = log.whatHappened?.trim().length ?? 0;
  if (whatLen > 0 && whatLen < 60) {
    warnings.push('What Happened is thin — add specifics: numbers, before/after, file names, outcomes.');
  }
  if (!log.proofAttachmentIds?.length) {
    warnings.push('No proof attached — drafts will lack concrete evidence. Add proof in Proof Vault first.');
  }
  if (missing.length > 0) {
    warnings.push(`Missing: ${missing.join(', ')}. Generic drafts are guaranteed without these.`);
  }

  let score = 0;
  if (log.whatHappened?.trim()) score += whatLen >= 120 ? 35 : whatLen >= 60 ? 25 : 12;
  if (log.whyItMatters?.trim()) score += 20;
  if (log.painPoint?.trim()) score += 20;
  if (log.offerCta?.trim()) score += 15;
  if (log.proofAttachmentIds?.length) score += 10;

  const level: BuildLogInputStrength['level'] =
    score >= 75 ? 'strong' : score >= 45 ? 'moderate' : 'weak';

  return {
    score,
    level,
    missing,
    warnings,
    needsConfirmation: missing.length > 0 || level === 'weak',
  };
}

const GENERIC_PATTERNS = [
  /real build update/i,
  /here'?s why it matters/i,
  /pain point:/i,
  /template draft/i,
  /no content yet/i,
];

export function isDraftWeak(draft: PostDraft): boolean {
  const combined = `${draft.hook} ${draft.body} ${draft.cta}`;
  if (GENERIC_PATTERNS.some((p) => p.test(combined))) return true;
  if (draft.body.trim().length < 80) return true;
  if (!draft.hook.trim() || draft.hook.length < 20) return true;
  // No concrete signal: digits, proof words, or platform-specific structure
  const hasConcrete =
    /\d/.test(combined) ||
    /screenshot|deploy|shipped|fixed|built|launched|error|terminal|demo|repo|commit/i.test(combined);
  if (!hasConcrete && draft.body.length < 150) return true;
  return false;
}

function clip(text: string, max: number): string {
  const t = text.trim();
  if (t.length <= max) return t;
  return t.slice(0, max - 1).trim() + '…';
}

function proofLine(proofs: ProofArtifact[]): string {
  if (!proofs.length) return '';
  return proofs
    .slice(0, 2)
    .map((p) => {
      if (p.type === 'terminal' || p.type === 'note') return `Proof: ${clip(p.content || p.title, 80)}`;
      if (p.url) return `Proof: ${p.title} (${p.url})`;
      return `Proof: ${p.title}${p.description ? ` — ${p.description}` : ''}`;
    })
    .join('\n');
}

type PlatformStyle = {
  hook: (ctx: DraftContext) => string;
  body: (ctx: DraftContext) => string;
  visual: string;
  tags: string[];
};

interface DraftContext {
  log: BuildLog;
  proofs: ProofArtifact[];
  cta: string;
  stronger: boolean;
}

const PLATFORM_STYLES: Record<Platform, PlatformStyle> = {
  tiktok: {
    hook: ({ log, stronger }) =>
      stronger
        ? `Stop scrolling if ${clip(log.painPoint || 'you ship in private', 70)} — I just ${clip(log.whatHappened, 55)}.`
        : `${clip(log.title, 50)}: ${clip(log.painPoint || log.whatHappened, 65)}`,
    body: ({ log, proofs }) =>
      `[On cam + screen record]\n${clip(log.whatHappened, 200)}\n\n${log.whyItMatters ? `Why: ${clip(log.whyItMatters, 120)}` : ''}\n${proofLine(proofs)}`.trim(),
    visual: 'Screen record the exact moment + your face in corner. Show proof in first 2 seconds.',
    tags: ['buildinpublic', 'indiehacker', 'devtok'],
  },
  twitter: {
    hook: ({ log }) => clip(`I ${log.type === 'fix' ? 'fixed' : 'shipped'} this on ${log.project}: ${log.title}`, 100),
    body: ({ log, proofs, stronger }) => {
      const parts = [
        stronger ? `Problem: ${clip(log.painPoint, 120)}` : log.painPoint ? `Problem: ${clip(log.painPoint, 100)}` : '',
        clip(log.whatHappened, stronger ? 220 : 180),
        log.whyItMatters ? `Why it matters: ${clip(log.whyItMatters, 120)}` : '',
        proofLine(proofs),
      ].filter(Boolean);
      return parts.join('\n\n');
    },
    visual: 'Single screenshot or terminal output. Quote-tweet with proof image.',
    tags: ['buildinpublic', 'indiehacker'],
  },
  linkedin: {
    hook: ({ log, stronger }) =>
      stronger
        ? `Most ${log.project} builders lose visibility because ${clip(log.painPoint || 'they never show proof', 80)}.`
        : `${clip(log.title, 70)} — a ${log.project} build update.`,
    body: ({ log, proofs }) =>
      [
        clip(log.whatHappened, 280),
        log.whyItMatters ? `\n\nWhy this matters:\n${clip(log.whyItMatters, 200)}` : '',
        log.painPoint ? `\n\nPain it solves:\n${clip(log.painPoint, 160)}` : '',
        proofLine(proofs) ? `\n\n${proofLine(proofs)}` : '',
      ].join(''),
    visual: 'Outcome headline on screenshot. Line breaks every 1-2 sentences.',
    tags: ['buildinpublic', 'founder', 'saas'],
  },
  instagram: {
    hook: ({ log }) => `Slide 1: ${clip(log.painPoint || log.title, 60)}`,
    body: ({ log, proofs }) =>
      [
        `Slide 2: ${clip(log.whatHappened, 120)}`,
        log.whyItMatters ? `Slide 3: ${clip(log.whyItMatters, 100)}` : '',
        proofLine(proofs) ? `Slide 4: ${proofLine(proofs).replace('\n', ' ')}` : '',
        `Slide 5: CTA below`,
      ].filter(Boolean).join('\n'),
    visual: 'Carousel: problem → build → proof → CTA. Consistent template.',
    tags: ['buildinpublic', 'founder'],
  },
  youtube: {
    hook: ({ log, stronger }) =>
      stronger
        ? `[First frame: result on screen] "${clip(log.title, 50)} — watch this in 60 seconds."`
        : `Here's what I ${log.type === 'fix' ? 'fixed' : 'built'} on ${log.project} today.`,
    body: ({ log, proofs }) =>
      `[Spoken script]\n${clip(log.whatHappened, 250)}\n${log.whyItMatters ? `\n${clip(log.whyItMatters, 150)}` : ''}\n${proofLine(proofs)}`.trim(),
    visual: 'Bold text hook in first 2s. Screen capture of the proof moment.',
    tags: ['buildinpublic', 'shorts'],
  },
  reddit: {
    hook: ({ log }) => `[${log.project}] ${clip(log.title, 80)}`,
    body: ({ log, proofs }) =>
      [
        `**What I did:** ${clip(log.whatHappened, 300)}`,
        log.whyItMatters ? `\n\n**Why it matters:** ${clip(log.whyItMatters, 200)}` : '',
        log.painPoint ? `\n\n**Problem context:** ${clip(log.painPoint, 200)}` : '',
        proofLine(proofs) ? `\n\n**Proof:** ${proofLine(proofs).replace(/\n/g, ' ')}` : '',
      ].join(''),
    visual: 'Clean screenshot + demo link in comments if available.',
    tags: [],
  },
  facebook: {
    hook: ({ log }) => `Building ${log.project} in public: ${clip(log.title, 60)}`,
    body: ({ log, proofs }) =>
      [
        clip(log.whatHappened, 250),
        log.painPoint ? `\n\nIf you've ever dealt with ${clip(log.painPoint, 100)} — this one's for you.` : '',
        log.whyItMatters ? `\n\n${clip(log.whyItMatters, 150)}` : '',
        proofLine(proofs),
      ].filter(Boolean).join('\n'),
    visual: 'Native video or before/after images. Ask a question in the post.',
    tags: ['buildinpublic', 'startup'],
  },
};

export function buildOfflineDraft(
  log: BuildLog,
  platform: Platform,
  proofs: ProofArtifact[],
  defaultCta: string,
  stronger = false
): { hook: string; body: string; cta: string; visualSuggestion: string; hashtags: string[] } {
  const style = PLATFORM_STYLES[platform];
  const cta = log.offerCta?.trim() || defaultCta;
  const ctx: DraftContext = { log, proofs, cta, stronger };
  return {
    hook: style.hook(ctx),
    body: style.body(ctx),
    cta: stronger
      ? `${cta} Reply with "${log.project.toUpperCase().slice(0, 6)}" if you want the breakdown.`
      : cta,
    visualSuggestion: style.visual,
    hashtags: style.tags,
  };
}

export function offlineAngleAnalysis(
  content: string,
  defaultCta: string
): import('../types').AngleAnalysis {
  const hasProof = /proof|screenshot|deploy|shipped|built|demo|terminal|commit|\d+/i.test(content);
  const hasPain = /problem|pain|struggle|waste|broken|fix|issue/i.test(content);
  const hasMoney = /\$|revenue|lead|client|sale|offer|paid|cash|convert/i.test(content);
  const hasCta = /dm|reply|comment|link|sign up|join|message|reach/i.test(content);
  const isSpecific = content.length > 120 && (/\d/.test(content) || content.split('\n').length >= 3);

  const proofStrength = hasProof ? 62 : 28;
  const specificityScore = isSpecific ? 58 : content.length < 60 ? 22 : 40;
  const moneyConnection = hasMoney ? 55 : 25;
  const ctaStrength = hasCta ? 52 : 20;
  const platformFit = content.length > 40 ? 50 : 30;
  const overallScore = Math.round(
    (proofStrength + specificityScore + moneyConnection + ctaStrength + platformFit) / 5
  );
  const isWeak = overallScore < 55 ||
    [proofStrength, specificityScore, moneyConnection, ctaStrength, platformFit].some((s) => s < 40);

  const fixList: string[] = [];
  if (proofStrength < 50) fixList.push('Add a specific proof element: screenshot, metric, filename, or terminal output.');
  if (specificityScore < 50) fixList.push('Replace vague claims with exact steps, numbers, or before/after.');
  if (moneyConnection < 50) fixList.push('Connect this build to money: who pays, what offer, what lead action.');
  if (ctaStrength < 50) fixList.push(`Weak CTA. Tell them exactly what to do: "${defaultCta}"`);
  if (platformFit < 50) fixList.push('Format for one platform — shorten hooks, add line breaks, match native tone.');

  return {
    proofStrength,
    specificityScore,
    moneyConnection,
    ctaStrength,
    platformFit,
    overallScore,
    isWeak,
    fixList,
    strengths: hasProof ? ['Contains concrete proof signals.'] : [],
    weaknesses: isWeak ? ['Draft reads generic or incomplete for public proof.'] : [],
    improvedHook: content.split('\n')[0]?.trim() || content.slice(0, 100),
    improvedCta: defaultCta,
    platformNotes: 'Offline heuristic scan. Connect GEMINI_API_KEY for full platform-specific analysis.',
    summary: isWeak
      ? 'This draft will not convert as-is. Fix the list below before posting.'
      : 'Baseline pass — still tighten proof and CTA before posting.',
  };
}
