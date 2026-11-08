# Maison Marnier

Cloudflare Worker `lume-living-dev` serving [maisonmarnier.com](https://maisonmarnier.com).

Deploy is automatic via **Cloudflare Workers Builds** on every push to `main` (`npx wrangler deploy`). Do not use GitHub Actions for deploy.

## Local development

```bash
cp .dev.vars.example .dev.vars
# fill secrets (see below)
npx wrangler d1 migrations apply LUME_DB --local
npx wrangler dev
```

Apply D1 migrations to production (use with care):

```bash
npx wrangler d1 migrations apply LUME_DB --remote
```

Dry-run a production bundle:

```bash
npx wrangler deploy --dry-run
```

## Project layout

| Path | Role |
|------|------|
| `src/worker.js` | Worker entry |
| `src/router.js` | HTTP routing |
| `src/auth.js` | Admin / import auth |
| `src/cj.js` | CJ Dropshipping client |
| `src/stripe.js` | Stripe Checkout + webhook verify |
| `src/commerce.js` | Cart checkout + fulfillment |
| `src/db/*` | D1 access |
| `src/pages/*` | HTML pages (storefront + admin) |
| `src/lib/*` | Shared helpers |
| `migrations/` | D1 schema |

## Secrets

Set in Cloudflare (Workers → `lume-living-dev` → Settings → Variables and Secrets) or `.dev.vars` locally. Never commit values.

| Secret | Use |
|--------|-----|
| `LUME_ADMIN_TOKEN` | Bearer token for `/admin` and admin APIs |
| `LUME_IMPORT_CODE` | Header `x-lume-import-code` for `POST /api/lume/import` |
| `CJ_API_KEY` | CJ Dropshipping API key |
| `STRIPE_SECRET_KEY` | Stripe secret key (`sk_live_…` / `sk_test_…`) |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret (`whsec_…`) for `/api/stripe/webhook` |

Optional vars (non-secret ok as plain vars):

| Var | Use |
|-----|-----|
| `CJ_ORDER_SANDBOX` | `1` = CJ sandbox orders (no real charge/ship) |
| `CJ_LOGISTIC_NAME` | CJ logistics method (default `CJPacket Ordinary`) |

### Stripe webhook

In Stripe Dashboard → Developers → Webhooks, add endpoint:

`https://maisonmarnier.com/api/stripe/webhook`

Event: `checkout.session.completed`. Paste the signing secret into `STRIPE_WEBHOOK_SECRET`.

## Auth

Public: `/api/store/*`, `/api/checkout`, storefront HTML, `/api/stripe/webhook` (Stripe signature).

Admin: `/api/cj/*`, `/api/lume/*`.

## Commerce flow

1. Customer adds products → `/cart` → `POST /api/checkout` creates a D1 order + Stripe Checkout Session (EUR, EU shipping address).
2. Stripe webhook `checkout.session.completed` marks the order paid and creates a CJ order (`createOrderV3`, balance payType=2).
3. Admin → **Orders**: list, retry CJ fulfill, refresh CJ status.

Shipping: €6.90 flat, free from €100.

## Main routes

- Store: `/`, `/cart`, `/checkout/success`, `/collections/:slug`, `/products/:slug`, `/journal`, info pages
- Admin UI: `/admin`
- APIs: `/api/checkout`, `/api/stripe/webhook`, `/api/lume/orders`, `/api/lume/orders/fulfill`, `/api/lume/orders/refresh`

## Notes

- Do not edit the Worker in the Cloudflare dashboard editor — the next git deploy overwrites it.
- Do not change DNS/DMARC for `maisonmarnier.com`.
- CJ fulfillment requires CJ account balance when `payType=2`. Use `CJ_ORDER_SANDBOX=1` while testing.
