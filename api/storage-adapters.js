// 2. Upstash / Vercel KV REST 연동 헬퍼
export async function getKvData() {
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  if (!url || !token) return null;

  try {
    const res = await fetch(`${url}/get/heyum_booth_data`, {
      signal: AbortSignal.timeout(10000),
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) throw new Error('원격 저장소 조회 실패');
    const json = await res.json();
    if (json?.error) throw new Error('원격 저장소 조회 실패');
    if (json && json.result) {
      return typeof json.result === 'string' ? JSON.parse(json.result) : json.result;
    }
    return null;
  } catch (e) {
    throw e;
  }
}

export async function saveKvData(data) {
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  if (!url || !token) return false;

  try {
    const res = await fetch(`${url}/set/heyum_booth_data`, {
      method: 'POST',
      signal: AbortSignal.timeout(10000),
      headers: { 
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });
    const payload = await res.json();
    return res.ok && !payload.error;
  } catch (e) {
    console.error('[DB] Upstash KV write error:', e.message);
    return false;
  }
}

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
    return false;
  } catch (e) {
    console.error('[DB] GitHub API write error:', e.message);
    return false;
  }
}

