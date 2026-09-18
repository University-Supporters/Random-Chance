import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createHmac } from 'node:crypto';
import { prepareSessionSecret } from '../scripts/prepare-session.mjs';
import { createSessionTokens } from '../api/session.js';

test('local signing key survives restart and simultaneous worker initialization', async () => {
  const DATA_DIR = await fs.mkdtemp(path.join(os.tmpdir(), 'heyum-session-test-'));
  const workers = Array.from({ length: 6 }, () => createSessionTokens({ DATA_DIR }));
  const tokens = await Promise.all(workers.map(worker => worker.issue('admin', 'same-session')));
  const restarted = createSessionTokens({ DATA_DIR });
  for (const token of tokens) assert.equal((await restarted.verify(token, 'admin')).session, 'same-session');
  assert.equal((await fs.readFile(path.join(DATA_DIR, '.session-secret'), 'utf8')).length, 64);
});

test('serverless workers share configured keys without relying on temporary files', async () => {
  for (const source of ['SESSION_SECRET', 'KV_REST_API_TOKEN', 'GITHUB_TOKEN']) {
    const env = { VERCEL: '1', [source]: 'test-only-private-credential-with-at-least-32-characters' };
    const first = createSessionTokens(env), second = createSessionTokens({ ...env });
    const token = await first.issue('super', 'session-a');
    assert.equal((await second.verify(token, 'super')).session, 'session-a');
    assert.equal(await second.verify(token, 'admin'), null);
  }
});

test('zero-configuration serverless workers share an automatically generated deployment key', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'heyum-build-secret-'));
  const buildSecretFile = path.join(dir, 'session-secret');
  await prepareSessionSecret(buildSecretFile);
  for (const env of [{ VERCEL: '1' }, { VERCEL: '1', SESSION_SECRET: 'short' }]) {
    const first = createSessionTokens(env, { buildSecretFile });
    const second = createSessionTokens(env, { buildSecretFile });
    const token = await first.issue('admin', 'session-a');
    assert.equal((await second.verify(token, 'admin')).session, 'session-a');
    assert.equal(await second.verify(token, 'super'), null);
  }
});

test('missing build artifact never falls back to a public password or transient key', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'heyum-no-build-'));
  await assert.rejects(createSessionTokens({ VERCEL: '1' }, { buildSecretFile: path.join(dir, 'missing') }).issue('admin', 'a'), error => error.status === 503);
});

test('key rotation, signature tampering and expired tokens remain rejected', async () => {
  const key = 'test-only-fixed-signing-key-32-characters-long';
  const tokens = createSessionTokens({ SESSION_SECRET: key });
  const valid = await tokens.issue('admin', 'session-a');
  assert.equal(await createSessionTokens({ SESSION_SECRET: key + '-changed' }).verify(valid, 'admin'), null);
  assert.equal(await tokens.verify(valid + 'tampered', 'admin'), null);
  const payload = Buffer.from(JSON.stringify({ role: 'admin', session: 'session-a', exp: Date.now() - 1000 })).toString('base64url');
  const signature = createHmac('sha256', key).update(payload).digest('base64url');
  assert.equal(await tokens.verify(`${payload}.${signature}`, 'admin'), null);
});
