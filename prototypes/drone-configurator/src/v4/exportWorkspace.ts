// 导出：工作区记录，以及按场次打包的“本场材料”。
// 本场材料只装这一场的东西：这一场的事件、对话、建议、方向和比较；这一场冻结的每一轮（输入、回执、候选原图）；
// 这一场引用过的 AI 调用。同一个项目里切换过工作台和自由提示，也是一场一个 ZIP，标签与内容一致。
import { download, fileStamp } from '../design/exporters';
import { registryVersion } from '../design/evidence/registry.mjs';
import { imageBackend } from '../design/imageBackend';
import { attemptRecord, listAttempts, type FrozenAttempt } from '../design/candidateRecords';
import { sessionSlice, useStudio } from './store';
import { describeAi } from './ai';
import { briefOf, loadArchive, methodLabel, roundsOfSession, sessionStem, sessionTitle, type SessionInfo } from './sessions';
import { studioTasks } from './model';
import { zipBytes, type ZipEntry } from './zip';

export const STUDIO_VERSION = '4.2.0';

async function environment() {
  const [ai, backend] = await Promise.all([describeAi(), imageBackend().catch(() => null)]);
  return {
    app: { name: '多旋翼造型工作台', version: STUDIO_VERSION },
    textModel: { mode: ai.mode, provider: ai.provider, model: ai.model, endpoint: ai.endpoint ?? null, label: ai.label },
    imageBackend: backend, evidenceRegistry: registryVersion,
  };
}

/** 整个项目的工作区记录（含项目里的各场）。和“本场材料”分开：这一份不按场次拆。 */
export async function exportWorkspace() {
  const s = useStudio.getState();
  const record = {
    schema: 'workbench/v4-export', scope: 'project', exportedAt: new Date().toISOString(), ...(await environment()),
    sessions: s.sessions.filter(x => x.projectId === s.project.id), currentSessionId: s.currentSessionId,
    session: s.session, project: s.project, suggestions: s.suggestions, directions: s.directions, turns: s.turns, compares: s.compares, events: s.events,
  };
  download(`workbench4-project-${fileStamp()}.json`, JSON.stringify(record, null, 2), 'application/json');
}

const hex = async (bytes: Uint8Array) => [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes as BufferSource))].map(b => b.toString(16).padStart(2, '0')).join('');

/**
 * 这一场的工作区记录。已经结束的一场用结束那一刻存下的本机存档（项目快照停在那一刻）；
 * 正在进行的一场，或存档缺失而项目还在时，从当前状态里按场次编号取。
 */
