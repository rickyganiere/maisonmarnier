/** Shared June Signal brand constants. */

export const BRAND = {
  name: 'June Signal',
  handle: '@junesignal',
  tagline: 'An AI character making tech comedy for humans.',
  disclosure: 'June Signal is an AI / virtual character — not a real person.',
  email: 'hello@junesignal.example',
  pillars: [
    { id: 'tech-fails', title: 'Tech fails', blurb: 'Gadgets and apps going gloriously wrong.' },
    { id: 'ai-in-public', title: 'AI in public', blurb: 'How humans confuse an artificial roommate.' },
    { id: 'lifestyle-hacks', title: 'Lifestyle hacks', blurb: 'Useful tips that end in a joke.' },
    { id: 'explain-it-crooked', title: 'Explain-it-crooked', blurb: 'Education with a comedy bend.' },
  ],
  social: {
    youtube: 'https://youtube.com/@junesignal',
    tiktok: 'https://tiktok.com/@junesignal',
    instagram: 'https://instagram.com/junesignal',
  },
};

export function siteUrl(env) {
  return (env && env.SITE_URL) || 'https://junesignal.example';
}
