import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { prepareSessionSecret, buildSecretFile } from '../scripts/prepare-session.mjs';

process.env.NODE_ENV = 'test';
process.env.VERCEL = '1';
process.env.DATA_DIR = await fs.mkdtemp(path.join(os.tmpdir(), 'heyum-serverless-'));
for (const key of ['SESSION_SECRET','KV_REST_API_URL','KV_REST_API_TOKEN','GITHUB_TOKEN']) delete process.env[key];
await prepareSessionSecret();

test('no credentials configured: login on A, elevate on B, access all protected menus on C', async () => {
  const servers = [];
  try {
    for (let index = 0; index < 3; index++) {
      const { default: app } = await import(`../server.js?serverless=${index}`);
      const server = app.listen(0, '127.0.0.1');
      await new Promise(resolve => server.once('listening', resolve));
      servers.push(server);
    }
    const call = async (index, url, { token, superToken, body } = {}) => {
      const response = await fetch(`http://127.0.0.1:${servers[index].address().port}/api${url}`, {
        method: body ? 'POST' : 'GET', headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(superToken ? { 'x-super-token': superToken } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}) }, ...(body ? { body: JSON.stringify(body) } : {})
      });
      return { status: response.status, data: await response.json() };
    };
    const login = await call(0, '/admin/login', { body: { password: '1111' } });
    assert.equal(login.status, 200);
    const token = login.data.token;
    assert.equal((await call(1, '/admin/super-auth', { token, body: { superPassword: '1111' } })).status, 403);
    assert.equal((await call(2, '/admin/participants', { token })).status, 200);
    const elevated = await call(1, '/admin/super-auth', { token, body: { superPassword: '9372707' } });
    assert.equal(elevated.status, 200);
    const superToken = elevated.data.superToken;
    for (const endpoint of ['/admin/logs', '/admin/winners', '/admin/backup/vault', '/admin/backup/snapshots']) {
      assert.equal((await call(2, endpoint, { token, superToken })).status, 200, endpoint);
      assert.equal((await call(2, endpoint, { token })).status, 403, endpoint);
    }
    const privateKey = (await fs.readFile(buildSecretFile, 'utf8')).trim();
    const response = await fetch(`http://127.0.0.1:${servers[0].address().port}/.generated/session-secret`);
    assert.ok(!(await response.text()).includes(privateKey));
    assert.ok(!JSON.stringify((await call(2, '/admin/backup/download', { token, superToken })).data).includes(privateKey));
  } finally { await Promise.all(servers.map(server => new Promise(resolve => server.close(resolve)))); }
});

test('deployment config generates and includes the private artifact outside public output', async () => {
  const pkg = JSON.parse(await fs.readFile(new URL('../package.json', import.meta.url), 'utf8'));
  const config = JSON.parse(await fs.readFile(new URL('../vercel.json', import.meta.url), 'utf8'));
  assert.equal(pkg.scripts.prebuild, 'node scripts/prepare-session.mjs');
  assert.equal(config.buildCommand, 'npm run build');
  assert.equal(config.functions['api/index.js'].includeFiles, '.generated/session-secret');
  assert.equal(config.outputDirectory, 'dist');
});
