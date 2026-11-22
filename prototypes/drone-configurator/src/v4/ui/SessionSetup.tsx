// 研究场次（主持人用）：开一场（委托、方式、参与者编号、次序）、结束本场、按场次导出材料、登记条件的载入与锁定、出图后端和文字模型的版本。
// 两种方式的面板里都有这一块。一场是一个人用一种方式的一段连续工作；在同一个项目里换方式，就是另起一场。
import { useEffect, useState } from 'react';
import { Lock, Unlock, Plus, Download, Play, Square } from 'lucide-react';
import { sessionLimits, study, studyBriefs } from '../../design/defaults';
import { useImageBackend } from '../../design/imageBackend';
import { registryVersion } from '../../design/evidence/registry.mjs';
import { listAttempts, type FrozenAttempt } from '../../design/candidateRecords';
import { useStudio, type SessionMethod } from '../store';
import { describeAi, type AiDescribe } from '../ai';
import { exportSessionBundle, exportWorkspace } from '../exportWorkspace';
import { briefOf, roundsOfSession, sessionTitle } from '../sessions';
import { relTime } from './util';

const quickMethods: { id: SessionMethod; label: string }[] = [{ id: 'open', label: '不限' }, { id: 'structured', label: '工作台' }, { id: 'free', label: 'AI 对话 + 自由提示' }];

