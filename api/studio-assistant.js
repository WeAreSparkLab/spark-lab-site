// =============================================================================
// SparkLab Studio — out-of-hours ENQUIRY assistant API (Vercel Serverless Fn)
// =============================================================================
//
// Answers visitor questions about SparkLab's own services/pricing and captures
// enquiries so no lead is lost. Lead capture uses the Anthropic tool-use loop:
// the model calls the `capture_lead` tool, this function POSTs the structured
// lead to an n8n webhook (Webhook → Gmail → Notion), then returns a tool_result
// so the model writes its closing confirmation to the visitor.
//
// Hosting: Vercel serverless function at /api/studio-assistant. Secrets are read
// from env vars only (never the front end):
//   ANTHROPIC_API_KEY        — Anthropic key (existing)
//   SPARKLAB_LEAD_WEBHOOK     — n8n webhook the lead is POSTed to (NEW)
//
// Endpoint: POST /api/studio-assistant   body: { messages: [{role, content}] }
// =============================================================================

const Anthropic = require("@anthropic-ai/sdk");
const { makeIpLimiter, realIp } = require("./_lib/ratelimit.js");

const MODEL = "claude-sonnet-4-6";
const MAX_TOKENS = 1024;
const MAX_TOOL_ITERATIONS = 3; // safety cap on the tool-use loop

// If the webhook fails, the assistant tells the visitor to email here directly.
const FALLBACK_EMAIL = "support@wearesparklab.com";

// --- Business hours (edit here) ---------------------------------------------
const BUSINESS_TZ = "Europe/London";
const BUSINESS_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"];
const BUSINESS_START_HOUR = 9; // 09:00
const BUSINESS_END_HOUR = 17; // 17:00 (5pm)
const REPLY_WINDOW = "one business day";

// --- Abuse guards (public page) ---------------------------------------------
const MAX_MESSAGES = 20;
const MAX_CHARS_PER_MESSAGE = 1000;
const MAX_TOTAL_CHARS = 8000;

// Per-IP usage protection (Upstash Redis, with in-memory fail-safe). Declared
// once at module load so it's reused while the instance stays warm.
const limiter = makeIpLimiter({ prefix: "enquiry", perMinute: 8, perDay: 40 });
const BUSY_MESSAGE =
  "I'm getting a lot of questions right now — please try again in a moment.";

// --- The lead-capture tool the model can call --------------------------------
const CAPTURE_LEAD_TOOL = {
  name: "capture_lead",
  description:
    "Send a visitor enquiry to Sara. Call this once you have the visitor's name, email, and a one-line summary of what they need — especially when the business is outside wellness/beauty, when it's out of hours, or when the visitor shows buying intent.",
  input_schema: {
    type: "object",
    properties: {
      name: { type: "string", description: "Visitor's name" },
      email: { type: "string", description: "Visitor's email" },
      business_name: { type: "string", description: "Their business name, if given" },
      business_type: { type: "string", description: "Type of business, e.g. dental practice, massage therapist" },
      in_niche: { type: "boolean", description: "true if wellness/beauty, false otherwise" },
      enquiry_summary: { type: "string", description: "One line on what they need" },
    },
    required: ["name", "email", "enquiry_summary"],
  },
};

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
  return `You are the enquiry assistant for SparkLab Studio. Tone: warm, concise, professional, British English. Keep replies short.

What SparkLab does: builds fast, beautiful websites for solo practitioners — plus optional AI add-ons (a booking assistant, an out-of-hours FAQ responder, a social content generator, and a "find your treatment" matcher).

Specialism vs who we'll take on: SparkLab specialises in wellness and beauty businesses, but Sara also takes on other businesses — dental and other clinics, and professional-services firms. When a visitor's business falls outside wellness/beauty, NEVER turn them away. Warmly note that wellness/beauty is the specialism but other businesses are welcome, explain it would be a tailored quote rather than a standard package, and capture the enquiry (see LEAD CAPTURE). Do not invent or quote a price for an out-of-niche business.

Pricing — ballpark only, never a firm quote: one-page website from £450; AI assistants come in three monthly plans: Foundations £97/month (booking assistant, service matcher, FAQ answerer), Momentum £197/month (adds no-show saver, review collector, review responder), Full Practice £397/month (all eight assistants, adding intake summariser and content helper). Always steer toward the monthly plans — they're the core offer. For anything specific, or any out-of-niche business, do not give a figure — capture the enquiry instead.

Hours: enquiries are answered within ${REPLY_WINDOW}, during business hours. Right now it is ${
    outsideHours ? "OUTSIDE" : "WITHIN"
  } business hours (Mon–Fri, 9am–5pm UK time).

LEAD CAPTURE — this is how Sara actually hears about a visitor. When ANY of these is true — the visitor has shown buying intent, it's outside business hours, or the business is outside wellness/beauty — collect their name, email, business name, and one line on what they need, then call the capture_lead tool with those details. Ask for anything missing one item at a time; don't interrogate. Do not tell the visitor they've been passed on until the tool has been called and returned successfully. After it succeeds, confirm warmly that Sara will personally reply within ${REPLY_WINDOW}. If the tool reports a failure, apologise briefly and ask the visitor to email Sara directly at ${FALLBACK_EMAIL} so their enquiry isn't lost.

Guardrails: only discuss SparkLab and its services. Never invent features. Never give a firm quote. If you can't answer something specific, capture the enquiry rather than guess.`;
}

