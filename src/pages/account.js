import { esc } from '../lib/escape.js';
import { htmlPage, productCard } from '../lib/html.js';
import { getLang, langHref, t, tr } from '../lib/i18n.js';
import {
  getCustomerFromRequest,
  listOrdersForCustomer,
  listWishlistProducts,
} from '../db/customers.js';

const STATUS = {
  pending_payment: { es: 'Pendiente de pago', en: 'Pending payment' },
  paid: { es: 'Pagado', en: 'Paid' },
  fulfilling: { es: 'En preparación', en: 'Preparing' },
  fulfilled: { es: 'Enviado / cumplido', en: 'Shipped / fulfilled' },
  fulfill_failed: { es: 'Incidencia en envío', en: 'Shipping issue' },
  expired: { es: 'Caducado', en: 'Expired' },
  refunded: { es: 'Reembolsado', en: 'Refunded' },
};

const ACCOUNT_CSS = `
.account-shell{max-width:920px;margin:0 auto;padding-top:8px}
.account-hero{margin:8px 0 28px}
.account-hero h1{margin:0}
.account-hero .lead{margin-top:10px}
.account-grid{display:grid;grid-template-columns:minmax(0,1.15fr) minmax(260px,.85fr);gap:24px;align-items:start}
.account-panel{background:var(--panel);border:1px solid var(--line);border-radius:12px;padding:26px 24px}
.account-panel h2{margin:0 0 8px;font:900 22px/1.2 var(--font);letter-spacing:-.03em;color:#fff}
.account-panel .panel-lead{margin:0 0 18px;color:var(--muted);font:500 14px/1.5 var(--font)}
.account-benefits{display:grid;gap:10px;margin:0 0 20px;padding:0;list-style:none}
.account-benefits li{display:grid;grid-template-columns:18px 1fr;gap:10px;align-items:start;color:var(--soft);font:500 13px/1.45 var(--font)}
.account-benefits i{font-style:normal;color:var(--accent);font-weight:800}
.auth-form{display:grid;gap:14px}
.auth-form label{display:grid;gap:6px;font:700 11px/1 var(--font);letter-spacing:.1em;text-transform:uppercase;color:var(--muted)}
.auth-form input{width:100%;padding:13px 14px;border:1px solid var(--line);border-radius:8px;background:var(--bg);color:var(--ink);font:600 15px/1.2 var(--font)}
.auth-form input:focus{outline:2px solid var(--accent);outline-offset:1px}
.auth-form .hint{margin:0;color:var(--muted);font:500 12px/1.4 var(--font)}
.auth-form .err{margin:0;color:#e8a0a0;font:700 13px/1.4 var(--font);min-height:1.2em}
.auth-switch{margin-top:16px;color:var(--muted);font:500 13px/1.5 var(--font)}
.auth-switch a{color:var(--accent2);font-weight:700;text-decoration:underline}
.account-tabs{display:flex;flex-wrap:wrap;gap:8px;margin:0 0 22px}
.account-tabs a{padding:10px 14px;border:1px solid var(--line);border-radius:6px;font:700 11px/1 var(--font);letter-spacing:.08em;text-transform:uppercase;color:var(--muted);background:var(--panel)}
.account-tabs a.is-active{background:var(--accent);color:#12100e;border-color:var(--accent)}
.order-list{display:grid;gap:12px}
.order-card{display:grid;gap:8px;padding:16px 18px;border:1px solid var(--line);border-radius:10px;background:var(--panel2)}
.order-card .top{display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;align-items:baseline}
.order-card strong{font:800 15px/1.3 var(--font)}
.order-status{display:inline-flex;align-items:center;padding:6px 9px;border-radius:5px;background:rgba(201,164,106,.14);color:var(--accent2);font:800 10px/1 var(--font);letter-spacing:.08em;text-transform:uppercase}
.wish-empty,.orders-empty{padding:28px 0;color:var(--muted);font:700 16px/1.45 var(--font)}
.account-actions{display:flex;flex-wrap:wrap;gap:10px;margin-top:18px}
@media(max-width:860px){.account-grid{grid-template-columns:1fr}}
`;

