// 画布：每条方向一行，从左到右是意图、机架、动力、机身、细节、色材、生成和候选。被几条方向共用的节点只画一次。
// 节点位置按链计算，不靠手工摆放；平移、缩放、适应全图照常可用。
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ReactFlow, ReactFlowProvider, Handle, Position, useReactFlow, useStore, useViewport, type Edge, type Node, type NodeChange, type NodeProps } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Check, Lock, Maximize2, Crosshair, LoaderCircle, AlertCircle, Sparkles } from 'lucide-react';
import type { FrozenAttempt } from '../../design/candidateRecords';
import WorkflowImage from '../../design/workflow/WorkflowImage';
import { candidateRetained } from '../../design/candidateRecords';
import { boardRows, isDefault, laneParameters, lanePath, layerInfo, layers, pairLayers, sharedBy, staleFields, type Layer, type Project } from '../model';
import type { CompareRecord, Selection, Suggestion } from '../store';
import { candidateKey, laneScope } from '../attempts';
import MiniTop from './MiniTop';
import { layerSummary as summaryOf } from './util';

const COL = { intent: 0, layer0: 230, step: 172, render: 1098, cand0: 1284, candStep: 162 };
const ROW = { open: 262, collapsed: 128 };
const sizeEstimate = { intent: { w: 200, h: 150 }, layer: { w: 156, h: 196 }, render: { w: 156, h: 150 }, candidate: { w: 150, h: 186 }, compare: { w: 190, h: 120 }, collapsed: { w: 300, h: 96 } };

const handles = <><Handle type="target" position={Position.Left} /><Handle type="source" position={Position.Right} /></>;

const IntentNode = memo(({ data, selected }: NodeProps) => {
  const d = data as { text: string; confirmed: boolean; targets: string[]; layers: string[]; cards: number; pending: number };
  return <div className={'n4' + (selected ? ' is-selected' : '')} style={{ width: 200 }} data-node="intent">
    {handles}
    <div className="n4-h">意图<span className="grow" />{d.confirmed ? <span className="p4 ok"><Check size={10} />已确认</span> : d.pending ? <span className="p4 ai">{d.pending} 条待确认</span> : <span className="p4 gray">待写</span>}</div>
    <div className="n4-t n4-clamp">{d.text || '写一句这次想做什么，AI 会帮你读出来。'}</div>
    {d.targets.length > 0 && <div className="n4-s">目标：{d.targets.join('、')}</div>}
    {d.layers.length > 0 && <div className="n4-s">作用于：{d.layers.join(' · ')}</div>}
    {d.cards > 0 && <div className="n4-s">{d.cards} 条用户原话作依据</div>}
  </div>;
});

const LayerCard = memo(({ data, selected }: NodeProps) => {
  const d = data as { layer: Layer; parameters: never; summary: string; shared: number; isDefault: boolean; suggestions: number; issues: number; locked: boolean; faint: boolean; inPath: boolean };
  return <div className={'n4' + (selected ? ' is-selected' : '') + (d.locked ? ' is-locked' : '') + (d.faint ? ' is-faint' : '')} style={{ width: 156 }} data-node="layer" data-layer={d.layer} data-locked={d.locked ? 'yes' : undefined}>
    {handles}
    <div className="n4-h">{layerInfo[d.layer].name}<span className="grow" />
      {d.locked && <span className="p4 lock" title="登记条件，已锁定"><Lock size={10} />锁定</span>}
      {!d.locked && d.suggestions > 0 && <span className="p4 ai">{d.suggestions} 条建议</span>}
      {!d.locked && !d.suggestions && d.issues > 0 && <span className="p4 warn">{d.issues} 条待处理</span>}
      {!d.locked && !d.suggestions && !d.issues && d.shared > 1 && <span className="p4 gray" title={`${d.shared} 条方向共用`}>共用 ×{d.shared}</span>}
      {!d.locked && !d.suggestions && !d.issues && d.shared <= 1 && d.isDefault && <span className="p4 gray">起始值</span>}
    </div>
    <MiniTop parameters={d.parameters} upto={d.layer} highlight={selected} />
    <div className="n4-s n4-clamp" style={{ WebkitLineClamp: 2 }}>{d.summary}</div>
  </div>;
});

