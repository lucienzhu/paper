// 一场的时间：主动操作、模型与排队等待、主持人交接、技术暂停、未知等待分开计（预试记录约定“主持与计时”；
// research-library/design/pilot.md 第 2、3 条：每场 15 分钟主动操作、至多 9 次提交机会、至多 9 张回图；无法取得精确时间时留空写原因）。
// 这里只做计算，不碰界面和存储，单元测试直接调用。
import { sessionLimits } from '../design/defaults.ts';
import type { SessionInfo } from './sessions';

export interface TimedEvent {
  id?: string; at: string; kind: string; text: string; attemptId?: string; candidateId?: string; callId?: string;
  task?: string; ok?: boolean; error?: string; startedAt?: string; endedAt?: string; mark?: 'handoff' | 'pause'; note?: string;
}
/** 一轮生成从确认到首次显示的各个时间点。哪一项取不到就留空，写进 missing。 */
export interface RoundTimes {
  attemptId: string; label: string; condition: 'structured' | 'free'; file?: string;
  frozenAt: string;
  sentAt?: string; serviceReceivedAt?: string; enqueuedAt?: string;
  /** ComfyUI 历史里的时间，用的是 GPU 主机的钟。 */
  executionStart?: string; executionEnd?: string;
  serviceCompletedAt?: string; receivedAt?: string; firstShownAt?: string;
  status: string; requests?: number; enqueueRequests?: number; candidates: { id: string; firstShown?: string }[];
  decisions: { at: string; kind: string; candidate?: string; reason: string }[];
}
type Category = 'handoff' | 'pause' | 'unknownWait' | 'wait';
interface Span { from: number; to: number; category: Category; what: string }

const ms = (iso?: string | null) => (iso ? Date.parse(iso) : NaN);
const order: Category[] = ['handoff', 'pause', 'unknownWait', 'wait'];

/**
 * 计时的规则（写进清单，便于核对）：
 * - 主持人交接、技术暂停：主持人在场次面板上点“接手/暂停”到“交回/恢复”；没交回就结束的，算到本场结束。
 * - 模型与排队等待：一轮从发出（没有发出时间就用确认时间）到候选首次显示；失败或放弃的到页面收到结论为止。文字模型的一次调用从发出到回答（或失败）。
 * - 未知等待：本场结束时还没回图、也没有结论的轮次，从发出到本场结束。
 * - 主动操作：本场的起止之间去掉以上几段（重叠的部分只算一次，按交接、暂停、未知等待、模型等待的先后归类）。
 *   设计者在等图时还可以继续改别的，这段时间按等待计；eventsDuringWaiting 写出等待时设计者做了几件事，供判断。
 */
