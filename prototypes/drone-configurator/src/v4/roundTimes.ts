// 一轮生成的各个时间点：页面这一侧的（确认、发出、收到、首次显示、取舍），加上本机服务回执里的（收到、入队、ComfyUI 开始与结束、完成）。
import type { FrozenAttempt } from '../design/candidateRecords';
import type { RoundTimes } from './timing';

/** 服务回执（本机服务给的作业记录）里和时间有关的几项。 */
export interface ServiceJob { startedAt?: string; completedAt?: string; status?: string;
  comfy?: { enqueuedAt?: string; executionStart?: string | null; executionEnd?: string | null; enqueueRequests?: number; promptId?: string; foundBy?: string; foundAt?: string } | null }

export function roundStatus(a: FrozenAttempt) {
  if (a.h3?.abandonedAt) return 'abandoned';
  if (a.h3?.status === 'succeeded' || a.h3?.status === 'failed') return a.h3.status;
  if (a.h3?.pending) return 'unconfirmed';
  if (a.h3) return 'running';
  return a.receipt ? 'succeeded' : a.failure ? 'failed' : 'unknown';
}
export function roundTimes(a: FrozenAttempt, label: string, job?: ServiceJob | null, file?: string): RoundTimes {
  return {
    attemptId: a.id, label, condition: a.condition, file,
    frozenAt: a.createdAt, sentAt: a.h3?.sentAt, serviceReceivedAt: job?.startedAt, enqueuedAt: job?.comfy?.enqueuedAt,
    foundBy: job?.comfy?.foundBy, foundAt: job?.comfy?.foundAt,
    executionStart: job?.comfy?.executionStart ?? undefined, executionEnd: job?.comfy?.executionEnd ?? undefined,
    serviceCompletedAt: job?.completedAt, receivedAt: a.h3?.receivedAt,
    firstShownAt: a.candidates.map(c => c.firstShown).filter((x): x is string => !!x).sort()[0],
    status: roundStatus(a), requests: a.h3?.requests, enqueueRequests: job?.comfy?.enqueueRequests,
    candidates: a.candidates.map(c => ({ id: c.id, firstShown: c.firstShown })),
    decisions: a.decisions.map(d => ({ at: d.at, kind: d.kind, candidate: d.candidate, reason: d.reason })),
  };
}
/** 页面存下的最终服务回执（成功或失败时的作业记录）。 */
export async function storedJob(a: FrozenAttempt): Promise<ServiceJob | null> {
  try { return a.h3?.result ? JSON.parse(await a.h3.result.text()) as ServiceJob : null; } catch { return null; }
}
