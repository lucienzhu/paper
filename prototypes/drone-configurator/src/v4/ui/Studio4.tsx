// 4.0 工作台：一块画布（逐层搭建的决定链）加一个跟着选中节点走的面板，底部一条语言输入。
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Undo2, Redo2, FileSearch, X, Workflow, History, Download } from 'lucide-react';
import { DroneStoreContext, taskStores } from '../../store/droneStore';
import HandoffPage from '../../components/Handoff/HandoffPage';
import { useImageBackend } from '../../design/imageBackend';
import { lanePath } from '../model';
import { useStudio, type Selection } from '../store';
import { laneStore } from '../adapter';
import { useAttempts } from '../attempts';
import { describeAi, type AiDescribe } from '../ai';
import { runLane } from '../run';
import { exportWorkspace } from '../exportWorkspace';
import { recoverDesignGenerations } from '../../design/generation';
import Board4 from './Board4';
import CommandBar from './CommandBar';
import PanelIntent from './PanelIntent';
import PanelLayer from './PanelLayer';
import PanelOverview from './PanelOverview';
import { PanelCandidate, PanelCompare, PanelRender } from './PanelRound';
import FreeStudio from './FreeStudio';
import './studio4.css';

/** 顶栏只放简称，括号里的说明留在悬停提示里。 */
const short = (label: string) => label.replace(/[（(].*?[）)]/g, '').trim();

function TopBar({ onDrawer, aiInfo }: { onDrawer: () => void; aiInfo: AiDescribe | null }) {
  const { project, past, future, session } = useStudio();
  const st = useStudio.getState();
  const backend = useImageBackend();
  return <header className="t4">
    <span className="t4-brand"><i aria-hidden="true"><Workflow size={15} /></i>多旋翼造型工作台</span>
    <span className="t4-sep" />
    {session.method !== 'free' ? <nav className="t4-lanes" aria-label="方向">{project.lanes.map(l => <button key={l.id} type="button" className="t4-lane" aria-pressed={l.id === project.activeLaneId}
      data-lane={l.id} onClick={() => { st.setActiveLane(l.id); st.select({ kind: 'layer', laneId: l.id, layer: 'body' }); }}><span className="dot" />{l.name}</button>)}</nav>
      : <span className="t4-chip">AI 对话 + 自由提示</span>}
    <span className="t4-gap" />
    {session.lockedFrame && <span className="t4-chip is-warn" title="机架锁定为登记条件；在场次设置里解除">登记条件已锁定</span>}
    <span className="t4-chip hide-narrow" title={'出图后端：' + backend.label}>出图 · {short(backend.label)}</span>
    <span className={'t4-chip hide-narrow' + (aiInfo?.mode === 'model' ? ' is-ai' : '')} title={'文字模型：' + (aiInfo?.label ?? '读取中')} data-testid="ai-chip">文字 · {short(aiInfo?.label ?? '…')}</span>
    <button type="button" className="t4-btn" title="撤销" disabled={!past.length} onClick={st.undo}><Undo2 size={14} /><span className="label">撤销</span></button>
    <button type="button" className="t4-btn" title="重做" disabled={!future.length} onClick={st.redo}><Redo2 size={14} /></button>
    <button type="button" className="t4-btn" data-testid="open-records" onClick={onDrawer}><FileSearch size={14} /><span className="label">研究记录与导出</span></button>
    <a className="t4-btn" href="#v=3" title="打开 3.6 版与 B2 案例"><History size={14} /><span className="label">旧版</span></a>
  </header>;
}

export default function Studio4() {
  const { project, selection, session, notice, comparing, suggestions, compares } = useStudio();
  const st = useStudio.getState();
  const { attempts, urls } = useAttempts();
  const [drawer, setDrawer] = useState(false);
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

  if (session.method === 'free') return <div className="s4" data-testid="studio4" data-method="free">
    <TopBar onDrawer={() => setDrawer(true)} aiInfo={aiInfo} />
    <FreeStudio attempts={attempts} urls={urls} />
    {notice && <div className="toast4" role="status">{notice}<button type="button" aria-label="关闭" onClick={() => st.setNotice('')}><X size={13} /></button></div>}
  </div>;

  const wide = valid?.kind === 'compare';
  const activeStore = laneStore(project.activeLaneId);
  return <div className="s4" data-testid="studio4" data-method={session.method}>
    <TopBar onDrawer={() => setDrawer(true)} aiInfo={aiInfo} />
    <main className={'m4' + (wide ? ' is-wide' : '')}>
      <div className="c4-wrap">
        <Board4 project={project} attempts={attempts} urls={urls} selection={valid} comparing={comparing} suggestions={suggestions} compares={compares}
          lockedFrame={!!session.lockedFrame} starting={starting} onSelect={select} onRun={id => void onRun(id)} onCompare={onCompare} onExpand={onExpand} focusKey={focusKey} />
        <CommandBar selection={valid} onSelect={select} />
        {notice && <div className="toast4" role="status">{notice}<button type="button" aria-label="关闭" onClick={() => st.setNotice('')}><X size={13} /></button></div>}
      </div>
      <aside className="r4" aria-label="步骤面板"><div className="r4-scroll" key={JSON.stringify(valid)}>
        {!valid && <PanelOverview attempts={attempts} onOpen={select} />}
        {valid?.kind === 'intent' && <PanelIntent onPlaced={onPlaced} />}
        {valid?.kind === 'layer' && <PanelLayer laneId={valid.laneId} layer={valid.layer} onSelectLayer={layer => select({ kind: 'layer', laneId: valid.laneId, layer })} />}
        {valid?.kind === 'render' && <PanelRender laneId={valid.laneId} attempts={attempts} urls={urls} />}
        {valid?.kind === 'candidate' && <PanelCandidate attemptId={valid.attemptId} candidateId={valid.candidateId} attempts={attempts} urls={urls} />}
        {valid?.kind === 'compare' && <PanelCompare id={valid.id} attempts={attempts} urls={urls} />}
      </div></aside>
    </main>
    {drawer && <div style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'var(--paper)', overflow: 'auto' }} data-testid="records-drawer">
      <div className="t4" style={{ position: 'sticky', top: 0, zIndex: 2 }}><b>研究记录与导出 · {project.lanes.find(l => l.id === project.activeLaneId)?.name}</b><span className="t4-gap" />
        <button type="button" className="t4-btn" onClick={() => void exportWorkspace().catch(e => st.setNotice(String(e)))}><Download size={14} />导出工作区记录</button>
        <button type="button" className="t4-btn" onClick={() => setDrawer(false)}><X size={14} />回到画布</button></div>
      <DroneStoreContext.Provider value={activeStore as unknown as typeof taskStores.quad}><HandoffPage wide={window.innerWidth > 1180} allowNewRound={false} /></DroneStoreContext.Provider>
    </div>}
  </div>;
}

