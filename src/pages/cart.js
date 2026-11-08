import { htmlPage } from '../lib/html.js';

export function cartPage(url) {
  const cancelled = url.searchParams.get('cancelled') === '1';
  const body = `
<nav class="crumbs" aria-label="Breadcrumb">
  <a href="/">Home</a><span class="sep">/</span>
  <span>Cart</span>
</nav>
<div class="head">
  <div>
    <h1>Your cart</h1>
    <p class="lead">Free shipping on orders over €100.</p>
  </div>
</div>
${cancelled ? '<p class="muted" style="margin-bottom:18px">Checkout was cancelled — your cart is still here.</p>' : ''}
<div id="cartRoot" class="empty">Loading cart…</div>
<script>
(function(){
  const KEY='mm_cart';
  const root=document.getElementById('cartRoot');
  function load(){try{return JSON.parse(localStorage.getItem(KEY)||'[]')}catch(e){return []}}
  function save(c){localStorage.setItem(KEY,JSON.stringify(c));window.dispatchEvent(new Event('mm-cart'));}
  function money(n){return '€'+Number(n||0).toFixed(2)}
  function render(){
    const cart=load();
    if(!cart.length){
      root.className='empty';
      root.innerHTML='Your cart is empty. <a href="/collections/new">Browse new arrivals →</a>';
      return;
    }
    const sub=cart.reduce((s,i)=>s+Number(i.price||0)*Number(i.qty||1),0);
    const ship=sub>=100?0:6.9;
    root.className='cart-layout';
    root.innerHTML='<div class="cart-lines">'+cart.map((i,idx)=>\`
      <div class="cart-line">
        <img src="\${String(i.image||'').replace(/"/g,'&quot;')}" alt="">
        <div>
          <a href="/products/\${encodeURIComponent(i.slug||'')}"><strong>\${String(i.name||'').replace(/</g,'&lt;')}</strong></a>
          <div class="muted">\${money(i.price)}</div>
          <label class="muted">Qty <input data-idx="\${idx}" class="qty" type="number" min="1" max="20" value="\${Number(i.qty||1)}"></label>
          <button type="button" data-rm="\${idx}" class="rm">Remove</button>
        </div>
        <div>\${money(Number(i.price||0)*Number(i.qty||1))}</div>
      </div>\`).join('')+'</div>'+
      \`<aside class="cart-summary">
        <h2>Summary</h2>
        <div class="row"><span>Subtotal</span><span>\${money(sub)}</span></div>
        <div class="row muted"><span>Shipping</span><span>\${ship?money(ship):'Free'}</span></div>
        <div class="row total"><span>Total</span><span>\${money(sub+ship)}</span></div>
        <div class="buy-actions" style="margin-top:18px;flex-direction:column;align-items:stretch">
          <button class="btn btn-block" type="button" id="checkoutBtn">Checkout with Stripe</button>
          <button class="btn btn-ghost btn-block" type="button" id="clearCartBtn">Clear cart</button>
        </div>
        <p class="muted" id="cartMsg" style="margin-top:12px"></p>
      </aside>\`;
    root.querySelectorAll('.qty').forEach(inp=>{
      inp.onchange=()=>{
        const c=load(); const i=Number(inp.dataset.idx);
        c[i].qty=Math.max(1,Math.min(20,Number(inp.value)||1)); save(c); render();
      };
    });
    root.querySelectorAll('[data-rm]').forEach(btn=>{
      btn.onclick=()=>{ const c=load(); c.splice(Number(btn.dataset.rm),1); save(c); render(); };
    });
    document.getElementById('clearCartBtn').onclick=()=>{save([]);render()};
    document.getElementById('checkoutBtn').onclick=async()=>{
      const msg=document.getElementById('cartMsg');
      const cart=load();
      if(!cart.length)return;
      msg.textContent='Redirecting to Stripe…';
      document.getElementById('checkoutBtn').disabled=true;
      try{
        const r=await fetch('/api/checkout',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({items:cart.map(i=>({productId:i.id,quantity:i.qty}))})});
        const d=await r.json();
        if(!d.ok||!d.url){msg.textContent=d.error||'Checkout failed';document.getElementById('checkoutBtn').disabled=false;return}
        location.href=d.url;
      }catch(e){msg.textContent='Checkout failed';document.getElementById('checkoutBtn').disabled=false}
    };
  }
  render();
})();
</script>`;

  return htmlPage('Cart', body, {
    description: 'Your Maison Marnier cart.',
    canonical: '/cart',
    noindex: true,
  });
}

export function checkoutSuccessPageHtml(orderId) {
  const id = String(orderId || '').slice(0, 64);
  const body = `
<nav class="crumbs" aria-label="Breadcrumb">
  <a href="/">Home</a><span class="sep">/</span>
  <span>Order confirmed</span>
</nav>
<div class="head">
  <div>
    <h1>Thank you</h1>
    <p class="lead">Your order is confirmed. We’ll email updates as it moves to fulfilment.</p>
  </div>
</div>
${id ? `<p class="muted">Order reference: <strong>${id.replace(/</g, '&lt;')}</strong></p>` : ''}
<p style="margin-top:24px"><a class="btn" href="/collections/new">Continue shopping</a></p>
<script>try{localStorage.removeItem('mm_cart');window.dispatchEvent(new Event('mm-cart'))}catch(e){}</script>`;
  return htmlPage('Order confirmed', body, {
    description: 'Your Maison Marnier order is confirmed.',
    canonical: '/checkout/success',
    noindex: true,
  });
}
