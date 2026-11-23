// 导出：工作区记录，以及按场次打包的“本场材料”。
// 本场材料只装这一场的东西：这一场的事件、对话、建议、方向和比较；这一场冻结的每一轮（输入、回执、候选原图）；
// 这一场引用过的 AI 调用。同一个项目里切换过工作台和自由提示，也是一场一个 ZIP，标签与内容一致。
// 4.3：每一轮附上服务端留下的原件（实发请求、入队回执、运行历史、拒收时的回答）；AI 调用按场次取回，失败的也在；
// 清单里的出图后端和文字模型取自这一场开场时的记录和这一场的回执，不取导出时的配置；写明当前终稿；
// 按登记的口径分开计时（主动操作、模型与排队等待、主持人交接、技术暂停、未知等待），并按登记的场次事件表列出每个时间点。
import { download, fileStamp } from '../design/exporters';
import { registryVersion } from '../design/evidence/registry.mjs';
import { imageBackend } from '../design/imageBackend';
import { attemptRecord, hashBlob, listAttempts, type FrozenAttempt } from '../design/candidateRecords';
import { evidenceSummary } from '../design/defaults';
import { sessionSlice, useStudio } from './store';
import { describeAi } from './ai';
import { briefOf, currentFinal, loadArchive, methodLabel, registrable, roundsOfSession, sessionStem, sessionTitle, type SessionEnvironment, type SessionInfo } from './sessions';
import { studioTasks } from './model';
import { zipBytes, type ZipEntry } from './zip';
import { sessionEventsCsv, sessionTiming, type RoundTimes } from './timing';
import { roundStatus, roundTimes, storedJob, type ServiceJob } from './roundTimes';
import { STUDIO_NAME, STUDIO_VERSION } from './version';
export { STUDIO_VERSION } from './version';

/** 导出这一刻的配置（不是某一场的）。清单里单列为 exportedWith，不拿它当某一场用的模型。 */
async function exportEnvironment() {
  const [ai, backend] = await Promise.all([describeAi(), imageBackend().catch(() => null)]);
  return {
    app: { name: STUDIO_NAME, version: STUDIO_VERSION },
    textModel: { mode: ai.mode, provider: ai.provider, model: ai.model, endpoint: ai.endpoint ?? null, effort: ai.effort ?? null, label: ai.label },
    imageBackend: backend, evidenceRegistry: registryVersion,
  };
}

/** 整个项目的工作区记录（含项目里的各场）。和“本场材料”分开：这一份不按场次拆。 */
export async function exportWorkspace() {
  const s = useStudio.getState();
  const record = {
    schema: 'workbench/v4-export', scope: 'project', exportedAt: new Date().toISOString(), exportedWith: await exportEnvironment(),
    sessions: s.sessions.filter(x => x.projectId === s.project.id), currentSessionId: s.currentSessionId,
    session: s.session, project: s.project, suggestions: s.suggestions, directions: s.directions, turns: s.turns, compares: s.compares, events: s.events,
  };
  download(`workbench4-project-${fileStamp()}.json`, JSON.stringify(record, null, 2), 'application/json');
}

const hex = async (bytes: Uint8Array) => [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes as BufferSource))].map(b => b.toString(16).padStart(2, '0')).join('');
const fromBase64 = (b64: string) => Uint8Array.from(atob(b64), ch => ch.charCodeAt(0));

/**
 * 这一场的工作区记录。已经结束的一场用结束那一刻存下的本机存档（项目快照停在那一刻），
 * 再补上存档之后才到、还在当前项目里的这一场的记录（例如晚到的 AI 回答）；
 * 正在进行的一场，或存档缺失而项目还在时，从当前状态里按场次编号取。
 */
async function sliceFor(session: SessionInfo) {
  const s = useStudio.getState();
  const live = session.projectId === s.project.id || s.sessions.some(x => x.id === session.id) ? sessionSlice(s, session) : null;
  if (session.endedAt) {
    const archived = await loadArchive(session.id).catch(() => undefined);
    if (archived) {
      const slice = archived.record as ReturnType<typeof sessionSlice>;
      let added = 0;
      if (live) for (const key of ['events', 'turns', 'suggestions', 'directions', 'compares'] as const) {
        const have = slice[key] as { id: string }[];
        const extra = (live[key] as { id: string }[]).filter(x => !have.some(y => y.id === x.id));
        added += extra.length;
        (slice as Record<string, unknown>)[key] = [...have, ...extra].sort((a, b) => String((a as { at?: string }).at ?? '').localeCompare(String((b as { at?: string }).at ?? '')));
      }
      return { slice: { ...slice, session: { ...session, ...(slice.session ?? {}), environment: slice.session?.environment ?? session.environment } }, from: 'archive' as const, added };
    }
  }
  if (session.projectId === s.project.id) return { slice: sessionSlice(s, session), from: 'live' as const, added: 0 };
  throw new Error(`${sessionTitle(session)} 的项目已经换掉，本机也没有这一场的存档，导不出工作区记录。`);
}

