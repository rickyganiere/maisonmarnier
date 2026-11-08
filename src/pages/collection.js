import { esc } from '../lib/escape.js';
import { htmlPage, productCard } from '../lib/html.js';
import { getLiveProducts } from '../db/products.js';

export const COLLECTION_RULES = {
  new: [],
  decor: [],
  textiles: ['pillow', 'cushion', 'textile', 'throw', 'blanket', 'linen', 'curtain'],
  objects: ['vase', 'ornament', 'sculpture', 'tray', 'ceramic', 'object'],
  candles: ['candle', 'diffuser', 'fragrance', 'incense'],
  'wall-decor': ['wall', 'poster', 'art', 'mirror', 'frame', 'painting'],
  seasonal: ['christmas', 'easter', 'halloween', 'seasonal', 'holiday'],
  lighting: ['lamp', 'light', 'lantern'],
  furniture: ['table', 'chair', 'shelf', 'stool', 'cabinet', 'furniture'],
};

export async function collectionPage(url, env) {
  try {
    const slug = decodeURIComponent(url.pathname.split('/').filter(Boolean)[1] || '').toLowerCase();
    const q = (url.searchParams.get('q') || '').trim().slice(0, 80);

    if (!slug || !(slug in COLLECTION_RULES)) {
      return htmlPage(
        'Collection not found',
        `<div class="head"><h1>Collection not found</h1></div>
         <p class="empty">This collection does not exist. <a href="/collections/decor">Browse decor →</a></p>`,
        { status: 404 },
      );
    }

    let all = await getLiveProducts(env, 100);
    if (q) {
      const qq = q.toLowerCase();
      all = all.filter((p) => {
        const t = ((p.name || '') + ' ' + (p.category || '') + ' ' + (p.description || '')).toLowerCase();
        return t.includes(qq);
      });
    }

    const words = COLLECTION_RULES[slug];
    const ps = !words.length
      ? all
      : all.filter((p) => {
          const t = ((p.name || '') + ' ' + (p.category || '')).toLowerCase();
          return words.some((w) => t.includes(w));
        });

    const title = q
      ? `Search: ${q}`
      : slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
    const lead = q
      ? `${ps.length} result${ps.length === 1 ? '' : 's'} for “${esc(q)}”`
      : 'An edited selection for calm, considered rooms.';

    const cards =
      ps.map(productCard).join('') ||
      `<p class="empty">${q ? 'No products match this search.' : 'No published products in this collection yet.'}</p>`;

    return htmlPage(
      title,
      `<div class="head"><div><h1>${esc(title)}</h1><p class="lead">${lead}</p></div></div>
       <div class="grid">${cards}</div>`,
    );
  } catch {
    return htmlPage('Collection', '<h1>Collection</h1><p class="empty">Could not load this collection.</p>', {
      status: 500,
    });
  }
}
