// =============================================================================
// "Find your treatment" matcher API (Vercel Serverless Function)
// =============================================================================
//
// Helps a visitor who doesn't know what to book. The widget asks 2–3 short
// questions and POSTs the answers here; this function calls Claude server-side
// (key in ANTHROPIC_API_KEY) and returns ONE recommendation as structured JSON.
//
// Reuse: the SAME per-client config as the booking assistant
// (./_knowledge/willow-lane-massage.js) — services, contraindications
// (notSuitableIf) and bookingLink. No new config.
//
// Hosting note: the brief said "Netlify function"; this site deploys on Vercel,
// so it's a sibling Vercel endpoint next to /api/assistant — same secure design.
//
// Endpoint: POST /api/treatment-matcher
//   body: { bothering: string, firstTime: "yes"|"no"|"", notes: string }
//   200:  { recommended, treatment, reason, caution, booking_link }
// =============================================================================

const Anthropic = require("@anthropic-ai/sdk");
const { resolveClient } = require("./_knowledge");
const { makeIpLimiter, realIp } = require("./_lib/ratelimit.js");

const MODEL = "claude-sonnet-4-6";
const MAX_TOKENS = 400;

// --- Abuse guards ------------------------------------------------------------
const MAX_NOTES_CHARS = 500;

// Per-IP usage protection (Upstash Redis, with in-memory fail-safe). Declared
// once at module load so it's reused while the instance stays warm.
const limiter = makeIpLimiter({ prefix: "match", perMinute: 8, perDay: 40 });
const BUSY_MESSAGE =
  "I'm getting a lot of questions right now — please try again in a moment.";

// Constrained output so the function always gets a valid shape back.
const RESULT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    recommended: {
      type: "boolean",
      description: "true if you are recommending a treatment; false if a contraindication means they should check with a GP first.",
    },
    treatment: {
      type: "string",
      description: "The EXACT name of one treatment from the provided list, or an empty string if recommended is false.",
    },
    reason: {
      type: "string",
      description: "One short, warm sentence explaining the recommendation (or, if not recommended, why they should check with their GP first).",
    },
    caution: {
      type: "string",
      description: "An optional gentle caution (e.g. a relevant 'not suitable if' note). Empty string if none.",
    },
  },
  required: ["recommended", "treatment", "reason", "caution"],
};

function buildSystemPrompt(b) {
  const services = b.services
    .map((s) => `- ${s.name} (${s.duration}) — ${s.description}`)
    .join("\n");
  const notSuitable = b.notSuitableIf.map((x) => `- ${x}`).join("\n");

  return `You help a visitor to ${b.name} choose which treatment to book, based on a few short answers.

YOUR JOB
- Recommend exactly ONE treatment, using ONLY the treatments listed below. Use the treatment's exact name.
- Base it on the visitor's answers. Keep "reason" to one short, warm sentence (${b.tone}).
- If two treatments fit, pick the single best starting point (a first-timer usually suits the gentler/shorter option).

SAFETY (important)
- You are not a doctor. Never diagnose or give medical advice.
- If the visitor's answers suggest any of the "not suitable if" situations below
  (for example first-trimester / very early pregnancy, a recent operation, a new
  or undiagnosed injury or pain, or feeling unwell), then set recommended=false,
  leave treatment empty, and in "reason" gently suggest they check with their GP
  or speak to the practitioner before booking. Do NOT recommend a treatment in that case.
- For milder notes that don't rule a treatment out, you may still recommend one and
  add a short note in "caution".
- Never invent treatments, prices, or policies.

TREATMENTS (recommend only from these, by exact name):
${services}

NOT SUITABLE IF (treat these as contraindications):
${notSuitable}`;
}

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
  if (!body || typeof body !== "object") {
    return res.status(400).json({ error: "No answers provided." });
  }

  // Which client is this widget for? (blank → studio demo; unknown id → error)
  const business = resolveClient(body.client);
  if (!business) {
    return res.status(400).json({ error: "Unknown business." });
  }

  const bothering = typeof body.bothering === "string" ? body.bothering.slice(0, 120).trim() : "";
  const firstTime = body.firstTime === "yes" || body.firstTime === "no" ? body.firstTime : "";
  const notes = typeof body.notes === "string" ? body.notes.slice(0, MAX_NOTES_CHARS).trim() : "";

  if (!bothering && !notes) {
    return res.status(400).json({ error: "Please answer at least one question." });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    console.error("ANTHROPIC_API_KEY is not set");
    return res.status(500).json({ error: "The matcher isn't available right now." });
  }

  const userMessage =
    `Visitor's answers:\n` +
    `- What's bothering them: ${bothering || "(not said)"}\n` +
    `- Is this their first visit: ${firstTime || "(not said)"}\n` +
    `- Anything else they mentioned: ${notes || "(nothing)"}\n\n` +
    `Recommend one treatment (or flag a contraindication) following your rules.`;

  try {
    const client = new Anthropic();
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: buildSystemPrompt(business),
      messages: [{ role: "user", content: userMessage }],
      output_config: { format: { type: "json_schema", schema: RESULT_SCHEMA } },
    });

    const raw = response.content
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("")
      .trim();

    let result;
    try {
      result = JSON.parse(raw);
    } catch {
      console.error("Matcher returned non-JSON:", raw);
      return res.status(502).json({ error: "I couldn't work that out just now — please try again." });
    }

    // Trust the model for the wording, but never for the booking link — inject
    // the real one from config, and only when we're actually recommending.
    const recommended = Boolean(result.recommended) && Boolean(result.treatment);
    return res.status(200).json({
      recommended,
      treatment: recommended ? String(result.treatment) : "",
      reason: String(result.reason || ""),
      caution: String(result.caution || ""),
      booking_link: recommended ? business.bookingLink : null,
    });
  } catch (err) {
    console.error("Matcher request failed:", err?.message || err);
    return res.status(502).json({
      error: "I'm having trouble connecting right now. Please try again in a moment.",
    });
  }
};
