# SparkLab Studio — out-of-hours enquiry assistant

A floating chat assistant on **/studio** that answers visitor questions about
SparkLab's own services and pricing, and **captures enquiries when you're offline**
so no lead is lost. It doubles as a live demo of the product SparkLab sells.

## What's in it

| Piece | File |
|---|---|
| Serverless function (calls Anthropic, captures leads) | `api/studio-assistant.js` |
| Floating widget (launcher → chat panel) | `studio/studio-assistant-widget.js` |
| Styles (scoped, reuses the site's tokens) | `studio/studio.css` (`.sl-*` rules) |
| Loaded on the page | `studio/index.html` (two `<script>` tags + the `studio.css` link) |

> **Hosting note:** the original brief described a **Netlify function** and a
> **React component**. This site is a static site that **deploys on Vercel** and
> has **no build step / no React**, so — exactly as with the existing Booking
> Assistant — it's implemented as a **Vercel serverless function** (`/api/...`)
> plus a **framework-free widget**. Behaviour is identical: the API key stays
> server-side, and the full conversation is held in a state array and sent to the
> function on every call (the API is stateless).

---

## 1. Set the Anthropic API key (required)

The key must live in an environment variable named **`ANTHROPIC_API_KEY`** and
**never** in the frontend. The widget only ever calls `/api/studio-assistant`.

**On Vercel (this site):**
1. Vercel dashboard → your project → **Settings → Environment Variables**.
2. Add **`ANTHROPIC_API_KEY`** = your key (from <https://console.anthropic.com>).
   Scope: **Production** (and Preview if you want it on preview deploys).
3. **Redeploy** so the function picks it up.

> If you ever move to **Netlify** instead: create the same function under
> `netlify/functions/assistant.js`, and set `ANTHROPIC_API_KEY` in
> **Site settings → Environment variables**. The function body is the same.

Model: `claude-sonnet-4-6`, `max_tokens: 1024` (set at the top of
`api/studio-assistant.js`).

---

## 2. Set the lead webhook (required for leads to reach you)

Leads are delivered to an **n8n workflow** (Webhook → Gmail → Notion). Set the
webhook URL as one env var:

1. In n8n, open the workflow's **Webhook** node and copy its **Production URL**.
2. Vercel → **Settings → Environment Variables** → add
   **`SPARKLAB_LEAD_WEBHOOK`** = that URL. Scope: **Production**.
3. **Redeploy.**

`SPARKLAB_LEAD_WEBHOOK` is read **server-side only** — never exposed to the
front end. If it isn't set (or the POST fails), the assistant tells the visitor
to email `support@wearesparklab.com` directly, so a lead is never silently lost.

**Payload POSTed to the webhook** (the `capture_lead` tool's arguments):
```json
{
  "name": "...",
  "email": "...",
  "business_name": "...",
  "business_type": "dental practice | massage therapist | ...",
  "in_niche": true,
  "enquiry_summary": "one line on what they need"
}
```
(`name`, `email`, `enquiry_summary` are always present; the others may be absent.)

---

## 3. Things you'll likely want to edit

All in `api/studio-assistant.js`:

- **Knowledge / pricing / tone** — the `buildSystemPrompt()` string. Pricing is
  quoted as *ballpark only* and the assistant is told never to give a firm quote
  (it captures the enquiry instead).
- **Business hours** — the `BUSINESS_*` constants (default **Mon–Fri, 9am–5pm UK**).
  Keep these in sync with the same constants near the top of
  `studio/studio-assistant-widget.js` (used for the "we're offline" banner).
- **Reply window** — `REPLY_WINDOW` (default "one business day").

---

## How lead capture works (under the hood)

It uses the Anthropic **tool-use loop**, not text parsing:

1. The model is given a `capture_lead` tool. When it has the visitor's name,
   email and a one-line summary, it calls the tool.
2. The function POSTs the tool's structured arguments to `SPARKLAB_LEAD_WEBHOOK`
   and returns a `tool_result` saying whether the POST succeeded.
3. The model then writes its closing message to the visitor — a warm "Sara will
   reply within one business day" on success, or the email-fallback on failure.

Out-of-niche businesses (dental, clinics, professional services) are **never**
turned away — the assistant notes wellness/beauty is the specialism, says it'd
be a tailored quote, and captures the enquiry (with `in_niche: false`).

---

## Quick test after deploying

1. Open `/studio`, click **“Questions? Ask our assistant”** (bottom-right).
2. Ask: *“How much for a website and a booking assistant?”* → expect a warm,
   ballpark answer that nudges toward the monthly add-on.
3. Say: *“I'm interested — I'm Sam from Calm Hands Reflexology, sam@example.com.”*
   → expect a warm confirmation it'll reply within one business day, and a lead
   to land in your inbox + Notion via the n8n workflow.
4. Out-of-niche test: *“I run a dental practice, can you build our site?”* →
   it should welcome you (not refuse), say it'd be a tailored quote, and capture
   the enquiry with `in_niche: false`.
