import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

process.env.NODE_ENV = 'test';
process.env.DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'heyum-test-'));
for (const key of ['KV_REST_API_URL', 'KV_REST_API_TOKEN', 'GITHUB_TOKEN', 'VERCEL', 'SESSION_SECRET']) delete process.env[key];
const { default: app } = await import('../server.js');
const db = await import('../api/db.js');
const server = app.listen(0, '127.0.0.1');
await new Promise(resolve => server.once('listening', resolve));
const base = `http://127.0.0.1:${server.address().port}/api`;
const call = async (url, { method = 'GET', token, superToken, body } = {}) => {
  const response = await fetch(base + url, { method, headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(superToken ? { 'x-super-token': superToken } : {}), ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}) }, ...(body !== undefined ? { body: JSON.stringify(body) } : {}) });
  return { status: response.status, data: await response.json(), cache: response.headers.get('cache-control') };
};
const entry = i => ({ studentId: `60${String(i).padStart(6,'0')}`, name: '테스트', phone: `010${String(i).padStart(8,'0')}`, instagram: '없음' });
let token, superToken;

test('integration: authentication, duplicate concurrency, raffle and safe recovery', async t => {
  try {
    await t.test('passwords cannot bypass login; issued tokens are session bound', async () => {
      assert.equal((await call('/admin/participants', { token: '1111' })).status, 401);
      token = (await call('/admin/login', { method: 'POST', body: { password: '1111' } })).data.token;
      assert.ok(token && token !== '1111');
      assert.equal((await call('/admin/super-auth', { method: 'POST', token, body: { superPassword: '1111' } })).status, 403);
      superToken = (await call('/admin/super-auth', { method: 'POST', token, body: { superPassword: '9372707' } })).data.superToken;
      assert.ok(superToken && superToken !== '9372707');
      const other = (await call('/admin/login', { method: 'POST', body: { password: '1111' } })).data.token;
      assert.equal((await call('/admin/logs', { token: other, superToken })).status, 403);
    });
    await t.test('admin login and elevation survive requests handled by another server instance', async () => {
      const { default: replicaApp } = await import('../server.js?replica=2');
      const replica = replicaApp.listen(0, '127.0.0.1');
      await new Promise(resolve => replica.once('listening', resolve));
      try {
        const response = await fetch('http://127.0.0.1:' + replica.address().port + '/api/admin/super-auth', {
          method: 'POST', headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
          body: JSON.stringify({ superPassword: '9372707' })
        });
        assert.equal(response.status, 200, 'another instance must recognize the first-stage session');
        const elevated = await response.json();
        assert.equal((await call('/admin/logs', { token, superToken: elevated.superToken })).status, 200);
      } finally { await new Promise(resolve => replica.close(resolve)); }
    });
    await t.test('every protected API rejects ordinary access and raw super password', async () => {
      for (const [method,url] of [['GET','/admin/logs'],['GET','/admin/winners'],['POST','/admin/draw'],['POST','/admin/reset-draw'],['POST','/admin/reset-all'],['GET','/admin/backup/download'],['GET','/admin/backup/vault'],['GET','/admin/backup/snapshots'],['POST','/admin/backup/snapshot'],['POST','/admin/backup/restore'],['POST','/admin/backup/rollback-snapshot']]) {
        assert.equal((await call(url, { token, method })).status, 403, url);
        assert.equal((await call(url, { token, method, superToken: '9372707' })).status, 403, url);
      }
    });
    await t.test('validates malformed input and serializes duplicates including manual registration', async () => {
      assert.equal((await call('/participants', { method: 'POST', body: { ...entry(1), studentId: 60240000 } })).status, 400);
      assert.equal((await call('/participants', { method: 'POST', body: { ...entry(1), studentId: '61240000' } })).status, 400);
      const results = await Promise.all(Array.from({ length: 12 }, () => call('/participants', { method: 'POST', body: entry(1) })));
      assert.equal(results.filter(r => r.status === 201).length, 1);
      assert.equal(results.filter(r => r.status === 409).length, 11);
      assert.equal((await call('/admin/participants', { token, method: 'POST', body: { ...entry(2), phone: entry(1).phone } })).status, 409);
      assert.equal((await call('/admin/participants', { token, method: 'POST', body: { ...entry(2), phone: '1' } })).status, 400);
      const results2 = await Promise.all(Array.from({ length: 54 }, (_,i) => call('/admin/participants', { token, method: 'POST', body: entry(i+2) })));
      assert.ok(results2.every(r => r.status === 201));
      const result = await call('/admin/participants', { token });
      assert.equal(result.data.totalCount, 55); assert.match(result.cache, /no-store/);
    });
    await t.test('selects 50 unique winners and protects redraw', async () => {
      assert.equal((await call('/admin/draw', { method: 'POST', token, superToken, body: { count: -1 } })).status, 400);
      const result = await call('/admin/draw', { method: 'POST', token, superToken, body: { count: 50 } });
      assert.equal(result.data.winners.length, 50); assert.equal(new Set(result.data.winners.map(w => w.id)).size, 50);
      assert.equal((await call('/admin/draw', { method: 'POST', token, superToken })).status, 409);
    });
    await t.test('backup validation, snapshot traversal and restore preserve data and audit', async () => {
      const before = await db.getDbData();
      assert.equal((await call('/admin/backup/restore', { method: 'POST', token, superToken, body: { backupData: { participants: [entry(1)] } } })).status, 400);
      assert.equal((await db.getDbData()).participants.length, 55);
      assert.equal((await call('/admin/backup/rollback-snapshot', { method: 'POST', token, superToken, body: { filename: '../db.json' } })).status, 404);
      const snap = (await call('/admin/backup/snapshot', { method: 'POST', token, superToken })).data.snapshot;
      await call('/admin/participants/' + before.participants[0].id, { method: 'DELETE', token });
      assert.equal((await db.getDbData()).participants.length, 54);
      assert.equal((await call('/admin/backup/rollback-snapshot', { method: 'POST', token, superToken, body: { filename: snap.filename } })).status, 200);
      const restored = await db.getDbData(); assert.equal(restored.participants.length, 55);
      assert.ok(restored.logs.some(l => l.action === 'ADMIN_DELETE_PARTICIPANT'));
      assert.ok(restored.logs.some(l => l.action === 'DATA_RESTORE'));
    });
    await t.test('empty main heals from mirror; two broken files heal from snapshot', async () => {
      fs.writeFileSync(path.join(process.env.DATA_DIR, 'db.json'), '');
      assert.equal((await db.getDbData()).participants.length, 55);
      await db.createManualSnapshot();
      fs.writeFileSync(path.join(process.env.DATA_DIR, 'db.json'), '{broken');
      fs.writeFileSync(path.join(process.env.DATA_DIR, 'db.backup.json'), '{broken');
      assert.equal((await db.getDbData()).participants.length, 55);
      assert.deepEqual(JSON.parse(fs.readFileSync(path.join(process.env.DATA_DIR, 'db.json'))), JSON.parse(fs.readFileSync(path.join(process.env.DATA_DIR, 'db.backup.json'))));
    });
    await t.test('latest registration survives main and mirror corruption without waiting five minutes', async () => {
      await call('/participants', {method:'POST',body:entry(999)});
      fs.writeFileSync(path.join(process.env.DATA_DIR, 'db.json'), '{broken');
      fs.writeFileSync(path.join(process.env.DATA_DIR, 'db.backup.json'), '{broken');
      assert.equal((await db.getDbData()).participants.length, 56);
      const last = (await db.getDbData()).participants.find(p => p.studentId === entry(999).studentId);
      await call('/admin/participants/' + last.id, {method:'DELETE',token});
    });
    await t.test('total corruption fails closed but an external valid backup can recover', async () => {
      const backup = await db.getDbData();
      for (const file of ['db.json', 'db.backup.json']) fs.writeFileSync(path.join(process.env.DATA_DIR, file), '{broken');
      for (const snap of await db.getAvailableSnapshots()) fs.writeFileSync(path.join(process.env.DATA_DIR, 'backups', snap.filename), '{broken');
      await assert.rejects(db.getDbData, /DB와 모든 백업/);
      assert.equal(fs.readFileSync(path.join(process.env.DATA_DIR, 'db.json'), 'utf8'), '{broken');
      const result = await call('/admin/backup/restore', { method: 'POST', token, superToken, body: { backupData: backup } });
      assert.equal(result.status, 200); assert.equal((await db.getDbData()).participants.length, 55);
      assert.ok(fs.readdirSync(path.join(process.env.DATA_DIR, 'backups')).some(f => f.startsWith('corrupt_')));
    });
  } finally { await new Promise(resolve => server.close(resolve)); }
});
