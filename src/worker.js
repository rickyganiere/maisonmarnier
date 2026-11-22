import { handleRequest } from './router.js';
import { runDailyHomeDecorImport } from './jobs/importDailyHomeDecor.js';

export default {
  async fetch(request, env, ctx) {
    return handleRequest(request, env, ctx);
  },
  async scheduled(_controller, env, ctx) {
    ctx.waitUntil(runDailyHomeDecorImport(env, { target: 50, source: 'cron' }));
  },
};
