import { siteUrl } from './lib/brand.js';
import { json, text } from './lib/layout.js';
import { createDigitalOfferCheckout, stripeConfigured, verifyStripeWebhook } from './lib/stripe.js';
import { aboutPage } from './pages/about.js';
import { contactPage } from './pages/contact.js';
import { homePage } from './pages/home.js';
import { mediaKitPage } from './pages/mediaKit.js';
import { offerPage } from './pages/offer.js';
import { watchPage } from './pages/watch.js';

async function tryAssets(request, env) {
  if (!env.ASSETS) return null;
  const url = new URL(request.url);
  // Only proxy obvious static paths to ASSETS; HTML routes stay in the Worker.
  if (!/\.(css|js|svg|png|jpg|jpeg|webp|ico|txt|xml|woff2?)$/i.test(url.pathname)) {
    return null;
  }
  const res = await env.ASSETS.fetch(request);
  if (res.status === 404) return null;
  return res;
}

export async function handleRequest(request, env) {
  const url = new URL(request.url);
  const { pathname } = url;

  const asset = await tryAssets(request, env);
  if (asset) return asset;

  if (pathname === '/health') {
    return json({ ok: true, service: 'nando-prestige', stripe: stripeConfigured(env) });
  }

  if (pathname === '/' && request.method === 'GET') return homePage(env);
  if (pathname === '/about' && request.method === 'GET') return aboutPage(env);
  if (pathname === '/watch' && request.method === 'GET') return watchPage(env);
  if (pathname === '/media-kit' && request.method === 'GET') return mediaKitPage(env);
  if (pathname === '/contact' && request.method === 'GET') return contactPage(env);
  if (pathname === '/contact' && request.method === 'POST') {
    try {
      await request.formData();
    } catch {
      /* ignore parse errors */
    }
    return contactPage(env, { sent: true });
  }

  if (pathname === '/offer' && request.method === 'GET') {
    return offerPage(env, { status: url.searchParams.get('status') || undefined });
  }

  if (pathname === '/api/checkout' && request.method === 'POST') {
    if (!stripeConfigured(env)) {
      return json({ error: 'Stripe is not configured' }, 503);
    }
    let email = '';
    try {
      const form = await request.formData();
      email = String(form.get('email') || '').trim();
    } catch {
      /* ignore */
    }
    const base = siteUrl(env).replace(/\/$/, '');
    try {
      const session = await createDigitalOfferCheckout(env, {
        successUrl: `${base}/offer?status=success`,
        cancelUrl: `${base}/offer?status=cancel`,
        customerEmail: email || undefined,
      });
      if (session.url) {
        return Response.redirect(session.url, 303);
      }
      return json({ error: 'No checkout URL returned' }, 502);
    } catch (err) {
      return json({ error: err.message || 'Checkout failed' }, 502);
    }
  }

  if (pathname === '/api/stripe/webhook' && request.method === 'POST') {
    const raw = await request.text();
    try {
      const event = await verifyStripeWebhook(env, raw, request.headers.get('Stripe-Signature'));
      if (event.type === 'checkout.session.completed') {
        return json({ received: true, product: 'reels-pack' });
      }
      return json({ received: true });
    } catch (err) {
      return json({ error: err.message || 'Webhook verify failed' }, 400);
    }
  }

  if (pathname === '/robots.txt') {
    return text(`User-agent: *\nAllow: /\nSitemap: ${siteUrl(env).replace(/\/$/, '')}/sitemap.xml\n`);
  }

  if (pathname === '/sitemap.xml') {
    const base = siteUrl(env).replace(/\/$/, '');
    const paths = ['/', '/about', '/watch', '/media-kit', '/offer', '/contact'];
    const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${paths.map((p) => `  <url><loc>${base}${p === '/' ? '' : p}</loc></url>`).join('\n')}
</urlset>`;
    return text(body, 200, 'application/xml; charset=utf-8');
  }

  return text('Not found', 404);
}
