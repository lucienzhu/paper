// 4.0 的工作区状态：项目（意图与决定链）、AI 的建议与方向、对话、比较、场次设置，以及撤销与重做。
// 只存在本机浏览器里；候选图和生成回执另存（candidateRecords，IndexedDB）。
// 4.2 起有“场次”：每条事件、对话、建议、方向、比较和每一轮生成都写下属于哪一场，导出本场材料只取这一场的。
// 4.3：AI 的回答记回发出请求的那一场（晚到的不用在下一场里，补进那一场的存档）；每一场开始时清掉上一场没发出的文字和选中的父图；
// 只有委托、方式、匿名编号、次序四项齐全才是登记场次；开场时记下出图后端和文字模型；一场只有一个当前终稿；主持人的交接和技术暂停单独记。
// 4.4（作者 11 月 24 日与 Codex 子代理走查）：撤销只撤设计上的改动，事件、对话、比较和 AI 的回答只增不减，撤销本身另记一条；
// 登记场次里机架由程序锁定，不能解除，撤销也撤不掉；同一个人的登记有冲突就不开，现在这一场照常继续；值真的变了才记一次修改，记成看得懂的话。
import { create } from 'zustand';
import type { TaskId } from '../types/DroneParameters';
import type { EvidenceTier } from '../design/evidence/registry.mjs';
import { study, studyBriefs } from '../design/defaults';
import {
  applyLayer, clearValue, forkAt, isBlankProject, laneNode, laneParameters, layerDifferences, layerOf, layers, migrate, newId, newProject, privatize, removeLane,
  setValue, spaced, staleFields, studioTask, upstreamOf, type IntentElement, type Layer, type Project,
} from './model';
import { getPath } from '../design/fields';
import type { DroneParameters } from '../types/DroneParameters';
import { appendArchive, methodLabel, registrable, registrationClash, saveArchive, summaryStamp, updateArchive, type SessionEnvironment, type SessionInfo, type SessionMethod } from './sessions';
import { fieldLabel, formatValue } from './ui/util';
import { describeAi } from './ai';
import { imageBackend } from '../design/imageBackend';
import { registryVersion } from '../design/evidence/registry.mjs';
import { STUDIO_NAME, STUDIO_VERSION } from './version';
export type { SessionMethod } from './sessions';

export interface Change { field: string; value: unknown; from: unknown; label: string; layer: Layer; why?: string }
export interface Suggestion {
  id: string; callId: string; mode: 'model' | 'fixture'; at: string;
  laneId: string; layer: Layer; title: string; why: string; changes: Change[];
  evidence: string[]; tier: EvidenceTier; cards: string[];
  /** late：回答在发出它的那一场结束后才到，不显示、不能用；expired：那一场结束时还没处理。 */
  status: 'pending' | 'applied' | 'branched' | 'rejected' | 'late' | 'expired'; resultLaneId?: string; reason?: string; sessionId?: string;
}
export interface DirectionChange extends Change { evidence: string[]; tier: EvidenceTier; cards: string[] }
export interface Direction {
  id: string; callId: string; mode: 'model' | 'fixture'; at: string;
  name: string; summary: string; changes: DirectionChange[];
  status: 'pending' | 'placed' | 'dismissed' | 'late' | 'expired'; laneId?: string; sessionId?: string;
}
export type Scope = { kind: 'intent' } | { kind: 'layer'; laneId: string; layer: Layer } | { kind: 'candidate'; laneId: string; attemptId: string; candidateId: string } | { kind: 'free' };
export interface Turn { id: string; at: string; role: 'user' | 'assistant'; text: string; scope: Scope; callId?: string; mode?: 'model' | 'fixture'; suggestionIds?: string[]; otherLayer?: { layer: Layer; why: string }; /** 自由提示那一场：助手起草的提示词。 */ draft?: string; sessionId?: string }
export interface CompareRecord { id: string; at: string; laneId?: string; candidates: { attemptId: string; candidateId: string }[]; chosen?: string; reason?: string; observation?: string; sessionId?: string }
export interface ProjectEvent { id: string; at: string; kind: string; text: string; laneId?: string; layer?: Layer;
  /** 这件事对应的生成轮次。 */ attemptId?: string;
  /** 自由提示那一场：发出的文字是设计者自己写的、AI 起草后原样用的，还是起草后改过的。 */ source?: 'typed' | 'draft' | 'draft-edited'; draftTurnId?: string;
  /** 4.2：属于哪一场。 */ sessionId?: string;
  /** 这件事对应的 AI 调用（例如读意图）。导出本场材料时按它找日志。 */ callId?: string;
  /** 4.3：每一次 AI 调用（成功或失败）记一条 ai-call：入口、发出和回答的时间、是否完成、失败原因。 */
  task?: string; ok?: boolean; error?: string; startedAt?: string; endedAt?: string;
  /** 4.3：主持人交接（handoff）或技术暂停（pause）的开始；note 写主持人做了什么。 */
  mark?: 'handoff' | 'pause'; note?: string;
  /** 终稿事件指向的候选。 */ candidateId?: string;
  /** 4.4：改了哪一项、从什么改成什么（只在值真的变了时记）。 */ path?: string; from?: unknown; to?: unknown }
export type Selection = { kind: 'intent' } | { kind: 'layer'; laneId: string; layer: Layer } | { kind: 'render'; laneId: string }
  | { kind: 'candidate'; attemptId: string; candidateId: string } | { kind: 'compare'; id: string } | null;

interface Saved {
  project: Project; suggestions: Suggestion[]; directions: Direction[]; turns: Turn[]; compares: CompareRecord[]; events: ProjectEvent[];
  session: { method: SessionMethod; lockedFrame?: string };
}
/** 主持人开一场时填的几项。 */
export interface SessionSetupInput { method: SessionMethod; briefId?: 'A' | 'B'; participant?: string; order?: 1 | 2 }