const RenderNode = memo(({ data, selected }: NodeProps) => {
  const d = data as { laneId: string; rounds: number; running: boolean; issue: boolean; stale: number; locked: boolean; onRun: (laneId: string) => void; disabled: boolean; faint: boolean };
  return <div className={'n4' + (selected ? ' is-selected' : '') + (d.stale ? ' is-stale' : '') + (d.faint ? ' is-faint' : '')} style={{ width: 156 }} data-node="render" data-lane={d.laneId}>
    {handles}
    <div className="n4-h">生成<span className="grow" />
      {d.running ? <span className="p4 gray"><LoaderCircle size={10} className="animate-spin" />生成中</span> : d.issue ? <span className="p4 warn"><AlertCircle size={10} />需处理</span>
        : d.stale ? <span className="p4 warn">已过时</span> : d.rounds ? <span className="p4 ok">已回图</span> : <span className="p4 gray">还没生成</span>}</div>
    <div className="n4-t">{d.stale ? `上游改了 ${d.stale} 项，按新设置再生成` : d.rounds ? `已生成 ${d.rounds} 轮` : '把这条方向送去出图'}</div>
    <div className="n4-s">条件图 + 由各层编译的文字</div>
    <button type="button" className="n4-run nodrag" disabled={d.disabled || d.running} data-testid="node-run" onClick={e => { e.stopPropagation(); d.onRun(d.laneId); }}>
      <Sparkles size={13} />{d.rounds ? '再生成一轮' : '生成'}</button>
  </div>;
});

const CandidateNode = memo(({ data, selected }: NodeProps) => {
  const d = data as { label: string; image?: string; attemptId: string; candidateId: string; firstShown?: string; retained: boolean; comparing: boolean; revision: boolean; onCompare: (key: string) => void };
  return <div className={'n4' + (selected ? ' is-selected' : '')} style={{ width: 150 }} data-node="candidate" data-candidate={d.candidateId}>
    {handles}
    <button type="button" className="n4-check nodrag" role="checkbox" aria-checked={d.comparing} aria-label="加入比较" title="加入比较"
      onClick={e => { e.stopPropagation(); d.onCompare(candidateKey(d.attemptId, d.candidateId)); }}>{d.comparing && <Check size={12} />}</button>
    <div className="n4-h">{d.label}{d.revision && <span className="p4 gray">修改轮</span>}<span className="grow" />{d.retained && <span className="p4 ok">保留</span>}</div>
    {d.image ? <WorkflowImage className="cand" node={{ id: d.candidateId, image: d.image, firstShown: d.firstShown, candidateId: d.candidateId, attemptId: d.attemptId }} alt={d.label} />
      : <div className="cand" style={{ aspectRatio: '1', borderRadius: 7, background: 'var(--surface-2)' }} />}
  </div>;
});

const CompareNode = memo(({ data, selected }: NodeProps) => {
  const d = data as { title: string; chosen?: string; reason?: string; diff: string };
  return <div className={'n4' + (selected ? ' is-selected' : '')} style={{ width: 190 }} data-node="compare">
    {handles}
    <div className="n4-h">比较<span className="grow" />{d.chosen ? <span className="p4 ok">已取舍</span> : <span className="p4 gray">待取舍</span>}</div>
    <div className="n4-t">{d.title}</div>
    <div className="n4-s">{d.diff}</div>
    {d.reason && <div className="n4-s n4-clamp">“{d.reason}”</div>}
  </div>;
});

const CollapsedNode = memo(({ data, selected }: NodeProps) => {
  const d = data as { name: string; parameters: never; detail: string };
  return <div className={'n4 is-faint' + (selected ? ' is-selected' : '')} style={{ width: 300, gridTemplateColumns: '96px 1fr', alignItems: 'center' }} data-node="collapsed">
    {handles}
    <MiniTop parameters={d.parameters} upto="cmf" height={72} />
    <div style={{ display: 'grid', gap: 3 }}><div className="n4-h">{d.name}</div><div className="n4-s">{d.detail}</div><div className="n4-s">点一下展开</div></div>
  </div>;
});

