// =============================================================================
// Review collector API (Vercel Serverless Function)
// =============================================================================
//
// Drafts the short, private message a practitioner would send a client shortly
// after their appointment, asking how it went. The real product then routes a
// happy reply to a public review link (e.g. Google) and an unhappy reply to a
// private note to the practitioner — so nothing bad ever gets a public airing
// by accident. This endpoint only drafts that first message; the "what happens
// next" step is simulated client-side (see studio/review-collector.js).
//
// Reuse: the SAME per-client config as the booking assistant
// (./_knowledge/willow-lane-massage.js) — name, tone and services. No new config.
//
// Endpoint:
//   GET  /api/review-collector?c=<client>
//     200: { businessName, services: [name, ...] }
//   POST /api/review-collector
//     body: { client, name, service }
//     200: { message }
// =============================================================================

const Anthropic = require("@anthropic-ai/sdk");
const { resolveClient } = require("./_knowledge");
const { makeIpLimiter, realIp } = require("./_lib/ratelimit.js");

const MODEL = "claude-sonnet-4-6";
const MAX_TOKENS = 300;

const limiter = makeIpLimiter({ prefix: "reviews", perMinute: 8, perDay: 40 });
const BUSY_MESSAGE = "I'm getting a lot of requests right now — please try again in a moment.";

const RESULT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    message: {
      type: "string",
      description:
        "A short, warm SMS/email asking how their appointment went. Under 320 characters. " +
        "Mentions the service by name. Invites an honest reply (good or bad), not just a 5-star ask. " +
        "Includes a single placeholder link written exactly as [link].",
    },
  },
  required: ["message"],
};

function buildSystemPrompt(b) {
  return `You write a single short follow-up message for ${b.name}, sent privately to a client a few
hours after their appointment, asking how it went.

TONE: ${b.tone}

RULES
- Under 320 characters. One or two sentences.
- Warm and personal, addressed to the client by first name.
- Mention the exact service they had.
- Invite an honest reply either way — this is a private check-in first, not a public review ask.
- Include exactly one placeholder link written as [link] for them to tap.
- Never invent prices, policies, or make medical claims.
- Sign off briefly as ${b.name} if it fits naturally.`;
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
  const knownServices = (business.services || []).map((s) => s.name);

  if (!name || !service || !knownServices.includes(service)) {
    return res.status(400).json({ error: "Please provide a valid client name and service." });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    console.error("ANTHROPIC_API_KEY is not set");
    return res.status(500).json({ error: "The review collector isn't available right now." });
  }

  const userMessage = `Write the check-in message for ${name}, who had a ${service} appointment.`;

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

    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      console.error("Review collector returned non-JSON:", raw.slice(0, 400));
      return res.status(502).json({ error: "I couldn't draft that just now — please try again." });
    }

    const message = typeof parsed.message === "string" ? parsed.message.trim() : "";
    if (!message) {
      return res.status(502).json({ error: "I couldn't draft that just now — please try again." });
    }

    return res.status(200).json({ message });
  } catch (err) {
    console.error("Review collector request failed:", err?.message || err);
    return res.status(502).json({
      error: "I'm having trouble connecting right now. Please try again in a moment.",
    });
  }
};
