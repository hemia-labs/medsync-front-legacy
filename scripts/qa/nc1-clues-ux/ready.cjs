module.exports = async function ready() {
  const url = 'http://127.0.0.1:4388/admin?section=identity';
  for (let n = 0; n < 90; n++) {
    try { const r = await fetch(url, { headers: { Accept: 'text/html' }, signal: AbortSignal.timeout(3000) }); if (r.ok) return; }
    catch (_) { /* webpack may still be compiling */ }
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  throw Error('NC1 synthetic shell did not become ready on 127.0.0.1:4388');
};
