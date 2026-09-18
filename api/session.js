import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes, createHmac, timingSafeEqual } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';

const localDataDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../data');
const configurationError = () => Object.assign(new Error('인증키 설정이 필요합니다. 서버의 SESSION_SECRET에 32자 이상의 고정 비밀키를 설정해 주세요.'), { status: 503 });

async function resolveSecret(env) {
  if (env.SESSION_SECRET) {
    if (env.SESSION_SECRET.length < 32) throw configurationError();
    return env.SESSION_SECRET;
  }
  // Existing private storage credentials are shared by serverless instances.
  // Derive a purpose-specific key; never derive it from the public default passwords.
  const sharedCredential = env.KV_REST_API_TOKEN || env.GITHUB_TOKEN;
  if (sharedCredential) {
    if (sharedCredential.length < 32) throw configurationError();
    return createHmac('sha256', sharedCredential).update('heyum-booth/session-signing/v1').digest('hex');
  }
  // /tmp is not shared between serverless instances. Do not issue unusable tokens.
  if (env.VERCEL) throw configurationError();

  const directory = env.DATA_DIR || localDataDir;
  await fs.mkdir(directory, { recursive: true });
  const filename = path.join(directory, '.session-secret');
  try {
    await fs.writeFile(filename, randomBytes(32).toString('hex'), { flag: 'wx', mode: 0o600 });
  } catch (error) { if (error.code !== 'EEXIST') throw error; }
  // A sibling worker may have created the file but not yet finished its first write.
  for (let attempt = 0; attempt < 50; attempt++) {
    const value = (await fs.readFile(filename, 'utf8')).trim();
    if (/^[a-f0-9]{64}$/.test(value)) return value;
    await delay(10);
  }
  throw configurationError();
}

export function createSessionTokens(env = process.env) {
  let secretPromise;
  const getSecret = () => {
    if (!secretPromise) secretPromise = resolveSecret(env).catch(error => { secretPromise = undefined; throw error; });
    return secretPromise;
  };
  const sign = async payload => createHmac('sha256', await getSecret()).update(payload).digest('base64url');
  return {
    async issue(role, session) {
      const payload = Buffer.from(JSON.stringify({ role, session, exp: Date.now() + (role === 'super' ? 30 * 60000 : 8 * 3600000) })).toString('base64url');
      return `${payload}.${await sign(payload)}`;
    },
    async verify(token, role) {
      if (typeof token !== 'string' || token.length > 2048) return null;
      const [payload, signature, extra] = token.split('.');
      if (!payload || !signature || extra) return null;
      const expected = Buffer.from(await sign(payload)), actual = Buffer.from(signature);
      if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return null;
      try {
        const data = JSON.parse(Buffer.from(payload, 'base64url').toString());
        return data.role === role && typeof data.session === 'string' && data.session.length > 0 && Number.isFinite(data.exp) && data.exp > Date.now() ? data : null;
      } catch { return null; }
    }
  };
}
