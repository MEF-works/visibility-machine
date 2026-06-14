#!/usr/bin/env python3
"""Seed Visibility Machine with ReUp / StoutAlkz proof-led content from mef-story-engine."""
import json
import os
from datetime import datetime, timedelta
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "data" / "visibility-machine.json"
# H:\social-media-super-app + H:\mef-story-engine, or nested copy inside story-engine
_default_story = ROOT.parent / "mef-story-engine"
STORY = Path(os.environ.get("MEF_STORY_ENGINE", _default_story if _default_story.is_dir() else ROOT.parent))

now = datetime(2026, 6, 14, 10, 30, 0)

def ts(offset_hours=0):
    return (now + timedelta(hours=offset_hours)).strftime("%Y-%m-%dT%H:%M:%S.000Z")

def d(offset_days=0):
    return (now + timedelta(days=offset_days)).strftime("%Y-%m-%d")

def sched(offset_days, hour=10):
    dt = now.replace(hour=hour, minute=0, second=0) + timedelta(days=offset_days)
    return dt.strftime("%Y-%m-%dT%H:%M:%S.000Z")

CTA = 'DM "P2P" for the AltPay gateway stack — or comment PROOF for the SQL breakdown.'
CTA_BUILD = 'DM "BUILD" if you want the full checkout + compliance stack.'

proof = [
    {
        "id": "pf-wc-orders-sql",
        "type": "note",
        "title": "wp_wc_orders.sql — 7,559 orders, 100% P2P",
        "description": "Hostinger DB export Jun 14 2026. $1,360,252.94 total. Zero processor methods. All transaction_id empty.",
        "project": "ReUp / AltPay",
        "content": f"Payment mix: zelle 4263 (56.4%), btc_cashapp 1375 (18.2%), chime 1275 (16.9%), btc 593 (7.8%). File: {STORY / 'wp_wc_orders.sql'}",
        "createdAt": ts(-2),
    },
    {
        "id": "pf-wc-analytics-1m",
        "type": "screenshot",
        "title": "StoutAlkz WooCommerce $1.41M analytics",
        "description": "Jun 2025–Jun 2026: $1,406,842 net, 8,498 orders",
        "project": "StoutAlkz",
        "createdAt": ts(-1),
    },
    {
        "id": "pf-altpay-plugins",
        "type": "screenshot",
        "title": "AltPay P2P Gateway live in wp-admin",
        "description": "Stout Alks — BuiltByMef.pro v1.0.0",
        "project": "AltPay",
        "createdAt": ts(-1),
    },
    {
        "id": "pf-shippo-85k",
        "type": "screenshot",
        "title": "Shippo $85K / 5,911 labels (12 mo)",
        "description": "FedEx Priority Overnight #1 at $16K spend",
        "project": "StoutAlkz",
        "createdAt": ts(0),
    },
    {
        "id": "pf-migration-analytics",
        "type": "screenshot",
        "title": "Post-migration Stout Alks $289K (10 weeks)",
        "description": "Apr 1–Jun 14 2026 — domain split not revenue loss",
        "project": "StoutAlkz",
        "createdAt": ts(0),
    },
    {
        "id": "pf-order-11398",
        "type": "screenshot",
        "title": "Order #11398 — BTC/CashApp, FedEx via Shippo",
        "description": "$175.12 MGM-15 — full stack one order",
        "project": "StoutAlkz",
        "createdAt": ts(-1),
    },
]

