import living from '../assets/christmas-living.webp';
import table from '../assets/christmas-table.webp';
import candlelight from '../assets/christmas-candlelight.webp';
import studioLanterns from '../assets/home-studio-lanterns.webp';
import studioTree from '../assets/home-studio-tree.webp';
import studioOrnament from '../assets/home-studio-ornament.webp';
import studioCoasters from '../assets/home-studio-coasters.webp';
import studioCandleGold from '../assets/home-studio-candle-gold.webp';
import studioCandleMoon from '../assets/home-studio-candle-moon.webp';
import studioCandleMirror from '../assets/home-studio-candle-mirror.webp';
import studioCandleFlower from '../assets/home-studio-candle-flower.webp';
import studioLightWreath from '../assets/home-studio-light-wreath.webp';
import studioLightMiniTree from '../assets/home-studio-light-mini-tree.webp';
import studioLightSanta from '../assets/home-studio-light-santa.webp';
import studioLightWax from '../assets/home-studio-light-wax.webp';
import studioObjectNordicVase from '../assets/home-studio-object-nordic-vase.webp';
import studioObjectZenVase from '../assets/home-studio-object-zen-vase.webp';
import studioObjectVintageVase from '../assets/home-studio-object-vintage-vase.webp';
import studioObjectBlackVase from '../assets/home-studio-object-black-vase.webp';
import studioTextileFrench from '../assets/home-studio-textile-french.webp';
import studioTextileCorduroy from '../assets/home-studio-textile-corduroy.webp';
import studioTextileLinen from '../assets/home-studio-textile-linen.webp';
import studioTextileBohemian from '../assets/home-studio-textile-bohemian.webp';

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
  'european-style-round-black-and-golden-aromatherapy-candle': '/images/home-studio-candle-gold.webp',
  'light-luxury-crescent-moon-star-moon-black-gold-metal-candle': '/images/home-studio-candle-moon.webp',
  'crushed-diamond-mirrored-candle-holder-set-with-3-clear-glass-589121': '/images/home-studio-candle-mirror.webp',
  'crystal-dried-flower-fragrance-tin-can-tinplate-candle-622200': '/images/home-studio-candle-flower.webp',
  'creative-lighted-robin-christmas-wreath': '/images/home-studio-light-wreath.webp',
  'pvc-mini-christmas-tree-led-lights-decoration-desktop-ornaments': '/images/home-studio-light-mini-tree.webp',
  'christmas-portable-oil-lamp-santa-claus-led-night-lights-battery': '/images/home-studio-light-santa.webp',
  'small-night-light-small-wax-lamp-creative-decoration': '/images/home-studio-light-wax.webp',
  'vase-nordic-home-decorations-maison-flower-pot': '/images/home-studio-object-nordic-vase.webp',
  'stoneware-zen-chinese-flower-arrangement-vase': '/images/home-studio-object-zen-vase.webp',
  'vintage-ceramic-vase-620200': '/images/home-studio-object-vintage-vase.webp',
  'jingdezhen-retro-black-stoneware-handmade-ceramic-vase-623500': '/images/home-studio-object-black-vase.webp',
  'fashionable-personality-french-vintage-pillow-cover': '/images/home-studio-textile-french.webp',
  'home-fashion-simple-corduroy-couch-pillow': '/images/home-studio-textile-corduroy.webp',
  'plain-cotton-linen-sofa-cushion-thickened-square-pillow': '/images/home-studio-textile-linen.webp',
  'retro-bohemian-style-pillow-cover-linen-printed-home-ornament': '/images/home-studio-textile-bohemian.webp',
};

const images = new Map([
  [CHRISTMAS_SCENES.living, living],
  [CHRISTMAS_SCENES.table, table],
  [CHRISTMAS_SCENES.candlelight, candlelight],
  [HOME_STUDIO_PREVIEWS['christmas-candle-lights-led-small-lanterns-wind-lights-793600'], studioLanterns],
  [HOME_STUDIO_PREVIEWS['christmas-tree-898881'], studioTree],
  [HOME_STUDIO_PREVIEWS['3-x-3-x-4-3-egg-christmas-ball-ornament-012800'], studioOrnament],
  [HOME_STUDIO_PREVIEWS['wooden-christmas-tree-folding-coaster-black-walnut-thick-seat-620400'], studioCoasters],
  [HOME_STUDIO_PREVIEWS['european-style-round-black-and-golden-aromatherapy-candle'], studioCandleGold],
  [HOME_STUDIO_PREVIEWS['light-luxury-crescent-moon-star-moon-black-gold-metal-candle'], studioCandleMoon],
  [HOME_STUDIO_PREVIEWS['crushed-diamond-mirrored-candle-holder-set-with-3-clear-glass-589121'], studioCandleMirror],
  [HOME_STUDIO_PREVIEWS['crystal-dried-flower-fragrance-tin-can-tinplate-candle-622200'], studioCandleFlower],
  [HOME_STUDIO_PREVIEWS['creative-lighted-robin-christmas-wreath'], studioLightWreath],
  [HOME_STUDIO_PREVIEWS['pvc-mini-christmas-tree-led-lights-decoration-desktop-ornaments'], studioLightMiniTree],
  [HOME_STUDIO_PREVIEWS['christmas-portable-oil-lamp-santa-claus-led-night-lights-battery'], studioLightSanta],
  [HOME_STUDIO_PREVIEWS['small-night-light-small-wax-lamp-creative-decoration'], studioLightWax],
  [HOME_STUDIO_PREVIEWS['vase-nordic-home-decorations-maison-flower-pot'], studioObjectNordicVase],
  [HOME_STUDIO_PREVIEWS['stoneware-zen-chinese-flower-arrangement-vase'], studioObjectZenVase],
  [HOME_STUDIO_PREVIEWS['vintage-ceramic-vase-620200'], studioObjectVintageVase],
  [HOME_STUDIO_PREVIEWS['jingdezhen-retro-black-stoneware-handmade-ceramic-vase-623500'], studioObjectBlackVase],
  [HOME_STUDIO_PREVIEWS['fashionable-personality-french-vintage-pillow-cover'], studioTextileFrench],
  [HOME_STUDIO_PREVIEWS['home-fashion-simple-corduroy-couch-pillow'], studioTextileCorduroy],
  [HOME_STUDIO_PREVIEWS['plain-cotton-linen-sofa-cushion-thickened-square-pillow'], studioTextileLinen],
  [HOME_STUDIO_PREVIEWS['retro-bohemian-style-pillow-cover-linen-printed-home-ornament'], studioTextileBohemian],
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
