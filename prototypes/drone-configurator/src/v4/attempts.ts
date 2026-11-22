// 读本机的生成轮次（含候选图原件），并给图片发临时地址。4.0 的轮次以 variantScope 区分：v4/方向 与 v4free。
import { useEffect, useRef, useState } from 'react';
import { listAttempts, type FrozenAttempt } from '../design/candidateRecords';

export const laneScope = (laneId: string) => 'v4/' + laneId;
export const FREE_SCOPE = 'v4free';
export const candidateKey = (attemptId: string, candidateId: string) => attemptId + '|' + candidateId;

export function useAttempts() {
  const [attempts, setAttempts] = useState<FrozenAttempt[]>([]);
  const [urls, setUrls] = useState<Map<string, string>>(() => new Map());
  const cache = useRef(new Map<string, string>());
  useEffect(() => {
    let alive = true;
    const load = () => listAttempts().then(rows => { if (alive) setAttempts(rows.filter(r => r.variantScope?.startsWith('v4'))); }).catch(() => {});
    load();
    window.addEventListener('candidate-record-change', load);
    window.addEventListener('generation-worker-finished', load);
    const timer = setInterval(load, 4000);
    return () => { alive = false; clearInterval(timer); window.removeEventListener('candidate-record-change', load); window.removeEventListener('generation-worker-finished', load); };
  }, []);
  useEffect(() => {
    const current = cache.current;
    const wanted = new Map<string, Blob>();
    for (const a of attempts) {
      for (const c of a.candidates) wanted.set(candidateKey(a.id, c.id), c.file);
      if (a.condition === 'structured') wanted.set('guide|' + a.id, a.guide);
    }
    let changed = false;
    for (const [key, url] of current) if (!wanted.has(key)) { URL.revokeObjectURL(url); current.delete(key); changed = true; }
    for (const [key, file] of wanted) if (!current.has(key)) { current.set(key, URL.createObjectURL(file)); changed = true; }
    if (changed) setUrls(new Map(current));
  }, [attempts]);
  useEffect(() => { const current = cache.current; return () => { for (const url of current.values()) URL.revokeObjectURL(url); current.clear(); }; }, []);
  return { attempts, urls };
}
