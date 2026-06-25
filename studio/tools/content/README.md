# Social content generator (private back-office tool)

Generates a batch of social captions (caption + hashtags + photo idea) in a
practitioner's own voice. **It is a private tool the practitioner uses — it is
never embedded on a client's public website.**

Two surfaces, one engine:

| Surface | Where | What |
|---|---|---|
| Public **taster** | `/studio` → "Content helper" pill | 3 sample posts for the Willow Lane demo, so a prospect sees the output |
| Private **tool** | `/studio/tools/content` | Full generator (3–8 posts + vibe), `noindex`, not in nav/sitemap, direct link only |

| Piece | File |
|---|---|
| Function (server-side Claude call) | `api/content-generator.js` |
| Shared widget | `studio/content-generator.js` |
| Styles | `studio/studio.css` (`.cg-*`) |
| Private page | `studio/tools/content/index.html` |
| Per-client config | `api/_knowledge/<business>.js` |

## Requirements
- `ANTHROPIC_API_KEY` in Vercel env (already set — same key the other assistants use).
- Model `claude-sonnet-4-6`, structured JSON output, parsed safely with a fallback.

## Config — the two new fields

Add these to the per-client config (same file/shape the booking assistant uses,
e.g. `api/_knowledge/willow-lane-massage.js`):

```js
// 3–5 of the client's REAL captions. The generator imitates this voice.
voiceSamples: [
  "That feeling when your shoulders finally drop from your ears 😮‍💨 …",
  "Grey Norwich morning? A slow, quiet hour is allowed. …",
  // …
],

// Words / claims the generator must NEVER use.
avoid: [
  "medical or cure claims (cures, heals, fixes, treats a condition)",
  "'detox', 'flushes toxins', 'boosts your immune system'",
  "discounts or offers that haven't actually been announced",
  // …
],
```

For the private tool's access + monthly allowance, also set:

```js
// The private link must carry ?k=<contentToken>. Treat like a password; unique
// per client. Leave unset to disable token-gating (not recommended).
contentToken: "wl-demo-2k7f9q",
contentMonthlyLimit: 12,   // generations per calendar month (default 12)
clientId: "willow-lane",   // stable id for the monthly Redis key (defaults to slug of name)
```

Everything else (business name, services, location, bookingLink, tone) reuses the
existing booking-assistant config shape — nothing else to add.

## Guardrails (in the function's system prompt)
- Writes in the client's voice using `voiceSamples`.
- **No medical claims, cures or diagnoses.** Honours the `avoid` list.
- Only references the client's listed services — never invents services/prices/offers.
- Soft booking nudge only when it fits; relevant + 1–2 local hashtags (not walls);
  platform-appropriate length (Instagram vs Facebook).

## Multi-client: how it knows which client is which

All the agents are **multi-client** via one registry, `api/_knowledge/index.js`,
which maps a client id → that client's config. A request carries the id and the
function loads the right config — no per-client endpoints.

- The **content tool** & **booking/matcher** widgets send the id from a
  `data-client="<id>"` attribute on their root element (falling back to `?c=<id>`).
- The **topic dropdown is built from that client's own `services`** — the widget
  calls `GET /api/content-generator?c=<id>` on load and fills the options. So each
  client automatically sees their own treatments.
- The public `/studio` demos default to `willow-lane`.

### Set up a NEW client
1. Copy `api/_knowledge/willow-lane-massage.js` → `api/_knowledge/<client>.js`,
   fill in their details (set a unique `clientId`, `contentToken`, and the
   `voiceSamples` / `avoid` fields).
2. Register it: add one line to `CLIENTS` in `api/_knowledge/index.js`, keyed by
   the `clientId`. **That's the only code change — every agent now serves them.**
3. Give them their private tool: copy `studio/tools/content/index.html` to a
   client-specific path and set `data-client="<their clientId>"` on `#cgRoot`
   (the topic options then load from their config automatically). Share the link
   as `…/their-page?k=<their contentToken>`.
4. For their public on-site booking/matcher widgets, set `data-client="<id>"` on
   the widget's root element in the embed you give them.

## The private link
- The tool lives at **`/studio/tools/content?k=<contentToken>`** — e.g.
  `https://wearesparklab.com/studio/tools/content?k=wl-demo-2k7f9q`.
  Share this exact URL (with the key) directly with the client.
- Without a matching `?k=`, the generator returns *"This link isn't valid"* — so
  a leaked plain `/studio/tools/content` link can't actually generate anything.
- It is **not linked anywhere**, kept out of search by `noindex,nofollow` on the
  page **and** `Disallow: /studio/tools/` in `/robots.txt`.
- **Phase 2 (recommended before scaling): add a real password / login gate.** The
  `?k=` token is a lightweight guard, not full auth.

## Usage protection (Upstash Redis)

All AI agent functions are rate-limited via one Upstash Redis instance.

**Set up (one-time):** in the Vercel dashboard → **Integrations → Upstash**, add
the free Redis (one click). It injects **`UPSTASH_REDIS_REST_URL`** and
**`UPSTASH_REDIS_REST_TOKEN`** as env vars — nothing else to configure.

| Function | Protection |
|---|---|
| `assistant` / `treatment-matcher` / `studio-assistant` (public) | Per-IP: **8/min** + **40/day** (sliding windows) → HTTP 429 with a calm message |
| `content-generator` **taster** (public) | Same per-IP limits; always 3 posts; no token |
| `content-generator` **full tool** (private) | `?k=` token must match `contentToken`; **monthly cap** (`contentMonthlyLimit`, default 12) keyed `content:<clientId>:<YYYY-MM>` |

**Fail-safe:** if Redis is unreachable or the env vars are missing, the limiter
**logs and falls back to a small in-memory allowance** per warm instance — agents
keep working rather than hard-breaking a client's live site. (Limiting is just
best-effort until Redis is reachable.)

Real client IP is read from Vercel's **`x-real-ip`** header (not the spoofable
`x-forwarded-for`). Limits live at the top of each function file; the shared logic
is in `api/_lib/ratelimit.js`.