/**
 * 这一轮在界面上叫什么，导出的文件名和清单照抄：工作台按画布上的叫法（方向名、这条方向在整个项目里的第几轮，
 * 一条方向可能跨过几场）；自由提示按这一场的第几轮（自由提示的界面只列这一场）。
 */
function roundLabels(rounds: FrozenAttempt[], session: SessionInfo, all: FrozenAttempt[]) {
  return rounds.map((a, i) => {
    if (session.method === 'free') return { label: `自由提示第${i + 1}轮`, lane: null };
    const n = all.filter(x => x.variantScope === a.variantScope).sort((x, y) => x.createdAt.localeCompare(y.createdAt)).findIndex(x => x.id === a.id) + 1;
    return { label: `${a.variantName}第${n}轮`, lane: a.variantName };
  });
}

interface ServerFiles { attemptId: string; status: string; comfy: ServiceJob['comfy']; files: { name: string; bytes: number; sha256: string; base64: string }[]; missing: string[]; notes: string[] }
/** 这一轮在本机服务那边留下的原件。服务连不上或不提供时返回 null，清单里写明。 */
async function serverFiles(id: string): Promise<ServerFiles | null> {
  try {
    const response = await fetch('/api/h3/jobs/' + encodeURIComponent(id) + '/files', { cache: 'no-store', credentials: 'omit', signal: AbortSignal.timeout(30000) });
    return response.ok ? await response.json() as ServerFiles : null;
  } catch { return null; }
}

interface LogEntry { id: string; at: string; task: string; sessionId?: string | null; mode: string; provider: string; endpoint?: string | null; model?: string | null; requestedModel?: string | null;
  servedModel?: string | null; request?: { reasoning_effort?: string; max_completion_tokens?: number } | null; finishReason?: string | null; latencyMs?: number; error?: string; code?: string;
  usage?: { completion_tokens?: number } | null }

