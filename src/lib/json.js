export function json(data, status = 200, extraHeaders = {}) {
  const headers = {
    'content-type': 'application/json; charset=UTF-8',
    'cache-control': 'no-store',
    'x-content-type-options': 'nosniff',
    ...extraHeaders,
  };
  return new Response(JSON.stringify(data), { status, headers });
}
