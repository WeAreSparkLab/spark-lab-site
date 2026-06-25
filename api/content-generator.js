// =============================================================================
// Social content generator API (Vercel Serverless Function) — PRIVATE back-office
// =============================================================================
//
// Generates a batch of social captions in the practitioner's own voice. This is
// a tool the PRACTITIONER uses privately — it is never embedded on a client's
// public website. It powers (a) the public taster in the /studio showcase and
// (b) the standalone private tool page /studio/tools/content.
//
// Reuse: the SAME per-client config as the booking assistant
// (./_knowledge/willow-lane-massage.js), now with `voiceSamples` + `avoid`.
// Key stays server-side in ANTHROPIC_API_KEY. Hosting: Vercel sibling of
// /api/assistant (the brief's "Netlify function" — this site is on Vercel).
//
// Endpoint: POST /api/content-generator
//   body: { topic, platform: "Instagram"|"Facebook", count: 3..8, vibe }
//   200:  { posts: [ { caption, hashtags: [..], photo_idea } ] }
// =============================================================================

const Anthropic = require("@anthropic-ai/sdk");
const business = require("./_knowledge/willow-lane-massage.js");
const { makeIpLimiter, realIp, monthlyUsage, monthlyConsume } = require("./_lib/ratelimit.js");

const MODEL = "claude-sonnet-4-6";
const MAX_TOKENS = 2000;

const PLATFORMS = ["Instagram", "Facebook"];
const MIN_POSTS = 3;
const MAX_POSTS = 8;
const TASTER_POSTS = 3; // the public /studio taster always returns 3

// --- Usage protection --------------------------------------------------------
// IP limiter: protects the public taster, and is a light floor for the full tool.
const limiter = makeIpLimiter({ prefix: "content", perMinute: 8, perDay: 40 });

// Per-client access + monthly allowance for the PRIVATE full tool. Both live in
// the client's config (api/_knowledge/<client>.js):
//   contentToken         optional — if set, the private link must carry ?k=<token>
//   contentMonthlyLimit  optional — generations per calendar month (default 12)
const CLIENT_ID =
  business.clientId ||
  String(business.name || "client").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
const MONTHLY_LIMIT = Number(business.contentMonthlyLimit) > 0 ? Number(business.contentMonthlyLimit) : 12;

const BUSY_MESSAGE = "I'm getting a lot of requests right now — please try again in a moment.";

const RESULT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    posts: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          caption: { type: "string", description: "The post caption, in the client's voice." },
          hashtags: {
            type: "array",
            items: { type: "string", description: "A single hashtag including the # symbol." },
            description: "Relevant hashtags including 1–2 local ones.",
          },
          photo_idea: { type: "string", description: "One short, concrete photo suggestion for this post." },
        },
        required: ["caption", "hashtags", "photo_idea"],
      },
    },
  },
  required: ["posts"],
};

function buildSystemPrompt(b) {
  const services = b.services.map((s) => `- ${s.name}`).join("\n");
  const samples = (b.voiceSamples || []).map((s, i) => `${i + 1}. ${s}`).join("\n");
  const avoid = (b.avoid || []).map((s) => `- ${s}`).join("\n");

  return `You write social media captions for ${b.name}.
${b.tagline}
Location (for local hashtags): ${b.location}
Booking link to nudge toward when it fits: ${b.bookingLink}

VOICE — match these REAL captions from the business. Mirror their warmth, rhythm,
sentence length and emoji habits. Do not copy them; write fresh posts in the same voice:
${samples || "(no samples provided — use the tone: " + b.tone + ")"}

THEIR SERVICES (only ever reference these — never invent services, prices or offers):
${services}

RULES
- Write each caption in the voice above. Vary the openings across the batch.
- Platform-appropriate length: Instagram = a punchy hook + 1–2 short lines, emoji welcome;
  Facebook = slightly more conversational, 1–3 sentences, lighter on emoji.
- Hashtags: relevant, not a wall. Instagram ~5–9, Facebook ~2–4. Always include 1–2 LOCAL
  tags drawn from the location (e.g. Norwich). Each hashtag includes the # symbol.
- End with a soft, natural booking nudge ONLY when it fits the post — not every time.
- photo_idea: one short, concrete, achievable photo suggestion.

NEVER DO THIS:
${avoid || "- Make medical claims or promise cures."}
- No medical claims, cures, diagnoses, or health promises of any kind.
- Never invent services, prices, discounts or offers that aren't listed above.`;
}

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  // IP limit (all modes) — protects the public taster, light floor for the tool.
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
    return res.status(400).json({ error: "No options provided." });
  }

  const mode = body.mode === "full" ? "full" : "taster";
  const token = typeof body.token === "string" ? body.token.trim() : "";
  const topic = typeof body.topic === "string" ? body.topic.slice(0, 120).trim() : "";
  const platform = PLATFORMS.includes(body.platform) ? body.platform : "Instagram";
  const vibe = typeof body.vibe === "string" ? body.vibe.slice(0, 60).trim() : "";

  // The public taster always returns 3; the private tool honours 3–8.
  let count = TASTER_POSTS;
  if (mode === "full") {
    count = parseInt(body.count, 10);
    if (!Number.isFinite(count)) count = MIN_POSTS;
    count = Math.max(MIN_POSTS, Math.min(MAX_POSTS, count));
  }

  if (!topic) {
    return res.status(400).json({ error: "Please choose a topic." });
  }

  // --- Private full tool: per-client token + monthly allowance ----------------
  if (mode === "full") {
    if (business.contentToken) {
      if (token !== business.contentToken) {
        return res
          .status(403)
          .json({ error: "This link isn't valid — please check the link you were given." });
      }
    } else {
      console.warn("[content] full mode but no contentToken configured — tool is unprotected.");
    }

    const usage = await monthlyUsage({ prefix: "content", client: CLIENT_ID, limit: MONTHLY_LIMIT });
    if (!usage.ok) {
      return res.status(429).json({
        error: "You've used this month's posts — they refresh on the 1st. 🌱",
      });
    }
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    console.error("ANTHROPIC_API_KEY is not set");
    return res.status(500).json({ error: "The content generator isn't available right now." });
  }

  const userMessage =
    `Write ${count} ${platform} posts about: ${topic}.` +
    (vibe ? ` Lean the vibe towards: ${vibe}.` : "") +
    ` Return ${count} distinct posts.`;

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
      console.error("Generator returned non-JSON:", raw.slice(0, 400));
      return res.status(502).json({ error: "I couldn't generate those just now — please try again." });
    }

    // Normalise defensively so the frontend always gets clean cards.
    const posts = Array.isArray(parsed.posts)
      ? parsed.posts
          .map((p) => ({
            caption: typeof p.caption === "string" ? p.caption.trim() : "",
            hashtags: Array.isArray(p.hashtags)
              ? p.hashtags.map((h) => String(h).trim()).filter(Boolean)
              : [],
            photo_idea: typeof p.photo_idea === "string" ? p.photo_idea.trim() : "",
          }))
          .filter((p) => p.caption)
      : [];

    if (posts.length === 0) {
      return res.status(502).json({ error: "I couldn't generate those just now — please try again." });
    }

    // Count this generation against the client's monthly allowance (full tool only).
    if (mode === "full") {
      await monthlyConsume({ prefix: "content", client: CLIENT_ID });
    }

    return res.status(200).json({ posts });
  } catch (err) {
    console.error("Generator request failed:", err?.message || err);
    return res.status(502).json({
      error: "I'm having trouble connecting right now. Please try again in a moment.",
    });
  }
};
