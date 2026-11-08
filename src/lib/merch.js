/** Light merchandising helpers for CJ → Maison titles/categories/pricing. */

export function cleanProductName(name) {
  let n = String(name || '').replace(/\s+/g, ' ').trim();
  if (!n) return '';
  // Drop trailing marketing clauses after long dashes/commas when first clause is enough
  const dash = n.split(/\s+[–—-]\s+/);
  if (dash[0] && dash[0].length >= 16 && dash[0].length <= 72) n = dash[0];
  const parts = n.split(',');
  if (parts[0] && parts[0].length >= 16 && parts[0].length <= 72) n = parts[0].trim();
  if (n.length > 68) n = n.slice(0, 65).replace(/\s+\S*$/, '') + '…';
  return n;
}

export function mapMaisonCategory(name, category) {
  const t = `${name || ''} ${category || ''}`.toLowerCase();
  if (/candle|candlestick|diffuser|fragrance/.test(t)) return 'Candles';
  if (/pillow|cushion|throw|textile|blanket|linen/.test(t)) return 'Textiles';
  if (/lamp|light|lantern|projector|led|neon/.test(t) && !/candle/.test(t)) return 'Lighting';
  if (/wall|tapestry|mirror|frame|sticker|decal|dreamcatcher|hanging|poster/.test(t)) return 'Wall Decor';
  if (/christmas|santa|xmas|garland|stocking|snow|holiday|seasonal|ornament/.test(t)) return 'Seasonal';
  if (/table|chair|shelf|stool|cabinet|furniture/.test(t)) return 'Furniture';
  if (/vase|statue|ornament|sculpture|tray|object|decor|sign|letter|whale/.test(t)) return 'Objects';
  return 'Decor';
}

/**
 * Market retail EUR from supplier USD cost.
 * Maison home decor target: ~3.0× cost with .95 endings (band ~2.5–3.5×).
 * Soft floor keeps tiny SKUs shoppable without the old flat €19.95 floor.
 */
export function suggestedRetailEur(costUSD) {
  const c = Number(costUSD) || 0;
  if (!(c > 0)) return 0;
  const raw = Math.max(c * 3, 9.95);
  return Math.max(9.95, Math.ceil(raw) - 0.05);
}

/** Compare-at ~1.28× retail, rounded to .05 for clean merchandising. */
export function suggestedCompareEur(retail) {
  const r = Number(retail) || 0;
  if (!(r > 0)) return null;
  return Math.round(r * 1.28 * 20) / 20;
}
