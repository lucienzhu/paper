// 研究场次设置（主持人用）：这一场的方式、登记条件的载入与锁定、出图后端和文字模型的版本。两种方式的面板里都有这一块。
import { useEffect, useState } from 'react';
import { Lock, Unlock, Plus, Download } from 'lucide-react';
import { study } from '../../design/defaults';
import { useImageBackend } from '../../design/imageBackend';
import { registryVersion } from '../../design/evidence/registry.mjs';
import { useStudio, type SessionMethod } from '../store';
import { describeAi, type AiDescribe } from '../ai';
import { exportSessionBundle, exportWorkspace } from '../exportWorkspace';

const methods: { id: SessionMethod; label: string }[] = [{ id: 'open', label: '不限' }, { id: 'structured', label: '工作台' }, { id: 'free', label: 'AI 对话 + 自由提示' }];

export default function SessionSetup() {
  const { session } = useStudio();
  const st = useStudio.getState();
  const backend = useImageBackend();
  const [aiInfo, setAiInfo] = useState<AiDescribe | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [endReason, setEndReason] = useState('');
  useEffect(() => { void describeAi().then(setAiInfo); }, []);
  return <details className="r4-sec" data-testid="session-setup">
    <summary style={{ cursor: 'pointer', fontSize: 12, fontWeight: 650, color: 'var(--ink-3)' }}>研究场次设置（主持人用）</summary>
    <div style={{ display: 'grid', gap: 12, marginTop: 10 }}>
      <p className="r4-muted">平时设计不用改这里。做登记的场次时，由主持人在开场前设好。</p>
      <div><h3 style={{ margin: '0 0 6px', fontSize: 12, color: 'var(--ink-3)' }}>这一场的方式</h3>
        <div className="seg4" role="group" aria-label="这一场的方式">{methods.map(m => <button key={m.id} type="button" aria-pressed={session.method === m.id} data-session-method={m.id} onClick={() => st.setSession(m.id)}>{m.label}</button>)}</div>
        <p className="r4-muted" style={{ marginTop: 6 }}>两种方式用同一个出图后端、同一个文字模型和同样的记录；“AI 对话 + 自由提示”那一场只有对话、提示词和候选。</p></div>
      {session.method !== 'free' && study.conditions.map(c => <div key={c.id} className="lane4" data-condition={c.id}>
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
      <div className="row4"><button type="button" className="b4 sm pri" data-testid="export-bundle" onClick={() => void exportSessionBundle().then(n => st.setNotice(n)).catch(e => st.setNotice(String(e)))}><Download size={12} />导出本场材料（ZIP）</button>
        <button type="button" className="b4 sm" data-testid="export-workspace" onClick={() => void exportWorkspace().catch(e => st.setNotice(String(e)))}>只导出工作区记录（JSON）</button></div>
      <p className="r4-muted">本场材料是一个 ZIP：工作区记录、这个项目每一轮的冻结输入、回执和原图，以及本机服务日志里这一场的 AI 调用。</p>
      <div className="row4"><input className="in4" style={{ flex: 1 }} data-testid="session-end-reason" value={endReason} placeholder="结束本场的原因（例如：到 15 分钟；设计者说定稿了）" onChange={e => setEndReason(e.target.value)} />
        <button type="button" className="b4 sm" data-testid="session-end" disabled={!endReason.trim()} onClick={() => { st.logEvent({ kind: 'session-end', text: '结束本场：' + endReason.trim() }); setEndReason(''); st.setNotice('已记下结束本场。'); }}>记下结束本场</button></div>
      {confirmReset ? <div className="row4"><span className="r4-muted">新建会清空画布上的方向、意图和对话（生成过的图和记录仍在本机）。</span>
        <button type="button" className="b4 sm pri" onClick={() => { st.reset(); setConfirmReset(false); }}>确定新建</button><button type="button" className="b4 sm quiet" onClick={() => setConfirmReset(false)}>取消</button></div>
        : <button type="button" className="b4 sm" onClick={() => setConfirmReset(true)}><Plus size={12} />新建项目</button>}
    </div>
  </details>;
}
