// 生成之后的三个面板：这一轮会发什么；一张候选来自哪几项决定、怎样在它上面直接改；几张候选并排比较、取舍。
import { useEffect, useMemo, useState } from 'react';
import { Sparkles, LoaderCircle, Check, X, ArrowLeftRight, CornerDownLeft, Send, Flag } from 'lucide-react';
import type { FrozenAttempt } from '../../design/candidateRecords';
import { candidateRetained, recordDecision, updateH3Record } from '../../design/candidateRecords';
import { generationStatus, isGenerationPending, retryCollection, structuredText } from '../../design/generation';
import { computeLayout } from '../../design/design';
import { diffParameters } from '../../design/fields';
import { useImageBackend } from '../../design/imageBackend';
import WorkflowImage from '../../design/workflow/WorkflowImage';
import { GuideView } from '../../components/Studio/Stage';
import { laneIntent, laneParameters, laneTouched, layerInfo, layers, sharedBy, laneNode, newId, staleFields, type Layer, type Project } from '../model';
import { useStudio, type CompareRecord } from '../store';
import { ai, type AiChange } from '../ai';
import { candidateKey, inLane } from '../attempts';
import { runLane } from '../run';
import { TierBadge } from './Evidence';
import { fieldLabel, formatValue, layerSummary, relTime } from './util';
import type { EvidenceTier } from '../../design/evidence/registry.mjs';

type Props = { attempts: FrozenAttempt[]; urls: Map<string, string> };

/**
 * 一轮迟迟不回图，或者回图出了问题时的出路：重新取回，或者放弃这一轮。
 * 放弃只在本机把这一轮记为未完成并写明原因；服务端已收到的请求和回执原样保留，照样计一次机会。
 */