export function sessionTiming(session: Pick<SessionInfo, 'startedAt' | 'endedAt'>, events: TimedEvent[], rounds: RoundTimes[], now = new Date().toISOString()) {
  const start = ms(session.startedAt), end = ms(session.endedAt ?? now), ongoing = !session.endedAt;
  const spans: Span[] = [];
  const missing: { what: string; reason: string }[] = [];
  const clip = (from: number, to: number) => [Math.max(start, from), Math.min(end, to)] as const;

  // 主持人交接与技术暂停
  const sorted = [...events].sort((a, b) => a.at.localeCompare(b.at));
  const marks: { kind: 'handoff' | 'pause'; from: string; to: string | null; note: string; closedBy: 'designer' | 'session-end' | 'ongoing' }[] = [];
  let open: { kind: 'handoff' | 'pause'; from: string; note: string } | null = null;
  for (const e of sorted) {
    if (e.kind === 'moderator-start') {
      if (open) marks.push({ ...open, to: e.at, closedBy: 'designer' });
      open = { kind: e.mark === 'pause' ? 'pause' : 'handoff', from: e.at, note: e.note ?? '' };
    } else if (e.kind === 'moderator-end' && open) { marks.push({ ...open, to: e.at, closedBy: 'designer' }); open = null; }
  }
  if (open) marks.push({ ...open, to: session.endedAt ?? null, closedBy: ongoing ? 'ongoing' : 'session-end' });
  for (const m of marks) { const [f, t] = clip(ms(m.from), m.to ? ms(m.to) : end); if (t > f) spans.push({ from: f, to: t, category: m.kind, what: m.note || (m.kind === 'handoff' ? '主持人交接' : '技术暂停') }); }

  // 文字模型的调用
  const text = sorted.filter(e => e.kind === 'ai-call' && e.startedAt).map(e => ({ callId: e.callId ?? null, task: e.task ?? '', from: e.startedAt!, to: e.endedAt ?? null, ok: !!e.ok,
    ms: e.endedAt ? ms(e.endedAt) - ms(e.startedAt) : null }));
  for (const c of text) {
    if (c.to) { const [f, t] = clip(ms(c.from), ms(c.to)); if (t > f) spans.push({ from: f, to: t, category: 'wait', what: '文字模型 ' + c.task }); }
    else missing.push({ what: '文字模型调用 ' + (c.callId ?? c.task), reason: '没有记下回答的时间' });
  }

  // 每一轮出图
  const image = rounds.map(r => {
    const from = r.sentAt ?? r.frozenAt;
    const shown = r.firstShownAt ?? r.candidates.find(c => c.firstShown)?.firstShown;
    const concluded = ['failed', 'abandoned'].includes(r.status) ? r.receivedAt : undefined;
    const to = shown ?? concluded ?? null;
    if (!r.sentAt) missing.push({ what: r.label + ' 的发出时间', reason: '这一轮是 4.3 以前出的，没有记发出时间，按确认时间算' });
    if (!to && !ongoing) missing.push({ what: r.label + ' 的首次显示时间', reason: '本场结束时还没回图，也没有失败的结论' });
    const queue = r.enqueuedAt && r.executionStart ? ms(r.executionStart) - ms(r.enqueuedAt) : null;
    const run = r.executionStart && r.executionEnd ? ms(r.executionEnd) - ms(r.executionStart) : null;
    if (r.status === 'succeeded' && run === null) missing.push({ what: r.label + ' 的模型执行时间', reason: '服务回执里没有 ComfyUI 的开始和结束时间' });
    if (to) { const [f, t] = clip(ms(from), ms(to)); if (t > f) spans.push({ from: f, to: t, category: 'wait', what: r.label }); }
    else { const [f, t] = clip(ms(from), end); if (t > f) spans.push({ from: f, to: t, category: ongoing ? 'wait' : 'unknownWait', what: r.label }); }
    return { attemptId: r.attemptId, label: r.label, from, to, ms: to ? ms(to) - ms(from) : null, status: r.status,
      // 入队到开始执行跨了两台机器的钟（本机与 GPU 主机），只作参考；执行时长两端都是 GPU 主机的钟。
      queueMs: queue, queueCrossesClocks: queue !== null, runMs: run, requests: r.requests ?? null, enqueueRequests: r.enqueueRequests ?? null };
  });

  // 把起止之间的每一段归到一个类别：重叠只算一次
  const cuts = [...new Set([start, end, ...spans.flatMap(s => [s.from, s.to])])].filter(x => x >= start && x <= end).sort((a, b) => a - b);
  const total: Record<Category | 'active', number> = { handoff: 0, pause: 0, unknownWait: 0, wait: 0, active: 0 };
  const waitingWindows: [number, number][] = [];
  for (let i = 0; i + 1 < cuts.length; i++) {
    const [a, b] = [cuts[i], cuts[i + 1]];
    const covering = spans.filter(s => s.from <= a && s.to >= b).map(s => s.category);
    const category = order.find(c => covering.includes(c)) ?? 'active';
    total[category] += b - a;
    if (category === 'wait' || category === 'unknownWait') waitingWindows.push([a, b]);
  }
  const designerKinds = new Set(['edit', 'fork', 'apply', 'own', 'lane', 'issue', 'ai-apply', 'ai-branch', 'ai-reject', 'direction', 'intent', 'compare', 'revise-from', 'free-run', 'run', 'final', 'final-withdrawn']);
  const eventsDuringWaiting = sorted.filter(e => designerKinds.has(e.kind) && waitingWindows.some(([a, b]) => ms(e.at) > a && ms(e.at) < b)).length;
  const opportunities = rounds.length, images = rounds.reduce((n, r) => n + r.candidates.length, 0);
  // 有未知等待时主动操作时间不定：只给上下限，不替它补一个数。
  const activeMs = total.unknownWait > 0 ? null : total.active;
  return {
    rule: '主动操作 = 本场起止之间去掉主持人交接、技术暂停、未知等待和模型与排队等待（重叠只算一次）；等待时设计者仍可操作，见 eventsDuringWaiting。',
    wall: { from: session.startedAt, to: session.endedAt ?? null, ms: end - start, ongoing },
    activeMs, activeBounds: { low: total.active, high: total.active + total.unknownWait },
    waiting: { ms: total.wait, image, text },
    unknownWaitMs: total.unknownWait,
    moderator: { ms: total.handoff, pauseMs: total.pause, intervals: marks },
    eventsDuringWaiting,
    missing,
    limits: { ...sessionLimits },
    used: { opportunities, images, requests: rounds.reduce((n, r) => n + (r.requests ?? 1), 0), enqueueRequests: rounds.reduce((n, r) => n + (r.enqueueRequests ?? 0), 0) },
    over: { active: total.active > sessionLimits.activeMinutes * 60000 ? true : activeMs === null ? null : false,
      opportunities: opportunities > sessionLimits.opportunities, images: images > sessionLimits.images },
  };
}
export type SessionTiming = ReturnType<typeof sessionTiming>;