build_logs = [
    {
        "id": "bl-sql-proof",
        "date": "2026-06-14",
        "title": "Exported WooCommerce DB — 7,559 orders, zero processor",
        "project": "ReUp / AltPay",
        "type": "proof",
        "whatHappened": "phpMyAdmin export of wp_wc_orders (Hostinger). 7,559 shop_orders, $1,360,252.94 total_amount, Jun 24 2025 – Feb 23 2026. Every payment_method is P2P: zelle, btc_cashapp, chime, btc, venmo. Zero stripe/nmi/paypal. Every transaction_id is empty.",
        "whyItMatters": "Strongest marketing proof we have. Not analytics UI — raw database. Proves ReUp P2P ran a million-dollar store without a merchant account.",
        "painPoint": "Merchants in high-risk verticals get categorized and banned — they need checkout that doesn't depend on processors.",
        "offerCta": CTA,
        "proofAttachmentIds": ["pf-wc-orders-sql", "pf-wc-analytics-1m"],
        "status": "captured",
        "launchCampaignId": "lc-reup-proof-series",
        "createdAt": ts(-2),
        "updatedAt": ts(-2),
    },
    {
        "id": "bl-shippo-scale",
        "date": "2026-06-14",
        "title": "5,911 Shippo labels — $85K net spend",
        "project": "StoutAlkz",
        "type": "proof",
        "whatHappened": "Shippo analytics: $85,397.76 net label spend, 5,911 labels in 12 months. Top carrier: FedEx Priority Overnight ($16K). Matches WooCommerce $175K shipping revenue on 8,498 orders.",
        "whyItMatters": "Proves physical fulfillment at scale — not fake revenue. Checkout software + boxes leaving the building.",
        "painPoint": "Solo operators get accused of 'just building landing pages.' Shippo receipts end that.",
        "offerCta": CTA_BUILD,
        "proofAttachmentIds": ["pf-shippo-85k", "pf-order-11398"],
        "status": "captured",
        "launchCampaignId": "lc-reup-proof-series",
        "createdAt": ts(-1),
        "updatedAt": ts(-1),
    },
    {
        "id": "bl-migration",
        "date": "2026-06-14",
        "title": "Migrated to Stout Alks + stoutalkz.org — $371K in 10 weeks",
        "project": "StoutAlkz",
        "type": "lesson",
        "whatHappened": "Apr 2026 split from stoutalkz.com to two new Hostinger storefronts. Stout Alks ~$289K net, stoutalkz.org ~$81K (Apr 1–Jun 14). AltPay P2P on both. May–Jun dip on .com was migration, not collapse.",
        "whyItMatters": "Domain hygiene / risk spread without losing velocity. Same catalog, same P2P stack, cloned cleanly.",
        "painPoint": "Analytics flatlines look like failure — context matters for build-in-public.",
        "offerCta": CTA,
        "proofAttachmentIds": ["pf-migration-analytics", "pf-altpay-plugins"],
        "status": "captured",
        "launchCampaignId": "lc-reup-proof-series",
        "createdAt": ts(0),
        "updatedAt": ts(0),
    },
    {
        "id": "bl-dual-rail",
        "date": "2026-06-14",
        "title": "Dual-rail: P2P proven first, NMI on stoutallz.org",
        "project": "ReUp / AltPay",
        "type": "thought",
        "whatHappened": "Legacy stoutalkz.com: 100% P2P per SQL dump. New stoutallz.org: Pledged Plugins NMI PCI Gateway for card checkout. Same inventory/compliance plugins. Freeway Rails in practice.",
        "whyItMatters": "Honest story — sovereignty P2P when you must, processor when customer needs cards. Not either/or.",
        "painPoint": "Posting 'no processor' without explaining NMI site confuses audience.",
        "offerCta": 'DM "RAILS" for dual-rail setup walkthrough.',
        "proofAttachmentIds": ["pf-wc-orders-sql", "pf-altpay-plugins"],
        "status": "captured",
        "launchCampaignId": "lc-reup-proof-series",
        "createdAt": ts(1),
        "updatedAt": ts(1),
    },
    {
        "id": "bl-altpay-live",
        "date": "2026-06-14",
        "title": "AltPay P2P Gateway v1.0.0 — BuiltByMef.pro in production",
        "project": "AltPay",
        "type": "launch",
        "whatHappened": "Live on Stout Alks wp-admin: AltPay P2P Gateway (BTC + ALT pay apps), Master Inventory Manager (M.E.F. & GPT Architect), KratomBans WC compliance. Mike Fluet operator.",
        "whyItMatters": "Product marketing IS client proof. Plugin author field is the pitch.",
        "painPoint": "Devs ship plugins nobody uses. This one processed $1.36M in order rows.",
        "offerCta": CTA,
        "proofAttachmentIds": ["pf-altpay-plugins"],
        "status": "drafted",
        "launchCampaignId": "lc-reup-proof-series",
        "createdAt": ts(1),
        "updatedAt": ts(2),
    },
]

