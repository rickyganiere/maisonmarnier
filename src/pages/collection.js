import { esc } from '../lib/escape.js';
import { htmlPage, productCard } from '../lib/html.js';
import { getLang, t, tr } from '../lib/i18n.js';
import { breadcrumbJsonLd } from '../lib/seo.js';
import { getLiveProducts } from '../db/products.js';

/** Exact Maison category labels preferred; keyword fallbacks for older rows. */
export const COLLECTION_RULES = {
  new: {
    categories: [],
    keywords: [],
    blurb: { es: 'Novedades para hogares serenos y cuidados.', en: 'Fresh arrivals for calm, considered rooms.' },
  },
  decor: {
    categories: ['Decor', 'Objects', 'Wall Decor', 'Candles', 'Lighting', 'Textiles', 'Seasonal'],
    keywords: ['decor', 'ornament', 'home'],
    blurb: {
      es: 'La edición ampliada — objetos, luz y detalle silencioso.',
      en: 'The broader edit — objects, light, and quiet detail.',
    },
  },
  textiles: {
    categories: ['Textiles'],
    keywords: ['pillow', 'cushion', 'textile', 'throw', 'blanket', 'linen'],
    blurb: {
      es: 'Capas suaves para sofás, camas y rincones de lectura.',
      en: 'Soft layers for sofas, beds, and reading corners.',
    },
  },
  objects: {
    categories: ['Objects'],
    keywords: ['vase', 'ornament', 'sculpture', 'tray', 'object', 'statue'],
    blurb: {
      es: 'Pequeñas piezas escultóricas que asientan una estantería.',
      en: 'Small sculptural pieces that settle a shelf.',
    },
  },
  candles: {
    categories: ['Candles'],
    keywords: ['candle', 'diffuser', 'fragrance', 'incense', 'candlestick'],
    blurb: {
      es: 'Luz cálida y fragancia serena para las noches.',
      en: 'Warm light and quiet fragrance for evening rooms.',
    },
  },
  'wall-decor': {
    categories: ['Wall Decor'],
    keywords: ['wall', 'tapestry', 'poster', 'mirror', 'frame', 'decal'],
    blurb: {
      es: 'Historias en la pared — tapices, vinilos y colgantes.',
      en: 'Wall stories — tapestries, decals, and hangings.',
    },
  },
  seasonal: {
    categories: ['Seasonal'],
    keywords: ['christmas', 'seasonal', 'holiday', 'xmas', 'santa'],
    blurb: {
      es: 'Acentos de temporada sin ruido visual.',
      en: 'Seasonal accents without the visual noise.',
    },
  },
  lighting: {
    categories: ['Lighting'],
    keywords: ['lamp', 'light', 'lantern', 'led', 'projector'],
    blurb: {
      es: 'Brillo suave para escritorios, ventanas y mesitas.',
      en: 'Soft glow for desks, windows, and night tables.',
    },
  },
  furniture: {
    categories: ['Furniture'],
    keywords: ['table', 'chair', 'shelf', 'stool', 'cabinet', 'furniture'],
    blurb: { es: 'Formas útiles para un ritmo más pausado.', en: 'Useful forms for slower living.' },
  },
};

const COLLECTION_TITLES = {
  new: { es: 'Novedades', en: 'New Arrivals' },
  decor: { es: 'Decoración', en: 'Decor' },
  textiles: { es: 'Textiles', en: 'Textiles' },
  objects: { es: 'Objetos', en: 'Objects' },
  candles: { es: 'Velas', en: 'Candles' },
  'wall-decor': { es: 'Decoración de pared', en: 'Wall Decor' },
  seasonal: { es: 'Navidad', en: 'Holiday' },
  lighting: { es: 'Iluminación', en: 'Lighting' },
  furniture: { es: 'Mobiliario', en: 'Furniture' },
};

const CHIP_LINKS = [
  ['new', '/collections/new'],
  ['decor', '/collections/decor'],
  ['lighting', '/collections/lighting'],
  ['seasonal', '/collections/seasonal'],
  ['objects', '/collections/objects'],
  ['candles', '/collections/candles'],
  ['wall-decor', '/collections/wall-decor'],
  ['textiles', '/collections/textiles'],
];

function matchesCollection(p, rule) {
  const cat = String(p.category || '').trim();
  if (rule.categories.length && rule.categories.some((c) => c.toLowerCase() === cat.toLowerCase())) {
    return true;
  }
  if (!rule.keywords.length) return !rule.categories.length;
  const text = ((p.name || '') + ' ' + cat).toLowerCase();
  return rule.keywords.some((w) => text.includes(w));
}

