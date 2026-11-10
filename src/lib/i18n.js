/** Storefront language: cookie mm_lang = en|es (default es). */

export const DEFAULT_LANG = 'es';
export const LANGS = ['es', 'en'];

const DICT = {
  es: {
    announce: 'Edición Navidad · Envío gratis desde 100 € · Europa',
    nav_seasonal: 'Tienda Navidad',
    nav_new: 'Novedades',
    nav_lighting: 'Iluminación',
    nav_decor: 'Decoración',
    nav_candles: 'Velas',
    nav_journal: 'Diario',
    nav_aria: 'Navegación de tienda',
    home_aria: 'Maison Marnier inicio',
    search_ph: 'Buscar…',
    search_aria: 'Buscar productos',
    account: 'Cuenta',
    account_title: 'Mi cuenta',
    cart: 'Carrito',
    cart_title: 'Carrito',
    lang_aria: 'Idioma',
    footer_blurb: 'Ediciones navideñas para hogares cálidos — objetos festivos elegidos con cuidado.',
    footer_shop: 'Tienda',
    footer_holiday: 'Navidad',
    footer_new: 'Novedades',
    footer_lighting: 'Iluminación',
    footer_create_account: 'Crear cuenta',
    footer_maison: 'Maison',
    footer_about: 'Nuestra historia',
    footer_journal: 'Diario',
    footer_sourcing: 'Selección',
    footer_help: 'Ayuda',
    footer_shipping: 'Envíos',
    footer_returns: 'Devoluciones',
    footer_contact: 'Contacto',
    footer_links: 'Enlaces',
    footer_privacy: 'Privacidad',
    footer_cookies: 'Cookies',
    footer_terms: 'Términos',
    footer_region: 'Europa · EUR €',
    cookie_aria: 'Consentimiento de cookies',
    cookie_body:
      'Usamos cookies esenciales para la tienda y, si lo aceptas, cookies de medición. Más info en la <a href="/cookies">política de cookies</a> y la <a href="/privacidad">privacidad</a>.',
    cookie_accept: 'Aceptar',
    cookie_essential: 'Solo esenciales',
    photo_unavailable: 'Foto no disponible',
    badge_edit: 'Edición',
    view: 'Ver →',
    not_found: 'No encontrado',
    home: 'Inicio',
    shop: 'Tienda',
    crumbs_aria: 'Miga de pan',
  },
  en: {
    announce: 'Christmas Edit · Free shipping over €100 · Europe',
    nav_seasonal: 'Christmas Shop',
    nav_new: 'New Arrivals',
    nav_lighting: 'Lighting',
    nav_decor: 'Home Décor',
    nav_candles: 'Candles',
    nav_journal: 'Journal',
    nav_aria: 'Shop navigation',
    home_aria: 'Maison Marnier home',
    search_ph: 'Search…',
    search_aria: 'Search products',
    account: 'Account',
    account_title: 'My account',
    cart: 'Cart',
    cart_title: 'Cart',
    lang_aria: 'Language',
    footer_blurb: 'Holiday edits for warm rooms — festive objects chosen with quiet care.',
    footer_shop: 'Shop',
    footer_holiday: 'Holiday',
    footer_new: 'New Arrivals',
    footer_lighting: 'Lighting',
    footer_create_account: 'Create account',
    footer_maison: 'Maison',
    footer_about: 'Our Story',
    footer_journal: 'Journal',
    footer_sourcing: 'Sourcing',
    footer_help: 'Help',
    footer_shipping: 'Shipping',
    footer_returns: 'Returns',
    footer_contact: 'Contact',
    footer_links: 'Link hub',
    footer_privacy: 'Privacy',
    footer_cookies: 'Cookies',
    footer_terms: 'Terms',
    footer_region: 'Europe · EUR €',
    cookie_aria: 'Cookie consent',
    cookie_body:
      'We use essential cookies for the store and, if you accept, measurement cookies. More in the <a href="/cookies">cookie policy</a> and <a href="/privacidad">privacy</a>.',
    cookie_accept: 'Accept',
    cookie_essential: 'Essential only',
    photo_unavailable: 'Photo unavailable',
    badge_edit: 'Edit',
    view: 'View →',
    not_found: 'Not found',
    home: 'Home',
    shop: 'Shop',
    crumbs_aria: 'Breadcrumb',
  },
};

export function normalizeLang(value) {
  const v = String(value || '')
    .trim()
    .toLowerCase()
    .slice(0, 2);
  return LANGS.includes(v) ? v : DEFAULT_LANG;
}

export function readLangCookie(request) {
  const raw = request?.headers?.get?.('Cookie') || '';
  const match = raw.match(/(?:^|;\s*)mm_lang=([^;]+)/);
  return match ? normalizeLang(decodeURIComponent(match[1])) : '';
}