// ---------- 场次事件表：列名照 research-library/design/session_events.csv ----------
export const eventColumns = ['anonymous_pair', 'session', 'task_version', 'condition', 'attempt', 'event', 'timestamp_with_zone', 'time_source',
  'candidate_code', 'shown_set', 'action', 'participant_reason', 'evidence_ref', 'missing_reason'] as const;
type Row = Partial<Record<typeof eventColumns[number], string>>;
const cell = (v = '') => /[",\n\r]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v;

/**
 * 按登记的场次事件表列出这一场的每一个时间点。时间都是 ISO 格式（带时区，Z 为协调世界时）；time_source 写明是哪台机器的钟：
 * browser（工作台页面）、workbench-service（本机服务）、comfyui（GPU 主机，ComfyUI 历史）、moderator（主持人在页面上点的）。
 * 取不到的时间留空，在 missing_reason 写原因。
 */
export function sessionEventsCsv(session: SessionInfo, task: string, events: TimedEvent[], rounds: RoundTimes[]) {
  const base: Row = { anonymous_pair: session.participant ?? '', session: String(session.no), task_version: task, condition: session.method === 'free' ? 'D' : 'S' };
  const rows: Row[] = [];
  const add = (row: Row) => rows.push({ ...base, ...row });
  add({ event: 'session_start', timestamp_with_zone: session.startedAt, time_source: 'browser', action: session.kind });
  for (const e of [...events].sort((a, b) => a.at.localeCompare(b.at))) {
    if (e.kind === 'moderator-start') add({ event: e.mark === 'pause' ? 'technical_pause_start' : 'moderator_handoff_start', timestamp_with_zone: e.at, time_source: 'moderator', participant_reason: e.note ?? '' });
    else if (e.kind === 'moderator-end') add({ event: 'moderator_end', timestamp_with_zone: e.at, time_source: 'moderator' });
    else if (e.kind === 'ai-call') {
      add({ event: 'ai_call_sent', timestamp_with_zone: e.startedAt ?? '', time_source: 'browser', action: e.task ?? '', evidence_ref: e.callId ? 'ai-calls.jsonl#' + e.callId : '', missing_reason: e.startedAt ? '' : '没有记下发出时间' });
      add({ event: e.ok ? 'ai_call_answered' : 'ai_call_failed', timestamp_with_zone: e.endedAt ?? '', time_source: 'browser', action: e.task ?? '',
        participant_reason: e.ok ? '' : e.error ?? '', evidence_ref: e.callId ? 'ai-calls.jsonl#' + e.callId : '', missing_reason: e.endedAt ? '' : '没有记下回答时间' });
    } else if (e.kind === 'final' || e.kind === 'final-withdrawn' || e.kind === 'final-none')
      add({ event: e.kind.replace('-', '_'), timestamp_with_zone: e.at, time_source: 'browser', attempt: e.attemptId ?? '', candidate_code: e.candidateId ?? '', participant_reason: e.text });
  }
  for (const r of rounds) {
    const ref = r.file ?? '';
    const point = (event: string, at: string | undefined, source: string, missingReason: string, extra: Row = {}) =>
      add({ attempt: r.attemptId, event, timestamp_with_zone: at ?? '', time_source: source, evidence_ref: ref, missing_reason: at ? '' : missingReason, ...extra });
    point('confirm', r.frozenAt, 'browser', '');
    point('submit', r.sentAt, 'browser', '4.3 以前的轮次没有记发出时间');
    point('service_received', r.serviceReceivedAt, 'workbench-service', '服务回执里没有');
    point('queue', r.enqueuedAt, 'workbench-service', r.status === 'failed' ? '没有入队（服务拒收或入队前失败）' : '服务回执里没有入队时间');
    point('run_start', r.executionStart, 'comfyui', 'ComfyUI 历史里没有');
    point('run_end', r.executionEnd, 'comfyui', 'ComfyUI 历史里没有');
    point('return', r.receivedAt, 'browser', '页面还没有收到回图或结论');
    for (const c of r.candidates) point('first_shown', c.firstShown, 'browser', '候选还没有显示过', { candidate_code: c.id, shown_set: r.attemptId });
    for (const d of r.decisions) point('decision', d.at, 'browser', '', { candidate_code: d.candidate ?? '', action: d.kind, participant_reason: d.reason });
    if (['failed', 'abandoned', 'unconfirmed'].includes(r.status)) point('outcome', r.receivedAt ?? r.serviceCompletedAt, 'browser', '结论还没有到', { action: r.status });
  }
  if (session.endedAt) add({ event: 'session_end', timestamp_with_zone: session.endedAt, time_source: 'browser', participant_reason: session.endReason ?? '' });
  rows.sort((a, b) => (a.timestamp_with_zone || '9').localeCompare(b.timestamp_with_zone || '9'));
  return eventColumns.join(',') + '\n' + rows.map(r => eventColumns.map(c => cell(r[c])).join(',')).join('\n') + '\n';
}
