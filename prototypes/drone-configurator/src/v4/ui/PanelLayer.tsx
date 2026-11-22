// 一层的面板：这一层决定什么；可拖动的顶视图；AI 的建议；这一层自己的控件；核对；从候选送回来的问题；这一层的记录。
import { useEffect, useMemo, useState } from 'react';
import { GitBranch, Lock, Copy, CheckCircle2, AlertTriangle, Info, RotateCcw } from 'lucide-react';
import { DroneStoreContext, taskStores } from '../../store/droneStore';
import { TopStage } from '../../components/Studio/Stage';
import { Choice, Field, OpenChoice, Slider } from '../../components/controls/controls';
import { computeLayout, frameRules, usesConsumerReferences, type FrameType } from '../../design/design';
import { designStart, realQuadrotors, study } from '../../design/defaults';
import {
  armMaterialOptions, armRootOptions, cameraMountOptions, colourSwatches, finishOptions, fuselageStyleOptions, gearOptions, topCoverOptions,
} from '../../design/fields';
import type { ParameterGroup } from '../../types/DroneParameters';
import { isDefault, laneNode, laneParameters, layerInfo, layers, sharedBy, type Layer } from '../model';
import { laneStore } from '../adapter';
import { useStudio } from '../store';
import { SuggestionCard } from './Evidence';
import { layerChecks, relTime } from './util';

const stagePart: Record<Layer, ParameterGroup> = { frame: 'frame', propulsion: 'propulsion', body: 'fuselage', details: 'accessories', cmf: 'accessories' };
const quadTypes: FrameType[] = ['Wide X', 'True X', 'Stretch X', 'H-Frame', 'Deadcat', '+ Configuration'];

function FrameControls({ laneId }: { laneId: string }) {
  const project = useStudio(s => s.project);
  const p = laneParameters(project, laneId);
  const rule = frameRules[p.frame.frame_type];
  const [more, setMore] = useState(!quadTypes.includes(p.frame.frame_type));
  const consumer = usesConsumerReferences(p.frame.frame_type, project.intent.taskId);
  const types = more ? (Object.keys(frameRules) as FrameType[]) : quadTypes;
  return <>
    <Field path="frame.frame_type" value={rule.zh} hint={rule.desc}>
      <Choice<FrameType> options={types.map(t => ({ value: t, zh: frameRules[t].zh }))} value={p.frame.frame_type}
        onChange={v => useStudio.getState().setMany(laneId, [['frame.frame_type', v], ['frame.span_ratio_wl', frameRules[v].wl.value]], '换构型')} label="构型" />
      <button type="button" className="b4 quiet sm" onClick={() => setMore(m => !m)}>{more ? '只看四旋' : '其他构型（三旋、六旋、八旋、共轴）'}</button>
    </Field>
    {rule.wl.adjustable ? <Field path="frame.span_ratio_wl" value={p.frame.span_ratio_wl.toFixed(2)} hint="电机左右跨度 ÷ 前后跨度。越大越宽扁。">
      <Slider path="frame.span_ratio_wl" min={rule.wl.min} max={rule.wl.max} step={0.01} unit="" digits={2}
        presets={consumer ? [...study.wlLevels.filter(v => v >= rule.wl.min && v <= rule.wl.max).map(v => ({ v, label: v.toFixed(2) + ' 实验档' })),
          ...(designStart.span_ratio_wl >= rule.wl.min && designStart.span_ratio_wl <= rule.wl.max ? [{ v: designStart.span_ratio_wl, label: designStart.span_ratio_wl.toFixed(2) + ' 真实产品中位' }] : [])] : []} />
    </Field> : <p className="r4-muted">{rule.zh}的横纵跨度比由构型决定：{computeLayout(p).W_over_L.toFixed(2)}。</p>}
    <Field path="frame.wheelbase_mm" value={`${p.frame.wheelbase_mm} mm`} hint="对角电机中心距的平均值，决定整机大小。">
      <Slider path="frame.wheelbase_mm" min={100} max={Math.max(consumer ? 500 : 2000, p.frame.wheelbase_mm)} step={1} unit="mm" presets={consumer ? [{ v: 250, label: '250 实验设定' }] : []} />
    </Field>
    <Field path="frame.arm_width_mm" value={p.frame.arm_width_mm.replace('mm', ' mm')} hint="从上面看到的机臂粗细。">
      <Choice options={[{ value: '10mm', zh: '10 mm' }, { value: '15mm', zh: '15 mm' }, { value: '20mm', zh: '20 mm' }]} value={p.frame.arm_width_mm}
        onChange={v => useStudio.getState().setField(laneId, 'frame.arm_width_mm', v)} label="机臂宽度" />
    </Field>
    <Field path="frame.arm_thickness_mm" value={p.frame.arm_thickness_mm.replace('mm', ' mm')} hint="从上面看不到，影响侧面的观感。">
      <Choice options={['3mm', '4mm', '5mm', '6mm'].map(v => ({ value: v, zh: v.replace('mm', ' mm') }))} value={p.frame.arm_thickness_mm}
        onChange={v => useStudio.getState().setField(laneId, 'frame.arm_thickness_mm', v)} label="机臂厚度" />
    </Field>
  </>;
}

