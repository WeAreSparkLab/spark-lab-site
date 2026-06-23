// =============================================================================
// SparkLab Studio — out-of-hours ENQUIRY assistant API (Vercel Serverless Fn)
// =============================================================================
//
// This answers visitor questions about SparkLab's OWN services/pricing and
// captures enquiries when nobody's online, so no lead is lost. It doubles as a
// live demo of the exact product SparkLab sells.
//
// Hosting note: the brief specified a Netlify function, but this site deploys on
// Vercel (vercel.json / .vercel present, no netlify.toml), so the same secure
// design is implemented as a Vercel function under /api. The Anthropic key lives
// ONLY in the ANTHROPIC_API_KEY env var (Vercel → Settings → Environment
// Variables) — never in the frontend bundle. See STUDIO-ASSISTANT-README.md.
//
// Endpoint: POST /api/studio-assistant   body: { messages: [{role, content}] }
// =============================================================================

const Anthropic = require("@anthropic-ai/sdk");

const MODEL = "claude-sonnet-4-6";
const MAX_TOKENS = 1024;

// --- Business hours (edit here) ---------------------------------------------
const BUSINESS_TZ = "Europe/London";
const BUSINESS_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"];
const BUSINESS_START_HOUR = 9; // 09:00
const BUSINESS_END_HOUR = 17; // 17:00 (5pm)
const REPLY_WINDOW = "one business day";

// --- Where captured leads go (all optional; see README) ----------------------
// LEAD_EMAIL         — inbox leads are emailed to (default below)
// RESEND_API_KEY     — set to email leads via Resend (https://resend.com)
// LEAD_FROM          — verified Resend sender; falls back to Resend's test sender
// LEAD_WEBHOOK_URL   — if set, leads are POSTed here instead (Notion/Zapier/etc.)
const LEAD_EMAIL = process.env.LEAD_EMAIL || "support@wearesparklab.com";

// --- Abuse guards (public page) ---------------------------------------------
const MAX_MESSAGES = 20;
const MAX_CHARS_PER_MESSAGE = 1000;
const MAX_TOTAL_CHARS = 8000;
const RATE_LIMIT_MAX = 12;
const RATE_LIMIT_WINDOW_MS = 60 * 1000;

const hits = new Map();
function rateLimited(ip) {
  const now = Date.now();
  const recent = (hits.get(ip) || []).filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 5000) {
    for (const [k, v] of hits) {
      if (v.every((t) => now - t >= RATE_LIMIT_WINDOW_MS)) hits.delete(k);
    }
  }
  return recent.length > RATE_LIMIT_MAX;
}

// --- Business-hours check (server-side, authoritative) -----------------------
function isOutsideBusinessHours(date) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: BUSINESS_TZ,
    weekday: "short",
    hour: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const weekday = parts.find((p) => p.type === "weekday").value;
  let hour = parseInt(parts.find((p) => p.type === "hour").value, 10) % 24;
  const open = BUSINESS_DAYS.includes(weekday) && hour >= BUSINESS_START_HOUR && hour < BUSINESS_END_HOUR;
  return !open;
}

// =============================================================================
// SparkLab knowledge block — edit the [bracketed] bits to change the offer.
// =============================================================================
function buildSystemPrompt({ outsideHours }) {
  return `You are the enquiry assistant for SparkLab Studio.

TONE: warm, concise, professional. British English throughout.

WHAT SPARKLAB DOES:
SparkLab builds fast, beautiful one-page websites for solo wellness practitioners
(massage, reflexology, holistic therapy), with optional AI add-ons:
  - a booking assistant
  - an out-of-hours FAQ responder
  - a social content generator
  - a "find your treatment" matcher

PRICING — quote only as a BALLPARK and say the exact figure is confirmed in a
follow-up. Never give a firm, final quote.
  - One-page website: from £350
  - AI Booking / FAQ Assistant: from £99 setup + £25/month
  - Bundles (site + assistant): available at a discount
The monthly AI add-ons are the core offer — where it's relevant and natural,
steer the conversation toward them.

HOURS: enquiries are answered within ${REPLY_WINDOW}.
RIGHT NOW IT IS ${outsideHours ? "OUTSIDE" : "WITHIN"} SparkLab's business hours
(Mon–Fri, 9am–5pm UK time).${
    outsideHours
      ? " Because we're offline, proactively offer to take the visitor's details so we can reply when we're back."
      : ""
  }

LEAD CAPTURE:
When a visitor shows buying intent — or whenever it's outside business hours —
collect their: name, business name, email, and what they need. Ask for anything
missing, one or two items at a time (don't interrogate). Once you have at least
their name and email, confirm that a real person will personally reply within
${REPLY_WINDOW}.

When (and only when) you have captured at least a name AND an email, append the
details on a NEW LINE at the very end of that same reply as a machine-readable
token in EXACTLY this format:
[[LEAD]]{"name":"...","business":"...","email":"...","need":"..."}
Use empty strings for anything you genuinely don't have. Emit this token at most
once per conversation, only in the message where you confirm you've taken their
details. NEVER mention the token, never explain it, and never show it as part of
a sentence — it is stripped out before the visitor sees your reply.

GUARDRAILS:
- Only discuss SparkLab and its services. If asked about anything else, gently
  steer back.
- Never invent features, services, or policies that aren't listed above.
- Never give a firm or final price. For anything specific, capture the enquiry
  instead and say it'll be confirmed in the follow-up.
- Keep replies short and easy to read.`;
}

