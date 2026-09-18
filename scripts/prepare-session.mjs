import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { randomBytes, randomUUID } from 'node:crypto';

export const buildSecretFile = fileURLToPath(new URL('../.generated/session-secret', import.meta.url));

// Generated once per deployment, then packaged only into the server function.
// Never write this key to public/, dist/, client environment variables or logs.
export async function prepareSessionSecret(filename = buildSecretFile) {
  await fs.mkdir(path.dirname(filename), { recursive: true });
  const temporary = `${filename}.${randomUUID()}.tmp`;
  try {
    await fs.writeFile(temporary, randomBytes(32).toString('hex'), { flag: 'wx', mode: 0o600 });
    await fs.rename(temporary, filename);
  } finally {
    await fs.unlink(temporary).catch(error => { if (error.code !== 'ENOENT') throw error; });
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  await prepareSessionSecret();
  console.log('서버 전용 인증키 준비 완료');
}
