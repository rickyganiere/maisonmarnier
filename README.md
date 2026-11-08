# Maison Marnier

Cloudflare Worker `lume-living-dev` serving [maisonmarnier.com](https://maisonmarnier.com).

Deploy is automatic via **Cloudflare Workers Builds** on every push to `main` (`npx wrangler deploy`). Do not use GitHub Actions for deploy.

## Local development

```bash
cp .dev.vars.example .dev.vars
# fill CJ_API_KEY, LUME_ADMIN_TOKEN, LUME_IMPORT_CODE
npx wrangler dev
```

Apply D1 migrations (remote production DB — use with care):

```bash
npx wrangler d1 migrations apply LUME_DB --remote
npx wrangler d1 migrations apply LUME_DB --local
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
| `src/db/*` | D1 access |
| `src/pages/*` | HTML pages (storefront + admin) |
| `src/lib/*` | Shared helpers |
| `migrations/` | D1 schema |

## Auth

| Secret | Use |
|--------|-----|
| `LUME_ADMIN_TOKEN` | Bearer token for `/admin` APIs and `/api/cj/*`, `/api/lume/*` (except import may also use import code) |
| `LUME_IMPORT_CODE` | Header `x-lume-import-code` for `POST /api/lume/import` automation |
| `CJ_API_KEY` | CJ Dropshipping API key |

Public: `/api/store/products`, `/api/store/home`, storefront HTML.

## Main routes

- Store: `/`, `/collections/:slug`, `/products/:slug`, `/journal`, info pages
- Admin UI: `/admin` (token login)
- Admin API: `/api/lume/products|update|publish|refresh|home|journal`, `/api/lume/import`
- CJ: `/api/cj/status`, `/api/cj/search` (admin auth required)

## Commerce (later)

Checkout is **not** implemented yet. Planned approach: Stripe Checkout + CJ order API for fulfillment. Cart CTA on the storefront is intentionally disabled until that work ships.

## Notes

- Do not edit the Worker in the Cloudflare dashboard editor — the next git deploy overwrites it.
- Do not change DNS/DMARC for `maisonmarnier.com`.
