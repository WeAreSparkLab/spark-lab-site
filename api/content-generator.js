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

const MODEL = "claude-sonnet-4-6";
const MAX_TOKENS = 2000;

const PLATFORMS = ["Instagram", "Facebook"];
const MIN_POSTS = 3;
const MAX_POSTS = 8;

// --- Abuse guards ------------------------------------------------------------
const RATE_LIMIT_MAX = 8; // generation is heavier — keep this lower
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

  const ip =
    (req.headers["x-forwarded-for"] || "").split(",")[0].trim() ||
    req.socket?.remoteAddress ||
    "unknown";
  if (rateLimited(ip)) {
    return res.status(429).json({ error: "Too many requests — please wait a moment and try again." });
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

  const topic = typeof body.topic === "string" ? body.topic.slice(0, 120).trim() : "";
  const platform = PLATFORMS.includes(body.platform) ? body.platform : "Instagram";
  let count = parseInt(body.count, 10);
  if (!Number.isFinite(count)) count = MIN_POSTS;
  count = Math.max(MIN_POSTS, Math.min(MAX_POSTS, count));
  const vibe = typeof body.vibe === "string" ? body.vibe.slice(0, 60).trim() : "";

  if (!topic) {
    return res.status(400).json({ error: "Please choose a topic." });
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

    return res.status(200).json({ posts });
  } catch (err) {
    console.error("Generator request failed:", err?.message || err);
    return res.status(502).json({
      error: "I'm having trouble connecting right now. Please try again in a moment.",
    });
  }
};
