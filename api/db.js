import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 데이터 파일 경로 설정 (로컬 환경: data/db.json, Vercel 서버리스: /tmp/db.json fallback 지원)
const DATA_DIR = process.env.VERCEL ? '/tmp' : path.resolve(__dirname, '../data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

// 초기 데이터 구조
const defaultData = {
  participants: [],
  logs: [],
  winners: [],
  settings: {
    drawCount: 50,
    allowDuplicatePhone: false,
    allowDuplicateStudentId: false,
  }
};

// 디렉토리 및 파일 초기화 보장
function ensureDb() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(DB_FILE)) {
      fs.writeFileSync(DB_FILE, JSON.stringify(defaultData, null, 2), 'utf-8');
    }
  } catch (err) {
    console.error('Error ensuring DB directory/file:', err);
  }
}

ensureDb();

// DB 데이터 읽기
export function getDbData() {
  try {
    ensureDb();
    if (!fs.existsSync(DB_FILE)) {
      return { ...defaultData };
    }
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('Error reading DB:', err);
    return { ...defaultData };
  }
}

// DB 데이터 저장 (안전한 원자적 쓰기)
export function saveDbData(data) {
  try {
    ensureDb();
    const tempFile = `${DB_FILE}.tmp.${Date.now()}`;
    fs.writeFileSync(tempFile, JSON.stringify(data, null, 2), 'utf-8');
    fs.renameSync(tempFile, DB_FILE);
    return true;
  } catch (err) {
    console.error('Error writing DB:', err);
    return false;
  }
}

// 감사 로그 기록 헬퍼
export function addAuditLog(action, details, ip = 'unknown', author = '시스템') {
  const db = getDbData();
  const logEntry = {
    id: 'log_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
    timestamp: new Date().toISOString(),
    action, // 'PARTICIPANT_REGISTER', 'PARTICIPANT_ADD', 'PARTICIPANT_DELETE', 'RAFFLE_DRAW', 'ADMIN_LOGIN' 등
    details,
    ip,
    author
  };
  db.logs.unshift(logEntry); // 최신순
  // 최근 1000개까지만 유지
  if (db.logs.length > 1000) {
    db.logs = db.logs.slice(0, 1000);
  }
  saveDbData(db);
  return logEntry;
}
