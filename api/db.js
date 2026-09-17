import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 데이터 파일 경로 (로컬: data/db.json, Vercel fallback: /tmp/db.json)
const DATA_DIR = process.env.VERCEL ? '/tmp' : path.resolve(__dirname, '../data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

// 기본 스키마
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

// 인메모리 캐시 (서버리스 웜 인스턴스 대응)
let memoryCache = null;
let lastFetchTime = 0;
const CACHE_TTL_MS = 2000; // 2초 캐시

// 1. 디렉토리 확인 및 로컬 파일 초기화
function ensureLocalDb() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(DB_FILE)) {
      fs.writeFileSync(DB_FILE, JSON.stringify(defaultData, null, 2), 'utf-8');
    }
  } catch (err) {
    console.error('[DB] ensureLocalDb error:', err.message);
  }
}

// 2. Upstash / Vercel KV REST 연동 헬퍼
async function getKvData() {
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  if (!url || !token) return null;

  try {
    const res = await fetch(`${url}/get/heyum_booth_data`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) return null;
    const json = await res.json();
    if (json && json.result) {
      return typeof json.result === 'string' ? JSON.parse(json.result) : json.result;
    }
    return null;
  } catch (e) {
    console.error('[DB] Upstash KV read error:', e.message);
    return null;
  }
}

async function saveKvData(data) {
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  if (!url || !token) return false;

  try {
    const res = await fetch(`${url}/set/heyum_booth_data`, {
      method: 'POST',
      headers: { 
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });
    return res.ok;
  } catch (e) {
    console.error('[DB] Upstash KV write error:', e.message);
    return false;
  }
}

// 3. GitHub Contents API 원격 파일 연동 헬퍼 (별도 DB 설치 없는 무료 영구 저장소)
async function getGitHubData() {
  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPO || 'University-Supporters/Random-Chance';
  if (!token) return null;

  try {
    const res = await fetch(`https://api.github.com/repos/${repo}/contents/data/db.json?ref=main`, {
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'Heyum-Booth-App'
      }
    });
    if (!res.ok) return null;
    const json = await res.json();
    if (json && json.content) {
      const contentStr = Buffer.from(json.content, 'base64').toString('utf-8');
      const parsed = JSON.parse(contentStr);
      parsed._gh_sha = json.sha; // 커밋용 sha 보관
      return parsed;
    }
    return null;
  } catch (e) {
    console.error('[DB] GitHub API read error:', e.message);
    return null;
  }
}

async function saveGitHubData(data) {
  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPO || 'University-Supporters/Random-Chance';
  if (!token) return false;

  try {
    // 최신 sha 확인
    let sha = data._gh_sha;
    if (!sha) {
      const checkRes = await fetch(`https://api.github.com/repos/${repo}/contents/data/db.json?ref=main`, {
        headers: {
          'Authorization': `token ${token}`,
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'Heyum-Booth-App'
        }
      });
      if (checkRes.ok) {
        const checkJson = await checkRes.json();
        sha = checkJson.sha;
      }
    }

    const cleanData = { ...data };
    delete cleanData._gh_sha;
    const contentEncoded = Buffer.from(JSON.stringify(cleanData, null, 2), 'utf-8').toString('base64');

    const res = await fetch(`https://api.github.com/repos/${repo}/contents/data/db.json`, {
      method: 'PUT',
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
        'User-Agent': 'Heyum-Booth-App'
      },
      body: JSON.stringify({
        message: 'data: 축제 부스 참여자 데이터 자동 동기화 [skip ci]',
        content: contentEncoded,
        branch: 'main',
        ...(sha ? { sha } : {})
      })
    });

    if (res.ok) {
      const resJson = await res.json();
      data._gh_sha = resJson.content?.sha;
      return true;
    }
    return false;
  } catch (e) {
    console.error('[DB] GitHub API write error:', e.message);
    return false;
  }
}

// 4. 로컬 파일 읽기 / 쓰기
function readLocalDb() {
  ensureLocalDb();
  try {
    if (fs.existsSync(DB_FILE)) {
      return JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
    }
  } catch (e) {
    console.error('[DB] readLocalDb error:', e.message);
  }
  return { ...defaultData };
}

function writeLocalDb(data) {
  ensureLocalDb();
  try {
    const clean = { ...data };
    delete clean._gh_sha;
    const temp = `${DB_FILE}.tmp.${Date.now()}`;
    fs.writeFileSync(temp, JSON.stringify(clean, null, 2), 'utf-8');
    fs.renameSync(temp, DB_FILE);
    return true;
  } catch (e) {
    console.error('[DB] writeLocalDb error:', e.message);
    return false;
  }
}

// ==================== 외부 인터페이스 ====================

// 데이터 가져오기 (비동기, KV -> GitHub -> 로컬 파일 순)
export async function getDbData() {
  const now = Date.now();
  if (memoryCache && (now - lastFetchTime < CACHE_TTL_MS)) {
    return memoryCache;
  }

  // 1순위: Vercel KV / Upstash
  const kvData = await getKvData();
  if (kvData) {
    memoryCache = kvData;
    lastFetchTime = now;
    return kvData;
  }

  // 2순위: GitHub API 영구 저장소
  const ghData = await getGitHubData();
  if (ghData) {
    memoryCache = ghData;
    lastFetchTime = now;
    return ghData;
  }

  // 3순위: 로컬 파일 시스템
  const local = readLocalDb();
  memoryCache = local;
  lastFetchTime = now;
  return local;
}

// 데이터 저장하기 (비동기, 로컬 + 원격 동시 저장)
export async function saveDbData(data) {
  memoryCache = data;
  lastFetchTime = Date.now();

  // 로컬 파일 쓰기
  writeLocalDb(data);

  // Vercel KV가 있으면 비동기 저장
  if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
    saveKvData(data).catch(() => {});
  }

  // GitHub Token이 있으면 비동기 저장
  if (process.env.GITHUB_TOKEN) {
    saveGitHubData(data).catch(() => {});
  }

  return true;
}

// 감사 로그 추가 헬퍼
export async function addAuditLog(action, details, ip = 'unknown', author = '시스템') {
  const db = await getDbData();
  const logEntry = {
    id: 'log_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
    timestamp: new Date().toISOString(),
    action,
    details,
    ip,
    author
  };
  if (!db.logs) db.logs = [];
  db.logs.unshift(logEntry);
  if (db.logs.length > 1000) {
    db.logs = db.logs.slice(0, 1000);
  }
  await saveDbData(db);
  return logEntry;
}

// 현재 연결된 스토리지 모드 확인
export function getStorageMode() {
  if (process.env.KV_REST_API_URL) return 'Vercel KV / Upstash Redis';
  if (process.env.GITHUB_TOKEN) return 'GitHub Cloud Storage (Auto-Commit)';
  if (process.env.VERCEL) return 'Vercel Ephemeral Storage (/tmp)';
  return 'Local Persistent Storage (data/db.json)';
}
