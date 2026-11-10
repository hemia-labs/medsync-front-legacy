const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const http = require('node:http');
const { execFileSync } = require('node:child_process');

const APP = 'medsync-front-legacy';
const MARKER = 'deploy-release.json';
const hash = body => crypto.createHash('sha256').update(body).digest('hex');

function assertPort(value) {
  if (value !== undefined && value !== '' && String(value) !== '4324') {
    throw new Error('APP_PORT must be 4324 (the backend uses 3009).');
  }
}

function manifest(dist, release) {
  if (!release) throw new Error('Missing deployment release ID');
  return { application: APP, release, indexSha256: hash(fs.readFileSync(path.join(dist, 'index.html'))) };
}

function processIdentity(processes, dist, port) {
  const matches = processes.filter(p => p.name === APP);
  if (matches.length !== 1) throw new Error('Expected exactly one frontend PM2 process');
  const p = matches[0];
  const e = p.pm2_env || {};
  if (e.status !== 'online' || !Number.isInteger(p.pid) || p.pid <= 0) {
    throw new Error('Frontend PM2 process is not online');
  }
  if (String(e.PM2_SERVE_PORT) !== String(port) ||
      path.resolve(e.PM2_SERVE_PATH || '.') !== path.resolve(dist) ||
      path.basename(e.pm_exec_path || '') !== 'Serve.js') {
    throw new Error('Frontend PM2 server has the wrong port, directory or entry point');
  }
  return `${p.pid}:${e.restart_time}:${e.pm_uptime}`;
}

function get(url) {
  return new Promise((resolve, reject) => {
    const req = http.get(url, { headers: { 'Cache-Control': 'no-cache' } }, res => {
      const chunks = [];
      let size = 0;
      res.on('data', chunk => {
        size += chunk.length;
        if (size > 2 * 1024 * 1024) return req.destroy(new Error('Unexpected response size'));
        chunks.push(chunk);
      });
      res.on('error', reject);
      res.on('end', () => {
        if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode}`));
        resolve(Buffer.concat(chunks));
      });
    });
    const deadline = setTimeout(() => req.destroy(new Error('HTTP probe timed out')), 3000);
    req.on('close', () => clearTimeout(deadline));
    req.on('error', reject);
  });
}

async function probe({ dist, release, port, readProcesses, baseUrl = `http://127.0.0.1:${port}` }) {
  const before = processIdentity(readProcesses(), dist, port);
  const expected = manifest(dist, release);
  const served = JSON.parse((await get(`${baseUrl}/${MARKER}?release=${encodeURIComponent(release)}`)).toString());
  if (served.application !== expected.application || served.release !== expected.release ||
      served.indexSha256 !== expected.indexSha256) {
    throw new Error('HTTP service is not serving the expected frontend release');
  }
  if (hash(await get(`${baseUrl}/index.html?release=${encodeURIComponent(release)}`)) !== expected.indexSha256) {
    throw new Error('Served HTML does not match the deployed frontend');
  }
  if (processIdentity(readProcesses(), dist, port) !== before) {
    throw new Error('Frontend restarted during verification');
  }
  return before;
}

async function verify(options, { attempts = 10, interval = 2000, sleep = ms => new Promise(r => setTimeout(r, ms)), log = console.log } = {}) {
  let previous;
  let stable = 0;
  for (let i = 0; i < attempts; i++) {
    try {
      const identity = await probe(options);
      stable = identity === previous ? stable + 1 : 1;
      previous = identity;
      if (stable >= 3) return;
      log(`Frontend release verified; stability check ${stable}/3`);
    } catch (error) {
      previous = undefined;
      stable = 0;
      log(`Frontend not ready: ${error.message}`);
    }
    if (i + 1 < attempts) await sleep(interval);
  }
  throw new Error('Frontend failed release and PM2 stability verification');
}

async function main() {
  assertPort(process.env.APP_PORT);
  const dist = path.resolve('dist');
  const release = process.env.DEPLOY_RELEASE;
  if (process.argv[2] === 'seal') {
    fs.writeFileSync(path.join(dist, MARKER), JSON.stringify(manifest(dist, release)) + '\n');
    return;
  }
  if (process.argv[2] !== 'verify') throw new Error('Use seal or verify');
  await verify({ dist, release, port: 4324,
    readProcesses: () => JSON.parse(execFileSync('pm2', ['jlist'], {
      encoding: 'utf8', timeout: 5000, maxBuffer: 2 * 1024 * 1024
    })) });
  console.log(`Verified ${APP} release ${release} on port 4324`);
}

if (require.main === module) main().catch(error => { console.error(error.message); process.exitCode = 1; });
module.exports = { assertPort, manifest, processIdentity, probe, verify };