function money(n) {
  return `€${Number(n || 0).toFixed(2)}`;
}

function formatDate(iso, lang) {
  const locale = lang === 'en' ? 'en-GB' : 'es-ES';
  try {
    return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso));
  } catch {
    return String(iso || '');
  }
}

function statusLabel(status, lang) {
  return STATUS[status] ? tr(lang, STATUS[status]) : String(status || '');
}

function authScript(mode, lang) {
  const endpoint = mode === 'register' ? '/api/account/register' : '/api/account/login';
  const fail = tr(lang, { es: 'No se pudo completar.', en: 'Could not complete.' });
  const net = tr(lang, { es: 'Error de red. Inténtalo de nuevo.', en: 'Network error. Try again.' });
  return `<script>
(function(){
  const form=document.getElementById('authForm');
  if(!form)return;
  const err=document.getElementById('authErr');
  const btn=document.getElementById('authSubmit');
  form.addEventListener('submit',async(e)=>{
    e.preventDefault();
    err.textContent='';
    btn.disabled=true;
    const fd=new FormData(form);
    const payload={
      email:String(fd.get('email')||'').trim(),
      password:String(fd.get('password')||''),
      name:String(fd.get('name')||'').trim()
    };
    try{
      const r=await fetch('${endpoint}',{method:'POST',headers:{'content-type':'application/json'},credentials:'same-origin',body:JSON.stringify(payload)});
      const d=await r.json();
      if(!d.ok){err.textContent=d.error||${JSON.stringify(fail)};btn.disabled=false;return}
      const next=new URLSearchParams(location.search).get('next')||'/cuenta';
      location.href=next.startsWith('/')?next:'/cuenta';
    }catch(ex){err.textContent=${JSON.stringify(net)};btn.disabled=false}
  });
})();
</script>`;
}