export function readLangFromUrl(request) {
  try {
    const url = new URL(request.url);
    const q = url.searchParams.get('hl') || url.searchParams.get('lang');
    return q ? normalizeLang(q) : '';
  } catch {
    return '';
  }
}

export function preferLangFromAccept(request) {
  const h = (request?.headers?.get?.('Accept-Language') || '').toLowerCase();
  if (!h) return DEFAULT_LANG;
  // Prefer explicit quality order roughly: if es appears before en, keep es.
  const esIdx = h.search(/(^|,)\s*es\b/);
  const enIdx = h.search(/(^|,)\s*en\b/);
  if (esIdx >= 0 && (enIdx < 0 || esIdx < enIdx)) return 'es';
  if (enIdx >= 0 && (esIdx < 0 || enIdx < esIdx)) return 'en';
  if (h.includes('es')) return 'es';
  if (h.includes('en')) return 'en';
  return DEFAULT_LANG;
}

/** URL ?hl= wins, then cookie, then Accept-Language, then default. */
export function getLang(request) {
  return (
    readLangFromUrl(request) ||
    readLangCookie(request) ||
    preferLangFromAccept(request) ||
    DEFAULT_LANG
  );
}

export function langCookieHeader(lang, { secure = true } = {}) {
  const v = normalizeLang(lang);
  const securePart = secure ? '; Secure' : '';
  // Host-only cookie on the apex site. Avoid caching mixups by keeping it simple.
  return `mm_lang=${v}; Path=/; SameSite=Lax; Max-Age=${60 * 60 * 24 * 365}${securePart}`;
}

export function t(lang, key) {
  const l = normalizeLang(lang);
  return DICT[l]?.[key] ?? DICT[DEFAULT_LANG][key] ?? key;
}

export function tr(lang, map) {
  const l = normalizeLang(lang);
  if (map && typeof map === 'object' && (map.es != null || map.en != null)) {
    return map[l] ?? map[DEFAULT_LANG] ?? map.en ?? map.es ?? '';
  }
  return '';
}

export function safeNextPath(next, fallback = '/') {
  const n = String(next || fallback);
  if (!n.startsWith('/') || n.startsWith('//')) return fallback;
  return n.slice(0, 500);
}

/** Append/replace hl= on a relative path so browser cache keys differ per language. */
export function withLangQuery(path, lang) {
  const l = normalizeLang(lang);
  let pathname = '/';
  let search = '';
  let hash = '';
  try {
    const u = new URL(path, 'https://maisonmarnier.com');
    pathname = u.pathname || '/';
    search = u.search || '';
    hash = u.hash || '';
  } catch {
    pathname = path.split('?')[0].split('#')[0] || '/';
  }
  const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
  params.delete('lang');
  params.set('hl', l);
  const q = params.toString();
  return `${pathname}${q ? `?${q}` : ''}${hash}`;
}

export function setLangResponse(request, url) {
  const lang = normalizeLang(url.searchParams.get('set') || url.searchParams.get('lang') || url.searchParams.get('hl'));
  const next = safeNextPath(url.searchParams.get('next') || '/');
  let dest = next;
  try {
    if (/^https?:\/\//i.test(next)) {
      const u = new URL(next);
      dest = `${u.pathname}${u.search}${u.hash}` || '/';
    }
  } catch {
    dest = '/';
  }
  dest = withLangQuery(safeNextPath(dest, '/'), lang);
  const secure = (() => {
    try {
      return new URL(request.url).protocol === 'https:';
    } catch {
      return true;
    }
  })();
  return new Response(null, {
    status: 303,
    headers: {
      Location: dest,
      'Set-Cookie': langCookieHeader(lang, { secure }),
      'Cache-Control': 'no-store',
      'Content-Language': lang,
    },
  });
}

/** Cache policy for language-dependent HTML. Avoid public caches mixing EN/ES. */
export function htmlCacheHeaders(lang, cache = 'private, no-cache') {
  return {
    'cache-control': cache,
    'content-language': normalizeLang(lang),
    vary: 'Cookie, Accept-Language',
  };
}

/**
 * If the request carries ?hl=/lang=, return a Set-Cookie so the preference
 * sticks after the user navigates away from the query-param URL.
 */
export function syncLangCookieHeader(request) {
  const fromUrl = readLangFromUrl(request);
  if (!fromUrl) return null;
  const fromCookie = readLangCookie(request);
  if (fromCookie === fromUrl) return null;
  const secure = (() => {
    try {
      return new URL(request.url).protocol === 'https:';
    } catch {
      return true;
    }
  })();
  return langCookieHeader(fromUrl, { secure });
}