/** 一场的全部材料打成一个 ZIP，返回给界面的一句说明。不给场次就导出正在进行的这一场（没有就导出最近的一场）。 */
export async function exportSessionBundle(sessionId?: string): Promise<string> {
  const st = useStudio.getState();
  const session = st.sessions.find(x => x.id === (sessionId ?? st.currentSessionId)) ?? [...st.sessions].reverse().find(x => x.projectId === st.project.id);
  if (!session) throw new Error('这个项目还没有开始过一场，没有可导出的本场材料。');
  const enc = new TextEncoder();
  const { slice, from, added } = await sliceFor(session);
  const recorded: SessionEnvironment | null = slice.session?.environment ?? session.environment ?? null;
  const all = await listAttempts();
  const { rounds, legacy } = roundsOfSession(session, all);
  const labels = roundLabels(rounds, session, all);
  const exportedWith = await exportEnvironment();
  const brief = briefOf(session);
  const files: ZipEntry[] = [];

  let candidates = 0;
  const roundList: Record<string, unknown>[] = [];
  const times: RoundTimes[] = [];
  const ownIds = new Set(rounds.map(a => a.id));
  const endedAt = session.endedAt;
  let decisionsAfterEnd = 0;
  for (const [i, a] of rounds.entries()) {
    const label = labels[i].label;
    const stem = `rounds/${String(i + 1).padStart(2, '0')}-${label}-${a.id.slice(0, 8)}`;
    files.push({ name: stem + '.json', data: enc.encode(JSON.stringify(await attemptRecord(a))) });
    const pngs: string[] = [];
    const known = new Map<string, string>();
    for (const [j, c] of a.candidates.entries()) {
      const name = `${stem}-候选${j + 1}.png`;
      files.push({ name, data: new Uint8Array(await c.file.arrayBuffer()) }); pngs.push(name); candidates++;
      known.set(c.hash, name);
    }
    known.set(await hashBlob(a.guide), stem + '.json（guide）');
    if (a.parentImage) known.set(await hashBlob(a.parentImage), stem + '.json（parentImage）');
    // 服务端原件：实发请求、实发文字、入队回执、运行历史、拒收时的回答。与已经打包的候选原图、条件图、父图字节相同的 PNG 不再重复装，只在清单里注明是哪一个。
    const server = await serverFiles(a.id);
    const serverList: { name: string; sha256: string; bytes: number; inZipAs: string }[] = [];
    for (const f of server?.files ?? []) {
      const same = f.name.endsWith('.png') ? known.get(f.sha256) : undefined;
      const inZipAs = same ?? `${stem}-服务端/${f.name}`;
      if (!same) files.push({ name: inZipAs, data: fromBase64(f.base64) });
      serverList.push({ name: f.name, sha256: f.sha256, bytes: f.bytes, inZipAs });
    }
    const job = (() => { const raw = server?.files.find(f => f.name === 'job.json'); try { return raw ? JSON.parse(new TextDecoder().decode(fromBase64(raw.base64))) as ServiceJob : null; } catch { return null; } })() ?? await storedJob(a);
    times.push(roundTimes(a, label, job, stem + '.json'));
    const parentRound = a.parentId?.split('/')[0];
    const late = endedAt ? a.decisions.filter(d => d.at > endedAt).length : 0;
    decisionsAfterEnd += late;
    roundList.push({ file: stem + '.json', label, attemptId: a.id, method: a.condition === 'free' ? '自由提示' : '工作台', lane: labels[i].lane,
      createdAt: a.createdAt, status: roundStatus(a), issue: a.h3?.issue ?? null, candidates: pngs,
      requests: a.h3?.requests ?? null, enqueueRequests: job?.comfy?.enqueueRequests ?? null, promptId: job?.comfy?.promptId ?? a.h3?.traceId ?? null,
      parent: parentRound ? (ownIds.has(parentRound) ? '本场的一轮' : '另一场的一轮（父图原件已含在这一轮的记录里）') : null,
      serverFiles: server ? { found: serverList, missing: server.missing, notes: server.notes } : { found: [], missing: ['服务端原件（本机服务连不上，或这个后端不提供）'], notes: [] },
      sessionIdOnRecord: a.sessionId ?? null, attributedByTime: legacy.includes(a.id), decisionsAfterSessionEnd: late });
  }

  // 这一场的 AI 调用：浏览器记下的调用编号，加上服务日志里按场次编号找到的（包括浏览器没记下的失败）。
  const ids = [...new Set([...slice.events.map(e => e.callId), ...slice.directions.map(d => d.callId), ...slice.suggestions.map(x => x.callId), ...slice.turns.map(t => t.callId)]
    .filter((id): id is string => typeof id === 'string' && !!id))];
  let log: { entries: LogEntry[]; missing: string[]; bySession: string[]; reachable: boolean } = { entries: [], missing: ids, bySession: [], reachable: false };
  try {
    const response = await fetch('/api/ai/log', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids, sessionId: session.id }), credentials: 'omit', cache: 'no-store' });
    if (response.ok) { const data = await response.json(); log = { entries: data.entries ?? [], missing: data.missing ?? [], bySession: data.bySession ?? [], reachable: true }; }
  } catch { /* 本机服务不在时只打包浏览器里的部分，并在清单里写明 */ }
  log.entries.sort((a, b) => a.at.localeCompare(b.at));
  files.push({ name: 'ai-calls.jsonl', data: enc.encode(log.entries.map(e => JSON.stringify(e)).join('\n') + (log.entries.length ? '\n' : '')) });
  // 请求没到服务（没有调用编号）的失败：只有浏览器这边的记录。
  const neverReached = slice.events.filter(e => e.kind === 'ai-call' && !e.ok && !e.callId).map(e => ({ task: e.task, at: e.startedAt ?? e.at, error: e.error ?? '' }));

  // 出图后端和文字模型：这一场开场时的记录为准；再从这一场的调用和轮次回执里看实际用了什么，两者对不上就写明。
  const observedText = [...new Map(log.entries.filter(e => e.mode === 'model').map(e => {
    const v = { provider: e.provider, endpoint: e.endpoint ?? null, model: e.requestedModel ?? e.model ?? null, servedModel: e.servedModel ?? null, effort: e.request?.reasoning_effort ?? null };
    return [JSON.stringify(v), v];
  })).values()];
  const observedImage = [...new Set(rounds.map(a => a.h3?.model).filter((x): x is NonNullable<typeof x> => !!x))];
  const textModel = recorded?.textModel ?? (observedText.length === 1 ? { ...observedText[0], mode: 'model', label: observedText[0].model ?? '', source: '从这一场的调用回执推出' } : null);
  const image = recorded?.imageBackend ?? (observedImage.length === 1 ? { model: observedImage[0], source: '从这一场的轮次回执推出' } : null);
  const textMatches = observedText.every(o => !textModel || (o.model === textModel.model && o.endpoint === (textModel.endpoint ?? o.endpoint)));
  const imageMatches = observedImage.every(m => !image || m === image.model);

  const timing = sessionTiming(session, slice.events, times);
  const final = currentFinal(slice.events);
  const finalLabel = (attemptId?: string) => { const i = rounds.findIndex(a => a.id === attemptId); return i >= 0 ? labels[i].label : null; };
  const task = (id => studioTasks.find(t => t.id === id)?.label ?? id)((slice.project as { intent: { taskId: string } }).intent.taskId);
  const summary = session.evidenceSummary ?? null;
  const taskVersion = `${brief ? '委托' + brief.id : '无委托'}·依据摘要${summary?.version ?? '无'}`;
  files.push({ name: 'session-events.csv', data: enc.encode(sessionEventsCsv(session, taskVersion, slice.events, times)) });
  files.unshift({ name: 'workspace.json', data: enc.encode(JSON.stringify({ schema: 'workbench/v4-session', exportedAt: new Date().toISOString(),
    environment: recorded, exportedWith, ...slice, source: from, addedAfterArchive: added }, null, 2)) });

  const listed = await Promise.all(files.map(async f => ({ name: f.name, bytes: f.data.length, sha256: await hex(f.data) })));
  const title = sessionTitle(session);
  const failedCalls = log.entries.filter(e => e.error);
  const manifest = {
    schema: 'workbench/v4-session-bundle', exportedAt: new Date().toISOString(), app: { name: STUDIO_NAME, version: STUDIO_VERSION, sessionRecordedWith: recorded?.app?.version ?? null },
    session: { ...session, title, methodLabel: methodLabel[session.method], brief: brief ? { id: brief.id, label: brief.label, text: brief.text, source: brief.source } : null, task,
      registeredComplete: session.kind !== 'registered' || registrable(session) },
    evidenceSummary: summary ? { ...summary, text: summary.version === evidenceSummary.version ? evidenceSummary.text : null, cards: summary.version === evidenceSummary.version ? evidenceSummary.cards : null,
      note: summary.status === 'draft' ? '草稿，作者未确认' : '作者已确认' } : null,
    project: { id: slice.project.id, name: slice.project.name, createdAt: slice.project.createdAt },
    // 这一场用的出图后端和文字模型：开场时的记录（没有记录的旧场次从回执推出）；exportedWith 是导出这一刻的配置，只作对照。
    environmentSource: recorded ? '这一场开场时的记录' : textModel || image ? '这一场没有开场记录（4.3 以前），从这一场的调用和轮次回执推出' : '没有记录，也推不出',
    textModel, imageBackend: image, evidenceRegistry: recorded?.evidenceRegistry ?? null,
    observed: { textModels: observedText, imageModels: observedImage },
    exportedWith,
    counts: { rounds: rounds.length, candidates, events: slice.events.length, turns: slice.turns.length, suggestions: slice.suggestions.length, directions: slice.directions.length, compares: slice.compares.length },
    rounds: roundList,
    final: { current: final.current ? { ...final.current, label: final.current.kind === 'final' ? finalLabel(final.current.attemptId) : null } : null,
      history: final.history.map(e => ({ at: e.at, kind: e.kind, attemptId: e.attemptId ?? null, candidateId: e.candidateId ?? null, label: finalLabel(e.attemptId) ?? null, text: e.text })) },
    timing,
    checks: {
      everyRoundThisSession: rounds.every(a => a.sessionId === session.id || legacy.includes(a.id)),
      everyRoundThisMethod: rounds.every(a => (a.condition === 'free') === (session.method === 'free')),
      roundsAttributedByTime: legacy.length, decisionsAfterSessionEnd: decisionsAfterEnd,
      registeredSessionComplete: session.kind !== 'registered' || registrable(session),
      environmentMatchesRecords: textMatches && imageMatches,
      everyCallThisSession: log.entries.every(e => !e.sessionId || e.sessionId === session.id),
    },
    aiCalls: { referenced: ids.length, found: log.entries.length, failed: failedCalls.length, missing: log.missing, onlyInServiceLog: log.bySession, neverReachedService: neverReached, serviceReachable: log.reachable,
      calls: log.entries.map(e => ({ id: e.id, at: e.at, task: e.task, ok: !e.error, error: e.error ?? null, code: e.code ?? null, model: e.requestedModel ?? e.model ?? null, servedModel: e.servedModel ?? null,
        effort: e.request?.reasoning_effort ?? null, finishReason: e.finishReason ?? null, completionTokens: e.usage?.completion_tokens ?? null, latencyMs: e.latencyMs ?? null })) },
    workspaceSource: from === 'live' ? '当前项目' : '这一场结束时的本机存档' + (added ? `，另补上存档之后才到的 ${added} 条` : ''),
    files: listed,
  };
  files.push({ name: 'manifest.json', data: enc.encode(JSON.stringify(manifest, null, 2)) });
  const clock = (ms: number | null) => ms === null ? '未知' : `${Math.floor(ms / 60000)} 分 ${Math.round(ms / 1000) % 60} 秒`;
  files.push({ name: '说明.txt', data: enc.encode([
    `本场材料：${title}`,
    `${STUDIO_NAME} ${STUDIO_VERSION}；任务：${task}；${session.startedAt} 开始${session.endedAt ? `，${session.endedAt} 结束（${session.endReason ?? ''}）` : '，导出时仍在进行'}。`,
    brief ? `委托原文：${brief.text}` : '这一场没有委托，是自由试用，不计入实验。',
    summary ? `用户依据摘要：${summary.version}（${summary.status === 'draft' ? '草稿，作者未确认' : '作者已确认'}），原文见 manifest.json 的 evidenceSummary。` : '',
    `出图：${image ? (image as { label?: string; model: string }).label ?? image.model : '没有记录'}；文字模型：${textModel?.label ?? '没有记录'}（${manifest.environmentSource}）。`,
    `共 ${rounds.length} 轮、${candidates} 张候选、${slice.events.length} 条事件、${log.entries.length} 次 AI 调用（失败 ${failedCalls.length} 次${log.missing.length ? `，${log.missing.length} 个编号在服务日志里找不到` : ''}${neverReached.length ? `，另有 ${neverReached.length} 次没到服务` : ''}）。只含这一场；同一个项目里别的场次另有自己的 ZIP。`,
    `终稿：${final.current?.kind === 'final' ? finalLabel(final.current.attemptId) ?? '一张候选' : final.current?.kind === 'none-acceptable' ? '登记了没有可接受的候选' : '没有定稿'}（经过见 manifest.json 的 final.history）。`,
    `计时：主动操作 ${clock(timing.activeMs)}，模型与排队等待 ${clock(timing.waiting.ms)}，主持人交接 ${clock(timing.moderator.ms)}，技术暂停 ${clock(timing.moderator.pauseMs)}${timing.unknownWaitMs ? `，未知等待 ${clock(timing.unknownWaitMs)}` : ''}；生成 ${timing.used.opportunities} 次、回图 ${timing.used.images} 张（登记上限 ${timing.limits.activeMinutes} 分钟、${timing.limits.opportunities} 次、${timing.limits.images} 张）。`,
    'workspace.json：这一场的事件、对话、AI 建议及其处理、方向、比较与取舍' + (session.method === 'free' ? '（自由提示的一场不附工作台的方向和节点）。' : '，以及导出时的项目（方向、各层节点、意图）。'),
    'rounds/：这一场的每一轮，文件名里写着界面上的叫法。JSON 是冻结的输入、实发文字、服务回执、候选、取舍和时间戳（含原件的 base64）；PNG 是候选原图；“-服务端/”里是本机服务存下的实发请求、实发文字、入队回执、运行历史和拒收时的回答。',
    'ai-calls.jsonl：这一场的文字模型调用（成功和失败都在：发出的消息、请求的推理强度和输出上限、原始回答、推理内容、核对后的结果、拿掉的条目、服务报的模型名、收尾原因和用量）。',
    'session-events.csv：按登记的场次事件表列出每一个时间点，time_source 写明是页面、本机服务、GPU 主机（ComfyUI）还是主持人的钟；取不到的时间留空，missing_reason 写原因。',
    'manifest.json：场次、出图后端和文字模型（开场时的记录）、逐轮清单、终稿、计时、自检结果、文件清单与 SHA-256；服务日志里找不到的调用编号列在 aiCalls.missing。',
  ].filter(Boolean).join('\n') + '\n') });
  download(`workbench4-${sessionStem(session)}-${fileStamp()}.zip`, zipBytes(files), 'application/zip');
  const ai = log.entries.length || ids.length ? `，AI 调用 ${log.entries.length} 条${failedCalls.length ? `（失败 ${failedCalls.length}）` : ''}${log.reachable ? '' : '（本机服务不在，日志没打包）'}` : '';
  return `已导出${title}：${rounds.length} 轮、${candidates} 张候选${ai}。`;
}
