// 场次：一场是一个人用一种方式做的一段连续工作（RQ3 每人两场：工作台一场、AI 对话 + 自由提示一场）。
// 同一个项目里切换方式，就是结束这一场、开始下一场；导出的“本场材料”只装这一场的轮次、图、回执、AI 调用和事件。
// 这里只放不依赖界面的部分：场次的说法、哪些轮次属于哪一场，以及结束后的场次记录在本机的存档。
import type { FrozenAttempt } from '../design/candidateRecords';
import { studyBriefs } from '../design/defaults.ts';

export type SessionMethod = 'open' | 'structured' | 'free';
export interface SessionInfo {
  id: string;
  /** 本机的第几场，从 1 数起，只用来给人看。 */
  no: number;
  projectId: string;
  /** 开始这一场时项目建立的时间：用来认 4.1 留下、没写场次编号的轮次。 */
  projectCreatedAt: string;
  method: SessionMethod;
  /** registered：主持人按登记开的一场（有委托）；trial：自由试用，不计入实验。 */
  kind: 'registered' | 'trial';
  briefId?: 'A' | 'B';
  participant?: string;
  order?: 1 | 2;
  startedAt: string;
  endedAt?: string;
  endReason?: string;
}

export const methodLabel: Record<SessionMethod, string> = { open: '工作台（未限定方式）', structured: '工作台', free: 'AI 对话 + 自由提示' };
export const methodSlug: Record<SessionMethod, string> = { open: 'workbench-open', structured: 'workbench', free: 'free-prompt' };
export const briefOf = (s?: Pick<SessionInfo, 'briefId'> | null) => (s?.briefId ? studyBriefs.find(b => b.id === s.briefId) ?? null : null);

/** 给人看的一行：第 3 场 · 工作台 · 委托 A · P01 · 第 1 场次序。 */
export function sessionTitle(s: SessionInfo) {
  const brief = briefOf(s);
  return [`第 ${s.no} 场`, methodLabel[s.method], brief ? brief.label : s.kind === 'trial' ? '自由试用' : '', s.participant || '', s.order ? `该参与者第 ${s.order} 场` : '']
    .filter(Boolean).join(' · ');
}
/** 文件名用的部分，只用 ASCII。 */
export function sessionStem(s: SessionInfo) {
  const safe = (v: string) => v.replace(/[^A-Za-z0-9_-]+/g, '').slice(0, 24);
  return ['session' + String(s.no).padStart(2, '0'), methodSlug[s.method], s.briefId ? 'brief' + s.briefId : 'trial', s.participant ? safe(s.participant) : '']
    .filter(Boolean).join('-');
}

/** 轮次是哪种方式出的：自由提示的轮次归在 v4free/ 下，工作台的归在 v4/ 下。 */
const isFreeScope = (a: FrozenAttempt) => (a.variantScope ?? '').startsWith('v4free');
const sameProject = (a: FrozenAttempt, s: SessionInfo) => {
  const scope = a.variantScope ?? '';
  if (scope.startsWith(`v4/${s.projectId}/`) || scope === `v4free/${s.projectId}`) return true;
  // 4.0.0 的轮次没写项目编号：只算进当时的那个项目。
  return (/^v4\/lane-/.test(scope) || scope === 'v4free') && a.createdAt >= s.projectCreatedAt;
};

/**
 * 这一场的轮次。4.2 起每一轮冻结时写下场次编号，直接按编号认；
 * 4.1 及以前的轮次没有编号，按“同一个项目、同一种方式、在这一场的起止时间之内”认，并在导出清单里标明是这样认的。
 */
export function roundsOfSession(s: SessionInfo, attempts: FrozenAttempt[]) {
  const tagged = attempts.filter(a => a.sessionId === s.id);
  const legacy = attempts.filter(a => !a.sessionId && sameProject(a, s) && isFreeScope(a) === (s.method === 'free')
    && a.createdAt >= s.startedAt && (!s.endedAt || a.createdAt < s.endedAt));
  return { rounds: [...tagged, ...legacy].sort((a, b) => a.createdAt.localeCompare(b.createdAt)), legacy: legacy.map(a => a.id) };
}

// ---------- 结束后的场次记录：存在本机 IndexedDB，导出旧场次时用 ----------
const DB = 'multirotor-studio-sessions-v1';
const STORE = 'archives';
function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: 'id' });
    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve(req.result);
  });
}
export interface SessionArchive { id: string; savedAt: string; record: unknown }
export async function saveArchive(id: string, record: unknown) {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put({ id, savedAt: new Date().toISOString(), record } satisfies SessionArchive);
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onabort = tx.onerror = () => { db.close(); reject(tx.error); };
  });
}
export async function loadArchive(id: string): Promise<SessionArchive | undefined> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE), q = tx.objectStore(STORE).get(id);
    tx.oncomplete = () => { db.close(); resolve(q.result); };
    tx.onabort = tx.onerror = () => { db.close(); reject(tx.error); };
  });
}
