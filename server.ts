import express from "express";
import path from "path";
import multer from "multer";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";
import {
  initStorage,
  getUploadsDir,
  listBuildLogs,
  getBuildLog,
  createBuildLog,
  updateBuildLog,
  deleteBuildLog,
  listProofArtifacts,
  createProofArtifact,
  updateProofArtifact,
  deleteProofArtifact,
  listPostDrafts,
  getPostDraft,
  upsertPostDrafts,
  updatePostDraft,
  deletePostDraft,
  computeDashboardMetrics,
  updateManualMetrics,
  getSettings,
  updateSettings,
  exportBackup,
  importBackup,
  resetDemoData,
  getStorageStatus,
  createMetricEvent,
  listMetricEvents,
  listLaunchCampaigns,
  getLaunchCampaign,
  createLaunchCampaign,
  updateLaunchCampaign,
  toggleChecklistItem,
  deleteLaunchCampaign,
  listScheduledDispatches,
  createScheduledDispatch,
  updateScheduledDispatch,
  deleteScheduledDispatch,
  listLeads,
  createLead,
  updateLead,
  deleteLead,
  listPlatformProfiles,
  updatePlatformProfile,
} from "./server/storage";
import type { Platform, PlatformDraftPayload } from "./src/types";
import { PLATFORMS } from "./src/types";
import {
  assessBuildLogInput,
  buildOfflineDraft,
  offlineAngleAnalysis,
} from "./src/lib/contentQuality";

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const DATA_DIR = path.join(process.cwd(), "data");

initStorage(DATA_DIR);

app.use(express.json({ limit: "50mb" }));
app.use("/uploads", express.static(getUploadsDir()));

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, getUploadsDir()),
    filename: (_req, file, cb) =>
      cb(null, `${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_")}`),
  }),
  limits: { fileSize: 50 * 1024 * 1024 },
});

// ----------------------------------------------------
// Gemini client
// ----------------------------------------------------

let aiClient: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "MY_GEMINI_API_KEY") return null;
  if (!aiClient) {
    aiClient = new GoogleGenAI({ apiKey });
  }
  return aiClient;
}

function geminiStatus() {
  const configured = !!getGeminiClient();
  return {
    configured,
    message: configured
      ? "Gemini API key detected. AI generation is live."
      : "No GEMINI_API_KEY set. App runs in offline mode with template drafts.",
  };
}

const STRATEGIST_SYSTEM = `You are the Visibility Machine strategist for a builder/founder shipping products in public.
Your job is to turn raw work into public proof, content, offers, and leads.
Be direct, practical, and non-corporate. Write like a builder talking to other builders.

HARD RULES — violating any of these is a failure:
1. Every draft MUST cite specific proof from the build log (metrics, filenames, screenshots, terminal output, URLs).
2. Every draft MUST state the pain point clearly — who hurts and how.
3. Every draft MUST explain why it matters — outcome, not process fluff.
4. Every hook MUST be platform-native (TikTok spoken hook ≠ LinkedIn headline ≠ Reddit value post).
5. Every CTA MUST drive a reply, DM, or lead action — never "follow for more" alone.
6. NEVER use generic filler: "real build update", "here's why it matters", "pain point:", "excited to share", "game changer".
7. If input is thin, say what's missing bluntly in the draft body — do NOT invent fake details.
8. Use concrete language from the build log verbatim where possible.`;

function buildLogContext(log: ReturnType<typeof getBuildLog>) {
  if (!log) return "";
  const proofs = listProofArtifacts().filter((p) => log.proofAttachmentIds.includes(p.id));
  const proofLines = proofs.map((p) => `- [${p.type}] ${p.title}: ${p.description}${p.url ? ` (${p.url})` : ""}`);
  return `
BUILD LOG ENTRY:
Title: ${log.title}
Project: ${log.project}
Type: ${log.type}
Date: ${log.date}
What happened: ${log.whatHappened}
Why it matters: ${log.whyItMatters}
Pain point: ${log.painPoint}
Offer/CTA: ${log.offerCta}
Status: ${log.status}
Proof attached:
${proofLines.length ? proofLines.join("\n") : "(none)"}
`.trim();
}