// --- POST the captured lead to the n8n webhook -------------------------------
async function postLead(input) {
  const url = process.env.SPARKLAB_LEAD_WEBHOOK;
  if (!url) {
    console.error("SPARKLAB_LEAD_WEBHOOK is not set — lead could not be delivered.");
    return { ok: false };
  }
  try {
    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    if (!r.ok) {
      console.error("Lead webhook returned non-OK status:", r.status);
      return { ok: false };
    }
    return { ok: true };
  } catch (err) {
    console.error("Lead webhook POST failed:", err?.message || err);
    return { ok: false };
  }
}

// --- Handler -----------------------------------------------------------------
module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const gate = await limiter.check(realIp(req));
  if (!gate.ok) {
    return res.status(429).json({ error: BUSY_MESSAGE });
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
  const system = buildSystemPrompt({ outsideHours });

  try {
    const client = new Anthropic();
    const convo = messages.slice(); // working copy we extend across tool turns
    let leadCaptured = false;

    let response = await client.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system,
      messages: convo,
      tools: [CAPTURE_LEAD_TOOL],
    });

    // Standard Anthropic tool-use loop: run while the model wants to call a tool.
    let iterations = 0;
    while (response.stop_reason === "tool_use" && iterations < MAX_TOOL_ITERATIONS) {
      iterations += 1;

      // Append the assistant turn (includes the tool_use block) verbatim.
      convo.push({ role: "assistant", content: response.content });

      const toolResults = [];
      for (const block of response.content) {
        if (block.type !== "tool_use") continue;
        if (block.name === "capture_lead") {
          const { ok } = await postLead(block.input);
          if (ok) leadCaptured = true;
          toolResults.push({
            type: "tool_result",
            tool_use_id: block.id,
            is_error: !ok,
            content: ok
              ? `Enquiry delivered to Sara successfully. Now confirm warmly to the visitor that Sara will personally reply within ${REPLY_WINDOW}.`
              : `Delivery FAILED — the enquiry was NOT sent. Apologise briefly and ask the visitor to email Sara directly at ${FALLBACK_EMAIL} so it isn't lost.`,
          });
        } else {
          toolResults.push({
            type: "tool_result",
            tool_use_id: block.id,
            is_error: true,
            content: "Unknown tool.",
          });
        }
      }

      convo.push({ role: "user", content: toolResults });

      response = await client.messages.create({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        system,
        messages: convo,
        tools: [CAPTURE_LEAD_TOOL],
      });
    }

    const reply = response.content
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("")
      .trim();

    return res.status(200).json({
      reply: reply || "Sorry — I didn't catch that. Could you rephrase?",
      outsideHours,
      leadCaptured,
    });
  } catch (err) {
    console.error("Anthropic request failed:", err?.message || err);
    return res.status(502).json({
      error: "I'm having trouble connecting right now. Please try again in a moment.",
    });
  }
};