export async function collectionPage(url, env, request) {
  const lang = getLang(request);
  try {
    const slug = decodeURIComponent(url.pathname.split('/').filter(Boolean)[1] || '').toLowerCase();
    const q = (url.searchParams.get('q') || '').trim().slice(0, 80);

    if (!slug || !(slug in COLLECTION_RULES)) {
      return htmlPage(
        tr(lang, { es: 'Colección no encontrada', en: 'Collection not found' }),
        `<div class="head"><h1>${tr(lang, { es: 'Colección no encontrada', en: 'Collection not found' })}</h1></div>
         <p class="empty">${tr(lang, { es: 'Esta colección no existe.', en: 'This collection does not exist.' })} <a href="/collections/decor">${tr(lang, { es: 'Ver decoración →', en: 'Browse decor →' })}</a></p>`,
        { status: 404, request, path: url.pathname },
      );
    }

    let all = await getLiveProducts(env, 200);
    if (q) {
      const qq = q.toLowerCase();
      all = all.filter((p) => {
        const text = ((p.name || '') + ' ' + (p.category || '') + ' ' + (p.description || '')).toLowerCase();
        return text.includes(qq);
      });
    }

    const rule = COLLECTION_RULES[slug];
    const ps =
      slug === 'new' || (!rule.categories.length && !rule.keywords.length)
        ? all
        : all.filter((p) => matchesCollection(p, rule));

    const title = q
      ? tr(lang, { es: `Búsqueda: ${q}`, en: `Search: ${q}` })
      : tr(lang, COLLECTION_TITLES[slug] || { es: slug, en: slug });
    const blurb = tr(lang, rule.blurb);
    const lead = q
      ? tr(lang, {
          es: `${ps.length} resultado${ps.length === 1 ? '' : 's'} para “${esc(q)}”`,
          en: `${ps.length} result${ps.length === 1 ? '' : 's'} for “${esc(q)}”`,
        })
      : blurb;

    const chips = CHIP_LINKS.map(([key, href]) => {
      const label = tr(lang, COLLECTION_TITLES[key] || { es: key, en: key });
      return `<a class="chip${href.endsWith('/' + slug) ? ' is-active' : ''}" href="${href}">${esc(label)}</a>`;
    }).join('');

    const cards =
      ps.map((p) => productCard(p, lang)).join('') ||
      `<p class="empty">${q ? tr(lang, { es: 'Ningún producto coincide con esta búsqueda.', en: 'No products match this search.' }) : tr(lang, { es: 'Aún no hay productos publicados en esta colección.', en: 'No published products in this collection yet.' })}</p>`;

    const collectionPath = `/collections/${slug}`;
    const description = q
      ? tr(lang, {
          es: `Resultados de búsqueda para “${q}” en Maison Marnier.`,
          en: `Search results for “${q}” at Maison Marnier.`,
        })
      : `${blurb} ${tr(lang, { es: `Compra ${title} en Maison Marnier.`, en: `Shop ${title} at Maison Marnier.` })}`;
    const jsonLd = breadcrumbJsonLd([
      { name: t(lang, 'home'), path: '/' },
      { name: t(lang, 'shop'), path: '/collections/new' },
      { name: title, path: collectionPath },
    ]);

    return htmlPage(
      title,
      `<nav class="crumbs" aria-label="${t(lang, 'crumbs_aria')}">
         <a href="/">${t(lang, 'home')}</a><span class="sep">/</span>
         <a href="/collections/new">${t(lang, 'shop')}</a><span class="sep">/</span>
         <span>${esc(title)}</span>
       </nav>
       <section class="collection-top">
         <div class="head">
           <div>
             <h1>${esc(title)}</h1>
             <p class="lead">${lead}</p>
           </div>
           <div class="head-meta">${ps.length} ${tr(lang, { es: `pieza${ps.length === 1 ? '' : 's'}`, en: `piece${ps.length === 1 ? '' : 's'}` })}</div>
         </div>
       </section>
       <div class="toolbar">
         <div class="chips" role="navigation" aria-label="${tr(lang, { es: 'Colecciones', en: 'Collections' })}">${chips}</div>
       </div>
       <div class="grid">${cards}</div>`,
      {
        description: description.slice(0, 160),
        canonical: collectionPath,
        noindex: Boolean(q),
        jsonLd,
        cache: 'public, max-age=300',
        request,
        path: collectionPath,
        lang,
      },
    );
  } catch {
    return htmlPage(
      tr(lang, { es: 'Colección', en: 'Collection' }),
      `<h1>${tr(lang, { es: 'Colección', en: 'Collection' })}</h1><p class="empty">${tr(lang, { es: 'No se pudo cargar esta colección.', en: 'Could not load this collection.' })}</p>`,
      { status: 500, request, path: '/collections' },
    );
  }
}
