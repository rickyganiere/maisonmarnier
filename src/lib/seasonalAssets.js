import living from '../assets/christmas-living.webp';
import table from '../assets/christmas-table.webp';
import candlelight from '../assets/christmas-candlelight.webp';

export const CHRISTMAS_SCENES = {
  living: '/images/christmas-living.webp',
  table: '/images/christmas-table.webp',
  candlelight: '/images/christmas-candlelight.webp',
};

const images = new Map([
  [CHRISTMAS_SCENES.living, living],
  [CHRISTMAS_SCENES.table, table],
  [CHRISTMAS_SCENES.candlelight, candlelight],
]);

export function seasonalImageResponse(pathname) {
  const image = images.get(pathname);
  if (!image) return null;
  return new Response(image, {
    headers: {
      'content-type': 'image/webp',
      'cache-control': 'public, max-age=604800',
    },
  });
}
