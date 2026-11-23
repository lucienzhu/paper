// 浏览器一侧调用 AI 服务。服务端负责核对和记录；这里只把结果交给工作区。
import type { EvidenceItem, EvidenceTier } from '../design/evidence/registry.mjs';
import type { DroneParameters, TaskId } from '../types/DroneParameters';
import type { IntentReading } from './store';
import type { Layer } from './model';

export interface AiCall { id: string; at: string; mode: 'model' | 'fixture'; model: string | null; servedModel?: string | null; effort?: string | null; finishReason?: string | null;
  sessionId?: string | null; latencyMs: number; registry: string; logFailed?: boolean }
export interface AiChange { field: string; value: unknown; from: unknown; label: string; layer: Layer; why?: string }
export interface AiSuggestion { title: string; why: string; changes: AiChange[]; evidence: string[]; tier: EvidenceTier; cards: string[] }
export interface AiDescribe { mode: 'model' | 'fixture'; provider: string; model: string | null; endpoint?: string | null; effort?: string | null; maxTokens?: number | null;
  registry: string; label: string; evidence: EvidenceItem[] }

/** 失败的调用也带着服务给的调用编号（服务端日志里有这一条），没有编号的是请求没到服务。 */
export class AiRequestError extends Error {
  status: number; callId: string | null; code: string | null;
  constructor(status: number, message: string, callId: string | null = null, code: string | null = null) { super(message); this.status = status; this.callId = callId; this.code = code; }
}

// 推理强度 max 时一次回答可能要几分钟（服务端默认等 300 秒），页面多等一会儿，免得服务还在等、页面先放弃。
async function post<T>(task: string, body: unknown, sessionId?: string): Promise<T> {
  if (!['http:', 'https:'].includes(location.protocol)) throw new AiRequestError(0, 'AI 需要从本机工作台服务打开页面。');
  let response: Response;
  try {
    response = await fetch('/api/ai/' + task, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...(body as object), ...(sessionId ? { sessionId } : {}) }),
      credentials: 'omit', cache: 'no-store', signal: AbortSignal.timeout(330000) });
  } catch { throw new AiRequestError(0, '连不上本机的 AI 服务，或等太久没有回答。请确认工作台服务在运行。'); }
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new AiRequestError(response.status, typeof data?.error === 'string' ? data.error : 'AI 服务返回了错误（' + response.status + '）。',
    typeof data?.callId === 'string' ? data.callId : null, typeof data?.code === 'string' ? data.code : null);
  return data as T;
}

let described: Promise<AiDescribe> | null = null;
export function describeAi(): Promise<AiDescribe> {
  if (!described) described = (async () => {
    // 从离线包（file://）打开时没有本机服务，不发请求，免得控制台报错。
    if (!['http:', 'https:'].includes(location.protocol)) return { mode: 'fixture', provider: 'none', model: null, registry: '', label: 'AI 未连接（离线打开）', evidence: [] } as AiDescribe;
    try {
      const response = await fetch('/api/ai/describe', { cache: 'no-store', credentials: 'omit' });
      if (!response.ok) throw new Error();
      return await response.json() as AiDescribe;
    } catch { return { mode: 'fixture', provider: 'none', model: null, registry: '', label: 'AI 未连接', evidence: [] } as AiDescribe; }
  })();
  return described;
}

/** 五个入口。sessionId 是发出请求时的那一场，服务把它写进调用日志，导出本场材料时按场次取回（包括失败的调用）。 */
export const ai = {
  intent: (text: string, taskId: TaskId, sessionId?: string) => post<Omit<IntentReading, 'callId' | 'mode'> & { call: AiCall }>('intent', { text, taskId }, sessionId),
  directions: (body: { intent: { text: string; targets: { pair: string; pole: string; text: string }[]; notes: string[] }; lane: { parameters: DroneParameters }; locked: Layer[] }, sessionId?: string) =>
    post<{ directions: { name: string; summary: string; changes: (AiChange & { evidence: string[]; tier: EvidenceTier; cards: string[] })[] }[]; call: AiCall }>('directions', body, sessionId),
  layer: (body: { layer: Layer; message: string; lane: { parameters: DroneParameters }; intent: unknown; locked: Layer[]; history: { role: 'user' | 'assistant'; content: string }[] }, sessionId?: string) =>
    post<{ reply: string; suggestions: AiSuggestion[]; otherLayer: { layer: Layer; why: string } | null; cards: string[]; call: AiCall }>('layer', body, sessionId),
  revise: (body: { message: string; candidate: { parameters: DroneParameters }; intent: unknown; locked: Layer[] }, sessionId?: string) =>
    post<{ reply: string; goal: string; changes: AiChange[]; keep: Layer[]; evidence: string[]; tier: EvidenceTier; call: AiCall }>('revise', body, sessionId),
  free: (body: { messages: { role: 'user' | 'assistant'; content: string }[]; brief?: string }, sessionId?: string) =>
    post<{ reply: string; prompt: string | null; call: AiCall }>('free', body, sessionId),
};
