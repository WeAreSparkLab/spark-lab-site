// =============================================================================
// Review responder API (Vercel Serverless Function)
// =============================================================================
//
// The natural other half of the review collector: once reviews come in, someone
// has to reply to them — publicly, in the business's voice, and gracefully even
// when the review stings. This endpoint drafts that public reply. The awkward
// low-star ones are where a good draft earns its keep: no defensiveness, a
// sincere acknowledgement, and an invitation to continue privately.
//
// Reuse: the SAME per-client config as the booking assistant
// (./_knowledge/willow-lane-massage.js) — name and tone. No new config.
//
// Endpoint:
//   GET  /api/review-responder?c=<client>
//     200: { businessName }
//   POST /api/review-responder
//     body: { client, review, rating, reviewer }
//     200: { reply }
// =============================================================================

const Anthropic = require("@anthropic-ai/sdk");
const { resolveClient } = require("./_knowledge");
const { makeIpLimiter, realIp } = require("./_lib/ratelimit.js");

const MODEL = "claude-sonnet-4-6";
const MAX_TOKENS = 400;

const limiter = makeIpLimiter({ prefix: "revresp", perMinute: 8, perDay: 40 });
const BUSY_MESSAGE = "I'm getting a lot of requests right now — please try again in a moment.";

const RESULT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    reply: {
      type: "string",
      description:
        "The public reply the business posts underneath the review. 2–4 short sentences, " +
        "warm and human, written in the first person as the owner. For a critical review it " +
        "acknowledges the experience, apologises sincerely, and invites the reviewer to get in " +
        "touch privately — never defensive, never a promise of a refund or a medical claim.",
    },
  },
  required: ["reply"],
};

function buildSystemPrompt(b) {
  return `You write the PUBLIC reply that ${b.name} posts underneath a customer's online review
(for example, on their Google Business Profile). The reply is visible to everyone, so it
represents the business to future readers as much as to the reviewer.

TONE: ${b.tone}

RULES
- Keep it short: 2–4 sentences. Warm and genuinely human, never corporate or formulaic.
- Write in the first person as the owner ("we"/"I"), speaking to the reviewer.
- If a first name is given, open by thanking them by name.
- Where you can, reference something specific they actually mentioned — don't be generic.
- Never invent facts, prices, offers, discounts, or details that aren't in the review.
- Never make medical or cure claims.

FOR A CRITICAL OR UNHAPPY REVIEW (a low rating)
- Do not be defensive, do not argue, and do not make excuses.
- Acknowledge how they felt and apologise sincerely for their experience.
- Offer to put it right and invite them to continue the conversation privately (get in touch
  directly) so the detail comes off the public thread.
- Stay calm and gracious even if the review seems unfair. Never promise a refund or compensation.`;
}

module.exports = async (req, res) => {
  if (req.method === "GET") {
    const b = resolveClient(req.query && req.query.c);
    if (!b) return res.status(404).json({ error: "Unknown business." });
    return res.status(200).json({ businessName: b.name });
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

  const review = typeof body.review === "string" ? body.review.slice(0, 1500).trim() : "";
  const reviewer = typeof body.reviewer === "string" ? body.reviewer.slice(0, 40).trim() : "";
  const rating = Math.round(Number(body.rating));

  if (!review) {
    return res.status(400).json({ error: "Please paste the review to reply to." });
  }
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return res.status(400).json({ error: "Please give a star rating from 1 to 5." });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    console.error("ANTHROPIC_API_KEY is not set");
    return res.status(500).json({ error: "The review responder isn't available right now." });
  }

  const userMessage =
    `Write a public reply to this ${rating}-star review` +
    (reviewer ? ` from ${reviewer}` : "") +
    `:\n\n"""${review}"""`;

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
      console.error("Review responder returned non-JSON:", raw.slice(0, 400));
      return res.status(502).json({ error: "I couldn't draft that just now — please try again." });
    }

    const reply = typeof parsed.reply === "string" ? parsed.reply.trim() : "";
    if (!reply) {
      return res.status(502).json({ error: "I couldn't draft that just now — please try again." });
    }

    return res.status(200).json({ reply });
  } catch (err) {
    console.error("Review responder request failed:", err?.message || err);
    return res.status(502).json({
      error: "I'm having trouble connecting right now. Please try again in a moment.",
    });
  }
};
