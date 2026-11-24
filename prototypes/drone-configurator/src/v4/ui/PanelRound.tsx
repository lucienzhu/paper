// 生成之后的三个面板：这一轮会发什么；一张候选来自哪几项决定、怎样在它上面直接改；几张候选并排比较、取舍。
// 4.4（作者 11 月 24 日）：“生成这一轮”只按画布上确认的设置出图，不再另加一句“这一轮想看什么”（那句会写进实发请求，画布上却看不到）；
// 在某张图上改走候选上的“在这张图上改”；每一轮实发的完整请求自动存进记录，不在面板上展开。
import { useEffect, useMemo, useState } from 'react';
import { Sparkles, LoaderCircle, Check, X, ArrowLeftRight, CornerDownLeft, Send, Flag } from 'lucide-react';
import type { FrozenAttempt } from '../../design/candidateRecords';
import { candidateRetained, recordDecision } from '../../design/candidateRecords';
import { abandonRound, generationStatus, isGenerationPending, retryCollection } from '../../design/generation';
import { computeLayout } from '../../design/design';
import { diffParameters } from '../../design/fields';
import { useImageBackend } from '../../design/imageBackend';
import WorkflowImage from '../../design/workflow/WorkflowImage';
import { GuideView } from '../../components/Studio/Stage';
import { laneIntent, laneParameters, layerInfo, layers, sharedBy, laneNode, newId, spaced, staleFields, type Layer, type Project } from '../model';
import { useStudio, type CompareRecord } from '../store';
import { ai, type AiChange } from '../ai';
import { askAi } from '../aiSession';
import { candidateKey, inLane } from '../attempts';
import { runLane } from '../run';
import { TierBadge } from './Evidence';
import { diffWords, fieldLabel, formatValue, layerSummary, relTime } from './util';
import { useCurrentFinal } from '../useFinal';
import type { EvidenceTier } from '../../design/evidence/registry.mjs';

type Props = { attempts: FrozenAttempt[]; urls: Map<string, string> };

/**
 * 一轮迟迟不回图、在等核对（已入队但出图服务一时连不上），或者页面连不上本机服务时的出路：取回，或者放弃这一轮。
 * 取回只按原 prompt_id 再查，不会重新入队已经入队的一轮。放弃只在本机把这一轮记为未完成并写明原因，不算远端失败；
 * 服务端已收到的请求和回执原样保留，照样计一次机会。两种方式（工作台、自由提示）用的是这同一个。
 */
export function RoundRecovery({ a }: { a: FrozenAttempt }) {
  const [now, setNow] = useState(() => Date.now());
  const pending = isGenerationPending(a);
  useEffect(() => { if (!pending) return; const t = setInterval(() => setNow(Date.now()), 5000); return () => clearInterval(t); }, [pending]);
  const waited = Math.round((now - Date.parse(a.h3?.sentAt ?? a.createdAt)) / 1000);
  const stuck = pending && waited > 60;
  const open = a.h3 && a.h3.status !== 'succeeded' && a.h3.status !== 'failed';
  if (!open || (!stuck && !a.h3?.issue && !a.h3?.pending && !a.h3?.offline)) return null;
  const giveUp = () => void abandonRound(a.id, `设计者等了约 ${waited} 秒后放弃这一轮（不是出图服务报的失败）；服务端已收到的请求和回执原样保留。`);
  return <div className="row4" data-testid="round-recovery">
    {stuck && !a.h3?.pending && <span className="r4-muted">已经等了 {waited} 秒。</span>}
    {a.h3?.pending && <span className="r4-muted">{a.h3.pending.enqueue === 'confirmed' ? '待核对' + (a.h3.pending.promptId ? ' · 作业号 ' + a.h3.pending.promptId.slice(0, 8) : '')
      : a.h3.pending.enqueue === 'unknown' ? '待确认入队' : '还没发出'}</span>}
    <button type="button" className="b4 sm" data-testid="round-recover" title="再查一次：已经发出的只按本轮编号找原作业，不会重发" onClick={() => void retryCollection(a.id)}>取回</button>
    <button type="button" className="b4 sm quiet" data-testid="give-up" onClick={giveUp}>放弃这一轮</button>
  </div>;
}