export function registerPageHtml({ next = '/cuenta', request = null } = {}) {
  const lang = request ? getLang(request) : 'es';
  const body = `<style>${ACCOUNT_CSS}</style>
<nav class="crumbs" aria-label="${t(lang, 'crumbs_aria')}">
  <a href="${langHref('/', lang)}">${t(lang, 'home')}</a><span class="sep">/</span>
  <a href="${langHref('/cuenta', lang)}">${t(lang, 'account')}</a><span class="sep">/</span>
  <span>${tr(lang, { es: 'Crear cuenta', en: 'Create account' })}</span>
</nav>
<section class="account-shell">
  <div class="account-hero">
    <h1>${tr(lang, { es: 'Regístrate para comprar', en: 'Register to shop' })}</h1>
    <p class="lead">${tr(lang, { es: 'Guarda favoritos, sigue tus pedidos y vuelve a tu edición cuando quieras.', en: 'Save favorites, track orders, and return to your edit whenever you like.' })}</p>
  </div>
  <div class="account-grid">
    <div class="account-panel">
      <h2>${tr(lang, { es: 'Crear tu cuenta', en: 'Create your account' })}</h2>
      <p class="panel-lead">${tr(lang, { es: 'Un minuto y listo — checkout más ágil y seguimiento de pedidos.', en: 'One minute and you’re set — faster checkout and order tracking.' })}</p>
      <form class="auth-form" id="authForm" autocomplete="on">
        <label>${tr(lang, { es: 'Nombre', en: 'Name' })}<input name="name" type="text" maxlength="120" placeholder="${esc(tr(lang, { es: 'Tu nombre', en: 'Your name' }))}" autocomplete="name"></label>
        <label>${tr(lang, { es: 'Correo electrónico', en: 'Email' })}<input name="email" type="email" required maxlength="254" placeholder="you@email.com" autocomplete="email"></label>
        <label>${tr(lang, { es: 'Contraseña', en: 'Password' })}<input name="password" type="password" required minlength="8" maxlength="128" placeholder="${esc(tr(lang, { es: 'Mínimo 8 caracteres', en: 'At least 8 characters' }))}" autocomplete="new-password"></label>
        <p class="hint">${tr(lang, {
          es: 'Al crear la cuenta aceptas los <a href="/terminos">Términos y condiciones</a> y la <a href="/privacidad">Política de privacidad</a>.',
          en: 'By creating an account you accept the <a href="/terminos">Terms &amp; conditions</a> and <a href="/privacidad">Privacy policy</a>.',
        })}</p>
        <p class="err" id="authErr" role="alert"></p>
        <button class="btn btn-block" type="submit" id="authSubmit">${tr(lang, { es: 'Crear cuenta', en: 'Create account' })}</button>
      </form>
      <p class="auth-switch">${tr(lang, { es: '¿Ya tienes cuenta?', en: 'Already have an account?' })} <a href="${langHref('/cuenta/entrar?next=' + encodeURIComponent(next), lang)}">${tr(lang, { es: 'Iniciar sesión', en: 'Sign in' })}</a></p>
    </div>
    <aside class="account-panel">
      <h2>${tr(lang, { es: 'Por qué registrarte', en: 'Why register' })}</h2>
      <ul class="account-benefits">
        <li><i>✓</i><span>${tr(lang, { es: 'Seguimiento de pedidos y estado de envío en un solo sitio.', en: 'Order tracking and shipping status in one place.' })}</span></li>
        <li><i>✓</i><span>${tr(lang, { es: 'Lista de deseos sincronizada entre visitas.', en: 'Wishlist synced across visits.' })}</span></li>
        <li><i>✓</i><span>${tr(lang, { es: 'Checkout más rápido con tu correo guardado.', en: 'Faster checkout with your email saved.' })}</span></li>
        <li><i>✓</i><span>${tr(lang, { es: 'Avisos de piezas que vuelven a stock o a la edición.', en: 'Alerts when pieces return to stock or the edit.' })}</span></li>
      </ul>
      <a class="btn btn-ghost btn-block" href="${langHref('/cart', lang)}">${tr(lang, { es: 'Seguir como invitado', en: 'Continue as guest' })}</a>
    </aside>
  </div>
</section>
${authScript('register', lang)}`;

  return htmlPage(tr(lang, { es: 'Crear cuenta', en: 'Create account' }), body, {
    description: tr(lang, {
      es: 'Crea tu cuenta Maison Marnier para seguir pedidos y guardar tu lista de deseos.',
      en: 'Create your Maison Marnier account to track orders and save your wishlist.',
    }),
    canonical: '/cuenta/registro',
    noindex: true,
    request,
    path: '/cuenta/registro',
    lang,
  });
}