function draftGenerationPrompt(log: NonNullable<ReturnType<typeof getBuildLog>>, platforms: Platform[], stronger = false): string {
  const strength = assessBuildLogInput(log);
  return `${STRATEGIST_SYSTEM}

${stronger ? "REGENERATION MODE: Previous drafts were too generic. Be sharper, more specific, more blunt. Lead with proof." : ""}

Input strength: ${strength.level} (${strength.score}/100)${strength.missing.length ? `. Missing fields: ${strength.missing.join(", ")}` : ""}

${buildLogContext(log)}

Platforms: ${platforms.join(", ")}

For EACH platform, the body MUST contain labeled sections woven naturally:
- The specific proof (quote or reference attached proof)
- The pain point this connects to
- Why it matters (outcome for the reader)
- Platform-native delivery (see rules below)

Platform rules:
- tiktok: spoken hook, 3-second proof visual, conversational script
- twitter/x: tight, under 280 chars if possible, one screenshot reference
- linkedin: builder voice, line breaks, outcome-first, not corporate
- instagram: carousel-friendly, visual cues per slide
- youtube: 60s script, result in first sentence
- reddit: value-first, markdown ok, no hashtag spam, honest tone
- facebook: personal story angle, question to drive comments

Return ONLY valid JSON:
{
  "drafts": [{
    "platform": "string",
    "hook": "string — platform-native opener using real details",
    "body": "string — must include proof, pain, why-it-matters",
    "cta": "string — reply/DM/lead action tied to offer",
    "visualSuggestion": "string — what to show on screen",
    "hashtags": ["string"]
  }]
}`;
}

function singleDraftPrompt(
  log: NonNullable<ReturnType<typeof getBuildLog>>,
  platform: Platform,
  currentDraft: { hook: string; body: string; cta: string }
): string {
  return `${STRATEGIST_SYSTEM}

REGENERATE STRONGER for ${platform} only. The previous draft was too weak:

Previous hook: ${currentDraft.hook}
Previous body: ${currentDraft.body}

${buildLogContext(log)}

Make it sharper: lead with proof, name the pain, state why it matters, end with a CTA that gets replies or leads.
Return JSON: { "hook", "body", "cta", "visualSuggestion", "hashtags" }`;
}

// ----------------------------------------------------
// REST API
// ----------------------------------------------------

app.get("/api/status", (_req, res) => {
  res.json({ storage: getStorageStatus(), gemini: geminiStatus() });
});

app.get("/health", (_req, res) => {
  res.status(200).json({ ok: true, service: "visibility-machine" });
});

app.get("/api/metrics", (_req, res) => {
  res.json(computeDashboardMetrics());
});

app.patch("/api/metrics", (req, res) => {
  res.json(updateManualMetrics(req.body));
});

app.get("/api/build-logs", (req, res) => {
  res.json(
    listBuildLogs({
      project: req.query.project as string | undefined,
      status: req.query.status as import("./src/types").BuildLogStatus | undefined,
      launchCampaignId: req.query.launchCampaignId as string | undefined,
      q: req.query.q as string | undefined,
    })
  );
});

app.post("/api/build-logs", (req, res) => {
  const body = req.body;
  if (!body.title?.trim() || !body.whatHappened?.trim()) {
    return res.status(400).json({ error: "Title and what happened are required." });
  }
  const entry = createBuildLog({
    date: body.date || new Date().toISOString().slice(0, 10),
    title: body.title.trim(),
    project: body.project || "General Build Log",
    type: body.type || "build",
    whatHappened: body.whatHappened.trim(),
    whyItMatters: body.whyItMatters?.trim() || "",
    painPoint: body.painPoint?.trim() || "",
    offerCta: body.offerCta?.trim() || getSettings().defaultCta,
    proofAttachmentIds: body.proofAttachmentIds || [],
    status: body.status || "captured",
    launchCampaignId: body.launchCampaignId || undefined,
  });
  res.status(201).json(entry);
});

