import { requireAdmin, requireImportAuth } from './auth.js';
import { cjCategories, cjSearch, cjStatus } from './cj.js';
import {
  checkout,
  checkoutSuccessPage,
  getOrderAdmin,
  handleStripeWebhook,
  listOrdersAdmin,
  refreshOrderCj,
  retryFulfill,
} from './commerce.js';
import {
  addWishlist,
  getCustomerOrder,
  listCustomerOrders,
  listWishlist,
  loginCustomer,
  logoutCustomer,
  meCustomer,
  registerCustomer,
  removeWishlist,
} from './db/customers.js';
import {
  deleteLumeDrafts,
  deleteLumeProduct,
  importExternalProducts,
  importLumeProduct,
  importLumeProductsBulk,
  listLumeProducts,
  listPublishedProducts,
  pruneThinLiveProducts,
  publishAllLumeProducts,
  publishLumeProduct,
  refreshLumeProduct,
  refreshMissingCjCosts,
  refreshMissingCjPictures,
  unpublishLumeProduct,
  updateLumeProduct,
} from './db/products.js';
import { getHomeContent, saveHomeContent } from './db/site-content.js';
import {
  deleteJournalArticle,
  listJournalAdmin,
  saveJournalArticle,
} from './db/journal.js';
import { importChristmasCatalog } from './jobs/importChristmasCatalog.js';
import { replaceSeedWithCj } from './jobs/replaceSeedWithCj.js';
import { syncProductGalleries } from './jobs/syncGalleries.js';
import { BRAND_ICON_PATH, BRAND_LOGO_PATH, BRAND_LOGO_LIGHT_PATH, brandImageResponse, brandLockupResponse } from './lib/brandAsset.js';
import { getLang, setLangResponse, t } from './lib/i18n.js';
import { json } from './lib/json.js';
import { seasonalImageResponse } from './lib/seasonalAssets.js';
import { accountRoute } from './pages/account.js';
import { homePage } from './pages/home.js';
import { adminPage } from './pages/admin.js';
import { cartPage, checkoutSuccessPageHtml } from './pages/cart.js';
import { collectionPage } from './pages/collection.js';
import { productPage } from './pages/product.js';
import { journalPage } from './pages/journal.js';
import { infoPage } from './pages/info.js';
import { instagramPage } from './pages/instagram.js';
import {
  robotsTxt,
  sitemapJournalXml,
  sitemapPagesXml,
  sitemapProductsXml,
  sitemapXml,
} from './pages/seo.js';

function methodNotAllowed() {
  return json({ ok: false, error: 'Method not allowed' }, 405);
}

/** 301 www → apex; skip localhost / workers.dev / other hosts. */
function apexRedirect(request, url) {
  const host = (request.headers.get('Host') || url.host || '').split(':')[0].toLowerCase();
  if (host !== 'www.maisonmarnier.com') return null;
  const target = new URL(request.url);
  target.protocol = 'https:';
  target.hostname = 'maisonmarnier.com';
  target.port = '';
  return Response.redirect(target.toString(), 301);
}

