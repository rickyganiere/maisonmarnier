# Nando Prestige

Disclosed AI creator brand — Instagram Reels-first Italian comedy character (Borazzi energy, original look). This Worker serves the public brand site and a Stripe Checkout stub for the Reels Pack.

Maison Marnier (repo root) is a separate storefront. Deploy this app on its own.

## Local development

```bash
cd creator
cp .dev.vars.example .dev.vars   # optional Stripe keys
npm install
npm run dev
```

Open the printed `localhost` URL. Pages: `/`, `/about`, `/watch`, `/media-kit`, `/offer`, `/contact`.

## Deploy

```bash
cd creator
npm run deploy
```

Set secrets in Cloudflare (or `wrangler secret put`):

- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- optional `STRIPE_PRICE_ID`

Update `[vars].SITE_URL` in `wrangler.toml` to your real domain, then attach custom domains in the Cloudflare dashboard.

Point Stripe webhook to `https://<your-domain>/api/stripe/webhook`.

## Content ops

| Path | Purpose |
|------|---------|
| `content/CHARACTER_BIBLE.md` | Voice, look, disclosure, pillars |
| `content/scripts/reels-01-30.md` | 30 Reels scripts |
| `content/scripts/longform-outlines.md` | Optional longer cuts |
| `content/prompts/` | Avatar / scene prompt packs |
| `content/calendar-30-day.md` | First 30 days |
| `content/sops/` | Upload + account setup checklists |
| `content/production/` | Batch-01 keyframes, shot lists, captions |

## Disclosure

Every bio, caption, and page must state that Nando Prestige is an AI / virtual character — not a real person. No fake human identity, no bought engagement, no cloning real actors’ faces.
