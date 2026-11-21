// 证据的强弱怎样出现在界面上：一个三格刻度、一行登记好的说法（AI 不改）、以及与强弱相配的主要动作。
// 已验证的，主要动作是照此修正；统计相关和设计假设，主要动作是开一个分支试试。
import { GitBranch, Check, X } from 'lucide-react';
import { item as evidenceItem, tiers, type EvidenceTier } from '../../design/evidence/registry.mjs';
import cardsEnvelope from '../../data/evidenceCards.json';
import type { Suggestion } from '../store';
import { fieldLabel, formatValue } from './util';

const cards = new Map(cardsEnvelope.cards.map(c => [c.id, c]));
export const cardOf = (id: string) => cards.get(id);

export function TierBadge({ tier }: { tier: EvidenceTier }) {
  const t = tiers[tier];
  return <span className="tier4" data-tier={tier} title={t.label}>
    <span className="bars" aria-hidden="true">{[1, 2, 3].map(i => <i key={i} className={i <= t.bars ? '' : 'o'} />)}</span>{t.label}
  </span>;
}

export function EvidenceLines({ ids }: { ids: string[] }) {
  if (!ids.length) return null;
  return <div style={{ display: 'grid', gap: 6 }}>
    {ids.map(id => { const e = evidenceItem(id); if (!e) return null;
      return <div key={id} className="ev4" data-evidence={id}><span>{e.statement}</span><span className="lim">{e.limits}</span></div>; })}
  </div>;
}

export function Quote({ id }: { id: string }) {
  const c = cards.get(id);
  if (!c) return null;
  return <div className="quote4" data-card={id}><b>{c.quote}</b><span>{id} · {c.limits}</span></div>;
}

export function SuggestionCard({ s, onAct, busy }: { s: Suggestion; onAct: (action: 'apply' | 'branch' | 'reject') => void; busy?: boolean }) {
  const pending = s.status === 'pending';
  const branchFirst = s.tier !== 'validated';
  return <article className={'sg4' + (pending ? '' : ' is-done')} data-suggestion={s.id} data-tier={s.tier}>
    <div className="sg4-top"><TierBadge tier={s.tier} /><span className="grow" />
      {s.mode === 'fixture' && <span className="p4 gray" title="没有配置文字模型，这条来自规则回退">规则回退</span>}
      {!pending && <span className="p4 gray">{({ applied: '已采纳', branched: '已开分支', rejected: '没有采用', pending: '' } as const)[s.status]}</span>}</div>
    <h4 className="sg4-title">{s.title}</h4>
    {s.why && <p className="sg4-why">{s.why}</p>}
    <div className="diff4" data-num>{s.changes.map(c => <div key={c.field} style={{ display: 'contents' }}>
      <span>{fieldLabel(c.field)}</span><b><em>{formatValue(c.field, c.from)} → </em>{formatValue(c.field, c.value)}</b></div>)}</div>
    <EvidenceLines ids={s.evidence} />
    {s.cards.map(id => <Quote key={id} id={id} />)}
    {pending && <div className="row4">
      {branchFirst
        ? <><button type="button" className="b4 pri" disabled={busy} data-act="branch" onClick={() => onAct('branch')}><GitBranch size={14} />开一个分支试试</button>
          <button type="button" className="b4" disabled={busy} data-act="apply" onClick={() => onAct('apply')}><Check size={14} />直接改</button></>
        : <><button type="button" className="b4 pri" disabled={busy} data-act="apply" onClick={() => onAct('apply')}><Check size={14} />{tiers.validated.action}</button>
          <button type="button" className="b4" disabled={busy} data-act="branch" onClick={() => onAct('branch')}><GitBranch size={14} />开分支</button></>}
      <button type="button" className="b4 quiet" disabled={busy} data-act="reject" onClick={() => onAct('reject')}><X size={14} />不用</button>
    </div>}
  </article>;
}