// --- Lead handling -----------------------------------------------------------
// Pull the [[LEAD]]{...} token out of the model's reply, returning the cleaned
// visitor-facing text plus the parsed lead (or null).
function extractLead(text) {
  const m = text.match(/\[\[LEAD\]\]\s*(\{[\s\S]*?\})/);
  if (!m) return { cleanText: text, lead: null };
  let lead = null;
  try {
    lead = JSON.parse(m[1]);
  } catch {
    lead = null;
  }
  const cleanText = text.replace(m[0], "").trim();
  return { cleanText, lead };
}

// Provider-agnostic delivery. Configure ONE of these via env vars; structured so
// you can later swap in Notion/CRM by editing only this function.
async function deliverLead(lead, messages) {
  const transcript = messages
    .map((m) => `${m.role === "user" ? "Visitor" : "Assistant"}: ${m.content}`)
    .join("\n");

  const payload = {
    ...lead,
    receivedAt: new Date().toISOString(),
    source: "SparkLab Studio site assistant",
    transcript,
  };

  // 1) Webhook (the easy "swap to Notion / Zapier / Make / your CRM" path)
  if (process.env.LEAD_WEBHOOK_URL) {
    await fetch(process.env.LEAD_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return;
  }

  // 2) Email via Resend (simplest reliable email-from-serverless)
  if (process.env.RESEND_API_KEY) {
    const text = [
      `New SparkLab enquiry`,
      ``,
      `Name:     ${lead.name || "(not given)"}`,
      `Business: ${lead.business || "(not given)"}`,
      `Email:    ${lead.email || "(not given)"}`,
      `Need:     ${lead.need || "(not given)"}`,
      ``,
      `— Conversation —`,
      transcript,
    ].join("\n");

    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.LEAD_FROM || "SparkLab Studio <onboarding@resend.dev>",
        to: [LEAD_EMAIL],
        reply_to: lead.email || undefined,
        subject: `New SparkLab enquiry — ${lead.name || "website visitor"}`,
        text,
      }),
    });
    return;
  }

  // 3) Nothing configured yet — log so the lead is at least in function logs.
  console.log("LEAD CAPTURED (no delivery configured):", JSON.stringify(payload));
}

// --- Handler -----------------------------------------------------------------
module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const ip =
    (req.headers["x-forwarded-for"] || "").split(",")[0].trim() ||
    req.socket?.remoteAddress ||
    "unknown";
  if (rateLimited(ip)) {
    return res.status(429).json({ error: "Too many messages — please wait a moment and try again." });
  }

  let body = req.body;
  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch {
      return res.status(400).json({ error: "Invalid request." });
    }
  }

  const incoming = body && Array.isArray(body.messages) ? body.messages : null;
  if (!incoming || incoming.length === 0) {
    return res.status(400).json({ error: "No messages provided." });
  }

  let total = 0;
  const messages = [];
  for (const m of incoming.slice(-MAX_MESSAGES)) {
    if (!m || (m.role !== "user" && m.role !== "assistant")) continue;
    const content = typeof m.content === "string" ? m.content.trim() : "";
    if (!content) continue;
    const clipped = content.slice(0, MAX_CHARS_PER_MESSAGE);
    total += clipped.length;
    if (total > MAX_TOTAL_CHARS) break;
    messages.push({ role: m.role, content: clipped });
  }
  if (messages.length === 0 || messages[messages.length - 1].role !== "user") {
    return res.status(400).json({ error: "No valid message to respond to." });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    console.error("ANTHROPIC_API_KEY is not set");
    return res.status(500).json({ error: "The assistant isn't available right now." });
  }

  const outsideHours = isOutsideBusinessHours(new Date());

  try {
    const client = new Anthropic();
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: buildSystemPrompt({ outsideHours }),
      messages,
    });

    const raw = response.content
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("")
      .trim();

    const { cleanText, lead } = extractLead(raw);

    // Deliver the lead but never let a delivery hiccup break the visitor's reply.
    if (lead && (lead.name || lead.email)) {
      try {
        await deliverLead(lead, messages);
      } catch (err) {
        console.error("Lead delivery failed:", err?.message || err);
      }
    }

    return res.status(200).json({
      reply: cleanText || "Sorry — I didn't catch that. Could you rephrase?",
      outsideHours,
      leadCaptured: Boolean(lead && (lead.name || lead.email)),
    });
  } catch (err) {
    console.error("Anthropic request failed:", err?.message || err);
    return res.status(502).json({
      error: "I'm having trouble connecting right now. Please try again in a moment.",
    });
  }
};
