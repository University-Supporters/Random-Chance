import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { getDbData, saveDbData, addAuditLog, getStorageMode } from './api/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'heyum2026!';

app.use(cors());
app.use(express.json());

// Vercel Serverless 요청 URL 정규화 미들웨어 (요청이 /api/... 또는 /... 로 들어올 때 모두 지원)
app.use((req, res, next) => {
  if (req.url.startsWith('/api/')) {
    req.normalizedPath = req.url.slice(4); // '/api' 제거
  } else {
    req.normalizedPath = req.url;
  }
  next();
});

// IP 추출 헬퍼
function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return req.socket.remoteAddress || req.ip || '127.0.0.1';
}

// 관리자 인증 미들웨어
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ success: false, message: '관리자 인증 토큰이 필요합니다.' });
  }
  const token = authHeader.replace(/^Bearer\s+/i, '');
  if (token !== ADMIN_PASSWORD) {
    return res.status(403).json({ success: false, message: '유효하지 않은 관리자 비밀번호입니다.' });
  }
  next();
}

// 라우터 래퍼 (Express 라우트가 /api/xxx 와 /xxx 모두에 반응하도록 매핑)
const router = express.Router();

// 1. 참여자 등록 (사용자 페이지)
router.post('/participants', async (req, res) => {
  try {
    const { studentId, name, phone } = req.body;
    const clientIp = getClientIp(req);

    if (!studentId || !name || !phone) {
      return res.status(400).json({ success: false, message: '학번, 이름, 전화번호를 모두 입력해주세요.' });
    }

    const cleanPhone = phone.replace(/[^0-9]/g, '');
    const cleanStudentId = studentId.trim();
    const cleanName = name.trim();

    if (cleanPhone.length < 10 || cleanPhone.length > 11) {
      return res.status(400).json({ success: false, message: '올바른 전화번호 10~11자리를 입력해주세요.' });
    }

    const db = await getDbData();
    if (!db.participants) db.participants = [];

    // 중복 체크
    const existingPhone = db.participants.find(p => p.phoneClean === cleanPhone);
    if (existingPhone) {
      return res.status(409).json({ 
        success: false, 
        message: '이미 해당 전화번호로 참여하신 내역이 있습니다. (1인 1회 참여)' 
      });
    }

    const existingStudentId = db.participants.find(p => p.studentId === cleanStudentId);
    if (existingStudentId) {
      return res.status(409).json({ 
        success: false, 
        message: '이미 해당 학번으로 참여하신 내역이 있습니다. (1인 1회 참여)' 
      });
    }

    // 신규 등록
    const newParticipant = {
      id: 'p_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      studentId: cleanStudentId,
      name: cleanName,
      phone: phone.trim(),
      phoneClean: cleanPhone,
      createdAt: new Date().toISOString(),
      ip: clientIp,
    };

    db.participants.push(newParticipant);
    await saveDbData(db);

    // 감사 로그 기록
    await addAuditLog(
      'PARTICIPANT_REGISTER',
      `신규 참가자 등록: ${cleanName} (${cleanStudentId}, ${cleanPhone.slice(0, 3)}-****-${cleanPhone.slice(-4)})`,
      clientIp,
      '사용자'
    );

    res.status(201).json({
      success: true,
      message: '이벤트 응모가 성공적으로 완료되었습니다!',
      data: {
        id: newParticipant.id,
        name: newParticipant.name,
        createdAt: newParticipant.createdAt
      }
    });
  } catch (err) {
    console.error('Participant register error:', err);
    res.status(500).json({ success: false, message: '서버 내부 오류가 발생했습니다.' });
  }
});

// 2. 관리자 로그인
router.post('/admin/login', async (req, res) => {
  const { password } = req.body;
  const clientIp = getClientIp(req);

  if (password === ADMIN_PASSWORD) {
    await addAuditLog('ADMIN_LOGIN_SUCCESS', '관리자 대시보드 로그인 성공', clientIp, '관리자');
    return res.json({ 
      success: true, 
      token: ADMIN_PASSWORD,
      message: '관리자 인증 성공' 
    });
  } else {
    await addAuditLog('ADMIN_LOGIN_FAIL', '관리자 로그인 시도 실패 (비밀번호 불일치)', clientIp, '미승인');
    return res.status(401).json({ 
      success: false, 
      message: '비밀번호가 올바르지 않습니다.' 
    });
  }
});

// 3. 관리자 참여자 목록 및 통계 조회
router.get('/admin/participants', authMiddleware, async (req, res) => {
  try {
    const db = await getDbData();
    res.json({
      success: true,
      totalCount: (db.participants || []).length,
      participants: db.participants || [],
      winners: db.winners || [],
      storageMode: getStorageMode()
    });
  } catch (err) {
    res.status(500).json({ success: false, message: '데이터 조회 실패' });
  }
});

