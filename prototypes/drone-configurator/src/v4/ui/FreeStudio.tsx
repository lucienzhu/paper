// “AI 对话 + 自由提示”那一场：和同一个文字模型对话、写提示词、出图、取舍。没有用户依据匹配、参数和条件图。
// 出图后端、生成设置、候选管理和记录与工作台那一场相同。
// 4.3：这个组件按场次的分界重新挂载（Studio4 里的 key），上一场没发出的对话、提示词和选中的父图不会带进下一场；
// 对话的回答记回发出它的那一场；每一轮可以“取回”；终稿只有一个当前值。
import { useState } from 'react';
import { Send, LoaderCircle, Sparkles, Check, ArrowLeftRight, X, CornerUpLeft, Flag } from 'lucide-react';
import type { FrozenAttempt } from '../../design/candidateRecords';
import { candidateRetained, recordDecision } from '../../design/candidateRecords';
import { askAi } from '../aiSession';
import { useImageBackend } from '../../design/imageBackend';
import { generationStatus } from '../../design/generation';
import WorkflowImage from '../../design/workflow/WorkflowImage';
import { newId } from '../model';
import { useStudio } from '../store';
import { ai } from '../ai';
import { candidateKey } from '../attempts';
import { briefOf, roundsOfSession } from '../sessions';
import { runFree } from '../run';
import { PanelCompare, RoundRecovery } from './PanelRound';
import { BriefCard } from './PanelIntent';
import FinalLine from './FinalLine';
import { useCurrentFinal } from '../useFinal';
import { relTime } from './util';
import SessionSetup from './SessionSetup';