def draft(bl_id, platform, hook, body, visual, tags, status="draft", offset=0):
    return {
        "id": f"pd-{bl_id}-{platform}",
        "buildLogId": bl_id,
        "platform": platform,
        "hook": hook,
        "body": body,
        "cta": CTA if "ReUp" in body or "P2P" in body or "AltPay" in body else CTA_BUILD,
        "visualSuggestion": visual,
        "hashtags": tags,
        "status": status,
        "createdAt": ts(2 + offset),
        "updatedAt": ts(2 + offset),
    }

post_drafts = [
    draft(
        "bl-sql-proof", "twitter",
        "I exported my WooCommerce database. 7,559 orders. $1.36M. Not one processor row.",
        """🧵 Thread: What a million-dollar P2P store looks like in SQL

1/ Exported wp_wc_orders from Hostinger (Jun 14, 2026)

2/ 7,559 shop_orders · $1,360,252.94 total_amount

3/ payment_method column ONLY:
   • zelle — 4,263 (56%)
   • btc_cashapp — 1,375 (18%)
   • chime — 1,275 (17%)
   • btc — 593 (8%)

4/ Zero stripe. Zero nmi. Zero paypal.

5/ Every transaction_id is EMPTY — no card auth codes. Manual/P2P rails only.

6/ This is ReUp / AltPay in production — not a pitch deck.

7/ Built the checkout because processors categorized the vertical — not reviewed it.""",
        "Screenshot: SQL payment_method column (blur emails) OR pie chart",
        ["buildinpublic", "woocommerce", "fintech", "indiehacker"],
    ),
    draft(
        "bl-sql-proof", "linkedin",
        "7,559 orders. $1.36M. Zero processor payment methods in the database.",
        """I stopped arguing about P2P checkout and exported the database.

wp_wc_orders.sql — Hostinger export, June 14, 2026:
→ 7,559 completed orders
→ $1,360,252.94 in total_amount
→ Date range: Jun 2025 – Feb 2026

Payment method breakdown:
→ Zelle: 56%
→ BTC/CashApp: 18%
→ Chime: 17%
→ BTC: 8%

Not a single Stripe, NMI, or PayPal row.
Every transaction_id field: empty.

High-risk merchants don't need another landing page.
They need checkout that works when the processor says no.

We built it (AltPay / ReUp). Then ran a store on it.""",
        "Carousel: SQL schema → payment mix → $ total → zero processor → CTA",
        ["buildinpublic", "ecommerce", "payments", "founder"],
    ),
    draft(
        "bl-sql-proof", "tiktok",
        "POV: you export your order DB and every payment_method is P2P",
        "Screen record scrolling wp_wc_orders.sql payment_method values.\n\nVoiceover: 7,559 orders. 1.36 million dollars. Zelle. Chime. CashApp BTC. Not one Stripe row.\n\nText overlay: 'This is what proof looks like.'",
        "15-30 sec screen recording of SQL file + pie chart overlay",
        ["buildinpublic", "devtok", "ecommerce", "fyp"],
    ),
    draft(
        "bl-shippo-scale", "twitter",
        "5,911 shipping labels. $85K to Shippo. This wasn't dropshipping fiction.",
        "Checkout is software.\nFulfillment is proof you run a real business.\n\nShippo (12 mo):\n• $85,397 net label spend\n• 5,911 labels\n• #1 spend: FedEx Priority Overnight — $16K\n\nSame operation that did $1.41M WooCommerce net.\n\nSoftware + boxes.",
        "Shippo analytics screenshot + optional order #11398",
        ["buildinpublic", "ecommerce", "shipping"],
    ),
    draft(
        "bl-shippo-scale", "linkedin",
        "5,911 labels don't lie.",
        """Revenue screenshots are easy to dismiss.

Shippo receipts are harder.

Last 12 months on our client store:
→ 5,911 labels purchased
→ $85,397 net label spend
→ FedEx Priority Overnight alone: $16,010

WooCommerce showed $175K in shipping revenue on 8,498 orders.

Checkout is what we built.
Boxes leaving the warehouse is what proved it.""",
        "Split image: Shippo $85K + WooCommerce shipping line",
        ["buildinpublic", "logistics", "founder"],
    ),
    draft(
        "bl-migration", "twitter",
        "Our WooCommerce chart flatlined in May. We didn't lose revenue — we moved domains.",
        """Apr 2026: split stoutalkz.com → two new storefronts.

10 weeks later:
• Stout Alks: $289,683 net / 1,499 orders
• stoutalkz.org: $81,402 net / 432 orders

Same AltPay P2P stack. Same catalog.

Analytics dip ≠ failure. Read the context.""",
        "Before/after analytics charts side by side",
        ["buildinpublic", "ecommerce"],
    ),
    draft(
        "bl-altpay-live", "instagram",
        "BuiltByMef.pro — live on a store doing $289K in 10 weeks",
        "Slide 1: AltPay P2P Gateway in wp-admin\nSlide 2: Payment mix from SQL\nSlide 3: $1.41M legacy window\nSlide 4: DM P2P CTA",
        "4-slide carousel from plugin screenshot + SQL chart",
        ["woocommerce", "plugin", "buildinpublic"],
    ),
]

