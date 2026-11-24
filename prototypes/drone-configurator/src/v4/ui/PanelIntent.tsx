// 意图：设计者用自己的话写；AI 读出场景、状态、目标和需要设计者理解的说法，并配上用户原话；设计者逐条确认。
// 确认以后，AI 可以提 2 到 3 个方向；放上画布的方向成为一条决定链。
import { useEffect, useState } from 'react';
import { Check, X, Sparkles, LoaderCircle, Search } from 'lucide-react';
import type { TaskId } from '../../types/DroneParameters';
import { wordPairs } from '../../design/fields';
import { stateLabels } from '../../design/semantics/brief';
import cardsEnvelope from '../../data/evidenceCards.json';
import { isBlankProject, laneParameters, layerInfo, pairLayers, studioTasks, type IntentElement } from '../model';
import { useStudio, type Direction } from '../store';
import { ai } from '../ai';
import { askAi } from '../aiSession';
import { newId } from '../model';
import { briefOf } from '../sessions';
import { evidenceSummary } from '../../design/defaults';
import { fixedConditionLines } from '../conditions';
import { Quote, TierBadge } from './Evidence';
import { fieldLabel, formatValue } from './util';

/** 这一场的委托：两种方式看到的是同一段原文。 */
/**
 * 这一场的任务简报：委托原文和两组共用的用户依据摘要。工作台和自由提示两边用的是这同一个组件，显示同一个版本；
 * 版本和摘要在开场时记进场次，导出本场材料时写进清单。
 */
export function BriefCard({ onUse, label = '把委托原文放进意图' }: { onUse?: () => void; label?: string }) {
  const { sessions, currentSessionId } = useStudio();
  const session = sessions.find(s => s.id === currentSessionId && !s.endedAt);
  const brief = briefOf(session);
  if (!brief) return null;
  const version = session?.evidenceSummary?.version ?? evidenceSummary.version;
  return <section className="r4-sec brief4" aria-label="这一场的委托" data-testid="brief-card" data-brief={brief.id}>
    <h3>这一场的委托 · {brief.label}</h3>
    <p style={{ margin: 0, lineHeight: 1.6 }}>{brief.text}</p>
    <span className="r4-muted">要看：{brief.target}；要保持：{brief.keep}。</span>
    <div data-testid="fixed-conditions" style={{ display: 'grid', gap: 2 }}><b style={{ fontSize: 12.5 }}>固定不变的</b>
      {fixedConditionLines(brief.condition).map(line => <span key={line} className="r4-muted">{line}</span>)}</div>
    <div data-testid="evidence-summary" data-version={version} data-status={evidenceSummary.status} style={{ display: 'grid', gap: 4, borderTop: '1px solid var(--line)', paddingTop: 8 }}>
      <b style={{ fontSize: 12.5 }}>{evidenceSummary.label} · {version}{evidenceSummary.status === 'draft' ? '（草稿，作者未确认）' : ''}</b>
      <p style={{ margin: 0, lineHeight: 1.6, whiteSpace: 'pre-wrap', fontSize: 12.5 }}>{evidenceSummary.text}</p>
    </div>
    {onUse && <div className="row4"><button type="button" className="b4 sm" data-testid="use-brief" onClick={onUse}>{label}</button></div>}
  </section>;
}

/** 换任务：项目还空白就原地换；已经有决定或生成，就先确认，再另开一个项目（这一场随之结束）。 */
function useTaskSwitch() {
  const [pending, setPending] = useState<TaskId | null>(null);
  const request = (taskId: TaskId) => {
    const s = useStudio.getState();
    // 选的就是现在的任务：只记下设计者的选择（并收起 AI 关于任务的提问）。
    if (taskId === s.project.intent.taskId) { s.setTask(taskId); return; }
    const busy = !isBlankProject(s.project) || s.events.some(e => e.kind === 'run' || e.kind === 'free-run');
    if (!busy) s.setTask(taskId); else setPending(taskId);
  };
  return { pending, request, cancel: () => setPending(null), confirm: () => { if (pending) useStudio.getState().reset(pending); setPending(null); } };
}

const pairText = (e: Pick<IntentElement, 'pair' | 'pole'>) => {
  const w = wordPairs.find(x => x.id === e.pair);
  return w ? `${w.left}—${w.right}：靠“${e.pole === 'left' ? w.left : w.right}”` : '';
};
const basisLabel = { user: '有用户原话', designer: '设计者原话', ai: 'AI 的理解' } as const;

