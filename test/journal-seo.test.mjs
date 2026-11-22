import assert from 'node:assert/strict';
import test from 'node:test';
import { formatJournalBody } from '../src/lib/journalBody.js';
import { blogPostingJsonLd } from '../src/lib/seo.js';
import { COLLECTION_RULES } from '../src/pages/collection.js';
import seed from '../scripts/seasonal-journal-seed.json' with { type: 'json' };

test('formatJournalBody renders headings, paragraphs, and safe relative links', () => {
  const html = formatJournalBody(
    'Intro line.\n\n## Heading here\n\nSee the [edición Navidad](/collections/seasonal) and a [PDP](/products/creative-lighted-robin-christmas-wreath).\n\nIgnore [evil](https://evil.example/x).',
  );
  assert.match(html, /<p>Intro line\.<\/p>/);
  assert.match(html, /<h2>Heading here<\/h2>/);
  assert.match(html, /href="\/collections\/seasonal"/);
  assert.match(html, /href="\/products\/creative-lighted-robin-christmas-wreath"/);
  assert.match(html, /\[evil\]\(https:\/\/evil\.example\/x\)/);
  assert.doesNotMatch(html, /href="https:\/\/evil/);
});

test('blogPostingJsonLd emits BlogPosting + BreadcrumbList', () => {
  const [posting, crumbs] = blogPostingJsonLd({
    title: 'Cómo vestir la mesa en Navidad sin ruido visual',
    description: 'Una mesa festiva con menos piezas.',
    url: '/journal/mesa-navidad-sin-ruido-visual',
    image: '/images/christmas-table.webp',
    datePublished: '2026-11-22 10:00:00',
  });
  assert.equal(posting['@type'], 'BlogPosting');
  assert.equal(posting.inLanguage, 'es');
  assert.match(posting.url, /\/journal\/mesa-navidad-sin-ruido-visual$/);
  assert.equal(posting.image[0], 'https://maisonmarnier.com/images/christmas-table.webp');
  assert.equal(posting.datePublished, '2026-11-22T10:00:00Z');
  assert.equal(crumbs['@type'], 'BreadcrumbList');
  assert.equal(crumbs.itemListElement.length, 3);
});

test('seasonal journal seed has 4–6 ES pieces with seasonal + product links', () => {
  assert.ok(seed.length >= 4 && seed.length <= 6);
  for (const article of seed) {
    assert.ok(article.slug);
    assert.ok(article.title);
    assert.ok(article.excerpt.length <= 200);
    assert.ok(article.body.length > 400);
    assert.match(article.body, /\/collections\/seasonal/);
    assert.match(article.body, /\/products\//);
    assert.match(article.image_url, /^\/images\//);
    assert.match(article.body, /^## /m);
  }
});

test('seasonal hub journal links include new seasonal pieces', () => {
  const paths = COLLECTION_RULES.seasonal.journalLinks.map((l) => l.path);
  assert.ok(paths.includes('/journal/mesa-navidad-sin-ruido-visual'));
  assert.ok(paths.includes('/journal/luces-calidas-salones-pequenos'));
  assert.ok(paths.includes('/journal/guia-adornos-menos-piezas'));
});