/**
 * 一场的工作区记录：这一场的事件、对话、建议、方向和比较。工作台的一场附上导出时的项目（方向与各层节点、意图）；
 * 自由提示的一场只附任务，不附工作台的方向和节点（那一场用不到它们）。
 */
export function sessionSlice(saved: Saved, session: SessionInfo) {
  const mine = <T extends { sessionId?: string }>(list: T[]) => list.filter(x => x.sessionId === session.id);
  const free = session.method === 'free';
  return {
    session,
    project: free ? { id: saved.project.id, name: saved.project.name, createdAt: saved.project.createdAt, intent: { taskId: saved.project.intent.taskId } } : saved.project,
    lockedFrame: free ? undefined : saved.session.lockedFrame,
    suggestions: mine(saved.suggestions), directions: mine(saved.directions), turns: mine(saved.turns), compares: mine(saved.compares), events: mine(saved.events),
  };
}
/**
 * 4.4：撤销历史里只存设计本身（项目，以及 AI 建议与方向的处理状态），不存事件、对话、比较、场次设置。
 * 以前撤销会把整份存档退回去：期间记下的技术暂停、交接、修改事件都没了，暂停时长变成 0（Codex 子代理复现）。
 */
interface Snapshot {
  project: Project;
  s: Record<string, Pick<Suggestion, 'status' | 'resultLaneId' | 'reason'>>;
  d: Record<string, Pick<Direction, 'status' | 'laneId'>>;
  /** 这一步做了什么，撤销和重做时写进记录。 */
  label: string;
}
/** 画布上被设计者拖过的节点位置。不进撤销历史，“整理”清空。 */
export type Layout = Record<string, { x: number; y: number }>;
interface Studio extends Saved {
  selection: Selection;
  layout: Layout;
  /** 本机的全部场次（不进撤销历史，新建项目也不清）。 */
  sessions: SessionInfo[];
  currentSessionId: string | null;
  /** 每到场次的分界（一场结束、主持人开新的一场）加一：界面上没发出的文字、选中的父图等草稿按它重来。 */
  epoch: number;
  /** 返回正在进行的这一场；没有就开一场自由试用。每条记录写下场次编号前都先调它。 */
  ensureSession: () => string;
  /** 主持人开一场：结束上一场；项目不是空白的就另开一个空白项目；有委托时任务定为日常航拍并载入锁定 C2 的机架。
   *  4.4：登记有冲突（同一个人重复的次序、委托或方式）就不开，返回 false，现在这一场照常继续。 */
  startSession: (input: SessionSetupInput) => boolean;
  /** 4.4：参与者看完开场的任务卡，点“开始”。 */
  startTask: () => void;
  /** 结束这一场，写下原因。之后再有操作时自动开一场自由试用。 */
  endSession: (reason: string) => void;
  moveNode: (id: string, position: { x: number; y: number }) => void;
  tidy: () => void;
  /** 只在项目还是空白时原地换任务；项目里已经有决定或生成时，界面先确认，再用 reset(taskId) 另开项目。 */
  setTask: (taskId: TaskId) => void;
  /** 在一张旧候选上改：从那张图冻结时的规格出发另开一条方向，再加上这次的改动；方向此后的决定原样保留。 */
  reviseFrom: (laneId: string, frozen: DroneParameters, changes: { field: string; value: unknown }[], name: string, reason: string) => string;
  comparing: string[];
  notice: string;
  past: Snapshot[];
  future: Snapshot[];
  select: (s: Selection) => void;
  setNotice: (text: string) => void;
  undo: () => void;
  redo: () => void;
  reset: (taskId?: TaskId) => void;
  // 意图
  setIntentText: (text: string) => void;
  applyReading: (reading: IntentReading, sessionId?: string) => void;
  setElement: (id: string, patch: Partial<IntentElement>) => void;
  addElement: (element: Omit<IntentElement, 'id'>) => void;
  setIntentState: (state: string) => void;
  toggleCard: (id: string) => void;
  confirmIntent: () => void;
  // 决定链
  setField: (laneId: string, path: string, value: unknown) => void;
  setMany: (laneId: string, entries: [string, unknown][], label: string) => void;
  clearField: (laneId: string, path: string) => void;
  fork: (laneId: string, layer: Layer, name?: string, reason?: string) => string;
  applyFrom: (fromLane: string, toLane: string, layer: Layer) => void;
  ownLayer: (laneId: string, layer: Layer) => void;
  dropLane: (laneId: string) => void;
  renameLane: (laneId: string, name: string) => void;
  collapseLane: (laneId: string, collapsed: boolean) => void;
  setActiveLane: (laneId: string) => void;
  addIssue: (laneId: string, layer: Layer, text: string, fromCandidate?: string) => void;
  resolveIssue: (laneId: string, layer: Layer, issueId: string) => void;
  // AI：sessionId 是发出请求时的那一场；那一场已经结束，回答只记下、不用在现在这一场里。
  addSuggestions: (list: Suggestion[], sessionId?: string) => void;
  resolveSuggestion: (id: string, action: 'apply' | 'branch' | 'reject', reason?: string) => string | null;
  setDirections: (list: Direction[], sessionId?: string) => void;
  placeDirection: (id: string) => string | null;
  dismissDirection: (id: string) => void;
  addTurn: (turn: Turn, sessionId?: string) => void;
  // 比较与场次
  toggleCompare: (key: string) => void;
  clearCompare: () => void;
  recordCompare: (record: CompareRecord) => void;
  setSession: (method: SessionMethod) => void;
  /** 只记一笔，不进撤销历史。给了 sessionId 就记在那一场（例如晚到的回答）。 */
  logEvent: (event: Omit<ProjectEvent, 'id' | 'at'>, sessionId?: string) => void;
  /** 终稿：定为终稿（替换这一场之前的终稿）、撤下、登记“没有可接受的候选”。 */
  setFinal: (attemptId: string, candidateId: string, text: string, laneId?: string) => void;
  withdrawFinal: (text: string) => void;
  markNoneAcceptable: (text: string) => void;
  /** 主持人接手（交接）或技术暂停，到交回为止。 */
  markModerator: (mark: 'handoff' | 'pause', note: string) => void;
  endModerator: () => void;
  loadCondition: (id: string) => void;
  unlockCondition: () => void;
}

