// =============================================================================
// SparkLab — structured enquiry form API (Vercel Serverless Function)
// =============================================================================
//
// POST /api/enquiry
// body: { service, name, email, phone, contact_preference, business_name,
//         message, website, consent, reference, context, company (honeypot) }
//
// Validates the enquiry and delivers it through the same routes as the enquiry
// chat (Resend email to Sara, plus the optional n8n webhook). It answers
// { ok: true } ONLY after a delivery route has confirmed it, so the page never
// shows a success message for an enquiry that went nowhere.
//
// Duplicate guard: the browser sends a random `reference` per enquiry and
// reuses it on retries. A reference that was already delivered answers ok
// without sending again; one still in flight answers 409.
// =============================================================================

const { makeIpLimiter, realIp, redis } = require("./_lib/ratelimit.js");
const { deliverLead, SERVICES, FALLBACK_EMAIL, EMAIL_RE, oneLine, multiLine } = require("./_lib/lead-delivery.js");

const limiter = makeIpLimiter({ prefix: "enquiry-form", perMinute: 5, perDay: 20 });
const REF_RE = /^[A-Za-z0-9-]{8,64}$/;
const PHONE_RE = /^[+()\d\s-]{7,24}$/;
const REF_TTL_S = 24 * 60 * 60;

const FAIL_MESSAGE = `Sorry, your enquiry didn't send. Please try again, or message Sara on WhatsApp or email ${FALLBACK_EMAIL}.`;

// --- Reference store (Redis when configured, else per-instance memory) ------
const memRefs = new Map();
const refStore = {
  async claim(ref) {
    // → "claimed" | "sent" | "pending"
    if (redis) {
      try {
        const ok = await redis.set(`enquiry:ref:${ref}`, "pending", { nx: true, ex: REF_TTL_S });
        if (ok) return "claimed";
        return (await redis.get(`enquiry:ref:${ref}`)) === "sent" ? "sent" : "pending";
      } catch (err) {
        console.error("[enquiry] Redis claim failed, using memory:", err?.message || err);
      }
    }
    const now = Date.now();
    for (const [k, v] of memRefs) if (now - v.at > REF_TTL_S * 1000) memRefs.delete(k);
    const cur = memRefs.get(ref);
    if (cur) return cur.state;
    memRefs.set(ref, { state: "pending", at: now });
    return "claimed";
  },
  async settle(ref, delivered) {
    if (redis) {
      try {
        if (delivered) await redis.set(`enquiry:ref:${ref}`, "sent", { ex: REF_TTL_S });
        else await redis.del(`enquiry:ref:${ref}`);
        return;
      } catch (err) {
        console.error("[enquiry] Redis settle failed:", err?.message || err);
      }
    }
    if (delivered) memRefs.set(ref, { state: "sent", at: Date.now() });
    else memRefs.delete(ref);
  },
};

// --- Validation --------------------------------------------------------------
// → { lead } or { errors: { field: message } }
function validate(body) {
  const errors = {};
  const service = oneLine(body.service, 20);
  const name = oneLine(body.name, 100);
  const email = oneLine(body.email, 200);
  const phone = oneLine(body.phone, 30);
  const pref = oneLine(body.contact_preference, 20);
  const business = oneLine(body.business_name, 150);
  const message = multiLine(body.message, 2000);
  let website = oneLine(body.website, 200);

  if (!SERVICES[service]) errors.service = "Choose what you'd like help with.";
  if (!name) errors.name = "Tell me your name.";
  if (!business) errors.business_name = "Tell me the name of your business.";
  if (message.length < 10) errors.message = "Tell me a little about what you need (a sentence is plenty).";
  if (!["email", "whatsapp"].includes(pref)) errors.contact_preference = "Choose email or WhatsApp for my reply.";
  if (email && !EMAIL_RE.test(email)) errors.email = "That email address doesn't look quite right.";
  if (phone && !PHONE_RE.test(phone)) errors.phone = "That WhatsApp number doesn't look quite right.";
  if (pref === "email" && !email) errors.email = "Add your email so I can reply.";
  if (pref === "whatsapp" && !phone) errors.phone = "Add your WhatsApp number so I can reply.";
  if (website && !/^https?:\/\//i.test(website)) website = `https://${website}`;
  if (website && !/^https?:\/\/[^\s/]+\.[^\s]+$/i.test(website)) errors.website = "That web address doesn't look quite right.";
  if (body.consent !== true) errors.consent = "Please tick the box so I can reply to you.";

  if (Object.keys(errors).length) return { errors };
  return {
    lead: {
      source: "form",
      service,
      name,
      email,
      phone,
      contact_preference: pref,
      business_name: business,
      enquiry_summary: message,
      website,
      consent: true,
      context: oneLine(body.context, 120),
    },
  };
}

// --- Handler -----------------------------------------------------------------
async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  let body = req.body;
  if (typeof body === "string") {
    try { body = JSON.parse(body); } catch { body = null; }
  }
  if (!body || typeof body !== "object") return res.status(400).json({ ok: false, error: "Invalid request." });

  // Honeypot: a field people never see. Bots that fill it get a silent no-op;
  // their response says nothing about success, so the page shows the fallback.
  if (oneLine(body.company)) return res.status(400).json({ ok: false, error: FAIL_MESSAGE });

  const gate = await limiter.check(realIp(req));
  if (!gate.ok) {
    return res.status(429).json({ ok: false, error: "Too many enquiries from here just now. Please wait a minute, or use WhatsApp or email instead." });
  }

  const ref = oneLine(body.reference, 64);
  if (!REF_RE.test(ref)) return res.status(400).json({ ok: false, error: "Invalid request. Please reload the page and try again." });

  const { lead, errors } = validate(body);
  if (errors) return res.status(422).json({ ok: false, error: "Please check the highlighted fields.", fields: errors });
  lead.reference = ref;

  const claim = await refStore.claim(ref);
  if (claim === "sent") return res.status(200).json({ ok: true, duplicate: true, reference: ref });
  if (claim === "pending") return res.status(409).json({ ok: false, error: "That enquiry is already being sent. Give it a moment." });

  let result;
  try {
    result = await deliverLead(lead, { idempotencyKey: `enquiry-${ref}` });
  } catch (err) {
    console.error("[enquiry] delivery threw:", err?.message || err);
    result = { ok: false, configured: true };
  }
  await refStore.settle(ref, result.ok);

  if (!result.ok) {
    return res.status(result.configured ? 502 : 503).json({ ok: false, error: FAIL_MESSAGE });
  }
  return res.status(200).json({ ok: true, reference: ref });
}

module.exports = handler;
module.exports.validate = validate;
module.exports._refStore = refStore;