function ElementRow({ e, onSet }: { e: IntentElement; onSet: (status: IntentElement['status']) => void }) {
  return <div className={'el4 is-' + e.status} data-element={e.kind}>
    <div className="el4-main">
      <div className="row4"><b>{e.kind === 'note' ? '“' + e.text + '”' : e.text}</b>
        {e.kind === 'interpretation' ? <TierBadge tier="hypothesis" /> : <span className="p4 gray">{basisLabel[e.basis]}</span>}</div>
      {e.pair && <span>{pairText(e)} · 作用于{pairLayers[e.pair].map(l => layerInfo[l].name).join('、')}</span>}
      {e.kind === 'note' && <span>原样写进生成的文字</span>}
      {e.why && <span>{e.why}</span>}
      {e.cards.map(id => <Quote key={id} id={id} />)}
    </div>
    <div className="el4-acts">
      <button type="button" className={'b4 sm' + (e.status === 'accepted' ? ' pri' : '')} aria-pressed={e.status === 'accepted'} title="采纳" data-act="accept" onClick={() => onSet(e.status === 'accepted' ? 'pending' : 'accepted')}><Check size={12} /></button>
      <button type="button" className="b4 sm quiet" aria-pressed={e.status === 'rejected'} title="不要" data-act="reject" onClick={() => onSet(e.status === 'rejected' ? 'pending' : 'rejected')}><X size={12} /></button>
    </div>
  </div>;
}

function DirectionCard({ d, onPlace, onDismiss }: { d: Direction; onPlace: () => void; onDismiss: () => void }) {
  const byLayer = Object.entries(d.changes.reduce<Record<string, typeof d.changes>>((acc, c) => { (acc[c.layer] ??= []).push(c); return acc; }, {}));
  return <article className={'sg4' + (d.status === 'pending' ? '' : ' is-done')} data-direction={d.name}>
    <div className="sg4-top"><b className="sg4-title">{d.name}</b><span className="grow" />{d.mode === 'fixture' && <span className="p4 gray">规则回退</span>}
      {d.status === 'placed' && <span className="p4 ok">已放上画布</span>}</div>
    <p className="sg4-why">{d.summary}</p>
    {byLayer.map(([layer, list]) => <div key={layer} style={{ display: 'grid', gap: 4 }}>
      <span className="r4-muted">{layerInfo[layer as keyof typeof layerInfo].name}</span>
      {list.map(c => <div key={c.field} className="row4" style={{ justifyContent: 'space-between' }}>
        <span style={{ fontSize: 12.5 }}>{fieldLabel(c.field)}：<b>{formatValue(c.field, c.value)}</b></span><TierBadge tier={c.tier} /></div>)}
    </div>)}
    {d.status === 'pending' && <div className="row4">
      <button type="button" className="b4 pri" data-testid="place-direction" onClick={onPlace}>放上画布</button>
      <button type="button" className="b4 quiet" onClick={onDismiss}>不要</button>
    </div>}
  </article>;
}

