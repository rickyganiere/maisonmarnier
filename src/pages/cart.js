import { htmlPage } from '../lib/html.js';

export function cartPage(url) {
  const cancelled = url.searchParams.get('cancelled') === '1';
  const body = `
<nav class="crumbs" aria-label="Miga de pan">
  <a href="/">Inicio</a><span class="sep">/</span>
  <span>Carrito</span>
</nav>
<div class="head">
  <div>
    <h1>Tu carrito</h1>
    <p class="lead">Envío gratis en pedidos superiores a 100 €.</p>
  </div>
</div>
${cancelled ? '<p class="muted" style="margin-bottom:18px">El pago se canceló — tu carrito sigue aquí.</p>' : ''}
<div id="cartRoot" class="empty">Cargando carrito…</div>
<script>
(function(){
  const KEY='mm_cart';
  const root=document.getElementById('cartRoot');
  function load(){try{return JSON.parse(localStorage.getItem(KEY)||'[]')}catch(e){return []}}
  function save(c){localStorage.setItem(KEY,JSON.stringify(c));window.dispatchEvent(new Event('mm-cart'));}
  function money(n){return '€'+Number(n||0).toFixed(2)}
  function render(loggedIn){
    const cart=load();
    if(!cart.length){
      root.className='empty';
      root.innerHTML='Tu carrito está vacío. <a href="/collections/new">Ver novedades →</a>';
      return;
    }
    const sub=cart.reduce((s,i)=>s+Number(i.price||0)*Number(i.qty||1),0);
    const ship=sub>=100?0:6.9;
    const registerPanel=loggedIn?'':\`
      <div class="register-buy">
        <strong>Regístrate para comprar con seguimiento</strong>
        <p>Crea una cuenta gratuita para seguir pedidos, guardar favoritos y recuperar tu carrito con más facilidad.</p>
        <div class="buy-actions" style="margin:0">
          <a class="btn" href="/cuenta/registro?next=/cart">Crear cuenta</a>
          <a class="btn btn-ghost" href="/cuenta/entrar?next=/cart">Ya tengo cuenta</a>
        </div>
      </div>\`;
    root.className='cart-layout';
    root.innerHTML='<div class="cart-lines">'+cart.map((i,idx)=>\`
      <div class="cart-line">
        <img src="\${String(i.image||'').replace(/"/g,'&quot;')}" alt="">
        <div>
          <a href="/products/\${encodeURIComponent(i.slug||'')}"><strong>\${String(i.name||'').replace(/</g,'&lt;')}</strong></a>
          <div class="muted">\${money(i.price)}</div>
          <label class="muted">Cant. <input data-idx="\${idx}" class="qty" type="number" min="1" max="20" value="\${Number(i.qty||1)}"></label>
          <button type="button" data-rm="\${idx}" class="rm">Quitar</button>
        </div>
        <div>\${money(Number(i.price||0)*Number(i.qty||1))}</div>
      </div>\`).join('')+'</div>'+
      \`<aside class="cart-summary">
        <h2>Resumen</h2>
        <div class="row"><span>Subtotal</span><span>\${money(sub)}</span></div>
        <div class="row muted"><span>Envío</span><span>\${ship?money(ship):'Gratis'}</span></div>
        <div class="row total"><span>Total</span><span>\${money(sub+ship)}</span></div>
        \${registerPanel}
        <div class="buy-actions" style="margin-top:18px;flex-direction:column;align-items:stretch">
          <button class="btn btn-block" type="button" id="checkoutBtn">Pagar con Stripe</button>
          <button class="btn btn-ghost btn-block" type="button" id="clearCartBtn">Vaciar carrito</button>
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
      msg.textContent='Redirigiendo a Stripe…';
      document.getElementById('checkoutBtn').disabled=true;
      try{
        const r=await fetch('/api/checkout',{method:'POST',headers:{'content-type':'application/json'},credentials:'same-origin',body:JSON.stringify({items:cart.map(i=>({productId:i.id,quantity:i.qty}))})});
        const d=await r.json();
        if(!d.ok||!d.url){msg.textContent=d.error||'El pago ha fallado';document.getElementById('checkoutBtn').disabled=false;return}
        location.href=d.url;
      }catch(e){msg.textContent='El pago ha fallado';document.getElementById('checkoutBtn').disabled=false}
    };
  }
  fetch('/api/account/me',{credentials:'same-origin'}).then(r=>r.json()).then(d=>render(!!(d&&d.ok&&d.customer))).catch(()=>render(false));
})();
</script>`;

  return htmlPage('Carrito', body, {
    description: 'Tu carrito Maison Marnier.',
    canonical: '/cart',
    noindex: true,
  });
}

export function checkoutSuccessPageHtml(info) {
  const orderNumber =
    info && typeof info === 'object'
      ? String(info.orderNumber || info.sessionId || '').slice(0, 64)
      : String(info || '').slice(0, 64);
  const body = `
<nav class="crumbs" aria-label="Miga de pan">
  <a href="/">Inicio</a><span class="sep">/</span>
  <span>Pedido confirmado</span>
</nav>
<div class="head">
  <div>
    <h1>Gracias</h1>
    <p class="lead">Tu pedido está confirmado. Te enviaremos actualizaciones por correo a medida que avance el envío.</p>
  </div>
</div>
${orderNumber ? `<p class="muted">Referencia del pedido: <strong>${orderNumber.replace(/</g, '&lt;')}</strong></p>` : ''}
<div class="register-buy" style="max-width:560px;margin-top:22px">
  <strong>¿Quieres seguir este pedido desde tu cuenta?</strong>
  <p>Regístrate con el mismo correo de compra para ver el estado, guardar favoritos y repetir pedidos con facilidad.</p>
  <div class="buy-actions" style="margin:0">
    <a class="btn" href="/cuenta/registro?next=/cuenta">Crear cuenta</a>
    <a class="btn btn-ghost" href="/cuenta">Ir a mi cuenta</a>
  </div>
</div>
<p style="margin-top:24px"><a class="btn btn-ghost" href="/collections/new">Seguir comprando</a></p>
<script>try{localStorage.removeItem('mm_cart');window.dispatchEvent(new Event('mm-cart'))}catch(e){}</script>`;
  return htmlPage('Pedido confirmado', body, {
    description: 'Tu pedido Maison Marnier está confirmado.',
    canonical: '/checkout/success',
    noindex: true,
  });
}
