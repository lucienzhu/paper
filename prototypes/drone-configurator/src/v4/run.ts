// 把一条方向送去出图：冻结这条方向此刻的完整规格，记下用到的各层节点和版本，交给已有的生成流程（同一个后端、同一套设置）。
// 每一轮都写下它属于哪一场（4.2），导出“本场材料”按这个编号认。
import { startDesignGeneration } from '../design/generation';
import { laneIntent, laneParameters, lanePath, laneTouched, newProject } from './model';
import { useStudio } from './store';
import { freeScope, laneScope } from './attempts';

/** 生成流程里的任务类别只用于记录：植保六旋记作 hexa，其余记作 quad。 */
const taskOf = (taskId: string) => (taskId === 'agricultural_spraying' ? 'hexa' as const : 'quad' as const);

export async function runLane(laneId: string, options: { goal?: string; parentCandidateId?: string; keep?: string } = {}) {
  const st = useStudio.getState();
  const project = st.project;
  const lane = project.lanes.find(l => l.id === laneId);
  if (!lane) throw new Error('找不到这条方向。');
  const path = lanePath(project, laneId);
  const id = crypto.randomUUID();
  const task = taskOf(project.intent.taskId);
  await startDesignGeneration({
    id, task, goal: options.goal, parentCandidateId: options.parentCandidateId,
    context: {
      state: { parameters: laneParameters(project, laneId), touched: laneTouched(project, laneId), intent: laneIntent(project) },
      variantId: laneId, variantName: lane.name, variantScope: laneScope(laneId),
      workflowOrigin: { id: path[4].id, task },
      decisionPath: path.map(n => ({ nodeId: n.id, layer: n.layer, version: n.version })),
      keep: options.keep, sessionId: st.ensureSession(),
    },
  });
  useStudio.getState().logEvent({ kind: 'run', laneId, attemptId: id, text: `生成：${lane.name}` + (options.parentCandidateId ? '（以一张候选为父图）' : '') });
  return id;
}

/** 自由提示组：只发设计者确认的文字（可带一张父图）。冻结的规格里不带工作台那一场的意图和用户依据。 */
export async function runFree(text: string, parentCandidateId?: string) {
  const st = useStudio.getState();
  const project = st.project;
  const blank = newProject(project.intent.taskId);
  const id = crypto.randomUUID();
  await startDesignGeneration({
    id, task: taskOf(project.intent.taskId), method: 'free', text, parentCandidateId,
    context: { state: { parameters: laneParameters(blank, blank.lanes[0].id), touched: {}, intent: laneIntent(blank) },
      variantId: 'free', variantName: '自由提示', variantScope: freeScope(), sessionId: st.ensureSession() },
  });
  return id;
}
