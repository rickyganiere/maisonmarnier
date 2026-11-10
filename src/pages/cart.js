import { htmlPage } from '../lib/html.js';
import { getLang, t, tr } from '../lib/i18n.js';

export function cartPage(url, request) {
  const lang = getLang(request);
  const cancelled = url.searchParams.get('cancelled') === '1';
  const copy = {
    empty: tr(lang, { es: 'Tu carrito está vacío. <a href="/collections/new">Ver novedades →</a>', en: 'Your cart is empty. <a href="/collections/new">Browse new arrivals →</a>' }),
    qty: tr(lang, { es: 'Cant.', en: 'Qty' }),
    remove: tr(lang, { es: 'Quitar', en: 'Remove' }),
    summary: tr(lang, { es: 'Resumen', en: 'Summary' }),
    subtotal: tr(lang, { es: 'Subtotal', en: 'Subtotal' }),
    shipping: tr(lang, { es: 'Envío', en: 'Shipping' }),
    free: tr(lang, { es: 'Gratis', en: 'Free' }),
    total: tr(lang, { es: 'Total', en: 'Total' }),
    registerTitle: tr(lang, { es: 'Regístrate para comprar con seguimiento', en: 'Register to buy with order tracking' }),
    registerBody: tr(lang, { es: 'Crea una cuenta gratuita para seguir pedidos, guardar favoritos y recuperar tu carrito con más facilidad.', en: 'Create a free account to track orders, save favourites and check out more easily.' }),
    createAccount: tr(lang, { es: 'Crear cuenta', en: 'Create account' }),
    haveAccount: tr(lang, { es: 'Ya tengo cuenta', en: 'I already have an account' }),
    checkout: tr(lang, { es: 'Pagar con Stripe', en: 'Checkout with Stripe' }),
    clear: tr(lang, { es: 'Vaciar carrito', en: 'Clear cart' }),
    redirecting: tr(lang, { es: 'Redirigiendo a Stripe…', en: 'Redirecting to Stripe…' }),
    failed: tr(lang, { es: 'El pago ha fallado', en: 'Checkout failed' }),
  };
  const body = `
<nav class="crumbs" aria-label="${t(lang, 'crumbs_aria')}">
  <a href="/">${t(lang, 'home')}</a><span class="sep">/</span>
  <span>${t(lang, 'cart')}</span>
</nav>
<div class="head">
  <div>
    <h1>${tr(lang, { es: 'Tu carrito', en: 'Your cart' })}</h1>
    <p class="lead">${tr(lang, { es: 'Envío gratis en pedidos superiores a 100 €.', en: 'Free shipping on orders over €100.' })}</p>
  </div>
</div>
${cancelled ? `<p class="muted" style="margin-bottom:18px">${tr(lang, { es: 'El pago se canceló — tu carrito sigue aquí.', en: 'Checkout was cancelled — your cart is still here.' })}</p>` : ''}
<div id="cartRoot" class="empty">${tr(lang, { es: 'Cargando carrito…', en: 'Loading cart…' })}</div>
<script>
(function(){
  const KEY='mm_cart';
  const L=${JSON.stringify(copy)};
  const root=document.getElementById('cartRoot');
  function load(){try{return JSON.parse(localStorage.getItem(KEY)||'[]')}catch(e){return []}}
  function save(c){localStorage.setItem(KEY,JSON.stringify(c));window.dispatchEvent(new Event('mm-cart'));}
  function money(n){return '€'+Number(n||0).toFixed(2)}
  function render(loggedIn){
    const cart=load();
    if(!cart.length){
      root.className='empty';
      root.innerHTML=L.empty;
      return;
    }
    const sub=cart.reduce((s,i)=>s+Number(i.price||0)*Number(i.qty||1),0);
    const ship=sub>=100?0:6.9;
    const registerPanel=loggedIn?'':\`
      <div class="register-buy">
        <strong>\${L.registerTitle}</strong>
        <p>\${L.registerBody}</p>
        <div class="buy-actions" style="margin:0">
          <a class="btn" href="/cuenta/registro?next=/cart">\${L.createAccount}</a>
          <a class="btn btn-ghost" href="/cuenta/entrar?next=/cart">\${L.haveAccount}</a>
        </div>
      </div>\`;
    root.className='cart-layout';
    root.innerHTML='<div class="cart-lines">'+cart.map((i,idx)=>\`
      <div class="cart-line">
        <img src="\${String(i.image||'').replace(/"/g,'&quot;')}" alt="">
        <div>
          <a href="/products/\${encodeURIComponent(i.slug||'')}"><strong>\${String(i.name||'').replace(/</g,'&lt;')}</strong></a>
          <div class="muted">\${money(i.price)}</div>
          <label class="muted">\${L.qty} <input data-idx="\${idx}" class="qty" type="number" min="1" max="20" value="\${Number(i.qty||1)}"></label>
          <button type="button" data-rm="\${idx}" class="rm">\${L.remove}</button>
        </div>
        <div>\${money(Number(i.price||0)*Number(i.qty||1))}</div>
      </div>\`).join('')+'</div>'+
      \`<aside class="cart-summary">
        <h2>\${L.summary}</h2>
        <div class="row"><span>\${L.subtotal}</span><span>\${money(sub)}</span></div>
        <div class="row muted"><span>\${L.shipping}</span><span>\${ship?money(ship):L.free}</span></div>
        <div class="row total"><span>\${L.total}</span><span>\${money(sub+ship)}</span></div>
        \${registerPanel}
        <div class="buy-actions" style="margin-top:18px;flex-direction:column;align-items:stretch">
          <button class="btn btn-block" type="button" id="checkoutBtn">\${L.checkout}</button>
          <button class="btn btn-ghost btn-block" type="button" id="clearCartBtn">\${L.clear}</button>
        </div>
        <p class="muted" id="cartMsg" style="margin-top:12px"></p>
      </aside>\`;
    root.querySelectorAll('.qty').forEach(inp=>{
      inp.onchange=()=>{
        const c=load(); const i=Number(inp.dataset.idx);
        c[i].qty=Math.max(1,Math.min(20,Number(inp.value)||1)); save(c); render(loggedIn);
      };
    });
    root.querySelectorAll('[data-rm]').forEach(btn=>{
      btn.onclick=()=>{ const c=load(); c.splice(Number(btn.dataset.rm),1); save(c); render(loggedIn); };
    });
    document.getElementById('clearCartBtn').onclick=()=>{save([]);render(loggedIn)};
    document.getElementById('checkoutBtn').onclick=async()=>{
      const msg=document.getElementById('cartMsg');
      const cart=load();
      if(!cart.length)return;
      msg.textContent=L.redirecting;
      document.getElementById('checkoutBtn').disabled=true;
      try{
        const r=await fetch('/api/checkout',{method:'POST',headers:{'content-type':'application/json'},credentials:'same-origin',body:JSON.stringify({items:cart.map(i=>({productId:i.id,quantity:i.qty}))})});
        const d=await r.json();
        if(!d.ok||!d.url){msg.textContent=d.error||L.failed;document.getElementById('checkoutBtn').disabled=false;return}
        location.href=d.url;
      }catch(e){msg.textContent=L.failed;document.getElementById('checkoutBtn').disabled=false}
    };
  }
  fetch('/api/account/me',{credentials:'same-origin'}).then(r=>r.json()).then(d=>render(!!(d&&d.ok&&d.customer))).catch(()=>render(false));
})();
</script>`;

  return htmlPage(tr(lang, { es: 'Carrito', en: 'Cart' }), body, {
    description: tr(lang, { es: 'Tu carrito Maison Marnier.', en: 'Your Maison Marnier cart.' }),
    canonical: '/cart',
    noindex: true,
    request,
    path: '/cart',
  });
}