launch = {
    "id": "lc-reup-proof-series",
    "project": "ReUp / AltPay",
    "name": "ReUp Proof Series — P2P at $1.4M",
    "description": f"Proof-led social campaign from {STORY / '07_CONTENT_ANGLES.md'}",
    "targetDate": "2026-07-15",
    "status": "launching",
    "checklist": [
        {"id": "chk-rp1", "label": "Upload proof screenshots to Proof Vault", "done": False, "category": "proof"},
        {"id": "chk-rp2", "label": "Seed build logs (SQL, Shippo, migration)", "done": True, "category": "proof"},
        {"id": "chk-rp3", "label": "Generate platform drafts in Post Factory", "done": True, "category": "content"},
        {"id": "chk-rp4", "label": "Define offer + CTA (DM P2P)", "done": True, "category": "offer"},
        {"id": "chk-rp5", "label": "Schedule 3-week dispatch calendar", "done": True, "category": "distribution"},
        {"id": "chk-rp6", "label": "Post #1: SQL thread on X", "done": False, "category": "distribution"},
        {"id": "chk-rp7", "label": "Reply to comments within 24h", "done": False, "category": "followup"},
        {"id": "chk-rp8", "label": "Log leads in Money Board", "done": False, "category": "followup"},
    ],
    "buildLogIds": [b["id"] for b in build_logs],
    "offerCta": CTA,
    "offerUrl": "https://thereup.pro",
    "createdAt": ts(-3),
    "updatedAt": ts(2),
}

