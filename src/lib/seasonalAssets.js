import living from '../assets/christmas-living.webp';
import table from '../assets/christmas-table.webp';
import candlelight from '../assets/christmas-candlelight.webp';
import studioLanterns from '../assets/home-studio-lanterns.webp';
import studioTree from '../assets/home-studio-tree.webp';
import studioOrnament from '../assets/home-studio-ornament.webp';
import studioCoasters from '../assets/home-studio-coasters.webp';

export const CHRISTMAS_SCENES = {
  living: '/images/christmas-living.webp',
  table: '/images/christmas-table.webp',
  candlelight: '/images/christmas-candlelight.webp',
};

/** Editorial room-set previews used only on the home page. Product pages keep supplier photos. */
export const HOME_STUDIO_PREVIEWS = {
  'christmas-candle-lights-led-small-lanterns-wind-lights-793600': '/images/home-studio-lanterns.webp',
  'christmas-tree-898881': '/images/home-studio-tree.webp',
  '3-x-3-x-4-3-egg-christmas-ball-ornament-012800': '/images/home-studio-ornament.webp',
  'wooden-christmas-tree-folding-coaster-black-walnut-thick-seat-620400': '/images/home-studio-coasters.webp',
};

const images = new Map([
  [CHRISTMAS_SCENES.living, living],
  [CHRISTMAS_SCENES.table, table],
  [CHRISTMAS_SCENES.candlelight, candlelight],
  [HOME_STUDIO_PREVIEWS['christmas-candle-lights-led-small-lanterns-wind-lights-793600'], studioLanterns],
  [HOME_STUDIO_PREVIEWS['christmas-tree-898881'], studioTree],
  [HOME_STUDIO_PREVIEWS['3-x-3-x-4-3-egg-christmas-ball-ornament-012800'], studioOrnament],
  [HOME_STUDIO_PREVIEWS['wooden-christmas-tree-folding-coaster-black-walnut-thick-seat-620400'], studioCoasters],
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
