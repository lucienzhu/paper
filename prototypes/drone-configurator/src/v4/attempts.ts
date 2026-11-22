// 读本机的生成轮次（含候选图原件），并给图片发临时地址。
// 4.0 的轮次以 variantScope 归属：v4/项目/方向 与 v4free/项目。新建项目或换人换场以后，上一个项目的图不再出现，也不能再当父图。
import { useEffect, useRef, useState } from 'react';
import { listAttempts, type FrozenAttempt } from '../design/candidateRecords';
import type { Project } from './model';
import { useStudio } from './store';

const current = () => useStudio.getState().project;
export const laneScope = (laneId: string, projectId = current().id) => `v4/${projectId}/${laneId}`;
export const freeScope = (projectId = current().id) => `v4free/${projectId}`;
export const candidateKey = (attemptId: string, candidateId: string) => attemptId + '|' + candidateId;

/** 4.0.0 的轮次没有写项目编号（v4/方向、v4free）：只算进在它之前建的那个项目。 */
const legacyOf = (a: FrozenAttempt, project: Project) => a.createdAt >= project.createdAt;
export function inLane(a: FrozenAttempt, laneId: string, project: Project = current()) {
  return a.variantScope === laneScope(laneId, project.id) || (a.variantScope === 'v4/' + laneId && legacyOf(a, project));
}
export function isFreeRound(a: FrozenAttempt, project: Project = current()) {
  return a.variantScope === freeScope(project.id) || (a.variantScope === 'v4free' && legacyOf(a, project));
}
export function inProject(a: FrozenAttempt, project: Project = current()) {
  const scope = a.variantScope ?? '';
  return scope.startsWith(`v4/${project.id}/`) || scope === freeScope(project.id)
    || ((/^v4\/lane-/.test(scope) || scope === 'v4free') && legacyOf(a, project));
}

export function useAttempts() {
  const project = useStudio(s => s.project);
  const projectId = project.id;
  const [all, setAll] = useState<FrozenAttempt[]>([]);
  const [urls, setUrls] = useState<Map<string, string>>(() => new Map());
  const cache = useRef(new Map<string, string>());
  useEffect(() => {
    let alive = true;
    const load = () => listAttempts().then(rows => { if (alive) setAll(rows.filter(r => r.variantScope?.startsWith('v4'))); }).catch(() => {});
    load();
    window.addEventListener('candidate-record-change', load);
    window.addEventListener('generation-worker-finished', load);
    const timer = setInterval(load, 4000);
    return () => { alive = false; clearInterval(timer); window.removeEventListener('candidate-record-change', load); window.removeEventListener('generation-worker-finished', load); };
  }, []);
  // 只取当前项目的轮次；项目换了（新建项目）就换一批。
  const [attempts, setAttempts] = useState<FrozenAttempt[]>([]);
  useEffect(() => {
    const p = useStudio.getState().project;
    setAttempts(all.filter(a => inProject(a, p)));
  }, [all, projectId, project.createdAt]);
  useEffect(() => {
    const cached = cache.current;
    const wanted = new Map<string, Blob>();
    for (const a of attempts) {
      for (const c of a.candidates) wanted.set(candidateKey(a.id, c.id), c.file);
      if (a.condition === 'structured') wanted.set('guide|' + a.id, a.guide);
    }
    let changed = false;
    for (const [key, url] of cached) if (!wanted.has(key)) { URL.revokeObjectURL(url); cached.delete(key); changed = true; }
    for (const [key, file] of wanted) if (!cached.has(key)) { cached.set(key, URL.createObjectURL(file)); changed = true; }
    if (changed) setUrls(new Map(cached));
  }, [attempts]);
  useEffect(() => { const cached = cache.current; return () => { for (const url of cached.values()) URL.revokeObjectURL(url); cached.clear(); }; }, []);
  return { attempts, urls };
}
