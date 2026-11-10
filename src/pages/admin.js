import adminHtml from './admin.html';

export function adminPage() {
  return new Response(adminHtml, {
    status: 200,
    headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' },
  });
}