export interface IntentReading {
  callId: string; mode: 'model' | 'fixture'; taskId: TaskId; state: string;
  question: { text: string; options: { label: string; value: string }[] } | null;
  targets: { text: string; pair: IntentElement['pair']; pole: IntentElement['pole']; cards: string[]; why: string }[];
  interpretations: { text: string; why: string; options: { text: string; pair: IntentElement['pair']; pole: IntentElement['pole'] }[] }[];
  notes: { text: string }[];
  cards: { id: string; why: string }[];
}

const KEY = 'multirotor-studio/v4/project';
const now = () => new Date().toISOString();
const layerName: Record<Layer, string> = { frame: '机架', propulsion: '动力', body: '机身', details: '细节', cmf: '色材' };

function initial(): Saved {
  return { project: newProject(), suggestions: [], directions: [], turns: [], compares: [], events: [], session: { method: 'open' } };
}
function load(): Saved {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || 'null');
    const project = raw && migrate(raw.project);
    if (project) return { ...initial(), ...raw, project };
  } catch { /* 没有可用的本机存储时从空白项目开始。 */ }
  return initial();
}
/** 重新打开页面时回到上次选中的节点（节点已不在时由画布退回总览），以及拖过的节点位置。 */
function loadSelection(): Selection {
  try { return (JSON.parse(localStorage.getItem(KEY) || 'null')?.selection ?? null) as Selection; } catch { return null; }
}
function loadLayout(): Layout {
  try { const raw = JSON.parse(localStorage.getItem(KEY) || 'null')?.layout; return raw && typeof raw === 'object' ? raw as Layout : {}; } catch { return {}; }
}
function loadSessions(): { sessions: SessionInfo[]; currentSessionId: string | null } {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || 'null');
    const sessions = Array.isArray(raw?.sessions) ? raw.sessions as SessionInfo[] : [];
    const current = typeof raw?.currentSessionId === 'string' && sessions.some(s => s.id === raw.currentSessionId && !s.endedAt) ? raw.currentSessionId as string : null;
    return { sessions, currentSessionId: current };
  } catch { return { sessions: [], currentSessionId: null }; }
}
/** 项目里是否已经出过图：工作台每一轮记一条 run，自由提示每一轮记一条 free-run。 */
const hasRuns = (s: Saved) => s.events.some(e => e.kind === 'run' || e.kind === 'free-run');
const pick = (s: Studio): Saved => ({ project: s.project, suggestions: s.suggestions, directions: s.directions, turns: s.turns,
  compares: s.compares, events: s.events, session: s.session });
const statusesOf = (s: Pick<Saved, 'suggestions' | 'directions'>) => ({
  s: Object.fromEntries(s.suggestions.map(x => [x.id, { status: x.status, resultLaneId: x.resultLaneId, reason: x.reason }])),
  d: Object.fromEntries(s.directions.map(x => [x.id, { status: x.status, laneId: x.laneId }])),
});
const snapshot = (s: Saved, label: string): Snapshot => ({ project: structuredClone(s.project), ...structuredClone(statusesOf(s)), label });
/** 撤销、重做时只把快照里有的那几条建议和方向退回当时的状态；之后才到的 AI 回答原样留着。 */
function restoreStatuses<T extends { id: string }>(list: T[], saved: Record<string, Partial<T>>) {
  return list.map(x => saved[x.id] ? { ...x, ...saved[x.id] } : x);
}
const same = (a: unknown, b: unknown) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
/** 一次修改写成看得懂的话：机臂宽度 15 mm → 20 mm。 */
export const describeChange = (path: string, from: unknown, to: unknown) => `${fieldLabel(path)} ${formatValue(path, from)} → ${formatValue(path, to)}`;

