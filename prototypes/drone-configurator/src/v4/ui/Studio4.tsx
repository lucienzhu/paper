// 4.0 工作台：一块画布（逐层搭建的决定链）加一个跟着选中节点走的面板，底部一条语言输入。
// 4.4：主持人用的东西（开场、计时、交接与暂停、结束本场、导出、研究记录）收进“主持人”面板；登记场次里参与者的界面
// 不再出现研究记录、旧版（带 B2 案例）和场次设置，打开主持人面板要先确认，并记一笔。两种方式开场先看同一张任务卡。
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Undo2, Redo2, FileSearch, X, Workflow, History, Download, UserCog } from 'lucide-react';
import { DroneStoreContext, taskStores } from '../../store/droneStore';
import HandoffPage from '../../components/Handoff/HandoffPage';
import { useImageBackend } from '../../design/imageBackend';
import { lanePath, studioTask } from '../model';
import { useStudio, type Selection } from '../store';
import { laneStore } from '../adapter';
import { useAttempts } from '../attempts';
import { describeAi, type AiDescribe } from '../ai';
import { runLane } from '../run';
import { exportSessionBundle } from '../exportWorkspace';
import { briefOf, roundsOfSession, sessionTitle } from '../sessions';
import { recoverDesignGenerations } from '../../design/generation';
import Board4 from './Board4';
import CommandBar from './CommandBar';
import PanelIntent from './PanelIntent';
import PanelLayer from './PanelLayer';
import PanelOverview from './PanelOverview';
import { PanelCandidate, PanelCompare, PanelRender } from './PanelRound';
import FreeStudio from './FreeStudio';
import SessionSetup from './SessionSetup';
import TaskStart from './TaskStart';
import './studio4.css';

/** 顶栏只放简称，括号里的说明留在悬停提示里。 */
const short = (label: string) => label.replace(/[（(].*?[）)]/g, '').trim();

function TopBar({ onDrawer, onModerator, aiInfo }: { onDrawer: () => void; onModerator: () => void; aiInfo: AiDescribe | null }) {
  const { project, past, future, session, sessions, currentSessionId, events } = useStudio();
  const st = useStudio.getState();
  const backend = useImageBackend();
  const current = sessions.find(s => s.id === currentSessionId && !s.endedAt);
  const brief = briefOf(current);
  const registered = current?.kind === 'registered';
  // 主持人接手或技术暂停还开着：顶栏写明，这段不计入主动操作。
  const marks = current ? events.filter(e => e.sessionId === current.id && (e.kind === 'moderator-start' || e.kind === 'moderator-end')) : [];
  const openMark = marks.length && marks[marks.length - 1].kind === 'moderator-start' ? marks[marks.length - 1] : null;
  return <header className="t4">
    <span className="t4-brand"><i aria-hidden="true"><Workflow size={15} /></i>多旋翼造型工作台</span>
    <span className="t4-sep" />
    <span className={'t4-chip' + (current?.kind === 'registered' ? ' is-ai' : '')} data-testid="session-chip" title={current ? sessionTitle(current) : '现在没有进行中的一场'}>
      {current ? `第 ${current.no} 场 · ${brief ? brief.label : '自由试用'}${brief && current.kind === 'trial' ? ' · 试用' : ''}` : '未开场'}</span>
    {openMark && <span className="t4-chip is-warn" data-testid="moderator-chip">{openMark.mark === 'pause' ? '技术暂停中' : '主持人接手中'}</span>}
    <span className="t4-chip hide-narrow" title="这个项目的任务">{studioTask(project.intent.taskId).short}</span>
    {session.method !== 'free' ? <nav className="t4-lanes" aria-label="方案">{project.lanes.map(l => <button key={l.id} type="button" className="t4-lane" aria-pressed={l.id === project.activeLaneId}
      data-lane={l.id} title={l.name} onClick={() => { st.setActiveLane(l.id); st.select({ kind: 'layer', laneId: l.id, layer: 'body' }); }}><span className="dot" /><span className="name">{l.name}</span></button>)}</nav>
      : <span className="t4-chip">AI 对话 + 自由提示</span>}
    <span className="t4-gap" />
    {session.lockedFrame && session.method !== 'free' && <span className="t4-chip is-warn" title={registered ? '机架是这一场登记的条件，由程序锁定' : '机架锁定为登记条件（试用）'}>机架已固定</span>}
    {!registered && <span className="t4-chip hide-narrow" title={'出图后端：' + backend.label}>出图 · {short(backend.label)}</span>}
    {!registered && <span className={'t4-chip hide-narrow' + (aiInfo?.mode === 'model' ? ' is-ai' : '')} title={'文字模型：' + (aiInfo?.label ?? '读取中')} data-testid="ai-chip">文字 · {short(aiInfo?.label ?? '…')}</span>}
    <button type="button" className="t4-btn" title="撤销" disabled={!past.length} onClick={st.undo}><Undo2 size={14} /><span className="label">撤销</span></button>
    <button type="button" className="t4-btn" title="重做" disabled={!future.length} onClick={st.redo}><Redo2 size={14} /></button>
    {/* 登记场次里，研究记录、导出和旧版只在主持人面板里；旧版带 B2 案例，会给参与者多一份设计参照。 */}
    {!registered && <button type="button" className="t4-btn" data-testid="open-records" onClick={onDrawer}><FileSearch size={14} /><span className="label">研究记录与导出</span></button>}
    {!registered && <a className="t4-btn" href="#v=3" data-testid="old-version" title="打开 3.6 版与 B2 案例"><History size={14} /><span className="label">旧版</span></a>}
    <button type="button" className="t4-btn" data-testid="open-moderator" title="开场、计时、交接与暂停、结束本场、导出" onClick={onModerator}><UserCog size={14} /><span className="label">主持人</span></button>
  </header>;
}

