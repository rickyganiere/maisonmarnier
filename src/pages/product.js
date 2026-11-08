import { esc } from '../lib/escape.js';
import { htmlPage, productCard } from '../lib/html.js';
import { getLiveProductBySlug, getLiveProducts } from '../db/products.js';

export async function productPage(url, env) {
  try {
    const slug = decodeURIComponent(url.pathname.split('/').filter(Boolean)[1] || '');
    const p = await getLiveProductBySlug(env, slug);
    if (!p) {
      return htmlPage(
        'Product not found',
        `<div class="head"><h1>Product not found</h1></div>
         <p class="empty">This piece is no longer available. <a href="/collections/new">See new arrivals →</a></p>`,
        { status: 404 },
      );
    }

    const compare =
      Number(p.compare_at_price_eur) > Number(p.retail_price_eur)
        ? `<div class="muted" style="text-decoration:line-through">€${Number(p.compare_at_price_eur).toFixed(2)}</div>`
        : '';
    const stock = Number(p.stock || 0);
    const stockHint =
      stock <= 0
        ? '<p class="muted">Currently unavailable.</p>'
        : stock <= 5
          ? `<p class="muted">Only ${stock} left in supplier stock.</p>`
          : `<p class="muted">In stock · ships from partner warehouse.</p>`;

    const relatedAll = await getLiveProducts(env, 40);
    const related = relatedAll
      .filter((r) => r.slug !== p.slug)
      .filter((r) => {
        if (!p.category) return true;
        const a = (r.category || '').toLowerCase();
        const b = (p.category || '').toLowerCase();
        return a && b && (a.includes(b) || b.includes(a) || a === b);
      })
      .slice(0, 4);
    const relatedHtml = related.length
      ? `<section class="related"><h2>You may also like</h2><div class="grid">${related.map(productCard).join('')}</div></section>`
      : '';

    const canBuy = stock > 0 && Number(p.retail_price_eur) > 0;
    const body = `<div class="product">
      <img src="${esc(p.image_url || '')}" alt="${esc(p.name || '')}">
      <div>
        <div class="muted" style="letter-spacing:.08em;text-transform:uppercase;font-size:11px">${esc(p.category || 'Maison Marnier')}</div>
        <h1>${esc(p.name || '')}</h1>
        <div style="font:400 22px Georgia,serif">€${Number(p.retail_price_eur || 0).toFixed(2)}</div>
        ${compare}
        ${stockHint}
        <div class="desc"><p>${esc(p.description || 'Thoughtfully selected for Maison Marnier.')}</p></div>
        ${
          canBuy
            ? `<button class="btn" type="button" id="addCart"
                data-id="${p.id}"
                data-slug="${esc(p.slug || '')}"
                data-name="${esc(p.name || '')}"
                data-price="${Number(p.retail_price_eur || 0)}"
                data-image="${esc(p.image_url || '')}">Add to cart</button>
               <p class="muted" style="margin-top:10px" id="addMsg"></p>`
            : `<button class="btn is-disabled" type="button" disabled>Unavailable</button>`
        }
      </div>
    </div>${relatedHtml}
<script>
(function(){
  const btn=document.getElementById('addCart'); if(!btn)return;
  const KEY='mm_cart';
  function load(){try{return JSON.parse(localStorage.getItem(KEY)||'[]')}catch(e){return []}}
  btn.onclick=()=>{
    const item={id:Number(btn.dataset.id),slug:btn.dataset.slug,name:btn.dataset.name,price:Number(btn.dataset.price),image:btn.dataset.image,qty:1};
    const cart=load();
    const ex=cart.find(x=>x.id===item.id);
    if(ex)ex.qty=Math.min(20,(ex.qty||1)+1); else cart.push(item);
    localStorage.setItem(KEY,JSON.stringify(cart));
    window.dispatchEvent(new Event('mm-cart'));
    const m=document.getElementById('addMsg'); if(m)m.textContent='Added — <a href="/cart">view cart</a>'.replace('<a href="/cart">view cart</a>','');
    if(m){m.innerHTML='Added to cart. <a href="/cart">View cart →</a>';}
  };
})();
</script>`;

    return htmlPage(p.name, body, {
      description: String(p.description || p.name || '').slice(0, 160),
    });
  } catch {
    return htmlPage('Product', '<p class="empty">Product error.</p>', { status: 500 });
  }
}
