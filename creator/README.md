# June Signal

Disclosed AI creator brand — YouTube-first tech comedy lifestyle. This Worker serves the public brand site and a Stripe Checkout stub for the digital Shorts Script Pack.

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

Everything under `content/` is the production system:

| Path | Purpose |
|------|---------|
| `content/CHARACTER_BIBLE.md` | Voice, look, disclosure, pillars |
| `content/scripts/shorts-01-30.md` | 30 Shorts scripts |
| `content/scripts/longform-outlines.md` | 8 long-form outlines |
| `content/prompts/` | Avatar / scene prompt packs |
| `content/calendar-30-day.md` | First 30 days |
| `content/sops/` | Upload + account setup checklists |

## Disclosure

Every bio, description, and page must state that June Signal is an AI / virtual character — not a real person. No fake human identity, no bought engagement.
