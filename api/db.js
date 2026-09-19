import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';
import { kvConfigured, kvCommand, KV_KEYS, getKvRaw, compareAndSaveKv, getGitHubData, saveGitHubData } from './storage-adapters.js';

const DATA_DIR = process.env.DATA_DIR || (process.env.VERCEL ? '/tmp' : path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../data'));
const DB_FILE = path.join(DATA_DIR, 'db.json');
const MIRROR = path.join(DATA_DIR, 'db.backup.json');
const BACKUPS = path.join(DATA_DIR, 'backups');
const defaults = () => ({ participants: [], winners: [], disqualifiedWinners: [], logs: [], settings: { drawCount: 50, allowDuplicatePhone: false, allowDuplicateStudentId: false } });

let queue = Promise.resolve();
// Serialize the complete read–validate–write transaction within this Node process.
function exclusive(work) {
  const result = queue.then(async () => {
    if (kvConfigured() || process.env.GITHUB_TOKEN) return work();
    const release = await acquireLocalLock();
    try { return await work(); } finally { release(); }
  });
  queue = result.catch(() => {});
  return result;
}
async function acquireLocalLock() {
  ensureDirectories();
  const filename = path.join(DATA_DIR, '.db-write-lock');
  for (let attempt = 0; attempt < 1000; attempt++) {
    try {
      const fd = fs.openSync(filename, 'wx', 0o600);
      fs.writeFileSync(fd, String(process.pid)); fs.closeSync(fd);
      return () => fs.unlinkSync(filename);
    } catch (error) {
      if (error.code !== 'EEXIST') throw error;
      try {
        const pid = Number(fs.readFileSync(filename, 'utf8'));
        if (pid > 0) {
          try { process.kill(pid, 0); } catch (error) { if (error.code === 'ESRCH') fs.unlinkSync(filename); }
        }
      } catch (error) { if (error.code !== 'ENOENT') throw error; }
      await delay(10);
    }
  }
  throw new Error('저장소가 사용 중입니다. 잠시 후 다시 시도해 주세요.');
}
export function getStorageStatus() {
  const ephemeral = Boolean(process.env.VERCEL && !kvConfigured() && !process.env.GITHUB_TOKEN);
  return { mode: getStorageMode(), durable: !ephemeral, registrationReady: !ephemeral, warning: ephemeral ? '영구 저장소 연결 전입니다. 운영진에게 문의해 주세요.' : null };
}
export function requireDurableRegistration() {
  if (!getStorageStatus().registrationReady) { const error = new Error('응모 저장소를 준비 중입니다. 운영진에게 문의해 주세요.'); error.status = 503; throw error; }
}
function ensureDirectories() { fs.mkdirSync(BACKUPS, { recursive: true }); }
function atomicWrite(filename, data) {
  const temp = `${filename}.${randomUUID()}.tmp`;
  let fd;
  try {
    fd = fs.openSync(temp, 'wx', 0o600);
    fs.writeFileSync(fd, JSON.stringify(data, null, 2), 'utf8');
    fs.fsyncSync(fd);
    fs.closeSync(fd); fd = undefined;
    fs.renameSync(temp, filename);
  } finally {
    if (fd !== undefined) fs.closeSync(fd);
    if (fs.existsSync(temp)) fs.unlinkSync(temp);
  }
}
export function validateDbData(input) {
  const invalid = () => { const e = new Error('백업 형식이 올바르지 않습니다. 참여자 정보와 중복 학번·전화번호를 확인해 주세요.'); e.status = 400; throw e; };
  if (!input || typeof input !== 'object' || !Array.isArray(input.participants)) invalid();
  if (input.logs !== undefined && !Array.isArray(input.logs)) invalid();
  if (input.winners !== undefined && !Array.isArray(input.winners)) invalid();
  if (input.disqualifiedWinners !== undefined && !Array.isArray(input.disqualifiedWinners)) invalid();
  const ids = new Set(), students = new Set(), phones = new Set();
  const participants = input.participants.map(p => {
    if (!p || typeof p.id !== 'string' || !p.id || typeof p.name !== 'string' || !p.name.trim() || p.name.length > 20 || typeof p.studentId !== 'string' || !/^60\d{6}$/.test(p.studentId) || typeof p.phone !== 'string') invalid();
    const phoneClean = p.phone.replace(/[^0-9]/g, '');
    if (!/^\d{10,11}$/.test(phoneClean) || ids.has(p.id) || students.has(p.studentId) || phones.has(phoneClean)) invalid();
    if (p.instagram !== undefined && typeof p.instagram !== 'string') invalid();
    if (p.createdAt && !Number.isFinite(Date.parse(p.createdAt))) invalid();
    ids.add(p.id); students.add(p.studentId); phones.add(phoneClean);
    return { ...p, phoneClean, instagram: p.instagram || '없음' };
  });
  const winnerIds = new Set();
  const winners = (input.winners || []).map(w => {
    if (!w || !ids.has(w.id) || winnerIds.has(w.id)) invalid();
    winnerIds.add(w.id);
    return { ...participants.find(p => p.id === w.id), rank: w.rank, wonAt: w.wonAt, isSupplement: w.isSupplement };
  });
  const disqualifiedWinners = (input.disqualifiedWinners || []).map(d => {
    if (!d || typeof d.id !== 'string') invalid();
    return { ...d, reason: d.reason || '조건 미충족' };
  });
  if ((input.logs || []).some(l => !l || typeof l.id !== 'string' || typeof l.action !== 'string' || typeof l.details !== 'string' || !Number.isFinite(Date.parse(l.timestamp)))) invalid();
  return { ...input, participants, winners, disqualifiedWinners, logs: input.logs || [], settings: { ...defaults().settings, ...input.settings, allowDuplicatePhone: false, allowDuplicateStudentId: false } };
}
function snapshotNames() {
  ensureDirectories();
  return fs.readdirSync(BACKUPS).filter(f => /^(backup|manual|pre_restore)_[\w.-]+\.json$/.test(f))
    .sort((a,b) => fs.statSync(path.join(BACKUPS,b)).mtimeMs - fs.statSync(path.join(BACKUPS,a)).mtimeMs);
}
function snapshot(data, prefix = 'backup') {
  ensureDirectories();
  const filename = `${prefix}_${new Date().toISOString().replace(/[:.]/g, '-')}_${randomUUID()}.json`;
  atomicWrite(path.join(BACKUPS, filename), data);
  snapshotNames().filter(f => f.startsWith('backup_')).slice(40).forEach(f => fs.unlinkSync(path.join(BACKUPS, f)));
  return { filename, timestamp: new Date().toISOString(), participantCount: data.participants.length };
}
function readLocalDb() {
  ensureDirectories();
  const candidates = [DB_FILE, MIRROR, ...snapshotNames().map(f => path.join(BACKUPS, f))];
  let hadFile = false;
  for (const filename of candidates) {
    if (!fs.existsSync(filename)) continue;
    hadFile = true;
    let data;
    try { data = validateDbData(JSON.parse(fs.readFileSync(filename, 'utf8'))); } catch { continue; }
    if (filename !== DB_FILE) { atomicWrite(DB_FILE, data); atomicWrite(MIRROR, data); }
    return data;
  }
  if (hadFile) throw new Error('DB와 모든 백업을 읽을 수 없습니다. 기존 파일을 보존했습니다.');
  const data = defaults();
  atomicWrite(DB_FILE, data); atomicWrite(MIRROR, data);
  return data;
}
function writeLocalDb(data, remoteCache = false) {
  ensureDirectories();
  const clean = { ...data }; delete clean._gh_sha;
  atomicWrite(DB_FILE, clean); atomicWrite(MIRROR, clean);
  if (clean.settings.security) atomicWrite(path.join(DATA_DIR, 'security.backup.json'), clean.settings.security);
  if (!remoteCache) snapshot(clean); // Every acknowledged write has a recovery snapshot, not a five-minute gap.
}
async function readVersion() {
  if (kvConfigured()) {
    for (let attempt = 0; attempt < 10; attempt++) {
      const raw = await getKvRaw();
      if (raw !== null) {
        try { return { data: validateDbData(JSON.parse(raw)), raw }; } catch {}
      }
      const mirror = await kvCommand(['GET', KV_KEYS.mirror]);
      const history = await kvCommand(['LRANGE', KV_KEYS.history, 0, 39]);
      const candidates = [mirror, ...history].filter(Boolean);
      if (raw === null && !candidates.length) return { data: defaults(), raw: null };
      let recovered;
      for (const candidate of candidates) { try { recovered = validateDbData(JSON.parse(candidate)); break; } catch {} }
      if (!recovered) throw new Error('영구 DB와 복구본을 읽을 수 없습니다. 원본은 보존했습니다.');
      if (await compareAndSaveKv(raw, recovered)) return { data: recovered, raw: JSON.stringify(recovered) };
    }
    throw new Error('저장소 복구 중 다른 변경이 발생했습니다. 다시 시도해 주세요.');
  }
  if (process.env.GITHUB_TOKEN) {
    const data = await getGitHubData();
    if (!data) throw new Error('원격 저장소 데이터가 없습니다.');
    return { data: validateDbData(data) };
  }
  return { data: readLocalDb() };
}
async function commitVersion(data, version) {
  const valid = validateDbData(data);
  valid._revision = (Number(version.data._revision) || 0) + 1;
  valid._txid = randomUUID(); valid._savedAt = new Date().toISOString();
  if (kvConfigured()) {
    if (!await compareAndSaveKv(version.raw, valid)) return false;
    // The remote atomic mirror and history are authoritative; a local cache failure
    // must not turn an already committed registration into an apparent failure.
    try { writeLocalDb(valid, true); } catch (error) { console.error('[DB local cache]', error.message); }
  } else if (process.env.GITHUB_TOKEN) {
    valid._gh_sha = version.data._gh_sha;
    const result = await saveGitHubData(valid);
    if (result === 'conflict') return false;
    if (!result) throw new Error('원격 저장 실패');
    try { writeLocalDb(valid, true); } catch (error) { console.error('[DB local cache]', error.message); }
  } else { writeLocalDb(valid); }
  return true;
}
async function transaction(mutate) {
  for (let attempt = 0; attempt < 40; attempt++) {
    const version = await readVersion();
    const db = structuredClone(version.data);
    const result = await mutate(db);
    if (await commitVersion(db, version)) return result;
    // Re-read and re-run duplicate validation against the winning version.
    await delay(Math.min(100, 5 * (attempt + 1)) + Math.floor(Math.random() * 15));
  }
  const error = new Error('동시 요청이 많습니다. 잠시 후 다시 시도해 주세요.'); error.status = 409; throw error;
}
export async function getSecurityState() {
  try { return (await getDbData()).settings.security || {}; }
  catch (error) {
    if (!kvConfigured() && !process.env.GITHUB_TOKEN && error.message.startsWith('DB와 모든 백업')) return JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'security.backup.json'), 'utf8'));
    throw error;
  }
}
export const getDbData = () => exclusive(async () => structuredClone((await readVersion()).data));
// Full replacement is reserved for validated restore; ordinary changes use updateDbData.
export const saveDbData = data => exclusive(() => transaction(db => {
  if (data._revision !== undefined && data._revision !== db._revision) { const error = new Error('이전 버전 데이터입니다.'); error.status = 409; throw error; }
  Object.assign(db, validateDbData(data)); return true;
}));
export const updateDbData = mutate => exclusive(() => transaction(mutate));
export function appendAuditLog(db, action, details, ip = 'unknown', author = '시스템') {
  const entry = { id: `log_${randomUUID()}`, timestamp: new Date().toISOString(), action, details, ip, author };
  db.logs.unshift(entry);
  return entry;
}
export const addAuditLog = (...args) => updateDbData(db => appendAuditLog(db, ...args));
async function archive(data, prefix = 'manual') {
  if (!kvConfigured()) return snapshot(data, prefix);
  const filename = prefix + '_' + randomUUID() + '.json';
  const record = { filename, data, createdAt: new Date().toISOString(), isManual: prefix === 'manual' };
  await kvCommand(['HSET', KV_KEYS.archives, filename, JSON.stringify(record)]);
  return { filename, timestamp: record.createdAt, participantCount: data.participants.length };
}
export const createManualSnapshot = () => exclusive(async () => archive((await readVersion()).data));
async function remoteSnapshots() {
  const history = await kvCommand(['LRANGE', KV_KEYS.history, 0, 39]);
  const stored = await kvCommand(['HGETALL', KV_KEYS.archives]);
  const values = Array.isArray(stored) ? stored.filter((_,i) => i % 2) : Object.values(stored || {});
  const result = [];
  for (const raw of history) {
    try { const data = validateDbData(JSON.parse(raw)); result.push({ filename: 'backup_' + data._txid + '.json', data, createdAt: data._savedAt, isManual: false }); } catch {}
  }
  for (const raw of values) { try { const record = JSON.parse(raw); record.data = validateDbData(record.data); result.push(record); } catch {} }
  return result;
}
export async function getAvailableSnapshots() {
  if (kvConfigured()) return (await remoteSnapshots()).map(({data,...record}) => ({...record, sizeBytes: Buffer.byteLength(JSON.stringify(data))})).sort((a,b) => Date.parse(b.createdAt)-Date.parse(a.createdAt));
  return snapshotNames().map(filename => {
    const stat = fs.statSync(path.join(BACKUPS, filename));
    return { filename, sizeBytes: stat.size, createdAt: stat.mtime.toISOString(), isManual: filename.startsWith('manual_') };
  });
}
export async function readSnapshot(filename) {
  const invalid = () => { const error = new Error('해당 스냅샷을 찾을 수 없습니다.'); error.status = 404; throw error; };
  if (typeof filename !== 'string' || !/^(backup|manual|pre_restore)_[\w.-]+\.json$/.test(filename)) invalid();
  if (kvConfigured()) { const record = (await remoteSnapshots()).find(s => s.filename === filename); if (!record) invalid(); return record.data; }
  if (!snapshotNames().includes(filename)) invalid();
  return validateDbData(JSON.parse(fs.readFileSync(path.join(BACKUPS, filename), 'utf8')));
}
export const restoreDbData = (target, source = '외부 백업', audit = {}) => exclusive(async () => {
  const clean = validateDbData(target);
  // Preserve unreadable local evidence before allowing external recovery.
  if (!kvConfigured() && !process.env.GITHUB_TOKEN) {
    try { readLocalDb(); } catch (error) {
      if (!error.message.startsWith('DB와 모든 백업')) throw error;
      for (const file of [DB_FILE, MIRROR]) if (fs.existsSync(file)) fs.copyFileSync(file, path.join(BACKUPS, 'corrupt_' + randomUUID() + '.raw'));
      const restored = { ...clean, settings: { ...clean.settings, security: JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'security.backup.json'), 'utf8')) } }; appendAuditLog(restored, 'DATA_RESTORE', source, audit.ip, '상급 관리자'); writeLocalDb(restored); return restored;
    }
  }
  return transaction(async db => {
    await archive(db, 'pre_restore'); // No restore if the pre-restore copy cannot be saved.
    const ids = new Set(clean.logs.map(l => l.id));
    const logs = [...db.logs.filter(l => !ids.has(l.id)), ...clean.logs];
    const security = db.settings.security; // Restoring a backup must never restore old passwords/sessions.
    Object.assign(db, structuredClone(clean)); db.logs = logs;
    db.settings.security = security;
    appendAuditLog(db, 'DATA_RESTORE', source + ' 복원 (' + db.participants.length + '명)', audit.ip, '상급 관리자');
    return db;
  });
});
export function getStorageMode() {
  if (kvConfigured()) return 'Upstash Redis (atomic CAS + remote history)';
  if (process.env.GITHUB_TOKEN) return 'GitHub Cloud Storage';
  if (process.env.VERCEL) return 'Vercel Ephemeral Storage (/tmp)';
  return 'Local Dual Mirror Storage';
}
