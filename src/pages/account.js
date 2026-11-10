import { esc } from '../lib/escape.js';
import { htmlPage, productCard } from '../lib/html.js';
import {
  getCustomerFromRequest,
  listOrdersForCustomer,
  listWishlistProducts,
} from '../db/customers.js';

const STATUS_ES = {
  pending_payment: 'Pendiente de pago',
  paid: 'Pagado',
  fulfilling: 'En preparación',
  fulfilled: 'Enviado / cumplido',
  fulfill_failed: 'Incidencia en envío',
  expired: 'Caducado',
  refunded: 'Reembolsado',
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

function formatDate(iso) {
  try {
    return new Intl.DateTimeFormat('es-ES', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso));
  } catch {
    return String(iso || '');
  }
}

function authScript(mode) {
  const endpoint = mode === 'register' ? '/api/account/register' : '/api/account/login';
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
      if(!d.ok){err.textContent=d.error||'No se pudo completar.';btn.disabled=false;return}
      const next=new URLSearchParams(location.search).get('next')||'/cuenta';
      location.href=next.startsWith('/')?next:'/cuenta';
    }catch(ex){err.textContent='Error de red. Inténtalo de nuevo.';btn.disabled=false}
  });
})();
</script>`;
}

export function registerPageHtml({ next = '/cuenta' } = {}) {
  const body = `<style>${ACCOUNT_CSS}</style>
<nav class="crumbs" aria-label="Miga de pan">
  <a href="/">Inicio</a><span class="sep">/</span>
  <a href="/cuenta">Cuenta</a><span class="sep">/</span>
  <span>Crear cuenta</span>
</nav>
<section class="account-shell">
  <div class="account-hero">
    <h1>Regístrate para comprar</h1>
    <p class="lead">Guarda favoritos, sigue tus pedidos y vuelve a tu edición cuando quieras.</p>
  </div>
  <div class="account-grid">
    <div class="account-panel">
      <h2>Crear tu cuenta</h2>
      <p class="panel-lead">Un minuto y listo — checkout más ágil y seguimiento de pedidos.</p>
      <form class="auth-form" id="authForm" autocomplete="on">
        <label>Nombre<input name="name" type="text" maxlength="120" placeholder="Tu nombre" autocomplete="name"></label>
        <label>Correo electrónico<input name="email" type="email" required maxlength="254" placeholder="tu@correo.com" autocomplete="email"></label>
        <label>Contraseña<input name="password" type="password" required minlength="8" maxlength="128" placeholder="Mínimo 8 caracteres" autocomplete="new-password"></label>
        <p class="hint">Al crear la cuenta aceptas los <a href="/terminos">Términos y condiciones</a> y la <a href="/privacidad">Política de privacidad</a>.</p>
        <p class="err" id="authErr" role="alert"></p>
        <button class="btn btn-block" type="submit" id="authSubmit">Crear cuenta</button>
      </form>
      <p class="auth-switch">¿Ya tienes cuenta? <a href="/cuenta/entrar?next=${encodeURIComponent(next)}">Iniciar sesión</a></p>
    </div>
    <aside class="account-panel">
      <h2>Por qué registrarte</h2>
      <ul class="account-benefits">
        <li><i>✓</i><span>Seguimiento de pedidos y estado de envío en un solo sitio.</span></li>
        <li><i>✓</i><span>Lista de deseos sincronizada entre visitas.</span></li>
        <li><i>✓</i><span>Checkout más rápido con tu correo guardado.</span></li>
        <li><i>✓</i><span>Avisos de piezas que vuelven a stock o a la edición.</span></li>
      </ul>
      <a class="btn btn-ghost btn-block" href="/cart">Seguir como invitado</a>
    </aside>
  </div>
</section>
${authScript('register')}`;

  return htmlPage('Crear cuenta', body, {
    description: 'Crea tu cuenta Maison Marnier para seguir pedidos y guardar tu lista de deseos.',
    canonical: '/cuenta/registro',
    noindex: true,
  });
}

export function loginPageHtml({ next = '/cuenta' } = {}) {
  const body = `<style>${ACCOUNT_CSS}</style>
<nav class="crumbs" aria-label="Miga de pan">
  <a href="/">Inicio</a><span class="sep">/</span>
  <a href="/cuenta">Cuenta</a><span class="sep">/</span>
  <span>Entrar</span>
