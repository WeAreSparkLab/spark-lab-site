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

## 2. Choose where captured leads go

When a visitor gives their name + email (or any time it's out of hours), the
assistant collects **name, business, email, what they need**, confirms a reply
within one business day, and the function calls `deliverLead()`. That function
tries, in order:

1. **`LEAD_WEBHOOK_URL`** — if set, the lead is `POST`ed there as JSON. This is
   the easy path to **Notion / Zapier / Make / a CRM**: paste a webhook URL and
   map the fields on the other end. *(Recommended if you want it in a database.)*
2. **`RESEND_API_KEY`** — if set (and no webhook), the lead is **emailed** via
   [Resend](https://resend.com). *(Recommended if you just want it in your inbox.)*
3. **Neither set** — the lead is written to the function logs so nothing is lost
   while you decide. The visitor still gets a normal confirmation.

### Option A — Email to your inbox (Resend)
1. Create a free Resend account, add an **API key**.
2. In Vercel env vars set:
   - `RESEND_API_KEY` = your Resend key
   - `LEAD_EMAIL` = where leads should land (default: `support@wearesparklab.com`)
   - `LEAD_FROM` *(optional)* = a verified sender, e.g. `SparkLab <hello@wearesparklab.com>`.
     Until you verify your domain, leave it unset and Resend's test sender is used
     (it can deliver to your own account email for testing).
3. Redeploy.

### Option B — Send to Notion / Zapier / a webhook
1. Create a webhook (Zapier "Catch Hook", Make, an n8n Webhook node, a Notion
   integration endpoint, etc.).
2. In Vercel env vars set `LEAD_WEBHOOK_URL` = that URL. Redeploy.
3. The JSON payload is:
   ```json
   {
     "name": "...", "business": "...", "email": "...", "need": "...",
     "receivedAt": "ISO-8601", "source": "SparkLab Studio site assistant",
     "transcript": "Visitor: ...\nAssistant: ..."
   }
   ```

To swap to a fully custom destination later, edit **only** `deliverLead()` in
`api/studio-assistant.js` — nothing else needs to change.

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

The model is instructed to append a hidden token to its confirmation message:

```
[[LEAD]]{"name":"...","business":"...","email":"...","need":"..."}
```

The function parses that token, delivers the lead, and **strips it out** before
the reply reaches the visitor — so they only ever see a normal, warm confirmation.

---

## Quick test after deploying

1. Open `/studio`, click **“Questions? Ask our assistant”** (bottom-right).
2. Ask: *“How much for a website and a booking assistant?”* → expect a warm,
   ballpark answer that nudges toward the monthly add-on.
3. Say: *“I'm interested — I'm Sam from Calm Hands Reflexology, sam@example.com.”*
   → expect a confirmation it'll reply within one business day, and a lead to
   arrive via whichever delivery you configured (or appear in the function logs).
