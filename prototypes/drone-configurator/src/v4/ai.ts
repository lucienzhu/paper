// 浏览器一侧调用 AI 服务。服务端负责核对和记录；这里只把结果交给工作区。
import type { EvidenceItem, EvidenceTier } from '../design/evidence/registry.mjs';
import type { DroneParameters, TaskId } from '../types/DroneParameters';
import type { IntentReading } from './store';
import type { Layer } from './model';

export interface AiCall { id: string; at: string; mode: 'model' | 'fixture'; model: string | null; latencyMs: number; registry: string; logFailed?: boolean }
export interface AiChange { field: string; value: unknown; from: unknown; label: string; layer: Layer; why?: string }
export interface AiSuggestion { title: string; why: string; changes: AiChange[]; evidence: string[]; tier: EvidenceTier; cards: string[] }
export interface AiDescribe { mode: 'model' | 'fixture'; provider: string; model: string | null; registry: string; label: string; evidence: EvidenceItem[] }

export class AiRequestError extends Error {
  status: number;
  constructor(status: number, message: string) { super(message); this.status = status; }
}

async function post<T>(task: string, body: unknown): Promise<T> {
  if (!['http:', 'https:'].includes(location.protocol)) throw new AiRequestError(0, 'AI 需要从本机工作台服务打开页面。');
  let response: Response;
  try {
    response = await fetch('/api/ai/' + task, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      credentials: 'omit', cache: 'no-store', signal: AbortSignal.timeout(100000) });
  } catch { throw new AiRequestError(0, '连不上本机的 AI 服务。请确认工作台服务在运行。'); }
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new AiRequestError(response.status, typeof data?.error === 'string' ? data.error : 'AI 服务返回了错误（' + response.status + '）。');
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

export const ai = {
  intent: (text: string, taskId: TaskId) => post<Omit<IntentReading, 'callId' | 'mode'> & { call: AiCall }>('intent', { text, taskId }),
  directions: (body: { intent: { text: string; targets: { pair: string; pole: string; text: string }[]; notes: string[] }; lane: { parameters: DroneParameters }; locked: Layer[] }) =>
    post<{ directions: { name: string; summary: string; changes: (AiChange & { evidence: string[]; tier: EvidenceTier; cards: string[] })[] }[]; call: AiCall }>('directions', body),
  layer: (body: { layer: Layer; message: string; lane: { parameters: DroneParameters }; intent: unknown; locked: Layer[]; history: { role: 'user' | 'assistant'; content: string }[] }) =>
    post<{ reply: string; suggestions: AiSuggestion[]; otherLayer: { layer: Layer; why: string } | null; cards: string[]; call: AiCall }>('layer', body),
  revise: (body: { message: string; candidate: { parameters: DroneParameters }; intent: unknown; locked: Layer[] }) =>
    post<{ reply: string; goal: string; changes: AiChange[]; keep: Layer[]; evidence: string[]; tier: EvidenceTier; call: AiCall }>('revise', body),
  free: (body: { messages: { role: 'user' | 'assistant'; content: string }[]; brief?: string }) =>
    post<{ reply: string; prompt: string | null; call: AiCall }>('free', body),
};
