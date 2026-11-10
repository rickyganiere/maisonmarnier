import { esc } from '../lib/escape.js';
import { htmlPage } from '../lib/html.js';
import { getLang, t } from '../lib/i18n.js';

const PAGES = {
  shipping: {
    es: [
      'Envíos',
      'Maison Marnier envía a toda la Unión Europea desde almacenes asociados. Los plazos varían según la pieza y el destino.\n\nEl envío estándar cuesta 6,90 €. Los pedidos superiores a 100 € tienen envío gratuito en la UE. Te enviamos el seguimiento por correo cuando el paquete sale del almacén.',
    ],
    en: [
      'Shipping',
      'Maison Marnier ships across the European Union from partner warehouses. Delivery windows vary by piece and destination.\n\nStandard shipping is €6.90. Orders over €100 ship free within the EU. Tracking details are emailed when your parcel leaves the warehouse.',
    ],
  },
  returns: {
    es: [
      'Devoluciones',
      'Queremos que cada pieza encaje en tu hogar. Los artículos sin usar y en su estado original pueden devolverse en un plazo de 30 días desde la entrega.\n\nEscribe a hello@maisonmarnier.com con tu número de pedido para iniciar una devolución. Las piezas a medida o de temporada en liquidación pueden quedar excluidas.',
    ],
    en: [
      'Returns',
      'We want every piece to feel right at home. Unused items in original condition may be returned within 30 days of delivery.\n\nContact hello@maisonmarnier.com with your order number to start a return. Custom or final-sale seasonal pieces may be excluded.',
    ],
  },
  contact: {
    es: [
      'Contacto',
      '¿Dudas sobre una pieza, un pedido o una colaboración?\n\nEscríbenos a hello@maisonmarnier.com y te responderemos en un máximo de dos días laborables.\n\nPara redes y colaboraciones, encuéntranos en Instagram @maison.marnier y en Facebook.',
    ],
    en: [
      'Contact',
      'Questions about a piece, an order, or collaboration?\n\nEmail hello@maisonmarnier.com and we will reply within two business days.\n\nFor social and collabs, find us on Instagram @maison.marnier and on Facebook.',
    ],
  },
  sourcing: {
    es: [
      'Selección',
      'Maison Marnier cura decoración para el hogar de proveedores seleccionados. Cada candidato se revisa por precio, stock, entrega, imágenes y cómo encaja con el resto de la edición antes de publicarse en la tienda.\n\nPreferimos materiales y formas que sigan siendo útiles más allá de una sola temporada.',
    ],
    en: [
      'Sourcing',
      'Maison Marnier curates home decor from selected suppliers. Every candidate is reviewed for price, stock, delivery, imagery and how it sits with the rest of the edit before it is published to the storefront.\n\nWe favour materials and forms that stay useful beyond a single season.',
    ],
  },
  about: {
    es: [
      'Sobre Maison Marnier',
      'Maison Marnier es una edición cuidada para hogares serenos — materiales naturales, luz suave y objetos que merecen quedarse.\n\nSigue la maison en Instagram @maison.marnier y en Facebook para ambientaciones navideñas, novedades y fiestas tranquilas.\n\nLa maison está en Europa y publica en EUR. Los pagos se procesan de forma segura con Stripe.',
    ],
    en: [
      'About Maison Marnier',
      'Maison Marnier is a curated home edit for calm, considered everyday spaces — natural materials, soft light, and objects worth keeping.\n\nFollow the maison on Instagram @maison.marnier and on Facebook for holiday rooms, new pieces, and quiet fêtes.\n\nThe maison is based in Europe and publishes in EUR. Payments are processed securely by Stripe.',
    ],
  },
  privacidad: {
    es: [
      'Política de privacidad',
      `Última actualización: noviembre de 2026.

1. Responsable
Maison Marnier (maisonmarnier.com) es responsable del tratamiento de los datos personales que nos facilitas al crear una cuenta, comprar, contactar o navegar por el sitio.

2. Datos que tratamos
• Datos de cuenta: nombre, correo electrónico y contraseña cifrada.
• Datos de pedido y envío: dirección, teléfono e historial de compra (a través de Stripe y nuestros socios logísticos).
• Datos técnicos: cookies esenciales, preferencias de consentimiento y métricas agregadas de uso (p. ej. Google Tag Manager / Analytics cuando lo aceptas).
• Lista de deseos asociada a tu cuenta.

3. Finalidades y bases legales
• Ejecutar el contrato de compraventa y gestionar tu cuenta (art. 6.1.b RGPD).
• Cumplir obligaciones legales fiscales y de facturación (art. 6.1.c).
• Interés legítimo en seguridad, prevención de fraude y mejora del sitio (art. 6.1.f).
• Consentimiento para cookies no esenciales y comunicaciones comerciales opcionales (art. 6.1.a).

4. Conservación
Conservamos los datos de cuenta mientras la mantengas activa y los de pedidos el tiempo exigido por la normativa mercantil y fiscal. Puedes solicitar el cierre de cuenta escribiendo a hello@maisonmarnier.com.

5. Encargados y transferencias
Usamos proveedores que actúan como encargados o corresponsables: Cloudflare (hosting), Stripe (pagos), socios de fulfillment y, si das tu consentimiento, herramientas de medición. Cuando haya transferencias fuera del EEE, se aplican cláusulas contractuales tipo u otras garantías adecuadas.

6. Tus derechos
Puedes ejercer acceso, rectificación, supresión, limitación, oposición y portabilidad en hello@maisonmarnier.com. También puedes reclamar ante la autoridad de protección de datos de tu país.

7. Menores
El sitio no está dirigido a menores de 16 años.

8. Contacto
hello@maisonmarnier.com`,
    ],
    en: [
      'Privacy policy',
      `Last updated: November 2026.

1. Controller
Maison Marnier (maisonmarnier.com) is the controller of personal data you provide when creating an account, buying, contacting us or browsing the site.

2. Data we process
• Account data: name, email and hashed password.
• Order and shipping data: address, phone and purchase history (via Stripe and logistics partners).
• Technical data: essential cookies, consent preferences and aggregated usage metrics (e.g. Google Tag Manager / Analytics when accepted).
• Wishlist linked to your account.

3. Purposes and legal bases
• Perform the sales contract and manage your account (GDPR art. 6.1.b).
• Meet legal tax and invoicing duties (art. 6.1.c).
• Legitimate interest in security, fraud prevention and site improvement (art. 6.1.f).
• Consent for non-essential cookies and optional marketing (art. 6.1.a).

4. Retention
We keep account data while your account stays active and order data for the period required by commercial and tax law. You may request account closure at hello@maisonmarnier.com.

5. Processors and transfers
We use processors/joint controllers including Cloudflare (hosting), Stripe (payments), fulfilment partners and, with consent, measurement tools. Where transfers leave the EEA, Standard Contractual Clauses or equivalent safeguards apply.

6. Your rights
You may exercise access, rectification, erasure, restriction, objection and portability at hello@maisonmarnier.com, and complain to your local data-protection authority.

7. Minors
The site is not directed at under-16s.

8. Contact
hello@maisonmarnier.com`,
    ],
  },
  cookies: {
    es: [
      'Política de cookies',
      `Última actualización: noviembre de 2026.

1. Qué son las cookies
Las cookies son pequeños archivos que el sitio guarda en tu dispositivo para recordar preferencias, mantener la sesión o medir el uso.

2. Cookies que utilizamos
• Esenciales: sesión de cuenta (mm_session), idioma (mm_lang), carrito local (mm_cart), lista de deseos local de respaldo (mm_wishlist) y preferencia de consentimiento (mm_cookie_consent). Son necesarias para el funcionamiento de la tienda.
• Analítica / marketing (opcionales): Google Tag Manager y etiquetas asociadas, solo si aceptas cookies no esenciales.

3. Base legal
Las cookies esenciales se basan en nuestro interés legítimo / necesidad contractual. Las no esenciales requieren tu consentimiento, que puedes dar o retirar en el banner de cookies.

4. Cómo gestionarlas
Puedes cambiar tu elección borrando la cookie mm_cookie_consent y recargando la página, o desde la configuración de tu navegador. Bloquear cookies esenciales puede impedir el inicio de sesión o el carrito.

5. Más información
Consulta también nuestra Política de privacidad (/privacidad) o escribe a hello@maisonmarnier.com.`,
    ],
    en: [
      'Cookie policy',
      `Last updated: November 2026.

1. What cookies are
Cookies are small files the site stores on your device to remember preferences, keep your session or measure usage.

2. Cookies we use
• Essential: account session (mm_session), language (mm_lang), local cart (mm_cart), local wishlist backup (mm_wishlist) and consent preference (mm_cookie_consent). Required for the store to work.
• Analytics / marketing (optional): Google Tag Manager and related tags, only if you accept non-essential cookies.

3. Legal basis
Essential cookies rely on legitimate interest / contractual necessity. Non-essential cookies need your consent via the cookie banner.

4. How to manage them
Change your choice by clearing mm_cookie_consent and reloading, or via browser settings. Blocking essential cookies may break login or the cart.

5. More information
See also our Privacy policy (/privacidad) or email hello@maisonmarnier.com.`,
    ],
  },
  terminos: {
    es: [
      'Términos y condiciones',
      `Última actualización: noviembre de 2026.

1. Ámbito
Estos términos regulan el uso de maisonmarnier.com y la compra de productos ofrecidos por Maison Marnier a consumidores en la Unión Europea.

2. Cuenta
Puedes comprar como invitado o creando una cuenta. Eres responsable de la confidencialidad de tu contraseña y de la exactitud de tus datos. Nos reservamos el derecho de suspender cuentas ante uso abusivo o fraude.

3. Productos y precios
Los precios se muestran en euros (EUR) e impuestos se calculan en el pago (Stripe Tax) según tu dirección. Las imágenes son orientativas; puede haber ligeras variaciones de color o acabado.

4. Pedidos y pago
Al confirmar el checkout con Stripe formalizas el pedido sujeto a disponibilidad. El pago se procesa de forma segura por Stripe. Recibirás confirmación por correo.

5. Envíos y riesgo
Enviamos dentro de la UE desde almacenes asociados. Plazos orientativos; el riesgo se transmite según la normativa de consumo aplicable. El envío estándar es 6,90 €; gratuito a partir de 100 € en la UE.

6. Derecho de desistimiento y devoluciones
Dispone de 14 días naturales para desistir en compras a distancia, sin perjuicio de nuestra política comercial de 30 días para artículos no usados en estado original (ver /returns). Algunas piezas de temporada o personalizadas pueden quedar excluidas cuando la ley lo permita.

7. Lista de deseos
La lista de deseos no garantiza stock ni precio. Es una herramienta personal vinculada a tu cuenta.

8. Propiedad intelectual
Marcas, textos, diseños y contenidos del sitio pertenecen a Maison Marnier o a sus licenciantes. Queda prohibida su reproducción no autorizada.

9. Limitación
En la medida permitida por la ley, no respondemos de daños indirectos derivados del uso del sitio. Nada en estos términos limita derechos imperativos del consumidor.

10. Ley aplicable
Se aplica la legislación del Estado miembro de residencia habitual del consumidor cuando así lo exija la normativa europea, sin perjuicio de disposiciones imperativas más favorables.

11. Contacto
hello@maisonmarnier.com`,
    ],
    en: [
      'Terms and conditions',
      `Last updated: November 2026.

1. Scope
These terms govern use of maisonmarnier.com and purchases from Maison Marnier by consumers in the European Union.

2. Account
You may buy as a guest or create an account. You are responsible for password confidentiality and accurate details. We may suspend accounts for abuse or fraud.

3. Products and prices
Prices are shown in euros (EUR); tax is calculated at payment (Stripe Tax) from your address. Images are indicative; slight colour or finish variations may occur.

4. Orders and payment
Confirming Stripe checkout places the order subject to availability. Payment is processed securely by Stripe. You will receive email confirmation.

5. Shipping and risk
We ship within the EU from partner warehouses. Timelines are indicative; risk passes under applicable consumer law. Standard shipping is €6.90; free from €100 in the EU.

6. Withdrawal and returns
You have 14 calendar days to withdraw from distance purchases, without prejudice to our 30-day commercial returns policy for unused items in original condition (see /returns). Some seasonal or custom pieces may be excluded where the law allows.

7. Wishlist
The wishlist does not guarantee stock or price. It is a personal tool linked to your account.

8. Intellectual property
Marks, text, designs and site content belong to Maison Marnier or its licensors. Unauthorised reproduction is prohibited.

9. Limitation
To the extent permitted by law, we are not liable for indirect damages from site use. Nothing limits mandatory consumer rights.

10. Governing law
The law of the consumer’s habitual residence applies when required by EU rules, without prejudice to more favourable mandatory provisions.

11. Contact
hello@maisonmarnier.com`,
    ],
  },
};

export function infoPage(path, request) {
  const lang = getLang(request);
  const key = path.replace(/^\//, '');
  const entry = PAGES[key] || PAGES.about;
  const [title, body] = entry[lang] || entry.es || entry.en;
  const description = String(body).split('\n\n')[0].slice(0, 160);
  return htmlPage(
    title,
    `<nav class="crumbs" aria-label="${t(lang, 'crumbs_aria')}"><a href="/">${t(lang, 'home')}</a><span class="sep">/</span><span>${esc(title)}</span></nav>
     <div class="head"><h1>${esc(title)}</h1></div>
     <div class="buy-panel" style="max-width:720px"><div class="desc" style="margin:0">${esc(body)}</div></div>`,
    {
      description,
      canonical: `/${key}`,
      cache: 'private, no-cache',
      request,
      path: `/${key}`,
      lang,
    },
  );
}
