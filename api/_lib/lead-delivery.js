// =============================================================================
// Lead delivery, shared by the enquiry chat (/api/studio-assistant) and the
// structured enquiry form (/api/enquiry).
// =============================================================================
//
// Two independent routes, tried together. A lead counts as delivered if EITHER
// succeeds, so a stopped n8n instance can't lose an enquiry.
//   1. Email straight to Sara via Resend   (RESEND_API_KEY)        — primary
//   2. n8n webhook → Gmail → Notion        (SPARKLAB_LEAD_WEBHOOK) — optional extra
//
// Env vars (server-side only):
//   RESEND_API_KEY, LEAD_EMAIL_FROM (domain verified in Resend), LEAD_EMAIL_TO,
//   SPARKLAB_LEAD_WEBHOOK
// =============================================================================

const FALLBACK_EMAIL = "sara@wearesparklab.com";
const DELIVERY_TIMEOUT_MS = 7000;

// The service options offered on the website. Keys are what the browser sends.
const SERVICES = {
  website: "A website",
  assistant: "An AI assistant",
  automation: "Automating repetitive tasks",
  unsure: "Not sure yet",
};

const oneLine = (v, max = 500) => String(v ?? "").replace(/[\r\n]+/g, " ").trim().slice(0, max);
const multiLine = (v, max = 2000) => String(v ?? "").replace(/\r\n?/g, "\n").trim().slice(0, max);
const EMAIL_RE = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/;

function serviceLabel(key) {
  return SERVICES[key] || "";
}

function buildEmail(lead) {
  const env = process.env.VERCEL_ENV || "development";
  const tag = env === "production" ? "" : `[${env}] `;
  const email = oneLine(lead.email);
  const service = serviceLabel(lead.service);
  const lines = [
    `Interested in: ${service || "(not chosen)"}`,
    "",
    `Name: ${oneLine(lead.name)}`,
    `Email: ${email || "(not given)"}`,
    `WhatsApp: ${oneLine(lead.phone) || "(not given)"}`,
    `Prefers contact by: ${oneLine(lead.contact_preference) || "(not stated)"}`,
    `Business: ${oneLine(lead.business_name) || "(not given)"}`,
  ];
  if (lead.business_type) lines.push(`Type: ${oneLine(lead.business_type)}`);
  if (typeof lead.in_niche === "boolean") lines.push(`Wellness/beauty: ${lead.in_niche ? "yes" : "no"}`);
  if (lead.website) lines.push(`Existing website: ${oneLine(lead.website)}`);
  if (lead.context) lines.push(`Came from: ${oneLine(lead.context, 120)}`);
  lines.push("", "What they need:", multiLine(lead.enquiry_summary), "");
  if (lead.consent === true) lines.push("They agreed to be contacted about this enquiry.");
  lines.push(
    `Sent by the website ${lead.source === "form" ? "enquiry form" : "enquiry assistant"} (${env}) at ${new Date().toISOString()}.`,
    lead.reference ? `Reference: ${oneLine(lead.reference, 80)}` : "",
    email ? "Reply to this email to answer them directly." : "No email given: reply on WhatsApp."
  );

  const subjectBits = [oneLine(lead.name) || "unknown"];
  if (lead.business_name) subjectBits.push(`(${oneLine(lead.business_name)})`);
  const body = {
    from: process.env.LEAD_EMAIL_FROM || `SparkLab website <enquiries@wearesparklab.com>`,
    to: [process.env.LEAD_EMAIL_TO || FALLBACK_EMAIL],
    subject: `${tag}New enquiry${service ? ` · ${service}` : ""}: ${subjectBits.join(" ")}`.slice(0, 200),
    text: lines.filter((l, i, a) => !(l === "" && a[i - 1] === "")).join("\n"),
  };
  if (EMAIL_RE.test(email)) body.reply_to = email;
  return body;
}

async function emailLead(lead, { idempotencyKey } = {}) {
  const key = process.env.RESEND_API_KEY;
  if (!key) return { ok: false, skipped: true };
  const headers = { Authorization: `Bearer ${key}`, "Content-Type": "application/json" };
  // Resend de-duplicates sends that share a key for 24h, a second guard against double emails.
  if (idempotencyKey) headers["Idempotency-Key"] = String(idempotencyKey).slice(0, 256);
  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers,
      body: JSON.stringify(buildEmail(lead)),
      signal: AbortSignal.timeout(DELIVERY_TIMEOUT_MS),
    });
    if (!r.ok) console.error("Lead email (Resend) returned non-OK status:", r.status, (await r.text()).slice(0, 300));
    return { ok: r.ok };
  } catch (err) {
    console.error("Lead email (Resend) failed:", err?.message || err);
    return { ok: false };
  }
}

async function webhookLead(lead) {
  const url = process.env.SPARKLAB_LEAD_WEBHOOK;
  if (!url) return { ok: false, skipped: true };
  try {
    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...lead, service_label: serviceLabel(lead.service) || undefined }),
      signal: AbortSignal.timeout(DELIVERY_TIMEOUT_MS),
    });
    if (!r.ok) console.error("Lead webhook returned non-OK status:", r.status);
    return { ok: r.ok };
  } catch (err) {
    console.error("Lead webhook POST failed:", err?.message || err);
    return { ok: false };
  }
}

// → { ok, configured }  configured=false means no route is set up at all.
async function deliverLead(lead, opts) {
  const [email, webhook] = await Promise.all([emailLead(lead, opts), webhookLead(lead)]);
  const configured = !(email.skipped && webhook.skipped);
  if (!configured) console.error("Neither RESEND_API_KEY nor SPARKLAB_LEAD_WEBHOOK is set — lead could not be delivered.");
  return { ok: email.ok || webhook.ok, configured };
}

module.exports = { deliverLead, buildEmail, SERVICES, serviceLabel, FALLBACK_EMAIL, EMAIL_RE, oneLine, multiLine };