export function loginPageHtml({ next = '/cuenta', request = null } = {}) {
  const lang = request ? getLang(request) : 'es';
  const body = `<style>${ACCOUNT_CSS}</style>
<nav class="crumbs" aria-label="${t(lang, 'crumbs_aria')}">
  <a href="${langHref('/', lang)}">${t(lang, 'home')}</a><span class="sep">/</span>
  <a href="${langHref('/cuenta', lang)}">${t(lang, 'account')}</a><span class="sep">/</span>
  <span>${tr(lang, { es: 'Entrar', en: 'Sign in' })}</span>
</nav>
<section class="account-shell">
  <div class="account-hero">
    <h1>${tr(lang, { es: 'Bienvenida de nuevo', en: 'Welcome back' })}</h1>
    <p class="lead">${tr(lang, { es: 'Accede a tus pedidos, favoritos y perfil de compra.', en: 'Access your orders, favorites, and shopping profile.' })}</p>
  </div>
  <div class="account-grid">
    <div class="account-panel">
      <h2>${tr(lang, { es: 'Iniciar sesión', en: 'Sign in' })}</h2>
      <p class="panel-lead">${tr(lang, { es: 'Usa el correo con el que te registraste.', en: 'Use the email you registered with.' })}</p>
      <form class="auth-form" id="authForm" autocomplete="on">
        <label>${tr(lang, { es: 'Correo electrónico', en: 'Email' })}<input name="email" type="email" required maxlength="254" placeholder="you@email.com" autocomplete="email"></label>
        <label>${tr(lang, { es: 'Contraseña', en: 'Password' })}<input name="password" type="password" required minlength="8" maxlength="128" placeholder="${esc(tr(lang, { es: 'Tu contraseña', en: 'Your password' }))}" autocomplete="current-password"></label>
        <p class="err" id="authErr" role="alert"></p>
        <button class="btn btn-block" type="submit" id="authSubmit">${tr(lang, { es: 'Entrar', en: 'Sign in' })}</button>
      </form>
      <p class="auth-switch">${tr(lang, { es: '¿Nueva en la maison?', en: 'New to the maison?' })} <a href="${langHref('/cuenta/registro?next=' + encodeURIComponent(next), lang)}">${tr(lang, { es: 'Crear cuenta', en: 'Create account' })}</a></p>
    </div>
    <aside class="account-panel">
      <h2>${tr(lang, { es: 'Tu espacio', en: 'Your space' })}</h2>
      <ul class="account-benefits">
        <li><i>✓</i><span>${tr(lang, { es: 'Pedidos y seguimiento.', en: 'Orders and tracking.' })}</span></li>
        <li><i>✓</i><span>${tr(lang, { es: 'Lista de deseos.', en: 'Wishlist.' })}</span></li>
        <li><i>✓</i><span>${tr(lang, { es: 'Datos listos para el próximo checkout.', en: 'Details ready for the next checkout.' })}</span></li>
      </ul>
    </aside>
  </div>
</section>
${authScript('login', lang)}`;

  return htmlPage(tr(lang, { es: 'Iniciar sesión', en: 'Sign in' }), body, {
    description: tr(lang, {
      es: 'Inicia sesión en Maison Marnier para ver pedidos y lista de deseos.',
      en: 'Sign in to Maison Marnier to view orders and wishlist.',
    }),
    canonical: '/cuenta/entrar',
    noindex: true,
    request,
    path: '/cuenta/entrar',
    lang,
  });
}

