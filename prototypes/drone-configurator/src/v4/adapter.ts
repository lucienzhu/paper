// 让原有的控件、可拖动的顶视图和导出页在 4.0 里直接可用：它们都通过 useDroneStore() 读写当前规格，
// 这里给每条方向做一个同样形状的小仓库，读取时给出这条方向的完整规格，写入时交给管这一项的那一层。
import { create, type StoreApi, type UseBoundStore } from 'zustand';
import type { DesignIntent, DroneParameters } from '../types/DroneParameters';
import { lanePath, laneIntent, laneParameters, laneTouched } from './model';
import { useStudio } from './store';

export interface LaneView {
  task: 'quad';
  parameters: DroneParameters;
  touched: Record<string, boolean>;
  intent: DesignIntent;
  designChatAudit: never[];
  pinned: null;
  lastChange: null;
  history: never[];
  exportNote: string;
  notice: string | null;
  variants: { id: string; name: string; snapshot: { parameters: DroneParameters; touched: Record<string, boolean>; intent: DesignIntent } }[];
  activeVariant: string;
  workflowOrigin: { id: string; task: 'quad' };
  setField: (path: string, value: unknown) => void;
  setMany: (entries: [string, unknown][], label: string) => void;
  clearField: (path: string) => void;
  setExportNote: (note: string) => void;
  setNotice: (notice: string | null) => void;
  importSnapshot: () => void;
  undo: () => void;
  setGhost: () => void;
  pin: () => void;
}

function derive(laneId: string) {
  const { project } = useStudio.getState();
  if (!project.lanes.some(l => l.id === laneId)) return null;
  const parameters = laneParameters(project, laneId), touched = laneTouched(project, laneId), intent = laneIntent(project);
  return {
    parameters, touched, intent,
    variants: project.lanes.map(l => ({ id: l.id, name: l.name, snapshot: { parameters: laneParameters(project, l.id), touched: laneTouched(project, l.id), intent } })),
    activeVariant: laneId,
    workflowOrigin: { id: lanePath(project, laneId)[4].id, task: 'quad' as const },
  };
}

const cache = new Map<string, UseBoundStore<StoreApi<LaneView>>>();

/** 这条方向的仓库；同一条方向始终是同一个，便于放进 Provider。 */
export function laneStore(laneId: string) {
  let store = cache.get(laneId);
  if (store) return store;
  const first = derive(laneId);
  if (!first) throw new Error('找不到这条方向。');
  store = create<LaneView>(set => ({
    task: 'quad', designChatAudit: [], pinned: null, lastChange: null, history: [], exportNote: '', notice: null,
    ...first,
    setField: (path, value) => useStudio.getState().setField(laneId, path, value),
    setMany: (entries, label) => useStudio.getState().setMany(laneId, entries, label),
    clearField: path => useStudio.getState().clearField(laneId, path),
    setExportNote: exportNote => set({ exportNote }),
    setNotice: notice => set({ notice }),
    importSnapshot: () => useStudio.getState().setNotice('4.0 里请从“研究记录”读回旧规格。'),
    undo: () => useStudio.getState().undo(),
    setGhost: () => {},
    pin: () => {},
  }));
  const bound = store;
  let last = useStudio.getState().project;
  useStudio.subscribe(s => {
    if (s.project === last) return;
    last = s.project;
    const next = derive(laneId);
    if (next) bound.setState(next);
  });
  cache.set(laneId, bound);
  return bound;
}
