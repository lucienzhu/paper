// 登记场次的开场任务卡（4.4）。两种方式在开场时看到的是同一张卡：同一段委托原文、同一版用户依据摘要、
// 同样的固定条件和限额，点“开始”以后才进入各自的界面。以前自由提示一开场就是任务卡，工作台要先点“去做”才看到（Codex 子代理复现）。
// 计时仍从开场算（预试记录约定“主持与计时”），两组一样；点“开始”的时间另记一笔。
import { Play } from 'lucide-react';
import { sessionLimits } from '../../design/defaults';
import { useStudio } from '../store';
import { BriefCard } from './PanelIntent';

export default function TaskStart() {
  const { sessions, currentSessionId } = useStudio();
  const current = sessions.find(s => s.id === currentSessionId && !s.endedAt);
  if (!current || current.kind !== 'registered' || current.taskStartedAt) return null;
  return <div className="task4-overlay" role="dialog" aria-modal="true" aria-label="这一场的任务" data-testid="task-start">
    <div className="task4-card" data-testid="task-card">
      <h2 className="r4-title" style={{ margin: 0 }}>这一场的任务</h2>
      <BriefCard />
      <p style={{ margin: 0 }} data-testid="task-limits">这一场：主动操作 {sessionLimits.activeMinutes} 分钟；至多 {sessionLimits.opportunities} 次生成、{sessionLimits.images} 张图。主持人会提醒时间。</p>
      <div className="row4"><button type="button" className="b4 pri" data-testid="task-begin" onClick={() => useStudio.getState().startTask()}><Play size={14} />开始</button></div>
    </div>
  </div>;
}