export default function SessionSetup() {
  const { session, sessions, currentSessionId, project } = useStudio();
  const st = useStudio.getState();
  const backend = useImageBackend();
  const [aiInfo, setAiInfo] = useState<AiDescribe | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [endReason, setEndReason] = useState('');
  const current = sessions.find(s => s.id === currentSessionId && !s.endedAt) ?? null;
  const [briefId, setBriefId] = useState<'' | 'A' | 'B'>(current?.briefId ?? '');
  const [method, setMethod] = useState<SessionMethod>(current && current.method !== 'open' ? current.method : 'structured');
  const [participant, setParticipant] = useState(current?.participant ?? '');
  const [order, setOrder] = useState<'' | '1' | '2'>(current?.order ? String(current.order) as '1' | '2' : '');
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
  const exportOne = (id?: string) => void exportSessionBundle(id).then(n => st.setNotice(n)).catch(e => st.setNotice(e instanceof Error ? e.message : String(e)));
  const row = (s: typeof sessions[number]) => {
    const n = roundsOfSession(s, attempts).rounds.length;
    return <div key={s.id} className={'lane4' + (s.id === currentSessionId ? ' is-active' : '')} data-session={s.id} data-row-method={s.method}>
      <b style={{ fontSize: 12.5 }}>{sessionTitle(s)}</b>
      <span className="r4-muted">{relTime(s.startedAt)}{s.endedAt ? '–' + relTime(s.endedAt) + (s.endReason ? ' · ' + s.endReason : '') : ' 起，进行中'} · {n} 轮</span>
      <div className="row4"><button type="button" className="b4 sm" data-testid="export-session" onClick={() => exportOne(s.id)}><Download size={12} />导出这一场（ZIP）</button></div>
    </div>;
  };

  return <details className="r4-sec" data-testid="session-setup" open={!!current?.briefId || undefined}>
    <summary style={{ cursor: 'pointer', fontSize: 12, fontWeight: 650, color: 'var(--ink-3)' }}>研究场次（主持人用）</summary>
    <div style={{ display: 'grid', gap: 12, marginTop: 10 }}>
      <div className="el4" data-testid="session-current"><div className="el4-main">
        <b>{current ? sessionTitle(current) : '现在没有进行中的一场'}</b>
        <span>{current ? `${relTime(current.startedAt)} 开始。` + (current.kind === 'trial' ? '自由试用，不计入实验。' : `登记的场次：主动操作 ${sessionLimits.activeMinutes} 分钟、至多 ${sessionLimits.opportunities} 次生成、${sessionLimits.images} 张图，由主持人掌握。`)
          : '有新的操作时会自动开一场自由试用。'}</span>
      </div></div>
      {current && <div className="row4">
        <button type="button" className="b4 sm pri" data-testid="export-bundle" onClick={() => exportOne(current.id)}><Download size={12} />导出本场材料（ZIP）</button>
      </div>}
      {current && <div className="row4"><input className="in4" style={{ flex: 1 }} data-testid="session-end-reason" value={endReason} placeholder="结束本场的原因（例如：到 15 分钟；设计者说定稿了）" onChange={e => setEndReason(e.target.value)} />
        <button type="button" className="b4 sm" data-testid="session-end" disabled={!endReason.trim()} onClick={() => { st.endSession(endReason.trim()); setEndReason(''); st.setNotice('已结束本场。'); }}><Square size={11} />结束本场</button></div>}

      <div style={{ display: 'grid', gap: 8, borderTop: '1px solid var(--line)', paddingTop: 10 }}>
        <h3 style={{ margin: 0, fontSize: 12, color: 'var(--ink-3)' }}>开一场</h3>
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
        <div className="row4"><button type="button" className="b4 sm pri" data-testid="session-start" onClick={() => {
          st.startSession({ method, briefId: briefId || undefined, participant, order: order ? Number(order) as 1 | 2 : undefined });
          st.setNotice(brief ? `已开始：${brief.label}，机架按 C2 锁定。` : '已开始一场自由试用。');
        }}><Play size={11} />开始本场</button></div>
        <p className="r4-muted" style={{ margin: 0 }}>开始时先结束上一场。项目里已有内容就另开一个空白项目（上一场的材料仍可在下面导出）。选了委托，任务定为日常随行航拍四旋，机架按 C2 登记条件载入并锁定；两种方式看到的是同一段委托原文。</p>
      </div>

      <div style={{ display: 'grid', gap: 6, borderTop: '1px solid var(--line)', paddingTop: 10 }}>
        <h3 style={{ margin: 0, fontSize: 12, color: 'var(--ink-3)' }}>直接换方式</h3>
        <div className="seg4" role="group" aria-label="换方式">{quickMethods.map(m => <button key={m.id} type="button" aria-pressed={session.method === m.id} data-session-method={m.id} onClick={() => st.setSession(m.id)}>{m.label}</button>)}</div>
        <p className="r4-muted" style={{ margin: 0 }}>在同一个项目里换方式，会结束这一场、另起一场；两场各导出各的。两种方式用同一个出图后端、同一个文字模型和同样的记录。</p>
      </div>

      {session.method !== 'free' && project.intent.taskId === 'consumer_camera' && study.conditions.map(c => <div key={c.id} className="lane4" data-condition={c.id}>
        <b>{c.label}</b><span className="r4-muted">{c.note}</span>
        {session.lockedFrame === c.id
          ? <button type="button" className="b4 sm" onClick={() => st.unlockCondition()}><Unlock size={12} />解除锁定</button>
          : <button type="button" className="b4 sm" data-testid="load-condition" onClick={() => st.loadCondition(c.id)}><Lock size={12} />载入并锁定机架</button>}
      </div>)}
      <div className="chk4">
        <div><span style={{ minWidth: 64, color: 'var(--ink-3)' }}>出图</span><span>{backend.label}{backend.provider === 'minimax' ? '（开发用，不计入论文数据）' : ''}</span></div>
        <div><span style={{ minWidth: 64, color: 'var(--ink-3)' }}>文字模型</span><span data-testid="ai-label">{aiInfo?.label ?? '读取中'}</span></div>
        <div><span style={{ minWidth: 64, color: 'var(--ink-3)' }}>证据登记</span><span>{registryVersion}</span></div>
      </div>

      {mine.length > 0 && <div style={{ display: 'grid', gap: 6 }} data-testid="session-list">
        <h3 style={{ margin: 0, fontSize: 12, color: 'var(--ink-3)' }}>这个项目的场次</h3>
        {mine.map(row)}
      </div>}
      {others.length > 0 && <details><summary className="r4-muted" style={{ cursor: 'pointer' }}>之前项目的场次（{others.length}）</summary>
        <div style={{ display: 'grid', gap: 6, marginTop: 6 }}>{others.map(row)}</div></details>}
      <div className="row4"><button type="button" className="b4 sm" data-testid="export-workspace" onClick={() => void exportWorkspace().catch(e => st.setNotice(String(e)))}>只导出整个项目的工作区记录（JSON，含各场）</button></div>
      {current?.briefId && <p className="r4-muted" style={{ margin: 0 }}>这一场的委托：{briefOf(current)?.label}。</p>}

      {confirmReset ? <div className="row4"><span className="r4-muted">新建会结束这一场，并清空画布上的方向、意图和对话（这一场的材料仍可在上面导出）。</span>
        <button type="button" className="b4 sm pri" onClick={() => { st.reset(project.intent.taskId); setConfirmReset(false); }}>确定新建</button><button type="button" className="b4 sm quiet" onClick={() => setConfirmReset(false)}>取消</button></div>
        : <button type="button" className="b4 sm" onClick={() => setConfirmReset(true)}><Plus size={12} />新建项目</button>}
    </div>
  </details>;
}
