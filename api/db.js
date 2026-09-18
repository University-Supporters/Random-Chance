import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import { getKvData, saveKvData, getGitHubData, saveGitHubData } from './storage-adapters.js';

const DATA_DIR = process.env.DATA_DIR || (process.env.VERCEL ? '/tmp' : path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../data'));
const DB_FILE = path.join(DATA_DIR, 'db.json');
const MIRROR = path.join(DATA_DIR, 'db.backup.json');
const BACKUPS = path.join(DATA_DIR, 'backups');
const defaults = () => ({ participants: [], winners: [], logs: [], settings: { drawCount: 50, allowDuplicatePhone: false, allowDuplicateStudentId: false } });
let lastSnapshot = 0;
let queue = Promise.resolve();
// Serialize the complete read–validate–write transaction within this Node process.
function exclusive(work) {
  const result = queue.then(work);
  queue = result.catch(() => {});
  return result;
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
    return { ...participants.find(p => p.id === w.id), rank: w.rank, wonAt: w.wonAt };
  });
  if ((input.logs || []).some(l => !l || typeof l.id !== 'string' || typeof l.action !== 'string' || typeof l.details !== 'string' || !Number.isFinite(Date.parse(l.timestamp)))) invalid();
  return { ...input, participants, winners, logs: input.logs || [], settings: { ...defaults().settings, ...input.settings, allowDuplicatePhone: false, allowDuplicateStudentId: false } };
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
function writeLocalDb(data, force = false) {
  ensureDirectories();
  const clean = { ...data }; delete clean._gh_sha;
  atomicWrite(DB_FILE, clean); atomicWrite(MIRROR, clean);
  if (force || Date.now() - lastSnapshot >= 300000) { snapshot(clean); lastSnapshot = Date.now(); }
}
async function readData() {
  if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
    const data = await getKvData();
    return data ? validateDbData(data) : readLocalDb();
  }
  if (process.env.GITHUB_TOKEN) {
    const data = await getGitHubData();
    if (!data) throw new Error('원격 저장소 데이터가 없습니다.');
    return validateDbData(data);
  }
  return readLocalDb();
}
async function persist(data, force = false) {
  const valid = validateDbData(data);
  if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
    if (!await saveKvData(valid)) throw new Error('원격 저장 실패');
  } else if (process.env.GITHUB_TOKEN) {
    if (!await saveGitHubData(valid)) throw new Error('원격 저장 실패');
  }
  writeLocalDb(valid, force);
  return valid;
}
export const getDbData = () => exclusive(async () => structuredClone(await readData()));
export const saveDbData = (data, force = false) => exclusive(() => persist(data, force));
export const updateDbData = (mutate, force = false) => exclusive(async () => {
  const db = structuredClone(await readData());
  const result = await mutate(db);
  await persist(db, force);
  return result;
});
export function appendAuditLog(db, action, details, ip = 'unknown', author = '시스템') {
  const entry = { id: `log_${randomUUID()}`, timestamp: new Date().toISOString(), action, details, ip, author };
  db.logs.unshift(entry);
  return entry;
}
export const addAuditLog = (...args) => updateDbData(db => appendAuditLog(db, ...args));
export const createManualSnapshot = () => exclusive(async () => snapshot(await readData(), 'manual'));
export function getAvailableSnapshots() {
  return snapshotNames().map(filename => {
    const stat = fs.statSync(path.join(BACKUPS, filename));
    return { filename, sizeBytes: stat.size, createdAt: stat.mtime.toISOString(), isManual: filename.startsWith('manual_') };
  });
}
export function readSnapshot(filename) {
  if (typeof filename !== 'string' || !snapshotNames().includes(filename)) {
    const error = new Error('해당 스냅샷을 찾을 수 없습니다.'); error.status = 404; throw error;
  }
  return validateDbData(JSON.parse(fs.readFileSync(path.join(BACKUPS, filename), 'utf8')));
}
export const restoreDbData = (target, source = '외부 백업', audit = {}) => exclusive(async () => {
  const restored = validateDbData(target);
  let current;
  try { current = await readData(); }
  catch (error) {
    // External recovery remains possible when every local recovery copy is corrupt.
    // Never use this path for remote outages or ordinary disk permission failures.
    if (!error.message.startsWith('DB와 모든 백업')) throw error;
    ensureDirectories();
    for (const file of [DB_FILE, MIRROR]) {
      if (fs.existsSync(file)) fs.copyFileSync(file, path.join(BACKUPS, 'corrupt_' + randomUUID() + '.raw'));
    }
    current = defaults();
  }
  snapshot(current, 'pre_restore');
  if (current._gh_sha) restored._gh_sha = current._gh_sha;
  else delete restored._gh_sha;
  const ids = new Set(restored.logs.map(l => l.id));
  restored.logs = [...current.logs.filter(l => !ids.has(l.id)), ...restored.logs];
  appendAuditLog(restored, 'DATA_RESTORE', `${source} 복원 (${restored.participants.length}명)`, audit.ip, '상급 관리자');
  return persist(restored, true);
});
export function getStorageMode() {
  if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) return 'Vercel KV / Upstash Redis';
  if (process.env.GITHUB_TOKEN) return 'GitHub Cloud Storage';
  if (process.env.VERCEL) return 'Vercel Ephemeral Storage (/tmp)';
  return 'Local Dual Mirror Storage';
}
