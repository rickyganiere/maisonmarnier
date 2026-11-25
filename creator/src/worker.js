import { handleRequest } from './router.js';

export default {
  async fetch(request, env, ctx) {
    try {
      return await handleRequest(request, env, ctx);
    } catch (err) {
      console.error(err);
      return new Response('Internal error', { status: 500 });
    }
  },
};
