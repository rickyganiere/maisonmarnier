/**
 * Public storefront money helpers.
 * DB + Stripe keep tax-exclusive EUR; public UI shows Spanish standard IVA (21%) included.
 */

export const VAT_RATE = 0.21;

/** Round to cents. */
export function roundEur(n) {
  return Math.round((Number(n) || 0) * 100) / 100;
}

/** Convert tax-exclusive EUR to tax-inclusive (IVA included). */
export function priceWithVat(exVat, rate = VAT_RATE) {
  const base = Number(exVat) || 0;
  if (!(base > 0)) return 0;
  return roundEur(base * (1 + Number(rate) || 0));
}

/** Format a tax-exclusive amount as a public IVA-inclusive EUR string. */
export function formatEurPublic(exVat, { withVatNote = false, lang = 'es' } = {}) {
  const incl = priceWithVat(exVat);
  if (!(incl > 0)) return '';
  const money = `€${incl.toFixed(2)}`;
  if (!withVatNote) return money;
  const note = lang === 'en' ? 'VAT incl.' : 'IVA incl.';
  return `${money} <span class="vat-note">${note}</span>`;
}

/** Format an already-inclusive amount. */
export function formatEurAmount(amount) {
  const n = roundEur(amount);
  return `€${n.toFixed(2)}`;
}
