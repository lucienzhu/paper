// 显示用的小工具：把取值写成设计者看得懂的话；按层算出核对结果。
import type { DroneParameters } from '../../types/DroneParameters';
import { computeLayout, effectiveWl, frameRules } from '../../design/design';
import { bodyClearance, cameraView, CAMERA_FOV_DEG } from '../../design/checks';
import { realQuadrotors, study } from '../../design/defaults';
import {
  armMaterialOptions, armRootOptions, cameraMountOptions, colourName, fieldByPath, finishOptions, fuselageStyleOptions, gearOptions, topCoverOptions,
} from '../../design/fields';
import type { Layer } from '../model';

const options = [...fuselageStyleOptions, ...topCoverOptions, ...armRootOptions, ...cameraMountOptions, ...finishOptions, ...armMaterialOptions, ...gearOptions];
const units: Record<string, string> = {
  'frame.wheelbase_mm': ' mm', 'fuselage.fuselage_dimensions_mm.length': ' mm', 'fuselage.fuselage_dimensions_mm.width': ' mm',
  'fuselage.fuselage_dimensions_mm.height': ' mm', 'landing_gear.landing_gear_height_mm': ' mm', 'propulsion.prop_diameter_inch': ' 英寸', 'propulsion.motor_tilt_degree': '°',
};

export function formatValue(field: string, value: unknown): string {
  if (value === '' || value === null || value === undefined) return '不指定';
  if (typeof value === 'boolean') return field === 'accessories.has_camera_gimbal' ? (value ? '装相机' : '不装相机') : value ? '是' : '否';
  if (field === 'frame.frame_type') return frameRules[value as keyof typeof frameRules]?.zh ?? String(value);
  if (field === 'accessories.drone_primary_color') return colourName(String(value))?.zh ?? String(value);
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
    const clear = bodyClearance(p, layout);
    out.push(clear >= 0 ? { level: 'ok', basis: 'geometry', text: `机身离桨盘最近 ${clear.toFixed(1)} mm，放得下。` }
      : { level: 'warn', basis: 'geometry', text: `俯视下桨盘伸到机身上方 ${(-clear).toFixed(1)} mm。` });
    if (consumerQuad) {
      const bw = layout.body_width_over_D, lw = layout.body_length_over_width;
      out.push({ level: bw >= q.bodyWidthOverD.q1 && bw <= q.bodyWidthOverD.q3 ? 'ok' : 'note', basis: 'range', text: `机身宽 ÷ 轴距 ${bw.toFixed(2)}，真实产品的常见范围 ${q.bodyWidthOverD.q1.toFixed(2)}–${q.bodyWidthOverD.q3.toFixed(2)}。` });
      out.push({ level: lw >= q.bodyLengthOverWidth.q1 && lw <= q.bodyLengthOverWidth.q3 ? 'ok' : 'note', basis: 'range', text: `机身长 ÷ 宽 ${lw.toFixed(2)}，真实产品的常见范围 ${q.bodyLengthOverWidth.q1.toFixed(2)}–${q.bodyLengthOverWidth.q3.toFixed(2)}。` });
    }
    if (p.fuselage.fuselage_dimensions_mm.width > layout.W_mm && layout.hubs.length === 4)
      out.push({ level: 'warn', basis: 'geometry', text: '机身比电机的横向跨度还宽，会盖住电机。' });
  }
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
  return `${f('accessories.drone_primary_color', p.accessories.drone_primary_color)} · ${f('accessories.surface_finish', p.accessories.surface_finish)}`;
}

