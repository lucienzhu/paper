// 没有选中节点时的面板：各个方案走到哪一步、建议的下一步。研究场次设置在主持人面板里（4.4）。
import { ChevronRight, Trash2, Eye, EyeOff } from 'lucide-react';
import type { FrozenAttempt } from '../../design/candidateRecords';
import { candidateRetained } from '../../design/candidateRecords';
import { laneNode, laneParameters, layers, layerInfo, spaced, staleFields } from '../model';
import { useStudio, type Selection } from '../store';
import FinalLine from './FinalLine';
import { inLane } from '../attempts';
import { briefOf } from '../sessions';

function nextStep(state: ReturnType<typeof useStudio.getState>, attempts: FrozenAttempt[]): { text: string; go?: Selection } {
  const { project } = state;
  const intent = project.intent;
  const brief = briefOf(state.sessions.find(s => s.id === state.currentSessionId && !s.endedAt));
  if (!intent.text.trim() && brief) return { text: `这一场的委托是“${brief.label}”。把委托原文放进意图，或用自己的话写，AI 会帮你读出来。`, go: { kind: 'intent' } };
  if (!intent.text.trim()) return { text: '先写一句这次想做什么，AI 会帮你读出来。', go: { kind: 'intent' } };
  if (intent.elements.some(e => e.status === 'pending')) return { text: 'AI 读出的意图还有几条等你确认。', go: { kind: 'intent' } };
  const lane = project.lanes.find(l => l.id === project.activeLaneId)!;
  const mine = attempts.filter(a => inLane(a, lane.id, project)).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const untouched = layers.every(l => Object.keys(laneNode(project, lane.id, l).touched).length === 0);
  if (untouched && !state.directions.some(d => d.status === 'placed')) return { text: '可以让 AI 按意图提几个方案，也可以直接从机架开始改。', go: { kind: 'intent' } };
  if (!mine.length) return { text: `${spaced(lane.name)}还没生成过，生成第一轮看看。`, go: { kind: 'render', laneId: lane.id } };
  const last = mine[mine.length - 1];
  if (staleFields(last.config.parameters, laneParameters(project, lane.id)).length) return { text: '上一轮之后改过决定，生成新的一轮。', go: { kind: 'render', laneId: lane.id } };
  if (!mine.some(a => a.candidates.some(c => candidateRetained(a, c.id)))) return { text: '看看候选，保留喜欢的，或勾两张放在一起比较。' };
  return { text: '可以在候选上直接说要改什么，或在某一层另做一版试另一种做法。' };
}

export default function PanelOverview({ attempts, onOpen }: { attempts: FrozenAttempt[]; onOpen: (s: Selection) => void }) {
  const state = useStudio();
  const { project } = state;
  const st = useStudio.getState();
  const step = nextStep(state, attempts);
  return <>
    <div className="r4-head" data-testid="overview-panel">
      <span className="r4-kicker">{project.name}</span>
      <h2 className="r4-title">逐层把方案搭出来</h2>
      <p className="r4-purpose">每个方案从意图出发，经机架、动力、机身、细节、色材五层，到生成和候选。点任何一个节点就在这里改它；在任何一层都可以另做一版。</p>
    </div>
    {attempts.length > 0 && <section className="r4-sec" aria-label="终稿"><FinalLine attempts={attempts} label={a => {
      const n = attempts.filter(x => x.variantScope === a.variantScope).sort((x, y) => x.createdAt.localeCompare(y.createdAt)).findIndex(x => x.id === a.id) + 1;
      return `${project.lanes.find(l => l.id === a.variantId)?.name ?? a.variantName} 第 ${n} 轮`;
    }} /></section>}
    <section className="r4-sec" aria-label="下一步">
      <h3>下一步</h3>
      <div className="el4"><div className="el4-main"><b>{step.text}</b><span>按规则算出的提示，没有调用模型。</span></div>
        {step.go && <div className="el4-acts"><button type="button" className="b4 sm pri" onClick={() => onOpen(step.go!)}>去做<ChevronRight size={12} /></button></div>}</div>
    </section>
    <section className="r4-sec" aria-label="方案">
      <h3>方案</h3>
      {project.lanes.map(lane => {
        const rounds = attempts.filter(a => inLane(a, lane.id, project));
        const kept = rounds.filter(a => a.candidates.some(c => candidateRetained(a, c.id))).length;
        return <div key={lane.id} className={'lane4' + (lane.id === project.activeLaneId ? ' is-active' : '')} data-lane={lane.id}>
          <div className="row4" style={{ justifyContent: 'space-between' }}>
            <input className="in4" style={{ height: 28, width: 'auto', flex: 1, border: '1px solid transparent', fontWeight: 600 }} value={lane.name} aria-label="方案名" onChange={e => st.renameLane(lane.id, e.target.value)} />
            <button type="button" className="b4 sm quiet" title={lane.collapsed ? '展开' : '收起'} onClick={() => st.collapseLane(lane.id, !lane.collapsed)}>{lane.collapsed ? <Eye size={13} /> : <EyeOff size={13} />}</button>
            {project.lanes.length > 1 && <button type="button" className="b4 sm quiet" title="删去这个方案" onClick={() => st.dropLane(lane.id)}><Trash2 size={13} /></button>}
          </div>
          <div className="steps4" aria-label="五层的进度">{layers.map(l => <span key={l} title={layerInfo[l].name} className={Object.keys(laneNode(project, lane.id, l).touched).length ? 'on' : ''} />)}</div>
          <span className="r4-muted">{rounds.length} 轮生成 · {kept} 轮有保留的候选{lane.forkedFrom ? ` · 从${spaced(project.lanes.find(l => l.id === lane.forkedFrom!.laneId)?.name ?? '另一个方案')}的${layerInfo[lane.forkedFrom.layer].name}分出` : ''}</span>
          <div className="row4"><button type="button" className="b4 sm" onClick={() => { st.setActiveLane(lane.id); onOpen({ kind: 'layer', laneId: lane.id, layer: 'frame' }); }}>编辑这个方案</button></div>
        </div>;
      })}
    </section>
  </>;
}
