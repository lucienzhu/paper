// 场次：一场是一个人用一种方式做的一段连续工作（RQ3 每人两场：工作台一场、AI 对话 + 自由提示一场）。
// 同一个项目里切换方式，就是结束这一场、开始下一场；导出的“本场材料”只装这一场的轮次、图、回执、AI 调用和事件。
// 这里只放不依赖界面的部分：场次的说法、哪些轮次属于哪一场，以及结束后的场次记录在本机的存档。
import type { FrozenAttempt } from '../design/candidateRecords';
import { evidenceSummary, studyBriefs } from '../design/defaults.ts';

export type SessionMethod = 'open' | 'structured' | 'free';
export interface SessionInfo {
  id: string;
  /** 本机的第几场，从 1 数起，只用来给人看。 */
  no: number;
  projectId: string;
  /** 开始这一场时项目建立的时间：用来认 4.1 留下、没写场次编号的轮次。 */
  projectCreatedAt: string;
  method: SessionMethod;
  /**
   * registered：主持人按登记开的一场，委托、方式、匿名编号、次序四项齐全；trial：试用，不计入实验（可以带委托练手）。
   * 4.3 起只有四项齐全才算登记场次；“直接换方式”只开试用场次。
   */
  kind: 'registered' | 'trial';
  briefId?: 'A' | 'B';
  participant?: string;
  order?: 1 | 2;
  startedAt: string;
  endedAt?: string;
  endReason?: string;
  /** 4.3：开场时记下的出图后端、文字模型和版本。重新导出旧场次时清单写这一份，不写导出时的配置。 */
  environment?: SessionEnvironment;
  /** 4.3：这一场两组共用的用户依据摘要的版本和摘要（原文在 defaults 里，按版本可查）。 */
  evidenceSummary?: { version: string; status: 'draft' | 'confirmed'; sha256: string };
  /**
   * 4.4：登记场次开场时，两种方式都先看到同一张任务卡（委托原文、同一版用户依据、同样的限额和固定条件），
   * 参与者点“开始”的时间。计时仍从开场算（预试记录约定），两组一样；这一项只是把读任务卡的那一段记清楚。
   */
  taskStartedAt?: string;
}
export interface SessionEnvironment {
  recordedAt: string;
  app: { name: string; version: string };
  textModel: { mode: string; provider: string; model: string | null; endpoint: string | null; effort?: string | null; maxTokens?: number | null; label: string } | null;
  imageBackend: { provider: string; model: string; endpoint?: string; label: string; fixture?: boolean } | null;
  evidenceRegistry: string;
}

export const methodLabel: Record<SessionMethod, string> = { open: '工作台（未限定方式）', structured: '工作台', free: 'AI 对话 + 自由提示' };
export const methodSlug: Record<SessionMethod, string> = { open: 'workbench-open', structured: 'workbench', free: 'free-prompt' };
export const briefOf = (s?: Pick<SessionInfo, 'briefId'> | null) => (s?.briefId ? studyBriefs.find(b => b.id === s.briefId) ?? null : null);

/** 给人看的一行：第 3 场 · 工作台 · 委托 A · 机鼻 · P01 · 该参与者第 1 场；带委托练手的写“试用”。 */
export function sessionTitle(s: SessionInfo) {
  const brief = briefOf(s);
  return [`第 ${s.no} 场`, methodLabel[s.method], brief ? brief.label : s.kind === 'trial' ? '自由试用' : '', brief && s.kind === 'trial' ? '试用' : '',
    s.participant || '', s.order ? `该参与者第 ${s.order} 场` : '']
    .filter(Boolean).join(' · ');
}
/** 文件名用的部分，只用 ASCII。 */
export function sessionStem(s: SessionInfo) {
  const safe = (v: string) => v.replace(/[^A-Za-z0-9_-]+/g, '').slice(0, 24);
  return ['session' + String(s.no).padStart(2, '0'), methodSlug[s.method], s.briefId ? 'brief' + s.briefId : '', s.kind === 'trial' ? 'trial' : '', s.participant ? safe(s.participant) : '']
    .filter(Boolean).join('-');
}
/** 登记场次要四项齐全：委托、方式（工作台或自由提示）、匿名编号、次序。 */
export const registrable = (s: Pick<SessionInfo, 'briefId' | 'method' | 'participant' | 'order'>) =>
  !!s.briefId && (s.method === 'structured' || s.method === 'free') && !!s.participant?.trim() && (s.order === 1 || s.order === 2);
