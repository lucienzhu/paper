// 4.0 的工作区状态：项目（意图与决定链）、AI 的建议与方向、对话、比较、场次设置，以及撤销与重做。
// 只存在本机浏览器里；候选图和生成回执另存（candidateRecords，IndexedDB）。
// 4.2 起有“场次”：每条事件、对话、建议、方向、比较和每一轮生成都写下属于哪一场，导出本场材料只取这一场的。
import { create } from 'zustand';
import type { TaskId } from '../types/DroneParameters';
import type { EvidenceTier } from '../design/evidence/registry.mjs';
import { study, studyBriefs } from '../design/defaults';
import {
  applyLayer, clearValue, forkAt, isBlankProject, laneNode, laneParameters, layerOf, layers, migrate, newId, newProject, privatize, removeLane,
  setValue, staleFields, studioTask, type IntentElement, type Layer, type Project,
} from './model';
import { getPath } from '../design/fields';
import type { DroneParameters } from '../types/DroneParameters';
import { methodLabel, saveArchive, type SessionInfo, type SessionMethod } from './sessions';
export type { SessionMethod } from './sessions';

export interface Change { field: string; value: unknown; from: unknown; label: string; layer: Layer; why?: string }
export interface Suggestion {
  id: string; callId: string; mode: 'model' | 'fixture'; at: string;
  laneId: string; layer: Layer; title: string; why: string; changes: Change[];
  evidence: string[]; tier: EvidenceTier; cards: string[];
  status: 'pending' | 'applied' | 'branched' | 'rejected'; resultLaneId?: string; reason?: string; sessionId?: string;
}
export interface DirectionChange extends Change { evidence: string[]; tier: EvidenceTier; cards: string[] }
export interface Direction {
  id: string; callId: string; mode: 'model' | 'fixture'; at: string;
  name: string; summary: string; changes: DirectionChange[];
  status: 'pending' | 'placed' | 'dismissed'; laneId?: string; sessionId?: string;
}
export type Scope = { kind: 'intent' } | { kind: 'layer'; laneId: string; layer: Layer } | { kind: 'candidate'; laneId: string; attemptId: string; candidateId: string } | { kind: 'free' };
export interface Turn { id: string; at: string; role: 'user' | 'assistant'; text: string; scope: Scope; callId?: string; mode?: 'model' | 'fixture'; suggestionIds?: string[]; otherLayer?: { layer: Layer; why: string }; /** 自由提示那一场：助手起草的提示词。 */ draft?: string; sessionId?: string }
export interface CompareRecord { id: string; at: string; laneId?: string; candidates: { attemptId: string; candidateId: string }[]; chosen?: string; reason?: string; observation?: string; sessionId?: string }
export interface ProjectEvent { id: string; at: string; kind: string; text: string; laneId?: string; layer?: Layer;
  /** 这件事对应的生成轮次。 */ attemptId?: string;
  /** 自由提示那一场：发出的文字是设计者自己写的、AI 起草后原样用的，还是起草后改过的。 */ source?: 'typed' | 'draft' | 'draft-edited'; draftTurnId?: string;
  /** 4.2：属于哪一场。 */ sessionId?: string;
  /** 这件事对应的 AI 调用（例如读意图）。导出本场材料时按它找日志。 */ callId?: string }
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
/** 画布上被设计者拖过的节点位置。不进撤销历史，“整理”清空。 */
export type Layout = Record<string, { x: number; y: number }>;
interface Studio extends Saved {
  selection: Selection;
  layout: Layout;
  /** 本机的全部场次（不进撤销历史，新建项目也不清）。 */
  sessions: SessionInfo[];
  currentSessionId: string | null;
  /** 返回正在进行的这一场；没有就开一场自由试用。每条记录写下场次编号前都先调它。 */
  ensureSession: () => string;
  /** 主持人开一场：结束上一场；项目不是空白的就另开一个空白项目；有委托时任务定为日常航拍并载入锁定 C2 的机架。 */
  startSession: (input: SessionSetupInput) => void;
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
  past: Saved[];
  future: Saved[];
  select: (s: Selection) => void;
  setNotice: (text: string) => void;
  undo: () => void;
  redo: () => void;
  reset: (taskId?: TaskId) => void;
  // 意图
  setIntentText: (text: string) => void;
  applyReading: (reading: IntentReading) => void;
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
  // AI
  addSuggestions: (list: Suggestion[]) => void;
  resolveSuggestion: (id: string, action: 'apply' | 'branch' | 'reject', reason?: string) => string | null;
  setDirections: (list: Direction[]) => void;
  placeDirection: (id: string) => string | null;
  dismissDirection: (id: string) => void;
  addTurn: (turn: Turn) => void;
  // 比较与场次
  toggleCompare: (key: string) => void;
  clearCompare: () => void;
  recordCompare: (record: CompareRecord) => void;
  setSession: (method: SessionMethod) => void;
  /** 只记一笔，不进撤销历史。 */
  logEvent: (event: Omit<ProjectEvent, 'id' | 'at'>) => void;
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

export const useStudio = create<Studio>((set, get) => {
  /** 正在进行的这一场；没有就开一场自由试用（沿用当前方式和项目）。 */
  function ensure(): string {
    const { currentSessionId, sessions } = get();
    if (currentSessionId && sessions.some(s => s.id === currentSessionId && !s.endedAt)) return currentSessionId;
    return begin({ method: get().session.method }, 'trial');
  }
  function begin(input: SessionSetupInput, kind: SessionInfo['kind']): string {
    const { sessions, project } = get();
    const info: SessionInfo = {
      id: newId('session'), no: sessions.reduce((m, s) => Math.max(m, s.no), 0) + 1, projectId: project.id, projectCreatedAt: project.createdAt,
      method: input.method, kind, briefId: input.briefId, participant: input.participant?.trim() || undefined, order: input.order, startedAt: now(),
    };
    // 撤销不跨场：新的一场从空的撤销历史开始（否则开场后一撤销，登记的机架锁定也会被撤掉）。
    set({ sessions: [...sessions, info].slice(-200), currentSessionId: info.id, past: [], future: [] });
    return info.id;
  }
  /** 结束这一场，并把这一场的工作区记录存进本机存档（导出旧场次时用）。 */
  function finish(reason: string) {
    const { currentSessionId, sessions } = get();
    const current = sessions.find(s => s.id === currentSessionId && !s.endedAt);
    if (!current) { set({ currentSessionId: null }); return; }
    const ended: SessionInfo = { ...current, endedAt: now(), endReason: reason };
    set({ sessions: sessions.map(s => s.id === ended.id ? ended : s), currentSessionId: null });
    void saveArchive(ended.id, sessionSlice(pick(get()), ended)).catch(() => set({ notice: '这一场的记录没能存进本机存档；导出时会从当前项目里取。' }));
  }
  /** 有正在进行的一场就记一笔“结束本场”再结束它。 */
  function close(reason: string) {
    if (!get().sessions.some(s => s.id === get().currentSessionId && !s.endedAt)) return null;
    const ending = get().sessions.find(s => s.id === get().currentSessionId) ?? null;
    get().logEvent({ kind: 'session-end', text: '结束本场：' + reason });
    finish(reason);
    return ending;
  }
  /** 一次可以撤销的改动：先存下改动前的状态，再在副本上改。 */
  function commit(change: (draft: Saved) => void, event?: Omit<ProjectEvent, 'id' | 'at'>) {
    const sessionId = event ? ensure() : undefined;
    const before = pick(get());
    const draft = structuredClone(before);
    change(draft);
    if (event) draft.events = [...draft.events, { id: newId('ev'), at: now(), sessionId, ...event }].slice(-500);
    set({ ...draft, past: [...get().past, before].slice(-60), future: [] });
  }
  const locked = (s: Saved, path: string) => !!s.session.lockedFrame && layerOf(path) === 'frame';
  /** 另开一个空白项目（沿用方式）。撤销历史清空：撤销不能跨到上一个项目、上一场。 */
  function freshProject(taskId: TaskId) {
    const method = get().session.method;
    set({ ...initial(), project: newProject(taskId), session: { method }, selection: null, layout: {}, comparing: [], past: [], future: [] });
  }

  return {
    ...load(),
    ...loadSessions(),
    selection: loadSelection(), layout: loadLayout(), comparing: [], notice: '', past: [], future: [],
    ensureSession: ensure,
    startSession: input => {
      close('开始新的一场');
      const s = get();
      const brief = input.briefId ? studyBriefs.find(b => b.id === input.briefId) : undefined;
      const taskId: TaskId = brief ? 'consumer_camera' : s.project.intent.taskId;
      if (!isBlankProject(s.project) || hasRuns(s) || s.project.intent.text.trim() || s.project.intent.taskId !== taskId) freshProject(taskId);
      set(st => ({ session: { ...st.session, method: input.method, lockedFrame: undefined } }));
      begin(input, brief ? 'registered' : 'trial');
      get().logEvent({ kind: 'session-start', text: `开始本场：${methodLabel[input.method]}` + (brief ? ' · ' + brief.label : ' · 自由试用')
        + (input.participant?.trim() ? ' · ' + input.participant.trim() : '') + (input.order ? ` · 该参与者第 ${input.order} 场` : '') });
      if (brief) get().loadCondition(brief.condition);
      set({ past: [], future: [] });
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
        const drift = staleFields(frozen, laneParameters(d.project, laneId)).map(x => x.path);
        const paths = [...new Set([...drift, ...changes.map(c => c.field)])];
        const earliest = layers.find(l => paths.some(p => layerOf(p) === l)) ?? 'cmf';
        id = forkAt(d.project, laneId, earliest, name, reason).id;
        d.project.activeLaneId = id;
        for (const path of drift) setValue(d.project, id, path, getPath(frozen, path));
        for (const c of changes) setValue(d.project, id, c.field, c.value);
      }, { kind: 'revise-from', laneId, text: '从一张旧候选另开方向修改：' + reason });
      return id;
    },
    select: selection => set(selection && (selection.kind === 'layer' || selection.kind === 'render') && get().project.lanes.some(l => l.id === selection.laneId)
      ? { selection, project: { ...get().project, activeLaneId: selection.laneId } } : { selection }),
    setNotice: notice => set({ notice }),
    undo: () => { const { past } = get(); if (!past.length) return; const prev = past[past.length - 1];
      set({ ...prev, past: past.slice(0, -1), future: [pick(get()), ...get().future].slice(0, 60) }); },
    redo: () => { const { future } = get(); if (!future.length) return; const next = future[0];
      set({ ...next, past: [...get().past, pick(get())].slice(-60), future: future.slice(1) }); },
    reset: (taskId = 'consumer_camera') => {
      // 新建项目就是另起一场：先结束这一场（它的记录存进本机存档），再开空白项目和一场自由试用。
      close('新建项目');
      freshProject(taskId);
      begin({ method: get().session.method }, 'trial');
      get().logEvent({ kind: 'reset', text: '新建项目：' + studioTask(taskId).short });
    },

    setIntentText: text => commit(d => { d.project.intent.text = text; d.project.intent.confirmedAt = undefined; }),
    applyReading: r => commit(d => {
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
    }, { kind: 'ai-intent', text: 'AI 读了意图', callId: r.callId }),
    setElement: (id, patch) => commit(d => {
      d.project.intent.elements = d.project.intent.elements.map(e => e.id === id ? { ...e, ...patch } : e);
      d.project.intent.confirmedAt = undefined;
    }),
    addElement: element => commit(d => { d.project.intent.elements.push({ ...element, id: newId('el') }); }),
    setIntentState: state => commit(d => { d.project.intent.state = state; d.project.intent.question = undefined; }, { kind: 'intent', text: '确认观察状态' }),
    toggleCard: id => commit(d => {
      const cards = d.project.intent.cards;
      d.project.intent.cards = cards.includes(id) ? cards.filter(c => c !== id) : [...cards, id];
    }),
    confirmIntent: () => commit(d => {
      d.project.intent.confirmedAt = now();
      d.project.intent.elements = d.project.intent.elements.map(e => e.status === 'pending' ? { ...e, status: 'rejected' } : e);
    }, { kind: 'intent', text: '确认意图' }),

    setField: (laneId, path, value) => {
      if (locked(get(), path)) { set({ notice: '机架是这一场登记的条件，已锁定。要改，先在场次设置里解除。' }); return; }
      commit(d => { setValue(d.project, laneId, path, value); }, { kind: 'edit', laneId, layer: layerOf(path) ?? undefined, text: '改了一项：' + path });
    },
    setMany: (laneId, entries, label) => {
      const allowed = entries.filter(([p]) => !locked(get(), p));
      if (allowed.length < entries.length) set({ notice: '机架是这一场登记的条件，已锁定。' });
      if (!allowed.length) return;
      commit(d => { for (const [p, v] of allowed) setValue(d.project, laneId, p, v); }, { kind: 'edit', laneId, text: label });
    },
    clearField: (laneId, path) => {
      if (locked(get(), path)) return;
      commit(d => { clearValue(d.project, laneId, path); }, { kind: 'edit', laneId, text: '改回起始值：' + path });
    },
    fork: (laneId, layer, name, reason) => {
      let id = '';
      commit(d => { id = forkAt(d.project, laneId, layer, name, reason).id; d.project.activeLaneId = id; },
        { kind: 'fork', laneId, layer, text: `在${layerName[layer]}处分叉` + (reason ? '：' + reason : '') });
      // 分出来以后，面板跟到新方向的这一层：接下来的改动落在新方向上。
      set({ selection: { kind: 'layer', laneId: id, layer } });
      return id;
    },
    applyFrom: (fromLane, toLane, layer) => commit(d => { applyLayer(d.project, fromLane, toLane, layer); },
      { kind: 'apply', laneId: toLane, layer, text: `把“${get().project.lanes.find(l => l.id === fromLane)?.name ?? fromLane}”的${layerName[layer]}套用过来` }),
    ownLayer: (laneId, layer) => commit(d => { privatize(d.project, laneId, layer); },
      { kind: 'own', laneId, layer, text: `让这条方向从${layerName[layer]}起有自己的节点` }),
    dropLane: laneId => commit(d => { removeLane(d.project, laneId); }, { kind: 'lane', laneId, text: '删去一条方向' }),
    renameLane: (laneId, name) => commit(d => { d.project.lanes = d.project.lanes.map(l => l.id === laneId ? { ...l, name } : l); }),
    collapseLane: (laneId, collapsed) => set(s => ({ project: { ...s.project, lanes: s.project.lanes.map(l => l.id === laneId ? { ...l, collapsed } : l) } })),
    setActiveLane: laneId => set(s => ({ project: { ...s.project, activeLaneId: laneId,
      lanes: s.project.lanes.map(l => l.id === laneId ? { ...l, collapsed: false } : l) } })),
    addIssue: (laneId, layer, text, fromCandidate) => commit(d => {
      laneNode(d.project, laneId, layer).issues.push({ id: newId('issue'), text, fromCandidate, at: now() });
    }, { kind: 'issue', laneId, layer, text: `把问题送回${layerName[layer]}：` + text }),
    resolveIssue: (laneId, layer, issueId) => commit(d => {
      const node = laneNode(d.project, laneId, layer);
      node.issues = node.issues.map(i => i.id === issueId ? { ...i, resolved: true } : i);
    }),

    addSuggestions: list => { const sessionId = ensure(); set(s => ({ suggestions: [...s.suggestions, ...list.map(x => ({ ...x, sessionId }))].slice(-300) })); },
    resolveSuggestion: (id, action, reason) => {
      const s = get().suggestions.find(x => x.id === id);
      if (!s || s.status !== 'pending') return null;
      if (action !== 'reject' && s.changes.some(c => locked(get(), c.field))) { set({ notice: '这条建议改到了锁定的机架，不能采用。' }); return null; }
      let laneId: string | null = s.laneId;
      commit(d => {
        if (action === 'branch') {
          const parent = d.project.lanes.find(l => l.id === s.laneId);
          const name = `${parent?.name ?? '方向'} · 试${[...new Set(s.changes.map(c => c.label))].slice(0, 2).join('、')}`;
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
    setDirections: list => { const sessionId = ensure();
      commit(d => { d.directions = [...d.directions.filter(x => x.status !== 'pending'), ...list.map(x => ({ ...x, sessionId }))]; }, { kind: 'ai-directions', text: `AI 提了 ${list.length} 个方向` }); },
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
          laneId = forkAt(p, p.activeLaneId, first, dir.name, 'AI 方向提议').id;
        }
        for (const c of usable) setValue(p, laneId, c.field, c.value);
        p.activeLaneId = laneId;
        d.directions = d.directions.map(x => x.id === id ? { ...x, status: 'placed', laneId } : x);
      }, { kind: 'direction', text: '把方向放上画布：' + dir.name });
      return laneId;
    },
    dismissDirection: id => commit(d => { d.directions = d.directions.map(x => x.id === id ? { ...x, status: 'dismissed' } : x); }),
    addTurn: turn => { const sessionId = ensure(); set(s => ({ turns: [...s.turns, { ...turn, sessionId }].slice(-400) })); },

    toggleCompare: key => set(s => ({ comparing: s.comparing.includes(key) ? s.comparing.filter(k => k !== key) : [...s.comparing, key].slice(-4) })),
    clearCompare: () => set({ comparing: [] }),
    recordCompare: record => { const sessionId = ensure();
      commit(d => { d.compares = [...d.compares.filter(c => c.id !== record.id), { ...record, sessionId: record.sessionId ?? sessionId }]; },
        { kind: 'compare', text: '比较并取舍' + (record.reason ? '：' + record.reason : '') }); },
    // 换方式就是换一场：结束这一场，在同一个项目里开下一场。委托（设计者看到的就是它）和参与者编号沿用；
    // 次序不沿用（换了方式多半是这个人的另一场），要记次序就用“开始本场”。
    setSession: method => {
      const current = get().sessions.find(s => s.id === get().currentSessionId && !s.endedAt);
      if (current && current.method === method) return;
      const before = close(`切换为“${methodLabel[method]}”`);
      set(s => ({ session: { ...s.session, method } }));
      begin({ method, briefId: before?.briefId, participant: before?.participant }, before?.kind ?? 'trial');
      get().logEvent({ kind: 'session-start', text: '开始本场：' + methodLabel[method] + (before ? '（由上一场切换方式而来）' : '') });
    },
    logEvent: event => { const sessionId = ensure(); set({ events: [...get().events, { id: newId('ev'), at: now(), sessionId, ...event }].slice(-500) }); },
    loadCondition: id => {
      const condition = study.conditions.find(c => c.id === id);
      if (!condition) return;
      commit(d => {
        for (const lane of d.project.lanes) {
          privatize(d.project, lane.id, 'frame');
          for (const [k, v] of Object.entries(condition.frame)) setValue(d.project, lane.id, 'frame.' + k, v);
        }
        d.session.lockedFrame = id;
      }, { kind: 'session', text: '载入并锁定登记条件：' + condition.label });
    },
    unlockCondition: () => commit(d => { d.session.lockedFrame = undefined; }, { kind: 'session', text: '解除登记条件的锁定' }),
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