const nodeTypes = { intent: IntentNode, layer: LayerCard, render: RenderNode, candidate: CandidateNode, compare: CompareNode, collapsed: CollapsedNode };

export interface BoardProps {
  project: Project; attempts: FrozenAttempt[]; urls: Map<string, string>; selection: Selection; comparing: string[];
  suggestions: Suggestion[]; compares: CompareRecord[]; lockedFrame: boolean; starting: Set<string>;
  onSelect: (s: Selection) => void; onRun: (laneId: string) => void; onCompare: (key: string) => void; onExpand: (laneId: string) => void;
  focusKey?: string;
}

function Inner(props: BoardProps) {
  const { project, attempts, urls, selection, comparing, suggestions, compares, lockedFrame, starting, onSelect, onRun, onCompare, onExpand } = props;
  const flow = useReactFlow();
  const { nodes, edges, labels } = useMemo(() => {
    const nodes: Node[] = [], edges: Edge[] = [], labels: { x: number; y: number; text: string }[] = [];
    const rows = boardRows(project);
    const active = project.activeLaneId;
    const activePath = new Set(lanePath(project, active).map(n => n.id));
    const rowY: number[] = [];
    let y = 0;
    project.lanes.forEach((lane, i) => { rowY[i] = y; y += lane.collapsed ? ROW.collapsed : ROW.open; });
    const intent = project.intent;
    const accepted = intent.elements.filter(e => e.status === 'accepted');
    const pairNames: Record<string, [string, string]> = { compact: ['紧凑', '舒展'], simple: ['简洁', '繁复'], integrated: ['整体', '拼凑'], visible: ['低调', '醒目'] };
    const touchedLayers = [...new Set(accepted.flatMap(e => e.pair ? pairLayers[e.pair] : []))].map(l => layerInfo[l].name);
    nodes.push({ id: 'intent', type: 'intent', position: { x: COL.intent, y: 40 }, selected: selection?.kind === 'intent',
      data: { text: intent.text, confirmed: !!intent.confirmedAt, pending: intent.elements.filter(e => e.status === 'pending').length,
        targets: accepted.filter(e => e.pair && e.pole).map(e => pairNames[e.pair!][e.pole === 'left' ? 0 : 1]), layers: touchedLayers, cards: intent.cards.length } });
    const pendingByNode = new Map<string, number>();
    for (const s of suggestions) if (s.status === 'pending') {
      try { const n = lanePath(project, s.laneId)[layers.indexOf(s.layer)]; pendingByNode.set(n.id, (pendingByNode.get(n.id) ?? 0) + 1); } catch { /* 方向已删去 */ }
    }
    project.lanes.forEach((lane, row) => {
      const path = lanePath(project, lane.id);
      const top = rowY[row];
      labels.push({ x: COL.layer0, y: top + 14, text: lane.name + (lane.id === active ? '（正在编辑）' : '') + (lane.forkedFrom ? ` · 从${project.lanes.find(l => l.id === lane.forkedFrom!.laneId)?.name ?? ''}的${layerInfo[lane.forkedFrom.layer].name}分出` : '') });
      if (lane.collapsed) {
        const firstOwn = path.findIndex(n => rows.get(n.id) === row);
        const at = Math.max(0, firstOwn);
        nodes.push({ id: 'collapsed-' + lane.id, type: 'collapsed', position: { x: COL.layer0 + at * COL.step, y: top + 34 },
          data: { name: lane.name, parameters: laneParameters(project, lane.id), detail: `${layers.length - at} 层与上面不同 · ${attempts.filter(a => a.variantScope === laneScope(lane.id)).length} 轮生成` } });
        if (at > 0) edges.push({ id: `e-${path[at - 1].id}-c-${lane.id}`, source: path[at - 1].id, target: 'collapsed-' + lane.id, className: 'is-fork' });
        return;
      }
      path.forEach((node, i) => {
        if (rows.get(node.id) !== row) return;
        const p = laneParameters(project, lane.id, node.layer);
        nodes.push({ id: node.id, type: 'layer', position: { x: COL.layer0 + i * COL.step, y: top + 34 },
          selected: selection?.kind === 'layer' && selection.laneId === lane.id && selection.layer === node.layer,
          data: { layer: node.layer, laneId: lane.id, parameters: p, summary: summaryOf(node.layer, p), shared: sharedBy(project, node.id).length,
            isDefault: isDefault(node), suggestions: pendingByNode.get(node.id) ?? 0, issues: node.issues.filter(x => !x.resolved).length,
            locked: lockedFrame && node.layer === 'frame', faint: !activePath.has(node.id) && project.lanes.length > 1, inPath: activePath.has(node.id) } });
        const source = i === 0 ? 'intent' : path[i - 1].id;
        edges.push({ id: `e-${source}-${node.id}`, source, target: node.id, className: (activePath.has(node.id) ? 'is-path' : '') + (i > 0 && rows.get(path[i - 1].id) !== row ? ' is-fork' : '') });
      });
      const laneAttempts = attempts.filter(a => a.variantScope === laneScope(lane.id)).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
      const latest = laneAttempts[laneAttempts.length - 1];
      const current = laneParameters(project, lane.id);
      const stale = latest ? staleFields(latest.config.parameters, current).length : 0;
      const running = starting.has(lane.id) || laneAttempts.some(a => a.h3 && !a.h3.issue && !['succeeded', 'failed'].includes(a.h3.status));
      nodes.push({ id: 'render-' + lane.id, type: 'render', position: { x: COL.render, y: top + 34 }, selected: selection?.kind === 'render' && selection.laneId === lane.id,
        data: { laneId: lane.id, rounds: laneAttempts.length, running, issue: !!latest?.h3?.issue || latest?.h3?.status === 'failed', stale, onRun, disabled: false,
          faint: lane.id !== active && project.lanes.length > 1 } });
      edges.push({ id: `e-${path[4].id}-render-${lane.id}`, source: path[4].id, target: 'render-' + lane.id, className: lane.id === active ? 'is-path' : '' });
      let k = 0;
      for (const [round, a] of laneAttempts.entries()) for (const [j, c] of a.candidates.entries()) {
        const key = candidateKey(a.id, c.id);
        nodes.push({ id: 'cand-' + key, type: 'candidate', position: { x: COL.cand0 + k * COL.candStep, y: top + 34 },
          selected: selection?.kind === 'candidate' && selection.attemptId === a.id && selection.candidateId === c.id,
          data: { label: `第 ${round + 1} 轮` + (a.candidates.length > 1 ? ` · ${j + 1}` : ''), image: urls.get(key), attemptId: a.id, candidateId: c.id, firstShown: c.firstShown,
            retained: candidateRetained(a, c.id), comparing: comparing.includes(key), revision: !!a.parentImage, onCompare } });
        // 在某张候选上改出来的一轮，连线从那张候选出发，看得出是一步步改过来的。
        const parentAttempt = a.parentId ? laneAttempts.find(x => x.candidates.some(pc => pc.id === a.parentId)) : undefined;
        if (parentAttempt) edges.push({ id: `e-${a.parentId}-${key}`, source: 'cand-' + candidateKey(parentAttempt.id, a.parentId!), target: 'cand-' + key, className: 'is-revision' });
        else edges.push({ id: `e-render-${lane.id}-${key}`, source: 'render-' + lane.id, target: 'cand-' + key });
        k++;
      }
      for (const cmp of compares.filter(c => c.laneId === lane.id)) {
        nodes.push({ id: 'cmp-' + cmp.id, type: 'compare', position: { x: COL.cand0 + k * COL.candStep + 12, y: top + 34 }, selected: selection?.kind === 'compare' && selection.id === cmp.id,
          data: { title: `比较 ${cmp.candidates.length} 张`, chosen: cmp.chosen, reason: cmp.reason, diff: cmp.chosen ? '已选定一张' : '还没选定' } });
        for (const c of cmp.candidates) edges.push({ id: `e-${c.attemptId}-${c.candidateId}-cmp-${cmp.id}`, source: 'cand-' + candidateKey(c.attemptId, c.candidateId), target: 'cmp-' + cmp.id });
        k += 1.3;
      }
    });
    return { nodes, edges, labels };
  }, [project, attempts, urls, selection, comparing, suggestions, compares, lockedFrame, starting, onRun, onCompare]);

  // 节点每次重算都是新对象；把量到的尺寸带回去，画布才不会把它们当成没量过而暂时不画连线。
  const [dims, setDims] = useState<Record<string, { width: number; height: number }>>({});
  const onNodesChange = useCallback((changes: NodeChange[]) => {
    const next: Record<string, { width: number; height: number }> = {};
    for (const c of changes) if (c.type === 'dimensions' && c.dimensions) next[c.id] = c.dimensions;
    if (Object.keys(next).length) setDims(d => ({ ...d, ...next }));
  }, []);
  const sized = useMemo(() => nodes.map(n => dims[n.id] ? { ...n, measured: dims[n.id] } : n), [nodes, dims]);

  // 画布的默认视图要看得清：能整体放下就居中放下；放不下时保持不小于 0.8 的缩放，从链的起点（左边）开始看。
  const width = useStore(s => s.width), height = useStore(s => s.height);
  const frame = (ids: string[], minZoom: number, animate: boolean) => {
    if (!ids.length || !width || !height) return;
    // 用节点自己的位置和量到的尺寸（还没量到时按节点类型估计）算外框。
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const id of ids) {
      const n = nodes.find(m => m.id === id);
      if (!n) continue;
      const m = flow.getInternalNode(id)?.measured;
      const est = sizeEstimate[n.type as keyof typeof sizeEstimate] ?? { w: 160, h: 190 };
      x0 = Math.min(x0, n.position.x); y0 = Math.min(y0, n.position.y);
      x1 = Math.max(x1, n.position.x + (m?.width ?? est.w)); y1 = Math.max(y1, n.position.y + (m?.height ?? est.h));
    }
    if (!Number.isFinite(x0)) return;
    const b = { x: x0, y: y0, width: x1 - x0, height: y1 - y0 };
    const pad = 40, usableH = height - 78;
    const fit = Math.min((width - pad * 2) / b.width, (usableH - pad * 2) / b.height);
    const zoom = Math.max(minZoom, Math.min(1, fit));
    const x = b.width * zoom <= width - pad * 2 ? (width - b.width * zoom) / 2 - b.x * zoom : pad - b.x * zoom;
    const y = b.height * zoom <= usableH - pad * 2 ? (usableH - b.height * zoom) / 2 - b.y * zoom : pad - b.y * zoom;
    void flow.setViewport({ x, y, zoom }, animate ? { duration: 300 } : undefined);
  };
  // 正在编辑的那一行：这条方向自己画出的层、生成、候选和比较（共用的上游画在别的行里，用“适应全图”看）。
  const activeIds = () => {
    const y = nodes.find(m => m.id === 'render-' + project.activeLaneId)?.position.y;
    return y === undefined ? [] : nodes.filter(n => n.position.y === y).map(n => n.id);
  };
  // 新的候选回来时，如果落在画面外，把画面平移过去。
  const candidateCount = nodes.filter(n => n.type === 'candidate').length;
  const seenCandidates = useRef(candidateCount);
  useEffect(() => {
    if (candidateCount <= seenCandidates.current) { seenCandidates.current = candidateCount; return; }
    seenCandidates.current = candidateCount;
    const newest = nodes.filter(n => n.type === 'candidate').sort((a, b) => b.position.x - a.position.x)
      .find(n => n.position.y === nodes.find(m => m.id === 'render-' + project.activeLaneId)?.position.y);
    if (!newest) return;
    const { x, y, zoom } = flow.getViewport();
    const sx = newest.position.x * zoom + x, sy = newest.position.y * zoom + y;
    if (sx >= 0 && sx + 150 * zoom <= width && sy >= 0 && sy + 190 * zoom <= height - 70) return;
    void flow.setCenter(newest.position.x - 160, newest.position.y + 95, { zoom: Math.max(zoom, 0.72), duration: 300 });
    // 只在候选数目变化时移动画布
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [candidateCount]);
  const framed = useRef(false);
  useEffect(() => {
    if (framed.current || !width || !height) return;
    framed.current = true;
    requestAnimationFrame(() => frame(nodes.map(n => n.id), 0.72, false));
    // 只在第一次量好节点后定一次视图
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [width, height]);
  // 从面板跳到画布外的节点时，把它平移进来；缩放太小时放大到看得清。
  const selectedId = nodes.find(n => n.selected)?.id ?? props.focusKey;
  const lastSelected = useRef(selectedId);
  useEffect(() => {
    // 打开页面时恢复的选中不移动画布，先看全局。
    if (lastSelected.current === selectedId) return;
    lastSelected.current = selectedId;
    if (!selectedId || !framed.current) return;
    const node = flow.getInternalNode(selectedId);
    if (!node) return;
    const { x, y, zoom } = flow.getViewport();
    const w = node.measured.width ?? 160, h = node.measured.height ?? 200;
    const sx = node.internals.positionAbsolute.x * zoom + x, sy = node.internals.positionAbsolute.y * zoom + y;
    const inside = sx >= 0 && sy >= 0 && sx + w * zoom <= width && sy + h * zoom <= height - 70;
    if (inside && zoom >= 0.6) return;
    void flow.setCenter(node.internals.positionAbsolute.x + w / 2, node.internals.positionAbsolute.y + h / 2, { zoom: Math.max(zoom, 0.85), duration: 300 });
    // 只在选中的节点变化时移动画布
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  return <>
    <ReactFlow nodes={sized} edges={edges} nodeTypes={nodeTypes} onNodesChange={onNodesChange} nodesDraggable={false} nodesConnectable={false} elementsSelectable={false}
      minZoom={0.2} maxZoom={1.6} proOptions={{ hideAttribution: true }} panOnScroll zoomOnDoubleClick={false}
      onNodeClick={(_e, node) => {
        if (node.type === 'intent') onSelect({ kind: 'intent' });
        else if (node.type === 'layer') onSelect({ kind: 'layer', laneId: (node.data as { laneId: string }).laneId, layer: (node.data as { layer: Layer }).layer });
        else if (node.type === 'render') onSelect({ kind: 'render', laneId: (node.data as { laneId: string }).laneId });
        else if (node.type === 'candidate') onSelect({ kind: 'candidate', attemptId: (node.data as { attemptId: string }).attemptId, candidateId: (node.data as { candidateId: string }).candidateId });
        else if (node.type === 'compare') onSelect({ kind: 'compare', id: node.id.slice(4) });
        else if (node.type === 'collapsed') onExpand(node.id.slice('collapsed-'.length));
      }}
      onPaneClick={() => onSelect(null)}>
      <LaneLabels labels={labels} />
    </ReactFlow>
    <div className="c4-tools" role="toolbar" aria-label="画布">
      <button type="button" title="适应全图" aria-label="适应全图" onClick={() => flow.fitView({ padding: 0.16, maxZoom: 1, duration: 300 })}><Maximize2 size={15} /></button>
      <button type="button" title="看清正在编辑的方向" aria-label="看清正在编辑的方向" data-testid="frame-active" onClick={() => frame(activeIds(), 0.85, true)}><Crosshair size={15} /></button>
    </div>
  </>;
}

/** 方向名写在每一行左上，随画布平移和缩放。 */
function LaneLabels({ labels }: { labels: { x: number; y: number; text: string }[] }) {
  const vp = useViewport();
  return <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
    {labels.map((l, i) => <div key={i} className="c4-lane-label" style={{ left: l.x * vp.zoom + vp.x, top: l.y * vp.zoom + vp.y, transform: `scale(${vp.zoom})`, transformOrigin: 'left top' }}>{l.text}</div>)}
  </div>;
}

export default function Board4(props: BoardProps) {
  return <div className="c4" data-testid="v4-canvas"><ReactFlowProvider><Inner {...props} /></ReactFlowProvider></div>;
}