/**
 * 4.4：开登记场次之前的冲突检查。同一个人两场要用不同的委托、不同的方式，次序不能重（pilot.md 第 2 条）。
 * 有冲突就不开，现在这一场照常继续（Codex 子代理复现：以前只提示，仍能开，原来那一场被结束，本机留下两个第 1 场）。
 */
export function registrationClash(sessions: SessionInfo[], input: Pick<SessionInfo, 'briefId' | 'method' | 'participant' | 'order'>) {
  const who = input.participant?.trim();
  if (!registrable(input) || !who) return [];
  const peers = sessions.filter(s => s.kind === 'registered' && s.participant?.trim() === who);
  const brief = input.briefId ? studyBriefs.find(b => b.id === input.briefId) : undefined;
  return [
    peers.some(s => s.order === input.order) ? `${who} 已经有第 ${input.order} 场` : '',
    brief && peers.some(s => s.briefId === input.briefId) ? `${who} 已经用过${brief.label}` : '',
    peers.some(s => s.method === input.method) ? `${who} 已经做过${methodLabel[input.method]}` : '',
  ].filter(Boolean);
}
export const summaryStamp = () => ({ version: evidenceSummary.version, status: evidenceSummary.status, sha256: evidenceSummary.sha256 });

// ---------- 终稿：一场只有一个当前的终稿 ----------
/** 和终稿有关的事件：定为终稿、撤下（包括把当前终稿点了“不要”）、登记“没有可接受的候选”。 */
export interface FinalEvent { id?: string; at: string; kind: string; attemptId?: string; candidateId?: string; text: string }
export type FinalState = { kind: 'final'; attemptId: string; candidateId: string; at: string; text: string } | { kind: 'none-acceptable'; at: string; text: string } | null;
/**
 * 按事件顺序推出这一场当前的终稿：后定的替换先定的；当前终稿被撤下或点了“不要”，就没有终稿（不退回更早的那张）；
 * 登记“没有可接受的候选”也是一种结论。history 是全部经过，原样保留。
 */
export function currentFinal(events: FinalEvent[]): { current: FinalState; history: FinalEvent[] } {
  let current: FinalState = null;
  const history: FinalEvent[] = [];
  for (const e of events) {
    if (e.kind === 'final' && e.attemptId && e.candidateId) { current = { kind: 'final', attemptId: e.attemptId, candidateId: e.candidateId, at: e.at, text: e.text }; history.push(e); }
    else if (e.kind === 'final-withdrawn') { current = null; history.push(e); }
    else if (e.kind === 'final-none') { current = { kind: 'none-acceptable', at: e.at, text: e.text }; history.push(e); }
  }
  return { current, history };
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
async function put(id: string, record: unknown) {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put({ id, savedAt: new Date().toISOString(), record } satisfies SessionArchive);
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onabort = tx.onerror = () => { db.close(); reject(tx.error); };
  });
}
// 同一场的存档按先后排队写：结束时的存档和之后晚到的记录（例如晚到的 AI 回答）不会相互覆盖。
const queue = new Map<string, Promise<unknown>>();
function queued<T>(id: string, work: () => Promise<T>): Promise<T> {
  const next = (queue.get(id) ?? Promise.resolve()).catch(() => undefined).then(work);
  queue.set(id, next);
  return next;
}
export const saveArchive = (id: string, record: unknown) => queued(id, () => put(id, record));
/** 改一场的存档（排在这一场之前的写入后面）。存档还没有时返回 false。 */
export function updateArchive(id: string, change: (record: Record<string, unknown>) => void) {
  return queued(id, async () => {
    const archived = await getArchive(id);
    if (!archived) return false;
    const record = archived.record as Record<string, unknown>;
    change(record);
    await put(id, record);
    return true;
  });
}
/** 一场结束以后才到的记录补进它的存档（按编号去重）。存档还没有时返回 false，导出时再从当前项目里补。 */
export const appendArchive = (id: string, lists: Record<string, { id: string }[]>) => updateArchive(id, record => {
  for (const [key, items] of Object.entries(lists)) {
    const have = Array.isArray(record[key]) ? record[key] as { id: string }[] : [];
    record[key] = [...have, ...items.filter(x => !have.some(y => y.id === x.id))];
  }
});
export const loadArchive = (id: string) => queued(id, () => getArchive(id));
async function getArchive(id: string): Promise<SessionArchive | undefined> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE), q = tx.objectStore(STORE).get(id);
    tx.oncomplete = () => { db.close(); resolve(q.result); };
    tx.onabort = tx.onerror = () => { db.close(); reject(tx.error); };
  });
}
