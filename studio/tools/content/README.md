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

Everything else (business name, services, location, bookingLink, tone) reuses the
existing booking-assistant config shape — nothing else to add.

## Guardrails (in the function's system prompt)
- Writes in the client's voice using `voiceSamples`.
- **No medical claims, cures or diagnoses.** Honours the `avoid` list.
- Only references the client's listed services — never invents services/prices/offers.
- Soft booking nudge only when it fits; relevant + 1–2 local hashtags (not walls);
  platform-appropriate length (Instagram vs Facebook).

## Set up a NEW client
1. Copy `api/_knowledge/willow-lane-massage.js` → `api/_knowledge/<client>.js` and
   fill in their details **plus** `voiceSamples` and `avoid`.
2. Point the generator at it: in `api/content-generator.js`, change
   `require("./_knowledge/willow-lane-massage.js")` → your new file. *(Same swap
   pattern as the booking assistant. A single shared endpoint serves one config at
   a time; for multiple live clients, duplicate the endpoint per client.)*
3. Copy `studio/tools/content/index.html` to a client-specific path if you want a
   separate private link, and update the heading/topic options to match their services.

## The private link
- The tool lives at **`/studio/tools/content`** (or your per-client copy).
- It is **not linked anywhere** — share the URL directly with the client.
- It's kept out of search by: `noindex,nofollow` on the page **and**
  `Disallow: /studio/tools/` in `/robots.txt`.
- **Phase 2 (recommended before real client use): add a password / login gate.**
  Right now it's private-by-obscurity only — anyone with the link can open it.