export default function FreeStudio({ attempts, urls }: { attempts: FrozenAttempt[]; urls: Map<string, string> }) {
  const { turns, comparing, selection, sessions, currentSessionId } = useStudio();
  const st = useStudio.getState();
  const backend = useImageBackend();
  // 只看这一场：同一个项目里早先的自由提示场次另有自己的记录和 ZIP。编号也按这一场数，和导出的文件名一致。
  const current = sessions.find(s => s.id === currentSessionId && !s.endedAt);
  const rounds = current ? roundsOfSession(current, attempts).rounds : [];
  const talk = current ? turns.filter(t => t.scope.kind === 'free' && t.sessionId === current.id) : [];
  const [message, setMessage] = useState('');
  const [prompt, setPrompt] = useState('');
  const [parent, setParent] = useState('');
  const [busy, setBusy] = useState<'' | 'chat' | 'run'>('');
  const [error, setError] = useState('');
  // 最近一次“用这段作提示词”的来源，用来记下发出的文字是不是 AI 起草的、改没改过。
  const [draftSource, setDraftSource] = useState<{ turnId: string; text: string } | null>(null);
  // 和工作台那一场一样：每次取舍可以写一句为什么；也可以把一张定为终稿（替换之前的终稿）。
  const [reason, setReason] = useState('');
  const final = useCurrentFinal();
  async function decide(attemptId: string, candidateId: string, kind: 'accept' | 'reject' | 'final', round: number) {
    const why = reason.trim();
    const text = kind === 'final' ? '定为终稿' + (why ? '：' + why : '。') : kind === 'accept' ? (why || '设计者保留这张候选（没写理由）。') : (why || '设计者不要这张候选（没写理由）。');
    try {
      await recordDecision(attemptId, kind === 'final' ? 'accept' : kind, text, candidateId);
      if (kind === 'final') st.setFinal(attemptId, candidateId, `定为终稿：自由提示第 ${round} 轮` + (why ? '，' + why : ''));
      if (kind === 'reject' && final?.kind === 'final' && final.attemptId === attemptId && final.candidateId === candidateId)
        st.withdrawFinal(`撤下终稿：自由提示第 ${round} 轮点了“不要”` + (why ? '，' + why : ''));
      setReason('');
    } catch (e) { setError(e instanceof Error ? e.message : String(e)); }
  }
  async function chat() {
    const text = message.trim();
    if (!text) return;
    setBusy('chat'); setError('');
    const sessionId = st.ensureSession();
    const user = { id: newId('turn'), at: new Date().toISOString(), role: 'user' as const, text, scope: { kind: 'free' as const } };
    st.addTurn(user, sessionId);
    setMessage('');
    try {
      const history = [...talk, user].slice(-16).map(t => ({ role: t.role, content: t.text }));
      // 回答记回发出时的那一场：等回答的时候主持人换了场，回答不会出现在下一场里。
      const { result: r, sessionId: from } = await askAi('free', sid => ai.free({ messages: history }, sid));
      st.addTurn({ id: newId('turn'), at: new Date().toISOString(), role: 'assistant', text: r.reply, scope: { kind: 'free' }, callId: r.call.id, mode: r.call.mode, draft: r.prompt ?? undefined }, from);
    } catch (e) { setError(e instanceof Error ? e.message : String(e)); }
    finally { setBusy(''); }
  }
  async function run() {
    if (!prompt.trim()) { setError('先写下要发给出图模型的文字。'); return; }
    setBusy('run'); setError('');
    try {
      const sent = prompt.trim();
      const source = !draftSource ? 'typed' : sent === draftSource.text.trim() ? 'draft' : 'draft-edited';
      await runFree(sent, parent || undefined, { source, draftTurnId: draftSource?.turnId });
      st.setNotice('已提交。回图会出现在左边。');
    }
    catch (e) { setError(e instanceof Error ? e.message : String(e)); }
    finally { setBusy(''); }
  }
  const compareSel = selection?.kind === 'compare' ? selection.id : null;
  return <div className={'m4' + (compareSel ? ' is-wide' : '')} data-testid="free-studio">
    <div className="c4" style={{ overflow: 'auto', padding: 20 }}>
      <div style={{ display: 'grid', gap: 12, maxWidth: 980 }}>
        <div className="row4" style={{ justifyContent: 'space-between' }}>
          <div><b style={{ fontSize: 15 }}>AI 对话 + 自由提示</b><p className="r4-muted">同一个出图后端和设置。每一轮发出去的就是你确认的那段文字。</p></div>
          {comparing.length >= 2 && <button type="button" className="b4 ai" data-testid="free-compare" onClick={() => {
            const id = newId('cmp');
            st.recordCompare({ id, at: new Date().toISOString(), candidates: comparing.map(k => { const [a, c] = k.split('|'); return { attemptId: a, candidateId: c }; }) });
            st.clearCompare(); st.select({ kind: 'compare', id });
          }}><ArrowLeftRight size={14} />比较已选的 {comparing.length} 张</button>}
        </div>
        <BriefCard onUse={() => { const b = briefOf(current); if (b) setMessage(b.text); }} label="把委托原文放进对话框" />
        {rounds.length > 0 && <FinalLine attempts={rounds} label={a => `自由提示第 ${rounds.indexOf(a) + 1} 轮`} />}
        {rounds.length > 0 && <input className="in4" data-testid="free-decision-reason" value={reason} maxLength={200} placeholder="为什么保留、不要或定稿（选填，写进下一次取舍的记录）" onChange={e => setReason(e.target.value)} />}
        {!rounds.length && <div className="el4"><div className="el4-main"><b>还没有生成</b><span>在右边和 AI 聊想法，写好提示词后生成。</span></div></div>}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
          {rounds.flatMap((a, i) => a.candidates.length ? a.candidates.map(c => { const key = candidateKey(a.id, c.id); const kept = candidateRetained(a, c.id);
            return <div key={key} className="n4" style={{ cursor: 'default' }} data-free-candidate={c.id}>
              <div className="n4-h">第 {i + 1} 轮<span className="grow" />{final?.kind === 'final' && final.attemptId === a.id && final.candidateId === c.id && <span className="p4 ok">终稿</span>}{kept && <span className="p4 ok">保留</span>}{a.parentImage && <span className="p4 gray">有父图</span>}</div>
              <WorkflowImage className="cand" node={{ id: c.id, image: urls.get(key), firstShown: c.firstShown, candidateId: c.id, attemptId: a.id }} alt={'第 ' + (i + 1) + ' 轮'} />
              <div className="n4-s n4-clamp">{a.confirmedText}</div>
              <div className="row4">
                <button type="button" className="b4 sm" disabled={kept || !c.firstShown} onClick={() => void decide(a.id, c.id, 'accept', i + 1)}><Check size={12} />保留</button>
                <button type="button" className="b4 sm quiet" title="不要" aria-label="不要" disabled={!c.firstShown} onClick={() => void decide(a.id, c.id, 'reject', i + 1)}><X size={12} /></button>
                <button type="button" className="b4 sm quiet" title="定为终稿" aria-label="定为终稿" data-testid="free-final" disabled={!c.firstShown} onClick={() => void decide(a.id, c.id, 'final', i + 1)}><Flag size={12} /></button>
                <button type="button" className="b4 sm" aria-pressed={comparing.includes(key)} onClick={() => st.toggleCompare(key)}><ArrowLeftRight size={12} />{comparing.includes(key) ? '已选' : '比较'}</button>
                <button type="button" className="b4 sm quiet" title="以此为父图" onClick={() => setParent(c.id)}><CornerUpLeft size={12} /></button>
              </div>
            </div>; }) : [<div key={a.id} className="n4" style={{ cursor: 'default' }} data-free-round={a.id}><div className="n4-h">第 {i + 1} 轮</div><div className="n4-t">{generationStatus(a).title}</div>
              <div className="n4-s">{generationStatus(a).detail}</div><div className="n4-s n4-clamp">{a.confirmedText}</div><RoundRecovery a={a} /></div>])}
        </div>
      </div>
    </div>
    <aside className="r4"><div className="r4-scroll">
      {compareSel ? <><button type="button" className="b4 sm quiet" onClick={() => st.select(null)}>← 回到对话</button><PanelCompare id={compareSel} attempts={attempts} urls={urls} /></> : <>
        <div className="r4-head"><span className="r4-kicker">设计助手</span><h2 className="r4-title">聊想法，写提示词</h2>
          <p className="r4-purpose">这个助手和工作台那一场用同一个文字模型，但它没有用户依据、参数表和条件图。</p></div>
        <section className="r4-sec" aria-label="对话">
          {talk.map(t => <div key={t.id} className={'turn4 ' + t.role}><div className="bubble">{t.text}</div>
            {t.role === 'assistant' && <span className="meta">{t.mode === 'fixture' ? '规则回退（未连模型）' : 'AI'} · {relTime(t.at)}</span>}
            {t.draft && <div className="ev4" style={{ background: 'var(--surface)' }}><span style={{ whiteSpace: 'pre-wrap' }}>{t.draft}</span>
              <button type="button" className="b4 sm" data-testid="use-draft" onClick={() => { setPrompt(t.draft!); setDraftSource({ turnId: t.id, text: t.draft! }); }}>用这段作提示词</button></div>}</div>)}
          <form className="row4" style={{ flexWrap: 'nowrap' }} onSubmit={e => { e.preventDefault(); void chat(); }}>
            <input className="in4" data-testid="free-chat" value={message} placeholder="说说你的想法" onChange={e => setMessage(e.target.value)} disabled={busy === 'chat'} />
            <button type="submit" className="b4" disabled={busy === 'chat' || !message.trim()}>{busy === 'chat' ? <LoaderCircle size={14} className="animate-spin" /> : <Send size={14} />}</button>
          </form>
        </section>
        <section className="r4-sec" aria-label="提示词">
          <h3>发给出图模型的文字</h3>
          <textarea className="ta4" data-testid="free-prompt" value={prompt} placeholder="写下或改好要发出的文字" onChange={e => setPrompt(e.target.value)} />
          {parent && <p className="r4-muted">父图：已选一张候选 <button type="button" className="b4 sm quiet" onClick={() => setParent('')}>不用父图</button></p>}
          <button type="button" className="b4 pri" data-testid="free-run" disabled={busy === 'run' || !prompt.trim()} onClick={() => void run()}>{busy === 'run' ? <LoaderCircle size={14} className="animate-spin" /> : <Sparkles size={14} />}生成</button>
          <p className="r4-muted">{backend.label}{backend.provider === 'minimax' ? ' · 开发用，不计入论文数据（且不接受不带图的提示）' : ''}</p>
          {error && <p className="r4-note" role="alert">{error}</p>}
        </section>
        <SessionSetup />
      </>}
    </div></aside>
  </div>;
}