function PropulsionControls({ laneId }: { laneId: string }) {
  const project = useStudio(s => s.project);
  const p = laneParameters(project, laneId);
  const consumer = usesConsumerReferences(p.frame.frame_type, project.intent.taskId);
  return <>
    <Field path="propulsion.prop_diameter_inch" value={`${p.propulsion.prop_diameter_inch} 英寸`} hint="桨盘是顶视里最大的形状，桨径一变，整机的分量感就变。">
      <Slider path="propulsion.prop_diameter_inch" min={3} max={Math.max(consumer ? 10 : 30, p.propulsion.prop_diameter_inch)} step={0.1} unit="″" digits={1} />
    </Field>
    <Field path="propulsion.prop_blade_count" value={parseInt(p.propulsion.prop_blade_count, 10) + ' 叶'}>
      <Choice options={(['2叶', '3叶', '4叶'] as const).map(v => ({ value: v, zh: parseInt(v, 10) + ' 叶' }))} value={p.propulsion.prop_blade_count}
        onChange={v => useStudio.getState().setField(laneId, 'propulsion.prop_blade_count', v)} label="每轴桨叶数" />
    </Field>
    <Field path="propulsion.prop_guard" value={p.propulsion.prop_guard === 'ring' ? '环形护圈' : '不加护圈'} hint="护圈让整机的外廓更饱满，也会改变“小”和“安全”的观感。">
      <Choice options={[{ value: 'none', zh: '不加护圈' }, { value: 'ring', zh: '环形护圈' }]} value={p.propulsion.prop_guard}
        onChange={v => useStudio.getState().setField(laneId, 'propulsion.prop_guard', v)} label="桨叶护圈" />
    </Field>
    <Field path="propulsion.motor_tilt_degree" value={p.propulsion.motor_tilt_degree + '°'} hint="电机前倾，顶视里看不出，只进文字。">
      <Slider path="propulsion.motor_tilt_degree" min={0} max={20} step={1} unit="°" />
    </Field>
  </>;
}

function BodyControls({ laneId }: { laneId: string }) {
  const p = laneParameters(useStudio(s => s.project), laneId);
  const size = p.fuselage.fuselage_dimensions_mm;
  return <>
    <Field path="fuselage.fuselage_dimensions_mm.length" value={`${size.length} mm`}><Slider path="fuselage.fuselage_dimensions_mm.length" min={50} max={300} step={5} unit="mm" /></Field>
    <Field path="fuselage.fuselage_dimensions_mm.width" value={`${size.width} mm`}><Slider path="fuselage.fuselage_dimensions_mm.width" min={30} max={200} step={5} unit="mm" /></Field>
    <Field path="fuselage.fuselage_dimensions_mm.height" value={`${size.height} mm`} hint="从上面看不到，侧面会用到。"><Slider path="fuselage.fuselage_dimensions_mm.height" min={20} max={150} step={5} unit="mm" /></Field>
    <Field path="fuselage.fuselage_style" hint="不指定就不写进文字，留给模型和后面的修改。"><OpenChoice path="fuselage.fuselage_style" options={fuselageStyleOptions} /></Field>
    <Field path="fuselage.top_cover"><OpenChoice path="fuselage.top_cover" options={topCoverOptions} /></Field>
  </>;
}