// 4. 관리자 수동 참여자 추가
router.post('/admin/participants', authMiddleware, async (req, res) => {
  try {
    const { studentId, name, phone } = req.body;
    const clientIp = getClientIp(req);

    if (!studentId || !name || !phone) {
      return res.status(400).json({ success: false, message: '모든 필드를 입력해주세요.' });
    }

    const cleanPhone = phone.replace(/[^0-9]/g, '');
    const db = await getDbData();
    if (!db.participants) db.participants = [];

    const newParticipant = {
      id: 'p_admin_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      studentId: studentId.trim(),
      name: name.trim(),
      phone: phone.trim(),
      phoneClean: cleanPhone,
      createdAt: new Date().toISOString(),
      ip: `${clientIp} (운영진 수동 등록)`,
    };

    db.participants.push(newParticipant);
    await saveDbData(db);

    await addAuditLog(
      'ADMIN_ADD_PARTICIPANT',
      `운영진 수동 추가: ${newParticipant.name} (${newParticipant.studentId})`,
      clientIp,
      '관리자'
    );

    res.status(201).json({ success: true, participant: newParticipant });
  } catch (err) {
    res.status(500).json({ success: false, message: '수동 추가 실패' });
  }
});

// 5. 관리자 참여자 삭제
router.delete('/admin/participants/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { reason = '운영진에 의한 삭제' } = req.body || {};
    const clientIp = getClientIp(req);

    const db = await getDbData();
    if (!db.participants) db.participants = [];

    const targetIndex = db.participants.findIndex(p => p.id === id);
    if (targetIndex === -1) {
      return res.status(404).json({ success: false, message: '해당 참가자를 찾을 수 없습니다.' });
    }

    const removed = db.participants.splice(targetIndex, 1)[0];
    if (db.winners) {
      db.winners = db.winners.filter(w => w.id !== id);
    }
    await saveDbData(db);

    await addAuditLog(
      'ADMIN_DELETE_PARTICIPANT',
      `참가자 삭제: ${removed.name} (${removed.studentId}, ${removed.phone}) - 사유: ${reason}`,
      clientIp,
      '관리자'
    );

    res.json({ success: true, message: '삭제되었습니다.', removed });
  } catch (err) {
    res.status(500).json({ success: false, message: '삭제 실패' });
  }
});

// 6. 관리자 감사 로그 목록 조회
router.get('/admin/logs', authMiddleware, async (req, res) => {
  try {
    const db = await getDbData();
    res.json({
      success: true,
      logs: db.logs || []
    });
  } catch (err) {
    res.status(500).json({ success: false, message: '로그 조회 실패' });
  }
});

// 7. 50명 랜덤 추첨 실행
router.post('/admin/draw', authMiddleware, async (req, res) => {
  try {
    const { count = 50 } = req.body;
    const clientIp = getClientIp(req);
    const db = await getDbData();

    if (!db.participants || db.participants.length === 0) {
      return res.status(400).json({ success: false, message: '참여자가 없습니다.' });
    }

    const pool = [...db.participants];
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }

    const drawCount = Math.min(count, pool.length);
    const selectedWinners = pool.slice(0, drawCount).map((p, index) => ({
      ...p,
      rank: index + 1,
      wonAt: new Date().toISOString()
    }));

    db.winners = selectedWinners;
    await saveDbData(db);

    await addAuditLog(
      'RAFFLE_DRAW',
      `랜덤 추첨 진행: 총 ${pool.length}명 중 ${drawCount}명 당첨자 선발 완료`,
      clientIp,
      '관리자'
    );

    res.json({
      success: true,
      message: `${drawCount}명의 당첨자가 추첨되었습니다.`,
      winners: selectedWinners
    });
  } catch (err) {
    res.status(500).json({ success: false, message: '추첨 실행 실패' });
  }
});

// 8. 당첨자 목록 조회
router.get('/admin/winners', authMiddleware, async (req, res) => {
  try {
    const db = await getDbData();
    res.json({
      success: true,
      winners: db.winners || []
    });
  } catch (err) {
    res.status(500).json({ success: false, message: '당첨자 조회 실패' });
  }
});

// 9. 추첨 결과 초기화
router.post('/admin/reset-draw', authMiddleware, async (req, res) => {
  try {
    const clientIp = getClientIp(req);
    const db = await getDbData();
    db.winners = [];
    await saveDbData(db);

    await addAuditLog('RAFFLE_RESET', '추첨 당첨자 명단 초기화', clientIp, '관리자');

    res.json({ success: true, message: '추첨 결과가 초기화되었습니다.' });
  } catch (err) {
    res.status(500).json({ success: false, message: '초기화 실패' });
  }
});

// 10. 스토리지 및 시스템 상태 정보
router.get('/admin/system', authMiddleware, (req, res) => {
  res.json({
    success: true,
    storageMode: getStorageMode(),
    environment: process.env.VERCEL ? 'Vercel Serverless' : 'Local / Docker Node Server',
    timestamp: new Date().toISOString()
  });
});

// 헬스체크
router.get('/health', (req, res) => {
  res.json({ status: 'ok', storageMode: getStorageMode(), timestamp: new Date().toISOString() });
});

// 라우터를 /api 와 루트 양쪽에 마운트
app.use('/api', router);
app.use('/', router);

// 프로덕션 빌드 정적 서빙
const distPath = path.resolve(__dirname, 'dist');
app.use(express.static(distPath));

app.get('*', (req, res) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ error: 'API route not found' });
  }
  const indexHtml = path.join(distPath, 'index.html');
  res.sendFile(indexHtml);
});

if (process.env.NODE_ENV !== 'test' && !process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`[서버 구동] 포트 ${PORT}에서 축제 부스 상품권 서버가 실행 중입니다.`);
    console.log(`스토리지 모드: ${getStorageMode()}`);
    console.log(`관리자 기본 비밀번호: ${ADMIN_PASSWORD}`);
  });
}

export default app;