export function checkoutSuccessPageHtml(info, request) {
  const lang = getLang(request);
  const orderNumber =
    info && typeof info === 'object'
      ? String(info.orderNumber || info.sessionId || '').slice(0, 64)
      : String(info || '').slice(0, 64);
  const body = `
<nav class="crumbs" aria-label="${t(lang, 'crumbs_aria')}">
  <a href="/">${t(lang, 'home')}</a><span class="sep">/</span>
  <span>${tr(lang, { es: 'Pedido confirmado', en: 'Order confirmed' })}</span>
</nav>
<div class="head">
  <div>
    <h1>${tr(lang, { es: 'Gracias', en: 'Thank you' })}</h1>
    <p class="lead">${tr(lang, { es: 'Tu pedido está confirmado. Te enviaremos actualizaciones por correo a medida que avance el envío.', en: 'Your order is confirmed. We’ll email updates as it moves to fulfilment.' })}</p>
  </div>
</div>
${orderNumber ? `<p class="muted">${tr(lang, { es: 'Referencia del pedido', en: 'Order reference' })}: <strong>${orderNumber.replace(/</g, '&lt;')}</strong></p>` : ''}
<div class="register-buy" style="max-width:560px;margin-top:22px">
  <strong>${tr(lang, { es: '¿Quieres seguir este pedido desde tu cuenta?', en: 'Want to track this order from your account?' })}</strong>
  <p>${tr(lang, { es: 'Regístrate con el mismo correo de compra para ver el estado, guardar favoritos y repetir pedidos con facilidad.', en: 'Register with the same purchase email to see status, save favourites and reorder easily.' })}</p>
  <div class="buy-actions" style="margin:0">
    <a class="btn" href="/cuenta/registro?next=/cuenta">${tr(lang, { es: 'Crear cuenta', en: 'Create account' })}</a>
    <a class="btn btn-ghost" href="/cuenta">${tr(lang, { es: 'Ir a mi cuenta', en: 'Go to my account' })}</a>
  </div>
</div>
<p style="margin-top:24px"><a class="btn btn-ghost" href="/collections/new">${tr(lang, { es: 'Seguir comprando', en: 'Continue shopping' })}</a></p>
<script>try{localStorage.removeItem('mm_cart');window.dispatchEvent(new Event('mm-cart'))}catch(e){}</script>`;
  return htmlPage(tr(lang, { es: 'Pedido confirmado', en: 'Order confirmed' }), body, {
    description: tr(lang, { es: 'Tu pedido Maison Marnier está confirmado.', en: 'Your Maison Marnier order is confirmed.' }),
    canonical: '/checkout/success',
    noindex: true,
    request,
    path: '/checkout/success',
  });
}
