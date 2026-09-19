import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID, randomInt } from 'node:crypto';
import { verifyPassword, sessionActive, revokeSession, allowLoginAttempt, securityStatus, changePasswords } from './api/security.js';
import { createSessionTokens } from './api/session.js';
import { getDbData, updateDbData, appendAuditLog, addAuditLog, getStorageMode, getStorageStatus, requireDurableRegistration, createManualSnapshot, getAvailableSnapshots, restoreDbData, readSnapshot } from './api/db.js';

const app = express();
const root = path.dirname(fileURLToPath(import.meta.url));

const sessionTokens = createSessionTokens();
const asyncRoute = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const fail = (status, message) => { const error = new Error(message); error.status = status; throw error; };
const ip = req => req.ip || req.socket.remoteAddress || 'unknown';
app.disable('x-powered-by');
app.disable('etag');
app.use((req, res, next) => {
  res.set({ 'Cache-Control': 'no-store, no-cache, must-revalidate, private', Pragma: 'no-cache', Expires: '0', 'X-Content-Type-Options': 'nosniff' });
  next();
});
app.use(express.json({ limit: '10mb' }));
export const authMiddleware = asyncRoute(async (req, res, next) => {
  const match = /^Bearer (.+)$/i.exec(req.headers.authorization || '');
  req.auth = await sessionTokens.verify(match?.[1], 'admin');
  if (!req.auth || !await sessionActive(req.auth)) return res.status(401).json({ success: false, message: '관리자 인증이 만료되었습니다. 다시 로그인해 주세요.' });
  next();
});
export const superAuthMiddleware = asyncRoute(async (req, res, next) => {
  const auth = await sessionTokens.verify(req.headers['x-super-token'], 'super');
  if (!auth || auth.session !== req.auth.session) return res.status(403).json({ success: false, message: '상급 관리자 2차 인증이 필요합니다.' });
  next();
});
const loginLimit = asyncRoute(async (req, res, next) => {
  if (!await allowLoginAttempt(ip(req), req.path)) return res.status(429).json({ success: false, message: '인증 시도가 많습니다. 1분 후 다시 시도해 주세요.' });
  next();
});
const router = express.Router();
router.post('/admin/login', loginLimit, asyncRoute(async (req,res) => {
  const { ok, version } = await verifyPassword('admin', req.body?.password);
  await addAuditLog(ok ? 'ADMIN_LOGIN_SUCCESS' : 'ADMIN_LOGIN_FAIL', ok ? '관리자 로그인 성공' : '관리자 로그인 실패', ip(req), '관리자');
  if (!ok) fail(401, '비밀번호가 올바르지 않습니다.');
  res.json({ success: true, token: await sessionTokens.issue('admin', randomUUID(), version) });
}));
router.post('/admin/super-auth', authMiddleware, loginLimit, asyncRoute(async (req,res) => {
  const { ok, version } = await verifyPassword('super', req.body?.superPassword);
  await addAuditLog(ok ? 'SUPER_LOGIN_SUCCESS' : 'SUPER_LOGIN_FAIL', ok ? '상급 관리자 인증 성공' : '상급 관리자 인증 실패', ip(req), '관리자');
  if (!ok) fail(403, '상급 관리자 비밀번호가 일치하지 않습니다.');
  res.json({ success: true, superToken: await sessionTokens.issue('super', req.auth.session, version) });
}));
function participantInput(body) {
  if (!body || ['studentId','name','phone'].some(key => typeof body[key] !== 'string')) fail(400, '학번, 이름, 전화번호를 입력해 주세요.');
  const studentId = body.studentId.trim(), name = body.name.trim(), phone = body.phone.trim();
  if (!/^60\d{6}$/.test(studentId)) fail(400, '학번은 60으로 시작하는 8자리 숫자여야 합니다.');
  if (!name || name.length > 20) fail(400, '이름은 1~20자로 입력해 주세요.');
  const phoneClean = phone.replace(/[^0-9]/g, '');
  if (!/^[\d\s()+-]+$/.test(phone) || !/^\d{10,11}$/.test(phoneClean)) fail(400, '전화번호는 10~11자리 숫자로 입력해 주세요.');
  if (typeof body.instagram !== 'string') fail(400, '인스타그램 아이디 또는 계정 없음을 선택해 주세요.');
  const raw = body.instagram.trim().replace(/^@+/, '');
  const instagram = body.noInstagram === true || raw === '없음' ? '없음' : `@${raw}`;
  if (instagram !== '없음' && !/^[A-Za-z0-9._]{1,30}$/.test(raw)) fail(400, '올바른 인스타그램 아이디를 입력해 주세요.');
  return { studentId, name, phone, phoneClean, instagram };
}
const register = manual => asyncRoute(async (req,res) => {
  requireDurableRegistration();
  const entry = participantInput(req.body);
  const participant = await updateDbData(db => {
    if (db.participants.some(p => p.studentId === entry.studentId || p.phoneClean === entry.phoneClean)) fail(409, '이미 등록된 학번 또는 전화번호입니다. (1인 1회 응모)');
    const participant = { ...entry, id: `p_${randomUUID()}`, createdAt: new Date().toISOString(), ip: ip(req) };
    db.participants.push(participant);
    appendAuditLog(db, manual ? 'ADMIN_ADD_PARTICIPANT' : 'PARTICIPANT_REGISTER', `${manual ? '수동' : '신규'} 등록: ${entry.name} (${entry.studentId})`, ip(req), manual ? '관리자' : '부스 참가자');
    return participant;
  });
  res.status(201).json({ success: true, ...(manual ? { participant } : { data: { id: participant.id, name: participant.name, createdAt: participant.createdAt } }) });
});
router.post('/participants', register(false));
// All admin routes below require first-stage authentication, including all backup routes.
router.use('/admin', authMiddleware);
router.get('/admin/participants', asyncRoute(async (req,res) => {
  const db = await getDbData();
  res.json({ success: true, totalCount: db.participants.length, participants: db.participants.sort((a,b) => Date.parse(b.createdAt || 0) - Date.parse(a.createdAt || 0)), storageMode: getStorageMode(), storage: getStorageStatus() });
}));
router.post('/admin/participants', register(true));
router.post('/admin/logout', asyncRoute(async (req,res) => { await revokeSession(req.auth); res.json({ success: true }); }));
router.delete('/admin/participants/:id', asyncRoute(async (req,res) => {
  await updateDbData(db => {
    const participant = db.participants.find(p => p.id === req.params.id);
    if (!participant) fail(404, '해당 참여자를 찾을 수 없습니다.');
    const reason = typeof req.body?.reason === 'string' ? req.body.reason.slice(0, 300) : '운영진 삭제';
    db.participants = db.participants.filter(p => p.id !== participant.id);
    db.winners = db.winners.filter(p => p.id !== participant.id);
    appendAuditLog(db, 'ADMIN_DELETE_PARTICIPANT', `${participant.name} (${participant.studentId}) 삭제: ${reason}`, ip(req), '관리자');
  });
  res.json({ success: true, message: '삭제되었습니다.' });
}));
router.get('/admin/system', (req,res) => res.json({ success: true, storageMode: getStorageMode(), timestamp: new Date().toISOString() }));
// Second-stage boundary: no protected operation can bypass x-super-token.
router.use('/admin', superAuthMiddleware);
router.get('/admin/security', asyncRoute(async (req,res) => res.json({success: true, ...await securityStatus()})));
router.post('/admin/security/passwords', asyncRoute(async (req,res) => { requireDurableRegistration(); await changePasswords(req.body || {}, ip(req)); res.json({success: true, message:'비밀번호가 변경되었습니다. 다시 로그인해 주세요.'}); }));
router.get('/admin/logs', asyncRoute(async (req,res) => res.json({ success: true, logs: (await getDbData()).logs })));
router.get('/admin/winners', asyncRoute(async (req,res) => res.json({ success: true, winners: (await getDbData()).winners })));
router.post('/admin/draw', asyncRoute(async (req,res) => {
  if (req.body?.count !== undefined && req.body.count !== 50) fail(400, '추첨 인원은 50명입니다.');
  const winners = await updateDbData(db => {
    if (!db.participants.length) fail(400, '참여자가 없습니다.');
    if (db.winners.length) fail(409, '이미 추첨이 완료되었습니다. 다시 추첨하려면 결과를 초기화해 주세요.');
    const pool = [...db.participants];
    for (let i = pool.length - 1; i > 0; i--) { const j = randomInt(i + 1); [pool[i],pool[j]] = [pool[j],pool[i]]; }
    db.winners = pool.slice(0,50).map((p,i) => ({ ...p, rank: i+1, wonAt: new Date().toISOString() }));
    appendAuditLog(db, 'RAFFLE_DRAW', `${pool.length}명 중 ${db.winners.length}명 추첨`, ip(req), '상급 관리자');
    return db.winners;
  });
  res.json({ success: true, winners });
}));
router.post('/admin/reset-draw', asyncRoute(async (req,res) => {
  await updateDbData(db => { db.winners = []; appendAuditLog(db, 'RAFFLE_RESET', '추첨 결과 초기화', ip(req), '상급 관리자'); });
  res.json({ success: true });
}));
router.post('/admin/reset-all', asyncRoute(async (req,res) => {
  await restoreDbData({ participants: [], winners: [], logs: [] }, '전체 초기화', { ip: ip(req) });
  res.json({ success: true, message: '전체 데이터가 초기화되었습니다. 이전 상태는 스냅샷에 보관됩니다.' });
}));
router.get('/admin/backup/download', asyncRoute(async (req,res) => {
  await addAuditLog('BACKUP_DOWNLOAD', '전체 DB 백업 다운로드', ip(req), '상급 관리자');
  const db = await getDbData(); delete db._gh_sha;
  res.attachment(`heyum_backup_${new Date().toISOString().slice(0,10)}.json`).json(db);
}));
// Read-only full snapshot used for Local Vault, without polluting the audit log on each poll.
router.get('/admin/backup/vault', asyncRoute(async (req,res) => {
  const db = await getDbData(); delete db._gh_sha; res.json({ success: true, db });
}));
router.get('/admin/backup/snapshots', asyncRoute(async (req,res) => res.json({ success: true, snapshots: await getAvailableSnapshots() })));
router.post('/admin/backup/snapshot', asyncRoute(async (req,res) => {
  const snapshot = await createManualSnapshot();
  await addAuditLog('BACKUP_SNAPSHOT_CREATE', `스냅샷 생성: ${snapshot.filename}`, ip(req), '상급 관리자');
  res.json({ success: true, snapshot });
}));
router.post('/admin/backup/restore', asyncRoute(async (req,res) => {
  const db = await restoreDbData(req.body?.backupData, '업로드 / 로컬 금고', { ip: ip(req) });
  res.json({ success: true, message: `${db.participants.length}명 데이터 복원 완료`, participantCount: db.participants.length });
}));
router.post('/admin/backup/rollback-snapshot', asyncRoute(async (req,res) => {
  const db = await readSnapshot(req.body?.filename);
  await restoreDbData(db, req.body.filename, { ip: ip(req) });
  res.json({ success: true, message: '스냅샷 복원이 완료되었습니다.' });
}));
router.get('/status', (req,res) => res.json({ success: true, storage: getStorageStatus() }));
router.get('/health', (req,res) => res.json({ status: 'ok', storageMode: getStorageMode() }));
app.use('/api', router);
app.use('/', (req, res, next) => /^\/admin\/?$/.test(req.path) ? next() : router(req, res, next));
app.use('/api', (req,res) => res.status(404).json({ success: false, message: 'API를 찾을 수 없습니다.' }));
app.use(express.static(path.join(root, 'dist')));
app.get('*', (req,res) => res.sendFile(path.join(root, 'dist/index.html')));
app.use((err,req,res,next) => {
  const status = err.type === 'entity.too.large' ? 413 : err.status || 500;
  if (status >= 500) console.error('[API]', err.message);
  res.status(status).json({ success: false, message: status === 413 ? '백업 파일은 10MB 이하여야 합니다.' : status === 503 ? err.message : status >= 500 ? '저장 또는 조회에 실패했습니다. 연결과 저장소 상태를 확인해 주세요.' : err.type === 'entity.parse.failed' ? '올바른 JSON 데이터를 보내 주세요.' : err.message });
});
if (process.env.NODE_ENV !== 'test' && !process.env.VERCEL) app.listen(process.env.PORT || 3001, () => console.log('혜윰 부스 서버 실행 중'));
export default app;
