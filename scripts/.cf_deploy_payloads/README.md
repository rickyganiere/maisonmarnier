# Cloudflare deploy payloads (temporary)

`logo_worker.js` is an esbuild bundle of `src/worker.js` used to PUT Worker content via Cloudflare MCP when wrangler credentials are unavailable in the agent VM.

Do not treat this as runtime source of truth — rebuild from `src/` before redeploying.