app.patch("/api/build-logs/:id", (req, res) => {
  const updated = updateBuildLog(req.params.id, req.body);
  if (!updated) return res.status(404).json({ error: "Build log not found." });
  res.json(updated);
});

app.delete("/api/build-logs/:id", (req, res) => {
  if (!deleteBuildLog(req.params.id)) return res.status(404).json({ error: "Build log not found." });
  res.json({ ok: true });
});

app.get("/api/proof", (_req, res) => {
  res.json(listProofArtifacts());
});

app.post("/api/proof", (req, res) => {
  const body = req.body;
  if (!body.title?.trim()) return res.status(400).json({ error: "Title is required." });
  const entry = createProofArtifact({
    type: body.type || "note",
    title: body.title.trim(),
    description: body.description?.trim() || "",
    project: body.project || "General Build Log",
    url: body.url?.trim(),
    content: body.content?.trim(),
    fileName: body.fileName?.trim(),
    mimeType: body.mimeType?.trim(),
  });
  res.status(201).json(entry);
});

app.patch("/api/proof/:id", (req, res) => {
  const updated = updateProofArtifact(req.params.id, req.body);
  if (!updated) return res.status(404).json({ error: "Proof artifact not found." });
  res.json(updated);
});

app.delete("/api/proof/:id", (req, res) => {
  if (!deleteProofArtifact(req.params.id)) return res.status(404).json({ error: "Proof artifact not found." });
  res.json({ ok: true });
});

app.get("/api/post-drafts", (req, res) => {
  const buildLogId = req.query.buildLogId as string | undefined;
  const status = req.query.status as import("./src/types").DraftStatus | undefined;
  res.json(listPostDrafts(buildLogId, status));
});

app.patch("/api/post-drafts/:id", (req, res) => {
  const updated = updatePostDraft(req.params.id, req.body);
  if (!updated) return res.status(404).json({ error: "Draft not found." });
  res.json(updated);
});

app.delete("/api/post-drafts/:id", (req, res) => {
  if (!deletePostDraft(req.params.id)) return res.status(404).json({ error: "Draft not found." });
  res.json({ ok: true });
});

app.get("/api/events", (_req, res) => {
  res.json(listMetricEvents());
});

app.post("/api/events", (req, res) => {
  const body = req.body;
  if (!body.type) return res.status(400).json({ error: "Event type is required." });
  res.status(201).json(createMetricEvent(body));
});

app.get("/api/settings", (_req, res) => {
  res.json(getSettings());
});

app.patch("/api/settings", (req, res) => {
  res.json(updateSettings(req.body));
});

app.get("/api/backup/export", (_req, res) => {
  res.json(exportBackup());
});

app.post("/api/backup/import", (req, res) => {
  const result = importBackup(req.body);
  if (result.ok === false) return res.status(400).json({ error: result.error });
  res.json({ ok: true });
});

app.post("/api/backup/reset", (_req, res) => {
  resetDemoData();
  res.json({ ok: true });
});

// --- File upload ---
app.post("/api/proof/upload", upload.single("file"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded." });
  try {
    const mime = req.file.mimetype;
    const body = req.body as Record<string, string>;
    const proofType =
      body.type ||
      (mime.startsWith("video/") ? "video" : mime.startsWith("image/") ? "screenshot" : "note");
    const entry = createProofArtifact({
      type: proofType as import("./src/types").ProofType,
      title: body.title?.trim() || req.file.originalname,
      description: body.description?.trim() || "",
      project: body.project || "General Build Log",
      fileName: req.file.originalname,
      mimeType: mime,
      localPath: req.file.filename,
      fileSize: req.file.size,
      url: `/uploads/${req.file.filename}`,
    });
    res.status(201).json(entry);
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : "Upload failed." });
  }
});

// --- Launch campaigns ---
app.get("/api/launches", (req, res) => {
  res.json(listLaunchCampaigns(req.query.status as import("./src/types").LaunchStatus | undefined));
});

