// 每一次 AI 调用都绑在发出它的那一场：发出时记下场次，回答（或失败、或晚到）都记回那一场。
// 成功和失败各记一条 ai-call 事件（入口、发出和回答的时间、调用编号、失败原因），导出本场材料时按它和场次编号取回服务日志。
import { AiRequestError, type AiCall } from './ai';
import { useStudio } from './store';

export type AiTask = 'intent' | 'directions' | 'layer' | 'revise' | 'free';
const taskLabel: Record<AiTask, string> = { intent: '读意图', directions: '提方案', layer: '逐层建议', revise: '在候选上改', free: '自由提示的对话' };

/**
 * 发一次 AI 请求。返回结果、发出时的那一场，以及这一场是不是已经结束（late）。
 * late 为真时，调用方不要把回答用在现在的界面上，而是交给 store（带上 sessionId），由它记回那一场。
 */
export async function askAi<T extends { call: AiCall }>(task: AiTask, send: (sessionId: string) => Promise<T>) {
  const st = useStudio.getState();
  const sessionId = st.ensureSession();
  const startedAt = new Date().toISOString();
  try {
    const result = await send(sessionId);
    useStudio.getState().logEvent({ kind: 'ai-call', task, callId: result.call.id, ok: true, startedAt, endedAt: new Date().toISOString(),
      text: `AI 调用完成：${taskLabel[task]}` }, sessionId);
    return { result, sessionId, late: useStudio.getState().currentSessionId !== sessionId };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    useStudio.getState().logEvent({ kind: 'ai-call', task, callId: error instanceof AiRequestError ? error.callId ?? undefined : undefined, ok: false, error: message,
      startedAt, endedAt: new Date().toISOString(), text: `AI 调用没有完成：${taskLabel[task]}：${message}` }, sessionId);
    throw error;
  }
}
