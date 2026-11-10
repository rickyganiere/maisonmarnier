import { esc } from '../lib/escape.js';
import { htmlPage } from '../lib/html.js';

const PAGES = {
  shipping: [
    'Envíos',
    'Maison Marnier envía a toda la Unión Europea desde almacenes asociados. Los plazos varían según la pieza y el destino.\n\nEl envío estándar cuesta 6,90 €. Los pedidos superiores a 100 € tienen envío gratuito en la UE. Te enviamos el seguimiento por correo cuando el paquete sale del almacén.',
  ],
  returns: [
    'Devoluciones',
    'Queremos que cada pieza encaje en tu hogar. Los artículos sin usar y en su estado original pueden devolverse en un plazo de 30 días desde la entrega.\n\nEscribe a hello@maisonmarnier.com con tu número de pedido para iniciar una devolución. Las piezas a medida o de temporada en liquidación pueden quedar excluidas.',
  ],
  contact: [
    'Contacto',
    '¿Dudas sobre una pieza, un pedido o una colaboración?\n\nEscríbenos a hello@maisonmarnier.com y te responderemos en un máximo de dos días laborables.\n\nPara redes y colaboraciones, encuéntranos en Instagram @maison.marnier.',
  ],
  sourcing: [
    'Selección',
    'Maison Marnier cura decoración para el hogar de proveedores seleccionados. Cada candidato se revisa por precio, stock, entrega, imágenes y cómo encaja con el resto de la edición antes de publicarse en la tienda.\n\nPreferimos materiales y formas que sigan siendo útiles más allá de una sola temporada.',
  ],
  about: [
    'Sobre Maison Marnier',
    'Maison Marnier es una edición cuidada para hogares serenos — materiales naturales, luz suave y objetos que merecen quedarse.\n\nSigue la maison en Instagram @maison.marnier para ambientaciones navideñas, novedades y fiestas tranquilas.\n\nLa maison está en Europa y publica en EUR. Los pagos se procesan de forma segura con Stripe.',
  ],
  privacidad: [
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
  cookies: [
    'Política de cookies',
    `Última actualización: noviembre de 2026.

1. Qué son las cookies
Las cookies son pequeños archivos que el sitio guarda en tu dispositivo para recordar preferencias, mantener la sesión o medir el uso.

2. Cookies que utilizamos
• Esenciales: sesión de cuenta (mm_session), carrito local (mm_cart), lista de deseos local de respaldo (mm_wishlist) y preferencia de consentimiento (mm_cookie_consent). Son necesarias para el funcionamiento de la tienda.
• Analítica / marketing (opcionales): Google Tag Manager y etiquetas asociadas, solo si aceptas cookies no esenciales.

3. Base legal
Las cookies esenciales se basan en nuestro interés legítimo / necesidad contractual. Las no esenciales requieren tu consentimiento, que puedes dar o retirar en el banner de cookies.

4. Cómo gestionarlas
Puedes cambiar tu elección borrando la cookie mm_cookie_consent y recargando la página, o desde la configuración de tu navegador. Bloquear cookies esenciales puede impedir el inicio de sesión o el carrito.

5. Más información
Consulta también nuestra Política de privacidad (/privacidad) o escribe a hello@maisonmarnier.com.`,
  ],
  terminos: [
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
};

export function infoPage(path) {
  const key = path.replace(/^\//, '');
  const [title, body] = PAGES[key] || PAGES.about;
  const description = String(body).split('\n\n')[0].slice(0, 160);
  return htmlPage(
    title,
    `<nav class="crumbs" aria-label="Miga de pan"><a href="/">Inicio</a><span class="sep">/</span><span>${esc(title)}</span></nav>
     <div class="head"><h1>${esc(title)}</h1></div>
     <div class="buy-panel" style="max-width:720px"><div class="desc" style="margin:0">${esc(body)}</div></div>`,
    {
      description,
      canonical: `/${key}`,
      cache: 'public, max-age=3600',
    },
  );
}