app.get("/api/launches/:id", (req, res) => {
  const campaign = getLaunchCampaign(req.params.id);
  if (!campaign) return res.status(404).json({ error: "Launch not found." });
  res.json(campaign);
});

app.post("/api/launches", (req, res) => {
  const body = req.body;
  if (!body.name?.trim() || !body.project?.trim()) {
    return res.status(400).json({ error: "Name and project are required." });
  }
  res.status(201).json(createLaunchCampaign(body));
});

app.patch("/api/launches/:id", (req, res) => {
  const updated = updateLaunchCampaign(req.params.id, req.body);
  if (!updated) return res.status(404).json({ error: "Launch not found." });
  res.json(updated);
});

app.patch("/api/launches/:id/checklist/:itemId", (req, res) => {
  const updated = toggleChecklistItem(req.params.id, req.params.itemId, !!req.body.done);
  if (!updated) return res.status(404).json({ error: "Launch or checklist item not found." });
  res.json(updated);
});

app.delete("/api/launches/:id", (req, res) => {
  if (!deleteLaunchCampaign(req.params.id)) return res.status(404).json({ error: "Launch not found." });
  res.json({ ok: true });
});

// --- Scheduled dispatches ---
app.get("/api/dispatches", (req, res) => {
  res.json(
    listScheduledDispatches({
      status: req.query.status as import("./src/types").DispatchStatus | undefined,
      from: req.query.from as string | undefined,
      to: req.query.to as string | undefined,
    })
  );
});

app.post("/api/dispatches", (req, res) => {
  const body = req.body;
  if (!body.title?.trim() || !body.platform || !body.scheduledAt) {
    return res.status(400).json({ error: "Title, platform, and scheduledAt are required." });
  }
  res.status(201).json(
    createScheduledDispatch({
      postDraftId: body.postDraftId,
      buildLogId: body.buildLogId,
      platform: body.platform,
      title: body.title.trim(),
      contentPreview: body.contentPreview,
      scheduledAt: body.scheduledAt,
      status: body.status || "scheduled",
      notes: body.notes,
    })
  );
});

app.patch("/api/dispatches/:id", (req, res) => {
  const updated = updateScheduledDispatch(req.params.id, req.body);
  if (!updated) return res.status(404).json({ error: "Dispatch not found." });
  if (req.body.status === "posted" && updated.postDraftId) {
    updatePostDraft(updated.postDraftId, { status: "posted", postedAt: new Date().toISOString() });
  }
  res.json(updated);
});

app.delete("/api/dispatches/:id", (req, res) => {
  if (!deleteScheduledDispatch(req.params.id)) return res.status(404).json({ error: "Dispatch not found." });
  res.json({ ok: true });
});

// --- Leads ---
app.get("/api/leads", (req, res) => {
  res.json(
    listLeads({
      status: req.query.status as import("./src/types").LeadStatus | undefined,
      launchCampaignId: req.query.launchCampaignId as string | undefined,
    })
  );
});

app.post("/api/leads", (req, res) => {
  const body = req.body;
  if (!body.source) return res.status(400).json({ error: "Lead source is required." });
  res.status(201).json(
    createLead({
      source: body.source,
      platform: body.platform,
      name: body.name?.trim(),
      contact: body.contact?.trim(),
      buildLogId: body.buildLogId,
      postDraftId: body.postDraftId,
      launchCampaignId: body.launchCampaignId,
      status: body.status || "new",
      value: body.value,
      notes: body.notes?.trim(),
    })
  );
});

app.patch("/api/leads/:id", (req, res) => {
  const updated = updateLead(req.params.id, req.body);
  if (!updated) return res.status(404).json({ error: "Lead not found." });
  res.json(updated);
});

app.delete("/api/leads/:id", (req, res) => {
  if (!deleteLead(req.params.id)) return res.status(404).json({ error: "Lead not found." });
  res.json({ ok: true });
});

