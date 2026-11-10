async () => {
  const db = 'e5e5c9e8-f953-468e-9edc-69172ffd7f80';
  const r = await cloudflare.request({ method:'POST', path:`/accounts/${accountId}/d1/database/${db}/query`, body:{ sql:`SELECT i,b FROM _deploy_chunks ORDER BY i` }});
  const rows = r.result?.[0]?.results || [];
  const b64 = rows.map(x => x.b).join('');
  const bin = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
  const stream = new Blob([bin]).stream().pipeThrough(new DecompressionStream('gzip'));
  const workerSource = await new Response(stream).text();
  const form = new FormData();
  form.append('metadata', new Blob([JSON.stringify({ main_module: 'worker.js' })], { type: 'application/json' }));
  form.append('worker.js', new Blob([workerSource], { type: 'application/javascript+module' }), 'worker.js');
  const put = await cloudflare.request({ method:'PUT', path:`/accounts/${accountId}/workers/scripts/lume-living-dev/content`, body: form });
  await cloudflare.request({ method:'POST', path:`/accounts/${accountId}/d1/database/${db}/query`, body:{ sql:`DELETE FROM _deploy_chunks` }});
  return { ok: !!put.success, size: workerSource.length, chunks: rows.length, errors: put.errors, hasBigLogo: workerSource.includes('width:88px') && workerSource.includes('brand-mark-img') };
}