import { esc } from '../lib/escape.js';
import { htmlPage, productCard } from '../lib/html.js';
import { getLang, langHref, t, tr } from '../lib/i18n.js';
import { breadcrumbJsonLd, collectionPageJsonLd } from '../lib/seo.js';
import { getLiveProducts, getLiveProductsBySlugs } from '../db/products.js';

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
      es: 'Decoración navideña para hogares europeos — luces cálidas, coronas y detalles elegidos con calma.',
      en: 'Christmas décor for European homes — warm lights, wreaths, and quiet seasonal details.',
    },
    seoDescription: {
      es: 'Decoración de Navidad para el hogar: luces cálidas, coronas, adornos y velas. Edición Maison Marnier · envíos UE.',
      en: 'Christmas home décor: warm lights, wreaths, ornaments and candles. Maison Marnier edit · EU shipping.',
    },
    intro: {
      es: `La edición Navidad de Maison Marnier reúne decoración navideña para interiores serenos: iluminación cálida, coronas para la puerta, adornos para el árbol y piezas de mesa que no saturan la habitación. Elegimos objetos festivos con presencia clara — menos ruido visual, más atmósfera — pensados para salones europeos y envíos dentro de la UE.

Empieza por las piezas hero de la temporada, sigue hacia iluminación o velas si buscas brillo suave, y lee el Diario para ideas de cómo vestir la casa sin prisa.`,
      en: `Maison Marnier’s Christmas edit gathers holiday décor for calm interiors: warm lighting, door wreaths, tree ornaments, and table pieces that don’t crowd the room. We favour festive objects with quiet presence — less visual noise, more atmosphere — chosen for European homes and EU shipping.

Start with the season’s hero pieces, then browse lighting or candles for a softer glow, and read the Journal for unhurried ways to dress the house.`,
    },
    heroSlugs: [
      'christmas-candle-lights-led-small-lanterns-wind-lights-793600',
      'creative-lighted-robin-christmas-wreath',
      'pvc-mini-christmas-tree-led-lights-decoration-desktop-ornaments',
      'christmas-decoration-3d-lamp-acrylic-led-night-lights-new-year',
      'christmas-candle-led-indoor-holiday-christmas-tree-ornaments',
    ],
    journalLinks: [
      {
        path: '/journal/mesa-navidad-sin-ruido-visual',
        label: {
          es: 'Mesa de Navidad sin ruido visual',
          en: 'A calm Christmas table',
        },
      },
      {
        path: '/journal/luces-calidas-salones-pequenos',
        label: {
          es: 'Luces cálidas para salones pequeños',
          en: 'Warm lights for small living rooms',
        },
      },
      {
        path: '/journal/guia-adornos-menos-piezas',
        label: {
          es: 'Guía de adornos: menos piezas',
          en: 'Ornament guide: fewer pieces',
        },
      },
      {
        path: '/journal/quiet-living-room',
        label: {
          es: 'Salón sereno en invierno',
          en: 'A quiet living room in winter',
        },
      },
    ],
    relatedCollections: [
      { slug: 'lighting', label: { es: 'Iluminación', en: 'Lighting' } },
      { slug: 'candles', label: { es: 'Velas', en: 'Candles' } },
      { slug: 'objects', label: { es: 'Objetos', en: 'Objects' } },
    ],
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
  seasonal: { es: 'Decoración de Navidad', en: 'Christmas Home Edit' },
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

function introParagraphsHtml(introText) {
  const parts = String(introText || '')
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
  if (!parts.length) return '';
  return `<div class="collection-intro">${parts.map((p) => `<p>${esc(p)}</p>`).join('')}</div>`;
}

