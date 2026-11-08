import { esc } from '../lib/escape.js';
import { htmlPage, productCard } from '../lib/html.js';
import { productJsonLd } from '../lib/seo.js';
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

    const retail = Number(p.retail_price_eur || 0);
    const compareAt = Number(p.compare_at_price_eur || 0);
    const onSale = compareAt > retail && retail > 0;
    const savePct = onSale ? Math.round(((compareAt - retail) / compareAt) * 100) : 0;
    const priceBlock = `<div class="price-block">
      <span class="price-now">€${retail.toFixed(2)}</span>
      ${onSale ? `<span class="price-was">€${compareAt.toFixed(2)}</span><span class="save">Save ${savePct}%</span>` : ''}
    </div>`;

    const stock = Number(p.stock || 0);
    const stockHint =
      stock <= 0
        ? '<p class="stock-line">Currently unavailable.</p>'
        : stock <= 5
          ? `<p class="stock-line">Limited stock · only ${stock} remaining with our partner warehouse.</p>`
          : `<p class="stock-line">In stock · ships from partner warehouse.</p>`;

    const relatedAll = await getLiveProducts(env, 48);
    const related = relatedAll
      .filter((r) => r.slug !== p.slug)
      .filter((r) => {
        if (!p.category) return true;
        const a = (r.category || '').toLowerCase();
        const b = (p.category || '').toLowerCase();
        return a && b && a === b;
      })
      .slice(0, 5);
    const relatedFallback =
      related.length >= 5
        ? related
        : [
            ...related,
            ...relatedAll.filter((r) => r.slug !== p.slug && !related.some((x) => x.slug === r.slug)),
          ].slice(0, 5);
    const collectionHref = p.category
      ? `/collections/${encodeURIComponent(String(p.category).toLowerCase().replace(/\s+/g, '-'))}`
      : '/collections/new';
    const relatedHtml = relatedFallback.length
      ? `<section class="related">
           <div class="related-head">
             <h2>You may also like</h2>
             <a class="view-all" href="${collectionHref}">View collection →</a>
           </div>
           <div class="grid">${relatedFallback.map(productCard).join('')}</div>
         </section>`
      : '';

    const canBuy = stock > 0 && retail > 0;
    const body = `<nav class="crumbs" aria-label="Breadcrumb">
        <a href="/">Home</a><span class="sep">/</span>
        <a href="${collectionHref}">${esc(p.category || 'Shop')}</a><span class="sep">/</span>
        <span>${esc(p.name || '')}</span>
      </nav>
      <div class="product">
      <div class="product-gallery">
        <div class="frame"><img src="${esc(p.image_url || '')}" alt="${esc(p.name || '')}"></div>
      </div>
      <div class="product-buy">
        <div class="buy-panel">
          <div class="eyebrow"><a href="${collectionHref}">${esc(p.category || 'Maison Marnier')}</a></div>
          <h1>${esc(p.name || '')}</h1>
          ${priceBlock}
          ${stockHint}
          <div class="desc">${esc(p.description || 'Thoughtfully selected for Maison Marnier.')}</div>
          <div class="buy-actions">
          ${
            canBuy
              ? `<button class="btn" type="button" id="addCart"
                  data-id="${p.id}"
                  data-slug="${esc(p.slug || '')}"
                  data-name="${esc(p.name || '')}"
                  data-price="${retail}"
                  data-image="${esc(p.image_url || '')}">Add to cart</button>
                 <a class="btn btn-ghost" href="/cart">View cart</a>`
              : `<button class="btn is-disabled" type="button" disabled>Unavailable</button>`
          }
          </div>
          <p class="muted" style="margin-top:12px" id="addMsg"></p>
          <div class="specs">
            <div><strong>Category</strong>${esc(p.category || 'Decor')}</div>
            <div><strong>Shipping</strong>Europe · partner warehouse</div>
            <div><strong>Returns</strong>30-day returns</div>
            <div><strong>Checkout</strong>Stripe · VAT at payment</div>
          </div>
          <div class="trust">
            <span><i>✓</i> Free shipping on orders over €100</span>
            <span><i>✓</i> Secure Stripe checkout</span>
            <span><i>✓</i> Partner fulfilment across Europe</span>
          </div>
        </div>
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
    const m=document.getElementById('addMsg');
    if(m){m.innerHTML='Added to cart. <a href="/cart">View cart →</a>';}
    if(typeof toast==='function') toast('Added to cart');
  };
})();
</script>`;

    const productPath = `/products/${encodeURIComponent(p.slug || '')}`;
    return htmlPage(p.name, body, {
      description: String(p.description || p.name || '').slice(0, 160),
      canonical: productPath,
      ogImage: p.image_url || '',
      ogType: 'product',
      jsonLd: productJsonLd(p, { url: productPath, collectionPath: collectionHref }),
      cache: 'public, max-age=300',
    });
  } catch {
    return htmlPage('Product', '<p class="empty">Product error.</p>', { status: 500 });
  }
}
