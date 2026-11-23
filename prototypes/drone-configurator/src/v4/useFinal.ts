// 这一场当前的终稿（按事件推出，见 sessions.ts 的 currentFinal）。
import { useStudio } from './store';
import { currentFinal } from './sessions';

export function useCurrentFinal() {
  const { events, sessions, currentSessionId } = useStudio();
  const current = sessions.find(s => s.id === currentSessionId && !s.endedAt);
  return current ? currentFinal(events.filter(e => e.sessionId === current.id)).current : null;
}
