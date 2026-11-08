import { esc } from '../lib/escape.js';
import { htmlPage, productCard } from '../lib/html.js';
import { getLiveProductBySlug, getLiveProducts } from '../db/products.js';

export async function productPage(url, env) {
  try {
    const slug = decodeURIComponent(url.pathname.split('/').filter(Boolean)[1] || '');
    const p = await getLiveProductBySlug(env, slug);
    if (!p) {
      return htmlPage(
        'Product not found',
        `<div class="head"><h1>Product not found</h1></div>
         <p class="empty">This piece is no longer available. <a href="/collections/new">See new arrivals →</a></p>`,
        { status: 404 },
      );
    }

    const compare =
      Number(p.compare_at_price_eur) > Number(p.retail_price_eur)
        ? `<div class="muted" style="text-decoration:line-through">€${Number(p.compare_at_price_eur).toFixed(2)}</div>`
        : '';
    const stock = Number(p.stock || 0);
    const stockHint =
      stock <= 0
        ? '<p class="muted">Currently unavailable.</p>'
        : stock <= 5
          ? `<p class="muted">Only ${stock} left in supplier stock.</p>`
          : `<p class="muted">In stock · ships from partner warehouse.</p>`;

    const relatedAll = await getLiveProducts(env, 40);
    const related = relatedAll
      .filter((r) => r.slug !== p.slug)
      .filter((r) => {
        if (!p.category) return true;
        const a = (r.category || '').toLowerCase();
        const b = (p.category || '').toLowerCase();
        return a && b && (a.includes(b) || b.includes(a) || a === b);
      })
      .slice(0, 4);
    const relatedHtml = related.length
      ? `<section class="related"><h2>You may also like</h2><div class="grid">${related.map(productCard).join('')}</div></section>`
      : '';

    const body = `<div class="product">
      <img src="${esc(p.image_url || '')}" alt="${esc(p.name || '')}">
      <div>
        <div class="muted" style="letter-spacing:.08em;text-transform:uppercase;font-size:11px">${esc(p.category || 'Maison Marnier')}</div>
        <h1>${esc(p.name || '')}</h1>
        <div style="font:400 22px Georgia,serif">€${Number(p.retail_price_eur || 0).toFixed(2)}</div>
        ${compare}
        ${stockHint}
        <div class="desc"><p>${esc(p.description || 'Thoughtfully selected for Maison Marnier.')}</p></div>
        <button class="btn is-disabled" type="button" disabled>Add to cart — coming soon</button>
        <p class="muted" style="margin-top:10px">Checkout will arrive in a later release. Save pieces to your wishlist from the homepage in the meantime.</p>
      </div>
    </div>${relatedHtml}`;

    return htmlPage(p.name, body, {
      description: String(p.description || p.name || '').slice(0, 160),
    });
  } catch {
    return htmlPage('Product', '<p class="empty">Product error.</p>', { status: 500 });
  }
}
