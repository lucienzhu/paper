// 导出这次的工作区：方向和各层节点、意图、AI 建议及其处理、对话、比较与取舍、事件。
// “本场材料”把三处东西打成一个 ZIP：工作区记录、这个项目每一轮的冻结输入与回执和原图、本机服务日志里这一场的 AI 调用。
import { download, fileStamp } from '../design/exporters';
import { registryVersion } from '../design/evidence/registry.mjs';
import { imageBackend } from '../design/imageBackend';
import { attemptRecord, listAttempts } from '../design/candidateRecords';
import { useStudio } from './store';
import { describeAi } from './ai';
import { inProject } from './attempts';
import { zipBytes, type ZipEntry } from './zip';

export const STUDIO_VERSION = '4.1.0';

async function workspaceRecord() {
  const s = useStudio.getState();
  const [ai, backend] = await Promise.all([describeAi(), imageBackend().catch(() => null)]);
  return {
    schema: 'workbench/v4-export', exportedAt: new Date().toISOString(),
    app: { name: '多旋翼造型工作台', version: STUDIO_VERSION },
    textModel: { mode: ai.mode, provider: ai.provider, model: ai.model, label: ai.label },
    imageBackend: backend, evidenceRegistry: registryVersion,
    session: s.session, project: s.project, suggestions: s.suggestions, directions: s.directions,
    turns: s.turns, compares: s.compares, events: s.events,
  };
}

export async function exportWorkspace() {
  download(`workbench4-${fileStamp()}.json`, JSON.stringify(await workspaceRecord(), null, 2), 'application/json');
}

const hex = async (bytes: Uint8Array) => [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes as BufferSource))].map(b => b.toString(16).padStart(2, '0')).join('');

/** 一场的全部材料打成一个 ZIP，返回给界面的一句说明。 */
export async function exportSessionBundle(): Promise<string> {
  const s = useStudio.getState();
  const project = s.project;
  const enc = new TextEncoder();
  const rounds = (await listAttempts()).filter(a => inProject(a, project)).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const files: ZipEntry[] = [{ name: 'workspace.json', data: enc.encode(JSON.stringify(await workspaceRecord(), null, 2)) }];
  let candidates = 0;
  for (const [i, a] of rounds.entries()) {
    const stem = `rounds/${String(i + 1).padStart(2, '0')}-${a.id}`;
    files.push({ name: stem + '.json', data: enc.encode(JSON.stringify(await attemptRecord(a))) });
    for (const [j, c] of a.candidates.entries()) { files.push({ name: `${stem}-候选${j + 1}.png`, data: new Uint8Array(await c.file.arrayBuffer()) }); candidates++; }
  }
  // 这一场引用过的 AI 调用：读意图、提方向、各层建议、候选修改、自由提示的对话。
  const ids = [...new Set([project.intent.readingCall, ...s.directions.map(d => d.callId), ...s.suggestions.map(x => x.callId), ...s.turns.map(t => t.callId)]
    .filter((id): id is string => typeof id === 'string' && !!id))];
  let log: { entries: unknown[]; missing: string[]; reachable: boolean } = { entries: [], missing: ids, reachable: false };
  try {
    const response = await fetch('/api/ai/log', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids }), credentials: 'omit', cache: 'no-store' });
    if (response.ok) { const data = await response.json(); log = { entries: data.entries ?? [], missing: data.missing ?? [], reachable: true }; }
  } catch { /* 本机服务不在时只打包浏览器里的部分，并在清单里写明 */ }
  files.push({ name: 'ai-calls.jsonl', data: enc.encode(log.entries.map(e => JSON.stringify(e)).join('\n') + (log.entries.length ? '\n' : '')) });
  const listed = await Promise.all(files.map(async f => ({ name: f.name, bytes: f.data.length, sha256: await hex(f.data) })));
  const manifest = {
    schema: 'workbench/v4-session-bundle', exportedAt: new Date().toISOString(), app: { version: STUDIO_VERSION },
    project: { id: project.id, name: project.name, createdAt: project.createdAt }, session: s.session,
    rounds: rounds.length, candidates, aiCalls: { referenced: ids.length, found: log.entries.length, missing: log.missing, serviceReachable: log.reachable },
    files: listed,
  };
  files.push({ name: 'manifest.json', data: enc.encode(JSON.stringify(manifest, null, 2)) });
  files.push({ name: '说明.txt', data: enc.encode([
    '本场材料（多旋翼造型工作台 ' + STUDIO_VERSION + '）',
    'workspace.json：方向、各层节点、意图、AI 建议及其处理、对话、比较与取舍、事件（含定为终稿、自由提示每一轮文字的来历）。',
    'rounds/：这个项目的每一轮。JSON 是冻结的输入、实发文字、服务回执、候选、取舍和时间戳（含原件的 base64）；PNG 是候选原图。',
    'ai-calls.jsonl：本机服务日志里这一场引用过的文字模型调用（发出的消息、原始回答、核对后的结果、拿掉的条目、请求的版本与服务报的版本）。',
    'manifest.json：文件清单与 SHA-256；找不到的调用编号列在 aiCalls.missing。',
    '服务端另存的原始请求、入队回执和运行历史仍在工作台的图像作业目录（WORKBENCH_IMAGE_JOBS_DIR），文件名以轮次编号开头。',
  ].join('\n') + '\n') });
  download(`workbench4-session-${fileStamp()}.zip`, zipBytes(files), 'application/zip');
  const ai = ids.length ? `，AI 调用 ${log.entries.length}/${ids.length} 条${log.reachable ? '' : '（本机服务不在，日志没打包）'}` : '';
  return `已导出本场材料：${rounds.length} 轮、${candidates} 张候选${ai}。`;
}