export const useStudio = create<Studio>((set, get) => {
  /** 正在进行的这一场；没有就开一场自由试用（沿用当前方式和项目）。 */
  function ensure(): string {
    const { currentSessionId, sessions } = get();
    if (currentSessionId && sessions.some(s => s.id === currentSessionId && !s.endedAt)) return currentSessionId;
    return begin({ method: get().session.method }, 'trial', false);
  }
  /** 开一场。explicit：主持人开的或换了方式（不是有操作时自动开的试用），界面上的草稿随之清掉。 */
  function begin(input: SessionSetupInput, kind: SessionInfo['kind'], explicit = true): string {
    const { sessions, project } = get();
    const info: SessionInfo = {
      id: newId('session'), no: sessions.reduce((m, s) => Math.max(m, s.no), 0) + 1, projectId: project.id, projectCreatedAt: project.createdAt,
      method: input.method, kind, briefId: input.briefId, participant: input.participant?.trim() || undefined, order: input.order, startedAt: now(),
      evidenceSummary: summaryStamp(),
    };
    // 撤销不跨场：新的一场从空的撤销历史开始（否则开场后一撤销，登记的机架锁定也会被撤掉）。
    set(s => ({ sessions: [...sessions, info].slice(-200), currentSessionId: info.id, past: [], future: [], ...(explicit ? { epoch: s.epoch + 1, comparing: [] } : {}) }));
    recordEnvironment(info.id);
    return info.id;
  }
  /** 开场时记下出图后端、文字模型和版本（异步，取到就写进这一场）。重新导出旧场次时清单写这一份。 */
  function recordEnvironment(id: string) {
    void Promise.all([describeAi(), imageBackend().catch(() => null)]).then(([ai, backend]) => {
      const environment: SessionEnvironment = {
        recordedAt: now(), app: { name: STUDIO_NAME, version: STUDIO_VERSION }, evidenceRegistry: registryVersion,
        textModel: { mode: ai.mode, provider: ai.provider, model: ai.model, endpoint: ai.endpoint ?? null, effort: ai.effort ?? null, maxTokens: ai.maxTokens ?? null, label: ai.label },
        imageBackend: backend ? { provider: backend.provider, model: backend.model, endpoint: backend.endpoint, label: backend.label, ...(backend.fixture ? { fixture: true } : {}) } : null,
      };
      set(s => ({ sessions: s.sessions.map(x => x.id === id && !x.environment ? { ...x, environment } : x) }));
      // 这一场已经结束（环境晚一步才取到）：存档里的场次信息也补上。
      if (get().sessions.some(x => x.id === id && x.endedAt))
        void updateArchive(id, record => { record.session = { ...(record.session as SessionInfo), environment }; }).catch(() => {});
    }).catch(() => { /* 取不到时导出按这一场的调用和轮次回执推出，并写明 */ });
  }
  /** 结束这一场，并把这一场的工作区记录存进本机存档（导出旧场次时用）。还没处理的 AI 建议和方向记为“这一场结束时未处理”。 */
  function finish(reason: string) {
    const { currentSessionId, sessions } = get();
    const current = sessions.find(s => s.id === currentSessionId && !s.endedAt);
    if (!current) { set({ currentSessionId: null }); return; }
    const ended: SessionInfo = { ...current, endedAt: now(), endReason: reason };
    const expire = <T extends { status: string; sessionId?: string }>(list: T[]) => list.map(x => x.sessionId === ended.id && x.status === 'pending' ? { ...x, status: 'expired' } : x);
    set(s => ({ sessions: sessions.map(x => x.id === ended.id ? ended : x), currentSessionId: null, epoch: s.epoch + 1, comparing: [],
      suggestions: expire(s.suggestions), directions: expire(s.directions) }));
    void saveArchive(ended.id, sessionSlice(pick(get()), ended)).catch(() => set({ notice: '这一场的记录没能存进本机存档；导出时会从当前项目里取。' }));
  }
  /** 这一条记在哪一场：给了就用给的（发出请求时的那一场），没给就是正在进行的这一场。 */
  const target = (sessionId?: string) => sessionId ?? ensure();
  /** 那一场已经结束：晚到的记录照样记在那一场，并补进它的存档。 */
  const late = (sessionId: string) => sessionId !== get().currentSessionId;
  function archiveLate(sessionId: string, lists: Record<string, { id: string }[]>) {
    if (get().sessions.some(s => s.id === sessionId && s.endedAt)) void appendArchive(sessionId, lists).catch(() => {});
  }
  /** 有正在进行的一场就记一笔“结束本场”再结束它。 */
  function close(reason: string) {
    if (!get().sessions.some(s => s.id === get().currentSessionId && !s.endedAt)) return null;
    const ending = get().sessions.find(s => s.id === get().currentSessionId) ?? null;
    get().logEvent({ kind: 'session-end', text: '结束本场：' + reason });
    finish(reason);
    return ending;
  }
  /**
   * 一次可以撤销的改动：在副本上改，设计真的变了才记下改动前的快照和这一条事件。
   * 返回是否改了。事件、对话、比较不进快照，撤销不会把它们退回去。
   */
  function commit(change: (draft: Saved) => void, event?: Omit<ProjectEvent, 'id' | 'at'>, label?: string) {
    const current = pick(get());
    const draft = structuredClone(current);
    change(draft);
    if (same(draft.project, current.project) && same(statusesOf(draft), statusesOf(current))) return false;
    const sessionId = event ? ensure() : undefined;
    const before = snapshot(current, label ?? event?.text ?? '一次修改');
    const events = event ? [...get().events, { id: newId('ev'), at: now(), sessionId, ...event }].slice(-500) : get().events;
    set({ project: draft.project, suggestions: draft.suggestions, directions: draft.directions, session: draft.session, events,
      past: [...get().past, before].slice(-60), future: [] });
    return true;
  }
  /** 改一项前后的取值：值没变就不记。 */
  const valueOf = (laneId: string, path: string) => getPath(laneParameters(get().project, laneId), path);
  const locked = (s: Saved, path: string) => !!s.session.lockedFrame && layerOf(path) === 'frame';
  /** 锁定时给设计者看的话：登记场次里没有“解除”，试用时由主持人解除。 */
  const lockNotice = (s: Studio) => s.sessions.some(x => x.id === s.currentSessionId && !x.endedAt && x.kind === 'registered')
    ? '机架是这一场登记的条件，由程序锁定，不能改。' : '机架锁定为登记条件（试用）。要改，请主持人在主持人面板里解除。';
  /** 另开一个空白项目（沿用方式）。撤销历史清空：撤销不能跨到上一个项目、上一场。 */
  function freshProject(taskId: TaskId) {
    const method = get().session.method;
    set({ ...initial(), project: newProject(taskId), session: { method }, selection: null, layout: {}, comparing: [], past: [], future: [] });
  }

  return {
    ...load(),
    ...loadSessions(),
    selection: loadSelection(), layout: loadLayout(), comparing: [], notice: '', past: [], future: [],
    epoch: 0,
    ensureSession: ensure,
    startSession: input => {
      // 登记有冲突就不开：现在这一场不结束、不换项目。
      const clash = registrationClash(get().sessions, input);
      if (clash.length) { set({ notice: '没有开始：' + clash.join('；') + '。同一个人的两场要用不同的委托、不同的方式，次序不能重。' }); return false; }
      close('开始新的一场');
      const s = get();
      const brief = input.briefId ? studyBriefs.find(b => b.id === input.briefId) : undefined;
      const taskId: TaskId = brief ? 'consumer_camera' : s.project.intent.taskId;
      if (!isBlankProject(s.project) || hasRuns(s) || s.project.intent.text.trim() || s.project.intent.taskId !== taskId) freshProject(taskId);
      set(st => ({ session: { ...st.session, method: input.method, lockedFrame: undefined }, selection: null }));
      // 四项齐全才是登记场次；只选了委托的是带委托的试用。
      const kind = registrable(input) ? 'registered' : 'trial';
      begin(input, kind);
      get().logEvent({ kind: 'session-start', text: `开始本场：${methodLabel[input.method]}` + (brief ? ' · ' + brief.label : ' · 自由试用') + (brief && kind === 'trial' ? ' · 试用' : '')
        + (input.participant?.trim() ? ' · ' + input.participant.trim() : '') + (input.order ? ` · 该参与者第 ${input.order} 场` : '') });
      if (brief) get().loadCondition(brief.condition);
      set({ past: [], future: [] });
      return true;
    },
    startTask: () => {
      const id = get().currentSessionId;
      const current = get().sessions.find(x => x.id === id && !x.endedAt);
      if (!current || current.taskStartedAt) return;
      const at = now();
      set(s => ({ sessions: s.sessions.map(x => x.id === current.id ? { ...x, taskStartedAt: at } : x) }));
      get().logEvent({ kind: 'task-start', text: '参与者看完任务卡，点了开始' });
    },
    endSession: reason => { close(reason); },
    moveNode: (id, position) => set(s => ({ layout: { ...s.layout, [id]: { x: Math.round(position.x), y: Math.round(position.y) } } })),
    tidy: () => set({ layout: {} }),
    setTask: taskId => {
      if (get().currentSessionId && get().sessions.find(s => s.id === get().currentSessionId)?.briefId && taskId !== 'consumer_camera') {
        set({ notice: '这一场按委托做日常航拍，任务不能换。要换，先在场次设置里结束这一场。' }); return;
      }
      commit(d => {
        d.project.intent.taskId = taskId;
        if (d.project.intent.question?.options.some(o => o.value.startsWith('task:'))) d.project.intent.question = undefined;
        d.project.intent.confirmedAt = undefined;
        // 登记的机架条件只属于日常航拍四旋：换到植保时解除。
        if (taskId !== 'consumer_camera') d.session.lockedFrame = undefined;
      }, { kind: 'intent', text: '任务定为：' + studioTask(taskId).short });
    },
    reviseFrom: (laneId, frozen, changes, name, reason) => {
      let id = '';
      commit(d => {
        // 机架锁定时（登记场次），冻结规格和修改里的机架项一律不动：它们本该等于登记条件。
        const drift = staleFields(frozen, laneParameters(d.project, laneId)).map(x => x.path).filter(p => !locked(d, p));
        changes = changes.filter(c => !locked(d, c.field));
        const paths = [...new Set([...drift, ...changes.map(c => c.field)])];
        const earliest = layers.find(l => paths.some(p => layerOf(p) === l)) ?? 'cmf';
        id = forkAt(d.project, laneId, earliest, name, reason).id;
        d.project.activeLaneId = id;
        for (const path of drift) setValue(d.project, id, path, getPath(frozen, path));
        for (const c of changes) setValue(d.project, id, c.field, c.value);
      }, { kind: 'revise-from', laneId, text: '从一张旧候选另开方案修改：' + reason });
      return id;
    },
    select: selection => set(selection && (selection.kind === 'layer' || selection.kind === 'render') && get().project.lanes.some(l => l.id === selection.laneId)
      ? { selection, project: { ...get().project, activeLaneId: selection.laneId } } : { selection }),
    setNotice: notice => set({ notice }),
    undo: () => {
      const { past } = get(); if (!past.length) return;
      const prev = past[past.length - 1];
      const after = snapshot(pick(get()), prev.label);
      set(s => ({ project: structuredClone(prev.project), suggestions: restoreStatuses(s.suggestions, prev.s), directions: restoreStatuses(s.directions, prev.d),
        past: past.slice(0, -1), future: [after, ...s.future].slice(0, 60) }));
      // 撤销本身另记一条：原来那条修改事件留着，导出时看得到改过又撤回。
      get().logEvent({ kind: 'undo', text: '撤销：' + prev.label });
    },
    redo: () => {
      const { future } = get(); if (!future.length) return;
      const next = future[0];
      const before = snapshot(pick(get()), next.label);
      set(s => ({ project: structuredClone(next.project), suggestions: restoreStatuses(s.suggestions, next.s), directions: restoreStatuses(s.directions, next.d),
        past: [...s.past, before].slice(-60), future: future.slice(1) }));
      get().logEvent({ kind: 'redo', text: '重做：' + next.label });
    },
    reset: (taskId = 'consumer_camera') => {
      // 新建项目就是另起一场：先结束这一场（它的记录存进本机存档），再开空白项目和一场自由试用。
      close('新建项目');
      freshProject(taskId);
      begin({ method: get().session.method }, 'trial', true);
      get().logEvent({ kind: 'reset', text: '新建项目：' + studioTask(taskId).short });
    },

    setIntentText: text => { commit(d => { d.project.intent.text = text; d.project.intent.confirmedAt = undefined; }, undefined, '改了意图的文字'); },
    applyReading: (r, sessionId) => {
      // 发出读意图的那一场已经结束：回答不用在现在的项目里（不改意图），只在那一场记一笔。
      const sid = target(sessionId);
      if (late(sid)) { get().logEvent({ kind: 'ai-late', callId: r.callId, text: '读意图的回答在这一场结束后才到，没有用上。' }, sid); return; }
      commit(d => {
      const intent = d.project.intent;
      const before = intent.elements;
      // AI 读出的任务和现在的不同：不直接换（换任务会换掉起始值），先问设计者按哪一个做。
      const differs = r.taskId !== intent.taskId && (r.taskId === 'consumer_camera' || r.taskId === 'agricultural_spraying');
      intent.state = r.state; intent.readingCall = r.callId;
      intent.question = r.question ?? (differs ? {
        text: `这段话读起来是“${studioTask(r.taskId).short}”，现在的项目是“${studioTask(intent.taskId).short}”。按哪一个做？`,
        options: [{ label: '按' + studioTask(intent.taskId).short + '做', value: 'task:' + intent.taskId }, { label: '按' + studioTask(r.taskId).short + '做', value: 'task:' + r.taskId }],
      } : undefined);
      const fresh: IntentElement[] = [
        ...r.targets.map(t => ({ id: newId('el'), kind: 'target' as const, text: t.text, pair: t.pair, pole: t.pole, cards: t.cards,
          basis: (t.cards.length ? 'user' : 'designer') as IntentElement['basis'], status: 'pending' as const, why: t.why })),
        ...r.interpretations.flatMap(i => i.options.map(o => ({ id: newId('el'), kind: 'interpretation' as const, text: o.text, pair: o.pair, pole: o.pole,
          cards: [], basis: 'ai' as const, status: 'pending' as const, why: `“${i.text}”：${i.why}` }))),
        ...r.interpretations.map(i => ({ id: newId('el'), kind: 'note' as const, text: i.text, cards: [], basis: 'designer' as const, status: 'pending' as const,
          why: '原话保留为备注，生成时原样写进文字。' })),
        ...r.notes.map(n => ({ id: newId('el'), kind: 'note' as const, text: n.text, cards: [], basis: 'designer' as const, status: 'pending' as const })),
      ];
      // 重读或补充一句时，设计者已经定下的条目不作废：同一对目标、同一句备注沿用原来的决定；
      // 之前采纳、这次没读出来的条目也留着，由设计者自己删。
      const same = (a: IntentElement, b: IntentElement) => a.kind === b.kind && (a.kind === 'note' ? a.text === b.text : a.pair === b.pair && a.pole === b.pole);
      const merged = fresh.filter((e, i) => fresh.findIndex(x => same(x, e)) === i).map(e => {
        const old = before.find(o => o.status !== 'pending' && same(o, e));
        return old ? { ...e, id: old.id, status: old.status } : e;
      });
      for (const old of before) if (old.status === 'accepted' && !merged.some(e => same(e, old))) merged.push(old);
      intent.elements = merged;
      if (merged.some(e => e.status === 'pending')) intent.confirmedAt = undefined;
      intent.cards = [...new Set([...intent.cards.filter(id => before.some(e => e.status === 'accepted' && e.cards.includes(id))), ...r.cards.map(c => c.id)])];
    }, { kind: 'ai-intent', text: 'AI 读了意图', callId: r.callId });
    },
    setElement: (id, patch) => { commit(d => {
      d.project.intent.elements = d.project.intent.elements.map(e => e.id === id ? { ...e, ...patch } : e);
      d.project.intent.confirmedAt = undefined;
    }, undefined, '改了一条意图'); },
    addElement: element => { commit(d => { d.project.intent.elements.push({ ...element, id: newId('el') }); }, undefined, '加了一条意图'); },
    setIntentState: state => { commit(d => { d.project.intent.state = state; d.project.intent.question = undefined; }, { kind: 'intent', text: '确认观察状态' }); },
    toggleCard: id => { commit(d => {
      const cards = d.project.intent.cards;
      d.project.intent.cards = cards.includes(id) ? cards.filter(c => c !== id) : [...cards, id];
    }, undefined, '选了一张用户原话'); },
    confirmIntent: () => { commit(d => {
      d.project.intent.confirmedAt = now();
      d.project.intent.elements = d.project.intent.elements.map(e => e.status === 'pending' ? { ...e, status: 'rejected' } : e);
    }, { kind: 'intent', text: '确认意图' }); },

    setField: (laneId, path, value) => {
      if (locked(get(), path)) { set({ notice: lockNotice(get()) }); return; }
      // 点的是已经选中的那一项：值没变，不算一次修改，也不记。
      const from = valueOf(laneId, path);
      if (same(from, value)) return;
      commit(d => { setValue(d.project, laneId, path, value); },
        { kind: 'edit', laneId, layer: layerOf(path) ?? undefined, path, from, to: value, text: describeChange(path, from, value) });
    },
    setMany: (laneId, entries, label) => {
      const allowed = entries.filter(([p]) => !locked(get(), p));
      if (allowed.length < entries.length) set({ notice: lockNotice(get()) });
      const changed = allowed.map(([p, v]) => ({ p, v, from: valueOf(laneId, p) })).filter(x => !same(x.from, x.v));
      if (!changed.length) return;
      commit(d => { for (const x of changed) setValue(d.project, laneId, x.p, x.v); },
        { kind: 'edit', laneId, layer: layerOf(changed[0].p) ?? undefined, text: label + '：' + changed.map(x => describeChange(x.p, x.from, x.v)).join('；') }, label);
    },
    clearField: (laneId, path) => {
      if (locked(get(), path)) return;
      const from = valueOf(laneId, path);
      const changed = commit(d => { clearValue(d.project, laneId, path); }, { kind: 'edit', laneId, layer: layerOf(path) ?? undefined, path, from,
        text: '改回起始值：' + fieldLabel(path) });
      // 改回以后的值要算出来才知道，补进刚记的那一条。
      if (changed) set(s => ({ events: s.events.map((e, i) => i === s.events.length - 1 && e.path === path && e.kind === 'edit' && e.to === undefined
        ? { ...e, to: valueOf(laneId, path), text: '改回起始值：' + describeChange(path, from, valueOf(laneId, path)) } : e) }));
    },
    fork: (laneId, layer, name, reason) => {
      let id = '', newName = '';
      const source = get().project.lanes.find(l => l.id === laneId)?.name ?? '原方案';
      const shared = upstreamOf(layer).map(l => layerName[l]);
      commit(d => { const lane = forkAt(d.project, laneId, layer, name, reason); id = lane.id; newName = lane.name; d.project.activeLaneId = id; },
        { kind: 'fork', laneId, layer, text: `从${layerName[layer]}起另做一版` + (reason ? '：' + reason : '') + (shared.length ? `（${shared.join('、')}仍与${spaced(source)}共用）` : '') });
      // 另做的一版建好以后，面板跟到新方案的这一层：接下来的改动落在新方案上。
      set({ selection: { kind: 'layer', laneId: id, layer }, notice: `已另做一版：${newName}。` + (shared.length ? `${shared.join('、')}仍与${spaced(source)}共用，以后改它们，两个方案一起变。` : `五层都是${spaced(newName)}自己的。`) });
      return id;
    },
    applyFrom: (fromLane, toLane, layer) => {
      if (layer === 'frame' && get().session.lockedFrame) { set({ notice: lockNotice(get()) }); return; }
      const p = get().project;
      const diffs = layerDifferences(p, fromLane, toLane, layer);
      const fromName = p.lanes.find(l => l.id === fromLane)?.name ?? fromLane, toName = p.lanes.find(l => l.id === toLane)?.name ?? toLane;
      if (!diffs.length) { set({ notice: `${spaced(fromName)}和${spaced(toName)}的${layerName[layer]}设置一样，没有要抄的。` }); return; }
      commit(d => { applyLayer(d.project, fromLane, toLane, layer); },
        { kind: 'apply', laneId: toLane, layer, text: `把${spaced(fromName)}的${layerName[layer]}设置抄到${toName}：` + diffs.map(x => describeChange(x.path, x.from, x.to)).join('；') });
    },
    ownLayer: (laneId, layer) => { commit(d => { privatize(d.project, laneId, layer); },
      { kind: 'own', laneId, layer, text: `${spaced(get().project.lanes.find(l => l.id === laneId)?.name ?? '这个方案')}从${layerName[layer]}起与其他方案分开` }); },
    dropLane: laneId => { commit(d => { removeLane(d.project, laneId); }, { kind: 'lane', laneId, text: '删去一个方案：' + (get().project.lanes.find(l => l.id === laneId)?.name ?? laneId) }); },
    renameLane: (laneId, name) => { commit(d => { d.project.lanes = d.project.lanes.map(l => l.id === laneId ? { ...l, name } : l); }, undefined, '改了方案名'); },
    collapseLane: (laneId, collapsed) => set(s => ({ project: { ...s.project, lanes: s.project.lanes.map(l => l.id === laneId ? { ...l, collapsed } : l) } })),
    setActiveLane: laneId => set(s => ({ project: { ...s.project, activeLaneId: laneId,
      lanes: s.project.lanes.map(l => l.id === laneId ? { ...l, collapsed: false } : l) } })),
    addIssue: (laneId, layer, text, fromCandidate) => { commit(d => {
      laneNode(d.project, laneId, layer).issues.push({ id: newId('issue'), text, fromCandidate, at: now() });
    }, { kind: 'issue', laneId, layer, text: `把问题送回${layerName[layer]}：` + text }); },
    resolveIssue: (laneId, layer, issueId) => { commit(d => {
      const node = laneNode(d.project, laneId, layer);
      node.issues = node.issues.map(i => i.id === issueId ? { ...i, resolved: true } : i);
    }, { kind: 'issue-resolved', laneId, layer, text: `${layerName[layer]}的一个问题处理好了` }); },

    addSuggestions: (list, sessionId) => {
      const sid = target(sessionId), lateOnes = late(sid);
      const items = list.map(x => ({ ...x, sessionId: sid, ...(lateOnes ? { status: 'late' as const } : {}) }));
      set(s => ({ suggestions: [...s.suggestions, ...items].slice(-300) }));
      if (lateOnes && items.length) { archiveLate(sid, { suggestions: items }); get().logEvent({ kind: 'ai-late', callId: items[0].callId, text: `AI 的 ${items.length} 条建议在这一场结束后才到，没有显示。` }, sid); }
    },
    resolveSuggestion: (id, action, reason) => {
      const s = get().suggestions.find(x => x.id === id);
      if (!s || s.status !== 'pending') return null;
      if (action !== 'reject' && s.changes.some(c => locked(get(), c.field))) { set({ notice: '这条建议改到了锁定的机架，不能采用。' }); return null; }
      let laneId: string | null = s.laneId;
      commit(d => {
        if (action === 'branch') {
          const parent = d.project.lanes.find(l => l.id === s.laneId);
          const name = `${parent?.name ?? '方案'} · 试${[...new Set(s.changes.map(c => c.label))].slice(0, 2).join('、')}`;
          laneId = forkAt(d.project, s.laneId, s.layer, name, s.title).id;
          d.project.activeLaneId = laneId;
        }
        if (action !== 'reject') for (const c of s.changes) setValue(d.project, laneId as string, c.field, c.value);
        d.suggestions = d.suggestions.map(x => x.id === id ? { ...x, status: action === 'apply' ? 'applied' : action === 'branch' ? 'branched' : 'rejected',
          resultLaneId: action === 'reject' ? undefined : laneId as string, reason } : x);
      }, { kind: 'ai-' + action, laneId: s.laneId, layer: s.layer, text: ({ apply: '采纳', branch: '开分支试', reject: '不用' })[action] + ' AI 建议：' + s.title });
      if (action === 'branch' && laneId) set({ selection: { kind: 'layer', laneId, layer: s.layer } });
      return action === 'reject' ? null : laneId;
    },
    setDirections: (list, sessionId) => {
      const sid = target(sessionId);
      if (late(sid)) {
        const items = list.map(x => ({ ...x, sessionId: sid, status: 'late' as const }));
        set(s => ({ directions: [...s.directions, ...items] }));
        archiveLate(sid, { directions: items });
        get().logEvent({ kind: 'ai-late', callId: list[0]?.callId, text: `AI 提的 ${list.length} 个方案在这一场结束后才到，没有显示。` }, sid);
        return;
      }
      // AI 的回答是记录，不进撤销：撤销不会让已经到的方向消失。
      set(s => ({ directions: [...s.directions.map(x => x.status === 'pending' && x.sessionId === sid ? { ...x, status: 'expired' as const } : x), ...list.map(x => ({ ...x, sessionId: sid }))] }));
      get().logEvent({ kind: 'ai-directions', callId: list[0]?.callId, text: `AI 提了 ${list.length} 个方案` }, sid);
    },
    placeDirection: id => {
      const dir = get().directions.find(x => x.id === id);
      if (!dir || dir.status !== 'pending') return null;
      const usable = dir.changes.filter(c => !locked(get(), c.field));
      let laneId = '';
      commit(d => {
        const p = d.project;
        const placedBefore = d.directions.some(x => x.status === 'placed');
        const onlyBlank = p.lanes.length === 1 && !placedBefore && layers.every(l => Object.keys(laneNode(p, p.lanes[0].id, l).touched).length === 0);
        if (onlyBlank) {
          laneId = p.lanes[0].id;
          p.lanes[0].name = dir.name;
        } else {
          const first = layers.find(l => usable.some(c => c.layer === l)) ?? 'body';
          laneId = forkAt(p, p.activeLaneId, first, dir.name, 'AI 方案提议').id;
        }
        for (const c of usable) setValue(p, laneId, c.field, c.value);
        p.activeLaneId = laneId;
        d.directions = d.directions.map(x => x.id === id ? { ...x, status: 'placed', laneId } : x);
      }, { kind: 'direction', text: '把 AI 提的方案放上画布：' + dir.name });
      return laneId;
    },
    dismissDirection: id => { commit(d => { d.directions = d.directions.map(x => x.id === id ? { ...x, status: 'dismissed' } : x); }, { kind: 'direction-dismissed', text: '不要 AI 提的一个方案' }); },
    addTurn: (turn, sessionId) => {
      const sid = target(sessionId), item = { ...turn, sessionId: sid };
      set(s => ({ turns: [...s.turns, item].slice(-400) }));
      if (late(sid)) archiveLate(sid, { turns: [item] });
    },

    toggleCompare: key => set(s => ({ comparing: s.comparing.includes(key) ? s.comparing.filter(k => k !== key) : [...s.comparing, key].slice(-4) })),
    clearCompare: () => set({ comparing: [] }),
    // 比较和取舍是记录，不改设计，也不进撤销。
    recordCompare: record => { const sessionId = ensure();
      set(s => ({ compares: [...s.compares.filter(c => c.id !== record.id), { ...record, sessionId: record.sessionId ?? sessionId }] }));
      get().logEvent({ kind: 'compare', text: (record.chosen ? '比较后选定' : '把几张候选放在一起比较') + (record.reason ? '：' + record.reason : '') }); },
    // 换方式就是换一场：结束这一场，在同一个项目里开下一场试用（委托沿用，便于练手）。登记场次不能这样换：
    // 每人两场要用不同的委托和方式、记下次序，由主持人先结束本场，再在“开一场”里开下一场（Codex 11 月 23 日第 12 条）。
    setSession: method => {
      const current = get().sessions.find(s => s.id === get().currentSessionId && !s.endedAt);
      if (current && current.method === method) return;
      if (current?.kind === 'registered') {
        set({ notice: '登记场次不能直接换方式：先结束本场，再在“开一场”里按次序开这个人的下一场（另一份委托、另一种方式）。' });
        return;
      }
      const before = close(`切换为“${methodLabel[method]}”`);
      set(s => ({ session: { ...s.session, method }, selection: null }));
      begin({ method, briefId: before?.briefId }, 'trial');
      get().logEvent({ kind: 'session-start', text: '开始本场：' + methodLabel[method] + ' · 试用' + (before ? '（由上一场切换方式而来）' : '') });
    },
    logEvent: (event, sessionId) => {
      const sid = target(sessionId), item = { id: newId('ev'), at: now(), sessionId: sid, ...event };
      set({ events: [...get().events, item].slice(-500) });
      if (late(sid)) archiveLate(sid, { events: [item] });
    },
    setFinal: (attemptId, candidateId, text, laneId) => get().logEvent({ kind: 'final', attemptId, candidateId, laneId, text }),
    withdrawFinal: text => get().logEvent({ kind: 'final-withdrawn', text }),
    markNoneAcceptable: text => get().logEvent({ kind: 'final-none', text }),
    markModerator: (mark, note) => get().logEvent({ kind: 'moderator-start', mark, note: note.trim(),
      text: (mark === 'pause' ? '技术暂停' : '主持人接手') + (note.trim() ? '：' + note.trim() : '') }),
    endModerator: () => get().logEvent({ kind: 'moderator-end', text: '交回设计者' }),
    // 登记条件是主持人的设置，不进撤销：载入时清掉撤销历史，否则一撤销就退回锁定以前的机架。
    loadCondition: id => {
      const condition = study.conditions.find(c => c.id === id);
      if (!condition) return;
      const project = structuredClone(get().project);
      for (const lane of project.lanes) {
        privatize(project, lane.id, 'frame');
        for (const [k, v] of Object.entries(condition.frame)) setValue(project, lane.id, 'frame.' + k, v);
      }
      set(s => ({ project, session: { ...s.session, lockedFrame: id }, past: [], future: [] }));
      get().logEvent({ kind: 'session', text: '载入并锁定登记条件：' + condition.label });
    },
    unlockCondition: () => {
      const current = get().sessions.find(s => s.id === get().currentSessionId && !s.endedAt);
      if (current?.kind === 'registered') { set({ notice: '登记场次里机架由程序锁定，不能解除。要换条件，先结束本场。' }); return; }
      if (!get().session.lockedFrame) return;
      set(s => ({ session: { ...s.session, lockedFrame: undefined } }));
      get().logEvent({ kind: 'session', text: '解除登记条件的锁定（试用）' });
    },
  };
});

// 本机保存；失败时提示一次。
if (typeof window !== 'undefined') {
  let warned = false;
  useStudio.subscribe(s => {
    try { localStorage.setItem(KEY, JSON.stringify({ ...pick(s), selection: s.selection, layout: s.layout, sessions: s.sessions, currentSessionId: s.currentSessionId })); warned = false; }
    catch { if (!warned) { warned = true; useStudio.setState({ notice: '浏览器没能保存当前项目，请导出规格。' }); } }
  });
}

export const studioParameters = (laneId: string, upto?: Layer) => laneParameters(useStudio.getState().project, laneId, upto);