export default function PanelIntent({ onPlaced }: { onPlaced: (laneId: string) => void }) {
  const { project, directions, session, sessions, currentSessionId } = useStudio();
  const st = useStudio.getState();
  const intent = project.intent;
  const brief = briefOf(sessions.find(s => s.id === currentSessionId && !s.endedAt));
  const taskSwitch = useTaskSwitch();
  const [draft, setDraft] = useState(intent.text);
  const [busy, setBusy] = useState<'' | 'read' | 'dirs'>('');
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  useEffect(() => { setDraft(intent.text); }, [intent.text]);
  const targets = intent.elements.filter(e => e.kind === 'target');
  const interpretations = intent.elements.filter(e => e.kind === 'interpretation');
  const notes = intent.elements.filter(e => e.kind === 'note');
  const pendingDirs = directions.filter(d => d.status === 'pending' && d.sessionId === currentSessionId);
  const accepted = intent.elements.filter(e => e.status === 'accepted');

  async function read() {
    const text = draft.trim();
    if (!text) { setError('先写一句话。'); return; }
    setBusy('read'); setError('');
    const sentAt = new Date().toISOString();
    try {
      if (text !== intent.text) st.setIntentText(text);
      const { result: r, sessionId, late } = await askAi('intent', sid => ai.intent(text, intent.taskId, sid));
      st.applyReading({ ...r, callId: r.call.id, mode: r.call.mode }, sessionId);
      st.addTurn({ id: newId('turn'), at: sentAt, role: 'user', text, scope: { kind: 'intent' } }, sessionId);
      st.addTurn({ id: newId('turn'), at: new Date().toISOString(), role: 'assistant', scope: { kind: 'intent' }, callId: r.call.id, mode: r.call.mode,
        text: `读出 ${r.targets.length} 个目标、${r.interpretations.length} 处需要你来理解的说法${r.question ? '，还有一个问题' : ''}。` }, sessionId);
      if (late) setError('回答到的时候，发出它的那一场已经结束；回答记在那一场，没有用在这里。');
    } catch (e) { setError(e instanceof Error ? e.message : String(e)); }
    finally { setBusy(''); }
  }
  async function propose() {
    setBusy('dirs'); setError('');
    try {
      const laneId = project.activeLaneId;
      const { result: r, sessionId, late } = await askAi('directions', sid => ai.directions({
        intent: { text: intent.text, targets: accepted.filter(e => e.pair && e.pole).map(e => ({ pair: e.pair!, pole: e.pole!, text: e.text })), notes: accepted.filter(e => e.kind === 'note').map(e => e.text) },
        lane: { parameters: laneParameters(project, laneId) }, locked: session.lockedFrame ? ['frame'] : [],
      }, sid));
      st.setDirections(r.directions.map(d => ({ id: newId('dir'), callId: r.call.id, mode: r.call.mode, at: new Date().toISOString(), name: d.name, summary: d.summary,
        changes: d.changes, status: 'pending' as const })), sessionId);
      if (late) setError('回答到的时候，发出它的那一场已经结束；方案记在那一场，没有放在这里。');
      else if (!r.directions.length) setError('这次没有得到可用的方案。');
    } catch (e) { setError(e instanceof Error ? e.message : String(e)); }
    finally { setBusy(''); }
  }
  const cardList = cardsEnvelope.cards.filter(c => !query || (c.quote + c.limits + c.category).includes(query));

  return <>
    <div className="r4-head" data-testid="intent-panel">
      <span className="r4-kicker">意图</span>
      <h2 className="r4-title">这次想做什么</h2>
      <p className="r4-purpose">用你自己的话写。AI 会读出场景、观察状态和造型目标，配上用户原话；每一条由你确认。</p>
    </div>
    <BriefCard onUse={() => { setDraft(brief!.text); st.setIntentText(brief!.text); st.logEvent({ kind: 'intent-from-brief', text: '意图用了委托原文：' + brief!.label }); }} />
    <section className="r4-sec">
      <label className="row4" style={{ gap: 8 }}><span className="r4-muted" style={{ minWidth: 28 }}>任务</span>
        <select className="in4" style={{ width: 'auto' }} data-testid="task-select" value={intent.taskId} disabled={!!brief} onChange={e => taskSwitch.request(e.target.value as TaskId)}>
          {studioTasks.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
          {!studioTasks.some(t => t.id === intent.taskId) && <option value={intent.taskId}>中性外观比较（旧项目）</option>}
        </select>
        {brief && <span className="r4-muted">这一场按委托做日常航拍。</span>}</label>
      {taskSwitch.pending && <p className="r4-note" data-testid="task-switch-confirm">项目里已经有决定或生成。换成“{studioTasks.find(t => t.id === taskSwitch.pending)?.label}”会另开一个空白项目，这一场随之结束（材料仍可在场次设置里导出）。
        <span className="row4" style={{ marginTop: 6 }}><button type="button" className="b4 sm pri" onClick={taskSwitch.confirm}>另开项目</button><button type="button" className="b4 sm quiet" onClick={taskSwitch.cancel}>不换</button></span></p>}
      <textarea className="ta4" data-testid="intent-text" value={draft} placeholder={brief ? '用你自己的话写，或把上面的委托原文放进来再补充' : '例如：一台日常随身带的航拍无人机，希望看起来小巧、紧凑，但不要像玩具'}
        onChange={e => setDraft(e.target.value)} onBlur={() => { if (draft !== intent.text) st.setIntentText(draft); }} />
      <div className="row4">
        <button type="button" className="b4 pri" data-testid="intent-read" disabled={busy !== ''} onClick={() => void read()}>
          {busy === 'read' ? <LoaderCircle size={14} className="animate-spin" /> : <Sparkles size={14} />}{intent.elements.length ? '重新读一读' : '让 AI 读一读'}</button>
        {intent.confirmedAt && <span className="p4 ok"><Check size={10} />已确认</span>}
      </div>
      {error && <p className="r4-note" role="alert">{error}</p>}
    </section>

    {intent.question && <section className="r4-sec" aria-label="澄清">
      <h3>先确认一件事</h3>
      <p style={{ margin: 0, fontWeight: 600 }}>{intent.question.text}</p>
      <div className="row4">{intent.question.options.filter(o => !o.value.startsWith('task:') || studioTasks.some(t => 'task:' + t.id === o.value)).map(o => <button key={o.value} type="button" className="b4" data-state={o.value}
        onClick={() => o.value.startsWith('task:') ? taskSwitch.request(o.value.slice(5) as TaskId) : st.setIntentState(o.value)}>{o.label}</button>)}</div>
    </section>}
    {!intent.question && intent.state !== 'unspecified' && <p className="r4-muted">观察状态：{stateLabels[intent.state] ?? intent.state}</p>}

    {targets.length > 0 && <section className="r4-sec" aria-label="目标"><h3>目标</h3>{targets.map(e => <ElementRow key={e.id} e={e} onSet={s => st.setElement(e.id, { status: s })} />)}</section>}
    {interpretations.length > 0 && <section className="r4-sec" aria-label="需要你来理解的说法">
      <h3>需要你来理解的说法</h3>
      <p className="r4-muted">用户原话里没有对应的依据。下面是几种可能的理解，选你认同的；也可以只把原话留作备注。</p>
      {interpretations.map(e => <ElementRow key={e.id} e={e} onSet={s => st.setElement(e.id, { status: s })} />)}
    </section>}
    {notes.length > 0 && <section className="r4-sec" aria-label="备注"><h3>备注</h3>{notes.map(e => <ElementRow key={e.id} e={e} onSet={s => st.setElement(e.id, { status: s })} />)}</section>}

    {intent.elements.length > 0 && <section className="r4-sec">
      <div className="row4">
        <button type="button" className="b4" data-testid="intent-confirm" onClick={() => st.confirmIntent()}><Check size={14} />确认意图</button>
        <button type="button" className="b4 ai" data-testid="ask-directions" disabled={busy !== '' || !accepted.length} onClick={() => void propose()}>
          {busy === 'dirs' ? <LoaderCircle size={14} className="animate-spin" /> : <Sparkles size={14} />}让 AI 提几个方案</button>
      </div>
      {!accepted.length && <p className="r4-muted">先采纳至少一条，AI 才能按你的意图提方案。</p>}
    </section>}

    {pendingDirs.length > 0 && <section className="r4-sec" aria-label="方案">
      <h3>AI 提的方案</h3>
      <p className="r4-muted">每个方案是一组跨层的改动。放上画布后会成为一个方案，上游能共用的层继续共用。</p>
      {pendingDirs.map(d => <DirectionCard key={d.id} d={d} onPlace={() => { const id = st.placeDirection(d.id); if (id) onPlaced(id); }} onDismiss={() => st.dismissDirection(d.id)} />)}
    </section>}

    <details className="r4-sec">
      <summary style={{ cursor: 'pointer', fontSize: 12, fontWeight: 650, color: 'var(--ink-3)' }}>全部用户原话（{cardsEnvelope.cards.length} 张公开卡）</summary>
      <div className="row4" style={{ marginTop: 8 }}><Search size={14} style={{ color: 'var(--ink-3)' }} /><input className="in4" style={{ flex: 1 }} placeholder="搜原话" value={query} onChange={e => setQuery(e.target.value)} /></div>
      <div style={{ display: 'grid', gap: 6, marginTop: 8 }}>
        {cardList.map(c => <label key={c.id} className="quote4" style={{ cursor: 'pointer', gridTemplateColumns: 'auto 1fr', columnGap: 8 }}>
          <input type="checkbox" checked={intent.cards.includes(c.id)} onChange={() => st.toggleCard(c.id)} style={{ gridRow: 'span 2' }} />
          <b>{c.quote}</b><span>{c.id} · {c.limits}</span></label>)}
      </div>
    </details>
  </>;
}
