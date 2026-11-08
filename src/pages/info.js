import { esc } from '../lib/escape.js';
import { htmlPage } from '../lib/html.js';

const PAGES = {
  shipping: [
    'Shipping',
    'Maison Marnier ships across the European Union from partner warehouses. Delivery windows vary by piece and destination; typical partner lead times are shown on product pages when available.\n\nOrders over €100 qualify for free standard shipping once checkout is enabled. Tracking details will be emailed when an order ships.',
  ],
  returns: [
    'Returns',
    'We want every piece to feel right at home. Unused items in original condition may be returned within 30 days of delivery.\n\nReturn instructions and a prepaid label (where available) will be provided with each order confirmation once checkout launches. Custom or final-sale seasonal pieces may be excluded.',
  ],
  contact: [
    'Contact',
    'Questions about a piece, an order, or collaboration?\n\nEmail hello@maisonmarnier.com and we will reply within two business days. A contact form will appear here alongside checkout.',
  ],
  sourcing: [
    'Sourcing',
    'Maison Marnier curates home decor from selected suppliers. Every candidate is reviewed for price, stock, delivery, imagery and how it sits with the rest of the edit before it is published to the storefront.\n\nWe favour materials and forms that stay useful beyond a single season.',
  ],
  about: [
    'About Maison Marnier',
    'Maison Marnier is a curated home edit for calm, considered everyday spaces — natural materials, soft light, and objects worth keeping.\n\nThe maison is based in Europe and publishes in EUR.',
  ],
};

export function infoPage(path) {
  const key = path.replace(/^\//, '');
  const [title, body] = PAGES[key] || PAGES.about;
  return htmlPage(
    title,
    `<div class="head"><h1>${esc(title)}</h1></div><div class="desc">${esc(body)}</div>`,
  );
}
