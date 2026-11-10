import { esc } from '../lib/escape.js';
import { htmlPage, productCard } from '../lib/html.js';
import { getLang, t, tr } from '../lib/i18n.js';
import { productImages } from '../lib/images.js';
import { productJsonLd } from '../lib/seo.js';
import { getLiveProductBySlug, getLiveProducts } from '../db/products.js';

export async function productPage(url, env, request) {
  const lang = getLang(request);
  try {
    const slug = decodeURIComponent(url.pathname.split('/').filter(Boolean)[1] || '');
    const p = await getLiveProductBySlug(env, slug);
    if (!p) {
      return htmlPage(
        tr(lang, { es: 'Producto no encontrado', en: 'Product not found' }),
        `<div class="head"><h1>${tr(lang, { es: 'Producto no encontrado', en: 'Product not found' })}</h1></div>
         <p class="empty">${tr(lang, { es: 'Esta pieza ya no está disponible.', en: 'This piece is no longer available.' })} <a href="/collections/new">${tr(lang, { es: 'Ver novedades →', en: 'See new arrivals →' })}</a></p>`,
        { status: 404, request, path: url.pathname, lang },
      );
    }

    const retail = Number(p.retail_price_eur || 0);
    const compareAt = Number(p.compare_at_price_eur || 0);
    const onSale = compareAt > retail && retail > 0;
    const savePct = onSale ? Math.round(((compareAt - retail) / compareAt) * 100) : 0;
    const priceBlock = `<div class="price-block">
      <span class="price-now">€${retail.toFixed(2)}</span>
      ${onSale ? `<span class="price-was">€${compareAt.toFixed(2)}</span><span class="save">Ahorra ${savePct}%</span>` : ''}
    </div>`;

    const stock = Number(p.stock || 0);
    const stockHint =
      stock <= 0
        ? '<p class="stock-line">No disponible en este momento.</p>'
        : stock <= 5
          ? `<p class="stock-line">Stock limitado · solo quedan ${stock} en el almacén asociado.</p>`
          : `<p class="stock-line">En stock · envío desde almacén asociado.</p>`;

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
             <h2>También te puede gustar</h2>
             <a class="view-all" href="${collectionHref}">Ver colección →</a>
           </div>
           <div class="grid">${relatedFallback.map((r)=>productCard(r, lang)).join('')}</div>
         </section>`
      : '';

    const canBuy = stock > 0 && retail > 0;
    const images = productImages(p);
    const mainImage = images[0] || '';
    const thumbs =
      images.length > 1
        ? `<div class="product-thumbs" id="galleryThumbs" role="tablist" aria-label="Imágenes del producto">
            ${images
              .map(
                (src, i) =>
                  `<button type="button" class="${i === 0 ? 'is-active' : ''}" data-src="${esc(src)}" aria-label="Imagen ${i + 1}">
                    <img src="${esc(src)}" alt="" loading="lazy">
                  </button>`,
              )
              .join('')}
          </div>`
        : '';
    const body = `<nav class="crumbs" aria-label="${t(lang, 'crumbs_aria')}">
        <a href="/">${t(lang, 'home')}</a><span class="sep">/</span>
        <a href="${collectionHref}">${esc(p.category || 'Tienda')}</a><span class="sep">/</span>
        <span>${esc(p.name || '')}</span>
      </nav>
      <div class="product">
      <div class="product-gallery">
        <div class="frame"><img id="galleryMain" src="${esc(mainImage)}" alt="${esc(p.name || '')}"></div>
        ${thumbs}
      </div>
      <div class="product-buy">
        <div class="buy-panel">
          <div class="eyebrow"><a href="${collectionHref}">${esc(p.category || 'Maison Marnier')}</a></div>
          <h1>${esc(p.name || '')}</h1>
          ${priceBlock}
          ${stockHint}
          <div class="buy-actions">
          ${
            canBuy
              ? `<button class="btn" type="button" id="addCart"
                  data-id="${p.id}"
                  data-slug="${esc(p.slug || '')}"
                  data-name="${esc(p.name || '')}"
                  data-price="${retail}"
                  data-image="${esc(mainImage)}">${tr(lang, { es: 'Añadir al carrito', en: 'Add to cart' })}</button>
                 <button class="wish-btn" type="button" id="wishBtn" data-id="${p.id}">♡ ${tr(lang, { es: 'Lista de deseos', en: 'Wishlist' })}</button>
                 <a class="btn btn-ghost" href="/cart">${tr(lang, { es: 'Ver carrito', en: 'View cart' })}</a>`
              : `<button class="btn is-disabled" type="button" disabled>${tr(lang, { es: 'No disponible', en: 'Unavailable' })}</button>
                 <button class="wish-btn" type="button" id="wishBtn" data-id="${p.id}">♡ ${tr(lang, { es: 'Lista de deseos', en: 'Wishlist' })}</button>`
          }
          </div>
          <p class="muted" style="margin-top:12px" id="addMsg"></p>
          <div class="register-buy">
            <strong>${tr(lang, { es: 'Regístrate para comprar y seguir pedidos', en: 'Register to buy and track orders' })}</strong>
            <p>${tr(lang, { es: 'Con cuenta puedes guardar esta pieza, ver el estado de envío y checkout más rápido.', en: 'With an account you can save this piece, track shipping and check out faster.' })}</p>
            <a href="/cuenta/registro?next=/products/${encodeURIComponent(p.slug || '')}">${tr(lang, { es: 'Crear cuenta gratuita →', en: 'Create a free account →' })}</a>
          </div>
          <section aria-labelledby="product-details-title">
            <h2 id="product-details-title">Detalles del producto</h2>
            <div class="desc" style="margin-top:8px">${esc(p.description || 'Seleccionado con cuidado para Maison Marnier.')}</div>
          </section>
          <div class="specs">
            <div><strong>Categoría</strong>${esc(p.category || 'Decoración')}</div>
            <div><strong>Envío</strong>Europa · almacén asociado</div>
            <div><strong>Devoluciones</strong>30 días</div>
            <div><strong>Pago</strong>Stripe · IVA en el checkout</div>
          </div>
          <div class="trust">
            <span><i>✓</i> Envío gratis en pedidos superiores a 100 €</span>
            <span><i>✓</i> Pago seguro con Stripe</span>
            <span><i>✓</i> Cumplimiento con socios en Europa</span>
          </div>
        </div>
      </div>
    </div>${relatedHtml}
<script>
(function(){
  const main=document.getElementById('galleryMain');
  const thumbs=document.getElementById('galleryThumbs');
  if(main&&thumbs){
    thumbs.addEventListener('click',(e)=>{
      const btn=e.target.closest('button[data-src]');
      if(!btn)return;
      main.src=btn.dataset.src;
      thumbs.querySelectorAll('button').forEach(b=>b.classList.toggle('is-active',b===btn));
      const cartBtn=document.getElementById('addCart');
      if(cartBtn)cartBtn.dataset.image=btn.dataset.src;
    });
  }
  const btn=document.getElementById('addCart');
  const KEY='mm_cart';
  function load(){try{return JSON.parse(localStorage.getItem(KEY)||'[]')}catch(e){return []}}
  if(btn){
    btn.onclick=()=>{
      const item={id:Number(btn.dataset.id),slug:btn.dataset.slug,name:btn.dataset.name,price:Number(btn.dataset.price),image:btn.dataset.image,qty:1};
      const cart=load();
      const ex=cart.find(x=>x.id===item.id);
      if(ex)ex.qty=Math.min(20,(ex.qty||1)+1); else cart.push(item);
      localStorage.setItem(KEY,JSON.stringify(cart));
      window.dispatchEvent(new Event('mm-cart'));
      const m=document.getElementById('addMsg');
      if(m){m.innerHTML='Añadido al carrito. <a href="/cart">Ver carrito →</a>';}
      if(typeof toast==='function') toast('Añadido al carrito');
    };
  }
  const wish=document.getElementById('wishBtn');
  if(!wish)return;
  const pid=Number(wish.dataset.id);
  async function refreshWish(){
    try{
      const r=await fetch('/api/account/wishlist',{credentials:'same-origin'});
      const d=await r.json();
      if(d&&d.ok&&Array.isArray(d.items)&&d.items.some(i=>Number(i.id)===pid)){
        wish.classList.add('is-on'); wish.textContent='♥ En tu lista';
      }
    }catch(e){}
  }
  refreshWish();
  wish.onclick=async()=>{
    try{
      const me=await fetch('/api/account/me',{credentials:'same-origin'}).then(r=>r.json());
      if(!me||!me.ok){
        location.href='/cuenta/registro?next='+encodeURIComponent(location.pathname);
        return;
      }
      const on=wish.classList.contains('is-on');
      const r=await fetch('/api/account/wishlist',{
        method:on?'DELETE':'POST',
        headers:{'content-type':'application/json'},
        credentials:'same-origin',
        body:JSON.stringify({productId:pid})
      });
      const d=await r.json();
      if(!d.ok){if(typeof toast==='function')toast(d.error||'No se pudo actualizar');return}
      wish.classList.toggle('is-on',!on);
      wish.textContent=!on?'♥ En tu lista':'♡ Lista de deseos';
      if(typeof toast==='function')toast(!on?'Guardado en deseos':'Quitado de deseos');
    }catch(e){if(typeof toast==='function')toast('Error de red')}
  };
})();
</script>`;

    const productPath = `/products/${encodeURIComponent(p.slug || '')}`;
    const pForLd = { ...p, image_url: mainImage, image_urls: images };
    return htmlPage(p.name, body, {
      description: String(p.description || p.name || '').slice(0, 160),
      canonical: productPath,
      ogImage: mainImage || '',
      ogType: 'product',
      jsonLd: productJsonLd(pForLd, { url: productPath, collectionPath: collectionHref }),
      cache: 'public, max-age=0, must-revalidate',
      request,
      path: productPath,
      lang,
    });
  } catch {
    return htmlPage(tr(lang, { es: 'Producto', en: 'Product' }), `<p class="empty">${tr(lang, { es: 'Error al cargar el producto.', en: 'Product error.' })}</p>`, { status: 500, request, path: '/products' });
  }
}
