// Redis REST: compare the exact version read before atomically replacing all copies.
export const KV_KEYS = { main: 'heyum_booth_data', mirror: 'heyum_booth_data:mirror', history: 'heyum_booth_data:history', archives: 'heyum_booth_data:archives' };
export function kvConfigured() { return Boolean((process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL) && (process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN)); }
export async function kvCommand(command) {
  const response = await fetch(process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL, {
    method: 'POST', signal: AbortSignal.timeout(10000), cache: 'no-store',
    headers: { Authorization: 'Bearer ' + (process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN), 'Content-Type': 'application/json' },
    body: JSON.stringify(command)
  });
  const payload = await response.json();
  if (!response.ok || payload.error) throw new Error('영구 저장소 요청에 실패했습니다.');
  return payload.result;
}
export const CAS_SCRIPT = `
local current = redis.call('GET', KEYS[1])
if (current or '') ~= ARGV[1] then return 0 end
-- Validate history type before any writes: Lua errors do not roll back earlier commands.
local historyType = redis.call('TYPE', KEYS[3]).ok
if historyType ~= 'none' and historyType ~= 'list' then return redis.error_reply('invalid history type') end
redis.call('SET', KEYS[1], ARGV[2])
redis.call('SET', KEYS[2], ARGV[2])
redis.call('LPUSH', KEYS[3], ARGV[2])
redis.call('LTRIM', KEYS[3], 0, 39)
return 1
`;
export const getKvRaw = () => kvCommand(['GET', KV_KEYS.main]);
export const compareAndSaveKv = (expected, data) => kvCommand(['EVAL', CAS_SCRIPT, 3, KV_KEYS.main, KV_KEYS.mirror, KV_KEYS.history, expected || '', JSON.stringify(data)]);

// 3. GitHub Contents API 원격 파일 연동 헬퍼 (별도 DB 설치 없는 무료 영구 저장소)
export async function getGitHubData() {
  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPO || 'University-Supporters/Random-Chance';
  if (!token) return null;

  try {
    const res = await fetch(`https://api.github.com/repos/${repo}/contents/data/db.json?ref=main`, {
      signal: AbortSignal.timeout(10000),
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'Heyum-Booth-App'
      }
    });
    if (!res.ok) throw new Error('원격 저장소 조회 실패');
    const json = await res.json();
    if (json && json.content) {
      const contentStr = Buffer.from(json.content, 'base64').toString('utf-8');
      const parsed = JSON.parse(contentStr);
      parsed._gh_sha = json.sha; // 커밋용 sha 보관
      return parsed;
    }
    return null;
  } catch (e) {
    throw e;
  }
}

export async function saveGitHubData(data) {
  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPO || 'University-Supporters/Random-Chance';
  if (!token) return false;

  try {
    let sha = data._gh_sha;
    if (!sha) {
      const checkRes = await fetch(`https://api.github.com/repos/${repo}/contents/data/db.json?ref=main`, {
        signal: AbortSignal.timeout(10000),
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
      signal: AbortSignal.timeout(10000),
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
    if (res.status === 409 || res.status === 422) return 'conflict';
    return false;
  } catch (e) {
    console.error('[DB] GitHub API write error:', e.message);
    return false;
  }
}

