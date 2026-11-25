// 研究场次（主持人用）：开一场（委托、方式、匿名编号、次序）、结束本场、按场次导出材料、主持人交接与技术暂停、
// 这一场的计时（主动操作、等待、交接，对照 15 分钟、9 次、9 张）、登记条件的载入与锁定、出图后端和文字模型的版本。
// 两种方式的面板里都有这一块。一场是一个人用一种方式的一段连续工作；在同一个项目里换方式，就是另起一场。
// 4.3：委托、方式、匿名编号、次序四项齐全才是登记场次；登记场次不能“直接换方式”，下一场由主持人在“开一场”里开。
// 4.4：这一块只在主持人面板里。登记有冲突时“开始”按钮不可点，store 里也再拦一次；登记场次里没有“解除锁定”。
import { useEffect, useState } from 'react';
import { Lock, Unlock, Plus, Download, Play, Square, Hand, Pause, CornerDownLeft } from 'lucide-react';
import { evidenceSummary, sessionLimits, study, studyBriefs } from '../../design/defaults';
import { useImageBackend } from '../../design/imageBackend';
import { registryVersion } from '../../design/evidence/registry.mjs';
import { listAttempts, type FrozenAttempt } from '../../design/candidateRecords';
import { useStudio, type SessionMethod } from '../store';
import { describeAi, type AiDescribe } from '../ai';
import { exportSessionBundle, exportWorkspace } from '../exportWorkspace';
import { briefOf, registrable, registrationClash, roundsOfSession, sessionTitle, type SessionInfo } from '../sessions';
import { sessionTiming } from '../timing';
import { roundTimes } from '../roundTimes';
import { relTime } from './util';

const quickMethods: { id: SessionMethod; label: string }[] = [{ id: 'open', label: '不限' }, { id: 'structured', label: '工作台' }, { id: 'free', label: 'AI 对话 + 自由提示' }];
const clock = (ms: number | null) => ms === null ? '未知' : `${Math.floor(ms / 60000)}:${String(Math.floor(ms / 1000) % 60).padStart(2, '0')}`;

/** 上一个登记场次是某人的第 1 场、他还没有第 2 场：表单先填好第 2 场（另一份委托、另一种方式），主持人可以改。 */
function nextRegistered(sessions: SessionInfo[]) {
  const last = [...sessions].reverse().find(s => s.kind === 'registered' && s.endedAt);
  if (!last || last.order !== 1 || sessions.some(s => s.kind === 'registered' && s.participant === last.participant && s.order === 2)) return null;
  return { briefId: last.briefId === 'A' ? 'B' as const : 'A' as const, method: last.method === 'free' ? 'structured' as const : 'free' as const, participant: last.participant ?? '', order: '2' as const };
}

/** 这一场的计时：主动操作、模型与排队等待、主持人交接，对照登记的限额。 */
function SessionClock({ current, attempts }: { current: SessionInfo; attempts: FrozenAttempt[] }) {
  const { events } = useStudio();
  const [, tick] = useState(0);
  useEffect(() => { const t = setInterval(() => tick(n => n + 1), 5000); return () => clearInterval(t); }, []);
  const rounds = roundsOfSession(current, attempts).rounds.map((a, i) => roundTimes(a, `第 ${i + 1} 轮`));
  const t = sessionTiming(current, events.filter(e => e.sessionId === current.id), rounds);
  const over = t.over.active || t.used.opportunities >= sessionLimits.opportunities;
  return <div className="chk4" data-testid="session-clock" data-active-ms={t.activeMs ?? ''} data-opportunities={t.used.opportunities}>
    <div><span style={{ minWidth: 64, color: 'var(--ink-3)' }}>主动操作</span><span><b className={over ? 'is-warn' : ''}>{clock(t.activeMs)}</b> / {sessionLimits.activeMinutes}:00{t.activeMs === null ? `（${clock(t.activeBounds.low)} 到 ${clock(t.activeBounds.high)}）` : ''}</span></div>
    <div><span style={{ minWidth: 64, color: 'var(--ink-3)' }}>等待</span><span>模型与排队 {clock(t.waiting.ms)}{t.unknownWaitMs ? ` · 未知 ${clock(t.unknownWaitMs)}` : ''} · 主持人交接 {clock(t.moderator.ms)} · 技术暂停 {clock(t.moderator.pauseMs)}</span></div>
    <div><span style={{ minWidth: 64, color: 'var(--ink-3)' }}>机会与图</span><span>生成 {t.used.opportunities}/{sessionLimits.opportunities} 次 · 回图 {t.used.images}/{sessionLimits.images} 张</span></div>
  </div>;
}

