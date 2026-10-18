# SparkLab Studio site

**The marketing site for SparkLab, a small web design and automation studio, plus a set of AI assistants for local service businesses (salons, clinics, studios) that run as serverless functions.**

**Live site:** [wearesparklab.com](https://wearesparklab.com/)

The front end is plain HTML and CSS with no framework. The interesting part is `api/`, which holds ten Claude-powered endpoints that I built and demo on the site.

## The AI endpoints

Each is a Vercel serverless function that calls the Anthropic API. The API key stays server-side, and conversation state is sent with each request because the API is stateless.

| Endpoint | What it does |
|---|---|
| `assistant` | Booking assistant that answers only from a business's own knowledge block |
| `studio-assistant` | Out-of-hours enquiry chat on this site that captures leads |
| `faq-answerer` | Lightweight "before you book / is this for me?" answerer for a single service page. It doesn't quote prices or take bookings |
| `treatment-matcher` | Asks 2-3 questions and returns one recommended service as structured JSON |
| `reply-drafter` | Self-serve prototype: drafts a reply to a customer enquiry in the owner's voice |
| `intake-summariser` | Private back-office tool: turns a messy intake form into a short pre-appointment brief and flags anything that matches the business's "not suitable if" list. It never diagnoses |
| `content-generator` | Private back-office tool: batches of Instagram or Facebook captions in the practitioner's own voice |
| `no-show-saver` | Drafts appointment reminders and warm rebooking messages after a cancellation |
| `review-collector` | Drafts the private "how did it go?" message sent after an appointment |
| `review-responder` | Drafts graceful public replies to reviews, including low-star ones |

**Design choices**

- **Honesty rule:** the model may only use facts the business supplied. In `reply-drafter`, anything missing, such as a price or an address, becomes a `[placeholder]` in the draft and an entry in a `gaps` list, so it never invents details.
- **Multi-client by config:** each business is a standalone knowledge file in `api/_knowledge/` (two fictional examples are included). A client registry maps a client id to its config.
- **Usage protection:** `api/_lib/ratelimit.js` applies per-IP limits with Upstash Redis. If Redis is unavailable it falls back to a small in-memory allowance, so a client's live site keeps working.

## Tech stack

HTML/CSS/vanilla JS, Vercel (static hosting and serverless functions), Anthropic API, Upstash Redis and Ratelimit, Vercel Analytics. The `npm run build` step inlines the CSS.

## Run it locally

```bash
git clone https://github.com/WeAreSparkLab/spark-lab-site.git
cd spark-lab-site
npm install
cp .env.example .env     # ANTHROPIC_API_KEY, Upstash Redis URL and token, lead webhook
vercel dev
```

All variables in `.env.example` are server-side only. On Vercel, set them under **Project Settings -> Environment Variables**. Without an API key the site still renders, but the assistants won't respond.

## Project layout

```
api/          Serverless AI endpoints (+ _knowledge/ client configs, _lib/ rate limiting)
studio/       Studio page, assistant widget and concept demos
apps/         App showcase and blog
blog/         Articles
scripts/      CSS inlining build step
```

## What I'd improve next

- Add automated tests and a small prompt-evaluation set for each endpoint.
- Validate model output against a JSON schema before it reaches the page.
- Add per-client usage and cost tracking.
- Remove the committed `.vercel/` folder and add it to `.gitignore`.
