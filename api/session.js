import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes, createHmac, timingSafeEqual } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';

const localDataDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../data');
const bundledSecretFile = fileURLToPath(new URL('../.generated/session-secret', import.meta.url));
const configurationError = () => Object.assign(new Error('로그인 서비스를 준비하지 못했습니다. 잠시 후 다시 시도해 주세요.'), { status: 503 });

async function resolveSecret(env, buildSecretFile) {
  if (env.SESSION_SECRET?.length >= 32) {
    return env.SESSION_SECRET;
  }
  // Existing private storage credentials are shared by serverless instances.
  // Derive a purpose-specific key; never derive it from the public default passwords.
  const sharedCredential = env.KV_REST_API_TOKEN || env.GITHUB_TOKEN;
  if (sharedCredential?.length >= 32) {
    return createHmac('sha256', sharedCredential).update('heyum-booth/session-signing/v1').digest('hex');
  }
  // A build-generated private file is identical in every instance of a deployment.
  // It is read-only at runtime; no shared /tmp or manual environment setup is needed.
  if (env.VERCEL) {
    try {
      const value = (await fs.readFile(buildSecretFile, 'utf8')).trim();
      if (/^[a-f0-9]{64}$/.test(value)) return value;
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
    throw configurationError();
  }

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

export function createSessionTokens(env = process.env, { buildSecretFile = bundledSecretFile } = {}) {
  let secretPromise;
  const getSecret = () => {
    if (!secretPromise) secretPromise = resolveSecret(env, buildSecretFile).catch(error => { secretPromise = undefined; throw error; });
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