export function RoundRecovery({ a }: { a: FrozenAttempt }) {
  const [now, setNow] = useState(() => Date.now());
  const pending = isGenerationPending(a);
  useEffect(() => { if (!pending) return; const t = setInterval(() => setNow(Date.now()), 5000); return () => clearInterval(t); }, [pending]);
  const waited = Math.round((now - Date.parse(a.createdAt)) / 1000);
  const stuck = pending && waited > 60;
  if (!stuck && !(a.h3?.issue && a.h3.status !== 'failed')) return null;
  const giveUp = () => void updateH3Record(a.id, { status: 'failed', issue: `设计者等了约 ${waited} 秒后放弃这一轮；服务端已收到的请求和回执原样保留。` });
  return <div className="row4" data-testid="round-recovery">
    {stuck && <span className="r4-muted">已经等了 {waited} 秒。</span>}
    <button type="button" className="b4 sm" onClick={() => void retryCollection(a.id)}>重新取回</button>
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
  const [goal, setGoal] = useState('');
  const [parent, setParent] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const candidates = mine.flatMap(a => a.candidates.map(c => ({ a, c })));
  const parentLabel = parent ? candidates.findIndex(x => x.c.id === parent) + 1 : 0;
  const text = useMemo(() => structuredText(parameters, laneTouched(project, laneId), laneIntent(project), parent ? 'candidate' : undefined, goal),
    [parameters, project, laneId, parent, goal]);
  const layout = useMemo(() => computeLayout(parameters), [parameters]);
  async function run() {
    setBusy(true); setError('');
    try { await runLane(laneId, { goal: goal.trim() || undefined, parentCandidateId: parent || undefined }); setGoal(''); st.setNotice('已提交。回图会出现在这一行的后面。'); }
    catch (e) { setError(e instanceof Error ? e.message : String(e)); }
    finally { setBusy(false); }
  }
  return <>
    <div className="r4-head" data-testid="render-panel">
      <span className="r4-kicker">{lane?.name} · 生成</span>
      <h2 className="r4-title">把这条方向送去出图</h2>
      <p className="r4-purpose">五层决定编译成一张条件图和一段文字，发给 {backend.label}，每点一次是一轮，返回一张 1024 × 1024 的图。</p>
    </div>
    {stale.length > 0 && <section className="r4-sec"><h3>上一轮之后改了 {stale.length} 项</h3>
      <div className="diff4" data-num>{stale.map(d => <div key={d.path} style={{ display: 'contents' }}><span>{d.label}</span><b><em>{d.from} → </em>{d.to}</b></div>)}</div></section>}
    <section className="r4-sec">
      <h3>这一轮想看什么（选填）</h3>
      <input className="in4" data-testid="round-goal" value={goal} placeholder="例如：机鼻和相机的过渡更圆润" onChange={e => setGoal(e.target.value)} />
      {candidates.length > 0 && <select className="in4" aria-label="父图" value={parent} onChange={e => setParent(e.target.value)}>
        <option value="">不用父图，按决定重新生成</option>
        {candidates.map(({ c }, i) => <option key={c.id} value={c.id}>以{lane?.name.replace(/^方向\s*/, '')}{i + 1} 为父图继续改</option>)}
      </select>}
      <button type="button" className="b4 pri" data-testid="run-lane" disabled={busy} onClick={() => void run()}>{busy ? <LoaderCircle size={14} className="animate-spin" /> : <Sparkles size={14} />}{busy ? '正在提交' : '生成这一轮'}</button>
      {error && <p className="r4-note" role="alert">{error}</p>}
      <p className="r4-muted">{backend.label}{backend.provider === 'minimax' ? ' · 开发用，不计入论文数据' : ''}{parentLabel ? ` · 父图 ${parentLabel}` : ''}</p>
    </section>
    <section className="r4-sec"><h3>将要发出的内容</h3>
      <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: 12, alignItems: 'start' }}>
        <GuideView layout={layout} className="img4" />
        <p className="r4-muted">条件图只画机架：红点是电机轴心，蓝线是机架连接。其余各层都写进文字。</p>
      </div>
      <details><summary style={{ cursor: 'pointer', fontSize: 12.5 }}>完整文字</summary><p lang="en" style={{ whiteSpace: 'pre-wrap', fontSize: 12, color: 'var(--ink-2)', marginTop: 8 }} data-testid="round-text">{text}</p></details>
    </section>
    {mine.length > 0 && <section className="r4-sec"><h3>这条方向的各轮</h3>
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
  // 每一次取舍都可以写一句为什么；没写时记一句默认的话，并在记录里看得出是默认的。
  const decide = async (kind: 'accept' | 'reject' | 'final') => {
    const why = reason.trim();
    const text = kind === 'final' ? '定为终稿' + (why ? '：' + why : '。') : kind === 'accept' ? (why || '设计者保留这张候选（没写理由）。') : (why || '设计者不要这张候选（没写理由）。');
    try {
      await recordDecision(attemptId, kind === 'final' ? 'accept' : kind, text, candidateId);
      if (kind === 'final') st.logEvent({ kind: 'final', attemptId, laneId, text: `定为终稿：${lane?.name ?? ''} 第 ${index} 轮` + (why ? '，' + why : '') });
      setReason('');
    } catch (e) { setError(e instanceof Error ? e.message : String(e)); }
  };
  async function ask() {
    if (!message.trim() || !lane) return;
    setBusy(true); setError('');
    try {
      const r = await ai.revise({ message, candidate: { parameters: frozen }, intent: laneIntent(project), locked: session.lockedFrame ? ['frame'] : [] });
      setRevision({ goal: r.goal, reply: r.reply, changes: r.changes, keep: r.keep, tier: r.tier, callId: r.call.id, mode: r.call.mode });
      st.addTurn({ id: newId('turn'), at: new Date().toISOString(), role: 'user', text: message, scope: { kind: 'candidate', laneId, attemptId, candidateId } });
      st.addTurn({ id: newId('turn'), at: new Date().toISOString(), role: 'assistant', text: r.reply + ' ' + r.goal, scope: { kind: 'candidate', laneId, attemptId, candidateId }, callId: r.call.id, mode: r.call.mode });
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
        st.setNotice(`这张图之后方向改过 ${drift.length} 项，这一轮从这张图的规格出发，放在新方向里；原方向不动。`);
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
      <span className="r4-kicker">{lane?.name ?? '已删去的方向'}</span>
      <h2 className="r4-title">第 {index} 轮{attempt.parentImage ? ' · 在上一张图上改' : ''}</h2>
      {explicitGoal && <p className="r4-purpose">这一轮的目标：{attempt.goal}</p>}
      <p className="r4-muted">{relTime(attempt.createdAt)} · {attempt.h3?.model ?? ''}{attempt.keep ? ' · 保持不动：' + attempt.keep : ''}</p>
    </div>
    <WorkflowImage className="img4" node={{ id: candidateId, image: urls.get(key), firstShown: candidate.firstShown, candidateId, attemptId }} alt="候选图" />
    <input className="in4" data-testid="decision-reason" value={reason} maxLength={200} placeholder="为什么保留或不要（选填，写进这一轮的记录）" onChange={e => setReason(e.target.value)} />
    <div className="row4">
      <button type="button" className={'b4' + (retained ? '' : ' pri')} data-testid="keep" disabled={retained || !candidate.firstShown} onClick={() => void decide('accept')}><Check size={14} />{retained ? '已保留' : '保留'}</button>
      <button type="button" className="b4" data-testid="reject" disabled={!candidate.firstShown} onClick={() => void decide('reject')}><X size={14} />不要</button>
      <button type="button" className="b4" data-testid="final" disabled={!candidate.firstShown} title="这张作为这次的终稿（锁稿），写进记录" onClick={() => void decide('final')}><Flag size={14} />定为终稿</button>
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
        {drift.length > 0 && <p className="r4-note" data-testid="revise-drift">这张图之后，这条方向又改了 {drift.length} 项（{drift.slice(0, 3).map(d => d.label).join('、')}{drift.length > 3 ? '……' : ''}）。按这张图的规格改，没要求改的部分才保持原样，所以这一轮会放进一条新方向；原方向不动。</p>}
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
      {drift.length > 0 && <p className="r4-note">这条方向此后又改了 {drift.length} 项：{drift.slice(0, 4).map(d => d.label).join('、')}{drift.length > 4 ? '……' : ''}</p>}
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
  const differing = new Map<string, string>();
  for (const it of items.slice(1)) if (base) for (const d of diffParameters(base, it.attempt!.config.parameters)) differing.set(d.path, d.label);
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
      <h2 className="r4-title">{differing.size ? `差在 ${differing.size} 项决定` : '决定相同，只差在生成本身'}</h2>
      <p className="r4-purpose">并排看，选定一张并写下理由。你的观察会记下来，但它是你在这个方案上的判断，不是研究数据。</p>
    </div>
    <div className="cmp4">{items.map((it, i) => { const key = candidateKey(it.attemptId, it.candidateId); return <label key={key} className={'cmp4-item' + (chosen === key ? ' is-chosen' : '')} style={{ cursor: 'pointer' }}>
      <WorkflowImage className="img4" node={{ id: it.candidateId, image: urls.get(key), firstShown: it.attempt!.candidates.find(c => c.id === it.candidateId)?.firstShown, candidateId: it.candidateId, attemptId: it.attemptId }} alt={'候选 ' + (i + 1)} />
      <span className="row4"><input type="radio" name="chosen" checked={chosen === key} onChange={() => setChosen(key)} /> <b>第 {i + 1} 张</b><span className="r4-muted">{roundLabel(it.attempt!, attempts, project)}</span></span>
    </label>; })}</div>
    {differing.size > 0 && <table className="tbl4"><thead><tr><th>决定</th>{items.map((_, i) => <th key={i}>第 {i + 1} 张</th>)}</tr></thead>
      <tbody>{[...differing.keys()].map(path => <tr key={path}><td>{fieldLabel(path)}</td>{items.map((it, i) => <td key={i} data-num>{formatValue(path, path.split('.').reduce<unknown>((o, k) => (o as Record<string, unknown>)[k], it.attempt!.config.parameters))}</td>)}</tr>)}</tbody></table>}
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
