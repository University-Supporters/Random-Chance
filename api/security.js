import { randomBytes, scryptSync, timingSafeEqual, createHash } from 'node:crypto';
import { getDbData, getSecurityState, updateDbData, appendAuditLog } from './db.js';

function state(db) {
  db.settings.security ||= { version: 0, revoked: {}, attempts: {} };
  const security = db.settings.security;
  security.revoked ||= {}; security.attempts ||= {};
  for (const [key, expiry] of Object.entries(security.revoked)) if (expiry < Date.now()) delete security.revoked[key];
  for (const [key, value] of Object.entries(security.attempts)) if (value.until < Date.now()) delete security.attempts[key];
  return security;
}
function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  return salt + ':' + scryptSync(password, salt, 32).toString('hex');
}
function matches(password, stored, fallback) {
  if (typeof password !== 'string' || password.length > 128) return false;
  if (!stored) {
    const a = Buffer.from(password), b = Buffer.from(fallback);
    return a.length === b.length && timingSafeEqual(a,b);
  }
  const [salt, hash] = stored.split(':');
  const expected = Buffer.from(hash, 'hex'), actual = scryptSync(password, salt, 32);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
export async function verifyPassword(role, password) {
  const security = state({settings:{security:await getSecurityState()}});
  const fallback = role === 'admin' ? process.env.ADMIN_PASSWORD || '1111' : process.env.SUPER_ADMIN_PASSWORD || '9372707';
  return { ok: matches(password, security[role + 'Hash'], fallback), version: security.version || 0 };
}
export async function sessionActive(auth) {
  const security = state({settings:{security:await getSecurityState()}});
  return (auth.version || 0) === (security.version || 0) && !security.revoked[auth.session];
}
export const revokeSession = auth => updateDbData(db => { state(db).revoked[auth.session] = auth.exp; appendAuditLog(db, 'ADMIN_LOGOUT', '관리자 세션 종료', 'unknown', '관리자'); });
export const allowLoginAttempt = (ip, route) => updateDbData(db => {
  const security = state(db);
  const key = createHash('sha256').update(ip + ':' + route.toLowerCase()).digest('hex');
  const attempt = security.attempts[key] || { count: 0, until: Date.now() + 60000 };
  attempt.count++; security.attempts[key] = attempt;
  return attempt.count <= 20;
});
export async function securityStatus() {
  const security = state({settings:{security:await getSecurityState()}});
  return { defaultAdminPassword: !security.adminHash && (!process.env.ADMIN_PASSWORD || process.env.ADMIN_PASSWORD === '1111'), defaultSuperPassword: !security.superHash && (!process.env.SUPER_ADMIN_PASSWORD || process.env.SUPER_ADMIN_PASSWORD === '9372707') };
}
export async function changePasswords(input, ip) {
  const passwords = ['adminPassword','superPassword'];
  if (!passwords.some(key => input[key])) throw Object.assign(new Error('변경할 비밀번호를 입력해 주세요.'), { status: 400 });
  for (const key of passwords) if (input[key] && (typeof input[key] !== 'string' || input[key].length < 12 || input[key].length > 128 || ['1111','9372707'].includes(input[key]))) throw Object.assign(new Error('새 비밀번호는 12~128자로 입력해 주세요.'), { status: 400 });
  if (input.adminPassword && input.adminPassword === input.superPassword) throw Object.assign(new Error('일반·상급 비밀번호는 서로 달라야 합니다.'), { status: 400 });
  if (input.adminPassword && (await verifyPassword('super', input.adminPassword)).ok) throw Object.assign(new Error('일반·상급 비밀번호는 서로 달라야 합니다.'), { status: 400 });
  if (input.superPassword && (await verifyPassword('admin', input.superPassword)).ok) throw Object.assign(new Error('일반·상급 비밀번호는 서로 달라야 합니다.'), { status: 400 });
  const hashes = {};
  for (const key of passwords) if (input[key]) hashes[key === 'adminPassword' ? 'adminHash' : 'superHash'] = hashPassword(input[key]);
  return updateDbData(db => {
    const security = state(db);
    Object.assign(security, hashes); security.version = (security.version || 0) + 1; security.revoked = {};
    appendAuditLog(db, 'PASSWORD_CHANGE', '운영 비밀번호 변경 및 기존 세션 만료', ip, '상급 관리자');
  });
}