export async function handleRequest(request, env, ctx) {
  const url = new URL(request.url);
  const { pathname } = url;
  const method = request.method.toUpperCase();

  const redirected = apexRedirect(request, url);
  if (redirected) return redirected;

  if (pathname === '/lang') return setLangResponse(request, url);

  // --- Technical SEO / brand ---
  if (pathname === '/robots.txt') return robotsTxt();
  const seasonalImage = seasonalImageResponse(pathname);
  if (seasonalImage) return seasonalImage;
  if (pathname === BRAND_LOGO_PATH) return brandLockupResponse();
  if (pathname === BRAND_LOGO_LIGHT_PATH) return brandLockupResponse({ light: true });
  if (['/brand/maison-marnier-christmas.jpg', '/logo.jpg', '/logo.png', '/logo.svg'].includes(pathname)) return brandImageResponse();
  if ([BRAND_ICON_PATH, '/favicon.ico', '/favicon.svg'].includes(pathname)) return brandImageResponse({ icon: true });
  if (pathname === '/sitemap.xml' || pathname === '/sitemap_index.xml') return sitemapXml();
  if (pathname === '/sitemap-pages.xml') return sitemapPagesXml();
  if (pathname === '/sitemap-products.xml') return sitemapProductsXml(env);
  if (pathname === '/sitemap-journal.xml') return sitemapJournalXml(env);

  // --- Public store APIs ---
  if (pathname === '/api/store/products') {
    const q = url.searchParams.get('q') || '';
    const limit = url.searchParams.get('limit') || '24';
    return listPublishedProducts(env, { q, limit });
  }
  if (pathname === '/api/store/home') {
    return getHomeContent(env);
  }
  if (pathname === '/api/checkout') {
    if (method !== 'POST') return methodNotAllowed();
    return checkout(request, env);
  }
  if (pathname === '/api/stripe/webhook') {
    if (method !== 'POST') return methodNotAllowed();
    return handleStripeWebhook(request, env, ctx);
  }

  // --- Customer account APIs ---
  if (pathname === '/api/account/register') {
    if (method !== 'POST') return methodNotAllowed();
    return registerCustomer(request, env);
  }
  if (pathname === '/api/account/login') {
    if (method !== 'POST') return methodNotAllowed();
    return loginCustomer(request, env);
  }
  if (pathname === '/api/account/logout') {
    if (method !== 'POST') return methodNotAllowed();
    return logoutCustomer(request, env);
  }
  if (pathname === '/api/account/me') {
    if (method !== 'GET') return methodNotAllowed();
    return meCustomer(request, env);
  }
  if (pathname === '/api/account/orders') {
    if (method !== 'GET') return methodNotAllowed();
    const orderNumber = url.searchParams.get('number');
    if (orderNumber) return getCustomerOrder(request, env, orderNumber);
    return listCustomerOrders(request, env);
  }
  if (pathname === '/api/account/wishlist') {
    if (method === 'GET') return listWishlist(request, env);
    if (method === 'POST') return addWishlist(request, env);
    if (method === 'DELETE') return removeWishlist(request, env);
    return methodNotAllowed();
  }

  // --- CJ APIs (admin) ---
  if (pathname === '/api/cj/status') {
    const denied = await requireAdmin(request, env);
    if (denied) return denied;
    return cjStatus(env);
  }
  if (pathname === '/api/cj/search') {
    const denied = await requireAdmin(request, env);
    if (denied) return denied;
    return cjSearch(url, env);
  }
  if (pathname === '/api/cj/categories') {
    const denied = await requireAdmin(request, env);
    if (denied) return denied;
    return cjCategories(env);
  }

  // --- Lume admin APIs ---
  if (pathname === '/api/lume/products') {
    const denied = await requireAdmin(request, env);
    if (denied) return denied;
    return listLumeProducts(env);
  }
  if (pathname === '/api/lume/update') {
    if (method !== 'POST') return methodNotAllowed();
    const denied = await requireAdmin(request, env);
    if (denied) return denied;
    return updateLumeProduct(request, env);
  }
  if (pathname === '/api/lume/publish') {
    if (method !== 'POST') return methodNotAllowed();
    const denied = await requireAdmin(request, env);
    if (denied) return denied;
    return publishLumeProduct(request, env);
  }
  if (pathname === '/api/lume/publish-all') {
    if (method !== 'POST') return methodNotAllowed();
    const denied = await requireAdmin(request, env);
    if (denied) return denied;
    return publishAllLumeProducts(request, env);
  }
  if (pathname === '/api/lume/unpublish') {
    if (method !== 'POST') return methodNotAllowed();
    const denied = await requireAdmin(request, env);
    if (denied) return denied;
    return unpublishLumeProduct(request, env);
  }
  if (pathname === '/api/lume/delete') {
    if (method !== 'POST') return methodNotAllowed();
    const denied = await requireAdmin(request, env);
    if (denied) return denied;
    return deleteLumeProduct(request, env);
  }
  if (pathname === '/api/lume/delete-drafts') {
    if (method !== 'POST') return methodNotAllowed();
    const denied = await requireAdmin(request, env);
    if (denied) return denied;
    return deleteLumeDrafts(request, env);
  }
  if (pathname === '/api/lume/prune-thin') {
    if (method !== 'POST') return methodNotAllowed();
    const denied = await requireAdmin(request, env);
    if (denied) return denied;
    const result = await pruneThinLiveProducts(env);
    return json({ ok: true, ...result });
  }
  if (pathname === '/api/lume/refresh') {
    if (method !== 'POST') return methodNotAllowed();
    const denied = await requireAdmin(request, env);
    if (denied) return denied;
    return refreshLumeProduct(request, env);
  }
  if (pathname === '/api/lume/refresh-costs') {
    if (method !== 'POST') return methodNotAllowed();
    const denied = await requireAdmin(request, env);
    if (denied) return denied;
    return refreshMissingCjCosts(request, env);
  }
  if (pathname === '/api/lume/refresh-pictures') {
    if (method !== 'POST') return methodNotAllowed();
    const denied = await requireAdmin(request, env);
    if (denied) return denied;
    return refreshMissingCjPictures(request, env);
  }
  if (pathname === '/api/lume/import') {
    if (method !== 'POST') return methodNotAllowed();
    const denied = await requireImportAuth(request, env);
    if (denied) return denied;
    return importLumeProduct(request, env);
  }
  if (pathname === '/api/lume/import-bulk') {
    if (method !== 'POST') return methodNotAllowed();
    const denied = await requireImportAuth(request, env);
    if (denied) return denied;
    return importLumeProductsBulk(request, env);
  }
  if (pathname === '/api/lume/import-external') {
    if (method !== 'POST') return methodNotAllowed();
    const denied = await requireImportAuth(request, env);
    if (denied) return denied;
    return importExternalProducts(request, env);
  }
  if (pathname === '/api/lume/replace-seed-cj') {
    if (method !== 'POST') return methodNotAllowed();
    return replaceSeedWithCj(request, env);
  }
  if (pathname === '/api/lume/import-christmas') {
    if (method !== 'POST') return methodNotAllowed();
    return importChristmasCatalog(request, env);
  }
  if (pathname === '/api/lume/sync-galleries') {
    if (method !== 'POST') return methodNotAllowed();
    return syncProductGalleries(request, env);
  }
  if (pathname === '/api/lume/home') {
    if (method === 'GET') {
      const denied = await requireAdmin(request, env);
      if (denied) return denied;
      return getHomeContent(env);
    }
    if (method === 'POST') {
      const denied = await requireAdmin(request, env);
      if (denied) return denied;
      return saveHomeContent(request, env);
    }
    return methodNotAllowed();
  }
  if (pathname === '/api/lume/journal') {
    if (method === 'GET') {
      const denied = await requireAdmin(request, env);
      if (denied) return denied;
      return listJournalAdmin(env);
    }
    if (method === 'POST') {
      const denied = await requireAdmin(request, env);
      if (denied) return denied;
      return saveJournalArticle(request, env);
    }
    if (method === 'DELETE') {
      const denied = await requireAdmin(request, env);
      if (denied) return denied;
      return deleteJournalArticle(request, env);
    }
    return methodNotAllowed();
  }
  if (pathname === '/api/lume/orders') {
    if (method === 'GET') {
      const denied = await requireAdmin(request, env);
      if (denied) return denied;
      const id = url.searchParams.get('id');
      if (id) return getOrderAdmin(env, Number(id));
      return listOrdersAdmin(env);
    }
    return methodNotAllowed();
  }
  if (pathname === '/api/lume/orders/fulfill') {
    if (method !== 'POST') return methodNotAllowed();
    const denied = await requireAdmin(request, env);
    if (denied) return denied;
    return retryFulfill(request, env);
  }
  if (pathname === '/api/lume/orders/refresh') {
    if (method !== 'POST') return methodNotAllowed();
    const denied = await requireAdmin(request, env);
    if (denied) return denied;
    return refreshOrderCj(request, env);
  }

  // --- HTML pages ---
  if (pathname === '/cart') return cartPage(url, request);
  if (pathname === '/checkout/success') {
    const info = await checkoutSuccessPage(url, env);
    return checkoutSuccessPageHtml(info, request);
  }
  if (pathname.startsWith('/cuenta')) {
    const accountPage = await accountRoute(request, env, pathname);
    if (accountPage) return accountPage;
  }
  if (pathname.startsWith('/collections/')) return collectionPage(url, env, request);
  if (pathname.startsWith('/products/')) return productPage(url, env, request);
  if (pathname === '/journal' || pathname.startsWith('/journal/')) return journalPage(url, env, request);
  if (
    ['/shipping', '/returns', '/contact', '/sourcing', '/about', '/privacidad', '/cookies', '/terminos'].includes(
      pathname,
    )
  ) {
    return infoPage(pathname, request);
  }
  if (pathname === '/instagram') return instagramPage(request);
  if (pathname === '/admin') return adminPage();

  if (pathname === '/' || pathname === '') return homePage(env, request);

  return htmlNotFound(request);
}

function htmlNotFound(request) {
  const lang = request ? getLang(request) : 'es';
  return new Response(
    `<!doctype html><html lang="${lang}"><body><h1>${t(lang, 'not_found')}</h1><p><a href="/">Maison Marnier</a></p></body></html>`,
    {
      status: 404,
      headers: { 'content-type': 'text/html; charset=UTF-8', 'cache-control': 'no-store' },
    },
  );
}
