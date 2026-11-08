import { requireAdmin, requireImportAuth } from './auth.js';
import { cjSearch, cjStatus } from './cj.js';
import {
  importLumeProduct,
  listLumeProducts,
  listPublishedProducts,
  publishLumeProduct,
  refreshLumeProduct,
  updateLumeProduct,
} from './db/products.js';
import { getHomeContent, saveHomeContent } from './db/site-content.js';
import {
  deleteJournalArticle,
  listJournalAdmin,
  saveJournalArticle,
} from './db/journal.js';
import { json } from './lib/json.js';
import { homePage } from './pages/home.js';
import { adminPage } from './pages/admin.js';
import { collectionPage } from './pages/collection.js';
import { productPage } from './pages/product.js';
import { journalPage } from './pages/journal.js';
import { infoPage } from './pages/info.js';

function methodNotAllowed(allow) {
  return json({ ok: false, error: 'Method not allowed' }, 405);
}

export async function handleRequest(request, env) {
  const url = new URL(request.url);
  const { pathname } = url;
  const method = request.method.toUpperCase();

  // --- Public store APIs ---
  if (pathname === '/api/store/products') {
    const q = url.searchParams.get('q') || '';
    const limit = url.searchParams.get('limit') || '24';
    return listPublishedProducts(env, { q, limit });
  }
  if (pathname === '/api/store/home') {
    return getHomeContent(env);
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

  // --- Lume admin APIs ---
  if (pathname === '/api/lume/products') {
    const denied = await requireAdmin(request, env);
    if (denied) return denied;
    return listLumeProducts(env);
  }
  if (pathname === '/api/lume/update') {
    if (method !== 'POST') return methodNotAllowed('POST');
    const denied = await requireAdmin(request, env);
    if (denied) return denied;
    return updateLumeProduct(request, env);
  }
  if (pathname === '/api/lume/publish') {
    if (method !== 'POST') return methodNotAllowed('POST');
    const denied = await requireAdmin(request, env);
    if (denied) return denied;
    return publishLumeProduct(request, env);
  }
  if (pathname === '/api/lume/refresh') {
    if (method !== 'POST') return methodNotAllowed('POST');
    const denied = await requireAdmin(request, env);
    if (denied) return denied;
    return refreshLumeProduct(request, env);
  }
  if (pathname === '/api/lume/import') {
    if (method !== 'POST') return methodNotAllowed('POST');
    const denied = await requireImportAuth(request, env);
    if (denied) return denied;
    return importLumeProduct(request, env);
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
    return methodNotAllowed('GET, POST');
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
    return methodNotAllowed('GET, POST, DELETE');
  }

  // --- HTML pages ---
  if (pathname.startsWith('/collections/')) return collectionPage(url, env);
  if (pathname.startsWith('/products/')) return productPage(url, env);
  if (pathname === '/journal' || pathname.startsWith('/journal/')) return journalPage(url, env);
  if (['/shipping', '/returns', '/contact', '/sourcing', '/about'].includes(pathname)) {
    return infoPage(pathname);
  }
  if (pathname === '/admin') return adminPage();

  if (pathname === '/' || pathname === '') return homePage();

  return htmlNotFound();
}

function htmlNotFound() {
  return new Response('<!doctype html><html><body><h1>Not found</h1><p><a href="/">Maison Marnier</a></p></body></html>', {
    status: 404,
    headers: { 'content-type': 'text/html; charset=UTF-8', 'cache-control': 'no-store' },
  });
}
