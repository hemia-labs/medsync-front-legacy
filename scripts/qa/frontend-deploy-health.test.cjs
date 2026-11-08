const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const http = require('node:http');
const { assertPort, manifest, probe, verify } = require('../ops/verify-frontend.cjs');

async function fixture(t) {
  const dist = fs.mkdtempSync(path.join(os.tmpdir(), 'frontend-health-'));
  fs.writeFileSync(path.join(dist, 'index.html'), '<!doctype html><html>MedSync test build</html>');
  const release = 'commit-run-attempt';
  const expected = manifest(dist, release);
  const state = { marker: expected, html: fs.readFileSync(path.join(dist, 'index.html')), status: 200 };
  const process = { name: 'medsync-front-legacy', pid: 123, pm2_env: {
    status: 'online', PM2_SERVE_PORT: '4324', PM2_SERVE_PATH: dist,
    pm_exec_path: '/pm2/lib/API/Serve.js', restart_time: 0, pm_uptime: 1000
  } };
  const server = http.createServer((req, res) => {
    res.writeHead(state.status);
    res.end(req.url.startsWith('/deploy-release.json') ? JSON.stringify(state.marker) : state.html);
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(async () => {
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
    fs.rmSync(dist, { recursive: true, force: true });
  });
  return { state, process, options: { dist, release, port: 4324,
    baseUrl: `http://127.0.0.1:${server.address().port}`, readProcesses: () => [process] } };
}

const quick = { attempts: 3, interval: 0, sleep: async () => {}, log: () => {} };

test('dev port rejects backend port before deployment; default remains 4324', () => {
  for (const port of [undefined, '', '4324', 4324]) assert.doesNotThrow(() => assertPort(port));
  for (const port of ['3009', '80', 'bad']) assert.throws(() => assertPort(port), /must be 4324/);
});

test('matching frontend HTTP and stable PM2 pass after three separate probes', async t => {
  const { options } = await fixture(t);
  let reads = 0;
  const read = options.readProcesses;
  options.readProcesses = () => { reads++; return read(); };
  await verify(options, quick);
  assert.equal(reads, 6);
});

test('HTTP 200 from backend cannot pass even with a healthy-looking frontend process', async t => {
  const { state, options } = await fixture(t);
  state.marker = { ready: true, release: options.release };
  await assert.rejects(verify(options, quick), /failed release/);
});

test('old release cannot pass with identical HTML', async t => {
  const { state, options } = await fixture(t);
  state.marker.release = 'previous-run';
  await assert.rejects(probe(options), /expected frontend release/);
});

test('SPA fallback returning index.html for missing marker cannot pass', async t => {
  const { state, options } = await fixture(t);
  state.marker = '<html>SPA fallback</html>';
  await assert.rejects(probe(options), /expected frontend release/);
});

test('current marker cannot hide stale or wrong HTML', async t => {
  const { state, options } = await fixture(t);
  state.html = '<html>another app</html>';
  await assert.rejects(probe(options), /HTML does not match/);
});

test('HTTP redirect and errors fail instead of following another service', async t => {
  const { state, options } = await fixture(t);
  for (const status of [301, 404, 502]) {
    state.status = status;
    await assert.rejects(probe(options), new RegExp(`HTTP ${status}`));
  }
});

test('errored PM2 process cannot pass even when HTTP serves matching files', async t => {
  const { process, options } = await fixture(t);
  process.pm2_env.status = 'errored';
  process.pid = 0;
  await assert.rejects(probe(options), /not online/);
});

test('wrong PM2 port, directory and entry point are rejected', async t => {
  const { process, options } = await fixture(t);
  for (const [key, wrong] of [['PM2_SERVE_PORT', '3009'], ['PM2_SERVE_PATH', '/other-app'], ['pm_exec_path', '/backend/index.js']]) {
    const old = process.pm2_env[key];
    process.pm2_env[key] = wrong;
    await assert.rejects(probe(options), /wrong port, directory or entry point/);
    process.pm2_env[key] = old;
  }
});

test('missing or duplicate PM2 app is rejected', async t => {
  const { process, options } = await fixture(t);
  for (const list of [[], [process, process]]) {
    options.readProcesses = () => list;
    await assert.rejects(probe(options), /exactly one/);
  }
});

test('process restarting between successful HTTP probes never passes', async t => {
  const { process, options } = await fixture(t);
  let reads = 0;
  options.readProcesses = () => {
    if (reads++ % 2 === 0) process.pid++;
    return [process];
  };
  await assert.rejects(verify(options, { ...quick, attempts: 5 }), /failed release/);
});

test('process restarting during a probe fails', async t => {
  const { process, options } = await fixture(t);
  options.readProcesses = () => { process.pm2_env.restart_time++; return [process]; };
  await assert.rejects(probe(options), /restarted during/);
});

test('temporary HTTP failure resets the stability window before recovering', async t => {
  const { state, options } = await fixture(t);
  let sleeps = 0;
  await verify(options, { ...quick, attempts: 5, sleep: async () => {
    state.status = ++sleeps === 1 ? 502 : 200;
  } });
  assert.equal(sleeps, 4);
});
