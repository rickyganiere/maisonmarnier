import { esc } from '../lib/escape.js';
import { htmlPage, productCard } from '../lib/html.js';
import { getLiveProducts } from '../db/products.js';

/** Exact Maison category labels preferred; keyword fallbacks for older rows. */
export const COLLECTION_RULES = {
  new: { categories: [], keywords: [] },
  decor: {
    categories: ['Decor', 'Objects', 'Wall Decor', 'Candles', 'Lighting', 'Textiles', 'Seasonal'],
    keywords: ['decor', 'ornament', 'home'],
  },
  textiles: { categories: ['Textiles'], keywords: ['pillow', 'cushion', 'textile', 'throw', 'blanket', 'linen'] },
  objects: { categories: ['Objects'], keywords: ['vase', 'ornament', 'sculpture', 'tray', 'object', 'statue'] },
  candles: { categories: ['Candles'], keywords: ['candle', 'diffuser', 'fragrance', 'incense', 'candlestick'] },
  'wall-decor': { categories: ['Wall Decor'], keywords: ['wall', 'tapestry', 'poster', 'mirror', 'frame', 'decal'] },
  seasonal: { categories: ['Seasonal'], keywords: ['christmas', 'seasonal', 'holiday', 'xmas', 'santa'] },
  lighting: { categories: ['Lighting'], keywords: ['lamp', 'light', 'lantern', 'led', 'projector'] },
  furniture: { categories: ['Furniture'], keywords: ['table', 'chair', 'shelf', 'stool', 'cabinet', 'furniture'] },
};

const CHIP_LINKS = [
  ['New', '/collections/new'],
  ['Decor', '/collections/decor'],
  ['Lighting', '/collections/lighting'],
  ['Seasonal', '/collections/seasonal'],
  ['Objects', '/collections/objects'],
  ['Candles', '/collections/candles'],
  ['Wall Decor', '/collections/wall-decor'],
  ['Textiles', '/collections/textiles'],
];

function matchesCollection(p, rule) {
  const cat = String(p.category || '').trim();
  if (rule.categories.length && rule.categories.some((c) => c.toLowerCase() === cat.toLowerCase())) {
    return true;
  }
  if (!rule.keywords.length) return !rule.categories.length;
  const t = ((p.name || '') + ' ' + cat).toLowerCase();
  return rule.keywords.some((w) => t.includes(w));
}

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

    const rule = COLLECTION_RULES[slug];
    const ps = slug === 'new' || (!rule.categories.length && !rule.keywords.length)
      ? all
      : all.filter((p) => matchesCollection(p, rule));

    const title = q
      ? `Search: ${q}`
      : slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
    const lead = q
      ? `${ps.length} result${ps.length === 1 ? '' : 's'} for “${esc(q)}”`
      : 'An edited selection for calm, considered rooms.';

    const chips = CHIP_LINKS.map(
      ([label, href]) =>
        `<a class="chip${href.endsWith('/' + slug) ? ' is-active' : ''}" href="${href}">${esc(label)}</a>`,
    ).join('');

    const cards =
      ps.map(productCard).join('') ||
      `<p class="empty">${q ? 'No products match this search.' : 'No published products in this collection yet.'}</p>`;

    return htmlPage(
      title,
      `<div class="head">
         <div><h1>${esc(title)}</h1><p class="lead">${lead}</p></div>
         <div class="head-meta">${ps.length} piece${ps.length === 1 ? '' : 's'}</div>
       </div>
       <div class="chips">${chips}</div>
       <div class="grid">${cards}</div>`,
    );
  } catch {
    return htmlPage('Collection', '<h1>Collection</h1><p class="empty">Could not load this collection.</p>', {
      status: 500,
    });
  }
}
