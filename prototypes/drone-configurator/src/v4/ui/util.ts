// 显示用的小工具：把取值写成设计者看得懂的话；按层算出核对结果。
import type { DroneParameters } from '../../types/DroneParameters';
import { computeLayout, effectiveWl, frameRules } from '../../design/design';
import { bodyClearance, cameraView, CAMERA_FOV_DEG, envelopeClearance } from '../../design/checks';
import { realQuadrotors, study } from '../../design/defaults';
import {
  armMaterialOptions, armRootOptions, cameraMountOptions, colourName, fieldByPath, finishOptions, fuselageStyleOptions, gearOptions, sprayTankOptions, spraySystemOptions, topCoverOptions,
} from '../../design/fields';
import type { Layer } from '../model';

const options = [...fuselageStyleOptions, ...topCoverOptions, ...armRootOptions, ...cameraMountOptions, ...finishOptions, ...armMaterialOptions, ...gearOptions,
  ...sprayTankOptions, ...spraySystemOptions];
const units: Record<string, string> = {
  'frame.wheelbase_mm': ' mm', 'fuselage.fuselage_dimensions_mm.length': ' mm', 'fuselage.fuselage_dimensions_mm.width': ' mm',
  'fuselage.fuselage_dimensions_mm.height': ' mm', 'landing_gear.landing_gear_height_mm': ' mm', 'propulsion.prop_diameter_inch': ' 英寸', 'propulsion.motor_tilt_degree': '°',
};

export function formatValue(field: string, value: unknown): string {
  if (value === '' || value === null || value === undefined) return '不指定';
  if (typeof value === 'boolean') return field === 'accessories.has_camera_gimbal' ? (value ? '装相机' : '不装相机') : value ? '是' : '否';
  if (field === 'frame.frame_type') return frameRules[value as keyof typeof frameRules]?.zh ?? String(value);
  if (['accessories.drone_primary_color', 'accessories.arm_color', 'accessories.prop_color'].includes(field)) return colourName(String(value))?.zh ?? String(value);
  if (field === 'propulsion.prop_guard') return value === 'ring' ? '环形护圈' : '不加护圈';
  if (field === 'frame.span_ratio_wl') return Number(value).toFixed(2);
  if (typeof value === 'number') return (Number.isInteger(value) ? String(value) : value.toFixed(1)) + (units[field] ?? '');
  const hit = options.find(o => o.value === value);
  if (hit) return hit.zh;
  return String(value).replace(/mm$/, ' mm').replace(/叶$/, ' 叶');
}
export const fieldLabel = (field: string) => fieldByPath[field]?.label ?? field;

export interface Check { level: 'ok' | 'note' | 'warn'; text: string; basis: 'geometry' | 'range' | 'pipeline' }

/** 这一层要核对的几件事。几何来自计算；范围是 32 款真实四旋翼的四分位；出图通路的表现来自 A8 的不知情读数。 */
export function layerChecks(layer: Layer, p: DroneParameters, consumerQuad: boolean): Check[] {
  const layout = computeLayout(p);
  const out: Check[] = [];
  const q = realQuadrotors;
  if (layer === 'frame') {
    const wl = effectiveWl(p.frame);
    if (consumerQuad) {
      const inRange = wl >= q.wl.q1 && wl <= q.wl.q3;
      out.push({ level: inRange ? 'ok' : 'note', basis: 'range', text: `W/L ${wl.toFixed(2)}，真实产品的常见范围 ${q.wl.q1.toFixed(2)}–${q.wl.q3.toFixed(2)}（中位 ${q.wl.median.toFixed(2)}）。` });
    }
    const level = study.wlLevels.find(v => Math.abs(v - wl) < 1e-6);
    if (level === 0.7) out.push({ level: 'warn', basis: 'pipeline', text: 'W/L 设为 0.70 时，这条出图通路出的图实际读成约 1.0（12 张里 0 张命中）。' });
    if (level === 1) out.push({ level: 'note', basis: 'pipeline', text: 'W/L 设为 1.00 时命中不稳，出图往往偏宽（WLQ 12 张中 3 张命中）。' });
  }
  if (layer === 'propulsion') {
    const gap = layout.disk_gap_mm;
    out.push(gap >= 0 ? { level: 'ok', basis: 'geometry', text: `相邻桨盘之间留有 ${gap.toFixed(0)} mm。` }
      : { level: 'warn', basis: 'geometry', text: `相邻桨盘重叠 ${(-gap).toFixed(0)} mm：减小桨径，或回到机架加大轴距。` });
    if (consumerQuad && layout.D_mean_mm) {
      const dd = layout.d_over_reference_span;
      out.push({ level: dd >= q.dOverD.q1 && dd <= q.dOverD.q3 ? 'ok' : 'note', basis: 'range', text: `桨径 ÷ 轴距 ${dd.toFixed(2)}，真实产品的常见范围 ${q.dOverD.q1.toFixed(2)}–${q.dOverD.q3.toFixed(2)}。` });
    }
  }
  if (layer === 'body') {
    // 量的是示意图里画出来的机身外形（带圆角或倒角）。只在矩形包络的直角上相交时单独说明：
    // 条件图里没有机身，机身尺寸只以文字进入，这么小的差别不会进到图里。
    const clear = bodyClearance(p, layout), envelope = envelopeClearance(p, layout);
    out.push(clear < 0 ? { level: 'warn', basis: 'geometry', text: `俯视下桨盘伸到机身上方 ${(-clear).toFixed(1)} mm。` }
      : envelope < 0 ? { level: 'note', basis: 'geometry', text: `机身离桨盘最近 ${clear.toFixed(1)} mm（按画出的圆角量）；只有不计圆角的矩形包络会在四角与桨盘相交 ${(-envelope).toFixed(1)} mm。条件图里没有机身，这一点不影响出图。` }
      : clear < 2 ? { level: 'note', basis: 'geometry', text: `机身离桨盘只有 ${clear.toFixed(1)} mm，顶视里几乎贴着。` }
      : { level: 'ok', basis: 'geometry', text: `机身离桨盘最近 ${clear.toFixed(1)} mm，放得下。` });
    if (consumerQuad) {
      const bw = layout.body_width_over_D, lw = layout.body_length_over_width;
      out.push({ level: bw >= q.bodyWidthOverD.q1 && bw <= q.bodyWidthOverD.q3 ? 'ok' : 'note', basis: 'range', text: `机身宽 ÷ 轴距 ${bw.toFixed(2)}，真实产品的常见范围 ${q.bodyWidthOverD.q1.toFixed(2)}–${q.bodyWidthOverD.q3.toFixed(2)}。` });
      out.push({ level: lw >= q.bodyLengthOverWidth.q1 && lw <= q.bodyLengthOverWidth.q3 ? 'ok' : 'note', basis: 'range', text: `机身长 ÷ 宽 ${lw.toFixed(2)}，真实产品的常见范围 ${q.bodyLengthOverWidth.q1.toFixed(2)}–${q.bodyLengthOverWidth.q3.toFixed(2)}。` });
    }
    if (p.fuselage.fuselage_dimensions_mm.width > layout.W_mm && layout.hubs.length === 4)
      out.push({ level: 'warn', basis: 'geometry', text: '机身比电机的横向跨度还宽，会盖住电机。' });
  }
  if (layer === 'details' && p.accessories.spray_system === 'motor-nozzles')
    out.push({ level: 'note', basis: 'pipeline', text: '电机下方的喷头在顶视里常被电机和桨挡住；开发批 3 张里 3 张可辨，还没做确认。看不到时按方法章记“不可判”。' });
  if (layer === 'details' && p.accessories.has_camera_gimbal) {
    const cam = cameraView(p, layout);
    const worst = Math.max(0, ...cam.intrusions.map(i => i.deg));
    out.push(worst > 0.5 ? { level: 'warn', basis: 'geometry', text: `前桨会进入相机画面约 ${worst.toFixed(0)}°（按 ${CAMERA_FOV_DEG}° 水平视角的俯视近似）。` }
      : { level: 'ok', basis: 'geometry', text: `桨叶不会入画（按 ${CAMERA_FOV_DEG}° 水平视角的俯视近似）。` });
  }
  return out;
}