export function PanelRender({ laneId, attempts, urls }: Props & { laneId: string }) {
  const { project } = useStudio();
  const st = useStudio.getState();
  const backend = useImageBackend();
  const lane = project.lanes.find(l => l.id === laneId);
  const parameters = laneParameters(project, laneId);
  const mine = attempts.filter(a => inLane(a, laneId, project)).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const latest = mine[mine.length - 1];
  const stale = latest ? staleFields(latest.config.parameters, parameters) : [];
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const layout = useMemo(() => computeLayout(parameters), [parameters]);
  const registered = useStudio(s => s.sessions.some(x => x.id === s.currentSessionId && !x.endedAt && x.kind === 'registered'));
  async function run() {
    setBusy(true); setError('');
    try { await runLane(laneId); st.setNotice('已提交。回图会出现在这一行的后面。'); }
    catch (e) { setError(e instanceof Error ? e.message : String(e)); }
    finally { setBusy(false); }
  }
  return <>
    <div className="r4-head" data-testid="render-panel">
      <span className="r4-kicker">{lane?.name} · 生成</span>
      <h2 className="r4-title">把这个方案送去出图</h2>
      <p className="r4-purpose">按{spaced(lane?.name ?? '这个方案')}现在的五层设置出一张图；每点一次是一轮。要在某张图上改，到那张候选上说要改什么。</p>
    </div>
    {stale.length > 0 && <section className="r4-sec"><h3>上一轮之后改了 {stale.length} 项</h3>
      <div className="diff4" data-num>{stale.map(d => <div key={d.path} style={{ display: 'contents' }}><span>{d.label}</span><b><em>{d.from} → </em>{d.to}</b></div>)}</div></section>}
    <section className="r4-sec">
      <button type="button" className="b4 pri" data-testid="run-lane" disabled={busy} onClick={() => void run()}>{busy ? <LoaderCircle size={14} className="animate-spin" /> : <Sparkles size={14} />}{busy ? '正在提交' : '生成这一轮'}</button>
      {error && <p className="r4-note" role="alert">{error}</p>}
      {!registered && <p className="r4-muted">{backend.label}{backend.provider === 'minimax' ? ' · 开发用，不计入论文数据' : ''}</p>}
    </section>
    <section className="r4-sec"><h3>这一轮按什么出图</h3>
      <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: 12, alignItems: 'start' }}>
        <GuideView layout={layout} className="img4" />
        <p className="r4-muted">条件图只画机架：红点是电机轴心，蓝线是机架连接。其余各层按画布上的设置写进文字；每一轮实发的完整请求自动存进记录。</p>
      </div>
    </section>
    {mine.length > 0 && <section className="r4-sec"><h3>这个方案的各轮</h3>
      {[...mine].reverse().map((a, i) => { const s = generationStatus(a); return <div key={a.id} className="el4" data-round-status={a.h3?.status}>
        <div className="el4-main"><b>第 {mine.length - i} 轮 · {s.title}</b><span>{relTime(a.createdAt)} · {a.goal}</span>
          <RoundRecovery a={a} /></div>
        <div className="el4-acts">{a.candidates.map(c => urls.get(candidateKey(a.id, c.id)) &&
          <button key={c.id} type="button" className="b4 sm quiet" style={{ padding: 0 }} onClick={() => st.select({ kind: 'candidate', attemptId: a.id, candidateId: c.id })}>
            <img src={urls.get(candidateKey(a.id, c.id))} alt="" width={44} height={44} style={{ borderRadius: 6 }} /></button>)}</div>
      </div>; })}
    </section>}
  </>;
}

interface Revision { goal: string; reply: string; changes: AiChange[]; keep: Layer[]; tier: EvidenceTier; callId: string; mode: string }

