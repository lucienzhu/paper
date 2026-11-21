// 画布下方的一条语言输入，跟着选中的节点走：对意图说就是写意图；对某一层说，AI 给出这一层的建议（出现在右侧面板）。
// 候选、生成、比较各有自己的输入，那时这里收起，避免两处都能说。
import { useState } from 'react';
import { Send, LoaderCircle } from 'lucide-react';
import { laneIntent, laneParameters, layerInfo, newId } from '../model';
import { useStudio, type Selection, type Suggestion } from '../store';
import { ai } from '../ai';

export default function CommandBar({ selection, onSelect }: { selection: Selection; onSelect: (s: Selection) => void }) {
  const { project, session, turns } = useStudio();
  const st = useStudio.getState();
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<{ text: string; error?: boolean } | null>(null);
  if (selection && selection.kind !== 'layer' && selection.kind !== 'intent') return null;
  const layer = selection?.kind === 'layer' ? selection : null;
  const lane = layer ? project.lanes.find(l => l.id === layer.laneId) : null;
  // 意图已经写过时，这里说的话是补充，不会盖掉原来的意图和已经确认的条目；整段改写在右侧面板里做。
  const appendIntent = !layer && !!project.intent.text.trim();
  const scope = layer ? `${layerInfo[layer.layer].name} · ${lane?.name ?? ''}` : appendIntent ? '意图 · 补充' : '意图';
  const lockedHere = !!layer && layer.layer === 'frame' && !!session.lockedFrame;
  const placeholder = lockedHere ? '机架是这一场登记的条件，已锁定；可以点别的层说' : layer ? `对${layerInfo[layer.layer].name}说，例如：再紧凑一点` : appendIntent ? '补充一句意图；要改某一层，先在画布上点那一层' : '写下这次想做什么，回车让 AI 读一读';

  async function send() {
    const message = text.trim();
    if (!message || busy) return;
    setBusy(true); setStatus({ text: 'AI 在想……' });
    const at = () => new Date().toISOString();
    try {
      if (!layer) {
        const full = appendIntent ? project.intent.text.trim() + '\n' + message : message;
        st.setIntentText(full);
        const r = await ai.intent(full, project.intent.taskId);
        st.applyReading({ ...r, callId: r.call.id, mode: r.call.mode });
        st.addTurn({ id: newId('turn'), at: at(), role: 'user', text: message, scope: { kind: 'intent' } });
        onSelect({ kind: 'intent' });
        setStatus({ text: appendIntent ? '已补充进意图并重读，之前确认的条目保留。' : `读出 ${r.targets.length} 个目标，请在右侧逐条确认。` });
      } else {
        const history = turns.filter(t => t.scope.kind === 'layer' && t.scope.laneId === layer.laneId && t.scope.layer === layer.layer).slice(-6).map(t => ({ role: t.role, content: t.text }));
        const intent = laneIntent(useStudio.getState().project);
        const r = await ai.layer({ layer: layer.layer, message, lane: { parameters: laneParameters(useStudio.getState().project, layer.laneId) },
          intent: { targets: Object.entries(intent.targets).map(([pair, pole]) => ({ pair, pole })), note: intent.note },
          locked: session.lockedFrame ? ['frame'] : [], history });
        const list: Suggestion[] = r.suggestions.map(s => ({ id: newId('sg'), callId: r.call.id, mode: r.call.mode, at: at(), laneId: layer.laneId, layer: layer.layer,
          title: s.title, why: s.why, changes: s.changes, evidence: s.evidence, tier: s.tier, cards: s.cards, status: 'pending' }));
        st.addSuggestions(list);
        st.addTurn({ id: newId('turn'), at: at(), role: 'user', text: message, scope: { kind: 'layer', laneId: layer.laneId, layer: layer.layer } });
        st.addTurn({ id: newId('turn'), at: at(), role: 'assistant', text: r.reply, scope: { kind: 'layer', laneId: layer.laneId, layer: layer.layer },
          callId: r.call.id, mode: r.call.mode, suggestionIds: list.map(s => s.id), otherLayer: r.otherLayer ?? undefined });
        setStatus({ text: list.length ? `AI 给了 ${list.length} 条建议，在右侧。` : 'AI 回答了，没有改动建议。看右侧的对话。' });
      }
      setText('');
    } catch (e) { setStatus({ text: e instanceof Error ? e.message : String(e), error: true }); }
    finally { setBusy(false); setTimeout(() => setStatus(s => s?.error ? s : null), 4000); }
  }

  return <>
    {status && <div className={'k4-status' + (status.error ? ' is-error' : '')} role="status">{status.text}</div>}
    <form className="k4" data-testid="command-bar" onSubmit={e => { e.preventDefault(); void send(); }}>
      <span className="k4-scope" title={scope}>{scope}</span>
      <input id="v4-command" aria-label="对选中的步骤说" value={text} placeholder={placeholder} onChange={e => setText(e.target.value)} disabled={busy || lockedHere} />
      <button type="submit" className="k4-send" disabled={busy || lockedHere || !text.trim()}>{busy ? <LoaderCircle size={14} className="animate-spin" /> : <Send size={14} />}发送</button>
    </form>
  </>;
}