async function sliceFor(session: SessionInfo) {
  const s = useStudio.getState();
  if (session.endedAt) {
    const archived = await loadArchive(session.id).catch(() => undefined);
    if (archived) return { slice: archived.record as ReturnType<typeof sessionSlice>, from: 'archive' as const };
  }
  if (session.projectId === s.project.id) return { slice: sessionSlice(s, session), from: 'live' as const };
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

/** 一场的全部材料打成一个 ZIP，返回给界面的一句说明。不给场次就导出正在进行的这一场（没有就导出最近的一场）。 */
export async function exportSessionBundle(sessionId?: string): Promise<string> {
  const st = useStudio.getState();
  const session = st.sessions.find(x => x.id === (sessionId ?? st.currentSessionId)) ?? [...st.sessions].reverse().find(x => x.projectId === st.project.id);
  if (!session) throw new Error('这个项目还没有开始过一场，没有可导出的本场材料。');
  const enc = new TextEncoder();
  const { slice, from } = await sliceFor(session);
  const all = await listAttempts();
  const { rounds, legacy } = roundsOfSession(session, all);
  const labels = roundLabels(rounds, session, all);
  const env = await environment();
  const brief = briefOf(session);
  const files: ZipEntry[] = [{ name: 'workspace.json', data: enc.encode(JSON.stringify({ schema: 'workbench/v4-session', exportedAt: new Date().toISOString(), ...env, ...slice, source: from }, null, 2)) }];

  let candidates = 0;
  const roundList: unknown[] = [];
  const ownIds = new Set(rounds.map(a => a.id));
  const endedAt = session.endedAt;
  let decisionsAfterEnd = 0;
  for (const [i, a] of rounds.entries()) {
    const label = labels[i].label;
    const stem = `rounds/${String(i + 1).padStart(2, '0')}-${label}-${a.id.slice(0, 8)}`;
    files.push({ name: stem + '.json', data: enc.encode(JSON.stringify(await attemptRecord(a))) });
    const pngs: string[] = [];
    for (const [j, c] of a.candidates.entries()) {
      const name = `${stem}-候选${j + 1}.png`;
      files.push({ name, data: new Uint8Array(await c.file.arrayBuffer()) }); pngs.push(name); candidates++;
    }
    const parentRound = a.parentId?.split('/')[0];
    const late = endedAt ? a.decisions.filter(d => d.at > endedAt).length : 0;
    decisionsAfterEnd += late;
    roundList.push({ file: stem + '.json', label, attemptId: a.id, method: a.condition === 'free' ? '自由提示' : '工作台', lane: labels[i].lane,
      createdAt: a.createdAt, status: a.h3?.status ?? 'unknown', candidates: pngs,
      parent: parentRound ? (ownIds.has(parentRound) ? '本场的一轮' : '另一场的一轮（父图原件已含在这一轮的记录里）') : null,
      sessionIdOnRecord: a.sessionId ?? null, attributedByTime: legacy.includes(a.id), decisionsAfterSessionEnd: late });
  }

  // 这一场引用过的 AI 调用：读意图、提方向、各层建议、候选修改、自由提示的对话。
  const ids = [...new Set([...slice.events.map(e => e.callId), ...slice.directions.map(d => d.callId), ...slice.suggestions.map(x => x.callId), ...slice.turns.map(t => t.callId)]
    .filter((id): id is string => typeof id === 'string' && !!id))];
  let log: { entries: unknown[]; missing: string[]; reachable: boolean } = { entries: [], missing: ids, reachable: false };
  if (ids.length) {
    try {
      const response = await fetch('/api/ai/log', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids }), credentials: 'omit', cache: 'no-store' });
      if (response.ok) { const data = await response.json(); log = { entries: data.entries ?? [], missing: data.missing ?? [], reachable: true }; }
    } catch { /* 本机服务不在时只打包浏览器里的部分，并在清单里写明 */ }
  } else log.reachable = true;
  files.push({ name: 'ai-calls.jsonl', data: enc.encode(log.entries.map(e => JSON.stringify(e)).join('\n') + (log.entries.length ? '\n' : '')) });

  const listed = await Promise.all(files.map(async f => ({ name: f.name, bytes: f.data.length, sha256: await hex(f.data) })));
  const title = sessionTitle(session);
  const manifest = {
    schema: 'workbench/v4-session-bundle', exportedAt: new Date().toISOString(), app: env.app,
    session: { ...session, title, methodLabel: methodLabel[session.method], brief: brief ? { id: brief.id, label: brief.label, text: brief.text, source: brief.source } : null,
      task: (id => studioTasks.find(t => t.id === id)?.label ?? id)((slice.project as { intent: { taskId: string } }).intent.taskId) },
    project: { id: slice.project.id, name: slice.project.name, createdAt: slice.project.createdAt },
    textModel: env.textModel, imageBackend: env.imageBackend, evidenceRegistry: env.evidenceRegistry,
    counts: { rounds: rounds.length, candidates, events: slice.events.length, turns: slice.turns.length, suggestions: slice.suggestions.length, directions: slice.directions.length, compares: slice.compares.length },
    rounds: roundList,
    checks: {
      everyRoundThisSession: rounds.every(a => a.sessionId === session.id || legacy.includes(a.id)),
      everyRoundThisMethod: rounds.every(a => (a.condition === 'free') === (session.method === 'free')),
      roundsAttributedByTime: legacy.length, decisionsAfterSessionEnd: decisionsAfterEnd,
    },
    aiCalls: { referenced: ids.length, found: log.entries.length, missing: log.missing, serviceReachable: log.reachable },
    workspaceSource: from === 'live' ? '当前项目' : '这一场结束时的本机存档',
    files: listed,
  };
  files.push({ name: 'manifest.json', data: enc.encode(JSON.stringify(manifest, null, 2)) });
  files.push({ name: '说明.txt', data: enc.encode([
    `本场材料：${title}`,
    `多旋翼造型工作台 ${STUDIO_VERSION}；任务：${manifest.session.task}；${session.startedAt} 开始${session.endedAt ? `，${session.endedAt} 结束（${session.endReason ?? ''}）` : '，导出时仍在进行'}。`,
    brief ? `委托原文：${brief.text}` : '这一场没有委托，是自由试用，不计入实验。',
    `共 ${rounds.length} 轮、${candidates} 张候选、${slice.events.length} 条事件、${ids.length} 次 AI 调用（找到 ${log.entries.length} 条）。只含这一场；同一个项目里别的场次另有自己的 ZIP。`,
    'workspace.json：这一场的事件、对话、AI 建议及其处理、方向、比较与取舍' + (session.method === 'free' ? '（自由提示的一场不附工作台的方向和节点）。' : '，以及导出时的项目（方向、各层节点、意图）。'),
    'rounds/：这一场的每一轮，文件名里写着界面上的叫法。JSON 是冻结的输入、实发文字、服务回执、候选、取舍和时间戳（含原件的 base64）；PNG 是候选原图。',
    'ai-calls.jsonl：本机服务日志里这一场引用过的文字模型调用（发出的消息、原始回答、核对后的结果、拿掉的条目、请求的版本与服务报的版本）。',
    'manifest.json：场次、逐轮清单、自检结果（每一轮是否属于这一场、是否同一种方式）、文件清单与 SHA-256；找不到的调用编号列在 aiCalls.missing。',
    '服务端另存的原始请求、入队回执和运行历史仍在工作台的图像作业目录（WORKBENCH_IMAGE_JOBS_DIR），文件名以轮次编号开头。',
  ].join('\n') + '\n') });
  download(`workbench4-${sessionStem(session)}-${fileStamp()}.zip`, zipBytes(files), 'application/zip');
  const ai = ids.length ? `，AI 调用 ${log.entries.length}/${ids.length} 条${log.reachable ? '' : '（本机服务不在，日志没打包）'}` : '';
  return `已导出${title}：${rounds.length} 轮、${candidates} 张候选${ai}。`;
}
