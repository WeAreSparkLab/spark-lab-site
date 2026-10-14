# SparkLab site

Marketing site for SparkLab, deployed on Vercel. Static pages plus a few serverless functions in `api/`.

## Setup

1. `npm install`
2. Copy `.env.example` to `.env` and fill in your own values. `.env` is gitignored; never commit real keys.
3. Run locally with `vercel dev`, or deploy to Vercel and set the same variables in the project's Environment Variables. `npm run build` inlines the CSS.