export async function accountDashboardPage(request, env) {
  const lang = getLang(request);
  const customer = await getCustomerFromRequest(request, env);
  if (!customer) {
    return Response.redirect(new URL('/cuenta/entrar?next=/cuenta', request.url).toString(), 302);
  }

  const [orders, wishlist] = await Promise.all([
    listOrdersForCustomer(env, customer),
    listWishlistProducts(env, customer.id),
  ]);

  const ordersHtml = orders.length
    ? `<div class="order-list">${orders
        .map(
          (o) => `<article class="order-card">
        <div class="top">
          <strong>${esc(o.order_number)}</strong>
          <span class="order-status">${esc(statusLabel(o.status, lang))}</span>
        </div>
        <div class="muted">${esc(formatDate(o.created_at, lang))} · ${money(o.total_eur)}</div>
        ${o.cj_status ? `<div class="muted">${tr(lang, { es: 'Estado logística', en: 'Logistics status' })}: ${esc(o.cj_status)}</div>` : ''}
      </article>`,
        )
        .join('')}</div>`
    : `<p class="orders-empty">${tr(lang, { es: 'Aún no hay pedidos.', en: 'No orders yet.' })} <a href="${langHref('/collections/seasonal', lang)}">${tr(lang, { es: 'Explorar la edición →', en: 'Explore the edit →' })}</a></p>`;

  const wishHtml = wishlist.length
    ? `<div class="grid" style="grid-template-columns:repeat(auto-fill,minmax(160px,1fr));padding-top:8px">${wishlist
        .map((p) => productCard(p, lang))
        .join('')}</div>`
    : `<p class="wish-empty">${tr(lang, { es: 'Tu lista de deseos está vacía. Guarda piezas desde la ficha de producto.', en: 'Your wishlist is empty. Save pieces from a product page.' })}</p>`;

  const body = `<style>${ACCOUNT_CSS}</style>
<nav class="crumbs" aria-label="${t(lang, 'crumbs_aria')}">
  <a href="${langHref('/', lang)}">${t(lang, 'home')}</a><span class="sep">/</span>
  <span>${t(lang, 'account')}</span>
</nav>
<section class="account-shell">
  <div class="account-hero">
    <h1>${tr(lang, { es: 'Hola', en: 'Hello' })}${customer.name ? `, ${esc(customer.name.split(' ')[0])}` : ''}</h1>
    <p class="lead">${esc(customer.email)} · ${tr(lang, { es: 'tu espacio Maison Marnier.', en: 'your Maison Marnier space.' })}</p>
  </div>
  <div class="account-tabs" role="navigation" aria-label="${esc(tr(lang, { es: 'Secciones de cuenta', en: 'Account sections' }))}">
    <a class="is-active" href="#pedidos">${tr(lang, { es: 'Pedidos', en: 'Orders' })}</a>
    <a href="#deseos">${tr(lang, { es: 'Lista de deseos', en: 'Wishlist' })}</a>
    <a href="${langHref('/cart', lang)}">${t(lang, 'cart')}</a>
  </div>
  <section class="account-panel" id="pedidos" style="margin-bottom:22px">
    <h2>${tr(lang, { es: 'Tus pedidos', en: 'Your orders' })}</h2>
    <p class="panel-lead">${tr(lang, { es: 'Estado y referencias de compra. Te avisamos por correo cuando el paquete sale del almacén.', en: 'Order status and references. We email you when the parcel leaves the warehouse.' })}</p>
    ${ordersHtml}
  </section>
  <section class="account-panel" id="deseos">
    <h2>${tr(lang, { es: 'Lista de deseos', en: 'Wishlist' })}</h2>
    <p class="panel-lead">${tr(lang, { es: 'Piezas guardadas para más tarde.', en: 'Pieces saved for later.' })}</p>
    ${wishHtml}
    <div class="account-actions">
      <a class="btn" href="${langHref('/collections/new', lang)}">${tr(lang, { es: 'Seguir comprando', en: 'Keep shopping' })}</a>
      <button class="btn btn-ghost" type="button" id="logoutBtn">${tr(lang, { es: 'Cerrar sesión', en: 'Sign out' })}</button>
    </div>
  </section>
</section>
<script>
document.getElementById('logoutBtn')?.addEventListener('click',async()=>{
  await fetch('/api/account/logout',{method:'POST',credentials:'same-origin'});
  location.href='/';
});
</script>`;

  return htmlPage(tr(lang, { es: 'Mi cuenta', en: 'My account' }), body, {
    description: tr(lang, {
      es: 'Tu cuenta Maison Marnier: pedidos y lista de deseos.',
      en: 'Your Maison Marnier account: orders and wishlist.',
    }),
    canonical: '/cuenta',
    noindex: true,
    request,
    path: '/cuenta',
    lang,
  });
}

export async function accountRoute(request, env, pathname) {
  if (pathname === '/cuenta' || pathname === '/cuenta/') {
    return accountDashboardPage(request, env);
  }
  if (pathname === '/cuenta/registro') {
    const customer = await getCustomerFromRequest(request, env);
    if (customer) return Response.redirect(new URL('/cuenta', request.url).toString(), 302);
    const next = new URL(request.url).searchParams.get('next') || '/cuenta';
    return registerPageHtml({ next, request });
  }
  if (pathname === '/cuenta/entrar') {
    const customer = await getCustomerFromRequest(request, env);
    if (customer) return Response.redirect(new URL('/cuenta', request.url).toString(), 302);
    const next = new URL(request.url).searchParams.get('next') || '/cuenta';
    return loginPageHtml({ next, request });
  }
  return null;
}
