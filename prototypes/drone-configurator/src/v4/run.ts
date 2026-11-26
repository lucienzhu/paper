// 把一条方向送去出图：冻结这条方向此刻的完整规格，记下用到的各层节点和版本，交给已有的生成流程（同一个后端、同一套设置）。
// 每一轮都写下它属于哪一场（4.2），导出“本场材料”按这个编号认。
import { startDesignGeneration } from '../design/generation';
import { findAttempt, listAttempts } from '../design/candidateRecords';
import { sessionLimits } from '../design/defaults';
import { roundsOfSession } from './sessions';
import { laneIntent, laneParameters, lanePath, laneTouched, newProject } from './model';
import { useStudio } from './store';
import { freeScope, inProject, laneScope } from './attempts';
import { parentRefusal, usableAsParent } from '../design/imageBackend';

/** 登记场次至多 9 次生成机会（失败和放弃的也算一次）；试用不限。 */
async function checkLimit(sessionId: string) {
  const session = useStudio.getState().sessions.find(s => s.id === sessionId);
  if (session?.kind !== 'registered') return;
  if (roundsOfSession(session, await listAttempts()).rounds.length >= sessionLimits.opportunities)
    throw new Error(`这一场已经用了 ${sessionLimits.opportunities} 次生成机会（登记的上限），不再发出。`);
}
/**
 * 父图只能来自这个项目（工作台），或这一场自己的轮次（自由提示）：换了人、换了场，上一场的图不能被带进来。
 * 4.5.2：还要是这台工作台上 Qwen 出图成功的候选。浏览器里存着的旧项目可能带着 4.5 以前开发用后端出的图，它们属于“这个项目”，但不能再进生成请求。
 */
async function checkParent(parentCandidateId: string | undefined, sessionId: string, free: boolean) {
  if (!parentCandidateId) return;
  const parent = await findAttempt(parentCandidateId.split('/')[0]);
  const project = useStudio.getState().project;
  if (!parent || (free ? parent.sessionId !== sessionId : !inProject(parent, project)))
    throw new Error('所选父图不属于这一场，没有发出。请在这一场的候选里重新选父图。');
  if (!usableAsParent(parent)) throw new Error(parentRefusal(parent));
}

/** 生成流程里的任务类别只用于记录：植保六旋记作 hexa，其余记作 quad。 */
const taskOf = (taskId: string) => (taskId === 'agricultural_spraying' ? 'hexa' as const : 'quad' as const);

export async function runLane(laneId: string, options: { goal?: string; parentCandidateId?: string; keep?: string } = {}) {
  const st = useStudio.getState();
  const project = st.project;
  const lane = project.lanes.find(l => l.id === laneId);
  if (!lane) throw new Error('找不到这个方案。');
  const path = lanePath(project, laneId);
  const id = crypto.randomUUID();
  const task = taskOf(project.intent.taskId);
  // 这一轮属于点生成时的那一场；之后的事件也记在那一场，即使等待期间换了场。
  const sessionId = st.ensureSession();
  await checkLimit(sessionId);
  await checkParent(options.parentCandidateId, sessionId, false);
  await startDesignGeneration({
    id, task, goal: options.goal, parentCandidateId: options.parentCandidateId,
    context: {
      state: { parameters: laneParameters(project, laneId), touched: laneTouched(project, laneId), intent: laneIntent(project) },
      variantId: laneId, variantName: lane.name, variantScope: laneScope(laneId),
      workflowOrigin: { id: path[4].id, task },
      decisionPath: path.map(n => ({ nodeId: n.id, layer: n.layer, version: n.version })),
      keep: options.keep, sessionId,
    },
  });
  useStudio.getState().logEvent({ kind: 'run', laneId, attemptId: id, text: `生成：${lane.name}` + (options.parentCandidateId ? '（以一张候选为父图）' : '') }, sessionId);
  return id;
}

/**
 * 自由提示组：只发设计者确认的文字（可带一张父图，只能是这一场的候选）。冻结的规格里不带工作台那一场的意图和用户依据。
 * 发出的文字是设计者自己写的、AI 起草后原样用的，还是起草后改过的，记在 free-run 事件里。
 */
export async function runFree(text: string, parentCandidateId: string | undefined, origin: { source: 'typed' | 'draft' | 'draft-edited'; draftTurnId?: string }) {
  const st = useStudio.getState();
  const project = st.project;
  const blank = newProject(project.intent.taskId);
  const id = crypto.randomUUID();
  const sessionId = st.ensureSession();
  await checkLimit(sessionId);
  await checkParent(parentCandidateId, sessionId, true);
  await startDesignGeneration({
    id, task: taskOf(project.intent.taskId), method: 'free', text, parentCandidateId,
    context: { state: { parameters: laneParameters(blank, blank.lanes[0].id), touched: {}, intent: laneIntent(blank) },
      variantId: 'free', variantName: '自由提示', variantScope: freeScope(), sessionId },
  });
  useStudio.getState().logEvent({ kind: 'free-run', attemptId: id, source: origin.source, draftTurnId: origin.draftTurnId,
    text: '发出自由提示：' + ({ typed: '设计者自己写的', draft: 'AI 起草，原样使用', 'draft-edited': 'AI 起草后设计者改过' } as const)[origin.source]
      + (parentCandidateId ? '（带父图）' : '') }, sessionId);
  return id;
}