/** onDone：开场、换方式、结束本场、载入或解除条件、新建项目之后调用（主持人面板随之关上，回到工作台）。 */
export default function SessionSetup({ open = false, onDone }: { open?: boolean; onDone?: () => void }) {
  const done = () => onDone?.();
  const { session, sessions, currentSessionId, project, events } = useStudio();
  const st = useStudio.getState();
  const backend = useImageBackend();
  const [aiInfo, setAiInfo] = useState<AiDescribe | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [endReason, setEndReason] = useState('');
  const [note, setNote] = useState('');
  const current = sessions.find(s => s.id === currentSessionId && !s.endedAt) ?? null;
  const next = current ? null : nextRegistered(sessions);
  const [briefId, setBriefId] = useState<'' | 'A' | 'B'>(current?.briefId ?? next?.briefId ?? '');
  const [method, setMethod] = useState<SessionMethod>(current && current.method !== 'open' ? current.method : next?.method ?? 'structured');
  const [participant, setParticipant] = useState(current?.participant ?? next?.participant ?? '');
  const [order, setOrder] = useState<'' | '1' | '2'>(current?.order ? String(current.order) as '1' | '2' : next?.order ?? '');
  const [attempts, setAttempts] = useState<FrozenAttempt[]>([]);
  useEffect(() => { void describeAi().then(setAiInfo); }, []);
  useEffect(() => {
    let alive = true;
    const load = () => listAttempts().then(rows => { if (alive) setAttempts(rows); }).catch(() => {});
    load();
    window.addEventListener('candidate-record-change', load);
    return () => { alive = false; window.removeEventListener('candidate-record-change', load); };
  }, []);
  const mine = sessions.filter(s => s.projectId === project.id).slice().reverse();
  const others = sessions.filter(s => s.projectId !== project.id).slice(-6).reverse();
  const brief = studyBriefs.find(b => b.id === briefId);
  const willRegister = registrable({ briefId: briefId || undefined, method, participant, order: order ? Number(order) as 1 | 2 : undefined });
  // 同一个人的另一场：登记要求两场用不同的委托和不同的方式（pilot.md 第 2 条），次序也不能重。有冲突就不能开（4.4）。
  const clash = registrationClash(sessions, { briefId: briefId || undefined, method, participant, order: order ? Number(order) as 1 | 2 : undefined });
  // 主持人交接或技术暂停是否还开着
  const mine4 = current ? events.filter(e => e.sessionId === current.id && (e.kind === 'moderator-start' || e.kind === 'moderator-end')) : [];
  const openMark = mine4.length && mine4[mine4.length - 1].kind === 'moderator-start' ? mine4[mine4.length - 1] : null;
  const exportOne = (id?: string) => void exportSessionBundle(id).then(n => st.setNotice(n)).catch(e => st.setNotice(e instanceof Error ? e.message : String(e)));
  const row = (s: typeof sessions[number]) => {
    const n = roundsOfSession(s, attempts).rounds.length;
    return <div key={s.id} className={'lane4' + (s.id === currentSessionId ? ' is-active' : '')} data-session={s.id} data-row-method={s.method} data-kind={s.kind}>
      <b style={{ fontSize: 12.5 }}>{sessionTitle(s)}</b>
      <span className="r4-muted">{relTime(s.startedAt)}{s.endedAt ? '–' + relTime(s.endedAt) + (s.endReason ? ' · ' + s.endReason : '') : ' 起，进行中'} · {n} 轮</span>
      <div className="row4"><button type="button" className="b4 sm" data-testid="export-session" onClick={() => exportOne(s.id)}><Download size={12} />导出这一场（ZIP）</button></div>
    </div>;
  };

  return <details className="r4-sec" data-testid="session-setup" open={open || !!current?.briefId || undefined}>
    <summary style={{ cursor: 'pointer', fontSize: 12, fontWeight: 650, color: 'var(--ink-3)' }}>研究场次（主持人用）</summary>
    <div style={{ display: 'grid', gap: 12, marginTop: 10 }}>
      <div className="el4" data-testid="session-current"><div className="el4-main">
        <b>{current ? sessionTitle(current) : '现在没有进行中的一场'}</b>
        <span>{current ? `${relTime(current.startedAt)} 开始。` + (current.kind === 'trial' ? '试用，不计入实验。' : `登记场次：主动操作 ${sessionLimits.activeMinutes} 分钟、至多 ${sessionLimits.opportunities} 次生成、${sessionLimits.images} 张图，由主持人掌握。`)
          : '有新的操作时会自动开一场自由试用。'}</span>
      </div></div>
      {current && <SessionClock current={current} attempts={attempts} />}
      {current && <div style={{ display: 'grid', gap: 6 }} aria-label="主持人交接与技术暂停">
        <div className="row4" style={{ flexWrap: 'nowrap' }}>
          <input className="in4" style={{ flex: 1 }} data-testid="mark-note" value={note} placeholder="主持人做了什么（例如：帮设计者把委托原文粘进对话框；GPU 断线）" onChange={e => setNote(e.target.value)} />
        </div>
        {openMark ? <div className="row4"><span className="p4 warn">{openMark.mark === 'pause' ? '技术暂停中' : '主持人接手中'}{openMark.note ? '：' + openMark.note : ''}</span>
          <button type="button" className="b4 sm pri" data-testid="mark-resume" onClick={() => st.endModerator()}><CornerDownLeft size={11} />{openMark.mark === 'pause' ? '恢复' : '交回设计者'}</button></div>
          : <div className="row4">
            <button type="button" className="b4 sm" data-testid="mark-handoff" title="主持人接手操作或代写，到交回为止，这段不计入主动操作" onClick={() => { st.markModerator('handoff', note); setNote(''); }}><Hand size={11} />主持人接手</button>
            <button type="button" className="b4 sm" data-testid="mark-pause" title="服务故障等技术原因暂停，到恢复为止，这段不计入主动操作" onClick={() => { st.markModerator('pause', note); setNote(''); }}><Pause size={11} />技术暂停</button>
          </div>}
      </div>}
      {current && <div className="row4">
        <button type="button" className="b4 sm pri" data-testid="export-bundle" onClick={() => exportOne(current.id)}><Download size={12} />导出本场材料（ZIP）</button>
      </div>}
      {current && <div className="row4"><input className="in4" style={{ flex: 1 }} data-testid="session-end-reason" value={endReason} placeholder="结束本场的原因（例如：到 15 分钟；设计者说定稿了）" onChange={e => setEndReason(e.target.value)} />
        <button type="button" className="b4 sm" data-testid="session-end" disabled={!endReason.trim()} onClick={() => { st.endSession(endReason.trim()); setEndReason(''); st.setNotice('已结束本场。'); done(); }}><Square size={11} />结束本场</button></div>}

      <div style={{ display: 'grid', gap: 8, borderTop: '1px solid var(--line)', paddingTop: 10 }}>
        <h3 style={{ margin: 0, fontSize: 12, color: 'var(--ink-3)' }}>开一场</h3>
        {next && <p className="r4-muted" style={{ margin: 0 }} data-testid="next-suggestion">已按上一场（{next.participant} 的第 1 场）填好第 2 场：另一份委托、另一种方式。可以改。</p>}
        <label className="row4" style={{ gap: 8 }}><span className="r4-muted" style={{ minWidth: 52 }}>委托</span>
          <select className="in4" style={{ width: 'auto' }} data-testid="session-brief" value={briefId} onChange={e => setBriefId(e.target.value as '' | 'A' | 'B')}>
            <option value="">不用委托（自由试用）</option>
            {studyBriefs.map(b => <option key={b.id} value={b.id}>{b.label}</option>)}
          </select></label>
        {brief && <p className="r4-muted" style={{ margin: 0 }}>“{brief.text}”</p>}
        <div className="row4" style={{ gap: 8 }}><span className="r4-muted" style={{ minWidth: 52 }}>方式</span>
          <div className="seg4" role="group" aria-label="这一场的方式">{(['structured', 'free'] as const).map(m => <button key={m} type="button" aria-pressed={method === m} data-setup-method={m} onClick={() => setMethod(m)}>{m === 'structured' ? '工作台' : 'AI 对话 + 自由提示'}</button>)}</div></div>
        <div className="row4" style={{ gap: 8 }}><span className="r4-muted" style={{ minWidth: 52 }}>参与者</span>
          <input className="in4" style={{ width: 110 }} data-testid="session-participant" value={participant} maxLength={24} placeholder="匿名编号，如 P01" onChange={e => setParticipant(e.target.value)} />
          <select className="in4" style={{ width: 'auto' }} data-testid="session-order" value={order} onChange={e => setOrder(e.target.value as '' | '1' | '2')} aria-label="该参与者的第几场">
            <option value="">次序不填</option><option value="1">该参与者第 1 场</option><option value="2">该参与者第 2 场</option>
          </select></div>
        <p className="r4-muted" style={{ margin: 0 }} data-testid="session-kind">{willRegister ? '四项齐全：这一场是登记场次。'
          : brief ? '带委托的试用，不计入实验。登记场次还要填匿名编号和次序。' : '自由试用，不计入实验。'}</p>
        {clash.length > 0 && <p className="r4-note" style={{ margin: 0 }} data-testid="session-clash">{clash.join('；')}。同一个人的两场要用不同的委托、不同的方式，次序不能重；现在不能开，{current ? '这一场照常继续' : '请改一下再开'}。</p>}
        <div className="row4"><button type="button" className="b4 sm pri" data-testid="session-start" disabled={clash.length > 0} onClick={() => {
          const ok = st.startSession({ method, briefId: briefId || undefined, participant, order: order ? Number(order) as 1 | 2 : undefined });
          if (ok) { st.setNotice(willRegister ? `已开始登记场次：${brief!.label}，机架按 C2 固定。` : brief ? `已开始带委托的试用：${brief.label}。` : '已开始一场自由试用。'); done(); }
        }}><Play size={11} />{willRegister ? '开始登记场次' : '开始试用'}</button></div>
        <p className="r4-muted" style={{ margin: 0 }}>开始时先结束上一场。项目里已有内容就另开一个空白项目（上一场的材料仍可在下面导出）。选了委托，任务定为日常随行航拍四旋，机架按 C2 登记条件载入并锁定；两种方式看到的是同一段委托原文和同一版用户依据摘要。</p>
      </div>

      <div style={{ display: 'grid', gap: 6, borderTop: '1px solid var(--line)', paddingTop: 10 }}>
        <h3 style={{ margin: 0, fontSize: 12, color: 'var(--ink-3)' }}>直接换方式（试用）</h3>
        <div className="seg4" role="group" aria-label="换方式">{quickMethods.map(m => <button key={m.id} type="button" aria-pressed={session.method === m.id} data-session-method={m.id}
          disabled={current?.kind === 'registered'} onClick={() => { st.setSession(m.id); done(); }}>{m.label}</button>)}</div>
        <p className="r4-muted" style={{ margin: 0 }}>{current?.kind === 'registered'
          ? '这是登记场次，不能直接换方式：先结束本场，再在上面“开一场”里按次序开这个人的下一场（另一份委托、另一种方式）。'
          : '在同一个项目里换方式，会结束这一场、另起一场试用（委托沿用，便于练手）；两场各导出各的。两种方式用同一个出图后端、同一个文字模型和同样的记录。'}</p>
      </div>

      {session.method !== 'free' && project.intent.taskId === 'consumer_camera' && study.conditions.map(c => <div key={c.id} className="lane4" data-condition={c.id}>
        <b>{c.label}</b><span className="r4-muted">{c.note}</span>
        {session.lockedFrame === c.id
          ? current?.kind === 'registered'
            ? <span className="r4-muted" data-testid="condition-locked">登记场次里由程序锁定，不能解除；要换条件，先结束本场。</span>
            : <button type="button" className="b4 sm" data-testid="unlock-condition" onClick={() => { st.unlockCondition(); done(); }}><Unlock size={12} />解除锁定（试用）</button>
          : current?.kind === 'registered' ? null
          : <button type="button" className="b4 sm" data-testid="load-condition" onClick={() => { st.loadCondition(c.id); done(); }}><Lock size={12} />载入并锁定机架</button>}
      </div>)}
      <div className="chk4">
        <div><span style={{ minWidth: 64, color: 'var(--ink-3)' }}>出图</span><span>{backend.label}{backend.provider === 'minimax' ? '（开发用，不计入论文数据）' : ''}</span></div>
        <div><span style={{ minWidth: 64, color: 'var(--ink-3)' }}>文字模型</span><span data-testid="ai-label">{aiInfo?.label ?? '读取中'}</span></div>
        <div><span style={{ minWidth: 64, color: 'var(--ink-3)' }}>证据登记</span><span>{registryVersion}</span></div>
        <div><span style={{ minWidth: 64, color: 'var(--ink-3)' }}>依据摘要</span><span>{evidenceSummary.version}{evidenceSummary.status === 'draft' ? '（草稿，作者未确认）' : '（作者已确认）'}</span></div>
      </div>

      {mine.length > 0 && <div style={{ display: 'grid', gap: 6 }} data-testid="session-list">
        <h3 style={{ margin: 0, fontSize: 12, color: 'var(--ink-3)' }}>这个项目的场次</h3>
        {mine.map(row)}
      </div>}
      {others.length > 0 && <details><summary className="r4-muted" style={{ cursor: 'pointer' }}>之前项目的场次（{others.length}）</summary>
        <div style={{ display: 'grid', gap: 6, marginTop: 6 }}>{others.map(row)}</div></details>}
      <div className="row4"><button type="button" className="b4 sm" data-testid="export-workspace" onClick={() => void exportWorkspace().catch(e => st.setNotice(String(e)))}>只导出整个项目的工作区记录（JSON，含各场）</button></div>
      {current?.briefId && <p className="r4-muted" style={{ margin: 0 }}>这一场的委托：{briefOf(current)?.label}。</p>}

      {confirmReset ? <div className="row4"><span className="r4-muted">新建会结束这一场，并清空画布上的方案、意图和对话（这一场的材料仍可在上面导出）。</span>
        <button type="button" className="b4 sm pri" onClick={() => { st.reset(project.intent.taskId); setConfirmReset(false); done(); }}>确定新建</button><button type="button" className="b4 sm quiet" onClick={() => setConfirmReset(false)}>取消</button></div>
        : <button type="button" className="b4 sm" onClick={() => setConfirmReset(true)}><Plus size={12} />新建项目</button>}
    </div>
  </details>;
}
