export async function apiRequest(url, { token, superToken, method = 'GET', body, signal } = {}) {
  const response = await fetch(method === 'GET' ? `${url}${url.includes('?') ? '&' : '?'}_t=${Date.now()}` : url, {
    method, cache: 'no-store', signal: signal || AbortSignal.timeout(15000),
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(superToken ? { 'x-super-token': superToken } : {}), ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}) },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {})
  });
  const data = await response.json().catch(() => ({ message: '서버 응답을 읽을 수 없습니다.' }));
  if (!response.ok) {
    if (response.status === 401 && token) window.dispatchEvent(new Event('heyum:session-expired'));
    if (response.status === 403 && superToken) window.dispatchEvent(new Event('heyum:super-expired'));
    const error = new Error(data.message || '요청을 처리하지 못했습니다.');
    error.status = response.status;
    throw error;
  }
  return data;
}
export function downloadJson(data, filename) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
  const link = document.createElement('a'); link.href = url; link.download = filename; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function readVault() {
  const raw = localStorage.getItem('heyum_emergency_db_vault');
  if (!raw) return null;
  const data = JSON.parse(raw);
  if (!Array.isArray(data?.participants)) throw new Error('로컬 금고 파일이 손상되었습니다. 다른 백업을 선택해 주세요.');
  return data;
}