// --- Platform profiles (manual growth tracking) ---
app.get("/api/profiles", (_req, res) => {
  res.json(listPlatformProfiles());
});

app.patch("/api/profiles/:id", (req, res) => {
  const updated = updatePlatformProfile(req.params.id, req.body);
  if (!updated) return res.status(404).json({ error: "Profile not found." });
  res.json(updated);
});

// --- AI product launch brief ---
app.post("/api/ai/launch-brief", async (req, res) => {
  const { campaignId } = req.body;
  const campaign = getLaunchCampaign(campaignId);
  if (!campaign) return res.status(404).json({ error: "Launch not found." });
  const logs = listBuildLogs({ launchCampaignId: campaignId });
  const ai = getGeminiClient();

  if (!ai) {
    return res.json({
      offline: true,
      brief: {
        headline: `Launch ${campaign.name} on ${campaign.project}`,
        hook: campaign.description || `Shipping ${campaign.name} — here's why it matters.`,
        weekPlan: [
          "Day 1: Build log + proof capture",
          "Day 2: Generate and schedule platform drafts",
          "Day 3: Launch post across top 3 platforms",
          "Day 4-7: Reply, log leads, iterate",
        ],
        offerAngle: campaign.offerCta || getSettings().defaultCta,
        platforms: getSettings().defaultPlatforms,
      },
    });
  }

  try {
    const prompt = `${STRATEGIST_SYSTEM}

Create a launch brief for this product launch campaign.

Campaign: ${campaign.name}
Project: ${campaign.project}
Description: ${campaign.description}
Target date: ${campaign.targetDate || "TBD"}
Offer: ${campaign.offerUrl || "none"} ${campaign.offerPrice ? `$${campaign.offerPrice}` : ""}
Build logs so far: ${logs.length}
${logs.map((l) => `- ${l.title}: ${l.whatHappened.slice(0, 120)}`).join("\n")}

Return JSON with: headline, hook, weekPlan (string array), offerAngle, platforms (string array), riskNotes (string)`;

    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            headline: { type: Type.STRING },
            hook: { type: Type.STRING },
            weekPlan: { type: Type.ARRAY, items: { type: Type.STRING } },
            offerAngle: { type: Type.STRING },
            platforms: { type: Type.ARRAY, items: { type: Type.STRING } },
            riskNotes: { type: Type.STRING },
          },
          required: ["headline", "hook", "weekPlan", "offerAngle", "platforms", "riskNotes"],
        },
      },
    });
    const brief = JSON.parse(response.text || "{}");
    res.json({ brief });
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : "Launch brief generation failed." });
  }
});

// ----------------------------------------------------
// AI endpoints
// ----------------------------------------------------

