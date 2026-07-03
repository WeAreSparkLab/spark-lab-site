// =============================================================================
// No-show saver API (Vercel Serverless Function)
// =============================================================================
//
// Empty slots are a solo practitioner's quiet tax: a forgotten appointment or a
// last-minute cancellation is an hour that can't be re-sold. This endpoint
// drafts the two short, warm messages that recover that time:
//
//   mode: "reminder" — sent a day or so BEFORE an appointment, gently asking the
//                      client to confirm or reschedule with notice (so a wobble
//                      becomes a freed slot someone else can take, not a no-show).
//   mode: "rebook"   — sent AFTER a cancellation or no-show, inviting the client
//                      back warmly with a link to grab a new time. No guilt-trip.
//
// Reuse: the SAME per-client config as the booking assistant
// (./_knowledge/willow-lane-massage.js) — name, tone, services, cancellationPolicy
// and bookingLink. No new config.
//
// Endpoint:
//   GET  /api/no-show-saver?c=<client>
//     200: { businessName, services: [name, ...] }
//   POST /api/no-show-saver
//     body: { client, name, service, when, mode: "reminder"|"rebook" }
//     200: { message }
// =============================================================================

const Anthropic = require("@anthropic-ai/sdk");
const { resolveClient } = require("./_knowledge");
const { makeIpLimiter, realIp } = require("./_lib/ratelimit.js");

const MODEL = "claude-sonnet-4-6";
const MAX_TOKENS = 300;

const MODES = ["reminder", "rebook"];

const limiter = makeIpLimiter({ prefix: "noshow", perMinute: 8, perDay: 40 });
const BUSY_MESSAGE = "I'm getting a lot of requests right now — please try again in a moment.";

const RESULT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    message: {
      type: "string",
      description:
        "A short, warm SMS the practitioner can send as-is. Under 320 characters. " +
        "Addresses the client by first name and mentions the exact service. " +
        "Includes a single placeholder link written exactly as [link].",
    },
  },
  required: ["message"],
};

function buildSystemPrompt(b, mode) {
  const shared = `You write a single short SMS for ${b.name}, sent privately to one client.

TONE: ${b.tone}

RULES
- Under 320 characters. One or two sentences.
- Warm and personal, addressed to the client by first name.
- Mention the exact service by name.
- Include exactly one placeholder link written as [link] for them to tap.
- Never invent prices, add pressure, or make medical claims.
- Sign off briefly as ${b.name} only if it fits naturally.`;

  if (mode === "rebook") {
    return `${shared}

PURPOSE: This client recently cancelled or missed their appointment. Warmly invite
them back to book a new time — no guilt, no mention of a missed session or any fee.
Make it easy and low-pressure to tap [link] and pick another slot.`;
  }

  // reminder (default)
  return `${shared}

PURPOSE: This is a friendly reminder sent a day or so BEFORE an upcoming appointment.
Remind them of the day/time, and gently invite them to confirm or, if they can't make
it, to reschedule via [link] so the slot can be offered to someone else. Frame giving
notice as helpful, not as a warning about the cancellation policy.`;
}

module.exports = async (req, res) => {
  if (req.method === "GET") {
    const b = resolveClient(req.query && req.query.c);
    if (!b) return res.status(404).json({ error: "Unknown business." });
    return res.status(200).json({
      businessName: b.name,
      services: (b.services || []).map((s) => s.name).filter(Boolean),
    });
  }

  if (req.method !== "POST") {
    res.setHeader("Allow", "GET, POST");
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
    return res.status(400).json({ error: "No details provided." });
  }

  const business = resolveClient(body.client);
  if (!business) {
    return res.status(400).json({ error: "Unknown business." });
  }

  const name = typeof body.name === "string" ? body.name.slice(0, 40).trim() : "";
  const service = typeof body.service === "string" ? body.service.slice(0, 80).trim() : "";
  const when = typeof body.when === "string" ? body.when.slice(0, 80).trim() : "";
  const mode = MODES.includes(body.mode) ? body.mode : "reminder";
  const knownServices = (business.services || []).map((s) => s.name);

  if (!name || !service || !knownServices.includes(service)) {
    return res.status(400).json({ error: "Please provide a valid client name and service." });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    console.error("ANTHROPIC_API_KEY is not set");
    return res.status(500).json({ error: "The no-show saver isn't available right now." });
  }

  const userMessage =
    mode === "rebook"
      ? `Write the win-back message for ${name}, who cancelled or missed their ${service} appointment.`
      : `Write the reminder for ${name}, who has a ${service} appointment ${when || "coming up"}.`;

  try {
    const client = new Anthropic();
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: buildSystemPrompt(business, mode),
      messages: [{ role: "user", content: userMessage }],
      output_config: { format: { type: "json_schema", schema: RESULT_SCHEMA } },
    });

    const raw = response.content
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("")
      .trim();

    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      console.error("No-show saver returned non-JSON:", raw.slice(0, 400));
      return res.status(502).json({ error: "I couldn't draft that just now — please try again." });
    }

    const message = typeof parsed.message === "string" ? parsed.message.trim() : "";
    if (!message) {
      return res.status(502).json({ error: "I couldn't draft that just now — please try again." });
    }

    return res.status(200).json({ message });
  } catch (err) {
    console.error("No-show saver request failed:", err?.message || err);
    return res.status(502).json({
      error: "I'm having trouble connecting right now. Please try again in a moment.",
    });
  }
};
