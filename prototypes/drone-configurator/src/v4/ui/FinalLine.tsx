// 这一场的终稿：只有一个当前值。后定的替换先定的；把当前终稿点了“不要”或撤下，就写明还没有定稿；
// 设计者也可以登记“没有可接受的候选”（预试记录约定：设计者可提前结束或登记尚无可接受候选）。全部经过都留在事件里。
import { Flag } from 'lucide-react';
import type { FrozenAttempt } from '../../design/candidateRecords';
import { useStudio } from '../store';
import { useCurrentFinal } from '../useFinal';

export default function FinalLine({ attempts, label }: { attempts: FrozenAttempt[]; label: (a: FrozenAttempt) => string }) {
  const { sessions, currentSessionId } = useStudio();
  const st = useStudio.getState();
  const final = useCurrentFinal();
  if (!sessions.some(s => s.id === currentSessionId && !s.endedAt)) return null;
  const chosen = final?.kind === 'final' ? attempts.find(a => a.id === final.attemptId) : undefined;
  const text = final?.kind === 'final' ? `终稿：${chosen ? label(chosen) : '一张候选'}` : final?.kind === 'none-acceptable' ? '已登记：没有可接受的候选' : '还没有定稿';
  return <div className="row4" style={{ gap: 6, fontSize: 12.5 }}>
    <span className="row4" style={{ gap: 4 }} data-testid="final-current" data-final={final?.kind ?? 'none'}><Flag size={12} />{text}</span>
    {final && <button type="button" className="b4 sm quiet" data-testid="final-withdraw" onClick={() => st.withdrawFinal(final.kind === 'final' ? '撤下终稿' : '撤下“没有可接受的候选”')}>撤下</button>}
    {final?.kind !== 'none-acceptable' && <button type="button" className="b4 sm quiet" data-testid="final-none" title="结束时没有一张可以接受的候选，照实登记" onClick={() => st.markNoneAcceptable('登记：没有可接受的候选')}>没有可接受的候选</button>}
  </div>;
}
