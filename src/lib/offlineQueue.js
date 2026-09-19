import { apiRequest } from './api';

const DB_NAME = 'heyum-pending-registrations';
const STORE = 'submissions';
const active = new Map();
let databasePromise;
let flushPromise;

function database() {
  if (!('indexedDB' in window)) return Promise.reject(new Error('이 브라우저는 오프라인 임시 보관을 지원하지 않습니다. 운영진에게 알려 주세요.'));
  if (!databasePromise) databasePromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE, { keyPath: 'id' });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(new Error('이 기기에 응모를 임시 보관하지 못했습니다. 운영진에게 알려 주세요.'));
  }).catch(error => { databasePromise = null; throw error; });
  return databasePromise;
}

async function operation(mode, work) {
  const db = await database();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE, mode);
    const request = work(transaction.objectStore(STORE));
    request.onsuccess = () => { if (mode === 'readonly') resolve(request.result); };
    request.onerror = () => reject(new Error('임시 응모 기록을 읽거나 저장하지 못했습니다.'));
    transaction.oncomplete = () => { if (mode !== 'readonly') resolve(request.result); };
    transaction.onerror = () => reject(new Error('임시 응모 기록을 읽거나 저장하지 못했습니다.'));
    transaction.onabort = () => reject(new Error('임시 응모 기록 저장이 취소되었습니다.'));
  });
}

const get = id => operation('readonly', store => store.get(id));
export const listQueued = () => operation('readonly', store => store.getAll());
async function notify() {
  const items = await listQueued();
  window.dispatchEvent(new CustomEvent('heyum:queue-updated', { detail: {
    pending: items.filter(item => item.state === 'pending').length,
    review: items.filter(item => item.state === 'review').length
  } }));
}

export async function queueRegistration(body) {
  const id = crypto.randomUUID();
  const record = { id, body: { ...body, requestId: id }, state: 'pending', createdAt: new Date().toISOString(), error: '' };
  await operation('readwrite', store => store.add(record));
  await notify().catch(() => {}); // The durable record matters more than refreshing the badge.
  return id;
}

export async function discardQueued(id) {
  await operation('readwrite', store => store.delete(id));
  await notify();
}

export function sendQueued(id) {
  if (active.has(id)) return active.get(id);
  const work = (async () => {
    const record = await get(id);
    if (!record || record.state === 'review') return record?.state || 'done';
    try {
      await apiRequest('/api/participants', { method: 'POST', body: record.body });
      await discardQueued(id);
      return 'done';
    } catch (error) {
      if (error.status >= 400 && error.status < 500 && error.status !== 408 && error.status !== 429) {
        await operation('readwrite', store => store.put({ ...record, state: 'review', error: error.message }));
        await notify();
        return 'review';
      }
      return 'pending';
    }
  })().finally(() => active.delete(id));
  active.set(id, work);
  return work;
}

export function flushQueued() {
  if (flushPromise) return flushPromise;
  flushPromise = (async () => {
    const items = (await listQueued()).filter(item => item.state === 'pending').sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    for (const item of items) {
      if (!navigator.onLine) break;
      if (await sendQueued(item.id) === 'pending') break;
    }
    await notify();
  })().finally(() => { flushPromise = null; });
  return flushPromise;
}

export function startQueueSync() {
  const sync = () => { if (navigator.onLine) flushQueued().catch(() => {}); };
  notify().catch(() => {});
  sync();
  window.addEventListener('online', sync);
  const timer = window.setInterval(sync, 10000);
  return () => { window.removeEventListener('online', sync); window.clearInterval(timer); };
}