export function PanelCandidate({ attemptId, candidateId, attempts, urls }: Props & { attemptId: string; candidateId: string }) {
  const { project, comparing, session } = useStudio();
  const st = useStudio.getState();
  const final = useCurrentFinal();
  const attempt = attempts.find(a => a.id === attemptId);
  const candidate = attempt?.candidates.find(c => c.id === candidateId);
  const laneId = attempt?.variantId ?? '';
  const lane = project.lanes.find(l => l.id === laneId);
  const [message, setMessage] = useState('');
  const [revision, setRevision] = useState<Revision | null>(null);
  const [issue, setIssue] = useState('');
  const [issueLayer, setIssueLayer] = useState<Layer>('body');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  if (!attempt || !candidate) return <p className="r4-muted">这张候选的记录还没读出来。</p>;
  const key = candidateKey(attemptId, candidateId);
  const retained = candidateRetained(attempt, candidateId);
  const frozen = attempt.config.parameters;
  const current = lane ? laneParameters(project, laneId) : null;
  const drift = current ? staleFields(frozen, current) : [];
  const isFinal = final?.kind === 'final' && final.attemptId === attemptId && final.candidateId === candidateId;
  // 每一次取舍都可以写一句为什么；没写时记一句默认的话，并在记录里看得出是默认的。
  // 终稿只有一个当前值：新定的替换旧的；把当前终稿点了“不要”，终稿随之撤下（不退回更早的那张）。
  const decide = async (kind: 'accept' | 'reject' | 'final') => {
    const why = reason.trim();
    const text = kind === 'final' ? '定为终稿' + (why ? '：' + why : '。') : kind === 'accept' ? (why || '设计者保留这张候选（没写理由）。') : (why || '设计者不要这张候选（没写理由）。');
    try {
      await recordDecision(attemptId, kind === 'final' ? 'accept' : kind, text, candidateId);
      if (kind === 'final') st.setFinal(attemptId, candidateId, `定为终稿：${lane?.name ?? ''} 第 ${index} 轮` + (why ? '，' + why : ''), laneId);
      if (kind === 'reject' && isFinal) st.withdrawFinal(`撤下终稿：${lane?.name ?? ''} 第 ${index} 轮点了“不要”` + (why ? '，' + why : ''));
      setReason('');
    } catch (e) { setError(e instanceof Error ? e.message : String(e)); }
  };
  async function ask() {
    if (!message.trim() || !lane) return;
    setBusy(true); setError('');
    const sentAt = new Date().toISOString();
    try {
      const { result: r, sessionId, late } = await askAi('revise', sid => ai.revise({ message, candidate: { parameters: frozen }, intent: laneIntent(project), locked: session.lockedFrame ? ['frame'] : [] }, sid));
      if (!late) setRevision({ goal: r.goal, reply: r.reply, changes: r.changes, keep: r.keep, tier: r.tier, callId: r.call.id, mode: r.call.mode });
      st.addTurn({ id: newId('turn'), at: sentAt, role: 'user', text: message, scope: { kind: 'candidate', laneId, attemptId, candidateId } }, sessionId);
      st.addTurn({ id: newId('turn'), at: new Date().toISOString(), role: 'assistant', text: r.reply + ' ' + r.goal, scope: { kind: 'candidate', laneId, attemptId, candidateId }, callId: r.call.id, mode: r.call.mode }, sessionId);
    } catch (e) { setError(e instanceof Error ? e.message : String(e)); }
    finally { setBusy(false); }
  }
  async function applyRevision() {
    if (!revision || !lane) return;
    setBusy(true); setError('');
    try {
      const keep = '保持：' + revision.keep.map(l => layerInfo[l].name).join('、');
      if (drift.length) {
        // 这张图之后方向又改过：从这张图冻结时的规格出发另开一条方向，没要求改的部分才真正保持原样；原方向不动。
        const target = st.reviseFrom(laneId, frozen, revision.changes.map(c => ({ field: c.field, value: c.value })), `${lane.name} · 由第 ${index} 轮改`, message.trim());
        await runLane(target, { goal: revision.goal, parentCandidateId: candidateId, keep });
        st.setNotice(`这张图之后方案改过 ${drift.length} 项，这一轮从这张图的规格出发，放在新方案里；原方案不动。`);
      } else {
        // 这一轮只改这条方向：改到的最上游一层若被共用，先让这条方向有自己的一份。
        const first = layers.find(l => revision.changes.some(c => c.layer === l));
        if (first && sharedBy(useStudio.getState().project, laneNode(useStudio.getState().project, laneId, first).id).length > 1) st.ownLayer(laneId, first);
        if (revision.changes.length) st.setMany(laneId, revision.changes.map(c => [c.field, c.value] as [string, unknown]), '在候选上修改：' + message);
        await runLane(laneId, { goal: revision.goal, parentCandidateId: candidateId, keep });
        st.setNotice('已按修改提交新一轮，父图是这张候选。');
      }
      setRevision(null); setMessage('');
    } catch (e) { setError(e instanceof Error ? e.message : String(e)); }
    finally { setBusy(false); }
  }
  const index = attempts.filter(a => a.variantScope === attempt.variantScope).sort((a, b) => a.createdAt.localeCompare(b.createdAt)).findIndex(a => a.id === attemptId) + 1;
  // 没写这一轮的目标时，记录里的 goal 是意图备注或方向名，不再当作标题重复一遍。
  const goal = attempt.goal.trim();
  const explicitGoal = !!goal && goal !== laneIntent(project).note.trim() && !goal.startsWith(attempt.variantName + ' · ');
  return <>
    <div className="r4-head" data-testid="candidate-panel">
      <span className="r4-kicker">{lane?.name ?? '已删去的方案'}</span>
      <h2 className="r4-title">第 {index} 轮{attempt.parentImage ? ' · 在上一张图上改' : ''}</h2>
      {explicitGoal && <p className="r4-purpose">这一轮的目标：{attempt.goal}</p>}
      <p className="r4-muted">{relTime(attempt.createdAt)} · {attempt.h3?.model ?? ''}{attempt.keep ? ' · 保持不动：' + attempt.keep : ''}</p>
    </div>
    <WorkflowImage className="img4" node={{ id: candidateId, image: urls.get(key), firstShown: candidate.firstShown, candidateId, attemptId }} alt="候选图" />
    <input className="in4" data-testid="decision-reason" value={reason} maxLength={200} placeholder="为什么保留或不要（选填，写进这一轮的记录）" onChange={e => setReason(e.target.value)} />
    <div className="row4">
      <button type="button" className={'b4' + (retained ? '' : ' pri')} data-testid="keep" disabled={retained || !candidate.firstShown} onClick={() => void decide('accept')}><Check size={14} />{retained ? '已保留' : '保留'}</button>
      <button type="button" className="b4" data-testid="reject" disabled={!candidate.firstShown} onClick={() => void decide('reject')}><X size={14} />不要</button>
      <button type="button" className={'b4' + (isFinal ? ' pri' : '')} data-testid="final" disabled={!candidate.firstShown || isFinal} title="这张作为这次的终稿（锁稿），替换之前定的终稿，写进记录" onClick={() => void decide('final')}><Flag size={14} />{isFinal ? '这张是终稿' : '定为终稿'}</button>
      <button type="button" className="b4" aria-pressed={comparing.includes(key)} onClick={() => st.toggleCompare(key)}><ArrowLeftRight size={14} />{comparing.includes(key) ? '已加入比较' : '加入比较'}</button>
      {comparing.length >= 2 && <button type="button" className="b4 ai" data-testid="open-compare" onClick={() => {
        const id = newId('cmp');
        st.recordCompare({ id, at: new Date().toISOString(), laneId, candidates: comparing.map(k => { const [a, c] = k.split('|'); return { attemptId: a, candidateId: c }; }) });
        st.clearCompare(); st.select({ kind: 'compare', id });
      }}>比较已选的 {comparing.length} 张</button>}
    </div>
    {error && <p className="r4-note" role="alert">{error}</p>}

    <section className="r4-sec" aria-label="在这张图上改">
      <h3>在这张图上改</h3>
      <div className="row4" style={{ flexWrap: 'nowrap' }}>
        <input className="in4" data-testid="revise-text" value={message} placeholder="例如：机身短一点，其他别动" onChange={e => setMessage(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') void ask(); }} />
        <button type="button" className="b4" disabled={busy || !message.trim()} data-testid="revise-ask" onClick={() => void ask()}>{busy ? <LoaderCircle size={14} className="animate-spin" /> : <CornerDownLeft size={14} />}</button>
      </div>
      {revision && <article className="sg4" data-testid="revision">
        <div className="sg4-top"><TierBadge tier={revision.tier} /><span className="grow" />{revision.mode === 'fixture' && <span className="p4 gray">规则回退</span>}</div>
        <h4 className="sg4-title">{revision.goal}</h4>
        {revision.reply && <p className="sg4-why">{revision.reply}</p>}
        {revision.changes.length > 0 && <div className="diff4" data-num>{revision.changes.map(c => <div key={c.field} style={{ display: 'contents' }}><span>{fieldLabel(c.field)}</span><b><em>{formatValue(c.field, c.from)} → </em>{formatValue(c.field, c.value)}</b></div>)}</div>}
        <p className="r4-muted">保持不动：{revision.keep.map(l => layerInfo[l].name).join('、') || '无'}。父图是这张候选。</p>
        {drift.length > 0 && <p className="r4-note" data-testid="revise-drift">这张图之后，这个方案又改了 {drift.length} 项（{drift.slice(0, 3).map(d => d.label).join('、')}{drift.length > 3 ? '……' : ''}）。按这张图的规格改，没要求改的部分才保持原样，所以这一轮会放进一条新方案；原方案不动。</p>}
        <div className="row4"><button type="button" className="b4 pri" data-testid="revise-run" disabled={busy} onClick={() => void applyRevision()}><Sparkles size={14} />按此改并生成</button>
          <button type="button" className="b4 quiet" onClick={() => setRevision(null)}>不用</button></div>
      </article>}
    </section>

    <section className="r4-sec" aria-label="把问题送回某一层">
      <h3>把问题送回某一层</h3>
      <div className="row4" style={{ flexWrap: 'nowrap' }}>
        <select className="in4" style={{ width: 92 }} aria-label="哪一层" value={issueLayer} onChange={e => setIssueLayer(e.target.value as Layer)}>{layers.map(l => <option key={l} value={l}>{layerInfo[l].name}</option>)}</select>
        <input className="in4" value={issue} placeholder="例如：臂根看起来和机身分开" onChange={e => setIssue(e.target.value)} />
        <button type="button" className="b4" disabled={!issue.trim() || !lane} onClick={() => { st.addIssue(laneId, issueLayer, issue.trim(), candidateId); setIssue(''); st.setNotice('已送回' + layerInfo[issueLayer].name + '。'); }}><Send size={14} /></button>
      </div>
    </section>

    <section className="r4-sec" aria-label="这张图来自">
      <h3>这张图来自</h3>
      <div className="chk4">{layers.map(l => <div key={l}><span style={{ minWidth: 34, color: 'var(--ink-3)' }}>{layerInfo[l].name}</span><span>{layerSummary(l, frozen)}</span></div>)}</div>
      {attempt.decisionPath && <p className="r4-muted">各层节点版本：{attempt.decisionPath.map(d => `${layerInfo[d.layer as Layer]?.name ?? d.layer} v${d.version}`).join(' · ')}</p>}
      {drift.length > 0 && <p className="r4-note">这个方案此后又改了 {drift.length} 项：{drift.slice(0, 4).map(d => d.label).join('、')}{drift.length > 4 ? '……' : ''}</p>}
    </section>
  </>;
}

/** 一轮的简称：方向名、第几轮、是否在上一张上改；写过这一轮的目标时附上目标。 */
function roundLabel(a: FrozenAttempt, attempts: FrozenAttempt[], project: Project) {
  const lane = project.lanes.find(l => l.id === a.variantId);
  const n = attempts.filter(x => x.variantScope === a.variantScope).sort((x, y) => x.createdAt.localeCompare(y.createdAt)).findIndex(x => x.id === a.id) + 1;
  const goal = a.goal.trim();
  const explicit = !!goal && goal !== laneIntent(project).note.trim() && !goal.startsWith(a.variantName + ' · ');
  return `${lane?.name ?? (a.condition === 'free' ? '自由提示' : a.variantName)} · 第 ${n} 轮${a.parentImage ? '（在上一张上改）' : ''}${explicit ? '：' + goal : ''}`;
}

export function PanelCompare({ id, attempts, urls }: Props & { id: string }) {
  const { compares, project } = useStudio();
  const st = useStudio.getState();
  const record = compares.find(c => c.id === id);
  const [chosen, setChosen] = useState(record?.chosen ?? '');
  const [reason, setReason] = useState(record?.reason ?? '');
  const [observation, setObservation] = useState(record?.observation ?? '');
  const [error, setError] = useState('');
  if (!record) return <p className="r4-muted">找不到这次比较。</p>;
  const items = record.candidates.map(c => ({ ...c, attempt: attempts.find(a => a.id === c.attemptId) })).filter(x => x.attempt);
  const base = items[0]?.attempt?.config.parameters;
  const free = items.some(it => it.attempt!.condition === 'free');
  const differing = new Map<string, string>();
  // 自由提示的轮次没有参数（冻结的是空白起始值），比的是实发文字；工作台的轮次两样都比。
  if (!free) for (const it of items.slice(1)) if (base) for (const d of diffParameters(base, it.attempt!.config.parameters)) differing.set(d.path, d.label);
  const texts = items.map(it => it.attempt!.confirmedText);
  const textDiffers = texts.some(t => t !== texts[0]);
  const parentOf = (a: FrozenAttempt) => {
    if (!a.parentImage) return '无';
    const parent = attempts.find(x => x.id === a.parentId?.split('/')[0]);
    return parent ? '有（' + roundLabel(parent, attempts, project) + '）' : '有（另一场的一轮）';
  };
  const parents = items.map(it => parentOf(it.attempt!));
  const parentDiffers = parents.some(p => p !== parents[0]);
  const title = differing.size ? `差在 ${differing.size} 项设置` + (parentDiffers ? '，父图也不同' : '')
    : textDiffers ? (free ? '实发文字不同' : '设置相同，修改说明不同') + (parentDiffers ? '，父图也不同' : '')
    : parentDiffers ? '实发文字相同，父图不同' : '输入完全相同，只差在生成本身';
  async function save() {
    setError('');
    if (!chosen) { setError('先选定一张。'); return; }
    const next: CompareRecord = { ...record!, chosen, reason: reason.trim(), observation: observation.trim() };
    st.recordCompare(next);
    const [attemptId, candidateId] = chosen.split('|');
    try { await recordDecision(attemptId, 'accept', '比较后选定' + (reason.trim() ? '：' + reason.trim() : '。'), candidateId, undefined, true); }
    catch (e) { setError(e instanceof Error ? e.message : String(e)); }
  }
  return <>
    <div className="r4-head" data-testid="compare-panel">
      <span className="r4-kicker">比较 · {items.length} 张</span>
      <h2 className="r4-title">{title}</h2>
      <p className="r4-purpose">并排看，选定一张并写下理由。你的观察会记下来，但它是你在这个方案上的判断，不是研究数据。</p>
    </div>
    <div className="cmp4">{items.map((it, i) => { const key = candidateKey(it.attemptId, it.candidateId); return <label key={key} className={'cmp4-item' + (chosen === key ? ' is-chosen' : '')} style={{ cursor: 'pointer' }}>
      <WorkflowImage className="img4" node={{ id: it.candidateId, image: urls.get(key), firstShown: it.attempt!.candidates.find(c => c.id === it.candidateId)?.firstShown, candidateId: it.candidateId, attemptId: it.attemptId }} alt={'候选 ' + (i + 1)} />
      <span className="row4"><input type="radio" name="chosen" checked={chosen === key} onChange={() => setChosen(key)} /> <b>第 {i + 1} 张</b><span className="r4-muted">{roundLabel(it.attempt!, attempts, project)}</span></span>
    </label>; })}</div>
    {differing.size > 0 && <table className="tbl4"><thead><tr><th>决定</th>{items.map((_, i) => <th key={i}>第 {i + 1} 张</th>)}</tr></thead>
      <tbody>{[...differing.keys()].map(path => <tr key={path}><td>{fieldLabel(path)}</td>{items.map((it, i) => <td key={i} data-num>{formatValue(path, path.split('.').reduce<unknown>((o, k) => (o as Record<string, unknown>)[k], it.attempt!.config.parameters))}</td>)}</tr>)}</tbody></table>}
    {!free && <section className="r4-sec" aria-label="修改说明与父图" data-testid="compare-sent">
      <h3>修改说明与父图</h3>
      {items.map((it, i) => { const g = it.attempt!.goal.trim(); const explicit = !!g && g !== laneIntent(project).note.trim() && !g.startsWith(it.attempt!.variantName + ' · ');
        return <span key={i} className="r4-muted">第 {i + 1} 张 · 父图：{parents[i]} · {explicit ? '修改说明：' + g : '按当时的设置生成'}</span>; })}
      <p className="r4-muted" style={{ margin: 0 }}>每一轮实发的完整请求在记录里，由主持人导出。</p>
    </section>}
    {free && <section className="r4-sec" aria-label="实发的文字与父图" data-testid="compare-sent">
      <h3>实发的文字与父图</h3>
      {items.map((_, i) => <div key={i} style={{ display: 'grid', gap: 4 }}>
        <span className="r4-muted">第 {i + 1} 张 · 父图：{parents[i]}{i > 0 && texts[i] === texts[0] ? ' · 文字与第 1 张相同' : ''}</span>
        {(i === 0 || texts[i] !== texts[0]) && <p lang={/[\u4e00-\u9fff]/.test(texts[i]) ? 'zh' : 'en'} style={{ whiteSpace: 'pre-wrap', fontSize: 12, margin: 0, maxHeight: 160, overflow: 'auto' }}>
          {i === 0 ? texts[0] : diffWords(texts[0], texts[i]).map((d, k) => d.kind === 'same' ? <span key={k}>{d.text}</span>
            : d.kind === 'add' ? <ins key={k} style={{ background: 'var(--warn-tint)', textDecoration: 'none' }}>{d.text}</ins>
            : <del key={k} style={{ color: 'var(--ink-3)' }}>{d.text}</del>)}</p>}
      </div>)}
      {texts.length > 1 && textDiffers && <p className="r4-muted" style={{ margin: 0 }}>第 2 张起，浅黄底是比第 1 张多出的字，删除线是第 1 张有、这一张没有的字。</p>}
    </section>}
    <section className="r4-sec">
      <h3>为什么选它</h3>
      <textarea className="ta4" style={{ minHeight: 64 }} value={reason} data-testid="compare-reason" placeholder="例如：短一些更像随身带的东西" onChange={e => setReason(e.target.value)} />
      <h3>你的观察（选填）</h3>
      <textarea className="ta4" style={{ minHeight: 56 }} value={observation} placeholder="例如：在这个方案上，加宽机身确实显得更紧凑" onChange={e => setObservation(e.target.value)} />
      <div className="row4"><button type="button" className="b4 pri" data-testid="compare-save" onClick={() => void save()}><Check size={14} />选定</button>
        {record.chosen && <span className="p4 ok">已取舍</span>}</div>
      {error && <p className="r4-note" role="alert">{error}</p>}
    </section>
  </>;
}
