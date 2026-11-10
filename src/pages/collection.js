import { esc } from '../lib/escape.js';
import { htmlPage, productCard } from '../lib/html.js';
import { breadcrumbJsonLd } from '../lib/seo.js';
import { getLiveProducts } from '../db/products.js';

/** Exact Maison category labels preferred; keyword fallbacks for older rows. */
export const COLLECTION_RULES = {
  new: { categories: [], keywords: [], blurb: 'Novedades para hogares serenos y cuidados.' },
  decor: {
    categories: ['Decor', 'Objects', 'Wall Decor', 'Candles', 'Lighting', 'Textiles', 'Seasonal'],
    keywords: ['decor', 'ornament', 'home'],
    blurb: 'La edición ampliada — objetos, luz y detalle silencioso.',
  },
  textiles: {
    categories: ['Textiles'],
    keywords: ['pillow', 'cushion', 'textile', 'throw', 'blanket', 'linen'],
    blurb: 'Capas suaves para sofás, camas y rincones de lectura.',
  },
  objects: {
    categories: ['Objects'],
    keywords: ['vase', 'ornament', 'sculpture', 'tray', 'object', 'statue'],
    blurb: 'Pequeñas piezas escultóricas que asientan una estantería.',
  },
  candles: {
    categories: ['Candles'],
    keywords: ['candle', 'diffuser', 'fragrance', 'incense', 'candlestick'],
    blurb: 'Luz cálida y fragancia serena para las noches.',
  },
  'wall-decor': {
    categories: ['Wall Decor'],
    keywords: ['wall', 'tapestry', 'poster', 'mirror', 'frame', 'decal'],
    blurb: 'Historias en la pared — tapices, vinilos y colgantes.',
  },
  seasonal: {
    categories: ['Seasonal'],
    keywords: ['christmas', 'seasonal', 'holiday', 'xmas', 'santa'],
    blurb: 'Acentos de temporada sin ruido visual.',
  },
  lighting: {
    categories: ['Lighting'],
    keywords: ['lamp', 'light', 'lantern', 'led', 'projector'],
    blurb: 'Brillo suave para escritorios, ventanas y mesitas.',
  },
  furniture: {
    categories: ['Furniture'],
    keywords: ['table', 'chair', 'shelf', 'stool', 'cabinet', 'furniture'],
    blurb: 'Formas útiles para un ritmo más pausado.',
  },
};

const COLLECTION_TITLES = {
  new: 'Novedades',
  decor: 'Decoración',
  textiles: 'Textiles',
  objects: 'Objetos',
  candles: 'Velas',
  'wall-decor': 'Decoración de pared',
  seasonal: 'Navidad',
  lighting: 'Iluminación',
  furniture: 'Mobiliario',
};

const CHIP_LINKS = [
  ['Novedades', '/collections/new'],
  ['Decoración', '/collections/decor'],
  ['Iluminación', '/collections/lighting'],
  ['Navidad', '/collections/seasonal'],
  ['Objetos', '/collections/objects'],
  ['Velas', '/collections/candles'],
  ['Pared', '/collections/wall-decor'],
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
        'Colección no encontrada',
        `<div class="head"><h1>Colección no encontrada</h1></div>
         <p class="empty">Esta colección no existe. <a href="/collections/decor">Ver decoración →</a></p>`,
        { status: 404 },
      );
    }

    let all = await getLiveProducts(env, 200);
    if (q) {
      const qq = q.toLowerCase();
      all = all.filter((p) => {
        const t = ((p.name || '') + ' ' + (p.category || '') + ' ' + (p.description || '')).toLowerCase();
        return t.includes(qq);
      });
    }

    const rule = COLLECTION_RULES[slug];
    const ps =
      slug === 'new' || (!rule.categories.length && !rule.keywords.length)
        ? all
        : all.filter((p) => matchesCollection(p, rule));

    const title = q ? `Búsqueda: ${q}` : COLLECTION_TITLES[slug] || slug;
    const lead = q
      ? `${ps.length} resultado${ps.length === 1 ? '' : 's'} para “${esc(q)}”`
      : rule.blurb || 'Una selección cuidada para hogares serenos.';

    const chips = CHIP_LINKS.map(
      ([label, href]) =>
        `<a class="chip${href.endsWith('/' + slug) ? ' is-active' : ''}" href="${href}">${esc(label)}</a>`,
    ).join('');

    const cards =
      ps.map(productCard).join('') ||
      `<p class="empty">${q ? 'Ningún producto coincide con esta búsqueda.' : 'Aún no hay productos publicados en esta colección.'}</p>`;

    const collectionPath = `/collections/${slug}`;
    const description = q
      ? `Resultados de búsqueda para “${q}” en Maison Marnier.`
      : `${rule.blurb || 'Una selección cuidada para hogares serenos.'} Compra ${title} en Maison Marnier.`;
    const jsonLd = breadcrumbJsonLd([
      { name: 'Inicio', path: '/' },
      { name: 'Tienda', path: '/collections/new' },
      { name: title, path: collectionPath },
    ]);

    return htmlPage(
      title,
      `<nav class="crumbs" aria-label="Miga de pan">
         <a href="/">Inicio</a><span class="sep">/</span>
         <a href="/collections/new">Tienda</a><span class="sep">/</span>
         <span>${esc(title)}</span>
       </nav>
       <section class="collection-top">
         <div class="head">
           <div>
             <h1>${esc(title)}</h1>
             <p class="lead">${lead}</p>
           </div>
           <div class="head-meta">${ps.length} pieza${ps.length === 1 ? '' : 's'}</div>
         </div>
       </section>
       <div class="toolbar">
         <div class="chips" role="navigation" aria-label="Colecciones">${chips}</div>
       </div>
       <div class="grid">${cards}</div>`,
      {
        description: description.slice(0, 160),
        canonical: collectionPath,
        noindex: Boolean(q),
        jsonLd,
        cache: 'public, max-age=300',
      },
    );
  } catch {
    return htmlPage('Colección', '<h1>Colección</h1><p class="empty">No se pudo cargar esta colección.</p>', {
      status: 500,
    });
  }
}