dispatches = [
    {"id": "sd-w1-mon", "postDraftId": "pd-bl-sql-proof-twitter", "buildLogId": "bl-sql-proof", "platform": "twitter",
     "title": "SQL proof thread — $1.36M zero processor", "contentPreview": "7,559 orders. Not one processor row.",
     "scheduledAt": sched(2, 9), "status": "scheduled", "createdAt": ts(2), "updatedAt": ts(2)},
    {"id": "sd-w1-wed", "postDraftId": "pd-bl-shippo-scale-linkedin", "buildLogId": "bl-shippo-scale", "platform": "linkedin",
     "title": "Shippo 5,911 labels proof", "contentPreview": "5,911 labels don't lie.",
     "scheduledAt": sched(4, 10), "status": "scheduled", "createdAt": ts(2), "updatedAt": ts(2)},
    {"id": "sd-w1-fri", "postDraftId": "pd-bl-migration-twitter", "buildLogId": "bl-migration", "platform": "twitter",
     "title": "Migration not collapse", "contentPreview": "Chart flatlined — we moved domains",
     "scheduledAt": sched(6, 9), "status": "scheduled", "createdAt": ts(2), "updatedAt": ts(2)},
    {"id": "sd-w2-mon", "postDraftId": "pd-bl-sql-proof-linkedin", "buildLogId": "bl-sql-proof", "platform": "linkedin",
     "title": "SQL proof carousel", "contentPreview": "7,559 orders zero processor",
     "scheduledAt": sched(9, 10), "status": "scheduled", "createdAt": ts(2), "updatedAt": ts(2)},
    {"id": "sd-w2-wed", "postDraftId": "pd-bl-sql-proof-tiktok", "buildLogId": "bl-sql-proof", "platform": "tiktok",
     "title": "SQL scroll video", "contentPreview": "POV: every payment_method is P2P",
     "scheduledAt": sched(11, 12), "status": "scheduled", "createdAt": ts(2), "updatedAt": ts(2)},
    {"id": "sd-w2-fri", "postDraftId": "pd-bl-altpay-live-instagram", "buildLogId": "bl-altpay-live", "platform": "instagram",
     "title": "AltPay carousel", "contentPreview": "BuiltByMef.pro live",
     "scheduledAt": sched(13, 11), "status": "scheduled", "createdAt": ts(2), "updatedAt": ts(2)},
    {"id": "sd-w3-mon", "postDraftId": "pd-bl-shippo-scale-twitter", "buildLogId": "bl-shippo-scale", "platform": "twitter",
     "title": "Shippo $85K tweet", "scheduledAt": sched(16, 9), "status": "scheduled", "createdAt": ts(2), "updatedAt": ts(2)},
]

platform_profiles = [
    {"id": "pp-twitter", "platform": "twitter", "handle": "@MeFworks", "followerCount": 0,
     "followerHistory": [{"date": d(0), "count": 0}], "updatedAt": ts(0)},
    {"id": "pp-linkedin", "platform": "linkedin", "handle": "Michael E. Fluet", "followerCount": 0,
     "followerHistory": [{"date": d(0), "count": 0}], "updatedAt": ts(0)},
    {"id": "pp-tiktok", "platform": "tiktok", "handle": "@MeFworks", "followerCount": 0,
     "followerHistory": [{"date": d(0), "count": 0}], "updatedAt": ts(0)},
    {"id": "pp-instagram", "platform": "instagram", "handle": "@MeFworks", "followerCount": 0,
     "followerHistory": [{"date": d(0), "count": 0}], "updatedAt": ts(0)},
]

db = {
    "buildLogs": build_logs,
    "proofArtifacts": proof,
    "postDrafts": post_drafts,
    "metricEvents": [
        {"id": "me-launch-reup", "type": "launch", "value": 1, "note": "ReUp Proof Series",
         "launchCampaignId": "lc-reup-proof-series", "createdAt": ts(-3)},
        {"id": "me-proof-seed", "type": "proof_captured", "value": 6, "note": "Story engine seed", "createdAt": ts(0)},
    ],
    "launchCampaigns": [launch],
    "scheduledDispatches": dispatches,
    "leads": [],
    "platformProfiles": platform_profiles,
    "settings": {
        "defaultPlatforms": ["twitter", "linkedin", "tiktok", "instagram"],
        "defaultCta": CTA,
        "projects": [
            "ReUp / AltPay",
            "StoutAlkz",
            "MEFworks",
            "SovereignStack",
            "SovPay",
            "PluginOps",
            "PrepScan",
            "Visibility Machine",
            "General Build Log",
        ],
        "operatorName": "Michael E. Fluet (MeF)",
        "platformHandles": {
            "twitter": "@MeFworks",
            "linkedin": "Michael E. Fluet",
            "tiktok": "@MeFworks",
            "instagram": "@MeFworks",
        },
    },
    "manualMetrics": {},
}

if __name__ == "__main__":
    if not STORY.is_dir():
        print(f"Warning: mef-story-engine not found at {STORY}")
    OUT.write_text(json.dumps(db, indent=2), encoding="utf-8")
    print(f"Wrote {OUT}")
    print(f"  story engine: {STORY}")
    print(f"  buildLogs: {len(build_logs)}")
    print(f"  proofArtifacts: {len(proof)}")
    print(f"  postDrafts: {len(post_drafts)}")
    print(f"  scheduledDispatches: {len(dispatches)}")
