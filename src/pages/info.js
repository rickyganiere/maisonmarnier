import { esc } from '../lib/escape.js';
import { htmlPage } from '../lib/html.js';

const PAGES = {
  shipping: [
    'Shipping',
    'Maison Marnier ships across the European Union from partner warehouses. Delivery windows vary by piece and destination.\n\nStandard shipping is €6.90. Orders over €100 ship free within the EU. Tracking details are emailed when your parcel leaves the warehouse.',
  ],
  returns: [
    'Returns',
    'We want every piece to feel right at home. Unused items in original condition may be returned within 30 days of delivery.\n\nContact hello@maisonmarnier.com with your order number to start a return. Custom or final-sale seasonal pieces may be excluded.',
  ],
  contact: [
    'Contact',
    'Questions about a piece, an order, or collaboration?\n\nEmail hello@maisonmarnier.com and we will reply within two business days.',
  ],
  sourcing: [
    'Sourcing',
    'Maison Marnier curates home decor from selected suppliers. Every candidate is reviewed for price, stock, delivery, imagery and how it sits with the rest of the edit before it is published to the storefront.\n\nWe favour materials and forms that stay useful beyond a single season.',
  ],
  about: [
    'About Maison Marnier',
    'Maison Marnier is a curated home edit for calm, considered everyday spaces — natural materials, soft light, and objects worth keeping.\n\nThe maison is based in Europe and publishes in EUR. Payments are processed securely by Stripe.',
  ],
};

export function infoPage(path) {
  const key = path.replace(/^\//, '');
  const [title, body] = PAGES[key] || PAGES.about;
  const description = String(body).split('\n\n')[0].slice(0, 160);
  return htmlPage(
    title,
    `<nav class="crumbs" aria-label="Breadcrumb"><a href="/">Home</a><span class="sep">/</span><span>${esc(title)}</span></nav>
     <div class="head"><h1>${esc(title)}</h1></div>
     <div class="buy-panel" style="max-width:720px"><div class="desc" style="margin:0">${esc(body)}</div></div>`,
    {
      description,
      canonical: `/${key}`,
      cache: 'public, max-age=3600',
    },
  );
}
