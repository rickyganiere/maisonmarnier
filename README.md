# Maison Marnier

Cloudflare Worker `lume-living-dev` serving [maisonmarnier.com](https://maisonmarnier.com).

Deploy is automatic via **Cloudflare Workers Builds** on every push to `main`. Set the Workers Builds **Deploy command** to `npm run deploy` so pending D1 migrations apply before the Worker ships. Do not use GitHub Actions for deploy.

`wrangler deploy` alone does **not** apply D1 migrations. Account features (for example `/cuenta/registro`) fail with `no such table: customers` if a migration lands in git without a remote apply.

## Local development

```bash
cp .dev.vars.example .dev.vars
# fill secrets (see below)
npm install
npm run db:migrations:local
npm run dev
```

Apply D1 migrations to production (use with care), or deploy (migrations + Worker):

```bash
npm run db:migrations:remote
npm run deploy
```

Dry-run a production bundle:

```bash
npm run deploy:dry-run
```

## Project layout

| Path | Role |
|------|------|
| `src/worker.js` | Worker entry |
| `src/router.js` | HTTP routing |
| `src/auth.js` | Admin / import auth |
| `src/cj.js` | CJ Dropshipping client |
| `src/suppliers/external.js` | Multi-supplier JSON draft import |
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
| `CJ_IOSS_TYPE` | `1` none / `2` own IOSS / `3` CJ IOSS (default for EU destinations) |
| `CJ_IOSS_NUMBER` | Required when `CJ_IOSS_TYPE=2` (own IOSS). For type `3` uses `CJ-IOSS`. |

### Stripe webhook

Endpoint (test mode already created for this account):

`https://maisonmarnier.com/api/stripe/webhook`

Events: `checkout.session.completed`, `checkout.session.expired`, `charge.refunded`.  
Copy the endpoint signing secret (`whsec_…`) into Cloudflare secret `STRIPE_WEBHOOK_SECRET`. Create a separate live-mode endpoint before going live.

### Stripe Tax

Checkout Sessions enable `automatic_tax`. Before live traffic:

1. Dashboard → **Tax** → add registrations (EU domestic / OSS / IOSS as applicable).
2. Confirm prices are **exclusive** of tax (storefront EUR retail + VAT on top).
3. Product tax code used: General Tangible Goods; shipping uses shipping tax code.

### Invoicing (B2B)

Use Stripe Dashboard to create/send invoices (branding + Hosted Invoice Page). No Worker API for invoices yet — Checkout remains the DTC path.

## Auth

Public: `/api/store/*`, `/api/checkout`, `/api/account/*`, storefront HTML, `/api/stripe/webhook` (Stripe signature).

Customer accounts: register/login at `/cuenta/registro` and `/cuenta/entrar` (HttpOnly `mm_session` cookie). Account hub `/cuenta` shows orders + wishlist. Guest checkout still works; paid orders link to an account when the email matches.

Admin: `/api/cj/*`, `/api/lume/*`.

Legal (ES): `/privacidad`, `/cookies`, `/terminos`. Storefront UI is Spanish (`lang="es"`).

External supplier drafts: `POST /api/lume/import-external` with `{ supplier: "SPOCKET", products: [...] }` (or admin → **Other suppliers**). Non-CJ line items fulfill as manual.

## Commerce flow

1. Customer adds products → `/cart` → `POST /api/checkout` creates a D1 order + Stripe Checkout Session (EUR, EU shipping address).
2. Stripe webhook `checkout.session.completed` marks the order paid and creates a CJ order (`createOrderV3`, balance payType=2).
3. Admin → **Orders**: list, retry CJ fulfill, refresh CJ status.

Shipping: €6.90 flat, free from €100.

## Main routes

- Store: `/`, `/cart`, `/checkout/success`, `/collections/:slug`, `/products/:slug`, `/journal`, info pages
- Account: `/cuenta`, `/cuenta/registro`, `/cuenta/entrar`
- Legal: `/privacidad`, `/cookies`, `/terminos`
- Admin UI: `/admin`
- APIs: `/api/checkout`, `/api/account/*`, `/api/stripe/webhook`, `/api/lume/orders`, `/api/lume/orders/fulfill`, `/api/lume/orders/refresh`

## Notes

- Do not edit the Worker in the Cloudflare dashboard editor — the next git deploy overwrites it.
- Do not change DNS/DMARC for `maisonmarnier.com`.
- CJ fulfillment requires CJ account balance when `payType=2`. Use `CJ_ORDER_SANDBOX=1` while testing.


## Instagram product publishing

In `/admin#instagram`, connect the store’s Business or Creator account, `@maison.marnier`. Open the existing **Manage messaging & content on Instagram** use case in the [MaisonMarnier app dashboard](https://developers.facebook.com/apps/1142354558336214/dashboard/). In its API setup, add the account under **Generate access tokens**, accept its Instagram tester invitation if prompted, and select **Generate token** next to the handle. Paste the token in the admin’s private connection field.

Unified Login uses `instagram_basic` and `instagram_content_publish`. Instagram Login uses `instagram_business_basic` and `instagram_business_content_publish`. The admin verifies the handle and the publishing permission before saving the token encrypted. Instagram Login long-lived tokens refresh on use after 30 days. Unified Login tokens follow the expiry selected in Meta. Reconnect in Settings when a token expires.

Open **Published → Post to Instagram**, or use the same action in **Edit**. Select one photo for a single-image post or several photos for one carousel, review the social-focused caption, and press **Publish to Instagram**. The composer resumes pending submissions and links to the published post when Meta supplies its permalink. Carousel posts can contain up to 20 media items and count as one published post against Meta’s daily limit.

Deployment requires migrations through `0007_instagram_login_method.sql` and the Worker secret `INSTAGRAM_TOKEN_KEY` (32 random bytes, base64 encoded). Keep the key stable across deployments. Reconnect the Instagram account after replacing it.

### Instagram Studio

Post to Instagram opens a dedicated mockup composer. Generate five portrait 4:5 scenes from the product references and the homepage interior style, review them, and select four or five for a carousel. Supplier photos remain reference inputs; new posts cannot publish them directly. Existing pending publications remain recoverable.

Requires migration `0009_instagram_studio.sql` and the `INSTAGRAM_MEDIA` R2 binding (`maison-marnier-instagram`). Connect an existing OpenAI key in the private composer, or configure `OPENAI_API_KEY` as a Worker secret. The composer verifies model access and stores only an AES-GCM encrypted credential in D1, using the existing `INSTAGRAM_TOKEN_KEY` with studio-specific authenticated data. Never log keys or provider response bodies.

Each scene is generated once for the current product references, saved in R2, and reusable after reload. A D1 lease prevents concurrent duplicate edits. Generation sends JSON whitespace heartbeats while waiting for OpenAI; the composer creates scenes sequentially and retains completed images after errors. Keep the composer open during generation. Review product fidelity before publishing; image quality and live OpenAI access require verification with the connected account.

Image edit API reference: https://developers.openai.com/api/reference/resources/images/methods/edit

Validation: `node --test test/instagram-publishing.test.mjs test/instagram-studio.test.mjs`.
