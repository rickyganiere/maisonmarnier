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
    seoDescription: {
      es: 'Decoración para el hogar seleccionada por Maison Marnier: luz, textiles, velas y objetos con fotos reales y envíos en la UE.',
      en: 'Curated home decor from Maison Marnier: lighting, textiles, candles and objects with real photos and EU shipping.',
    },
    intro: {
      es: `Explora decoración para el hogar pensada para combinarse sin recargar la estancia. Maison Marnier reúne iluminación cálida, textiles, velas, jarrones y pequeños objetos que ayudan a construir un salón sereno por capas.

Cada producto publicado incluye precio visible y una galería de al menos cuatro fotografías reales del proveedor. Puedes empezar por una categoría concreta o recorrer la edición completa para encontrar piezas que funcionen juntas.`,
      en: `Explore home decor designed to work together without crowding a room. Maison Marnier brings warm lighting, textiles, candles, vases, and small objects into one calm, layered edit.

Every published product includes a visible price and a gallery of at least four real supplier photos. Start with a specific category or browse the full edit for pieces that sit naturally together.`,
    },
    relatedCollections: [
      { slug: 'lighting', label: { es: 'Lámparas decorativas', en: 'Decorative lighting' } },
      { slug: 'textiles', label: { es: 'Cojines y textiles', en: 'Cushions and textiles' } },
      { slug: 'objects', label: { es: 'Objetos y jarrones', en: 'Objects and vases' } },
    ],
  },
  textiles: {
    categories: ['Textiles'],
    keywords: ['pillow', 'cushion', 'textile', 'throw', 'blanket', 'linen'],
    blurb: {
      es: 'Capas suaves para sofás, camas y rincones de lectura.',
      en: 'Soft layers for sofas, beds, and reading corners.',
    },
    seoDescription: {
      es: 'Cojines decorativos y textiles para salón y dormitorio, con galerías reales, precios visibles y envío en la Unión Europea.',
      en: 'Decorative cushions and textiles for living rooms and bedrooms, with real galleries, visible prices, and EU shipping.',
    },
    intro: {
      es: `Los cojines decorativos cambian la lectura de un sofá o una cama sin exigir una reforma. Esta selección combina fundas, texturas y tonos fáciles de superponer, desde acabados lisos y acanalados hasta motivos de aire vintage o bohemio.

Compara las fotografías de cada producto antes de elegir y utiliza color, tacto y escala para crear profundidad. Para un resultado equilibrado, mezcla una pieza con carácter con textiles más tranquilos y repite uno de sus tonos en el resto de la habitación.`,
      en: `Decorative cushions can change how a sofa or bed feels without remaking the whole room. This edit combines covers, textures, and easy-to-layer tones, from plain ribbed finishes to vintage and bohemian patterns.

Compare each product gallery before choosing, then use colour, texture, and scale to build depth. For a balanced result, pair one expressive piece with quieter textiles and repeat one of its tones elsewhere in the room.`,
    },
    relatedCollections: [
      { slug: 'decor', label: { es: 'Decoración para el hogar', en: 'Home decor' } },
      { slug: 'objects', label: { es: 'Objetos decorativos', en: 'Decorative objects' } },
    ],
  },
  objects: {
    categories: ['Objects'],
    keywords: ['vase', 'ornament', 'sculpture', 'tray', 'object', 'statue'],
    blurb: {
      es: 'Pequeñas piezas escultóricas que asientan una estantería.',
      en: 'Small sculptural pieces that settle a shelf.',
    },
    seoDescription: {
      es: 'Objetos y jarrones decorativos modernos para estanterías, mesas y rincones del hogar. Selección Maison Marnier con envío UE.',
      en: 'Modern decorative objects and vases for shelves, tables, and quiet corners. Maison Marnier selection with EU shipping.',
    },
    intro: {
      es: `Los objetos y jarrones decorativos modernos aportan un punto focal sin ocupar toda la escena. La selección reúne cerámica, formas escultóricas y piezas de mesa que funcionan solas, con flores o dentro de una composición de libros y luz.

Mira la escala y las distintas vistas de la galería antes de decidir dónde colocar cada pieza. En una estantería, alterna alturas y deja espacio vacío; sobre una mesa, un solo jarrón bien elegido suele tener más presencia que muchos adornos pequeños.`,
      en: `Modern decorative objects and vases create a focal point without taking over the room. This edit brings together ceramics, sculptural forms, and table pieces that work alone, with flowers, or alongside books and soft light.

Check scale and the different gallery views before deciding where a piece belongs. On a shelf, vary heights and leave breathing room; on a table, one well-chosen vase often has more presence than many small ornaments.`,
    },
    relatedCollections: [
      { slug: 'decor', label: { es: 'Decoración para el hogar', en: 'Home decor' } },
      { slug: 'lighting', label: { es: 'Lámparas decorativas', en: 'Decorative lighting' } },
    ],
  },
  candles: {
    categories: ['Candles'],
    keywords: ['candle', 'diffuser', 'fragrance', 'incense', 'candlestick'],
    blurb: {
      es: 'Luz cálida y fragancia serena para las noches.',
      en: 'Warm light and quiet fragrance for evening rooms.',
    },
    seoDescription: {
      es: 'Velas decorativas, portavelas y aromas para crear luz cálida en casa. Compra la selección Maison Marnier con envío en la UE.',
      en: 'Decorative candles, holders, and fragrance for a warm glow at home. Shop the Maison Marnier edit with EU shipping.',
    },
    intro: {
      es: `Las velas decorativas añaden luz, color y un ritmo más lento a la habitación. Aquí encontrarás velas aromáticas, portavelas y piezas de sobremesa pensadas para una mesa de cena, una consola o un rincón de lectura.

Combina distintas alturas, mantén una distancia segura entre llamas y textiles y utiliza grupos impares para una composición natural. Las galerías muestran cada artículo desde varios ángulos para que puedas valorar su forma y acabado antes de comprar.`,
      en: `Decorative candles add light, colour, and a slower rhythm to a room. This edit includes scented candles, holders, and tabletop pieces for a dinner table, console, or reading corner.

Mix different heights, keep a safe distance from fabrics, and use odd-numbered groups for a natural composition. Product galleries show every item from several angles so you can judge its shape and finish before buying.`,
    },
    relatedCollections: [
      { slug: 'lighting', label: { es: 'Lámparas decorativas', en: 'Decorative lighting' } },
      { slug: 'seasonal', label: { es: 'Decoración de Navidad', en: 'Christmas decor' } },
    ],
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
    seoDescription: {
      es: 'Lámparas decorativas y luces cálidas para salón, dormitorio y mesa. Selección Maison Marnier con fotos reales y envío UE.',
      en: 'Decorative lamps and warm lights for living rooms, bedrooms, and tables. Maison Marnier edit with real photos and EU shipping.',
    },
    intro: {
      es: `Las lámparas decorativas hacen algo más que iluminar: marcan la temperatura visual de la estancia. Esta selección reúne luces de sobremesa, faroles y puntos LED pensados para acompañar, no dominar, el salón o el dormitorio.

Antes de elegir, piensa en el lugar, la intensidad y el color de luz que necesitas. Una iluminación cálida funciona bien junto a madera, textiles y velas; varias fuentes pequeñas suelen crear una atmósfera más agradable que una única luz central intensa.`,
      en: `Decorative lamps do more than illuminate: they set the visual temperature of a room. This selection gathers table lights, lanterns, and LED accents designed to support rather than dominate a living room or bedroom.

Before choosing, consider placement, intensity, and colour temperature. Warm light works naturally with wood, textiles, and candles; several small sources often create a calmer atmosphere than one strong central light.`,
    },
    relatedCollections: [
      { slug: 'candles', label: { es: 'Velas decorativas', en: 'Decorative candles' } },
      { slug: 'decor', label: { es: 'Decoración para el hogar', en: 'Home decor' } },
    ],
  },
  furniture: {
    categories: ['Furniture'],
    keywords: ['table', 'chair', 'shelf', 'stool', 'cabinet', 'furniture'],
    blurb: { es: 'Formas útiles para un ritmo más pausado.', en: 'Useful forms for slower living.' },
  },
};

const COLLECTION_TITLES = {
  new: { es: 'Novedades', en: 'New Arrivals' },
  decor: { es: 'Decoración para el hogar', en: 'Home Decor' },
  textiles: { es: 'Cojines y textiles decorativos', en: 'Decorative Cushions & Textiles' },
  objects: { es: 'Objetos y jarrones decorativos', en: 'Decorative Objects & Vases' },
  candles: { es: 'Velas decorativas', en: 'Decorative Candles' },
  'wall-decor': { es: 'Decoración de pared', en: 'Wall Decor' },
  seasonal: { es: 'Decoración de Navidad', en: 'Christmas Home Edit' },
  lighting: { es: 'Lámparas decorativas', en: 'Decorative Lighting' },
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