</nav>
<section class="account-shell">
  <div class="account-hero">
    <h1>Bienvenida de nuevo</h1>
    <p class="lead">Accede a tus pedidos, favoritos y perfil de compra.</p>
  </div>
  <div class="account-grid">
    <div class="account-panel">
      <h2>Iniciar sesión</h2>
      <p class="panel-lead">Usa el correo con el que te registraste.</p>
      <form class="auth-form" id="authForm" autocomplete="on">
        <label>Correo electrónico<input name="email" type="email" required maxlength="254" placeholder="tu@correo.com" autocomplete="email"></label>
        <label>Contraseña<input name="password" type="password" required minlength="8" maxlength="128" placeholder="Tu contraseña" autocomplete="current-password"></label>
        <p class="err" id="authErr" role="alert"></p>
        <button class="btn btn-block" type="submit" id="authSubmit">Entrar</button>
      </form>
      <p class="auth-switch">¿Nueva en la maison? <a href="/cuenta/registro?next=${encodeURIComponent(next)}">Crear cuenta</a></p>
    </div>
    <aside class="account-panel">
      <h2>Tu espacio</h2>
      <ul class="account-benefits">
        <li><i>✓</i><span>Pedidos y seguimiento.</span></li>
        <li><i>✓</i><span>Lista de deseos.</span></li>
        <li><i>✓</i><span>Datos listos para el próximo checkout.</span></li>
      </ul>
    </aside>
  </div>
</section>
${authScript('login')}`;

  return htmlPage('Iniciar sesión', body, {
    description: 'Inicia sesión en Maison Marnier para ver pedidos y lista de deseos.',
    canonical: '/cuenta/entrar',
    noindex: true,
  });
}

export async function accountDashboardPage(request, env) {
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
          <span class="order-status">${esc(STATUS_ES[o.status] || o.status)}</span>
        </div>
        <div class="muted">${esc(formatDate(o.created_at))} · ${money(o.total_eur)}</div>
        ${o.cj_status ? `<div class="muted">Estado logística: ${esc(o.cj_status)}</div>` : ''}
      </article>`,
        )
        .join('')}</div>`
    : `<p class="orders-empty">Aún no hay pedidos. <a href="/collections/seasonal">Explorar la edición →</a></p>`;

  const wishHtml = wishlist.length
    ? `<div class="grid" style="grid-template-columns:repeat(auto-fill,minmax(160px,1fr));padding-top:8px">${wishlist
        .map(productCard)
        .join('')}</div>`
    : `<p class="wish-empty">Tu lista de deseos está vacía. Guarda piezas desde la ficha de producto.</p>`;

  const body = `<style>${ACCOUNT_CSS}</style>
<nav class="crumbs" aria-label="Miga de pan">
  <a href="/">Inicio</a><span class="sep">/</span>
  <span>Cuenta</span>
</nav>
<section class="account-shell">
  <div class="account-hero">
    <h1>Hola${customer.name ? `, ${esc(customer.name.split(' ')[0])}` : ''}</h1>
    <p class="lead">${esc(customer.email)} · tu espacio Maison Marnier.</p>
  </div>
  <div class="account-tabs" role="navigation" aria-label="Secciones de cuenta">
    <a class="is-active" href="#pedidos">Pedidos</a>
    <a href="#deseos">Lista de deseos</a>
    <a href="/cart">Carrito</a>
  </div>
  <section class="account-panel" id="pedidos" style="margin-bottom:22px">
    <h2>Tus pedidos</h2>
    <p class="panel-lead">Estado y referencias de compra. Te avisamos por correo cuando el paquete sale del almacén.</p>
    ${ordersHtml}
  </section>
  <section class="account-panel" id="deseos">
    <h2>Lista de deseos</h2>
    <p class="panel-lead">Piezas guardadas para más tarde.</p>
    ${wishHtml}
    <div class="account-actions">
      <a class="btn" href="/collections/new">Seguir comprando</a>
      <button class="btn btn-ghost" type="button" id="logoutBtn">Cerrar sesión</button>
    </div>
  </section>
</section>
<script>
document.getElementById('logoutBtn')?.addEventListener('click',async()=>{
  await fetch('/api/account/logout',{method:'POST',credentials:'same-origin'});
  location.href='/';
});
</script>`;

  return htmlPage('Mi cuenta', body, {
    description: 'Tu cuenta Maison Marnier: pedidos y lista de deseos.',
    canonical: '/cuenta',
    noindex: true,
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
    return registerPageHtml({ next });
  }
  if (pathname === '/cuenta/entrar') {
    const customer = await getCustomerFromRequest(request, env);
    if (customer) return Response.redirect(new URL('/cuenta', request.url).toString(), 302);
    const next = new URL(request.url).searchParams.get('next') || '/cuenta';
    return loginPageHtml({ next });
  }
  return null;
}