app.post("/api/ai/generate-drafts", async (req, res) => {
  const { buildLogId, platforms: reqPlatforms, force, stronger } = req.body;
  const log = getBuildLog(buildLogId);
  if (!log) return res.status(404).json({ error: "Build log not found." });
  if (!log.whatHappened?.trim()) return res.status(400).json({ error: "Build log has no content to generate from." });

  const inputStrength = assessBuildLogInput(log);
  if (!force && inputStrength.needsConfirmation) {
    return res.status(422).json({
      error: "Build log input is too thin for strong drafts. Fill missing fields or confirm to generate anyway.",
      code: "INPUT_WEAK",
      inputStrength,
    });
  }

  const settings = getSettings();
  const platforms: Platform[] = (reqPlatforms?.length ? reqPlatforms : settings.defaultPlatforms).filter(
    (p: string) => (PLATFORMS as readonly string[]).includes(p)
  );
  if (!platforms.length) platforms.push("twitter");

  const proofs = listProofArtifacts().filter((p) => log.proofAttachmentIds.includes(p.id));
  const useStronger = !!stronger || inputStrength.level === "weak";

  const ai = getGeminiClient();
  if (!ai) {
    const drafts = upsertPostDrafts(
      platforms.map((platform) => {
        const d = buildOfflineDraft(log, platform, proofs, settings.defaultCta, useStronger);
        return {
          buildLogId: log.id,
          platform,
          hook: d.hook,
          body: d.body,
          cta: d.cta,
          visualSuggestion: d.visualSuggestion,
          hashtags: d.hashtags,
          status: "draft" as const,
        };
      })
    );
    return res.json({ drafts, offline: true, inputStrength });
  }

  try {
    const prompt = draftGenerationPrompt(log, platforms, useStronger);

    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            drafts: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  platform: { type: Type.STRING },
                  hook: { type: Type.STRING },
                  body: { type: Type.STRING },
                  cta: { type: Type.STRING },
                  visualSuggestion: { type: Type.STRING },
                  hashtags: { type: Type.ARRAY, items: { type: Type.STRING } },
                },
                required: ["platform", "hook", "body", "cta", "visualSuggestion", "hashtags"],
              },
            },
          },
          required: ["drafts"],
        },
      },
    });

    type GeneratedDraft = PlatformDraftPayload & { platform: string };
    let parsed: { drafts: GeneratedDraft[] };
    try {
      parsed = JSON.parse(response.text || "{}");
    } catch {
      return res.status(502).json({ error: "AI returned invalid JSON. Try again." });
    }

    if (!parsed.drafts?.length) {
      return res.status(502).json({ error: "AI returned empty drafts array." });
    }

    const saved = upsertPostDrafts(
      parsed.drafts
        .filter((d) => platforms.includes(d.platform as Platform))
        .map((d) => ({
          buildLogId: log.id,
          platform: d.platform as Platform,
          hook: d.hook,
          body: d.body,
          cta: d.cta,
          visualSuggestion: d.visualSuggestion,
          hashtags: d.hashtags || [],
          status: "draft" as const,
        }))
    );

    updateBuildLog(log.id, { status: "drafted" });
    res.json({ drafts: saved, inputStrength });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "AI generation failed.";
    console.error("generate-drafts error:", error);
    res.status(500).json({ error: msg });
  }
});

app.post("/api/ai/regenerate-draft", async (req, res) => {
  const { draftId } = req.body;
  if (!draftId) return res.status(400).json({ error: "draftId is required." });

  const draft = getPostDraft(draftId);
  if (!draft) return res.status(404).json({ error: "Draft not found." });

  const log = getBuildLog(draft.buildLogId);
  if (!log) return res.status(404).json({ error: "Source build log not found." });

  const settings = getSettings();
  const proofs = listProofArtifacts().filter((p) => log.proofAttachmentIds.includes(p.id));
  const ai = getGeminiClient();

  if (!ai) {
    const d = buildOfflineDraft(log, draft.platform, proofs, settings.defaultCta, true);
    const updated = updatePostDraft(draftId, {
      hook: d.hook,
      body: d.body,
      cta: d.cta,
      visualSuggestion: d.visualSuggestion,
      hashtags: d.hashtags,
    });
    return res.json({ draft: updated, offline: true });
  }

  try {
    const prompt = singleDraftPrompt(log, draft.platform, draft);
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            hook: { type: Type.STRING },
            body: { type: Type.STRING },
            cta: { type: Type.STRING },
            visualSuggestion: { type: Type.STRING },
            hashtags: { type: Type.ARRAY, items: { type: Type.STRING } },
          },
          required: ["hook", "body", "cta", "visualSuggestion", "hashtags"],
        },
      },
    });

    let parsed: PlatformDraftPayload;
    try {
      parsed = JSON.parse(response.text || "{}");
    } catch {
      return res.status(502).json({ error: "AI returned invalid JSON." });
    }

    const updated = updatePostDraft(draftId, {
      hook: parsed.hook,
      body: parsed.body,
      cta: parsed.cta,
      visualSuggestion: parsed.visualSuggestion,
      hashtags: parsed.hashtags || [],
    });
    res.json({ draft: updated });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Regeneration failed.";
    res.status(500).json({ error: msg });
  }
});

