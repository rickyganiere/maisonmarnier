/** Link-in-bio hub for Instagram → maisonmarnier.com/instagram */
import { brandLogoHtml, htmlPage } from '../lib/html.js';
import { getLang } from '../lib/i18n.js';
import {
  FACEBOOK_URL,
  INSTAGRAM_URL,
  facebookLogoSvg,
  instagramLogoSvg,
} from '../lib/social.js';

const PAGE_CSS = `
.ig-hub{max-width:420px;margin:0 auto;padding:28px 0 48px;text-align:center}
.ig-hero{padding:12px 0 28px}
.ig-hero .brand-mark-img{margin:0 auto 18px}
.ig-hero h1{margin:0;font:900 clamp(1.55rem,4.2vw,1.9rem)/1.05 var(--font);letter-spacing:-.035em;color:#fff}
.ig-hero p{margin:12px auto 0;max-width:32ch;color:var(--muted);font:500 14px/1.5 var(--font)}
.ig-links{display:grid;gap:10px;margin:0;padding:0;list-style:none}
.ig-links a{display:block;padding:16px 18px;border:1px solid var(--line);border-radius:8px;background:
  linear-gradient(135deg, rgba(31,61,50,.28), transparent 55%),
  var(--panel);
  font:800 13px/1.2 var(--font);letter-spacing:.06em;text-transform:uppercase;color:#fff;
  transition:border-color .2s,background .2s,transform .2s}
.ig-links a:hover{border-color:var(--accent);background:rgba(201,164,106,.1);transform:translateY(-1px)}
.ig-links a.ig-primary{border-color:var(--accent);background:linear-gradient(90deg,rgba(201,164,106,.18),rgba(154,36,48,.12))}
.ig-links a.ig-external{display:flex;align-items:center;justify-content:center;gap:10px;font-size:12px;letter-spacing:.08em;color:var(--soft);background:transparent}
.ig-links a.ig-external .social-logo{flex:0 0 auto;border-radius:6px}
.ig-note{margin:22px 0 0;color:var(--muted);font:600 12px/1.45 var(--font)}
`;

const LINKS = [
  { href: '/collections/seasonal', label: 'Comprar Navidad', primary: true },
  { href: '/collections/new', label: 'Novedades' },
  { href: '/cuenta/registro', label: 'Crear cuenta' },
  { href: '/journal', label: 'Diario' },
  { href: '/contact', label: 'Contacto' },
  { href: '/', label: 'Sitio completo' },
];

export function instagramPage(request) {
  const lang = getLang(request);
  const linksHtml = LINKS.map((l) => {
    const cls = l.primary ? ' class="ig-primary"' : '';
    return `<li><a${cls} href="${l.href}">${l.label}</a></li>`;
  }).join('');

  const body = `<style>${PAGE_CSS}</style>
<section class="ig-hub">
  <div class="ig-hero">
    ${brandLogoHtml({ light: true })}
    <h1>Maison Marnier</h1>
    <p>Edición hogar de Navidad para habitaciones cálidas y serenas — ornamentos, luz y objetos que merecen quedarse.</p>
  </div>
  <ul class="ig-links">
    ${linksHtml}
    <li><a class="ig-external" href="${INSTAGRAM_URL}" target="_blank" rel="noopener noreferrer">${instagramLogoSvg({ size: 20 })}<span>@maison.marnier en Instagram</span></a></li>
    <li><a class="ig-external" href="${FACEBOOK_URL}" target="_blank" rel="noopener noreferrer">${facebookLogoSvg({ size: 20 })}<span>Maison Marnier en Facebook</span></a></li>
  </ul>
  <p class="ig-note">Europa · EUR · Envío gratis desde 100 €</p>
</section>`;

  return htmlPage('Instagram', body, {
    description:
      'Maison Marnier en Instagram — compra la edición hogar de Navidad, novedades, diario y contacto.',
    canonical: '/instagram',
    cache: 'public, max-age=3600',
    request,
    path: '/instagram',
    lang,
  });
}
