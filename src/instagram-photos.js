import { isStorefrontListable, productImages } from './lib/images.js';

const storefront = 'https://maisonmarnier.com';
const supplierImageHosts = new Set([
  'cf.cjdropshipping.com',
  'oss-cf.cjdropshipping.com',
  'cj-product-center.oss-accelerate.aliyuncs.com',
]);

export async function digest(text) {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(bytes), b => b.toString(16).padStart(2, '0')).join('');
}

function plainDescription(value) {
  return String(value || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function socialAudience(category) {
  const value = String(category || '').toLowerCase();
  if (/candle|lighting|light/.test(value)) return 'slow evenings and warm, considered spaces';
  if (/textile|linen|fabric|bed|bath/.test(value)) return 'quiet comfort and beautifully finished everyday rituals';
  if (/furniture|storage|kitchen/.test(value)) return 'a home that feels calm, useful and beautifully put together';
  return 'people who want useful pieces with a warm, considered feel';
}

function socialCaption(row, price, url) {
  const description = plainDescription(row.description);
  const opening = description ? description.replace(/[.!?]+$/, '').slice(0, 280) :
    `A considered piece for ${socialAudience(row.category)}`;
  const category = String(row.category || 'home').toLowerCase().replace(/[^a-z0-9]+/g, '');
  const tag = category ? ` #${category}` : '';
  return `${row.name}\n\n${opening}.\n\nMade for ${socialAudience(row.category)}.\n\nDiscover it at Maison Marnier · ${price}\n${url}\n\n#MaisonMarnier #QuietLiving${tag}`;
}

export async function instagramProduct(env, id) {
  if (!Number.isSafeInteger(id) || id < 1) return null;
  const row = await env.LUME_DB.prepare(
    "SELECT id,name,slug,description,category,retail_price_eur,image_url,image_urls FROM products WHERE id=? AND status='live'"
  ).bind(id).first();
  if (!row?.slug || !isStorefrontListable(row)) return null;
  const photos = await Promise.all(productImages(row, { max: 12 }).map(async raw => {
    const source = new URL(raw, storefront);
    if (source.protocol !== 'https:' || source.username || source.password || source.port) return null;
    const convert = supplierImageHosts.has(source.hostname);
    if (!convert && !/\.jpe?g$/i.test(source.pathname)) return null;
    const key = (await digest(source.href)).slice(0, 24);
    const url = convert ? storefront + '/instagram/product-photo/' + id + '/' + key + '.jpg' : source.href;
    return { key, url, source: source.href, convert };
  }));
  const price = new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR' }).format(row.retail_price_eur);
  return {
    id, name: row.name, category: row.category, photos: photos.filter(Boolean),
    caption: socialCaption(row, price, storefront + '/products/' + encodeURIComponent(row.slug)),
  };
}

// Meta downloads the same feed-ready JPEG shown in the composer. Only stored,
// live product photos on the supported image CDNs can reach this fetch.
export async function instagramPhotoResponse(request, env, match) {
  const failure = (status) => new Response(null, { status, headers: { 'cache-control': 'no-store' } });
  if (!['GET', 'HEAD'].includes(request.method)) return failure(405);
  const product = await instagramProduct(env, Number(match[1]));
  const photo = product?.photos.find(p => p.key === match[2] && p.convert);
  if (!photo) return failure(404);
  const source = new URL(photo.source);
  source.searchParams.set('x-oss-process', 'image/resize,m_pad,w_1080,h_1080,color_FFFFFF/format,jpg/quality,q_88');
  try {
    const result = await fetch(source, { redirect: 'manual', signal: AbortSignal.timeout(10000) });
    if (!result.ok || Number(result.headers.get('content-length')) > 8_000_000) return failure(502);
    const bytes = new Uint8Array(await result.arrayBuffer());
    if (bytes.length > 8_000_000 || bytes[0] !== 255 || bytes[1] !== 216 || bytes[2] !== 255) return failure(502);
    return new Response(request.method === 'HEAD' ? null : bytes, {
      headers: { 'content-type': 'image/jpeg', 'content-length': String(bytes.length),
        'cache-control': 'public, max-age=3600', 'x-content-type-options': 'nosniff', 'x-robots-tag': 'noindex' },
    });
  } catch {
    return failure(502);
  }
}