/** Internal links: hero PDPs + Journal + related collections. */
function collectionHubLinksHtml(rule, heroProducts, lang) {
  const heroItems = (heroProducts || []).slice(0, 5);
  const journal = rule.journalLinks || [];
  const related = rule.relatedCollections || [];
  if (!heroItems.length && !journal.length && !related.length) return '';

  const heroList = heroItems.length
    ? `<div class="hub-block">
        <h2>${esc(tr(lang, { es: 'Piezas hero de la temporada', en: 'Season hero picks' }))}</h2>
        <ul class="hub-links">${heroItems
          .map(
            (p) =>
              `<li><a href="${esc(langHref(`/products/${encodeURIComponent(p.slug)}`, lang))}">${esc(p.name || p.slug)}</a></li>`,
          )
          .join('')}</ul>
      </div>`
    : '';

  const journalList = journal.length
    ? `<div class="hub-block">
        <h2>${esc(tr(lang, { es: 'Del Diario', en: 'From the Journal' }))}</h2>
        <ul class="hub-links">${journal
          .map(
            (j) =>
              `<li><a href="${esc(langHref(j.path, lang))}">${esc(tr(lang, j.label))}</a></li>`,
          )
          .join('')}</ul>
      </div>`
    : '';

  const relatedList = related.length
    ? `<div class="hub-block">
        <h2>${esc(tr(lang, { es: 'Seguir explorando', en: 'Keep exploring' }))}</h2>
        <ul class="hub-links">${related
          .map(
            (c) =>
              `<li><a href="${esc(langHref(`/collections/${c.slug}`, lang))}">${esc(tr(lang, c.label))}</a></li>`,
          )
          .join('')}</ul>
      </div>`
    : '';

  return `<section class="collection-hub" aria-label="${esc(tr(lang, { es: 'Guía de la colección', en: 'Collection guide' }))}">
    ${heroList}${journalList}${relatedList}
  </section>`;
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
         <p class="empty">${tr(lang, { es: 'Esta colección no existe.', en: 'This collection does not exist.' })} <a href="${esc(langHref('/collections/decor', lang))}">${tr(lang, { es: 'Ver decoración →', en: 'Browse decor →' })}</a></p>`,
        { status: 404, request, path: url.pathname },
      );
    }

    const rule = COLLECTION_RULES[slug];
    let all = await getLiveProducts(env, 200);
    if (q) {
      const qq = q.toLowerCase();
      all = all.filter((p) => {
        const text = ((p.name || '') + ' ' + (p.category || '') + ' ' + (p.description || '')).toLowerCase();
        return text.includes(qq);
      });
    }

    const ps =
      slug === 'new' || (!rule.categories.length && !rule.keywords.length)
        ? all
        : all.filter((p) => matchesCollection(p, rule));

    const heroProducts =
      !q && rule.heroSlugs?.length
        ? await getLiveProductsBySlugs(env, rule.heroSlugs).catch(() => [])
        : [];

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
      return `<a class="chip${href.endsWith('/' + slug) ? ' is-active' : ''}" href="${esc(langHref(href, lang))}">${esc(label)}</a>`;
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
      : rule.seoDescription
        ? tr(lang, rule.seoDescription)
        : `${blurb} ${tr(lang, { es: `Compra ${title} en Maison Marnier.`, en: `Shop ${title} at Maison Marnier.` })}`;

    const crumbs = breadcrumbJsonLd([
      { name: t(lang, 'home'), path: '/' },
      { name: t(lang, 'shop'), path: '/collections/new' },
      { name: title, path: collectionPath },
    ]);
    const jsonLd = q
      ? crumbs
      : [
          collectionPageJsonLd({
            name: title,
            description,
            url: collectionPath,
            products: ps,
          }),
          crumbs,
        ];

    const hubCopy =
      !q && rule.intro
        ? `${introParagraphsHtml(tr(lang, rule.intro))}${collectionHubLinksHtml(rule, heroProducts, lang)}`
        : '';

    return htmlPage(
      title,
      `<nav class="crumbs" aria-label="${t(lang, 'crumbs_aria')}">
         <a href="${esc(langHref('/', lang))}">${t(lang, 'home')}</a><span class="sep">/</span>
         <a href="${esc(langHref('/collections/new', lang))}">${t(lang, 'shop')}</a><span class="sep">/</span>
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
         ${hubCopy}
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
        cache: 'private, no-cache',
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
