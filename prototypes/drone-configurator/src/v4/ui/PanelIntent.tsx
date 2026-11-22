// 意图：设计者用自己的话写；AI 读出场景、状态、目标和需要设计者理解的说法，并配上用户原话；设计者逐条确认。
// 确认以后，AI 可以提 2 到 3 个方向；放上画布的方向成为一条决定链。
import { useEffect, useState } from 'react';
import { Check, X, Sparkles, LoaderCircle, Search } from 'lucide-react';
import type { TaskId } from '../../types/DroneParameters';
import { wordPairs } from '../../design/fields';
import { stateLabels } from '../../design/semantics/brief';
import cardsEnvelope from '../../data/evidenceCards.json';
import { laneParameters, layerInfo, pairLayers, type IntentElement } from '../model';
import { useStudio, type Direction } from '../store';
import { ai } from '../ai';
import { newId } from '../model';
import { Quote, TierBadge } from './Evidence';
import { fieldLabel, formatValue } from './util';

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
  const { project, directions, session } = useStudio();
  const st = useStudio.getState();
  const intent = project.intent;
  const [draft, setDraft] = useState(intent.text);
  const [busy, setBusy] = useState<'' | 'read' | 'dirs'>('');
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  useEffect(() => { setDraft(intent.text); }, [intent.text]);
  const targets = intent.elements.filter(e => e.kind === 'target');
  const interpretations = intent.elements.filter(e => e.kind === 'interpretation');
  const notes = intent.elements.filter(e => e.kind === 'note');
  const pendingDirs = directions.filter(d => d.status === 'pending');
  const accepted = intent.elements.filter(e => e.status === 'accepted');

  async function read() {
    const text = draft.trim();
    if (!text) { setError('先写一句话。'); return; }
    setBusy('read'); setError('');
    try {
      if (text !== intent.text) st.setIntentText(text);
      const r = await ai.intent(text, intent.taskId);
      st.applyReading({ ...r, callId: r.call.id, mode: r.call.mode });
      st.addTurn({ id: newId('turn'), at: new Date().toISOString(), role: 'user', text, scope: { kind: 'intent' } });
      st.addTurn({ id: newId('turn'), at: new Date().toISOString(), role: 'assistant', scope: { kind: 'intent' }, callId: r.call.id, mode: r.call.mode,
        text: `读出 ${r.targets.length} 个目标、${r.interpretations.length} 处需要你来理解的说法${r.question ? '，还有一个问题' : ''}。` });
    } catch (e) { setError(e instanceof Error ? e.message : String(e)); }
    finally { setBusy(''); }
  }
  async function propose() {
    setBusy('dirs'); setError('');
    try {
      const laneId = project.activeLaneId;
      const r = await ai.directions({
        intent: { text: intent.text, targets: accepted.filter(e => e.pair && e.pole).map(e => ({ pair: e.pair!, pole: e.pole!, text: e.text })), notes: accepted.filter(e => e.kind === 'note').map(e => e.text) },
        lane: { parameters: laneParameters(project, laneId) }, locked: session.lockedFrame ? ['frame'] : [],
      });
      st.setDirections(r.directions.map(d => ({ id: newId('dir'), callId: r.call.id, mode: r.call.mode, at: new Date().toISOString(), name: d.name, summary: d.summary,
        changes: d.changes, status: 'pending' as const })));
      if (!r.directions.length) setError('这次没有得到可用的方向。');
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
    <section className="r4-sec">
      <label className="row4" style={{ gap: 8 }}><span className="r4-muted" style={{ minWidth: 28 }}>任务</span>
        <select className="in4" style={{ width: 'auto' }} data-testid="task-select" value={intent.taskId} onChange={e => st.setTask(e.target.value as TaskId)}>
          <option value="consumer_camera">日常航拍（主案例）</option>
          <option value="agricultural_spraying">农业植保（场景适配案例）</option>
          <option value="neutral_design">中性外观比较（跨构型用）</option>
        </select>
        <span className="r4-muted">本研究只做这两个场景；跨构型比较用中性任务。</span></label>
      <textarea className="ta4" data-testid="intent-text" value={draft} placeholder="例如：一台日常随身带的航拍无人机，希望看起来小巧、紧凑，但不要像玩具"
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
      <div className="row4">{intent.question.options.map(o => <button key={o.value} type="button" className="b4" data-state={o.value}
        onClick={() => o.value.startsWith('task:') ? st.setTask(o.value.slice(5) as TaskId) : st.setIntentState(o.value)}>{o.label}</button>)}</div>
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
          {busy === 'dirs' ? <LoaderCircle size={14} className="animate-spin" /> : <Sparkles size={14} />}让 AI 提几个方向</button>
      </div>
      {!accepted.length && <p className="r4-muted">先采纳至少一条，AI 才能按你的意图提方向。</p>}
    </section>}

    {pendingDirs.length > 0 && <section className="r4-sec" aria-label="方向">
      <h3>AI 提的方向</h3>
      <p className="r4-muted">每个方向是一组跨层的改动。放上画布后会成为一条方向，上游能共用的层继续共用。</p>
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
