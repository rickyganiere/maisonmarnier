/** Serves the self-hosted Open Graph JPEG (Wrangler Data module). */
import ogJpeg from '../assets/maison-marnier-og.jpg';

/** Atmospheric Christmas OG card — type + scene, no invented emblem. */
export function brandOgImageResponse() {
  return new Response(ogJpeg, {
    headers: {
      'content-type': 'image/jpeg',
      'cache-control': 'public, max-age=604800',
      'x-content-type-options': 'nosniff',
    },
  });
}
