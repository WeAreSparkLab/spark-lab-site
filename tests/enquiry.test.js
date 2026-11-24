// Tests for /api/enquiry and the shared lead delivery. No network: fetch is stubbed.
// Run: npm test
const test = require("node:test");
const assert = require("node:assert/strict");

delete process.env.UPSTASH_REDIS_REST_URL; // force the in-memory stores
delete process.env.UPSTASH_REDIS_REST_TOKEN;
delete process.env.SPARKLAB_LEAD_WEBHOOK;

const handler = require("../api/enquiry.js");
const { buildEmail } = require("../api/_lib/lead-delivery.js");

let ipCounter = 0;
function call(body, { method = "POST" } = {}) {
  return new Promise((resolve) => {
    const res = {
      statusCode: 200, headers: {},
      setHeader(k, v) { this.headers[k] = v; },
      status(c) { this.statusCode = c; return this; },
      json(d) { resolve({ status: this.statusCode, body: d }); return this; },
    };
    // a fresh IP per call so the rate limiter doesn't interfere
    handler({ method, body, headers: { "x-real-ip": `10.0.0.${++ipCounter}` }, socket: {} }, res);
  });
}

const valid = (over = {}) => ({
  service: "assistant", name: "Test Person", business_name: "Fictional Test Studio",
  message: "TEST ONLY: we miss enquiries while with clients.", contact_preference: "email",
  email: "test@example.com", phone: "", website: "", consent: true, company: "",
  reference: `test-${Math.random().toString(36).slice(2, 12)}`, ...over,
});

let sent = [];
function stubResend(status = 200) {
  sent = [];
  process.env.RESEND_API_KEY = "re_test_dummy";
  global.fetch = async (url, init) => {
    sent.push({ url, init, body: JSON.parse(init.body) });
    return { ok: status < 300, status, text: async () => "" };
  };
}

test("rejects non-POST", async () => {
  const r = await call({}, { method: "GET" });
  assert.equal(r.status, 405);
});

test("missing required fields → 422 with per-field errors, nothing sent", async () => {
  stubResend();
  const r = await call(valid({ service: "", name: "", business_name: "", message: "hi", consent: false, email: "" }));
  assert.equal(r.status, 422);
  assert.equal(r.body.ok, false);
  for (const f of ["service", "name", "business_name", "message", "consent", "email"]) assert.ok(r.body.fields[f], f);
  assert.equal(sent.length, 0);
});

test("phone/WhatsApp preference requires a number, not an email", async () => {
  stubResend();
  const r = await call(valid({ contact_preference: "whatsapp", email: "", phone: "" }));
  assert.equal(r.status, 422);
  assert.ok(r.body.fields.phone);
  assert.ok(!r.body.fields.email);
});

test("phone-call preference is no longer offered → rejected", async () => {
  stubResend();
  const r = await call(valid({ contact_preference: "phone", phone: "07700900123" }));
  assert.equal(r.status, 422);
  assert.ok(r.body.fields.contact_preference);
  assert.equal(sent.length, 0);
});

test("valid enquiry → delivered via Resend, service retained in email", async () => {
  stubResend();
  const r = await call(valid({ website: "example.com", context: "Assistant demo: Booking assistant" }));
  assert.equal(r.status, 200);
  assert.equal(r.body.ok, true);
  assert.equal(sent.length, 1);
  const mail = sent[0].body;
  assert.match(sent[0].url, /api\.resend\.com/);
  assert.match(mail.subject, /An AI assistant/);
  assert.match(mail.text, /Interested in: An AI assistant/);
  assert.match(mail.text, /Existing website: https:\/\/example\.com/);
  assert.match(mail.text, /Came from: Assistant demo: Booking assistant/);
  assert.equal(mail.reply_to, "test@example.com");
  assert.ok(sent[0].init.headers["Idempotency-Key"]);
});

test("duplicate submission with same reference is not sent twice", async () => {
  stubResend();
  const body = valid();
  const a = await call(body);
  const b = await call(body);
  assert.equal(a.body.ok, true);
  assert.equal(b.body.ok, true);
  assert.equal(b.body.duplicate, true);
  assert.equal(sent.length, 1);
});

test("delivery failure → 502, never ok; same reference can be retried", async () => {
  stubResend(500);
  const body = valid();
  const r = await call(body);
  assert.equal(r.status, 502);
  assert.equal(r.body.ok, false);
  assert.match(r.body.error, /didn't send/);
  stubResend(200);
  const retry = await call(body);
  assert.equal(retry.body.ok, true);
  assert.equal(sent.length, 1);
});

test("network error during delivery → not ok", async () => {
  process.env.RESEND_API_KEY = "re_test_dummy";
  global.fetch = async () => { throw new Error("offline"); };
  const r = await call(valid());
  assert.equal(r.body.ok, false);
  assert.equal(r.status, 502);
});

test("no delivery route configured → 503, never ok", async () => {
  delete process.env.RESEND_API_KEY;
  global.fetch = async () => { throw new Error("should not be called"); };
  const r = await call(valid());
  assert.equal(r.status, 503);
  assert.equal(r.body.ok, false);
});

test("honeypot filled → rejected, nothing sent", async () => {
  stubResend();
  const r = await call(valid({ company: "Spam Ltd" }));
  assert.equal(r.body.ok, false);
  assert.equal(sent.length, 0);
});

test("missing/invalid reference → 400", async () => {
  stubResend();
  const r = await call(valid({ reference: "x" }));
  assert.equal(r.status, 400);
  assert.equal(sent.length, 0);
});

test("chat leads (no consent field, no service) still format cleanly", () => {
  const mail = buildEmail({ name: "A", email: "a@example.com", enquiry_summary: "Needs a site", source: "chat" });
  assert.match(mail.text, /Interested in: \(not chosen\)/);
  assert.match(mail.text, /enquiry assistant/);
  assert.doesNotMatch(mail.text, /agreed to be contacted/);
});
