/** Shared Nando Prestige brand constants. */

export const BRAND = {
  name: 'Nando Prestige',
  handle: '@nando.prestige',
  tagline: 'Nato iconico. Qui per la trama.',
  disclosure: 'Nando Prestige is an AI / virtual character — not a real person.',
  email: 'collabs@nandoprestige.example',
  role: 'Actor · Dancer · Comedian',
  pillars: [
    {
      id: 'buono-spesa',
      title: 'Buono spesa',
      blurb: 'Shopping fails da culturista col voucher — sempre un euro di troppo.',
    },
    {
      id: 'ballo-location',
      title: 'Ballo in location',
      blurb: 'Danza signature in posti iconici: centro commerciale, piazza, deserto, notte.',
    },
    {
      id: 'flex-assurdo',
      title: 'Flex assurdo',
      blurb: 'Pose, moto, cavalli, stunt: il prestige che nessuno ha chiesto.',
    },
    {
      id: 'smorfia-catch',
      title: 'Smorfia & catchphrase',
      blurb: 'Una faccia, una battuta, un motivo per seguirlo.',
    },
  ],
  social: {
    instagram: 'https://instagram.com/nando.prestige',
    tiktok: 'https://tiktok.com/@nandoprestige',
    youtube: 'https://youtube.com/@nandoprestige',
  },
};

export function siteUrl(env) {
  return (env && env.SITE_URL) || 'https://nandoprestige.example';
}