export function relTime(iso?: string) {
  if (!iso) return '';
  return new Date(iso).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false });
}

/** 节点上的一行摘要。 */
export function layerSummary(layer: Layer, p: DroneParameters) {
  const f = (path: string, v: unknown) => formatValue(path, v);
  if (layer === 'frame') return `${f('frame.frame_type', p.frame.frame_type)} · W/L ${p.frame.span_ratio_wl.toFixed(2)} · ${p.frame.wheelbase_mm} mm`;
  if (layer === 'propulsion') return `${p.propulsion.prop_diameter_inch} 英寸 · ${parseInt(p.propulsion.prop_blade_count, 10)} 叶${p.propulsion.prop_guard === 'ring' ? ' · 护圈' : ''}`;
  if (layer === 'body') return `${p.fuselage.fuselage_dimensions_mm.length} × ${p.fuselage.fuselage_dimensions_mm.width} mm · ${f('fuselage.fuselage_style', p.fuselage.fuselage_style)}`;
  if (layer === 'details') return `臂根${f('frame.arm_root', p.frame.arm_root)} · ${p.accessories.has_camera_gimbal ? '相机' + f('accessories.camera_mount', p.accessories.camera_mount) : '不装相机'}`;
  const parts = [p.accessories.arm_color, p.accessories.prop_color].filter(Boolean).length;
  return `${f('accessories.drone_primary_color', p.accessories.drone_primary_color)}${parts ? `，另 ${parts} 个部件配色` : ''} · ${f('accessories.surface_finish', p.accessories.surface_finish)}`;
}


/**
 * 两段文字的逐词差别（英文按词，中文按字），给比较页用：same 两边都有，del 只在前一段，add 只在后一段。
 * 文字很长时退回整段对比，免得卡住页面。
 */
export function diffWords(before: string, after: string): { text: string; kind: 'same' | 'add' | 'del' }[] {
  const split = (t: string) => t.match(/[A-Za-z0-9_'’-]+|\s+|[^\sA-Za-z0-9_'’-]/g) ?? [];
  const a = split(before), b = split(after);
  if (a.length * b.length > 400000) return before === after ? [{ text: after, kind: 'same' }] : [{ text: before, kind: 'del' }, { text: after, kind: 'add' }];
  const dp = Array.from({ length: a.length + 1 }, () => new Uint16Array(b.length + 1));
  for (let i = a.length - 1; i >= 0; i--) for (let j = b.length - 1; j >= 0; j--) dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
  const out: { text: string; kind: 'same' | 'add' | 'del' }[] = [];
  const push = (text: string, kind: 'same' | 'add' | 'del') => { const last = out[out.length - 1]; if (last?.kind === kind) last.text += text; else out.push({ text, kind }); };
  let i = 0, j = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) { push(a[i], 'same'); i++; j++; }
    else if (dp[i + 1][j] >= dp[i][j + 1]) { push(a[i], 'del'); i++; }
    else { push(b[j], 'add'); j++; }
  }
  while (i < a.length) push(a[i++], 'del');
  while (j < b.length) push(b[j++], 'add');
  return out;
}
