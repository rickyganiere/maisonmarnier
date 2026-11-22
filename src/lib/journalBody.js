import { esc } from './escape.js';

/**
 * Render journal body as safe HTML.
 * Supports ## headings, blank-line paragraphs, and [label](/relative-path) links.
 */
export function formatJournalBody(raw = '') {
  const text = String(raw || '').replace(/\r\n/g, '\n').trim();
  if (!text) return '';

  const blocks = text.split(/\n{2,}/);
  return blocks
    .map((block) => {
      const lines = block.split('\n').map((l) => l.trimEnd());
      const joined = lines.join('\n').trim();
      if (!joined) return '';

      if (/^##\s+/.test(joined) && !joined.includes('\n')) {
        const heading = joined.replace(/^##\s+/, '').trim();
        return `<h2>${inlineFormat(heading)}</h2>`;
      }

      const withBreaks = lines.map((line) => inlineFormat(line)).join('<br>\n');
      return `<p>${withBreaks}</p>`;
    })
    .filter(Boolean)
    .join('\n');
}

/** Escape text and turn same-origin markdown links into anchors. */
function inlineFormat(value) {
  const escaped = esc(value);
  return escaped.replace(
    /\[([^\]]+)\]\((\/[a-zA-Z0-9/_?=&%.~+-]*)\)/g,
    (_, label, href) => `<a href="${esc(href)}">${label}</a>`,
  );
}