function DetailsControls({ laneId }: { laneId: string }) {
  const p = laneParameters(useStudio(s => s.project), laneId);
  return <>
    <Field path="frame.arm_root" hint="机臂与机身怎样接上。"><OpenChoice path="frame.arm_root" options={armRootOptions} /></Field>
    <Field path="accessories.has_camera_gimbal" value={p.accessories.has_camera_gimbal ? '装相机' : '不装相机'}>
      <Choice options={[{ value: 'yes', zh: '装前视相机' }, { value: 'no', zh: '不装相机' }]} value={p.accessories.has_camera_gimbal ? 'yes' : 'no'}
        onChange={v => useStudio.getState().setField(laneId, 'accessories.has_camera_gimbal', v === 'yes')} label="前视相机" />
    </Field>
    {p.accessories.has_camera_gimbal && <Field path="accessories.camera_mount" hint="从正上方几乎看不到相机，安装方式主要写进文字。"><OpenChoice path="accessories.camera_mount" options={cameraMountOptions} /></Field>}
    <Field path="landing_gear.landing_gear_style" hint="顶视里被机身挡住。">
      <Choice options={gearOptions} value={p.landing_gear.landing_gear_style} onChange={v => useStudio.getState().setField(laneId, 'landing_gear.landing_gear_style', v)} label="起落架" />
    </Field>
    {p.landing_gear.landing_gear_style !== '无独立起落架' && <Field path="landing_gear.landing_gear_height_mm" value={p.landing_gear.landing_gear_height_mm + ' mm'}>
      <Slider path="landing_gear.landing_gear_height_mm" min={20} max={100} step={5} unit="mm" /></Field>}
  </>;
}