/** 主持人面板：开一场、计时、交接与暂停、结束本场、按场次导出、研究记录。参与者不需要打开。 */
function ModeratorDrawer({ onClose, onRecords }: { onClose: () => void; onRecords: () => void }) {
  return <div style={{ position: 'fixed', inset: 0, zIndex: 55, background: 'var(--paper)', overflow: 'auto' }} data-testid="moderator-drawer">
    <div className="t4" style={{ position: 'sticky', top: 0, zIndex: 2 }}><b>主持人面板</b><span className="t4-gap" />
      <button type="button" className="t4-btn" data-testid="open-records-moderator" onClick={onRecords}><FileSearch size={14} />研究记录（逐轮）</button>
      {/* 登记场次里顶栏不放“旧版”，由主持人从这里进；离开工作台不结束这一场，记录留在本机。 */}
      <a className="t4-btn" href="#v=3" data-testid="old-version-moderator" title="打开 3.6 版与 B2 案例；这一场不会因此结束"><History size={14} />旧版与 B2 案例</a>
      <button type="button" className="t4-btn" data-testid="close-moderator" onClick={onClose}><X size={14} />回到工作台</button></div>
    <div style={{ maxWidth: 760, margin: '0 auto', padding: '16px 20px 40px' }}><SessionSetup open onDone={onClose} /></div>
  </div>;
}
/** 登记场次里打开主持人面板之前先确认，打开了就记一笔：参与者误开也查得到。 */
function ModeratorConfirm({ onOpen, onCancel }: { onOpen: () => void; onCancel: () => void }) {
  return <div className="task4-overlay" role="dialog" aria-modal="true" aria-label="打开主持人面板" data-testid="moderator-confirm">
    <div className="task4-card" style={{ maxWidth: 460 }}>
      <b>主持人面板</b>
      <p style={{ margin: 0 }}>开场、计时、交接与暂停、结束本场和导出都在这里，由主持人操作。参与者不需要打开。打开会记进这一场的记录。</p>
      <div className="row4"><button type="button" className="b4 pri" data-testid="moderator-confirm-open" onClick={onOpen}>我是主持人，打开</button>
        <button type="button" className="b4 quiet" onClick={onCancel}>取消</button></div>
    </div>
  </div>;
}

