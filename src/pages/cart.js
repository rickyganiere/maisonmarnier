import { esc } from '../lib/escape.js';
import { htmlPage } from '../lib/html.js';

export function cartPage(url) {
  const cancelled = url.searchParams.get('cancelled') === '1';
  const body = `
<div class="head">
  <div>
    <h1>Your cart</h1>
    <p class="lead">Free shipping on orders over €100.</p>
  </div>
</div>
${cancelled ? '<p class="muted">Checkout was cancelled — your cart is still here.</p>' : ''}
<div id="cartRoot" class="empty">Loading cart…</div>
<div id="cartActions" class="hidden" style="margin-top:24px;display:none;gap:12px;align-items:center;flex-wrap:wrap">
  <button class="btn" type="button" id="checkoutBtn">Checkout with Stripe</button>
  <button class="btn" type="button" id="clearCartBtn" style="background:transparent;color:inherit;border:1px solid var(--line)">Clear cart</button>
  <span class="muted" id="cartMsg"></span>
</div>
<script>
(function(){
  const KEY='mm_cart';
  const root=document.getElementById('cartRoot');
  const actions=document.getElementById('cartActions');
  const msg=document.getElementById('cartMsg');
  function load(){try{return JSON.parse(localStorage.getItem(KEY)||'[]')}catch(e){return []}}
  function save(c){localStorage.setItem(KEY,JSON.stringify(c));window.dispatchEvent(new Event('mm-cart'));}
  function money(n){return '€'+Number(n||0).toFixed(2)}
  function render(){
    const cart=load();
    if(!cart.length){
      root.className='empty';
      root.innerHTML='Your cart is empty. <a href="/collections/new">Browse new arrivals →</a>';
      actions.style.display='none';
      return;
    }
    root.className='';
    const sub=cart.reduce((s,i)=>s+Number(i.price||0)*Number(i.qty||1),0);
    const ship=sub>=100?0:6.9;
    root.innerHTML='<div style="display:grid;gap:14px">'+cart.map((i,idx)=>\`
      <div style="display:grid;grid-template-columns:72px 1fr auto;gap:12px;align-items:center;border-bottom:1px solid #d4cec4;padding-bottom:12px">
        <img src="\${String(i.image||'').replace(/"/g,'&quot;')}" alt="" style="width:72px;height:96px;object-fit:cover;background:#E9E0D3">
        <div>
          <a href="/products/\${encodeURIComponent(i.slug||'')}"><strong>\${String(i.name||'').replace(/</g,'&lt;')}</strong></a>
          <div class="muted">\${money(i.price)}</div>
          <label class="muted">Qty <input data-idx="\${idx}" class="qty" type="number" min="1" max="20" value="\${Number(i.qty||1)}" style="width:64px;margin-left:6px"></label>
          <button type="button" data-rm="\${idx}" class="muted" style="display:block;margin-top:6px;background:none;border:0;cursor:pointer;padding:0;text-decoration:underline">Remove</button>
        </div>
        <div>\${money(Number(i.price||0)*Number(i.qty||1))}</div>
      </div>\`).join('')+
      \`<div style="text-align:right;font:400 18px Georgia,serif">
        <div>Subtotal \${money(sub)}</div>
        <div class="muted" style="font-size:14px">Shipping \${ship?money(ship):'Free'}</div>
        <div style="margin-top:6px">Total \${money(sub+ship)}</div>
      </div></div>\`;
    actions.style.display='flex';
    root.querySelectorAll('.qty').forEach(inp=>{
      inp.onchange=()=>{
        const c=load(); const i=Number(inp.dataset.idx);
        c[i].qty=Math.max(1,Math.min(20,Number(inp.value)||1)); save(c); render();
      };
    });
    root.querySelectorAll('[data-rm]').forEach(btn=>{
      btn.onclick=()=>{ const c=load(); c.splice(Number(btn.dataset.rm),1); save(c); render(); };
    });
  }
  document.getElementById('clearCartBtn').onclick=()=>{save([]);render()};
  document.getElementById('checkoutBtn').onclick=async()=>{
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
  render();
})();
</script>`;

  return htmlPage('Cart', body);
}

export function checkoutSuccessPageHtml({ orderNumber, status }) {
  const body = `
<div class="head"><div>
  <h1>Thank you</h1>
  <p class="lead">Your payment was received. We are preparing your order with our fulfillment partner.</p>
</div></div>
<p>${orderNumber ? `Order <strong>${esc(orderNumber)}</strong>` : 'Your order'} · status: <code>${esc(status || 'paid')}</code></p>
<p class="muted">A confirmation email arrives from Stripe. Tracking details will follow when the parcel ships.</p>
<p style="margin-top:24px"><a class="btn" href="/collections/new">Continue shopping</a></p>
<script>try{localStorage.removeItem('mm_cart');window.dispatchEvent(new Event('mm-cart'))}catch(e){}</script>`;
  return htmlPage('Order confirmed', body);
}