function CmfControls({ laneId }: { laneId: string }) {
  const p = laneParameters(useStudio(s => s.project), laneId);
  const colour = p.accessories.drone_primary_color;
  const custom = !!colour && !colourSwatches.some(c => c.value.toLowerCase() === colour.toLowerCase());
  const [hex, setHex] = useState(custom ? colour : '');
  const [note, setNote] = useState(p.accessories.custom_prompt_additions);
  useEffect(() => { setNote(p.accessories.custom_prompt_additions); }, [p.accessories.custom_prompt_additions]);
  const set = (path: string, value: unknown) => useStudio.getState().setField(laneId, path, value);
  const applyHex = (value: string) => { const v = value.trim().toLowerCase(); if (/^#[0-9a-f]{6}$/.test(v)) set('accessories.drone_primary_color', v); };
  return <>
    <Field path="accessories.drone_primary_color" hint="不指定就不写进文字。色板以外的颜色用“自定义”，也可以在下面的说明里写颜色的名字。">
      <div className="row4" role="radiogroup" aria-label="主色">
        <button type="button" role="radio" aria-checked={!colour} className={'b4 sm' + (!colour ? ' pri' : '')} onClick={() => set('accessories.drone_primary_color', '')}>不指定</button>
        {colourSwatches.map(c => <button key={c.value} type="button" role="radio" aria-checked={colour === c.value} title={c.zh} aria-label={c.zh} data-colour={c.value}
          onClick={() => set('accessories.drone_primary_color', c.value)}
          style={{ width: 30, height: 30, borderRadius: 8, background: c.value, border: colour === c.value ? '2px solid var(--ink)' : '1px solid var(--line-2)', boxShadow: colour === c.value ? '0 0 0 2px var(--surface) inset' : undefined, cursor: 'pointer' }} />)}
      </div>
      <div className="row4 colour4" data-testid="custom-colour">
        <label className={'colour4-pick' + (custom ? ' is-on' : '')} title="自定义颜色">
          <input type="color" aria-label="自定义颜色" value={custom ? colour : hex || '#6b8fb5'} onChange={e => { setHex(e.target.value); applyHex(e.target.value); }} />
          <span>自定义</span>
        </label>
        <input className="in4" style={{ width: 110 }} aria-label="颜色的十六进制值" placeholder="#6b8fb5" value={custom ? colour : hex}
          onChange={e => { setHex(e.target.value); applyHex(e.target.value); }} />
        {custom && <span className="r4-muted">已用自定义颜色 {colour}</span>}
      </div>
    </Field>
    <Field path="accessories.surface_finish"><OpenChoice path="accessories.surface_finish" options={finishOptions} /></Field>
    <Field path="frame.material_visual" hint="机臂看上去是什么材料。"><OpenChoice path="frame.material_visual" options={armMaterialOptions} /></Field>
    <Field path="accessories.custom_prompt_additions" hint="选项里没有的，自己写：颜色的名字、分色、局部材质、纹理、标识位置……原样写进生成的文字，AI 不改这一栏。">
      <textarea className="ta4" data-testid="cmf-note" rows={3} maxLength={200} value={note} placeholder="例如：主色雾霾蓝，机臂哑光黑，镜头圈拉丝银"
        onChange={e => setNote(e.target.value)} onBlur={() => { if (note !== p.accessories.custom_prompt_additions) set('accessories.custom_prompt_additions', note.trim()); }} />
    </Field>
  </>;
}

const controls: Record<Layer, (p: { laneId: string }) => React.ReactElement> = {
  frame: FrameControls, propulsion: PropulsionControls, body: BodyControls, details: DetailsControls, cmf: CmfControls,
};

export default function PanelLayer({ laneId, layer, onSelectLayer }: { laneId: string; layer: Layer; onSelectLayer: (layer: Layer) => void }) {
  const { project, suggestions, events, session, turns } = useStudio();
  const st = useStudio.getState();
  const lane = project.lanes.find(l => l.id === laneId);
  const node = laneNode(project, laneId, layer);
  const shared = sharedBy(project, node.id);
  const parameters = laneParameters(project, laneId);
  const consumer = usesConsumerReferences(parameters.frame.frame_type, project.intent.taskId);
  const locked = !!session.lockedFrame && layer === 'frame';
  const store = useMemo(() => laneStore(laneId), [laneId]);
  const mine = suggestions.filter(s => s.laneId === laneId && s.layer === layer);
  const pending = mine.filter(s => s.status === 'pending').reverse();
  const done = mine.filter(s => s.status !== 'pending').reverse();
  const checks = layerChecks(layer, parameters, consumer && project.intent.taskId === 'consumer_camera');
  const record = events.filter(e => e.laneId === laneId && (e.layer === layer || !e.layer)).slice(-6).reverse();
  const issues = node.issues.filter(i => !i.resolved);
  const talk = turns.filter(t => t.scope.kind === 'layer' && t.scope.laneId === laneId && t.scope.layer === layer).slice(-4);
  const [busy, setBusy] = useState(false);
  const Controls = controls[layer];
  const others = project.lanes.filter(l => l.id !== laneId);
  const index = layers.indexOf(layer);
  const act = (id: string, action: 'apply' | 'branch' | 'reject') => {
    setBusy(true);
    try {
      const next = st.resolveSuggestion(id, action);
      // 开了分支就跟到新的那一条上，看到改动落在哪里。
      if (action === 'branch' && next) st.select({ kind: 'layer', laneId: next, layer });
    } finally { setBusy(false); }
  };
  const Icon = (level: string) => level === 'ok' ? <CheckCircle2 size={14} className="ok" /> : level === 'warn' ? <AlertTriangle size={14} className="warn" /> : <Info size={14} style={{ color: 'var(--ink-3)' }} />;

  return <DroneStoreContext.Provider value={store as unknown as typeof taskStores.quad}>
    <div className="r4-head" data-testid="layer-panel" data-layer={layer}>
      <span className="r4-kicker">{lane?.name} · 第 {index + 1} 层 / 共 5 层{isDefault(node) && <span className="p4 gray">还是起始值</span>}</span>
      <h2 className="r4-title">{layerInfo[layer].name}</h2>
      <p className="r4-purpose">{layerInfo[layer].question}{layerInfo[layer].generation}</p>
    </div>
    {locked && <p className="r4-note" data-testid="locked-note"><Lock size={12} style={{ verticalAlign: '-2px' }} /> 这一场登记了机架条件（{study.conditions.find(c => c.id === session.lockedFrame)?.label}），机架已锁定，AI 也不会提这一层的建议。要改，先在场次设置里解除。</p>}
    {!locked && shared.length > 1 && <div className="r4-note">这一层被 {shared.length} 条方向共用，改动会同时影响它们。
      <div className="row4" style={{ marginTop: 6 }}>
        <button type="button" className="b4 sm" data-testid="own-layer" onClick={() => st.ownLayer(laneId, layer)}>只改这条方向</button>
        <button type="button" className="b4 sm" onClick={() => st.fork(laneId, layer)}><GitBranch size={12} />在这里分叉</button>
      </div></div>}

    {layer !== 'cmf' && <div className="r4-stage"><div className="stage-wrap">
      <TopStage active={stagePart[layer]} onSelect={g => { const map: Partial<Record<ParameterGroup, Layer>> = { frame: 'frame', propulsion: 'propulsion', fuselage: 'body', landing_gear: 'details', accessories: 'details' }; const l = map[g]; if (l && l !== layer) onSelectLayer(l); }}
        overlays={{ dims: layer === 'frame' || layer === 'body', fov: layer === 'details', hidden: layer === 'details' }} interactive={!locked} />
    </div></div>}

    {talk.length > 0 && <section className="r4-sec" aria-label="对话">
      <h3>对话</h3>
      {talk.map(t => <div key={t.id} className={'turn4 ' + t.role}><div className="bubble">{t.text}</div>
        {t.role === 'assistant' && <span className="meta">{t.mode === 'fixture' ? '规则回退（未连模型）' : 'AI'} · {relTime(t.at)}</span>}
        {t.otherLayer && <button type="button" className="b4 sm quiet wrap4" onClick={() => onSelectLayer(t.otherLayer!.layer)}><b>去看{layerInfo[t.otherLayer.layer].name}</b>：{t.otherLayer.why}</button>}</div>)}
    </section>}

    {pending.length === 0 && talk.length === 0 && !locked && <p className="r4-muted">在画布下方的输入框里对这一层说话，例如“再紧凑一点”。AI 的建议会出现在这里，并说明依据有多强。</p>}

    {pending.length > 0 && <section className="r4-sec" aria-label="AI 的建议">
      <h3>AI 的建议</h3>
      {pending.map(s => <SuggestionCard key={s.id} s={s} busy={busy} onAct={a => act(s.id, a)} />)}
    </section>}

    <section className="r4-sec" aria-label="这一层的控件" style={locked ? { opacity: .55, pointerEvents: 'none' } : undefined}>
      <h3>这一层<span className="grow" />{!isDefault(node) && <button type="button" className="b4 quiet sm" onClick={() => { for (const path of Object.keys(node.touched)) st.clearField(laneId, path); }}><RotateCcw size={12} />这一层改回起始值</button>}</h3>
      <fieldset className="fs4" disabled={locked} aria-label={locked ? '登记条件，已锁定' : undefined}><div style={{ display: 'grid', gap: 18 }}><Controls laneId={laneId} /></div></fieldset>
    </section>

    {checks.length > 0 && <section className="r4-sec" aria-label="核对">
      <h3>核对</h3>
      <div className="chk4">{checks.map((c, i) => <div key={i} data-check={c.basis}>{Icon(c.level)}<span>{c.text}{c.basis === 'geometry' ? '（几何计算）' : c.basis === 'pipeline' ? '（出图通路实测）' : ''}</span></div>)}</div>
      {layer === 'body' && consumer && <p className="r4-muted">范围是 {realQuadrotors.n} 款真实四旋翼图上量出的四分位，只作参照，不是要求。</p>}
    </section>}

    {issues.length > 0 && <section className="r4-sec" aria-label="待处理">
      <h3>从候选送回来的问题</h3>
      {issues.map(i => <div key={i.id} className="el4"><div className="el4-main"><b>{i.text}</b><span>{relTime(i.at)}{i.fromCandidate ? ' · 来自一张候选' : ''}</span></div>
        <div className="el4-acts"><button type="button" className="b4 sm" onClick={() => st.resolveIssue(laneId, layer, i.id)}>处理好了</button></div></div>)}
    </section>}

    <section className="r4-sec" aria-label="分叉与套用">
      <h3>分叉与套用</h3>
      <div className="row4">
        <button type="button" className="b4" data-testid="fork-here" onClick={() => st.fork(laneId, layer)}><GitBranch size={14} />在{layerInfo[layer].name}处分叉</button>
        {others.length > 0 && <select className="in4" style={{ width: 'auto' }} aria-label="套用另一条方向的这一层" value="" onChange={e => { if (e.target.value) st.applyFrom(e.target.value, laneId, layer); }}>
          <option value="">套用另一条方向的{layerInfo[layer].name}…</option>
          {others.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
        </select>}
      </div>
      {node.origin && <p className="r4-muted"><Copy size={12} style={{ verticalAlign: '-2px' }} /> 这一层套用自 {project.lanes.find(l => l.id === node.origin!.laneId)?.name ?? '另一条方向'}。</p>}
    </section>

    {(done.length > 0 || record.length > 0) && <section className="r4-sec" aria-label="这一层的记录">
      <h3>这一层的记录</h3>
      {done.map(s => <SuggestionCard key={s.id} s={s} onAct={() => {}} />)}
      <div className="chk4">{record.map(e => <div key={e.id}><span className="r4-muted" style={{ minWidth: 40 }}>{relTime(e.at)}</span><span>{e.text}</span></div>)}</div>
    </section>}
  </DroneStoreContext.Provider>;
}