export default function Studio4() {
  const { project, selection, session, notice, comparing, suggestions, compares, epoch } = useStudio();
  const st = useStudio.getState();
  const { attempts, urls } = useAttempts();
  const [drawer, setDrawer] = useState(false);
  const [moderator, setModerator] = useState<'closed' | 'confirm' | 'open'>('closed');
  const [aiInfo, setAiInfo] = useState<AiDescribe | null>(null);
  const [starting, setStarting] = useState<Set<string>>(() => new Set());
  const [focusKey, setFocusKey] = useState<string>();
  useEffect(() => { void describeAi().then(setAiInfo); void recoverDesignGenerations().catch(console.error); }, []);
  useEffect(() => { if (!notice) return; const t = setTimeout(() => st.setNotice(''), 4200); return () => clearTimeout(t); }, [notice, st]);
  // Esc：取消选中，回到总览；在输入框里打字时不拦。
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (e.key !== 'Escape' || drawer || (t && (t.closest('input, textarea, select, [contenteditable=true]')))) return;
      useStudio.getState().select(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [drawer]);

  // 选中的节点若已不在（例如方向被删去），回到总览。
  const valid: Selection = useMemo(() => {
    if (!selection) return null;
    if ((selection.kind === 'layer' || selection.kind === 'render') && !project.lanes.some(l => l.id === selection.laneId)) return null;
    return selection;
  }, [selection, project.lanes]);

  const select = useCallback((s: Selection) => {
    if (s && (s.kind === 'layer' || s.kind === 'render') && s.laneId !== useStudio.getState().project.activeLaneId) useStudio.getState().setActiveLane(s.laneId);
    useStudio.getState().select(s);
  }, []);
  const onRun = useCallback(async (laneId: string) => {
    setStarting(s => new Set(s).add(laneId));
    try { await runLane(laneId); useStudio.getState().setNotice('已提交。回图会出现在这一行的后面。'); }
    catch (e) { useStudio.getState().setNotice(e instanceof Error ? e.message : String(e)); }
    finally { setStarting(s => { const n = new Set(s); n.delete(laneId); return n; }); }
  }, []);
  const onCompare = useCallback((key: string) => useStudio.getState().toggleCompare(key), []);
  const onExpand = useCallback((laneId: string) => { useStudio.getState().collapseLane(laneId, false); useStudio.getState().setActiveLane(laneId); }, []);
  const onPlaced = (laneId: string) => {
    const node = lanePath(useStudio.getState().project, laneId).find(n => Object.keys(n.touched).length) ?? lanePath(useStudio.getState().project, laneId)[2];
    select({ kind: 'layer', laneId, layer: node.layer });
    setFocusKey(node.id);
  };

  // 研究记录抽屉：两种方式都有，只列这一场的轮次，和“导出本场材料”装进 ZIP 的一致。自由提示那一场只看各轮记录（没有结构化的设计输入）。
  const free = session.method === 'free';
  const activeStore = laneStore(project.activeLaneId);
  const { sessions, currentSessionId } = useStudio();
  const current = sessions.find(s => s.id === currentSessionId && !s.endedAt) ?? null;
  const openModerator = () => setModerator(current?.kind === 'registered' ? 'confirm' : 'open');
  const moderatorEl = <>
    {moderator === 'confirm' && <ModeratorConfirm onCancel={() => setModerator('closed')}
      onOpen={() => { st.logEvent({ kind: 'moderator-panel', text: '打开主持人面板' }); setModerator('open'); }} />}
    {moderator === 'open' && <ModeratorDrawer onClose={() => setModerator('closed')} onRecords={() => { setModerator('closed'); setDrawer(true); }} />}
    <TaskStart />
  </>;
  const drawerEl = drawer && <div style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'var(--paper)', overflow: 'auto' }} data-testid="records-drawer">
    <div className="t4" style={{ position: 'sticky', top: 0, zIndex: 2 }}><b>研究记录与导出 · {current ? sessionTitle(current) : '现在没有进行中的一场'}</b><span className="t4-gap" />
      <button type="button" className="t4-btn" data-testid="export-bundle-drawer" disabled={!current} onClick={() => void exportSessionBundle(current?.id).then(n => st.setNotice(n)).catch(e => st.setNotice(e instanceof Error ? e.message : String(e)))}><Download size={14} />导出本场材料（ZIP）</button>
      <button type="button" className="t4-btn" onClick={() => setDrawer(false)}><X size={14} />回到画布</button></div>
    <DroneStoreContext.Provider value={activeStore as unknown as typeof taskStores.quad}>
      <HandoffPage wide={window.innerWidth > 1180} allowNewRound={false} roundsOnly={free}
        filter={a => !!current && roundsOfSession(current, [a]).rounds.length === 1} />
    </DroneStoreContext.Provider>
  </div>;

  if (free) return <div className="s4" data-testid="studio4" data-method="free">
    <TopBar onDrawer={() => setDrawer(true)} onModerator={openModerator} aiInfo={aiInfo} />
    {/* 按场次的分界重新挂载：上一场没发出的对话、提示词和选中的父图不带进下一场 */}
    <FreeStudio key={epoch} attempts={attempts} urls={urls} />
    {notice && <div className="toast4" role="status">{notice}<button type="button" aria-label="关闭" onClick={() => st.setNotice('')}><X size={13} /></button></div>}
    {drawerEl}
    {moderatorEl}
  </div>;

  const wide = valid?.kind === 'compare';
  return <div className="s4" data-testid="studio4" data-method={session.method}>
    <TopBar onDrawer={() => setDrawer(true)} onModerator={openModerator} aiInfo={aiInfo} />
    <main className={'m4' + (wide ? ' is-wide' : '')}>
      <div className="c4-wrap">
        <Board4 project={project} attempts={attempts} urls={urls} selection={valid} comparing={comparing} suggestions={suggestions} compares={compares}
          lockedFrame={!!session.lockedFrame} starting={starting} onSelect={select} onRun={id => void onRun(id)} onCompare={onCompare} onExpand={onExpand} focusKey={focusKey} />
        <CommandBar key={epoch} selection={valid} onSelect={select} />
        {notice && <div className="toast4" role="status">{notice}<button type="button" aria-label="关闭" onClick={() => st.setNotice('')}><X size={13} /></button></div>}
      </div>
      <aside className="r4" aria-label="步骤面板"><div className="r4-scroll" key={epoch + JSON.stringify(valid)}>
        {!valid && <PanelOverview attempts={attempts} onOpen={select} />}
        {valid?.kind === 'intent' && <PanelIntent onPlaced={onPlaced} />}
        {valid?.kind === 'layer' && <PanelLayer laneId={valid.laneId} layer={valid.layer} onSelectLayer={layer => select({ kind: 'layer', laneId: valid.laneId, layer })} />}
        {valid?.kind === 'render' && <PanelRender laneId={valid.laneId} attempts={attempts} urls={urls} />}
        {valid?.kind === 'candidate' && <PanelCandidate attemptId={valid.attemptId} candidateId={valid.candidateId} attempts={attempts} urls={urls} />}
        {valid?.kind === 'compare' && <PanelCompare id={valid.id} attempts={attempts} urls={urls} />}
      </div></aside>
    </main>
    {drawerEl}
    {moderatorEl}
  </div>;
}

