// Agent HQ is a separate, optional lead route alongside Resend and n8n. No network: fetch is stubbed.
const test = require("node:test");
const assert = require("node:assert/strict");
const { deliverLead, agentHqLead } = require("../api/_lib/lead-delivery.js");

const KEY = "shqe_" + "a".repeat(64);
const lead = { name: "Test Person", email: "test@example.com", service: "assistant", business_name: "Fictional Studio",
  enquiry_summary: "TEST ONLY: evening questions", reference: "test-ref-1", consent: true, source: "form" };

function stub(statusFor) {
  const calls = [];
  global.fetch = async (url, init) => {
    calls.push({ url, init });
    const status = statusFor(url);
    if (status === "throw") throw new Error("network down");
    return { ok: status < 300, status, text: async () => "" };
  };
  return calls;
}
function env(o) {
  for (const k of ["RESEND_API_KEY", "SPARKLAB_LEAD_WEBHOOK", "AGENT_HQ_ENQUIRY_WEBHOOK", "AGENT_HQ_ENQUIRY_KEY"]) delete process.env[k];
  Object.assign(process.env, o);
}

test("all three routes coexist: email, n8n and Agent HQ each get the lead once", async () => {
  env({ RESEND_API_KEY: "re_test", SPARKLAB_LEAD_WEBHOOK: "https://n8n.example.com/webhook/lead",
    AGENT_HQ_ENQUIRY_WEBHOOK: "https://agent-hq.example.com/api/enquiry-intake", AGENT_HQ_ENQUIRY_KEY: KEY });
  const calls = stub(() => 200);
  const r = await deliverLead(lead, { idempotencyKey: "enquiry-test-ref-1" });
  assert.equal(r.ok, true);
  assert.deepEqual(r.routes, { email: true, n8n: true, agentHq: true });
  assert.equal(calls.filter((c) => c.url === "https://api.resend.com/emails").length, 1, "notification email still sent");
  assert.equal(calls.filter((c) => c.url.startsWith("https://n8n.")).length, 1, "n8n unchanged");
  const hq = calls.find((c) => c.url.includes("agent-hq"));
  assert.equal(hq.init.headers.Authorization, `Bearer ${KEY}`);
  assert.equal(hq.init.headers["Idempotency-Key"], "enquiry-test-ref-1");
  assert.equal(JSON.parse(hq.init.body).reference, "test-ref-1");
  assert.ok(!calls.find((c) => c.url.startsWith("https://n8n.")).init.headers.Authorization, "Agent HQ key never sent to n8n");
});

test("Agent HQ is skipped entirely when not configured (existing behaviour unchanged)", async () => {
  env({ RESEND_API_KEY: "re_test" });
  const calls = stub(() => 200);
  const r = await deliverLead(lead);
  assert.equal(r.ok, true);
  assert.equal(calls.length, 1);
  assert.equal((await agentHqLead(lead)).skipped, true);
});

test("misconfigured key or non-https URL is refused without sending", async () => {
  env({ AGENT_HQ_ENQUIRY_WEBHOOK: "http://insecure.example.com", AGENT_HQ_ENQUIRY_KEY: KEY });
  let calls = stub(() => 200);
  assert.equal((await agentHqLead(lead)).ok, false);
  assert.equal(calls.length, 0);
  env({ AGENT_HQ_ENQUIRY_WEBHOOK: "https://agent-hq.example.com/x", AGENT_HQ_ENQUIRY_KEY: "wrong" });
  calls = stub(() => 200);
  assert.equal((await agentHqLead(lead)).ok, false);
  assert.equal(calls.length, 0);
});

test("Agent HQ failure is logged by reference only and never blocks email delivery", async () => {
  env({ RESEND_API_KEY: "re_test", AGENT_HQ_ENQUIRY_WEBHOOK: "https://agent-hq.example.com/api/enquiry-intake", AGENT_HQ_ENQUIRY_KEY: KEY });
  stub((url) => (url.includes("agent-hq") ? "throw" : 200));
  const logged = [];
  const orig = console.error;
  console.error = (...a) => logged.push(a.join(" "));
  try {
    const r = await deliverLead(lead);
    assert.equal(r.ok, true, "email still delivered");
    assert.deepEqual(r.routes, { email: true, n8n: false, agentHq: false });
  } finally { console.error = orig; }
  const line = logged.find((l) => l.includes("[agent-hq]"));
  assert.ok(line && line.includes("test-ref-1"));
  assert.ok(!line.includes("test@example.com") && !line.includes(KEY), "no customer data or secret in logs");
});