app.post("/api/ai/analyze-angle", async (req, res) => {
  const { content, platforms } = req.body;
  if (!content?.trim()) return res.status(400).json({ error: "Content is required for analysis." });

  const ai = getGeminiClient();
  if (!ai) {
    return res.json({
      offline: true,
      analysis: offlineAngleAnalysis(content, getSettings().defaultCta),
    });
  }

  try {
    const prompt = `${STRATEGIST_SYSTEM}

Analyze this draft for visibility and conversion potential.
Target platforms: ${(platforms || []).join(", ") || "general"}

Draft:
"""
${content}
"""

Score these 5 dimensions 0-100 (be harsh, no vanity inflation):
- proofStrength: Is there concrete evidence (screenshots, metrics, demos, filenames)?
- specificityScore: Are claims specific or vague influencer fluff?
- moneyConnection: Does this connect to offers, leads, or revenue?
- ctaStrength: Does the CTA drive replies, DMs, or leads?
- platformFit: Is format/hook native to target platform(s)?

overallScore = average of the 5 scores.
isWeak = true if overallScore < 55 OR any dimension < 40.
fixList = if isWeak, return 3-6 blunt imperative fixes (e.g. "Add a screenshot reference", not "consider improving").
If strong, fixList can be empty.

Return JSON only.`;

    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            proofStrength: { type: Type.INTEGER },
            specificityScore: { type: Type.INTEGER },
            moneyConnection: { type: Type.INTEGER },
            ctaStrength: { type: Type.INTEGER },
            platformFit: { type: Type.INTEGER },
            overallScore: { type: Type.INTEGER },
            isWeak: { type: Type.BOOLEAN },
            fixList: { type: Type.ARRAY, items: { type: Type.STRING } },
            strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
            weaknesses: { type: Type.ARRAY, items: { type: Type.STRING } },
            improvedHook: { type: Type.STRING },
            improvedCta: { type: Type.STRING },
            platformNotes: { type: Type.STRING },
            summary: { type: Type.STRING },
          },
          required: [
            "proofStrength", "specificityScore", "moneyConnection",
            "ctaStrength", "platformFit", "overallScore", "isWeak", "fixList",
            "strengths", "weaknesses", "improvedHook", "improvedCta", "platformNotes", "summary",
          ],
        },
      },
    });

    let analysis;
    try {
      analysis = JSON.parse(response.text || "{}");
    } catch {
      return res.status(502).json({ error: "AI returned invalid JSON." });
    }
    res.json({ analysis });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Analysis failed.";
    res.status(500).json({ error: msg });
  }
});

app.post("/api/ai/chat", async (req, res) => {
  const { messages } = req.body;
  const ai = getGeminiClient();

  if (!ai) {
    return res.json({
      offline: true,
      reply:
        "Visibility Machine is in offline mode — no GEMINI_API_KEY detected. Add your key to .env and restart. I can still help you structure build logs: capture what you shipped, attach proof, generate platform drafts, and track replies/leads/cash manually on the dashboard.",
    });
  }

  try {
    const formattedHistory = messages.slice(0, -1).map((m: { role: string; text: string }) => ({
      role: m.role === "model" ? "model" : "user",
      parts: [{ text: m.text }],
    }));
    const lastMsg = messages[messages.length - 1].text;

    const chatInstance = ai.chats.create({
      model: "gemini-2.0-flash",
      config: { systemInstruction: STRATEGIST_SYSTEM },
      history: formattedHistory,
    });

    const response = await chatInstance.sendMessage({ message: lastMsg });
    res.json({ reply: response.text });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Chat failed.";
    res.status(500).json({ error: msg });
  }
});

app.post("/api/ai/generate-caption", (_req, res) => {
  res.status(410).json({
    error: "Deprecated. Use POST /api/ai/generate-drafts with a buildLogId instead.",
  });
});

// ----------------------------------------------------
// Server setup
// ----------------------------------------------------

async function setupServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Visibility Machine] http://localhost:${PORT}`);
    console.log(`[Storage] ${getStorageStatus().path}`);
    console.log(`[Gemini] ${geminiStatus().message}`);
  });
}

setupServer();
